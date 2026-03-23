export interface Property {
  id: string;
  // Infos du bien
  address: string;
  city: string;
  postal_code: string;
  purchase_price: number;
  surface: number;
  room_count: number; // nombre de pièces principales (0 = non renseigné)
  property_type: "ancien" | "neuf";
  description: string;
  neighborhood: string; // quartier
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
  rent_mode: "auto" | "manual"; // auto = loyer calculé, manual = loyer saisi ou scrappé
  rent_per_m2: number; // loyer au m² — 0 = auto (market data)
  monthly_rent: number;
  condo_charges: number;
  property_tax: number;
  vacancy_rate: number; // en %
  // Airbnb
  airbnb_price_per_night: number;
  airbnb_occupancy_rate: number; // en %
  airbnb_charges: number;
  // Travaux & diagnostic
  renovation_cost: number;
  dpe_rating: string | null; // A-G
  fiscal_regime: string; // 'micro_bic' | 'lmnp_reel' | 'micro_foncier' | 'reel_foncier'
  // Suivi
  property_status: string; // PropertyStatus — "added" par défaut
  is_favorite: number; // 0 or 1 (SQLite boolean)
  status_changed_at: string;
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
  // Travaux — ratings et overrides
  travaux_ratings: string;   // JSON: { "reno_floors": 3, "reno_walls": 2, ... }
  travaux_targets: string;   // JSON: { "reno_floors": 5, "reno_walls": 3, ... } — objectif cible par poste
  travaux_overrides: string; // JSON: { "reno_floors": 2500, ... }
  equipment_costs: string;   // JSON: { "eq_cuisine_equipee": 5000, ... }
  // Ameublement LMNP
  meuble_status: string;     // "non_meuble" | "meuble" | "deja_meuble"
  furniture_cost: number;    // coût du pack mobilier sélectionné (0 = forfait 5000€ par défaut)
  // Charges récurrentes (données factuelles du bien)
  pno_insurance: number;       // Assurance PNO en €/an (default 200)
  gli_rate: number;            // GLI en % du loyer (default 0)
  maintenance_per_m2: number;  // Provision entretien en €/m²/an (default 12)
  // Simulation active (référence vers la simulation favorite pour dashboard/résumé)
  active_simulation_id: string; // "" = utiliser la simulation système
  // Metadata
  source_url: string;    // URL active (= première de collect_urls, utilisée pour le scraping)
  image_urls: string;    // JSON array of image URLs
  prefill_sources: string; // JSON: { field: { source, value } }
  created_at: string;
  updated_at: string;
}

export type PropertyFormData = Omit<Property, "id" | "created_at" | "updated_at" | "latitude" | "longitude" | "market_data" | "investment_score" | "score_breakdown" | "socioeconomic_data" | "enrichment_status" | "enrichment_error" | "enrichment_at" | "collect_urls" | "collect_texts" | "property_status" | "is_favorite" | "status_changed_at" | "active_simulation_id">;

export type FiscalRegime = "micro_bic" | "lmnp_reel" | "micro_foncier" | "reel_foncier";

export const PROPERTY_STATUSES = [
  "added",
  "contacted",
  "visit_planned",
  "visited",
  "validated",
  "not_validated",
  "offer_sent",
  "accepted",
  "negotiation",
  "under_contract",
  "purchased",
  "managed",
] as const;

export type PropertyStatus = typeof PROPERTY_STATUSES[number];

