import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { requireUserId } from "@/lib/auth-actions";
import { Property } from "./types";

/** Strip metadata fields from a Property, returning only the mutable data fields. */
export function stripMeta(p: Property) {
  const { id, user_id, created_at, updated_at, ...rest } = p;
  void id; void user_id; void created_at; void updated_at;
  return rest;
}

/**
 * Returns the property and the effective userId for mutation.
 * - Orphaned property (user_id empty/null): allowed without auth.
 * - Owned property: requires auth + ownership, throws otherwise.
 */
export async function getOwnerOrAllowOrphan(
  propertyId: string
): Promise<{ property: Property; userId: string | null }> {
  const orphan = await getOrphanPropertyById(propertyId);
  if (orphan) {
    return { property: orphan, userId: null };
  }
  const userId = await requireUserId();
  const property = await getOwnPropertyById(propertyId, userId);
  if (!property) throw new Error("Bien introuvable ou accès refusé.");
  return { property, userId };
}

/** All visible properties: public + user's own private (if logged in) */
export async function getVisibleProperties(userId?: string): Promise<Property[]> {
  const db = await getDb();
  if (userId) {
    const result = await db.execute({
      sql: "SELECT * FROM properties WHERE visibility = 'public' OR user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });
    return result.rows.map((r) => rowAs<Property>(r));
  }
  const result = await db.execute(
    "SELECT * FROM properties WHERE visibility = 'public' ORDER BY created_at DESC"
  );
  return result.rows.map((r) => rowAs<Property>(r));
}

/** Get a property if it's public or owned by the user */
export async function getPropertyById(
  id: string,
  userId?: string
): Promise<Property | undefined> {
  const db = await getDb();
  if (userId) {
    const result = await db.execute({
      sql: "SELECT * FROM properties WHERE id = ? AND (visibility = 'public' OR user_id = ?)",
      args: [id, userId],
    });
    return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
  }
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE id = ? AND visibility = 'public'",
    args: [id],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

/** Strict ownership check — for edit/delete */
export async function getOwnPropertyById(
  id: string,
  userId: string
): Promise<Property | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

/** Get a property only if it has no owner (user_id empty or null) */
export async function getOrphanPropertyById(
  id: string
): Promise<Property | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE id = ? AND (user_id = '' OR user_id IS NULL)",
    args: [id],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

export async function getPropertyBySourceUrl(
  sourceUrl: string,
  userId: string
): Promise<Property | undefined> {
  if (!sourceUrl) return undefined;
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE source_url = ? AND user_id = ? LIMIT 1",
    args: [sourceUrl, userId],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

export async function createProperty(
  property: Omit<Property, "id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at">
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO properties (
        id, user_id, visibility, address, city, postal_code, purchase_price, surface, property_type, description,
        loan_amount, interest_rate, loan_duration, personal_contribution,
        insurance_rate, loan_fees, notary_fees, monthly_rent, condo_charges,
        property_tax, vacancy_rate, airbnb_price_per_night, airbnb_occupancy_rate,
        airbnb_charges, source_url, image_urls, prefill_sources, created_at, updated_at
      ) VALUES (
        $id, $user_id, $visibility, $address, $city, $postal_code, $purchase_price, $surface, $property_type, $description,
        $loan_amount, $interest_rate, $loan_duration, $personal_contribution,
        $insurance_rate, $loan_fees, $notary_fees, $monthly_rent, $condo_charges,
        $property_tax, $vacancy_rate, $airbnb_price_per_night, $airbnb_occupancy_rate,
        $airbnb_charges, $source_url, $image_urls, $prefill_sources, $created_at, $updated_at
      )
    `,
    args: { ...property, id, created_at: now, updated_at: now },
  });

  return id;
}

export async function updateProperty(
  id: string,
  userId: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at">
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE properties SET
        visibility = $visibility, address = $address, city = $city, postal_code = $postal_code,
        purchase_price = $purchase_price, surface = $surface,
        property_type = $property_type, description = $description,
        loan_amount = $loan_amount, interest_rate = $interest_rate,
        loan_duration = $loan_duration, personal_contribution = $personal_contribution,
        insurance_rate = $insurance_rate, loan_fees = $loan_fees,
        notary_fees = $notary_fees, monthly_rent = $monthly_rent,
        condo_charges = $condo_charges, property_tax = $property_tax,
        vacancy_rate = $vacancy_rate, airbnb_price_per_night = $airbnb_price_per_night,
        airbnb_occupancy_rate = $airbnb_occupancy_rate, airbnb_charges = $airbnb_charges,
        source_url = $source_url, image_urls = $image_urls,
        prefill_sources = $prefill_sources, updated_at = $updated_at
      WHERE id = $id AND user_id = $user_id
    `,
    args: { ...property, id, user_id: userId, updated_at: now },
  });
}

/** Update an orphaned property (no owner check — only for user_id = '' or NULL) */
export async function updateOrphanProperty(
  id: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at">
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE properties SET
        visibility = $visibility, address = $address, city = $city, postal_code = $postal_code,
        purchase_price = $purchase_price, surface = $surface,
        property_type = $property_type, description = $description,
        loan_amount = $loan_amount, interest_rate = $interest_rate,
        loan_duration = $loan_duration, personal_contribution = $personal_contribution,
        insurance_rate = $insurance_rate, loan_fees = $loan_fees,
        notary_fees = $notary_fees, monthly_rent = $monthly_rent,
        condo_charges = $condo_charges, property_tax = $property_tax,
        vacancy_rate = $vacancy_rate, airbnb_price_per_night = $airbnb_price_per_night,
        airbnb_occupancy_rate = $airbnb_occupancy_rate, airbnb_charges = $airbnb_charges,
        source_url = $source_url, image_urls = $image_urls,
        prefill_sources = $prefill_sources, updated_at = $updated_at
      WHERE id = $id AND (user_id = '' OR user_id IS NULL)
    `,
    args: { ...property, id, updated_at: now },
  });
}

export async function getPropertyByIdPublic(id: string): Promise<Property | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM properties WHERE id = ?", args: [id] });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

export async function updateEnrichmentFields(
  id: string,
  fields: Partial<{
    latitude: number | null;
    longitude: number | null;
    market_data: string;
    investment_score: number | null;
    score_breakdown: string;
    enrichment_status: string;
    enrichment_error: string;
    enrichment_at: string;
  }>
): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    args.push(value ?? null);
  }

  if (setClauses.length === 0) return;

  args.push(id);
  await db.execute({
    sql: `UPDATE properties SET ${setClauses.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
    args,
  });
}

export async function deleteProperty(id: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM properties WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}
