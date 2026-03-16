import { Property, PropertyCalculations, FiscalImpact, CapitalGainsTax, ExitSimulation } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";

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

export function calculateAll(property: Property, annualMaintenanceCost: number = 0): PropertyCalculations {
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
    monthly_insurance * 12 +
    annualMaintenanceCost;

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
    property_tax / 12 -
    annualMaintenanceCost / 12;

  // --- Airbnb ---
  const airbnb_annual_income =
    airbnb_price_per_night * 365 * (airbnb_occupancy_rate / 100);

  const airbnb_annual_charges = airbnb_charges * 12 + property_tax + monthly_insurance * 12 + annualMaintenanceCost;

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
    property_tax / 12 -
    annualMaintenanceCost / 12;

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

/** Calculate results for a simulation by overlaying simulation params on top of property base data.
 *  - condo_charges & property_tax always come from the property (factual data).
 *  - monthly_rent uses simulation override if > 0, otherwise falls back to property value.
 */
export function calculateSimulation(property: Property, simulation: Simulation): PropertyCalculations {
  const merged: Property = {
    ...property,
    // Loan params — always from simulation
    loan_amount: simulation.loan_amount,
    interest_rate: simulation.interest_rate,
    loan_duration: simulation.loan_duration,
    personal_contribution: simulation.personal_contribution,
    insurance_rate: simulation.insurance_rate,
    loan_fees: simulation.loan_fees,
    notary_fees: simulation.notary_fees,
    // Rent — simulation override if > 0, else property value
    monthly_rent: simulation.monthly_rent > 0 ? simulation.monthly_rent : property.monthly_rent,
    // Factual data — always from property
    condo_charges: property.condo_charges,
    property_tax: property.property_tax,
    // Other simulation params
    vacancy_rate: simulation.vacancy_rate,
    airbnb_price_per_night: simulation.airbnb_price_per_night,
    airbnb_occupancy_rate: simulation.airbnb_occupancy_rate,
    airbnb_charges: simulation.airbnb_charges,
    renovation_cost: simulation.renovation_cost,
    fiscal_regime: simulation.fiscal_regime,
  };
  const annualMaintenance = (simulation.maintenance_per_m2 || 0) * (property.surface || 0);
  return calculateAll(merged, annualMaintenance);
}

/** Get the effective monthly rent for a simulation (handles 0 = fallback to property) */
export function getEffectiveRent(property: Property, simulation: Simulation): number {
  return simulation.monthly_rent > 0 ? simulation.monthly_rent : property.monthly_rent;
}

/** Capital restant dû après N années de remboursement (prêt amortissable classique) */
export function calculateRemainingCapital(
  loanAmount: number,
  annualRate: number,
  durationYears: number,
  holdingYears: number
): number {
  if (loanAmount <= 0 || durationYears <= 0) return 0;
  if (holdingYears >= durationYears) return 0;
  if (holdingYears <= 0) return loanAmount;

  if (annualRate === 0) {
    // Taux zéro : amortissement linéaire
    const monthlyPayment = loanAmount / (durationYears * 12);
    return Math.max(0, loanAmount - monthlyPayment * holdingYears * 12);
  }

  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = durationYears * 12;
  const paidMonths = holdingYears * 12;

  // Formule : CRD = P × [(1+r)^N - (1+r)^n] / [(1+r)^N - 1]
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const factorPaid = Math.pow(1 + monthlyRate, paidMonths);
  return loanAmount * (factor - factorPaid) / (factor - 1);
}

/** Calcul de la taxe sur la plus-value immobilière (barème français simplifié)
 *  - IR : 19%, abattement progressif, exonération après 22 ans
 *  - PS : 17.2%, abattement progressif, exonération après 30 ans
 */
export function calculateCapitalGainsTax(
  purchasePrice: number,
  salePrice: number,
  holdingYears: number
): CapitalGainsTax {
  // Plus-value brute = prix de vente - prix d'achat - frais d'acquisition forfaitaires (7.5%)
  const fraisAcquisition = purchasePrice * 0.075;
  const plusValueBrute = salePrice - purchasePrice - fraisAcquisition;

  if (plusValueBrute <= 0) {
    return {
      plusValueBrute: Math.round(plusValueBrute),
      abattementIR: 0,
      abattementPS: 0,
      taxeIR: 0,
      taxePS: 0,
      taxeTotale: 0,
      plusValueNette: Math.round(plusValueBrute),
    };
  }

  // Abattement IR (19%) :
  // - 0% les 5 premières années
  // - 6% par an de la 6e à la 21e année (16 ans × 6% = 96%)
  // - 4% la 22e année → exonération totale
  let abattementIR = 0;
  if (holdingYears >= 22) {
    abattementIR = 100;
  } else if (holdingYears > 5) {
    abattementIR = (holdingYears - 5) * 6;
  }

  // Abattement PS (17.2%) :
  // - 0% les 5 premières années
  // - 1.65% par an de la 6e à la 21e année
  // - 1.6% la 22e année
  // - 9% par an de la 23e à la 30e année → exonération totale
  let abattementPS = 0;
  if (holdingYears >= 30) {
    abattementPS = 100;
  } else if (holdingYears >= 22) {
    abattementPS = 1.65 * 16 + 1.6 + (holdingYears - 22) * 9;
  } else if (holdingYears > 5) {
    abattementPS = (holdingYears - 5) * 1.65;
  }

  const pvImposableIR = plusValueBrute * (1 - abattementIR / 100);
  const pvImposablePS = plusValueBrute * (1 - abattementPS / 100);

  const taxeIR = pvImposableIR * 0.19;
  const taxePS = pvImposablePS * 0.172;
  const taxeTotale = taxeIR + taxePS;

  return {
    plusValueBrute: Math.round(plusValueBrute),
    abattementIR: Math.round(abattementIR * 100) / 100,
    abattementPS: Math.round(abattementPS * 100) / 100,
    taxeIR: Math.round(taxeIR),
    taxePS: Math.round(taxePS),
    taxeTotale: Math.round(taxeTotale),
    plusValueNette: Math.round(plusValueBrute - taxeTotale),
  };
}

/** Bilan global de l'opération : synthèse financière sur la durée de détention */
export function calculateExitSimulation(
  property: Property,
  simulation: Simulation,
  calcs: PropertyCalculations
): ExitSimulation {
  const holdingDuration = simulation.holding_duration > 0
    ? simulation.holding_duration
    : simulation.loan_duration;
  const appreciation = simulation.annual_appreciation / 100;

  // Prix de revente estimé
  const salePrice = Math.round(property.purchase_price * Math.pow(1 + appreciation, holdingDuration));

  // Capital restant dû
  const remainingCapital = Math.round(calculateRemainingCapital(
    simulation.loan_amount,
    simulation.interest_rate,
    simulation.loan_duration,
    holdingDuration
  ));

  // Loyers nets cumulés (après charges, avant impôts)
  const annualNetRent = calcs.annual_rent_income - calcs.annual_charges;
  const totalRentCollected = Math.round(annualNetRent * holdingDuration);

  // Mensualités cumulées (crédit + assurance)
  const loanYears = Math.min(holdingDuration, simulation.loan_duration);
  const totalLoanPaid = Math.round((calcs.monthly_payment + calcs.monthly_insurance) * loanYears * 12);

  // Charges cumulées
  const totalChargesPaid = Math.round(calcs.annual_charges * holdingDuration);

  // Fiscalité plus-value
  const capitalGainsTax = calculateCapitalGainsTax(
    property.purchase_price,
    salePrice,
    holdingDuration
  );

  // Investissement total (argent sorti de poche hors mensualités)
  const totalInvested = simulation.personal_contribution
    + calcs.total_notary_fees
    + simulation.loan_fees
    + simulation.renovation_cost;

  // Profit net = ce qui reste après tout
  // On part du prix de vente, on enlève le CRD (pour solder le prêt), la taxe PV
  // On ajoute les loyers nets perçus, on enlève les mensualités payées
  // On enlève l'apport initial investi
  const netProfit = salePrice
    - remainingCapital
    - capitalGainsTax.taxeTotale
    + totalRentCollected
    - totalLoanPaid
    - totalInvested;

  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

  return {
    holdingDuration,
    salePrice,
    remainingCapital,
    totalRentCollected,
    totalLoanPaid,
    totalChargesPaid,
    capitalGainsTax,
    netProfit: Math.round(netProfit),
    roi: Math.round(roi * 100) / 100,
    totalInvested: Math.round(totalInvested),
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
