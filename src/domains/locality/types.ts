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

/** Names of the 9 thematic tables */
export const LOCALITY_TABLE_NAMES = [
  "locality_prices",
  "locality_rental",
  "locality_charges",
  "locality_airbnb",
  "locality_socio",
  "locality_infra",
  "locality_risks",
  "locality_energy",
  "locality_qualitative",
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
  price_trend_pct?: number | null; // évolution annuelle des prix en % (peut être négatif)
  avg_price_t1_per_m2?: number | null;     // prix moyen/m² pour T1 (1 pièce)
  avg_price_t2_per_m2?: number | null;     // prix moyen/m² pour T2 (2 pièces)
  avg_price_t3_per_m2?: number | null;     // prix moyen/m² pour T3 (3 pièces)
  avg_price_t4plus_per_m2?: number | null; // prix moyen/m² pour T4+ (4 pièces et +)

  // Marche locatif
  avg_rent_per_m2?: number | null;
  avg_rent_t1t2_per_m2?: number | null;
  avg_rent_t3plus_per_m2?: number | null;
  avg_rent_house_per_m2?: number | null;
  avg_rent_furnished_per_m2?: number | null;
  vacancy_rate?: number | null;

  // Charges et taxes
  avg_condo_charges_per_m2?: number | null;
  avg_property_tax_per_m2?: number | null;
  property_tax_rate_pct?: number | null;

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
  vacant_housing_pct?: number | null;
  owner_occupier_pct?: number | null;

  // Infrastructure
  school_count?: number | null;
  university_nearby?: boolean | null;
  public_transport_score?: number | null;
  doctor_count?: number | null;
  pharmacy_count?: number | null;
  supermarket_count?: number | null;

  // Indicateur de rentabilité locale
  typical_cashflow_per_m2?: number | null; // €/m²/mois — cashflow mensuel typique (négatif = marché tendu)

  // Risques
  risk_level?: "faible" | "moyen" | "élevé" | null;
  natural_risks?: Array<{ type: string; level: string }> | null;
  flood_risk_level?: string | null;
  seismic_zone?: number | null;
  radon_level?: number | null;
  industrial_risk?: number | null;

  // Énergie (DPE)
  avg_dpe_class?: string | null;
  avg_energy_consumption?: number | null;
  avg_ges_class?: string | null;
  dpe_count?: number | null;

  // Données qualitatives (recherche IA quartier)
  neighborhood_vibe?: string | null;
  neighborhood_strengths?: string[] | null;
  neighborhood_weaknesses?: string[] | null;
  neighborhood_urban_projects?: string[] | null;
  neighborhood_transport_details?: string | null;
  neighborhood_safety?: "sur" | "moyen" | "preoccupant" | null;
  neighborhood_investment_outlook?: string | null;
  neighborhood_main_employers?: string[] | null;
  neighborhood_target_tenants?: string | null;
}

/** All field keys of LocalityDataFields */
export const LOCALITY_DATA_FIELD_KEYS: (keyof LocalityDataFields)[] = [
  "avg_purchase_price_per_m2",
  "median_purchase_price_per_m2",
  "transaction_count",
  "price_trend_pct",
  "avg_price_t1_per_m2",
  "avg_price_t2_per_m2",
  "avg_price_t3_per_m2",
  "avg_price_t4plus_per_m2",
  "avg_rent_per_m2",
  "avg_rent_t1t2_per_m2",
  "avg_rent_t3plus_per_m2",
  "avg_rent_house_per_m2",
  "avg_rent_furnished_per_m2",
  "vacancy_rate",
  "avg_condo_charges_per_m2",
  "avg_property_tax_per_m2",
  "property_tax_rate_pct",
  "avg_airbnb_night_price",
  "avg_airbnb_occupancy_rate",
  "rent_elasticity_alpha",
  "rent_reference_surface",
  "population",
  "population_growth_pct",
  "median_income",
  "poverty_rate",
  "unemployment_rate",
  "vacant_housing_pct",
  "owner_occupier_pct",
  "school_count",
  "university_nearby",
  "public_transport_score",
  "doctor_count",
  "pharmacy_count",
  "supermarket_count",
  "typical_cashflow_per_m2",
  "risk_level",
  "natural_risks",
  "flood_risk_level",
  "seismic_zone",
  "radon_level",
  "industrial_risk",
  "avg_dpe_class",
  "avg_energy_consumption",
  "avg_ges_class",
  "dpe_count",
  "neighborhood_vibe",
  "neighborhood_strengths",
  "neighborhood_weaknesses",
  "neighborhood_urban_projects",
  "neighborhood_transport_details",
  "neighborhood_safety",
  "neighborhood_investment_outlook",
  "neighborhood_main_employers",
  "neighborhood_target_tenants",
];

