import { Property, PropertyCalculations, FiscalImpact, CapitalGainsTax, ExitSimulation, ChargesBreakdown, LoanBreakdown, CashflowBreakdown } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";
import { calculateEquipmentImpact } from "@/domains/property/equipment-calculator";
import { parseAmenities } from "@/domains/property/amenities";

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

/** Paramètres pour le calcul fiscal */
export interface FiscalParams {
  annualRent: number;
  purchasePrice: number;
  renovationCost: number;
  deductibleCharges: {
    condoCharges: number;      // charges copro annuelles
    propertyTax: number;       // taxe foncière annuelle
    pnoInsurance: number;      // assurance PNO annuelle
    maintenance: number;       // provision entretien annuelle
    gliCost: number;           // GLI annuelle
    managementCost: number;    // frais gestion agence annuels
    loanInsurance: number;     // assurance emprunteur annuelle
    interestYear1: number;     // intérêts année 1 (approximation)
  };
  tmi?: number;                // tranche marginale d'imposition (défaut 30%)
  psRate?: number;             // prélèvements sociaux (défaut 17.2%)
  furnitureCost?: number;      // coût mobilier (défaut 5000€)
}

/** Constantes fiscales françaises */
const FISCAL_DEFAULTS = {
  TMI: 30,
  PS_RATE: 17.2,
  BUILDING_LAND_RATIO: 0.85,   // 85% hors terrain
  BUILDING_DURATION: 30,        // amortissement bien sur 30 ans
  RENOVATION_DURATION: 10,      // amortissement travaux sur 10 ans
  FURNITURE_DURATION: 7,        // amortissement mobilier sur 7 ans
  FURNITURE_COST_DEFAULT: 5000, // forfait mobilier par défaut
  MICRO_BIC_ABATEMENT: 0.5,    // abattement 50% micro-BIC
} as const;

/** Calcul de l'impact fiscal : IR (TMI) + Prélèvements Sociaux (17.2%) */
export function calculateFiscalImpact(params: FiscalParams): FiscalImpact {
  const tmi = params.tmi ?? FISCAL_DEFAULTS.TMI;
  const psRate = params.psRate ?? FISCAL_DEFAULTS.PS_RATE;
  const { annualRent, purchasePrice, renovationCost, deductibleCharges } = params;
  const furnitureCost = (params.furnitureCost ?? 0) > 0
    ? params.furnitureCost!
    : FISCAL_DEFAULTS.FURNITURE_COST_DEFAULT;

  // --- Micro-BIC : abattement 50% ---
  const micro_bic_taxable = annualRent * FISCAL_DEFAULTS.MICRO_BIC_ABATEMENT;
  const micro_bic_tax = micro_bic_taxable * (tmi / 100);
  const social_contributions_micro = micro_bic_taxable * (psRate / 100);

  // --- LMNP Réel : amortissement + déduction charges ---
  const amort_bien = (purchasePrice * FISCAL_DEFAULTS.BUILDING_LAND_RATIO) / FISCAL_DEFAULTS.BUILDING_DURATION;
  const amort_travaux = renovationCost > 0 ? renovationCost / FISCAL_DEFAULTS.RENOVATION_DURATION : 0;
  const amort_meubles = furnitureCost / FISCAL_DEFAULTS.FURNITURE_DURATION;

  const charges_deductibles =
    deductibleCharges.condoCharges +
    deductibleCharges.propertyTax +
    deductibleCharges.pnoInsurance +
    deductibleCharges.maintenance +
    deductibleCharges.gliCost +
    (deductibleCharges.managementCost || 0) +
    deductibleCharges.loanInsurance +
    deductibleCharges.interestYear1;

  const resultat_reel = annualRent - charges_deductibles - amort_bien - amort_travaux - amort_meubles;
  const lmnp_reel_tax = Math.max(0, resultat_reel) * (tmi / 100);
  const social_contributions_reel = Math.max(0, resultat_reel) * (psRate / 100);

  return {
    micro_bic_tax: Math.round(micro_bic_tax),
    lmnp_reel_tax: Math.round(lmnp_reel_tax),
    fiscal_savings: Math.round(micro_bic_tax - lmnp_reel_tax),
    net_net_income_micro: Math.round(annualRent - micro_bic_tax - social_contributions_micro),
    net_net_income_reel: Math.round(annualRent - lmnp_reel_tax - social_contributions_reel),
    social_contributions_micro: Math.round(social_contributions_micro),
    social_contributions_reel: Math.round(social_contributions_reel),
  };
}

