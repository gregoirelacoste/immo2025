export interface Property {
  id: string;
  // Infos du bien
  address: string;
  city: string;
  postal_code: string;
  purchase_price: number;
  surface: number;
  property_type: "ancien" | "neuf";
  description: string;
  // Prêt
  loan_amount: number;
  interest_rate: number;
  loan_duration: number; // en années
  personal_contribution: number;
  insurance_rate: number;
  loan_fees: number;
  // Frais de notaire
  notary_fees: number;
  // Location classique
  rent_per_m2: number; // loyer au m² — 0 = auto (market data)
  monthly_rent: number;
  condo_charges: number;
  property_tax: number;
  vacancy_rate: number; // en %
  // Airbnb
  airbnb_price_per_night: number;
  airbnb_occupancy_rate: number; // en %
  airbnb_charges: number;
  // Ownership & visibility
  user_id: string;
  visibility: "public" | "private";
  // Enrichissement
  latitude: number | null;
  longitude: number | null;
  market_data: string; // JSON: MarketData snapshot
  investment_score: number | null;
  score_breakdown: string; // JSON: InvestmentScoreBreakdown
  socioeconomic_data: string; // JSON: SocioEconomicData
  enrichment_status: string; // "pending" | "running" | "done" | "error"
  enrichment_error: string;
  enrichment_at: string;
  // Collecte (URLs et textes ajoutés par l'utilisateur)
  collect_urls: string;  // JSON: string[] — toutes les URLs ajoutées
  collect_texts: string; // JSON: string[] — tous les textes collés
  // Équipements / commodités
  amenities: string; // JSON: string[] — clés d'équipements (garage, parking, cave, balcon, etc.)
  // Metadata
  source_url: string;    // URL active (= première de collect_urls, utilisée pour le scraping)
  image_urls: string;    // JSON array of image URLs
  prefill_sources: string; // JSON: { field: { source, value } }
  created_at: string;
  updated_at: string;
}

export type PropertyFormData = Omit<Property, "id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "socioeconomic_data" | "enrichment_status" | "enrichment_error" | "enrichment_at" | "collect_urls" | "collect_texts">;

export interface PropertyCalculations {
  // Prêt
  monthly_payment: number;
  monthly_insurance: number;
  total_loan_cost: number;
  total_notary_fees: number;
  total_project_cost: number;
  // Location classique
  gross_yield: number;
  net_yield: number;
  monthly_cashflow: number;
  annual_rent_income: number;
  annual_charges: number;
  // Airbnb
  airbnb_gross_yield: number;
  airbnb_net_yield: number;
  airbnb_monthly_cashflow: number;
  airbnb_annual_income: number;
  airbnb_annual_charges: number;
}
