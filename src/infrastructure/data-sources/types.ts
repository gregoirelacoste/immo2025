/**
 * Shared types for open-data API clients.
 */

export interface GeoCity {
  nom: string;
  code: string; // code INSEE
  codesPostaux: string[];
  departement?: { code: string; nom: string };
  region?: { code: string; nom: string };
  population?: number;
}

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
  /** Granularity level of the returned data */
  dataLevel: "iris" | "commune";
  /** IRIS code if data was fetched at IRIS level */
  irisCode: string | null;
}

/** Result of IRIS resolution from GPS coordinates */
export interface IrisResolution {
  irisCode: string;   // 9-digit IRIS code (e.g., "751056106")
  irisName: string;   // Human-readable IRIS zone name
  communeCode: string; // 5-digit INSEE commune code
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

export interface TaxeFonciereData {
  communeCode: string;
  communeName: string;
  tauxTFB: number; // taux voté en %
  annee: number;
}

export interface DpeAggregateData {
  avgDpeClass: string | null;
  avgEnergyConsumption: number | null;
  avgGesClass: string | null;
  dpeCount: number;
}

export interface EducationData {
  schoolCount: number;
  universityNearby: boolean;
}

export interface HealthData {
  doctorCount: number;
  pharmacyCount: number;
}

export interface LoyersData {
  loyerMedM2: number;
  nbObservations: number | null;
  loyerT1T2M2: number | null;
  loyerT3PlusM2: number | null;
  loyerMaisonM2: number | null;
}

export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
  /** Contenu complet de l'article (texte nettoyé), rempli pour les top articles */
  fullContent?: string;
}
