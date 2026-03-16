// ─────────────────────────────────────────────
// Reference items — generic configurable data
// ─────────────────────────────────────────────

export type ReferenceItemType =
  | "equipment"
  | "checklist"
  | "photo_tag"
  | "red_flag"
  | "seller_question";

export interface ReferenceItem {
  id: string;
  type: ReferenceItemType;
  key: string;
  label: string;
  icon: string;
  category: string;
  config: string; // JSON — shape depends on `type`
  is_default: number;
  sort_order: number;
  created_at: string;
}

export interface ReferenceCondition {
  id: string;
  item_id: string;
  condition_type: "amenity" | "property_type";
  condition_value: string;
  sort_order: number;
}

// ─── Typed config shapes per type ───────────────────

export interface EquipmentConfig {
  value_impact_per_sqm?: number | null;
}

export interface ChecklistConfig {
  input_type: "check" | "rating" | "text" | "select";
  hint?: string;
  options?: string[];
}

export interface PhotoTagConfig {
  // label + icon suffisent
}

export interface RedFlagConfig {
  severity: "warning" | "critical";
  hint?: string;
}

export interface SellerQuestionConfig {
  hint?: string;
}

// ─── Helper: parse config JSON safely ───────────────

export function parseConfig<T>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return {} as T;
  }
}
