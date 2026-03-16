"use client";

import { useState, useMemo } from "react";
import { Property } from "@/domains/property/types";
import { getCompletionSummary } from "@/domains/property/completion";
import { CATEGORIES, CATEGORY_CONFIG, type FieldCategory } from "@/domains/property/field-registry";
import CompletionBadge from "./CompletionBadge";
import CategoryFieldList from "./CategoryFieldList";

interface Props {
  property: Property;
}

export default function CompletionTab({ property }: Props) {
  const summary = useMemo(() => getCompletionSummary(property), [property]);

  // Default to first category with missing fields, or first category
  const [activeCategory, setActiveCategory] = useState<FieldCategory>(() => {
    const firstIncomplete = summary.categories.find((c) => c.missingFields.length > 0);
    return firstIncomplete?.category || CATEGORIES[0];
  });

  const activeCategoryData = summary.categories.find((c) => c.category === activeCategory)!;

  return (
    <div className="space-y-4 mt-4">
      {/* Global progress */}
      <section className="bg-white rounded-xl border border-tiili-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Complétion des données</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.totalMissing > 0
                ? `${summary.totalMissing} donnée${summary.totalMissing > 1 ? "s" : ""} manquante${summary.totalMissing > 1 ? "s" : ""}`
                : "Toutes les données sont renseignées"}
            </p>
          </div>
          <CompletionBadge percent={summary.globalPercent} />
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              summary.globalPercent >= 80 ? "bg-green-500" :
              summary.globalPercent >= 50 ? "bg-amber-500" :
              "bg-red-400"
            }`}
            style={{ width: `${summary.globalPercent}%` }}
          />
        </div>
      </section>

      {/* Category sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {summary.categories.map((cat) => {
          const isActive = cat.category === activeCategory;
          const isComplete = cat.percent === 100;
          const config = CATEGORY_CONFIG[cat.category];
          return (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(cat.category)}
              className={`flex-1 min-w-0 py-2 px-1.5 text-center rounded-lg transition-colors ${
                isActive
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className={`text-xs font-medium truncate ${
                isActive ? "text-amber-600" :
                isComplete ? "text-green-600" :
                "text-gray-500"
              }`}>
                {config.label}
              </div>
              <div className={`text-[10px] mt-0.5 font-semibold ${
                isComplete ? "text-green-500" : "text-gray-400"
              }`}>
                {cat.filled}/{cat.total}
                {isComplete && " ✓"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active category content */}
      <section className="bg-white rounded-xl border border-tiili-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-800">
            {CATEGORY_CONFIG[activeCategory].icon} {CATEGORY_CONFIG[activeCategory].label}
          </h4>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            activeCategoryData.percent === 100 ? "bg-green-50 text-green-600" :
            activeCategoryData.percent >= 50 ? "bg-amber-50 text-amber-600" :
            "bg-red-50 text-red-500"
          }`}>
            {activeCategoryData.percent}%
          </span>
        </div>

        <CategoryFieldList
          property={property}
          category={activeCategoryData}
        />
      </section>
    </div>
  );
}
