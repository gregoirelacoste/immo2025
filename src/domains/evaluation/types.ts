export interface AiEvaluationAxis {
  score: number; // /20
  comment: string;
}

/** Simulation optimale suggérée par l'IA */
export interface AiOptimalSimulation {
  negotiated_price: number;      // prix négocié suggéré (0 = pas de négo)
  monthly_rent: number;          // loyer mensuel réaliste
  vacancy_rate: number;          // taux de vacance réaliste (%)
  personal_contribution: number; // apport recommandé
  interest_rate: number;         // taux d'emprunt réaliste (%)
  loan_duration: number;         // durée de crédit optimale (années)
  renovation_cost: number;       // budget travaux recommandé
  fiscal_regime: string;         // régime fiscal optimal
  furniture_cost: number;        // coût mobilier si meublé recommandé
  reasoning: string;             // explication des choix
}

export interface AiEvaluation {
  prix: AiEvaluationAxis;
  rendement: AiEvaluationAxis;
  localisation: AiEvaluationAxis;
  risques: AiEvaluationAxis;
  hypotheses: AiEvaluationAxis;
  score_global: number; // /100
  avis_global: string;
  red_flags: string[];
  points_forts: string[];
  optimal_simulation?: AiOptimalSimulation;
}
