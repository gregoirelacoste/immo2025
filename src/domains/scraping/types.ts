/** Définit comment extraire une valeur depuis le DOM */
export interface FieldSelector {
  css: string;
  fallbacks: string[];
  attribute: string | null; // null = textContent
  regex: string | null;
  transform: "number" | "text" | "area" | null;
}

/** Manifest complet pour un site */
export interface ScrapingManifest {
  id: string;
  site_hostname: string;
  page_pattern: string;
  selectors: Record<string, FieldSelector>;
  version: number;
  success_count: number;
  failure_count: number;
  sample_url: string;
  created_at: string;
  updated_at: string;
}

/** Données extraites par le scraping */
export interface ScrapedPropertyData {
  purchase_price?: number;
  surface?: number;
  city?: string;
  postal_code?: string;
  address?: string;
  description?: string;
  neighborhood?: string;
  property_type?: "ancien" | "neuf";
  image_urls?: string[];
  amenities?: string[];
  // Champs locatifs (souvent dans les annonces)
  monthly_rent?: number;
  condo_charges?: number;
  property_tax?: number;
}

/** Résultat retourné au client */
export interface ScrapeResult {
  success: boolean;
  data: ScrapedPropertyData | null;
  source_url: string;
  method: "jsonld" | "manifest" | "ai" | "manual";
  error?: string;
}
