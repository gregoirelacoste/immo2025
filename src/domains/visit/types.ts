// ─────────────────────────────────────────────
// Checklist item types
// ─────────────────────────────────────────────

/** How a checklist item is answered */
export type CheckItemType = "check" | "rating" | "text" | "select";

export interface ChecklistItem {
  key: string;
  label: string;
  type: CheckItemType;
  /** Hint shown below the item (optional) */
  hint?: string;
  /** Options for select type */
  options?: string[];
}

export interface ChecklistCategory {
  key: string;
  label: string;
  icon: string;
  items: ChecklistItem[];
}

// ─────────────────────────────────────────────
// Photo tags
// ─────────────────────────────────────────────

export interface PhotoTag {
  key: string;
  label: string;
  icon: string;
}

// ─────────────────────────────────────────────
// Seller questions
// ─────────────────────────────────────────────

export interface SellerQuestion {
  key: string;
  label: string;
  /** Short hint to remind why this matters */
  hint?: string;
}

export interface SellerQuestionCategory {
  key: string;
  label: string;
  icon: string;
  questions: SellerQuestion[];
}

// ─────────────────────────────────────────────
// Red flags
// ─────────────────────────────────────────────

export interface RedFlag {
  key: string;
  label: string;
  severity: "warning" | "critical";
  hint?: string;
}

// ─────────────────────────────────────────────
// Visit state (what gets stored per visit)
// ─────────────────────────────────────────────

export interface VisitCheckValue {
  /** true = OK, false = problem, null = not answered */
  value: boolean | null;
}

export interface VisitRatingValue {
  /** 1-5, null = not answered */
  value: number | null;
}

export interface VisitTextValue {
  value: string;
}

export type VisitItemValue = VisitCheckValue | VisitRatingValue | VisitTextValue;

export interface VisitPhoto {
  uri: string;
  tag: string;
  takenAt: string;
  note?: string;
}

export interface VisitData {
  property_id: string;
  visited_at: string;
  /** key → value for every checklist item answered */
  answers: Record<string, VisitItemValue>;
  /** Red flags spotted */
  red_flags: string[]; // keys of flagged items
  /** Photos taken during visit */
  photos: VisitPhoto[];
  /** Free-form notes */
  notes: string;
  /** Overall impression 1-5 */
  overall_rating: number | null;
}

// ─────────────────────────────────────────────
// Config shape (what the constants file exports)
// ─────────────────────────────────────────────

export interface VisitChecklistConfig {
  base_checklist: ChecklistCategory[];
  conditional_by_amenity: Record<string, ChecklistItem[]>;
  conditional_by_type: Record<"ancien" | "neuf", ChecklistItem[]>;
  seller_questions: SellerQuestionCategory[];
  photo_tags_base: PhotoTag[];
  photo_tags_by_amenity: Record<string, PhotoTag[]>;
  red_flags: RedFlag[];
}
