import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { ScrapingManifest } from "./types";

export async function getManifestByHostname(
  hostname: string
): Promise<ScrapingManifest | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM scraping_manifests WHERE site_hostname = ? ORDER BY updated_at DESC LIMIT 1",
    args: [hostname],
  });
  return result.rows[0] ? rowAs<ScrapingManifest>(result.rows[0]) : undefined;
}

export async function upsertManifest(data: {
  site_hostname: string;
  page_pattern: string;
  selectors: string;
  sample_url: string;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.execute({
    sql: "SELECT id, version FROM scraping_manifests WHERE site_hostname = ? AND page_pattern = ?",
    args: [data.site_hostname, data.page_pattern],
  });

  if (existing.rows[0]) {
    const row = rowAs<{ id: string; version: number }>(existing.rows[0]);
    await db.execute({
      sql: `UPDATE scraping_manifests SET
              selectors = $selectors, version = $version,
              success_count = 0, failure_count = 0,
              sample_url = $sample_url, updated_at = $updated_at
            WHERE id = $id`,
      args: { id: row.id, selectors: data.selectors, version: row.version + 1, sample_url: data.sample_url, updated_at: now },
    });
  } else {
    await db.execute({
      sql: `INSERT INTO scraping_manifests (id, site_hostname, page_pattern, selectors, version, success_count, failure_count, sample_url, created_at, updated_at)
            VALUES ($id, $site_hostname, $page_pattern, $selectors, 1, 0, 0, $sample_url, $created_at, $updated_at)`,
      args: { id: crypto.randomUUID(), ...data, created_at: now, updated_at: now },
    });
  }
}

export async function incrementManifestSuccess(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE scraping_manifests SET success_count = success_count + 1 WHERE id = ?",
    args: [id],
  });
}

export async function incrementManifestFailure(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE scraping_manifests SET failure_count = failure_count + 1 WHERE id = ?",
    args: [id],
  });
}
