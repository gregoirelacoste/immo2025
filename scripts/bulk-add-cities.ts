#!/usr/bin/env npx tsx
/**
 * Bulk add & enrich cities — generates locality pages for SEO.
 *
 * Usage (CI / cron — uses cursor in DB):
 *   npx tsx scripts/bulk-add-cities.ts --batch-next 100           # process next 100 cities
 *   npx tsx scripts/bulk-add-cities.ts --batch-next 100 --dry-run # preview next batch
 *   npx tsx scripts/bulk-add-cities.ts --status                   # show progress
 *   npx tsx scripts/bulk-add-cities.ts --reset-cursor             # restart from 0
 *
 * Usage (manual / one-shot — no cursor):
 *   npx tsx scripts/bulk-add-cities.ts --top 200                  # top 200 by population
 *   npx tsx scripts/bulk-add-cities.ts --list "Albi,Rodez"        # specific cities
 *   npx tsx scripts/bulk-add-cities.ts --file cities.txt           # one city per line
 *   npx tsx scripts/bulk-add-cities.ts --dept 81                   # all cities in a dept
 *
 * Each city is resolved via geo.api.gouv.fr, created in DB, and enriched
 * with DVF, INSEE, Géorisques, loyers, DPE, etc.
 */

// ── Load .env.local (tsx doesn't do it like Next.js) ──
import { readFileSync } from "fs";
import { resolve } from "path";
import * as fs from "fs";

