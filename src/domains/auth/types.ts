export type UserRole = "user" | "premium" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan: "free" | "premium";
  role: UserRole;
  stripe_customer_id: string;
  image: string;
  created_at: string;
}

export interface UserProfile {
  user_id: string;
  // Profil financier
  monthly_income: number | null;
  existing_credits: number;
  savings: number | null;
  max_debt_ratio: number;
  // Préférences de recherche
  target_cities: string;           // JSON: string[]
  min_budget: number | null;
  max_budget: number | null;
  target_property_types: string;   // JSON: string[]
  // Defaults financiers (JSON partiel, mergé avec DEFAULT_INPUTS)
  default_inputs: string;          // JSON: Partial<DefaultInputs>
  // Pondération scoring (JSON partiel, mergé avec DEFAULT_SCORING_WEIGHTS)
  scoring_weights: string;         // JSON: Partial<ScoringWeights>
  // Alertes seuils personnalisés
  alert_thresholds: string;        // JSON: AlertThresholds
  updated_at: string;
}
