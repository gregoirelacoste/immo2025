import {
  getBaseItems,
  getItemsByConditions,
  getItemsByCondition,
  getItemsByType,
} from "@/domains/reference/service";
import type { ReferenceItem, ChecklistConfig, RedFlagConfig, SellerQuestionConfig } from "@/domains/reference/types";
import { parseConfig } from "@/domains/reference/types";
import type {
  ChecklistCategory,
  ChecklistItem,
  CheckItemType,
  PhotoTag,
  RedFlag,
  SellerQuestion,
  SellerQuestionCategory,
} from "./types";
import type { ResolvedVisitConfig } from "./constants";

// ─── Convert ReferenceItem → visit types ────────────

function toChecklistItem(item: ReferenceItem): ChecklistItem {
  const cfg = parseConfig<ChecklistConfig>(item.config);
  return {
    key: item.key,
    label: item.label,
    type: cfg.input_type as CheckItemType,
    ...(cfg.hint ? { hint: cfg.hint } : {}),
    ...(cfg.options ? { options: cfg.options } : {}),
  };
}

function toPhotoTag(item: ReferenceItem): PhotoTag {
  return { key: item.key, label: item.label, icon: item.icon };
}

function toRedFlag(item: ReferenceItem): RedFlag {
  const cfg = parseConfig<RedFlagConfig>(item.config);
  return {
    key: item.key,
    label: item.label,
    severity: cfg.severity || "warning",
    ...(cfg.hint ? { hint: cfg.hint } : {}),
  };
}

function toSellerQuestion(item: ReferenceItem): SellerQuestion {
  const cfg = parseConfig<SellerQuestionConfig>(item.config);
  return {
    key: item.key,
    label: item.label,
    ...(cfg.hint ? { hint: cfg.hint } : {}),
  };
}

// ─── Group items by category ────────────────────────

function groupChecklistByCategory(items: ReferenceItem[]): ChecklistCategory[] {
  const catMap = new Map<string, { icon: string; items: ChecklistItem[] }>();
  for (const item of items) {
    const cat = item.category;
    if (!catMap.has(cat)) {
      catMap.set(cat, { icon: item.icon, items: [] });
    }
    catMap.get(cat)!.items.push(toChecklistItem(item));
  }
  // Use category labels from a lookup
  const categoryLabels: Record<string, string> = {
    exterior: "Extérieur & environnement",
    common_areas: "Parties communes",
    interior_structure: "Structure & gros œuvre",
    interior_layout: "Agencement & volumes",
    windows: "Fenêtres & ouvertures",
    electricity: "Électricité",
    plumbing: "Plomberie",
    heating: "Chauffage & ventilation",
    kitchen: "Cuisine",
    bathroom: "Salle de bain & WC",
    connectivity: "Connectivité",
    general: "Impression générale",
    amenity_specifics: "Équipements spécifiques",
    type_specifics: "Spécifique bien",
  };

  return Array.from(catMap.entries()).map(([key, { icon, items }]) => ({
    key,
    label: categoryLabels[key] || key,
    icon,
    items,
  }));
}

function groupSellerQuestions(items: ReferenceItem[]): SellerQuestionCategory[] {
  const catMap = new Map<string, { icon: string; questions: SellerQuestion[] }>();
  for (const item of items) {
    const cat = item.category;
    if (!catMap.has(cat)) {
      catMap.set(cat, { icon: item.icon, questions: [] });
    }
    catMap.get(cat)!.questions.push(toSellerQuestion(item));
  }
  const categoryLabels: Record<string, string> = {
    sq_financial: "Finances & charges",
    sq_legal: "Juridique & copro",
    sq_technical: "Technique & travaux",
    sq_rental: "Potentiel locatif",
  };
  return Array.from(catMap.entries()).map(([key, { icon, questions }]) => ({
    key,
    label: categoryLabels[key] || key,
    icon,
    questions,
  }));
}

// ─── Main resolver (async, reads from DB) ───────────

/**
 * Resolves the full visit configuration from the database.
 * Server-side only (async).
 */
export async function resolveVisitConfigFromDb(
  amenities: string[],
  propertyType: "ancien" | "neuf",
): Promise<ResolvedVisitConfig> {
  // 1. Checklist: base items (no conditions) + conditional by amenity + conditional by type
  const [baseChecklist, amenityChecklist, typeChecklist] = await Promise.all([
    getBaseItems("checklist"),
    getItemsByConditions("checklist", "amenity", amenities),
    getItemsByCondition("checklist", "property_type", propertyType),
  ]);

  const allChecklistItems = [...baseChecklist, ...amenityChecklist, ...typeChecklist];
  const checklist = groupChecklistByCategory(allChecklistItems);

  // 2. Photo tags: base + conditional by amenity
  const [basePhotoTags, amenityPhotoTags] = await Promise.all([
    getBaseItems("photo_tag"),
    getItemsByConditions("photo_tag", "amenity", amenities),
  ]);
  const photo_tags = [...basePhotoTags, ...amenityPhotoTags].map(toPhotoTag);

  // 3. Red flags (all, no conditions)
  const redFlagItems = await getItemsByType("red_flag");
  const red_flags = redFlagItems.map(toRedFlag);

  // 4. Seller questions (all, no conditions)
  const sellerQuestionItems = await getItemsByType("seller_question");
  const seller_questions = groupSellerQuestions(sellerQuestionItems);

  return { checklist, seller_questions, photo_tags, red_flags };
}
