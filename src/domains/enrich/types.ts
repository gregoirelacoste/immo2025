export interface InvestmentScoreBreakdown {
  netYieldScore: number; // 0-30
  cashflowScore: number; // 0-25
  priceVsMarketScore: number; // 0-25
  rentVsMarketScore: number; // 0-20
  total: number; // 0-100
  label: "Faible" | "Moyen" | "Bon" | "Excellent";
}

export type EnrichmentStatus = "pending" | "running" | "done" | "error";

export interface EnrichmentResult {
  latitude: number | null;
  longitude: number | null;
  market_data: string; // JSON of MarketData
  investment_score: number | null;
  score_breakdown: string; // JSON of InvestmentScoreBreakdown
  enrichment_status: EnrichmentStatus;
  enrichment_error: string;
  enrichment_at: string;
}
