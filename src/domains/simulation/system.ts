import { Property } from "@/domains/property/types";
import { LocalityDataFields } from "@/domains/locality/types";
import { Simulation } from "./types";
import { calculateNotaryFees } from "@/lib/calculations";

/**
 * Build a virtual "system simulation" from property data + locality data.
 * This simulation is NOT stored in DB — it's computed on-the-fly.
 * It represents the baseline scenario using factual data from the property
 * and market averages from the locality hierarchy.
 *
 * Priority: property data > locality data > sensible defaults
 */
export function buildSystemSimulation(
  property: Property,
  localityFields?: LocalityDataFields | null
): Simulation {
  const surface = property.surface || 0;
  const loc = localityFields ?? {};

  // --- Rent ---
  // Property monthly_rent > locality avg rent × surface > 0
  const monthlyRent = property.monthly_rent > 0
    ? property.monthly_rent
    : (loc.avg_rent_per_m2 && surface > 0 ? Math.round(loc.avg_rent_per_m2 * surface) : 0);

  // --- Charges ---
  const condoCharges = property.condo_charges > 0
    ? property.condo_charges
    : (loc.avg_condo_charges_per_m2 && surface > 0 ? Math.round(loc.avg_condo_charges_per_m2 * surface) : 0);

  const propertyTax = property.property_tax > 0
    ? property.property_tax
    : (loc.avg_property_tax_per_m2 && surface > 0 ? Math.round(loc.avg_property_tax_per_m2 * surface) : 0);

  // --- Vacancy ---
  const vacancyRate = property.vacancy_rate > 0
    ? property.vacancy_rate
    : (loc.vacancy_rate ?? 5);

  // --- Airbnb ---
  const airbnbPricePerNight = property.airbnb_price_per_night > 0
    ? property.airbnb_price_per_night
    : (loc.avg_airbnb_night_price ?? 0);

  const airbnbOccupancyRate = property.airbnb_occupancy_rate > 0
    ? property.airbnb_occupancy_rate
    : (loc.avg_airbnb_occupancy_rate ?? 60);

  // --- Loan params (always from property) ---
  const notaryFees = property.notary_fees > 0
    ? property.notary_fees
    : calculateNotaryFees(property.purchase_price, property.property_type);
  const loanAmount = Math.max(0, property.purchase_price + notaryFees - property.personal_contribution);

  // --- Maintenance defaults ---
  const maintenancePerM2 = property.property_type === "neuf" ? 8 : 12;

  return {
    // System simulation has a fixed virtual ID
    id: "__system__",
    property_id: property.id,
    user_id: "",
    name: "Simulation système",
    // Loan
    loan_amount: loanAmount,
    interest_rate: property.interest_rate,
    loan_duration: property.loan_duration,
    personal_contribution: property.personal_contribution,
    insurance_rate: property.insurance_rate,
    loan_fees: property.loan_fees,
    notary_fees: property.notary_fees, // 0 = auto-calc in calculateAll
    // Rental
    monthly_rent: monthlyRent,
    condo_charges: condoCharges,
    property_tax: propertyTax,
    vacancy_rate: vacancyRate,
    // Airbnb
    airbnb_price_per_night: airbnbPricePerNight,
    airbnb_occupancy_rate: airbnbOccupancyRate,
    airbnb_charges: property.airbnb_charges,
    // Costs
    renovation_cost: property.renovation_cost,
    fiscal_regime: property.fiscal_regime || "micro_bic",
    // Recurring charges
    maintenance_per_m2: maintenancePerM2,
    pno_insurance: 200,
    gli_rate: 0,
    // Exit
    holding_duration: 0, // 0 = use loan_duration
    annual_appreciation: 1.5,
    // Timestamps (virtual)
    created_at: "",
    updated_at: "",
  };
}

/** Check if a simulation ID is the virtual system simulation */
export function isSystemSimulation(simId: string): boolean {
  return simId === "__system__";
}
