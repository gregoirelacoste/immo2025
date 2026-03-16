import { Property } from "./types";
import {
  FIELD_REGISTRY,
  CATEGORIES,
  CATEGORY_CONFIG,
  isFieldFilled,
  getFieldsByCategory,
  type FieldCategory,
  type FieldMetadata,
} from "./field-registry";

export interface CategoryCompletion {
  category: FieldCategory;
  label: string;
  icon: string;
  filled: number;
  total: number;
  percent: number;
  missingFields: FieldMetadata[];
}

export interface CompletionSummary {
  globalPercent: number;
  categories: CategoryCompletion[];
  totalMissing: number;
}

const IMPORTANCE_WEIGHT: Record<FieldMetadata["importance"], number> = {
  critical: 3,
  important: 2,
  "nice-to-have": 1,
};

export function getCompletionSummary(property: Property): CompletionSummary {
  let totalWeight = 0;
  let filledWeight = 0;
  let totalMissing = 0;

  const categories: CategoryCompletion[] = CATEGORIES.map((cat) => {
    const fields = getFieldsByCategory(cat);
    const config = CATEGORY_CONFIG[cat];
    let filled = 0;
    const missingFields: FieldMetadata[] = [];

    for (const field of fields) {
      const weight = IMPORTANCE_WEIGHT[field.importance];
      totalWeight += weight;

      if (isFieldFilled(property, field.key)) {
        filled++;
        filledWeight += weight;
      } else {
        missingFields.push(field);
        totalMissing++;
      }
    }

    // Sort missing: critical first, then important, then nice-to-have
    missingFields.sort(
      (a, b) => IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance]
    );

    const total = fields.length;
    return {
      category: cat,
      label: config.label,
      icon: config.icon,
      filled,
      total,
      percent: total > 0 ? Math.round((filled / total) * 100) : 100,
      missingFields,
    };
  });

  const globalPercent = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 100;

  return { globalPercent, categories, totalMissing };
}
