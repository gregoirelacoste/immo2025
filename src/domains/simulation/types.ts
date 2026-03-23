export interface Simulation {
  id: string;
  property_id: string;
  user_id: string;
  name: string;
  // Négociation
  negotiated_price: number; // 0 = prix affiché, > 0 = prix après négociation
  // Paramètres financiers
  loan_amount: number;
  interest_rate: number;
  loan_duration: number;
  personal_contribution: number;
  insurance_rate: number;
  loan_fees: number;
  notary_fees: number;
  monthly_rent: number;
  condo_charges: number;
  property_tax: number;
  vacancy_rate: number;
  airbnb_price_per_night: number;
  airbnb_occupancy_rate: number;
  airbnb_charges: number;
  renovation_cost: number;
  fiscal_regime: string;
  // Charges récurrentes
  maintenance_per_m2: number; // provision entretien/réparation en €/m²/an
  pno_insurance: number; // assurance PNO en €/an
  gli_rate: number; // taux GLI (garantie loyers impayés) en % du loyer annuel
  // Bilan de sortie
  holding_duration: number; // durée de détention en années (0 = utiliser loan_duration)
  annual_appreciation: number; // % d'appréciation annuelle du bien
  created_at: string;
  updated_at: string;
}

export type SimulationFormData = Omit<Simulation, "id" | "property_id" | "user_id" | "created_at" | "updated_at">;

/** Fields that can be adjusted in the simulator.
 *  Note: condo_charges & property_tax are factual data from the property and NOT adjustable.
 *  monthly_rent is adjustable (0 = fallback to property value).
 */
export const SIMULATION_FIELDS = [
  "negotiated_price",
  "loan_amount",
  "interest_rate",
  "loan_duration",
  "personal_contribution",
  "insurance_rate",
  "loan_fees",
  "notary_fees",
  "monthly_rent",
  "vacancy_rate",
  "airbnb_price_per_night",
  "airbnb_occupancy_rate",
  "airbnb_charges",
  "renovation_cost",
  "fiscal_regime",
  "maintenance_per_m2",
  "pno_insurance",
  "gli_rate",
  "holding_duration",
  "annual_appreciation",
] as const;

export type SimulationField = typeof SIMULATION_FIELDS[number];
