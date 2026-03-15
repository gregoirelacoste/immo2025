import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { requireUserId, isAdmin } from "@/lib/auth-actions";
import { Property } from "./types";

/** Strip metadata fields from a Property, returning only the mutable data fields. */
export function stripMeta(p: Property) {
  const {
    id: _id, user_id: _user_id, created_at: _created_at, updated_at: _updated_at,
    latitude: _latitude, longitude: _longitude, market_data: _market_data,
    investment_score: _investment_score, score_breakdown: _score_breakdown,
    socioeconomic_data: _socioeconomic_data, enrichment_status: _enrichment_status,
    enrichment_error: _enrichment_error, enrichment_at: _enrichment_at,
    collect_urls: _collect_urls, collect_texts: _collect_texts,
    is_favorite: _is_favorite, status_changed_at: _status_changed_at,
    ...rest
  } = p;
  return rest;
}

/**
 * Returns the property and the effective userId for mutation.
 * - Orphaned property (user_id empty/null): allowed without auth.
 * - Admin: allowed on any property (returns userId = "admin").
 * - Owned property: requires auth + ownership, throws otherwise.
 */
export async function getOwnerOrAllowOrphan(
  propertyId: string
): Promise<{ property: Property; userId: string | null; adminAccess?: boolean }> {
  const orphan = await getOrphanPropertyById(propertyId);
  if (orphan) {
    return { property: orphan, userId: null };
  }
  const userId = await requireUserId();
  // Admin can access any property
  const admin = await isAdmin();
  if (admin) {
    const property = await getPropertyByIdPublic(propertyId);
    if (!property) throw new Error("Bien introuvable.");
    return { property, userId, adminAccess: true };
  }
  const property = await getOwnPropertyById(propertyId, userId);
  if (!property) throw new Error("Bien introuvable ou accès refusé.");
  return { property, userId };
}

