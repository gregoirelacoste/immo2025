export interface Agency {
  id: string;
  name: string;
  city: string;
  postal_code: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  // Frais de gestion locative
  management_fee_rate: number; // % du loyer mensuel (typiquement 5-10%)
  // Metadata
  source: string; // "manual" | "pagesjaunes" | "google" | "scraping"
  google_rating: number | null; // note Google (1-5)
  google_reviews_count: number | null;
  description: string;
  image_url: string;
  // Ownership
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type AgencyFormData = Omit<Agency, "id" | "created_at" | "updated_at">;

export interface AgencyWithImpact extends Agency {
  /** Coût mensuel de gestion pour un loyer donné */
  monthly_management_cost: number;
  /** Cashflow mensuel avec gestion agence */
  cashflow_with_agency: number;
}
