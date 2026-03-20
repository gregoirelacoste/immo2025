import { InValue } from "@libsql/client";
import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import {
  Locality,
  LocalityDataFields,
  LocalityTableName,
  LOCALITY_TABLE_NAMES,
  FIELD_TO_TABLE,
  LocalityDataSnapshot,
} from "./types";

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

/**
 * Find a locality by its code and optional type.
 * Used for IRIS resolution (code = 9-digit IRIS code, type = "quartier").
 */
export async function findLocalityByCode(
  code: string,
  type?: string
): Promise<Locality | undefined> {
  const db = await getDb();
  if (type) {
    const result = await db.execute({
      sql: "SELECT * FROM localities WHERE code = ? AND type = ? LIMIT 1",
      args: [code, type],
    });
    return result.rows[0] ? rowAs<Locality>(result.rows[0]) : undefined;
  }
  const result = await db.execute({
    sql: "SELECT * FROM localities WHERE code = ? LIMIT 1",
    args: [code],
  });
  return result.rows[0] ? rowAs<Locality>(result.rows[0]) : undefined;
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
  // CASCADE on FK will delete thematic data, but let's be explicit
  for (const table of LOCALITY_TABLE_NAMES) {
    await db.execute({ sql: `DELETE FROM ${table} WHERE locality_id = ?`, args: [id] });
  }
  await db.execute({ sql: "DELETE FROM localities WHERE id = ?", args: [id] });
}

// ─── Thematic Data: Read ───

/**
 * Get the latest row from a thematic table for a single locality.
 * Returns the row with MAX(valid_from) <= asOfDate.
 */
async function getLatestRow<T>(
  table: LocalityTableName,
  localityId: string,
  asOfDate?: string
): Promise<T | undefined> {
  const db = await getDb();
  const date = asOfDate || new Date().toISOString().split("T")[0];
  const result = await db.execute({
    sql: `SELECT * FROM ${table} WHERE locality_id = ? AND valid_from <= ? ORDER BY valid_from DESC LIMIT 1`,
    args: [localityId, date],
  });
  return result.rows[0] ? rowAs<T>(result.rows[0]) : undefined;
}

/**
 * Batch-fetch latest rows from a thematic table for multiple localities.
 * Returns Map<locality_id, row>.
 */
async function getLatestRowBatch<T extends { locality_id: string }>(
  table: LocalityTableName,
  localityIds: string[],
  asOfDate?: string
): Promise<Map<string, T>> {
  if (localityIds.length === 0) return new Map();
  const db = await getDb();
  const date = asOfDate || new Date().toISOString().split("T")[0];
  const placeholders = localityIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `SELECT t.* FROM ${table} t
          INNER JOIN (
            SELECT locality_id, MAX(valid_from) as max_vf
            FROM ${table}
            WHERE locality_id IN (${placeholders})
              AND valid_from <= ?
            GROUP BY locality_id
          ) latest ON t.locality_id = latest.locality_id AND t.valid_from = latest.max_vf`,
    args: [...localityIds, date],
  });
  const map = new Map<string, T>();
  for (const r of result.rows) {
    const row = rowAs<T>(r);
    map.set(row.locality_id, row);
  }
  return map;
}

/**
 * Get all LocalityDataFields for a single locality, assembled from all thematic tables.
 */
export async function getLatestLocalityFields(
  localityId: string,
  asOfDate?: string
): Promise<LocalityDataFields> {
  const [prices, rental, charges, airbnb, socio, infra, risks, energy] = await Promise.all([
    getLatestRow<Record<string, unknown>>("locality_prices", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_rental", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_charges", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_airbnb", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_socio", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_infra", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_risks", localityId, asOfDate),
    getLatestRow<Record<string, unknown>>("locality_energy", localityId, asOfDate),
  ]);
  return assembleFields(prices, rental, charges, airbnb, socio, infra, risks, energy);
}

/**
 * Batch-fetch all LocalityDataFields for multiple localities.
 * Returns Map<locality_id, LocalityDataFields>.
 */
