/**
 * Bulk add & enrich cities — generates guide pages for SEO.
 *
 * Usage:
 *   npx tsx scripts/bulk-add-cities.ts                     # add top 100 French cities
 *   npx tsx scripts/bulk-add-cities.ts --top 200           # add top 200
 *   npx tsx scripts/bulk-add-cities.ts --list "Albi,Rodez" # add specific cities
 *   npx tsx scripts/bulk-add-cities.ts --file cities.txt   # one city per line
 *   npx tsx scripts/bulk-add-cities.ts --dept 81           # all cities in a department
 *   npx tsx scripts/bulk-add-cities.ts --dry-run           # preview without creating
 *
 * Each city is resolved via geo.api.gouv.fr, created in DB, and enriched
 * with DVF, INSEE, Géorisques, loyers, DPE, etc.
 */

import { createClient } from "@libsql/client";
import * as fs from "fs";

// Init DB client before dynamic imports
const _client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:data.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const GEO_API = "https://geo.api.gouv.fr";

interface GeoCommune {
  nom: string;
  code: string;
  codesPostaux: string[];
  population?: number;
  departement?: { code: string; nom: string };
}

/** Fetch top N cities in France by population */
async function fetchTopCities(limit: number): Promise<GeoCommune[]> {
  const allCities: GeoCommune[] = [];
  // geo API doesn't support sort by population directly — fetch all communes then sort
  // Use departments to batch: mainland (01-95) + DOM (971-976)
  const depts: string[] = [];
  for (let i = 1; i <= 95; i++) depts.push(String(i).padStart(2, "0"));
  depts.push("971", "972", "973", "974", "976");

  console.log("Fetching all French communes from geo.api.gouv.fr...");

  for (const dept of depts) {
    try {
      const res = await fetch(
        `${GEO_API}/departements/${dept}/communes?fields=nom,code,codesPostaux,population,departement`,
        { signal: AbortSignal.timeout(10_000) }
      );
      if (!res.ok) continue;
      const communes: GeoCommune[] = await res.json();
      allCities.push(...communes);
    } catch {
      // Skip failed departments
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log(`  Total communes fetched: ${allCities.length}`);

  // Sort by population descending, take top N
  return allCities
    .filter((c) => c.population != null && c.population > 0)
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, limit);
}

/** Fetch all cities in a department */
async function fetchDeptCities(deptCode: string): Promise<GeoCommune[]> {
  const res = await fetch(
    `${GEO_API}/departements/${deptCode}/communes?fields=nom,code,codesPostaux,population,departement`,
    { signal: AbortSignal.timeout(10_000) }
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

  const res = await fetch(`${GEO_API}/communes?${params}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const data: GeoCommune[] = await res.json();
  return data[0] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const topIdx = args.indexOf("--top");
  const listIdx = args.indexOf("--list");
  const fileIdx = args.indexOf("--file");
  const deptIdx = args.indexOf("--dept");

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

  console.log(`\n${isDryRun ? "[DRY-RUN] " : ""}Processing ${cities.length} cities...\n`);

  // Dynamic import of domain code
  const { ensureLocalityEnriched } = await import("@/domains/locality/enrichment/ensure");
  const { findLocalityByCity } = await import("@/domains/locality/repository");

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const progress = `[${i + 1}/${cities.length}]`;

    // Check if already exists
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
}

main().catch(console.error);
