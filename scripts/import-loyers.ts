/**
 * Import des loyers médians depuis la "Carte des loyers" (data.gouv.fr).
 *
 * Usage : npx tsx scripts/import-loyers.ts
 *
 * Télécharge le CSV, parse les loyers médians/m², et injecte dans locality_rental.
 * Crée automatiquement les localités manquantes via geo API.
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:data.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Carte des loyers CSV URL (data.gouv.fr)
const CSV_URL =
  "https://www.data.gouv.fr/fr/datasets/r/89a1ca6b-4690-4790-9e39-5af1fa81aa38";

interface LoyerRow {
  codeInsee: string;
  commune: string;
  loyerMedian: number;
}

async function downloadAndParseCsv(): Promise<LoyerRow[]> {
  console.log("Downloading CSV from data.gouv.fr...");
  const res = await fetch(CSV_URL, {
    headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to download CSV: ${res.status}`);
  }

  const text = await res.text();
  const lines = text.split("\n");
  const header = lines[0].toLowerCase();

  // Find column indices
  const cols = header.split(";").map((c) => c.trim());
  const codeIdx = cols.findIndex((c) => c.includes("code") && c.includes("insee"));
  const communeIdx = cols.findIndex((c) => c.includes("commune") || c.includes("libelle"));
  const loyerIdx = cols.findIndex((c) => c.includes("loyer") && c.includes("median"));

  if (codeIdx === -1 || loyerIdx === -1) {
    // Try comma separator
    const colsComma = header.split(",").map((c) => c.trim());
    const codeIdxC = colsComma.findIndex((c) => c.includes("code") && c.includes("insee"));
    const loyerIdxC = colsComma.findIndex((c) => c.includes("loyer"));

    if (codeIdxC === -1 || loyerIdxC === -1) {
      throw new Error(
        `Cannot find required columns in CSV. Header: ${header.slice(0, 200)}`
      );
    }

    return parseRows(lines.slice(1), ",", codeIdxC, colsComma.findIndex((c) => c.includes("commune")), loyerIdxC);
  }

  return parseRows(lines.slice(1), ";", codeIdx, communeIdx, loyerIdx);
}

function parseRows(
  lines: string[],
  sep: string,
  codeIdx: number,
  communeIdx: number,
  loyerIdx: number
): LoyerRow[] {
  const rows: LoyerRow[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(sep).map((c) => c.trim().replace(/"/g, ""));
    const codeInsee = parts[codeIdx];
    const commune = communeIdx >= 0 ? parts[communeIdx] : "";
    const loyer = parseFloat(parts[loyerIdx]?.replace(",", "."));

    if (!codeInsee || isNaN(loyer) || loyer <= 0) continue;

    rows.push({ codeInsee, commune, loyerMedian: loyer });
  }
  return rows;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const year = new Date().getFullYear();
  const source = `import:carte-loyers-${year}`;
  const today = new Date().toISOString().slice(0, 10);

  const rows = await downloadAndParseCsv();
  console.log(`Parsed ${rows.length} communes with rent data.`);

  if (isDryRun) {
    console.log("[DRY-RUN] Would import into locality_rental.");
    console.log(`Sample: ${JSON.stringify(rows.slice(0, 5), null, 2)}`);
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    // Find existing locality
    const existing = await client.execute({
      sql: "SELECT id FROM localities WHERE code = ? LIMIT 1",
      args: [row.codeInsee],
    });

    let localityId: string;

    if (existing.rows[0]) {
      localityId = existing.rows[0].id as string;
    } else {
      // Auto-create via geo API
      try {
        const { fetchGeoCityByCode } = await import("@/infrastructure/data-sources/geo-client");
        const geo = await fetchGeoCityByCode(row.codeInsee);
        if (!geo) {
          skipped++;
          continue;
        }

        // Find France root
        const roots = await client.execute(
          "SELECT id FROM localities WHERE parent_id IS NULL LIMIT 1"
        );
        const parentId = roots.rows[0]?.id as string ?? null;

        localityId = crypto.randomUUID();
        await client.execute({
          sql: "INSERT INTO localities (id, name, type, parent_id, code, postal_codes) VALUES (?, ?, ?, ?, ?, ?)",
          args: [localityId, geo.nom, "ville", parentId, geo.code, JSON.stringify(geo.codesPostaux ?? [])],
        });
      } catch {
        skipped++;
        continue;
      }
    }

    // Upsert rental data
    await client.execute({
      sql: `INSERT OR REPLACE INTO locality_rental (locality_id, valid_from, avg_rent_per_m2, source)
            VALUES (?, ?, ?, ?)`,
      args: [localityId, today, row.loyerMedian, source],
    });

    imported++;
    if (imported % 100 === 0) {
      console.log(`  ... ${imported} imported`);
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped.`);
}

main().catch(console.error);
