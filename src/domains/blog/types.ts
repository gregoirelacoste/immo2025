/**
 * Types pour le blog et le News Fetcher.
 */

// ── Catégories d'articles ──

export const ARTICLE_CATEGORIES = [
  "guide_ville",
  "guide_quartier",
  "actu_marche",
  "analyse_comparative",
  "conseil_investissement",
  "fiscalite",
  "financement",
  "etude_de_cas",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

// ── Données collectées par fetcher ──

export interface DvfCityData {
  avgPricePerM2: number | null;
  medianPricePerM2: number | null;
  transactionCount: number;
  avgPriceStudioPerM2: number | null;
  avgPriceSmallAptPerM2: number | null;
  avgPriceLargeAptPerM2: number | null;
  avgPriceHousePerM2: number | null;
  priceTrend1yPct: number | null;
  pricePerM2Min: number | null;
  pricePerM2Max: number | null;
  lastMutationDate: string | null;
}

export interface GeorisquesCityData {
  naturalRisks: Array<{ type: string; level: string }>;
  riskLevel: "faible" | "moyen" | "élevé";
  floodRiskLevel: "nul" | "faible" | "moyen" | "fort" | null;
  seismicZone: number | null;
  industrialRisk: boolean;
  radonLevel: number | null;
  clayShrinkageRisk: "faible" | "moyen" | "fort" | null;
  catnatCount: number;
}

export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

export interface GeoCity {
  nom: string;
  code: string; // code INSEE
  codesPostaux: string[];
  departement?: { code: string; nom: string };
  region?: { code: string; nom: string };
  population?: number;
}

export interface LocalitySnapshot {
  localityId: string;
  localityName: string;
  localityType: string;
  validFrom: string;
  fields: Record<string, unknown>;
}

export interface InseeCityData {
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  unemploymentRate: number | null;
  vacantHousingPct: number | null;
  ownerOccupierPct: number | null;
  housingStockCount: number | null;
  householdSizeAvg: number | null;
  studentPopulationPct: number | null;
  seniorPopulationPct: number | null;
  totalJobs: number | null;
  millesime: string | null;
}

// ── Contexte assemblé pour Gemini ──

export interface NewsContext {
  /** Métadonnées de la requête */
  meta: {
    category: ArticleCategory;
    city?: string;
    codeInsee?: string;
    postalCode?: string;
    department?: string;
    region?: string;
    generatedAt: string;
  };

  /** Données DVF (prix immobilier) */
  dvf: DvfCityData | null;

  /** Données INSEE (socio-économique) */
  insee: InseeCityData | null;

  /** Données Géorisques (risques) */
  georisques: GeorisquesCityData | null;

  /** Données localité existantes en DB */
  existingLocality: LocalitySnapshot | null;

  /** Actualités RSS pertinentes */
  news: RssItem[];

  /** Erreurs de collecte (pour traçabilité) */
  fetchErrors: Array<{ source: string; error: string }>;
}

// ── Options du News Fetcher ──

export interface NewsFetcherOptions {
  category: ArticleCategory;
  city?: string;
  postalCode?: string;
  codeInsee?: string;
  /** Nombre max d'actus RSS à inclure */
  maxNews?: number;
}

// ── Article en base ──

export type ArticleStatus = "draft" | "published" | "archived" | "error";

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  meta_description: string;
  json_ld: string;
  source_urls: string; // JSON array
  category: ArticleCategory;
  locality_id: string | null;
  tags: string; // JSON array
  extracted_data: string; // JSON object
  data_injected: number; // 0 | 1
  status: ArticleStatus;
  published_at: string | null;
  triggered_by: string;
  generation_model: string;
  generation_tokens: number;
  created_at: string;
  updated_at: string;
}

/** Données pour créer ou mettre à jour un article */
export interface BlogArticleInput {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  meta_description?: string;
  json_ld?: string;
  source_urls?: string[];
  category: ArticleCategory;
  locality_id?: string | null;
  tags?: string[];
  extracted_data?: Record<string, unknown>;
  status?: ArticleStatus;
  triggered_by?: string;
  generation_model?: string;
  generation_tokens?: number;
}

/** Output attendu de Gemini après génération d'article */
export interface GeneratedArticle {
  article: {
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    meta_description: string;
    tags: string[];
    json_ld: Record<string, unknown>;
  };
  extracted_data: {
    localities?: Array<{
      city: string;
      code_insee?: string;
      fields: Record<string, unknown>;
    }>;
    global?: Record<string, unknown>;
  };
}
