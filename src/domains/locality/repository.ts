import { InValue } from "@libsql/client";
import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { Locality, LocalityData } from "./types";

// ─── Localities CRUD ───

export async function getAllLocalities(): Promise<Locality[]> {
  const db = await getDb();
  const result = await db.execute("SELECT * FROM localities ORDER BY type, name");
  return result.rows.map((r) => rowAs<Locality>(r));
}

export async function getLocalityById(id: string): Promise<Locality | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM localities WHERE id = ?", args: [id] });
  return result.rows[0] ? rowAs<Locality>(result.rows[0]) : undefined;
}

/** Batch-fetch multiple localities by IDs in a single query */
export async function getLocalitiesByIds(ids: string[]): Promise<Locality[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const placeholders = ids.map(() => "?").join(",");
  const result = await db.execute({
    sql: `SELECT * FROM localities WHERE id IN (${placeholders})`,
    args: ids,
  });
  return result.rows.map((r) => rowAs<Locality>(r));
}

/** Batch-fetch latest valid data for multiple localities in one query */
export async function getLatestLocalityDataBatch(
  localityIds: string[],
  asOfDate?: string
): Promise<Map<string, LocalityData>> {
  if (localityIds.length === 0) return new Map();
  const db = await getDb();
  const date = asOfDate || new Date().toISOString().split("T")[0];
  const placeholders = localityIds.map(() => "?").join(",");
  // Use a subquery to get the latest valid_from per locality, then join
  const result = await db.execute({
    sql: `SELECT ld.* FROM locality_data ld
          INNER JOIN (
            SELECT locality_id, MAX(valid_from) as max_vf
            FROM locality_data
            WHERE locality_id IN (${placeholders})
              AND valid_from <= ?
              AND (valid_to IS NULL OR valid_to >= ?)
            GROUP BY locality_id
          ) latest ON ld.locality_id = latest.locality_id AND ld.valid_from = latest.max_vf`,
    args: [...localityIds, date, date],
  });
  const map = new Map<string, LocalityData>();
  for (const r of result.rows) {
    const d = rowAs<LocalityData>(r);
    map.set(d.locality_id, d);
  }
  return map;
}

export async function getLocalityChildren(parentId: string): Promise<Locality[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM localities WHERE parent_id = ? ORDER BY name",
    args: [parentId],
  });
  return result.rows.map((r) => rowAs<Locality>(r));
}

export async function getRootLocalities(): Promise<Locality[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM localities WHERE parent_id IS NULL ORDER BY name"
  );
  return result.rows.map((r) => rowAs<Locality>(r));
}

/**
 * Find a locality matching a city name or postal code.
 * Tries: exact code match → postal_codes contains → name match (case-insensitive).
 */
export async function findLocalityByCity(
  city: string,
  postalCode?: string,
  codeInsee?: string
): Promise<Locality | undefined> {
  const db = await getDb();

  // 1. Match by INSEE code
  if (codeInsee) {
    const result = await db.execute({
      sql: "SELECT * FROM localities WHERE code = ? LIMIT 1",
      args: [codeInsee],
    });
    if (result.rows[0]) return rowAs<Locality>(result.rows[0]);
  }

  // 2. Match by postal code (JSON array contains)
  if (postalCode) {
    const result = await db.execute({
      sql: `SELECT * FROM localities WHERE postal_codes LIKE ? LIMIT 1`,
      args: [`%"${postalCode}"%`],
    });
    if (result.rows[0]) return rowAs<Locality>(result.rows[0]);
  }

  // 3. Match by name (case-insensitive)
  if (city) {
    const normalized = city.trim();
    const result = await db.execute({
      sql: "SELECT * FROM localities WHERE LOWER(name) = LOWER(?) LIMIT 1",
      args: [normalized],
    });
    if (result.rows[0]) return rowAs<Locality>(result.rows[0]);
  }

  return undefined;
}

export async function createLocality(data: {
  name: string;
  type: string;
  parent_id?: string | null;
  code?: string;
  postal_codes?: string;
}): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO localities (id, name, type, parent_id, code, postal_codes) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.name,
      data.type,
      data.parent_id ?? null,
      data.code || "",
      data.postal_codes || "[]",
    ],
  });
  return id;
}

export async function updateLocality(
  id: string,
  data: { name?: string; type?: string; parent_id?: string | null; code?: string; postal_codes?: string }
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name); }
  if (data.type !== undefined) { sets.push("type = ?"); args.push(data.type); }
  if (data.parent_id !== undefined) { sets.push("parent_id = ?"); args.push(data.parent_id); }
  if (data.code !== undefined) { sets.push("code = ?"); args.push(data.code); }
  if (data.postal_codes !== undefined) { sets.push("postal_codes = ?"); args.push(data.postal_codes); }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE localities SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteLocality(id: string): Promise<void> {
  const db = await getDb();
  // Delete associated data first
  await db.execute({ sql: "DELETE FROM locality_data WHERE locality_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM localities WHERE id = ?", args: [id] });
}

// ─── Locality Data CRUD ───

/** Batch-fetch all locality_data rows for multiple locality IDs in a single query */
export async function getAllLocalityDataForIds(localityIds: string[]): Promise<LocalityData[]> {
  if (localityIds.length === 0) return [];
  const db = await getDb();
  const placeholders = localityIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `SELECT * FROM locality_data WHERE locality_id IN (${placeholders}) ORDER BY valid_from DESC`,
    args: localityIds,
  });
  return result.rows.map((r) => rowAs<LocalityData>(r));
}

export async function getLocalityDataHistory(localityId: string): Promise<LocalityData[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM locality_data WHERE locality_id = ? ORDER BY valid_from DESC",
    args: [localityId],
  });
  return result.rows.map((r) => rowAs<LocalityData>(r));
}

/**
 * Get the latest valid data snapshot for a locality.
 * valid_from <= today AND (valid_to IS NULL OR valid_to >= today)
 */
export async function getLatestLocalityData(
  localityId: string,
  asOfDate?: string
): Promise<LocalityData | undefined> {
  const db = await getDb();
  const date = asOfDate || new Date().toISOString().split("T")[0];
  const result = await db.execute({
    sql: `SELECT * FROM locality_data
          WHERE locality_id = ? AND valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?)
          ORDER BY valid_from DESC LIMIT 1`,
    args: [localityId, date, date],
  });
  return result.rows[0] ? rowAs<LocalityData>(result.rows[0]) : undefined;
}

export async function createLocalityData(data: {
  locality_id: string;
  valid_from: string;
  valid_to?: string | null;
  data: string; // JSON
  created_by?: string;
}): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO locality_data (id, locality_id, valid_from, valid_to, data, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, data.locality_id, data.valid_from, data.valid_to ?? null, data.data, data.created_by || ""],
  });
  return id;
}

export async function deleteLocalityData(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM locality_data WHERE id = ?", args: [id] });
}
