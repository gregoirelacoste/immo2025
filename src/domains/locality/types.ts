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

/** Names of the 7 thematic tables */
export const LOCALITY_TABLE_NAMES = [
  "locality_prices",
  "locality_rental",
  "locality_charges",
  "locality_airbnb",
  "locality_socio",
  "locality_infra",
  "locality_risks",
] as const;

export type LocalityTableName = (typeof LOCALITY_TABLE_NAMES)[number];

/**
 * All metrics stored per locality — unified view across all thematic tables.
 * Every field is optional — fallback to parent for missing fields.
 * This interface is unchanged for consumers (market service, scoring, UI).
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

  // Dégressivité loyer (loi de puissance L = k × S^α)
  rent_elasticity_alpha?: number | null; // exposant α (0.6–0.8, défaut 0.72)
  rent_reference_surface?: number | null; // surface de référence du loyer moyen (défaut 45 m²)

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

  // Indicateur de rentabilité locale
  typical_cashflow_per_m2?: number | null; // €/m²/mois — cashflow mensuel typique (négatif = marché tendu)

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
  "rent_elasticity_alpha",
  "rent_reference_surface",
  "population",
  "population_growth_pct",
  "median_income",
  "poverty_rate",
  "unemployment_rate",
  "school_count",
  "university_nearby",
  "public_transport_score",
  "typical_cashflow_per_m2",
  "risk_level",
  "natural_risks",
];

/** Mapping: field key → which thematic table it belongs to */
export const FIELD_TO_TABLE: Record<keyof LocalityDataFields, LocalityTableName> = {
  avg_purchase_price_per_m2: "locality_prices",
  median_purchase_price_per_m2: "locality_prices",
  transaction_count: "locality_prices",
  avg_rent_per_m2: "locality_rental",
  avg_rent_furnished_per_m2: "locality_rental",
  vacancy_rate: "locality_rental",
  typical_cashflow_per_m2: "locality_rental",
  rent_elasticity_alpha: "locality_rental",
  rent_reference_surface: "locality_rental",
  avg_condo_charges_per_m2: "locality_charges",
  avg_property_tax_per_m2: "locality_charges",
  avg_airbnb_night_price: "locality_airbnb",
  avg_airbnb_occupancy_rate: "locality_airbnb",
  population: "locality_socio",
  population_growth_pct: "locality_socio",
  median_income: "locality_socio",
  poverty_rate: "locality_socio",
  unemployment_rate: "locality_socio",
  school_count: "locality_infra",
  university_nearby: "locality_infra",
  public_transport_score: "locality_infra",
  risk_level: "locality_risks",
  natural_risks: "locality_risks",
};

/** Resolved locality data with source tracking per field */
export interface ResolvedLocalityData {
  locality: Locality;
  fields: LocalityDataFields;
  /** Which locality provided each field (for traceability) */
  fieldSources: Partial<Record<keyof LocalityDataFields, { localityId: string; localityName: string; localityType: LocalityType }>>;
}

/**
 * Snapshot summary for admin UI — lightweight representation of data for a locality.
 * Replaces the old LocalityData type (which had a JSON blob).
 */
export interface LocalityDataSnapshot {
  locality_id: string;
  table_name: LocalityTableName;
  valid_from: string;
  source: string;
  created_at: string;
  field_count: number;
}
