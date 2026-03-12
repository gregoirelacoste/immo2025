export interface InvestmentScoreBreakdown {
  // Financier (70 pts weighted)
  netYieldScore: number;         // 0-25
  cashflowScore: number;         // 0-25
  priceVsMarketScore: number;    // 0-20
  financialTotal: number;        // 0-70
  // Terrain (30 pts weighted)
  visitScore: number;            // 0-30 (from visit overall_rating, neutral if no visit)
  terrainTotal: number;          // 0-30
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