interface SimulationCharges {
  annualMaintenanceCost: number;
  pnoInsurance: number; // €/an
  gliRate: number; // % du loyer annuel
}

const DEFAULT_CHARGES: SimulationCharges = { annualMaintenanceCost: 0, pnoInsurance: 0, gliRate: 0 };

/** Sanitize a numeric value: NaN/Infinity/undefined → fallback */
function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function calculateAll(property: Property, charges: SimulationCharges = DEFAULT_CHARGES): PropertyCalculations {
  const purchase_price = safeNum(property.purchase_price);
  const property_type = property.property_type;
  const loan_amount = safeNum(property.loan_amount);
  const interest_rate = safeNum(property.interest_rate, 3.5);
  const loan_duration = safeNum(property.loan_duration, 20);
  const insurance_rate = safeNum(property.insurance_rate, 0.34);
  const loan_fees = safeNum(property.loan_fees);
  const notary_fees = safeNum(property.notary_fees);
  const monthly_rent = safeNum(property.monthly_rent);
  const condo_charges = safeNum(property.condo_charges);
  const property_tax = safeNum(property.property_tax);
  const vacancy_rate = safeNum(property.vacancy_rate, 5);
  const airbnb_price_per_night = safeNum(property.airbnb_price_per_night);
  const airbnb_occupancy_rate = safeNum(property.airbnb_occupancy_rate, 60);
  const airbnb_charges = safeNum(property.airbnb_charges);

  const renovation_cost = safeNum(property.renovation_cost);
  const furniture_cost = property.meuble_status === "meuble" ? safeNum(property.furniture_cost) : 0;
  const fiscal_regime = property.fiscal_regime || "micro_bic";

  // Frais de notaire
  const total_notary_fees =
    notary_fees > 0 ? notary_fees : calculateNotaryFees(purchase_price, property_type);

  // Coût total du projet (inclut travaux + mobilier)
  const total_project_cost = purchase_price + total_notary_fees + loan_fees + renovation_cost + furniture_cost;

  // Mensualité crédit
  const monthly_payment = calculateMonthlyPayment(
    loan_amount,
    interest_rate,
    loan_duration
  );

  // Assurance emprunteur mensuelle (coût de financement, pas d'exploitation)
  const monthly_insurance = (loan_amount * (insurance_rate / 100)) / 12;

  // Coût total du crédit
  const total_loan_cost =
    monthly_payment * loan_duration * 12 -
    loan_amount +
    monthly_insurance * loan_duration * 12 +
    loan_fees;

  // --- Location classique ---
  const annual_rent_income = monthly_rent * 12 * (1 - vacancy_rate / 100);
  const gli_cost = annual_rent_income * (charges.gliRate / 100);
  const management_fee_rate = safeNum(property.management_fee_rate);
  const management_cost = annual_rent_income * (management_fee_rate / 100);

  // Charges d'exploitation (hors financement)
  // copro + taxe foncière + PNO + entretien + GLI + gestion agence
  const annual_charges =
    condo_charges +
    property_tax +
    charges.pnoInsurance +
    charges.annualMaintenanceCost +
    gli_cost +
    management_cost;

  const gross_yield =
    purchase_price > 0 ? ((monthly_rent * 12) / total_project_cost) * 100 : 0;

  const net_yield =
    purchase_price > 0
      ? ((annual_rent_income - annual_charges) / total_project_cost) * 100
      : 0;

  // Cash-flow = tout compris (charges exploitation + financement)
  const monthly_cashflow =
    annual_rent_income / 12 -
    monthly_payment -
    monthly_insurance -
    condo_charges / 12 -
    property_tax / 12 -
    charges.pnoInsurance / 12 -
    charges.annualMaintenanceCost / 12 -
    gli_cost / 12 -
    management_cost / 12;

  // --- Airbnb (pas de GLI en Airbnb, mais copro + PNO + maintenance + TF) ---
  const airbnb_annual_income =
    airbnb_price_per_night * 365 * (airbnb_occupancy_rate / 100);

  const airbnb_annual_charges =
    airbnb_charges * 12 +
    condo_charges +
    property_tax +
    charges.pnoInsurance +
    charges.annualMaintenanceCost;

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
    condo_charges / 12 -
    property_tax / 12 -
    charges.pnoInsurance / 12 -
    charges.annualMaintenanceCost / 12;

  // --- Fiscalité ---
  const interests_year1 = loan_amount * (interest_rate / 100);
  const fiscal = calculateFiscalImpact({
    annualRent: annual_rent_income,
    purchasePrice: purchase_price,
    renovationCost: renovation_cost,
    deductibleCharges: {
      condoCharges: condo_charges,
      propertyTax: property_tax,
      pnoInsurance: charges.pnoInsurance,
      maintenance: charges.annualMaintenanceCost,
      gliCost: gli_cost,
      managementCost: management_cost,
      loanInsurance: monthly_insurance * 12,
      interestYear1: interests_year1,
    },
    furnitureCost: property.furniture_cost ?? 0,
  });

  // Rendement net-net (après impôts + PS selon régime choisi)
  const annual_tax = fiscal_regime === "lmnp_reel"
    ? fiscal.lmnp_reel_tax + fiscal.social_contributions_reel
    : fiscal.micro_bic_tax + fiscal.social_contributions_micro;
  const net_net_yield =
    purchase_price > 0
      ? ((annual_rent_income - annual_charges - annual_tax) / total_project_cost) * 100
      : 0;

  // --- Breakdowns détaillés ---
  const chargesBreakdown: ChargesBreakdown = {
    condo: condo_charges,
    propertyTax: property_tax,
    pnoInsurance: charges.pnoInsurance,
    maintenance: charges.annualMaintenanceCost,
    gliCost: gli_cost,
    managementCost: management_cost,
  };

  // Loan breakdown : calcul intérêts/capital année 1
  const monthlyRate = interest_rate / 100 / 12;
  const totalMonths = loan_duration * 12;
  const totalPayments = monthly_payment * totalMonths;
  const totalInterest = totalPayments - loan_amount;
  const totalInsurance = monthly_insurance * totalMonths;
  let year1Interest = 0;
  if (monthlyRate > 0 && loan_amount > 0) {
    let remaining = loan_amount;
    for (let m = 0; m < 12 && m < totalMonths; m++) {
      const monthInterest = remaining * monthlyRate;
      year1Interest += monthInterest;
      remaining -= (monthly_payment - monthInterest);
    }
  }
  const year1Capital = loan_amount > 0 ? monthly_payment * Math.min(12, totalMonths) - year1Interest : 0;

  const loanBreakdown: LoanBreakdown = {
    year1Interest: Math.round(year1Interest),
    year1Capital: Math.round(year1Capital),
    totalInterest: Math.round(totalInterest),
    totalInsurance: Math.round(totalInsurance),
  };

  const grossMonthlyRent = monthly_rent;
  const netMonthlyRent = annual_rent_income / 12;
  const cashflowBreakdown: CashflowBreakdown = {
    grossMonthlyRent,
    vacancyCost: Math.round((grossMonthlyRent - netMonthlyRent) * 100) / 100,
    netMonthlyRent: Math.round(netMonthlyRent * 100) / 100,
    monthlyCharges: Math.round((annual_charges / 12) * 100) / 100,
    monthlyFinancing: Math.round((monthly_payment + monthly_insurance) * 100) / 100,
  };

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
    chargesBreakdown,
    loanBreakdown,
    cashflowBreakdown,
  };
}