function loadEnvFile(filename: string) {
  try {
    const envPath = resolve(process.cwd(), filename);
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch { /* file not found — ok */ }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// ── Validate DB target (refuse local file in batch mode) ──
const dbUrl = process.env.TURSO_DATABASE_URL || "";
const isBatchMode = process.argv.includes("--batch-next") || process.argv.includes("--status") || process.argv.includes("--reset-cursor");
if (isBatchMode && (!dbUrl || dbUrl.startsWith("file:"))) {
  console.error("❌ TURSO_DATABASE_URL non configuré ou pointe vers un fichier local.");
  console.error("   En mode --batch-next, les données iraient dans une SQLite jetable, pas en production.");
  console.error("   → Définir TURSO_DATABASE_URL et TURSO_AUTH_TOKEN pour cibler la DB prod.");
  process.exit(1);
}

const GEO_API = "https://geo.api.gouv.fr";

interface GeoCommune {
  nom: string;
  code: string;
  codesPostaux: string[];
  population?: number;
  departement?: { code: string; nom: string };
}

// ── Cursor management (stored in DB) ──

const CURSOR_KEY = "bulk_cities";

async function ensureCursorTable(db: import("@libsql/client").Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _bulk_progress (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

async function getCursor(db: import("@libsql/client").Client): Promise<{ offset: number; total: number }> {
  await ensureCursorTable(db);
  const row = await db.execute({ sql: "SELECT value, total FROM _bulk_progress WHERE key = ?", args: [CURSOR_KEY] });
  if (row.rows.length === 0) return { offset: 0, total: 0 };
  return { offset: Number(row.rows[0].value), total: Number(row.rows[0].total) };
}

async function setCursor(db: import("@libsql/client").Client, offset: number, total: number) {
  await ensureCursorTable(db);
  await db.execute({
    sql: `INSERT INTO _bulk_progress (key, value, total, updated_at) VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, total = excluded.total, updated_at = datetime('now')`,
    args: [CURSOR_KEY, offset, total],
  });
}

// ── Geo API helpers ──

/** Fetch ALL French communes, sorted deterministically by dept code + commune code */
async function fetchAllCities(): Promise<GeoCommune[]> {
  const allCities: GeoCommune[] = [];
  const depts: string[] = [];
  for (let i = 1; i <= 95; i++) depts.push(String(i).padStart(2, "0"));
  depts.push("971", "972", "973", "974", "976");

  console.log("Fetching all French communes from geo.api.gouv.fr...");

  for (const dept of depts) {
    try {
      const res = await fetch(
        `${GEO_API}/departements/${dept}/communes?fields=nom,code,codesPostaux,population,departement`,
        { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "tiili.io/bulk-cities/1.0" } }
      );
      if (!res.ok) continue;
      const communes: GeoCommune[] = await res.json();
      allCities.push(...communes);
    } catch {
      // Skip failed departments
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`  Total communes fetched: ${allCities.length}`);

  // Deterministic sort: population DESC (biggest cities first → most useful for SEO)
  // Tie-breaker: commune code ASC for stability
  return allCities
    .filter((c) => c.population != null && c.population > 0)
    .sort((a, b) => {
      const popDiff = (b.population ?? 0) - (a.population ?? 0);
      if (popDiff !== 0) return popDiff;
      return a.code.localeCompare(b.code);
    });
}

/** Fetch top N cities by population */
async function fetchTopCities(limit: number): Promise<GeoCommune[]> {
  const all = await fetchAllCities();
  return all.slice(0, limit);
}

/** Fetch all cities in a department */
async function fetchDeptCities(deptCode: string): Promise<GeoCommune[]> {
  const res = await fetch(
    `${GEO_API}/departements/${deptCode}/communes?fields=nom,code,codesPostaux,population,departement`,
    { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "tiili.io/bulk-cities/1.0" } }
  );
  if (!res.ok) throw new Error(`Failed to fetch dept ${deptCode}: ${res.status}`);
  return res.json();
}

/** Resolve a city name to a GeoCommune */
async function resolveCity(name: string): Promise<GeoCommune | null> {
  const isPostalCode = /^\d{5}$/.test(name.trim());
  const params = new URLSearchParams({
    fields: "nom,code,codesPostaux,population,departement",
    limit: "1",
  });
  if (isPostalCode) {
    params.set("codePostal", name.trim());
  } else {
    params.set("nom", name.trim());
    params.set("boost", "population");
  }

  const url = `${GEO_API}/communes?${params}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "tiili.io/bulk-cities/1.0" },
    });
    if (!res.ok) {
      console.warn(`    [geo] ${res.status} for ${url}`);
      return null;
    }
    const data: GeoCommune[] = await res.json();
    return data[0] ?? null;
  } catch (e) {
    console.warn(`    [geo] fetch error for ${url}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

// ── Process a batch of cities ──

async function processCities(
  cities: GeoCommune[],
  isDryRun: boolean,
  label: string,
): Promise<{ created: number; skipped: number; errors: number }> {
  const { getDb } = await import("@/infrastructure/database/client");
  await getDb();
  const { ensureLocalityEnriched } = await import("@/domains/locality/enrichment/ensure");
  const { findLocalityByCity } = await import("@/domains/locality/repository");

  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`\n${isDryRun ? "[DRY-RUN] " : ""}${label} — ${cities.length} cities\n`);

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const progress = `[${i + 1}/${cities.length}]`;

    const existing = await findLocalityByCity(city.nom, undefined, city.code);
    if (existing) {
      console.log(`${progress} ${city.nom} (${city.code}) — already exists, skipping`);
      skipped++;
      continue;
    }

    if (isDryRun) {
      const pop = city.population ? ` (pop: ${city.population.toLocaleString("fr-FR")})` : "";
      console.log(`${progress} Would add: ${city.nom} (${city.code})${pop}`);
      created++;
      continue;
    }

    try {
      console.log(`${progress} Adding ${city.nom} (${city.code})...`);
      await ensureLocalityEnriched(city.nom, undefined, city.code);
      created++;
      console.log(`  -> OK`);
    } catch (e) {
      console.error(`  -> ERROR: ${e instanceof Error ? e.message : e}`);
      errors++;
    }

    // Rate limit: 300ms between cities to be gentle on APIs
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n--- Summary ---`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${cities.length}`);

  return { created, skipped, errors };
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const batchIdx = args.indexOf("--batch-next");
  const statusFlag = args.includes("--status");
  const resetFlag = args.includes("--reset-cursor");
  const topIdx = args.indexOf("--top");
  const listIdx = args.indexOf("--list");
  const fileIdx = args.indexOf("--file");
  const deptIdx = args.indexOf("--dept");

  // ── Batch mode with cursor ──
  if (statusFlag || resetFlag || batchIdx !== -1) {
    const { getDb } = await import("@/infrastructure/database/client");
    const db = await getDb();

    if (resetFlag) {
      await setCursor(db, 0, 0);
      console.log("✅ Cursor reset to 0.");
      return;
    }

    if (statusFlag) {
      const cursor = await getCursor(db);
      if (cursor.total === 0) {
        console.log("No batch in progress. Run --batch-next to start.");
      } else {
        const pct = ((cursor.offset / cursor.total) * 100).toFixed(1);
        console.log(`Progress: ${cursor.offset} / ${cursor.total} (${pct}%)`);
        const remaining = cursor.total - cursor.offset;
        console.log(`Remaining: ${remaining} cities`);
        if (remaining <= 0) console.log("✅ All cities have been processed!");
      }
      return;
    }

    // --batch-next N
    const batchSize = parseInt(args[batchIdx + 1] || "100");
    if (isNaN(batchSize) || batchSize <= 0) {
      console.error("--batch-next requires a positive number");
      process.exit(1);
    }

    // Fetch the full deterministic list
    const allCities = await fetchAllCities();
    const total = allCities.length;

    // Read cursor
    const cursor = await getCursor(db);
    const offset = cursor.total === total ? cursor.offset : cursor.offset;

    // If total changed (geo API update), log it but keep offset
    if (cursor.total > 0 && cursor.total !== total) {
      console.warn(`⚠️  Total communes changed: ${cursor.total} → ${total}. Keeping offset at ${offset}.`);
    }

    if (offset >= total) {
      console.log(`✅ All ${total} cities have been processed! Nothing to do.`);
      console.log("   Use --reset-cursor to restart from scratch.");
      return;
    }

    const batch = allCities.slice(offset, offset + batchSize);
    const endOffset = offset + batch.length;

    console.log(`Cursor: ${offset} / ${total} — processing cities #${offset + 1} to #${endOffset}`);

    const result = await processCities(batch, isDryRun, `Batch ${offset + 1}–${endOffset} / ${total}`);

    // Update cursor (advance even if some errored — they can be retried with --list)
    if (!isDryRun) {
      await setCursor(db, endOffset, total);
      const remaining = total - endOffset;
      console.log(`\nCursor updated: ${endOffset} / ${total}`);
      if (remaining > 0) {
        console.log(`Remaining: ${remaining} cities (~${Math.ceil(remaining / batchSize)} more runs)`);
      } else {
        console.log("✅ All cities have been processed!");
      }
    }

    // Exit with error if too many failures (useful for CI alerting)
    if (result.errors > batch.length * 0.5) {
      console.error("❌ Too many errors (>50%) — something may be wrong.");
      process.exit(1);
    }

    return;
  }

  // ── One-shot modes (no cursor) ──
  let cities: GeoCommune[] = [];

  if (deptIdx !== -1) {
    const deptCode = args[deptIdx + 1];
    if (!deptCode) { console.error("--dept requires a department code"); process.exit(1); }
    console.log(`Fetching all cities in department ${deptCode}...`);
    cities = await fetchDeptCities(deptCode);
    console.log(`  Found ${cities.length} communes`);
  } else if (listIdx !== -1) {
    const names = args[listIdx + 1]?.split(",").map((s) => s.trim()).filter(Boolean);
    if (!names?.length) { console.error("--list requires comma-separated city names"); process.exit(1); }
    console.log(`Resolving ${names.length} cities...`);
    for (const name of names) {
      const geo = await resolveCity(name);
      if (geo) {
        cities.push(geo);
        console.log(`  + ${geo.nom} (${geo.code})`);
      } else {
        console.warn(`  ? "${name}" not found`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  } else if (fileIdx !== -1) {
    const filePath = args[fileIdx + 1];
    if (!filePath || !fs.existsSync(filePath)) { console.error(`File not found: ${filePath}`); process.exit(1); }
    const names = fs.readFileSync(filePath, "utf-8").split("\n").map((s) => s.trim()).filter(Boolean);
    console.log(`Resolving ${names.length} cities from ${filePath}...`);
    for (const name of names) {
      const geo = await resolveCity(name);
      if (geo) {
        cities.push(geo);
        console.log(`  + ${geo.nom} (${geo.code})`);
      } else {
        console.warn(`  ? "${name}" not found`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  } else {
    const top = topIdx !== -1 ? parseInt(args[topIdx + 1] || "100") : 100;
    cities = await fetchTopCities(top);
  }

  if (cities.length === 0) {
    console.log("No cities to process.");
    return;
  }

  await processCities(cities, isDryRun, "Processing");
}

main().catch(console.error);
