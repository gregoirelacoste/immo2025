export const LOCALITY_TYPES = [
  "pays",
  "region",
  "departement",
  "canton",
  "ville",
  "quartier",
  "rue",
] as const;

export type LocalityType = (typeof LOCALITY_TYPES)[number];

/** Hierarchy depth: lower = more general, higher = more specific */
export const LOCALITY_DEPTH: Record<LocalityType, number> = {
  pays: 0,
  region: 1,
  departement: 2,
  canton: 3,
  ville: 4,
  quartier: 5,
  rue: 6,
};

export interface Locality {
  id: string;
  name: string;
  type: LocalityType;
  parent_id: string | null;
  code: string;
  postal_codes: string; // JSON array
  created_at: string;
  updated_at: string;
}

export interface LocalityData {
  id: string;
  locality_id: string;
  valid_from: string; // YYYY-MM-DD
  valid_to: string | null;
  data: string; // JSON: LocalityDataFields
  created_by: string;
  created_at: string;
}

/**
 * All metrics stored per locality snapshot.
 * Every field is optional — fallback to parent for missing fields.
 */
export interface LocalityDataFields {
  // Prix immobilier
  avg_purchase_price_per_m2?: number | null;
  median_purchase_price_per_m2?: number | null;
  transaction_count?: number | null;

  // Marche locatif
  avg_rent_per_m2?: number | null;
  avg_rent_furnished_per_m2?: number | null;
  vacancy_rate?: number | null;

  // Charges et taxes
  avg_condo_charges_per_m2?: number | null;
  avg_property_tax_per_m2?: number | null;

  // Airbnb
  avg_airbnb_night_price?: number | null;
  avg_airbnb_occupancy_rate?: number | null;

  // Socio-economique
  population?: number | null;
  population_growth_pct?: number | null;
  median_income?: number | null;
  poverty_rate?: number | null;
  unemployment_rate?: number | null;

  // Infrastructure
  school_count?: number | null;
  university_nearby?: boolean | null;
  public_transport_score?: number | null;

  // Risques
  risk_level?: "faible" | "moyen" | "élevé" | null;
  natural_risks?: Array<{ type: string; level: string }> | null;
}

/** All field keys of LocalityDataFields */
export const LOCALITY_DATA_FIELD_KEYS: (keyof LocalityDataFields)[] = [
  "avg_purchase_price_per_m2",
  "median_purchase_price_per_m2",
  "transaction_count",
  "avg_rent_per_m2",
  "avg_rent_furnished_per_m2",
  "vacancy_rate",
  "avg_condo_charges_per_m2",
  "avg_property_tax_per_m2",
  "avg_airbnb_night_price",
  "avg_airbnb_occupancy_rate",
  "population",
  "population_growth_pct",
  "median_income",
  "poverty_rate",
  "unemployment_rate",
  "school_count",
  "university_nearby",
  "public_transport_score",
  "risk_level",
  "natural_risks",
];

/** Resolved locality data with source tracking per field */
export interface ResolvedLocalityData {
  locality: Locality;
  fields: LocalityDataFields;
  /** Which locality provided each field (for traceability) */
  fieldSources: Partial<Record<keyof LocalityDataFields, { localityId: string; localityName: string; localityType: LocalityType }>>;
}