export async function getLatestLocalityFieldsBatch(
  localityIds: string[],
  asOfDate?: string
): Promise<Map<string, LocalityDataFields>> {
  if (localityIds.length === 0) return new Map();

  const [pricesMap, rentalMap, chargesMap, airbnbMap, socioMap, infraMap, risksMap, energyMap] = await Promise.all([
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_prices", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_rental", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_charges", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_airbnb", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_socio", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_infra", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_risks", localityIds, asOfDate),
    getLatestRowBatch<Record<string, unknown> & { locality_id: string }>("locality_energy", localityIds, asOfDate),
  ]);

  const result = new Map<string, LocalityDataFields>();
  const allIds = new Set(localityIds);
  for (const id of allIds) {
    result.set(id, assembleFields(
      pricesMap.get(id),
      rentalMap.get(id),
      chargesMap.get(id),
      airbnbMap.get(id),
      socioMap.get(id),
      infraMap.get(id),
      risksMap.get(id),
      energyMap.get(id),
    ));
  }
  return result;
}

/**
 * Batch-fetch the source string for each thematic table for multiple localities.
 * Returns Map<locality_id, Map<table_name, source>>.
 */
export async function getLatestSourcesBatch(
  localityIds: string[],
  asOfDate?: string
): Promise<Map<string, Map<LocalityTableName, string>>> {
  if (localityIds.length === 0) return new Map();
  const db = await getDb();
  const date = asOfDate || new Date().toISOString().split("T")[0];
  const placeholders = localityIds.map(() => "?").join(",");

  const result = new Map<string, Map<LocalityTableName, string>>();

  await Promise.all(
    LOCALITY_TABLE_NAMES.map(async (table) => {
      const rows = await db.execute({
        sql: `SELECT t.locality_id, t.source FROM ${table} t
              INNER JOIN (
                SELECT locality_id, MAX(valid_from) as max_vf
                FROM ${table}
                WHERE locality_id IN (${placeholders})
                  AND valid_from <= ?
                GROUP BY locality_id
              ) latest ON t.locality_id = latest.locality_id AND t.valid_from = latest.max_vf`,
        args: [...localityIds, date],
      });
      for (const r of rows.rows) {
        const locId = r.locality_id as string;
        const source = (r.source as string) || "";
        if (!result.has(locId)) result.set(locId, new Map());
        result.get(locId)!.set(table, source);
      }
    })
  );

  return result;
}

