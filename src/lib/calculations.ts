import { Property, PropertyCalculations, FiscalImpact } from "@/domains/property/types";

export function calculateNotaryFees(
  price: number,
  type: "ancien" | "neuf"
): number {
  const rate = type === "ancien" ? 0.075 : 0.025;
  return Math.round(price * rate);
}

export function calculateMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  durationYears: number
): number {
  if (loanAmount <= 0 || durationYears <= 0) return 0;
  if (annualRate === 0) return loanAmount / (durationYears * 12);
  const monthlyRate = annualRate / 100 / 12;
  const months = durationYears * 12;
  return (
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

/** Calcul de l'impact fiscal simplifié (TMI par défaut 30%) */
export function calculateFiscalImpact(
  annualRent: number,
  purchasePrice: number,
  renovationCost: number,
  condoCharges: number,
  propertyTax: number,
  monthlyInsurance: number,
  loanAmount: number,
  interestRate: number,
  tmi: number = 30
): FiscalImpact {
  // Micro-BIC : abattement 50%
  const micro_bic_taxable = annualRent * 0.5;
  const micro_bic_tax = micro_bic_taxable * (tmi / 100);

  // LMNP Réel : amortissement + déduction charges
  const amort_bien = (purchasePrice * 0.85) / 30;  // hors terrain (~15%), sur 30 ans
  const amort_travaux = renovationCost > 0 ? renovationCost / 10 : 0; // sur 10 ans
  const amort_meubles = 5000 / 7;  // forfait mobilier sur 7 ans
  const interests_year1 = loanAmount * (interestRate / 100); // approximation année 1
  const charges_deductibles = condoCharges * 12 + propertyTax + monthlyInsurance * 12 + interests_year1;
  const resultat_reel = annualRent - charges_deductibles - amort_bien - amort_travaux - amort_meubles;
  const lmnp_reel_tax = Math.max(0, resultat_reel) * (tmi / 100);

  return {
    micro_bic_tax: Math.round(micro_bic_tax),
    lmnp_reel_tax: Math.round(lmnp_reel_tax),
    fiscal_savings: Math.round(micro_bic_tax - lmnp_reel_tax),
    net_net_income_micro: Math.round(annualRent - micro_bic_tax),
    net_net_income_reel: Math.round(annualRent - lmnp_reel_tax),
  };
}

export function calculateAll(property: Property): PropertyCalculations {
  const {
    purchase_price,
    property_type,
    loan_amount,
    interest_rate,
    loan_duration,
    insurance_rate,
    loan_fees,
    notary_fees,
    monthly_rent,
    condo_charges,
    property_tax,
    vacancy_rate,
    airbnb_price_per_night,
    airbnb_occupancy_rate,
    airbnb_charges,
  } = property;

  const renovation_cost = property.renovation_cost || 0;
  const fiscal_regime = property.fiscal_regime || "micro_bic";

  // Frais de notaire
  const total_notary_fees =
    notary_fees > 0 ? notary_fees : calculateNotaryFees(purchase_price, property_type);

  // Coût total du projet (inclut travaux)
  const total_project_cost = purchase_price + total_notary_fees + loan_fees + renovation_cost;

  // Mensualité crédit
  const monthly_payment = calculateMonthlyPayment(
    loan_amount,
    interest_rate,
    loan_duration
  );

  // Assurance emprunteur mensuelle
  const monthly_insurance = (loan_amount * (insurance_rate / 100)) / 12;

  // Coût total du crédit
  const total_loan_cost =
    monthly_payment * loan_duration * 12 -
    loan_amount +
    monthly_insurance * loan_duration * 12 +
    loan_fees;

  // --- Location classique ---
  const annual_rent_income = monthly_rent * 12 * (1 - vacancy_rate / 100);
  const annual_charges =
    condo_charges * 12 +
    property_tax +
    monthly_insurance * 12;

  const gross_yield =
    purchase_price > 0 ? ((monthly_rent * 12) / total_project_cost) * 100 : 0;

  const net_yield =
    purchase_price > 0
      ? ((annual_rent_income - annual_charges) / total_project_cost) * 100
      : 0;

  const monthly_cashflow =
    annual_rent_income / 12 -
    monthly_payment -
    monthly_insurance -
    condo_charges -
    property_tax / 12;

  // --- Airbnb ---
  const airbnb_annual_income =
    airbnb_price_per_night * 365 * (airbnb_occupancy_rate / 100);

  const airbnb_annual_charges = airbnb_charges * 12 + property_tax + monthly_insurance * 12;

  const airbnb_gross_yield =
    purchase_price > 0 ? (airbnb_annual_income / total_project_cost) * 100 : 0;

  const airbnb_net_yield =
    purchase_price > 0
      ? ((airbnb_annual_income - airbnb_annual_charges) / total_project_cost) * 100
      : 0;

  const airbnb_monthly_cashflow =
    airbnb_annual_income / 12 -
    monthly_payment -
    monthly_insurance -
    airbnb_charges -
    property_tax / 12;

  // --- Fiscalité ---
  const fiscal = calculateFiscalImpact(
    annual_rent_income,
    purchase_price,
    renovation_cost,
    condo_charges,
    property_tax,
    monthly_insurance,
    loan_amount,
    interest_rate
  );

  // Rendement net-net (après impôts selon régime choisi)
  const annual_tax = fiscal_regime === "lmnp_reel" ? fiscal.lmnp_reel_tax : fiscal.micro_bic_tax;
  const net_net_yield =
    purchase_price > 0
      ? ((annual_rent_income - annual_charges - annual_tax) / total_project_cost) * 100
      : 0;

  return {
    monthly_payment: Math.round(monthly_payment * 100) / 100,
    monthly_insurance: Math.round(monthly_insurance * 100) / 100,
    total_loan_cost: Math.round(total_loan_cost),
    total_notary_fees,
    total_project_cost,
    gross_yield: Math.round(gross_yield * 100) / 100,
    net_yield: Math.round(net_yield * 100) / 100,
    monthly_cashflow: Math.round(monthly_cashflow * 100) / 100,
    annual_rent_income: Math.round(annual_rent_income),
    annual_charges: Math.round(annual_charges),
    fiscal,
    net_net_yield: Math.round(net_net_yield * 100) / 100,
    airbnb_gross_yield: Math.round(airbnb_gross_yield * 100) / 100,
    airbnb_net_yield: Math.round(airbnb_net_yield * 100) / 100,
    airbnb_monthly_cashflow: Math.round(airbnb_monthly_cashflow * 100) / 100,
    airbnb_annual_income: Math.round(airbnb_annual_income),
    airbnb_annual_charges: Math.round(airbnb_annual_charges),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)} %`;
}