/** Calcule le montant du prêt à partir des composants du projet.
 *  Source unique de vérité — utilisé par calculateSimulation, SimulationEditor, etc.
 */
export function computeLoanAmount(
  purchasePrice: number,
  notaryFees: number,
  renovationCost: number,
  furnitureCost: number,
  personalContribution: number
): number {
  return Math.max(0, purchasePrice + notaryFees + renovationCost + furnitureCost - personalContribution);
}

/** Calculate results for a simulation by overlaying simulation params on top of property base data.
 *  - condo_charges & property_tax always come from the property (factual data).
 *  - monthly_rent uses simulation override if > 0, otherwise falls back to property value.
 */
export function calculateSimulation(property: Property, simulation: Simulation): PropertyCalculations {
  const negotiated = safeNum(simulation.negotiated_price);
  const effectivePrice = negotiated > 0 ? negotiated : safeNum(property.purchase_price);
  const notary = simulation.notary_fees > 0
    ? simulation.notary_fees
    : calculateNotaryFees(effectivePrice, property.property_type);
  const furnitureCost = property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0;
  const computedLoan = computeLoanAmount(effectivePrice, notary, simulation.renovation_cost, furnitureCost, simulation.personal_contribution);

  const merged: Property = {
    ...property,
    purchase_price: effectivePrice,
    // Loan params — always from simulation, loan_amount recomputed
    loan_amount: computedLoan,
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
  // Equipment maintenance provisions (chauffe-eau, chaudière, électroménager...)
  const amenities = parseAmenities(property.amenities);
  const equipSummary = calculateEquipmentImpact(0, amenities); // marketRent=0, we only need maintenance
  const equipMaintenanceAnnual = equipSummary.totalMonthlyMaintenance * 12;

  // Furniture maintenance provision (mobilier if meublé/deja_meuble)
  const FURNITURE_LIFESPAN_YEARS = 8;
  const isFurnished = property.meuble_status === "meuble" || property.meuble_status === "deja_meuble";
  const furnitureCostForMaint = isFurnished ? (property.furniture_cost || 5000) : 0;
  const furnitureMaintenanceAnnual = furnitureCostForMaint > 0
    ? Math.round(furnitureCostForMaint / FURNITURE_LIFESPAN_YEARS)
    : 0;

  const simCharges: SimulationCharges = {
    annualMaintenanceCost: (simulation.maintenance_per_m2 || 0) * (property.surface || 0) + equipMaintenanceAnnual + furnitureMaintenanceAnnual,
    pnoInsurance: simulation.pno_insurance || 0,
    gliRate: simulation.gli_rate || 0,
  };
  return calculateAll(merged, simCharges);
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
  calcs: PropertyCalculations,
  /** Plus-value estimée des travaux de valorisation sur le prix de revente */
  valorisationResaleValue: number = 0,
): ExitSimulation {
  const holdingDuration = simulation.holding_duration > 0
    ? simulation.holding_duration
    : simulation.loan_duration;
  const appreciation = simulation.annual_appreciation / 100;
  const negotiated = safeNum(simulation.negotiated_price);
  const effectivePrice = negotiated > 0 ? negotiated : safeNum(property.purchase_price);

  // Prix de revente estimé (appréciation naturelle + plus-value travaux de valorisation)
  const salePrice = Math.round(effectivePrice * Math.pow(1 + appreciation, holdingDuration) + valorisationResaleValue);

  // Capital restant dû — recalcule le loan pour cohérence (comme calculateSimulation)
  const notary = simulation.notary_fees > 0
    ? simulation.notary_fees
    : calculateNotaryFees(effectivePrice, property.property_type);
  const furnitureCostExit = property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0;
  const effectiveLoan = computeLoanAmount(effectivePrice, notary, simulation.renovation_cost, furnitureCostExit, simulation.personal_contribution);
  const remainingCapital = Math.round(calculateRemainingCapital(
    effectiveLoan,
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
    effectivePrice,
    salePrice,
    holdingDuration
  );

  // Investissement total (argent sorti de poche hors mensualités)
  const totalInvested = simulation.personal_contribution
    + calcs.total_notary_fees
    + simulation.loan_fees
    + simulation.renovation_cost
    + furnitureCostExit;

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
    renovationValueAdded: Math.round(valorisationResaleValue),
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
