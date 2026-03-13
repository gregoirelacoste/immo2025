/**
 * Valeurs par défaut pour le profil utilisateur.
 * Le JSON en DB est partiel — le code merge au runtime :
 * { ...DEFAULT_INPUTS, ...JSON.parse(row.default_inputs) }
 */

export interface DefaultInputs {
  personal_contribution_pct: number; // % du prix d'achat
  loan_duration: number;             // années
  interest_rate: number;             // %
  insurance_rate: number;            // %
  loan_fees: number;                 // €
}

export const DEFAULT_INPUTS: DefaultInputs = {
  personal_contribution_pct: 10,
  loan_duration: 20,
  interest_rate: 3.5,
  insurance_rate: 0.34,
  loan_fees: 0,
};

export interface ScoringWeights {
  cashflow: number;
  net_yield: number;
  price_vs_market: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  cashflow: 1,
  net_yield: 1,
  price_vs_market: 1,
};

/** Merge user overrides with defaults */
export function mergeDefaults<T>(defaults: T, userJson: string): T {
  try {
    const parsed = JSON.parse(userJson || "{}");
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}
