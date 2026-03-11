export interface InvestmentScoreBreakdown {
  // Financier (50 pts)
  netYieldScore: number;         // 0-20
  cashflowScore: number;         // 0-15
  priceVsMarketScore: number;    // 0-15
  // Socio-économique (50 pts)
  rentVsMarketScore: number;     // 0-10
  demographicScore: number;      // 0-10
  incomeScore: number;           // 0-10
  employmentScore: number;       // 0-10
  attractivenessScore: number;   // 0-10
  total: number;                 // 0-100
  label: "Faible" | "Moyen" | "Bon" | "Excellent";
}

export type EnrichmentStatus = "pending" | "running" | "done" | "error";

export interface EnrichmentResult {
  latitude: number | null;
  longitude: number | null;
  market_data: string; // JSON of MarketData
  socioeconomic_data: string; // JSON of SocioEconomicData
  investment_score: number | null;
  score_breakdown: string; // JSON of InvestmentScoreBreakdown
  enrichment_status: EnrichmentStatus;
  enrichment_error: string;
  enrichment_at: string;
}
