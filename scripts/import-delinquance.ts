/**
 * Import des données de délinquance (SSMSI) depuis data.gouv.fr.
 *
 * Usage : npx tsx scripts/import-delinquance.ts
 *         npx tsx scripts/import-delinquance.ts --dry-run
 *
 * Télécharge le CSV SSMSI, parse et injecte dans locality_risks.
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:data.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// SSMSI CSV URL — données communales de délinquance
const CSV_URL =
  "https://www.data.gouv.fr/fr/datasets/r/a6aec7c9-fc50-4a69-96ce-9e3d1e3f1b1e";

interface DelinquanceRow {
  codeInsee: string;
  commune: string;
  tauxGlobal: number; // pour 1000 habitants
}

async function downloadAndParseCsv(): Promise<DelinquanceRow[]> {
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

  // Find column indices — SSMSI uses semicolons
  const sep = header.includes(";") ? ";" : ",";
  const cols = header.split(sep).map((c) => c.trim().replace(/"/g, ""));

  const codeIdx = cols.findIndex((c) => c.includes("codgeo") || (c.includes("code") && c.includes("insee")));
  const communeIdx = cols.findIndex((c) => c.includes("libgeo") || c.includes("commune"));
  const tauxIdx = cols.findIndex((c) => c.includes("taux") || c.includes("pour_mille") || c.includes("faits"));

  if (codeIdx === -1 || tauxIdx === -1) {
    throw new Error(
      `Cannot find required columns. Header: ${header.slice(0, 300)}`
    );
  }

  const rows: DelinquanceRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split(sep).map((c) => c.trim().replace(/"/g, ""));
    const codeInsee = parts[codeIdx];
    const commune = communeIdx >= 0 ? parts[communeIdx] : "";
    const taux = parseFloat(parts[tauxIdx]?.replace(",", "."));

    if (!codeInsee || isNaN(taux)) continue;

    rows.push({ codeInsee, commune, tauxGlobal: taux });
  }

  return rows;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const year = new Date().getFullYear();
  const source = `import:ssmsi-${year}`;
  const today = new Date().toISOString().slice(0, 10);

  let rows: DelinquanceRow[];
  try {
    rows = await downloadAndParseCsv();
  } catch (e) {
    console.error(`Erreur téléchargement: ${e instanceof Error ? e.message : e}`);
    console.log("\nLe fichier CSV SSMSI change fréquemment d'URL.");
    console.log("Vérifiez l'URL actuelle sur: https://www.data.gouv.fr/fr/datasets/bases-statistiques-communale-et-departementale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/");
    process.exit(1);
  }

  console.log(`Parsed ${rows.length} communes with delinquance data.`);

  if (isDryRun) {
    console.log("[DRY-RUN] Would import into locality_risks.");
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

    if (!existing.rows[0]) {
      skipped++;
      continue;
    }

    const localityId = existing.rows[0].id as string;

    // Determine risk level from taux
    const riskLevel = row.tauxGlobal >= 60 ? "élevé" : row.tauxGlobal >= 30 ? "moyen" : "faible";

    // Upsert into risks table — only add risk_level, don't overwrite natural_risks
    await client.execute({
      sql: `INSERT OR REPLACE INTO locality_risks (locality_id, valid_from, risk_level, source)
            VALUES (?, ?, ?, ?)`,
      args: [localityId, today, riskLevel, source],
    });

    imported++;
    if (imported % 100 === 0) {
      console.log(`  ... ${imported} imported`);
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped (locality not found).`);
}

main().catch(console.error);
