"use client";

import { useMemo } from "react";
import { Property } from "@/domains/property/types";
import { getCompletionSummary } from "@/domains/property/completion";
import CategoryFieldList from "./CategoryFieldList";

interface Props {
  property: Property;
}

export default function TravauxTab({ property }: Props) {
  const summary = useMemo(() => getCompletionSummary(property), [property]);
  const travauxCategory = summary.categories.find((c) => c.category === "travaux")!;

  const hasReno = property.renovation_cost > 0;
  const hasDpe = !!property.dpe_rating;

  return (
    <div className="space-y-4 mt-4">
      {/* Summary card */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Travaux & Diagnostics</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            travauxCategory.percent === 100 ? "bg-green-50 text-green-600" :
            travauxCategory.percent >= 50 ? "bg-amber-50 text-amber-600" :
            "bg-red-50 text-red-500"
          }`}>
            {travauxCategory.filled}/{travauxCategory.total}
          </span>
        </div>

        {/* Quick status */}
        {!hasReno && !hasDpe && (
          <p className="text-sm text-gray-500 mb-4">
            Aucune information sur les travaux n'a encore été renseignée.
          </p>
        )}

        {/* DPE visual indicator if available */}
        {hasDpe && (
          <div className="mb-4 p-3 bg-tiili-surface rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Classement DPE</span>
              <span className={`text-lg font-bold px-3 py-0.5 rounded ${
                property.dpe_rating === "A" || property.dpe_rating === "B" ? "bg-green-100 text-green-700" :
                property.dpe_rating === "C" || property.dpe_rating === "D" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                {property.dpe_rating}
              </span>
            </div>
            {(property.dpe_rating === "F" || property.dpe_rating === "G") && (
              <p className="text-xs text-red-500 mt-2">
                Passoire thermique — des travaux d'isolation seront probablement nécessaires.
              </p>
            )}
          </div>
        )}

        {/* Field list with inline editors */}
        <CategoryFieldList
          property={property}
          category={travauxCategory}
        />
      </section>
    </div>
  );
}
