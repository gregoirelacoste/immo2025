// ── Roadmap item types ──

export type RoadmapCategory = "feature" | "fix" | "improvement" | "idea";
export type RoadmapStatus = "backlog" | "planned" | "in_progress" | "done" | "rejected";
export type RoadmapSource =
  | "admin"          // ajouté manuellement par l'admin
  | "user_feedback"  // suggestion utilisateur via formulaire
  | "ai_insight"     // détecté automatiquement par le text-extractor
  | "scraping_gap";  // champ manquant détecté lors du scraping

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  source: RoadmapSource;
  source_detail: string; // email utilisateur, nom du champ IA, etc.
  priority: number;      // 0 = non priorisé, 1 = haute, 2 = moyenne, 3 = basse
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapItemInput {
  title: string;
  description?: string;
  category?: RoadmapCategory;
  status?: RoadmapStatus;
  source?: RoadmapSource;
  source_detail?: string;
  priority?: number;
}

// ── Feedback types ──

export type FeedbackType = "feature" | "bug" | "improvement" | "other";

export interface FeedbackItem {
  id: string;
  user_id: string;
  user_email: string;
  type: FeedbackType;
  title: string;
  description: string;
  page_url: string;       // page d'où vient le feedback
  roadmap_item_id: string; // lien vers l'item roadmap créé (si applicable)
  created_at: string;
}

export interface FeedbackInput {
  type: FeedbackType;
  title: string;
  description?: string;
  page_url?: string;
}
