import { Property } from "@/domains/property/types";
import { LocalityDataFields } from "@/domains/locality/types";
import { Simulation } from "./types";
import { calculateNotaryFees } from "@/lib/calculations";

/**
 * Build a virtual "default" simulation — a direct mirror of property data.
 * This simulation is NOT stored in DB — it's computed on-the-fly.
 *
 * The source of truth is ALWAYS the property (= what the user sees in the tabs).
 * Locality data is only used for fields that don't exist on the property
 * (annual_appreciation). All other values come directly from the property.
 */
export function buildSystemSimulation(
  property: Property,
  localityFields?: LocalityDataFields | null
): Simulation {
  const loc = localityFields ?? {};

  const notaryFees = property.notary_fees > 0
    ? property.notary_fees
    : calculateNotaryFees(property.purchase_price, property.property_type);
  const loanAmount = Math.max(0, property.purchase_price + notaryFees + property.renovation_cost - property.personal_contribution);

  return {
    id: "__system__",
    property_id: property.id,
    user_id: "",
    name: "Défaut",
    // Loan — direct from property
    loan_amount: loanAmount,
    interest_rate: property.interest_rate,
    loan_duration: property.loan_duration,
    personal_contribution: property.personal_contribution,
    insurance_rate: property.insurance_rate,
    loan_fees: property.loan_fees,
    notary_fees: property.notary_fees,
    // Rental — direct from property (no defaults here, calculateAll handles them)
    monthly_rent: property.monthly_rent,
    condo_charges: property.condo_charges,
    property_tax: property.property_tax,
    vacancy_rate: property.vacancy_rate,
    // Airbnb — direct from property
    airbnb_price_per_night: property.airbnb_price_per_night,
    airbnb_occupancy_rate: property.airbnb_occupancy_rate,
    airbnb_charges: property.airbnb_charges,
    // Costs — direct from property
    renovation_cost: property.renovation_cost,
    fiscal_regime: property.fiscal_regime || "micro_bic",
    // Recurring charges — sensible defaults (not on property tabs)
    maintenance_per_m2: property.property_type === "neuf" ? 8 : 12,
    pno_insurance: 200,
    gli_rate: 0,
    // Exit — locality trend or default (not on property tabs)
    holding_duration: 0,
    annual_appreciation: loc.price_trend_pct ?? 1.5,
    // Timestamps (virtual)
    created_at: "",
    updated_at: "",
  };
}

/** Check if a simulation ID is the virtual system simulation */
export function isSystemSimulation(simId: string): boolean {
  return simId === "__system__";
}
