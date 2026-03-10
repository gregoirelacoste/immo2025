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
  monthly_rent: number;
  condo_charges: number;
  property_tax: number;
  vacancy_rate: number; // en %
  // Airbnb
  airbnb_price_per_night: number;
  airbnb_occupancy_rate: number; // en %
  airbnb_charges: number;
  // Metadata
  source_url: string;
  image_urls: string; // JSON array of image URLs
  prefill_sources: string; // JSON: { field: { source, value } }
  created_at: string;
  updated_at: string;
}

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
