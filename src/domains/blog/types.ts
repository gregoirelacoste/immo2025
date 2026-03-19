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

// ── Données collectées par fetcher (ré-exports depuis infrastructure) ──

export type {
  DvfCityData,
  GeorisquesCityData,
  GeoCity,
  InseeCityData,
  RssItem,
} from "@/infrastructure/data-sources/types";

import type {
  DvfCityData,
  GeorisquesCityData,
  InseeCityData,
  RssItem,
} from "@/infrastructure/data-sources/types";

export interface LocalitySnapshot {
  localityId: string;
  localityName: string;
  localityType: string;
  validFrom: string;
  fields: Record<string, unknown>;
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