/** Assemble a LocalityDataFields object from individual thematic rows */
function assembleFields(
  prices?: Record<string, unknown>,
  rental?: Record<string, unknown>,
  charges?: Record<string, unknown>,
  airbnb?: Record<string, unknown>,
  socio?: Record<string, unknown>,
  infra?: Record<string, unknown>,
  risks?: Record<string, unknown>,
  energy?: Record<string, unknown>,
): LocalityDataFields {
  const f: LocalityDataFields = {};

  if (prices) {
    f.avg_purchase_price_per_m2 = (prices.avg_purchase_price_per_m2 as number | null) ?? null;
    f.median_purchase_price_per_m2 = (prices.median_purchase_price_per_m2 as number | null) ?? null;
    f.transaction_count = (prices.transaction_count as number | null) ?? null;
    f.price_trend_pct = (prices.price_trend_pct as number | null) ?? null;
  }
  if (rental) {
    f.avg_rent_per_m2 = (rental.avg_rent_per_m2 as number | null) ?? null;
    f.avg_rent_t1t2_per_m2 = (rental.avg_rent_t1t2_per_m2 as number | null) ?? null;
    f.avg_rent_t3plus_per_m2 = (rental.avg_rent_t3plus_per_m2 as number | null) ?? null;
    f.avg_rent_house_per_m2 = (rental.avg_rent_house_per_m2 as number | null) ?? null;
    f.avg_rent_furnished_per_m2 = (rental.avg_rent_furnished_per_m2 as number | null) ?? null;
    f.vacancy_rate = (rental.vacancy_rate as number | null) ?? null;
    f.typical_cashflow_per_m2 = (rental.typical_cashflow_per_m2 as number | null) ?? null;
    f.rent_elasticity_alpha = (rental.rent_elasticity_alpha as number | null) ?? null;
    f.rent_reference_surface = (rental.rent_reference_surface as number | null) ?? null;
  }
  if (charges) {
    f.avg_condo_charges_per_m2 = (charges.avg_condo_charges_per_m2 as number | null) ?? null;
    f.avg_property_tax_per_m2 = (charges.avg_property_tax_per_m2 as number | null) ?? null;
    f.property_tax_rate_pct = (charges.property_tax_rate_pct as number | null) ?? null;
  }
  if (airbnb) {
    f.avg_airbnb_night_price = (airbnb.avg_airbnb_night_price as number | null) ?? null;
    f.avg_airbnb_occupancy_rate = (airbnb.avg_airbnb_occupancy_rate as number | null) ?? null;
  }
  if (socio) {
    f.population = (socio.population as number | null) ?? null;
    f.population_growth_pct = (socio.population_growth_pct as number | null) ?? null;
    f.median_income = (socio.median_income as number | null) ?? null;
    f.poverty_rate = (socio.poverty_rate as number | null) ?? null;
    f.unemployment_rate = (socio.unemployment_rate as number | null) ?? null;
    f.vacant_housing_pct = (socio.vacant_housing_pct as number | null) ?? null;
    f.owner_occupier_pct = (socio.owner_occupier_pct as number | null) ?? null;
  }
  if (infra) {
    f.school_count = (infra.school_count as number | null) ?? null;
    f.university_nearby = infra.university_nearby != null ? Boolean(infra.university_nearby) : null;
    f.public_transport_score = (infra.public_transport_score as number | null) ?? null;
    f.doctor_count = (infra.doctor_count as number | null) ?? null;
    f.pharmacy_count = (infra.pharmacy_count as number | null) ?? null;
    f.supermarket_count = (infra.supermarket_count as number | null) ?? null;
  }
  if (risks) {
    f.risk_level = (risks.risk_level as LocalityDataFields["risk_level"]) ?? null;
    if (risks.natural_risks) {
      try {
        const parsed = typeof risks.natural_risks === "string"
          ? JSON.parse(risks.natural_risks)
          : risks.natural_risks;
        f.natural_risks = Array.isArray(parsed) ? parsed : null;
      } catch {
        f.natural_risks = null;
      }
    }
    f.flood_risk_level = (risks.flood_risk_level as string | null) ?? null;
    f.seismic_zone = (risks.seismic_zone as number | null) ?? null;
    f.radon_level = (risks.radon_level as number | null) ?? null;
    f.industrial_risk = (risks.industrial_risk as number | null) ?? null;
  }
  if (energy) {
    f.avg_dpe_class = (energy.avg_dpe_class as string | null) ?? null;
    f.avg_energy_consumption = (energy.avg_energy_consumption as number | null) ?? null;
    f.avg_ges_class = (energy.avg_ges_class as string | null) ?? null;
    f.dpe_count = (energy.dpe_count as number | null) ?? null;
  }

  return f;
}

// ─── Thematic Data: Write ───

/**
 * Upsert locality data fields — dispatches each field to its thematic table.
 * Uses INSERT OR REPLACE so we can update an existing snapshot for the same date.
 */
