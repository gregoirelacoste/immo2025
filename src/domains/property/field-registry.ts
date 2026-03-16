import { Property } from "./types";

export type FieldCategory = "achat" | "travaux" | "revenus" | "charges" | "credit";

export type CollectMode = "scraping" | "market_data" | "agent_immo" | "visite" | "estimation_ia" | "text" | "photo" | "manual";

export interface FieldMetadata {
  key: keyof Property;
  label: string;
  category: FieldCategory;
  importance: "critical" | "important" | "nice-to-have";
  inputType: "currency" | "number" | "percent" | "select" | "text";
  suffix?: string;
  calculations: string[];
  collectModes: CollectMode[];
  agentQuestion?: string;
  placeholder?: string;
}

export const CATEGORY_CONFIG: Record<FieldCategory, { label: string; icon: string }> = {
  achat:   { label: "Achat",   icon: "🏷️" },
  travaux: { label: "Travaux", icon: "🔧" },
  revenus: { label: "Revenus", icon: "💰" },
  charges: { label: "Charges", icon: "📋" },
  credit:  { label: "Crédit",  icon: "🏦" },
};

export const FIELD_REGISTRY: FieldMetadata[] = [
  // ─── Achat ───
  {
    key: "purchase_price",
    label: "Prix d'achat",
    category: "achat",
    importance: "critical",
    inputType: "currency",
    suffix: "€",
    calculations: ["gross_yield", "net_yield", "total_project_cost", "monthly_cashflow"],
    collectModes: ["scraping", "agent_immo", "text", "photo", "manual"],
    agentQuestion: "Quel est le prix de vente affiché ?",
    placeholder: "200 000",
  },
  {
    key: "surface",
    label: "Surface",
    category: "achat",
    importance: "critical",
    inputType: "number",
    suffix: "m²",
    calculations: ["gross_yield", "net_yield"],
    collectModes: ["scraping", "agent_immo", "text", "photo", "manual"],
    agentQuestion: "Quelle est la surface habitable exacte (loi Carrez) ?",
    placeholder: "45",
  },
  {
    key: "notary_fees",
    label: "Frais de notaire",
    category: "achat",
    importance: "important",
    inputType: "currency",
    suffix: "€",
    calculations: ["total_project_cost", "total_notary_fees"],
    collectModes: ["manual", "estimation_ia"],
    placeholder: "15 000",
  },
  // ─── Travaux ───
  {
    key: "renovation_cost",
    label: "Coût rénovation",
    category: "travaux",
    importance: "important",
    inputType: "currency",
    suffix: "€",
    calculations: ["total_project_cost", "net_yield", "monthly_cashflow"],
    collectModes: ["visite", "agent_immo", "estimation_ia", "manual"],
    agentQuestion: "Des travaux sont-ils à prévoir ? Quel montant estimez-vous ?",
    placeholder: "15 000",
  },
  {
    key: "dpe_rating",
    label: "Classement DPE",
    category: "travaux",
    importance: "nice-to-have",
    inputType: "select",
    calculations: ["total_project_cost"],
    collectModes: ["scraping", "agent_immo", "visite", "text", "photo", "manual"],
    agentQuestion: "Quel est le classement DPE du bien ?",
  },
  // ─── Revenus ───
  {
    key: "monthly_rent",
    label: "Loyer mensuel",
    category: "revenus",
    importance: "critical",
    inputType: "currency",
    suffix: "€/mois",
    calculations: ["gross_yield", "net_yield", "monthly_cashflow", "annual_rent_income"],
    collectModes: ["scraping", "market_data", "agent_immo", "text", "manual"],
    agentQuestion: "Quel loyer mensuel estimez-vous réaliste pour ce bien ?",
    placeholder: "700",
  },
  {
    key: "rent_per_m2",
    label: "Loyer au m²",
    category: "revenus",
    importance: "nice-to-have",
    inputType: "currency",
    suffix: "€/m²",
    calculations: ["monthly_cashflow"],
    collectModes: ["market_data", "manual"],
    placeholder: "15",
  },
  {
    key: "vacancy_rate",
    label: "Taux de vacance",
    category: "revenus",
    importance: "important",
    inputType: "percent",
    suffix: "%",
    calculations: ["net_yield", "monthly_cashflow", "annual_rent_income"],
    collectModes: ["market_data", "manual"],
    placeholder: "5",
  },
  {
    key: "airbnb_price_per_night",
    label: "Prix nuit Airbnb",
    category: "revenus",
    importance: "nice-to-have",
    inputType: "currency",
    suffix: "€/nuit",
    calculations: ["airbnb_gross_yield", "airbnb_net_yield", "airbnb_monthly_cashflow"],
    collectModes: ["market_data", "manual"],
    placeholder: "80",
  },
  {
    key: "airbnb_occupancy_rate",
    label: "Taux occupation Airbnb",
    category: "revenus",
    importance: "nice-to-have",
    inputType: "percent",
    suffix: "%",
    calculations: ["airbnb_gross_yield", "airbnb_net_yield", "airbnb_monthly_cashflow"],
    collectModes: ["market_data", "manual"],
    placeholder: "60",
  },
  // ─── Charges ───
  {
    key: "property_tax",
    label: "Taxe foncière",
    category: "charges",
    importance: "important",
    inputType: "currency",
    suffix: "€/an",
    calculations: ["net_yield", "monthly_cashflow", "annual_charges"],
    collectModes: ["scraping", "agent_immo", "visite", "market_data", "text", "manual"],
    agentQuestion: "Quel est le montant exact de la taxe foncière annuelle ?",
    placeholder: "1 200",
  },
  {
    key: "condo_charges",
    label: "Charges de copropriété",
    category: "charges",
    importance: "important",
    inputType: "currency",
    suffix: "€/mois",
    calculations: ["net_yield", "monthly_cashflow", "annual_charges"],
    collectModes: ["scraping", "agent_immo", "visite", "market_data", "text", "manual"],
    agentQuestion: "Quel est le montant mensuel des charges de copropriété ?",
    placeholder: "120",
  },
  {
    key: "insurance_rate",
    label: "Assurance emprunteur",
    category: "charges",
    importance: "nice-to-have",
    inputType: "percent",
    suffix: "%",
    calculations: ["monthly_insurance", "total_loan_cost"],
    collectModes: ["manual"],
    placeholder: "0.34",
  },
  {
    key: "airbnb_charges",
    label: "Charges Airbnb",
    category: "charges",
    importance: "nice-to-have",
    inputType: "currency",
    suffix: "€/mois",
    calculations: ["airbnb_net_yield", "airbnb_monthly_cashflow", "airbnb_annual_charges"],
    collectModes: ["manual"],
    placeholder: "150",
  },
  // ─── Crédit ───
  {
    key: "personal_contribution",
    label: "Apport personnel",
    category: "credit",
    importance: "important",
    inputType: "currency",
    suffix: "€",
    calculations: ["total_project_cost", "monthly_payment"],
    collectModes: ["manual"],
    placeholder: "20 000",
  },
  {
    key: "loan_amount",
    label: "Montant emprunt",
    category: "credit",
    importance: "critical",
    inputType: "currency",
    suffix: "€",
    calculations: ["monthly_payment", "total_loan_cost", "monthly_cashflow"],
    collectModes: ["manual"],
    placeholder: "180 000",
  },
  {
    key: "interest_rate",
    label: "Taux d'intérêt",
    category: "credit",
    importance: "critical",
    inputType: "percent",
    suffix: "%",
    calculations: ["monthly_payment", "total_loan_cost", "monthly_cashflow"],
    collectModes: ["manual"],
    placeholder: "3.5",
  },
  {
    key: "loan_duration",
    label: "Durée du prêt",
    category: "credit",
    importance: "critical",
    inputType: "number",
    suffix: "ans",
    calculations: ["monthly_payment", "total_loan_cost"],
    collectModes: ["manual"],
    placeholder: "25",
  },
  {
    key: "loan_fees",
    label: "Frais de dossier",
    category: "credit",
    importance: "nice-to-have",
    inputType: "currency",
    suffix: "€",
    calculations: ["total_loan_cost"],
    collectModes: ["manual"],
    placeholder: "1 000",
  },
];

/** Get all fields for a given category */
export function getFieldsByCategory(category: FieldCategory): FieldMetadata[] {
  return FIELD_REGISTRY.filter((f) => f.category === category);
}

/** Check if a field has a meaningful value (not 0, not empty, not null) */
export function isFieldFilled(property: Property, key: keyof Property): boolean {
  const val = property[key];
  if (val === null || val === undefined || val === "") return false;
  if (typeof val === "number" && val === 0) {
    // Some fields are valid at 0 (like notary_fees which means "auto")
    const autoZeroFields: (keyof Property)[] = ["notary_fees", "loan_fees", "airbnb_charges", "renovation_cost"];
    return autoZeroFields.includes(key);
  }
  return true;
}

/** All categories in display order */
export const CATEGORIES: FieldCategory[] = ["achat", "travaux", "revenus", "charges", "credit"];
