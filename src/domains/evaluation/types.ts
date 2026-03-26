export interface AiEvaluationAxis {
  score: number; // /20
  comment: string;
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
}