export const PROPERTY_STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bgColor: string; dotColor: string; icon: string }> = {
  added:          { label: "Ajouté",          color: "text-gray-600",    bgColor: "bg-gray-100",    dotColor: "bg-blue-500",    icon: "+" },
  contacted:      { label: "Contacté",        color: "text-blue-600",    bgColor: "bg-blue-50",     dotColor: "bg-blue-500",    icon: "\u2709" },
  visit_planned:  { label: "Visite prévue",   color: "text-purple-600",  bgColor: "bg-purple-50",   dotColor: "bg-purple-500",  icon: "\uD83D\uDCC5" },
  visited:        { label: "Visité",          color: "text-amber-600",  bgColor: "bg-amber-50",   dotColor: "bg-violet-500",  icon: "\uD83D\uDC41" },
  validated:      { label: "Validé",          color: "text-green-600",   bgColor: "bg-green-50",    dotColor: "bg-green-500",   icon: "\u2713" },
  not_validated:  { label: "Non validé",      color: "text-red-600",     bgColor: "bg-red-50",      dotColor: "bg-red-500",     icon: "\u2717" },
  offer_sent:     { label: "Offre envoyée",   color: "text-orange-600",  bgColor: "bg-orange-50",   dotColor: "bg-orange-500",  icon: "\uD83D\uDCE8" },
  accepted:       { label: "Accepté",         color: "text-emerald-600", bgColor: "bg-emerald-50",  dotColor: "bg-emerald-500", icon: "\uD83C\uDF89" },
  negotiation:    { label: "En négociation",  color: "text-orange-600",  bgColor: "bg-orange-50",   dotColor: "bg-orange-500",  icon: "\u2696" },
  under_contract: { label: "Sous compromis",  color: "text-cyan-600",    bgColor: "bg-cyan-50",     dotColor: "bg-cyan-500",    icon: "\uD83D\uDCCB" },
  purchased:      { label: "Acheté",          color: "text-emerald-600", bgColor: "bg-emerald-50",  dotColor: "bg-emerald-500", icon: "\uD83C\uDFE0" },
  managed:        { label: "En gestion",      color: "text-teal-600",    bgColor: "bg-teal-50",     dotColor: "bg-teal-500",    icon: "\uD83D\uDCCA" },
};

export interface FiscalImpact {
  micro_bic_tax: number;
  lmnp_reel_tax: number;
  fiscal_savings: number;      // micro_bic - lmnp_reel
  net_net_income_micro: number; // revenu après impôts micro-BIC
  net_net_income_reel: number;  // revenu après impôts LMNP réel
  // Prélèvements sociaux (17.2%)
  social_contributions_micro: number;
  social_contributions_reel: number;
}

/** Détail des charges d'exploitation annuelles */
export interface ChargesBreakdown {
  condo: number;           // charges copro (annuel)
  propertyTax: number;     // taxe foncière (annuel)
  pnoInsurance: number;    // assurance PNO (annuel)
  maintenance: number;     // provision entretien (annuel)
  gliCost: number;         // GLI (annuel)
}

/** Détail du coût du crédit */
export interface LoanBreakdown {
  year1Interest: number;   // intérêts année 1
  year1Capital: number;    // capital remboursé année 1
  totalInterest: number;   // intérêts totaux sur la durée
  totalInsurance: number;  // assurance totale sur la durée
}

/** Détail du cashflow mensuel */
export interface CashflowBreakdown {
  grossMonthlyRent: number;   // loyer brut mensuel
  vacancyCost: number;        // coût vacance mensuel
  netMonthlyRent: number;     // loyer net de vacance mensuel
  monthlyCharges: number;     // charges d'exploitation mensuelles
  monthlyFinancing: number;   // mensualité + assurance emprunteur
}

export interface CapitalGainsTax {
  plusValueBrute: number;
  abattementIR: number; // % d'abattement IR
  abattementPS: number; // % d'abattement PS
  taxeIR: number;
  taxePS: number;
  taxeTotale: number;
  plusValueNette: number;
}

export interface ExitSimulation {
  holdingDuration: number;
  salePrice: number;
  remainingCapital: number;
  totalRentCollected: number;
  totalLoanPaid: number;
  totalChargesPaid: number;
  capitalGainsTax: CapitalGainsTax;
  netProfit: number;
  roi: number; // en %
  totalInvested: number;
  /** Plus-value estimée liée aux travaux de valorisation */
  renovationValueAdded: number;
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
  // Fiscalité
  fiscal: FiscalImpact;
  net_net_yield: number; // rendement net-net (après impôts selon régime choisi)
  // Airbnb
  airbnb_gross_yield: number;
  airbnb_net_yield: number;
  airbnb_monthly_cashflow: number;
  airbnb_annual_income: number;
  airbnb_annual_charges: number;
  // Breakdowns détaillés
  chargesBreakdown: ChargesBreakdown;
  loanBreakdown: LoanBreakdown;
  cashflowBreakdown: CashflowBreakdown;
}