/** All visible properties: admin sees ALL, others see public + own private */
export async function getVisibleProperties(userId?: string, admin = false): Promise<Property[]> {
  const db = await getDb();
  if (admin) {
    const result = await db.execute("SELECT * FROM properties ORDER BY created_at DESC");
    return result.rows.map((r) => rowAs<Property>(r));
  }
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

/** Get a property if it's public or owned by the user (admin sees any) */
export async function getPropertyById(
  id: string,
  userId?: string,
  admin = false
): Promise<Property | undefined> {
  const db = await getDb();
  if (admin) {
    const result = await db.execute({ sql: "SELECT * FROM properties WHERE id = ?", args: [id] });
    return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
  }
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

/**
 * Check for orphan properties (no user_id) with the same source_url.
 * Used to prevent duplicate creation when user is not logged in.
 */
export async function getOrphanPropertyBySourceUrl(
  sourceUrl: string
): Promise<Property | undefined> {
  if (!sourceUrl) return undefined;
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE source_url = ? AND (user_id = '' OR user_id IS NULL) LIMIT 1",
    args: [sourceUrl],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

/**
 * Find a recently created property by user with matching key data.
 * Used to prevent duplicate creation when importing via different methods (URL + text).
 */
export async function getRecentDuplicateProperty(
  userId: string | null,
  city: string,
  purchasePrice: number,
  surface: number
): Promise<Property | undefined> {
  if (!city || purchasePrice <= 0 || surface <= 0) return undefined;
  const db = await getDb();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const sql = userId
    ? "SELECT * FROM properties WHERE user_id = ? AND city = ? AND purchase_price = ? AND surface = ? AND created_at > ? LIMIT 1"
    : "SELECT * FROM properties WHERE (user_id = '' OR user_id IS NULL) AND city = ? AND purchase_price = ? AND surface = ? AND created_at > ? LIMIT 1";
  const args = userId
    ? [userId, city, purchasePrice, surface, fiveMinutesAgo]
    : [city, purchasePrice, surface, fiveMinutesAgo];
  const result = await db.execute({ sql, args });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

export async function createProperty(
  property: Omit<Property, "id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at" | "socioeconomic_data" | "collect_urls" | "collect_texts" | "property_status" | "is_favorite" | "status_changed_at">
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO properties (
        id, user_id, visibility, address, city, postal_code, purchase_price, surface, property_type, description, neighborhood,
        loan_amount, interest_rate, loan_duration, personal_contribution,
        insurance_rate, loan_fees, notary_fees, rent_per_m2, monthly_rent, condo_charges,
        property_tax, vacancy_rate, airbnb_price_per_night, airbnb_occupancy_rate,
        airbnb_charges, renovation_cost, dpe_rating, fiscal_regime,
        amenities, source_url, image_urls, prefill_sources, created_at, updated_at
      ) VALUES (
        $id, $user_id, $visibility, $address, $city, $postal_code, $purchase_price, $surface, $property_type, $description, $neighborhood,
        $loan_amount, $interest_rate, $loan_duration, $personal_contribution,
        $insurance_rate, $loan_fees, $notary_fees, $rent_per_m2, $monthly_rent, $condo_charges,
        $property_tax, $vacancy_rate, $airbnb_price_per_night, $airbnb_occupancy_rate,
        $airbnb_charges, $renovation_cost, $dpe_rating, $fiscal_regime,
        $amenities, $source_url, $image_urls, $prefill_sources, $created_at, $updated_at
      )
    `,
    args: {
      id,
      user_id: property.user_id,
      visibility: property.visibility,
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      purchase_price: property.purchase_price,
      surface: property.surface,
      property_type: property.property_type,
      description: property.description,
      neighborhood: property.neighborhood || "",
      loan_amount: property.loan_amount,
      interest_rate: property.interest_rate,
      loan_duration: property.loan_duration,
      personal_contribution: property.personal_contribution,
      insurance_rate: property.insurance_rate,
      loan_fees: property.loan_fees,
      notary_fees: property.notary_fees,
      rent_per_m2: property.rent_per_m2,
      monthly_rent: property.monthly_rent,
      condo_charges: property.condo_charges,
      property_tax: property.property_tax,
      vacancy_rate: property.vacancy_rate,
      airbnb_price_per_night: property.airbnb_price_per_night,
      airbnb_occupancy_rate: property.airbnb_occupancy_rate,
      airbnb_charges: property.airbnb_charges,
      renovation_cost: property.renovation_cost,
      dpe_rating: property.dpe_rating,
      fiscal_regime: property.fiscal_regime,
      amenities: property.amenities,
      source_url: property.source_url,
      image_urls: property.image_urls,
      prefill_sources: property.prefill_sources,
      created_at: now,
      updated_at: now,
    },
  });

  return id;
}

export async function updateProperty(
  id: string,
  userId: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at" | "socioeconomic_data" | "collect_urls" | "collect_texts" | "property_status" | "is_favorite" | "status_changed_at">
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE properties SET
        visibility = $visibility, address = $address, city = $city, postal_code = $postal_code,
        purchase_price = $purchase_price, surface = $surface,
        property_type = $property_type, description = $description, neighborhood = $neighborhood,
        loan_amount = $loan_amount, interest_rate = $interest_rate,
        loan_duration = $loan_duration, personal_contribution = $personal_contribution,
        insurance_rate = $insurance_rate, loan_fees = $loan_fees,
        notary_fees = $notary_fees, rent_per_m2 = $rent_per_m2, monthly_rent = $monthly_rent,
        condo_charges = $condo_charges, property_tax = $property_tax,
        vacancy_rate = $vacancy_rate, airbnb_price_per_night = $airbnb_price_per_night,
        airbnb_occupancy_rate = $airbnb_occupancy_rate, airbnb_charges = $airbnb_charges,
        renovation_cost = $renovation_cost, dpe_rating = $dpe_rating, fiscal_regime = $fiscal_regime,
        amenities = $amenities, source_url = $source_url, image_urls = $image_urls,
        prefill_sources = $prefill_sources, updated_at = $updated_at
      WHERE id = $id AND user_id = $user_id
    `,
    args: {
      id,
      user_id: userId,
      visibility: property.visibility,
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      purchase_price: property.purchase_price,
      surface: property.surface,
      property_type: property.property_type,
      description: property.description,
      neighborhood: property.neighborhood || "",
      loan_amount: property.loan_amount,
      interest_rate: property.interest_rate,
      loan_duration: property.loan_duration,
      personal_contribution: property.personal_contribution,
      insurance_rate: property.insurance_rate,
      loan_fees: property.loan_fees,
      notary_fees: property.notary_fees,
      rent_per_m2: property.rent_per_m2,
      monthly_rent: property.monthly_rent,
      condo_charges: property.condo_charges,
      property_tax: property.property_tax,
      vacancy_rate: property.vacancy_rate,
      airbnb_price_per_night: property.airbnb_price_per_night,
      airbnb_occupancy_rate: property.airbnb_occupancy_rate,
      airbnb_charges: property.airbnb_charges,
      renovation_cost: property.renovation_cost,
      dpe_rating: property.dpe_rating,
      fiscal_regime: property.fiscal_regime,
      amenities: property.amenities,
      source_url: property.source_url,
      image_urls: property.image_urls,
      prefill_sources: property.prefill_sources,
      updated_at: now,
    },
  });
}

/** Update an orphaned property (no owner check — only for user_id = '' or NULL) */
export async function updateOrphanProperty(
  id: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at" | "socioeconomic_data" | "collect_urls" | "collect_texts" | "property_status" | "is_favorite" | "status_changed_at">
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE properties SET
        visibility = $visibility, address = $address, city = $city, postal_code = $postal_code,
        purchase_price = $purchase_price, surface = $surface,
        property_type = $property_type, description = $description, neighborhood = $neighborhood,
        loan_amount = $loan_amount, interest_rate = $interest_rate,
        loan_duration = $loan_duration, personal_contribution = $personal_contribution,
        insurance_rate = $insurance_rate, loan_fees = $loan_fees,
        notary_fees = $notary_fees, rent_per_m2 = $rent_per_m2, monthly_rent = $monthly_rent,
        condo_charges = $condo_charges, property_tax = $property_tax,
        vacancy_rate = $vacancy_rate, airbnb_price_per_night = $airbnb_price_per_night,
        airbnb_occupancy_rate = $airbnb_occupancy_rate, airbnb_charges = $airbnb_charges,
        renovation_cost = $renovation_cost, dpe_rating = $dpe_rating, fiscal_regime = $fiscal_regime,
        amenities = $amenities, source_url = $source_url, image_urls = $image_urls,
        prefill_sources = $prefill_sources, updated_at = $updated_at
      WHERE id = $id AND (user_id = '' OR user_id IS NULL)
    `,
    args: {
      id,
      visibility: property.visibility,
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      purchase_price: property.purchase_price,
      surface: property.surface,
      property_type: property.property_type,
      description: property.description,
      neighborhood: property.neighborhood || "",
      loan_amount: property.loan_amount,
      interest_rate: property.interest_rate,
      loan_duration: property.loan_duration,
      personal_contribution: property.personal_contribution,
      insurance_rate: property.insurance_rate,
      loan_fees: property.loan_fees,
      notary_fees: property.notary_fees,
      rent_per_m2: property.rent_per_m2,
      monthly_rent: property.monthly_rent,
      condo_charges: property.condo_charges,
      property_tax: property.property_tax,
      vacancy_rate: property.vacancy_rate,
      airbnb_price_per_night: property.airbnb_price_per_night,
      airbnb_occupancy_rate: property.airbnb_occupancy_rate,
      airbnb_charges: property.airbnb_charges,
      renovation_cost: property.renovation_cost,
      dpe_rating: property.dpe_rating,
      fiscal_regime: property.fiscal_regime,
      amenities: property.amenities,
      source_url: property.source_url,
      image_urls: property.image_urls,
      prefill_sources: property.prefill_sources,
      updated_at: now,
    },
  });
}

export async function getPropertyByIdPublic(id: string): Promise<Property | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM properties WHERE id = ?", args: [id] });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

const ENRICHMENT_FIELDS = new Set([
  "latitude", "longitude", "market_data", "investment_score",
  "score_breakdown", "socioeconomic_data", "enrichment_status",
  "enrichment_error", "enrichment_at",
]);

export async function updateEnrichmentFields(
  id: string,
  fields: Partial<{
    latitude: number | null;
    longitude: number | null;
    market_data: string;
    investment_score: number | null;
    score_breakdown: string;
    socioeconomic_data: string;
    enrichment_status: string;
    enrichment_error: string;
    enrichment_at: string;
  }>
): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!ENRICHMENT_FIELDS.has(key)) continue;
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

const COLLECT_FIELDS = new Set(["collect_urls", "collect_texts", "source_url"]);

/** Update collect fields (URLs and texts lists) + source_url */
export async function updateCollectFields(
  id: string,
  fields: Partial<{
    collect_urls: string;
    collect_texts: string;
    source_url: string;
  }>
): Promise<void> {
  const db = await getDb();
  const setClauses: string[] = [];
  const args: (string | null)[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!COLLECT_FIELDS.has(key)) continue;
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

export async function updatePropertyStatus(
  id: string,
  status: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE properties SET property_status = ?, status_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    args: [status, id, userId],
  });
}

export async function togglePropertyFavorite(
  id: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE properties SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

export async function deleteProperty(id: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM properties WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

/** Admin: update any property regardless of ownership */
export async function updatePropertyAsAdmin(
  id: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "enrichment_status" | "enrichment_error" | "enrichment_at" | "socioeconomic_data" | "collect_urls" | "collect_texts" | "property_status" | "is_favorite" | "status_changed_at">
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE properties SET
        visibility = $visibility, address = $address, city = $city, postal_code = $postal_code,
        purchase_price = $purchase_price, surface = $surface,
        property_type = $property_type, description = $description, neighborhood = $neighborhood,
        loan_amount = $loan_amount, interest_rate = $interest_rate,
        loan_duration = $loan_duration, personal_contribution = $personal_contribution,
        insurance_rate = $insurance_rate, loan_fees = $loan_fees,
        notary_fees = $notary_fees, rent_per_m2 = $rent_per_m2, monthly_rent = $monthly_rent,
        condo_charges = $condo_charges, property_tax = $property_tax,
        vacancy_rate = $vacancy_rate, airbnb_price_per_night = $airbnb_price_per_night,
        airbnb_occupancy_rate = $airbnb_occupancy_rate, airbnb_charges = $airbnb_charges,
        renovation_cost = $renovation_cost, dpe_rating = $dpe_rating, fiscal_regime = $fiscal_regime,
        amenities = $amenities, source_url = $source_url, image_urls = $image_urls,
        prefill_sources = $prefill_sources, updated_at = $updated_at
      WHERE id = $id
    `,
    args: {
      id,
      visibility: property.visibility,
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      purchase_price: property.purchase_price,
      surface: property.surface,
      property_type: property.property_type,
      description: property.description,
      neighborhood: property.neighborhood || "",
      loan_amount: property.loan_amount,
      interest_rate: property.interest_rate,
      loan_duration: property.loan_duration,
      personal_contribution: property.personal_contribution,
      insurance_rate: property.insurance_rate,
      loan_fees: property.loan_fees,
      notary_fees: property.notary_fees,
      rent_per_m2: property.rent_per_m2,
      monthly_rent: property.monthly_rent,
      condo_charges: property.condo_charges,
      property_tax: property.property_tax,
      vacancy_rate: property.vacancy_rate,
      airbnb_price_per_night: property.airbnb_price_per_night,
      airbnb_occupancy_rate: property.airbnb_occupancy_rate,
      airbnb_charges: property.airbnb_charges,
      renovation_cost: property.renovation_cost,
      dpe_rating: property.dpe_rating,
      fiscal_regime: property.fiscal_regime,
      amenities: property.amenities,
      source_url: property.source_url,
      image_urls: property.image_urls,
      prefill_sources: property.prefill_sources,
      updated_at: now,
    },
  });
}

export async function updatePropertyStatusAsAdmin(id: string, status: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE properties SET property_status = ?, status_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    args: [status, id],
  });
}

export async function togglePropertyFavoriteAsAdmin(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE properties SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?",
    args: [id],
  });
}

export async function deletePropertyAsAdmin(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM properties WHERE id = ?",
    args: [id],
  });
}
