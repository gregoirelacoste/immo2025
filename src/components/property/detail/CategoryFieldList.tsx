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

function ConfidenceDot({ confidence }: { confidence?: Confidence }) {
  if (confidence === "verified") {
    return <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" title="Vérifié (visite)" />;
  }
  if (confidence === "estimated") {
    return <span className="inline-block w-2 h-2 rounded-full bg-gray-400 shrink-0" title="Estimé (IA/marché)" />;
  }
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

export default function CategoryFieldList({ property, category }: Props) {
  const router = useRouter();
  const prefill = parsePrefill(property.prefill_sources);
  const missingFields = category.missingFields;

  const categoryFields = getFieldsByCategory(category.category);
  const filledFields = categoryFields.filter((f) => isFieldFilled(property, f.key));

  return (
    <div className="space-y-2">
      {/* Filled fields — compact display */}
      {filledFields.map((field) => {
        const value = property[field.key];
        const prefillEntry = prefill[field.key];
        return (
          <div key={field.key} className="flex items-center justify-between py-2 px-3 bg-tiili-surface rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <ConfidenceDot confidence={prefillEntry?.confidence} />
              <span className="text-sm text-gray-600 truncate">{field.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">
              {formatFieldValue(field, value as string | number | null)}
              {field.suffix && field.inputType !== "currency" && (
                <span className="text-gray-400 font-normal text-xs ml-1">{field.suffix}</span>
              )}
            </span>
          </div>
        );
      })}

      {/* Missing fields — inline editors */}
      {missingFields.map((field) => (
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
          {field.agentQuestion && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              💡 {field.agentQuestion}
            </p>
          )}
        </div>
      ))}

      {/* All complete */}
      {missingFields.length === 0 && filledFields.length > 0 && (
        <p className="text-sm text-green-600 text-center py-2 font-medium">
          ✓ Toutes les données sont renseignées
        </p>
      )}
    </div>
  );
}
