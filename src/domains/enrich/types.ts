export interface InvestmentScoreBreakdown {
  // Financier (50 pts weighted)
  netYieldScore: number;         // 0-15 (interpolation continue, ajusté au marché local)
  cashflowScore: number;         // 0-15 (interpolation continue, relatif au coût projet)
  priceVsMarketScore: number;    // 0-10 (interpolation continue)
  rentVsMarketScore: number;     // 0-10 (loyer vs loyer moyen local)
  financialTotal: number;        // 0-50

  // Localité (35 pts weighted)
  populationScore: number;       // 0-7 (croissance démographique)
  incomeScore: number;           // 0-7 (revenu médian → solvabilité locataires)
  employmentScore: number;       // 0-7 (taux de chômage inversé)
  infrastructureScore: number;   // 0-7 (transport, écoles, université)
  riskScore: number;             // 0-7 (risques naturels inversé)
  localityTotal: number;         // 0-35

  // Terrain (15 pts weighted)
  visitScore: number;            // 0-15 (from visit overall_rating, neutral if no visit)
  terrainTotal: number;          // 0-15

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
