"use client";

import { Property } from "@/domains/property/types";
import { isFieldFilled, getFieldsByCategory, type FieldMetadata } from "@/domains/property/field-registry";
import { parsePrefill, type Confidence } from "@/domains/property/prefill";
import type { CategoryCompletion } from "@/domains/property/completion";
import InlineFieldEditor from "./InlineFieldEditor";
import { formatCurrency } from "@/lib/calculations";
import { useRouter } from "next/navigation";

interface Props {
  property: Property;
  category: CategoryCompletion;
}

const COLLECT_MODE_LABELS: Record<string, string> = {
  scraping: "Scraping",
  market_data: "Données marché",
  agent_immo: "Agent immobilier",
  visite: "Visite",
  estimation_ia: "Estimation IA",
  text: "Collage texte",
  photo: "Photo",
  manual: "Saisie manuelle",
};

function ConfidenceDot({ confidence }: { confidence?: Confidence }) {
  if (confidence === "verified") {
    return <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" title="Vérifié (visite)" />;
  }
  if (confidence === "estimated") {
    return <span className="inline-block w-2 h-2 rounded-full bg-gray-400 shrink-0" title="Estimé (IA/marché)" />;
  }
  // declared or unknown
  return <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Déclaré" />;
}

function formatFieldValue(field: FieldMetadata, value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (field.inputType === "currency") return formatCurrency(num);
  if (field.inputType === "percent") return `${num}%`;
  if (field.inputType === "number") return String(num);
  return String(value);
}

function suggestBestMode(field: FieldMetadata): string | null {
  // Suggest the most actionable non-manual mode
  const priority = ["agent_immo", "visite", "scraping", "market_data", "estimation_ia", "text", "photo"];
  for (const mode of priority) {
    if (field.collectModes.includes(mode as FieldMetadata["collectModes"][number])) {
      return COLLECT_MODE_LABELS[mode] || mode;
    }
  }
  return null;
}

export default function CategoryFieldList({ property, category }: Props) {
  const router = useRouter();
  const prefill = parsePrefill(property.prefill_sources);
  const allFields = [...category.missingFields];

  // Build filled fields list from registry
  const categoryFields = getFieldsByCategory(category.category);
  const filledFields = categoryFields.filter((f: FieldMetadata) => isFieldFilled(property, f.key));

  return (
    <div className="space-y-2">
      {/* Filled fields — compact display */}
      {filledFields.map((field: FieldMetadata) => {
        const value = property[field.key];
        const prefillEntry = prefill[field.key];
        return (
          <div key={field.key} className="flex items-center justify-between py-2 px-3 bg-tiili-surface rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <ConfidenceDot confidence={prefillEntry?.confidence as Confidence | undefined} />
              <span className="text-sm text-gray-600 truncate">{field.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
              {formatFieldValue(field, value as string | number | null)}
              {field.suffix && !["currency"].includes(field.inputType) && (
                <span className="text-gray-400 font-normal text-xs ml-1">{field.suffix}</span>
              )}
            </span>
          </div>
        );
      })}

      {/* Missing fields — inline editors */}
      {allFields.map((field) => {
        const suggestion = suggestBestMode(field);
        return (
          <div key={field.key} className="border border-dashed border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{field.label}</span>
              {field.importance === "critical" && (
                <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Important</span>
              )}
            </div>
            <InlineFieldEditor
              propertyId={property.id}
              field={field}
              onSaved={() => router.refresh()}
            />
            {suggestion && field.agentQuestion && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                💡 {field.agentQuestion}
              </p>
            )}
          </div>
        );
      })}

      {/* All complete */}
      {allFields.length === 0 && filledFields.length > 0 && (
        <p className="text-sm text-green-600 text-center py-2 font-medium">
          ✓ Toutes les données sont renseignées
        </p>
      )}
    </div>
  );
}
