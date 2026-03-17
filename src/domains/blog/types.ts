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