export async function upsertLocalityData(
  localityId: string,
  validFrom: string,
  fields: Partial<LocalityDataFields>,
  source: string = ""
): Promise<void> {
  const db = await getDb();

  // Group fields by table
  const byTable = new Map<LocalityTableName, Record<string, unknown>>();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const table = FIELD_TO_TABLE[key as keyof LocalityDataFields];
    if (!table) continue;
    if (!byTable.has(table)) byTable.set(table, {});
    byTable.get(table)![key] = value;
  }

  // Upsert each table
  for (const [table, tableFields] of byTable) {
    const columns = Object.keys(tableFields);
    const values = columns.map((col) => {
      const v = tableFields[col];
      // Handle special types
      if (col === "university_nearby") return v != null ? (v ? 1 : 0) : null;
      if (col === "natural_risks") return v ? JSON.stringify(v) : null;
      return v ?? null;
    });

    const allCols = ["locality_id", "valid_from", ...columns, "source"];
    const allVals: InValue[] = [localityId, validFrom, ...values as InValue[], source];
    const placeholders = allCols.map(() => "?").join(",");

    // Use ON CONFLICT upsert to update only the specified columns
    // (INSERT OR REPLACE deletes the entire row, losing unspecified columns)
    const updateSets = [...columns, "source"].map((col) => `${col} = excluded.${col}`).join(", ");

    await db.execute({
      sql: `INSERT INTO ${table} (${allCols.join(",")}) VALUES (${placeholders})
            ON CONFLICT(locality_id, valid_from) DO UPDATE SET ${updateSets}`,
      args: allVals,
    });
  }
}

/**
 * Get the raw field values for a specific snapshot row.
 * Returns key-value pairs excluding meta columns (locality_id, valid_from, source, created_at).
 */
export async function getSnapshotFields(
  table: LocalityTableName,
  localityId: string,
  validFrom: string
): Promise<Record<string, unknown> | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM ${table} WHERE locality_id = ? AND valid_from = ?`,
    args: [localityId, validFrom],
  });
  if (!result.rows[0]) return undefined;
  const row = result.rows[0];
  const meta = new Set(["locality_id", "valid_from", "source", "created_at"]);
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (!meta.has(key)) fields[key] = val;
  }
  return fields;
}

/**
 * Delete all data for a locality from a specific table and date.
 */
export async function deleteLocalityDataRow(
  table: LocalityTableName,
  localityId: string,
  validFrom: string
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `DELETE FROM ${table} WHERE locality_id = ? AND valid_from = ?`,
    args: [localityId, validFrom],
  });
}

// ─── Admin: Snapshots listing ───

/**
 * Batch-fetch all snapshots for multiple localities (admin page).
 */
export async function getLocalitySnapshotsBatch(
  localityIds: string[]
): Promise<Record<string, LocalityDataSnapshot[]>> {
  if (localityIds.length === 0) return {};
  const db = await getDb();
  const result: Record<string, LocalityDataSnapshot[]> = {};
  const placeholders = localityIds.map(() => "?").join(",");

  for (const table of LOCALITY_TABLE_NAMES) {
    const rows = await db.execute({
      sql: `SELECT * FROM ${table} WHERE locality_id IN (${placeholders}) ORDER BY valid_from DESC`,
      args: localityIds,
    });
    for (const row of rows.rows) {
      const locId = row.locality_id as string;
      const metaCols = new Set(["locality_id", "valid_from", "source", "created_at"]);
      let fieldCount = 0;
      for (const [key, val] of Object.entries(row)) {
        if (!metaCols.has(key) && val != null) fieldCount++;
      }
      (result[locId] ??= []).push({
        locality_id: locId,
        table_name: table,
        valid_from: row.valid_from as string,
        source: (row.source as string) || "",
        created_at: (row.created_at as string) || "",
        field_count: fieldCount,
      });
    }
  }

  // Sort each locality's snapshots
  for (const locId in result) {
    result[locId].sort((a, b) => b.valid_from.localeCompare(a.valid_from));
  }
  return result;
}

/**
 * Get the source of the latest data for a locality in a given table.
 * Used by data-injector to check if data is admin-protected.
 */
export async function getLatestSource(
  table: LocalityTableName,
  localityId: string
): Promise<string | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT source FROM ${table} WHERE locality_id = ? ORDER BY valid_from DESC LIMIT 1`,
    args: [localityId],
  });
  return result.rows[0] ? (result.rows[0].source as string) : null;
}