/** Mapping: field key → which thematic table it belongs to */
export const FIELD_TO_TABLE: Record<keyof LocalityDataFields, LocalityTableName> = {
  avg_purchase_price_per_m2: "locality_prices",
  median_purchase_price_per_m2: "locality_prices",
  transaction_count: "locality_prices",
  price_trend_pct: "locality_prices",
  avg_price_t1_per_m2: "locality_prices",
  avg_price_t2_per_m2: "locality_prices",
  avg_price_t3_per_m2: "locality_prices",
  avg_price_t4plus_per_m2: "locality_prices",
  avg_rent_per_m2: "locality_rental",
  avg_rent_t1t2_per_m2: "locality_rental",
  avg_rent_t3plus_per_m2: "locality_rental",
  avg_rent_house_per_m2: "locality_rental",
  avg_rent_furnished_per_m2: "locality_rental",
  vacancy_rate: "locality_rental",
  typical_cashflow_per_m2: "locality_rental",
  rent_elasticity_alpha: "locality_rental",
  rent_reference_surface: "locality_rental",
  avg_condo_charges_per_m2: "locality_charges",
  avg_property_tax_per_m2: "locality_charges",
  property_tax_rate_pct: "locality_charges",
  avg_airbnb_night_price: "locality_airbnb",
  avg_airbnb_occupancy_rate: "locality_airbnb",
  population: "locality_socio",
  population_growth_pct: "locality_socio",
  median_income: "locality_socio",
  poverty_rate: "locality_socio",
  unemployment_rate: "locality_socio",
  vacant_housing_pct: "locality_socio",
  owner_occupier_pct: "locality_socio",
  school_count: "locality_infra",
  university_nearby: "locality_infra",
  public_transport_score: "locality_infra",
  doctor_count: "locality_infra",
  pharmacy_count: "locality_infra",
  supermarket_count: "locality_infra",
  risk_level: "locality_risks",
  natural_risks: "locality_risks",
  flood_risk_level: "locality_risks",
  seismic_zone: "locality_risks",
  radon_level: "locality_risks",
  industrial_risk: "locality_risks",
  avg_dpe_class: "locality_energy",
  avg_energy_consumption: "locality_energy",
  avg_ges_class: "locality_energy",
  dpe_count: "locality_energy",
  neighborhood_vibe: "locality_qualitative",
  neighborhood_strengths: "locality_qualitative",
  neighborhood_weaknesses: "locality_qualitative",
  neighborhood_urban_projects: "locality_qualitative",
  neighborhood_transport_details: "locality_qualitative",
  neighborhood_safety: "locality_qualitative",
  neighborhood_investment_outlook: "locality_qualitative",
  neighborhood_main_employers: "locality_qualitative",
  neighborhood_target_tenants: "locality_qualitative",
};

/** Resolved locality data with source tracking per field */
export interface ResolvedLocalityData {
  locality: Locality;
  fields: LocalityDataFields;
  /** Which locality provided each field (for traceability) */
  fieldSources: Partial<Record<keyof LocalityDataFields, { localityId: string; localityName: string; localityType: LocalityType }>>;
  /** Which data source provided each field (e.g. "api:dvf", "admin", "import-initial") */
  dataSources: Partial<Record<keyof LocalityDataFields, string>>;
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
