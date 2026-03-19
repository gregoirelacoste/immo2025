/**
 * CLI batch enrichment for localities.
 *
 * Usage:
 *   npx tsx scripts/enrich-locality.ts --city "Lyon"
 *   npx tsx scripts/enrich-locality.ts --code "69123"
 *   npx tsx scripts/enrich-locality.ts --all
 *   npx tsx scripts/enrich-locality.ts --all --dry-run
 */

import { createClient } from "@libsql/client";

// We need to set up the DB client before importing domain code
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:data.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const args = process.argv.slice(2);
  const cityIdx = args.indexOf("--city");
  const codeIdx = args.indexOf("--code");
  const isAll = args.includes("--all");
  const isDryRun = args.includes("--dry-run");

  const city = cityIdx !== -1 ? args[cityIdx + 1] : undefined;
  const code = codeIdx !== -1 ? args[codeIdx + 1] : undefined;

  if (!city && !code && !isAll) {
    console.log("Usage:");
    console.log('  npx tsx scripts/enrich-locality.ts --city "Lyon"');
    console.log('  npx tsx scripts/enrich-locality.ts --code "69123"');
    console.log("  npx tsx scripts/enrich-locality.ts --all");
    console.log("  npx tsx scripts/enrich-locality.ts --all --dry-run");
    process.exit(1);
  }

  // Dynamically import after setting up env
  const { enrichLocality } = await import("@/domains/locality/enrichment/pipeline");
  const { findLocalityByCity } = await import("@/domains/locality/repository");

  if (isAll) {
    // Enrich all localities of type "ville"
    const result = await client.execute(
      "SELECT id, name, code FROM localities WHERE type = 'ville' ORDER BY name"
    );

    console.log(`Found ${result.rows.length} cities to enrich.`);

    for (const row of result.rows) {
      const id = row.id as string;
      const name = row.name as string;

      if (isDryRun) {
        console.log(`  [DRY-RUN] Would enrich: ${name} (${id})`);
        continue;
      }

      console.log(`  Enriching ${name}...`);
      try {
        const enrichResult = await enrichLocality(id, { force: true, enrichParents: false });
        const sources = enrichResult.sourceReports
          .filter((s) => s.status === "ok")
          .map((s) => `${s.source}(${s.fieldCount})`)
          .join(", ");
        console.log(`    -> ${enrichResult.fieldsUpdated} champs, ${enrichResult.fieldsSkipped} ignorés [${sources}] (${enrichResult.durationMs}ms)`);
      } catch (e) {
        console.error(`    -> ERREUR: ${e instanceof Error ? e.message : e}`);
      }

      // Rate limiting: 200ms between cities
      await new Promise((r) => setTimeout(r, 200));
    }
  } else {
    // Single city
    const locality = await findLocalityByCity(city || "", undefined, code);
    if (!locality) {
      console.error(`Localité introuvable: ${city || code}`);
      process.exit(1);
    }

    if (isDryRun) {
      console.log(`[DRY-RUN] Would enrich: ${locality.name} (${locality.id})`);
      return;
    }

    console.log(`Enriching ${locality.name} (${locality.id})...`);
    const enrichResult = await enrichLocality(locality.id, { force: true, enrichParents: true });

    console.log(`\nRésultat:`);
    console.log(`  Champs mis à jour: ${enrichResult.fieldsUpdated}`);
    console.log(`  Champs ignorés: ${enrichResult.fieldsSkipped}`);
    console.log(`  Durée: ${enrichResult.durationMs}ms`);
    console.log(`\nSources:`);
    for (const report of enrichResult.sourceReports) {
      const icon = report.status === "ok" ? "+" : report.status === "error" ? "x" : "-";
      console.log(`  [${icon}] ${report.source}: ${report.fieldCount} champs${report.error ? ` (${report.error})` : ""}`);
    }

    if (enrichResult.parentResults?.length) {
      console.log(`\nParent:`);
      for (const pr of enrichResult.parentResults) {
        console.log(`  ${pr.localityName}: ${pr.fieldsUpdated} champs`);
      }
    }
  }

  console.log("\nDone.");
}

main().catch(console.error);
