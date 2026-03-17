"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { Property } from "@/domains/property/types";
import { calculateTravaux, parseTravauxRatings, parseTravauxOverrides } from "@/domains/property/travaux-calculator";
import { TRAVAUX_POSTES, TRAVAUX_CATEGORIES, RATING_FACTORS, type TravauxPoste } from "@/domains/property/travaux-registry";
import { updatePropertyField } from "@/domains/property/actions";
import { formatCurrency } from "@/lib/calculations";
import StarRating from "@/components/ui/StarRating";

interface Props {
  property: Property;
}

export default function TravauxTab({ property }: Props) {
  const [isPending, startTransition] = useTransition();

  // Local state for optimistic updates
  const [localRatings, setLocalRatings] = useState<Record<string, number>>(() =>
    parseTravauxRatings(property.travaux_ratings ?? "{}")
  );
  const [localOverrides, setLocalOverrides] = useState<Record<string, number>>(() =>
    parseTravauxOverrides(property.travaux_overrides ?? "{}")
  );
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const summary = useMemo(
    () => calculateTravaux(property.surface, JSON.stringify(localRatings), JSON.stringify(localOverrides)),
    [property.surface, localRatings, localOverrides]
  );

  const hasAnyRating = Object.keys(localRatings).length > 0;
  const hasDpe = !!property.dpe_rating;

  // Persist ratings to DB
  const persistRatings = useCallback(
    (newRatings: Record<string, number>) => {
      startTransition(async () => {
        await updatePropertyField(property.id, "travaux_ratings", JSON.stringify(newRatings), "Estimation travaux", "estimated");
      });
    },
    [property.id]
  );

  const persistOverrides = useCallback(
    (newOverrides: Record<string, number>) => {
      startTransition(async () => {
        await updatePropertyField(property.id, "travaux_overrides", JSON.stringify(newOverrides), "Estimation travaux", "declared");
      });
    },
    [property.id]
  );

  function handleRatingChange(key: string, value: number | null) {
    const next = { ...localRatings };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setLocalRatings(next);
    setApplied(false);
    persistRatings(next);
  }

  function handleOverrideChange(key: string, value: string) {
    const num = parseInt(value, 10);
    const next = { ...localOverrides };
    if (isNaN(num) || num <= 0) {
      delete next[key];
    } else {
      next[key] = num;
    }
    setLocalOverrides(next);
    persistOverrides(next);
  }

  function handleApplyToSimulation() {
    startTransition(async () => {
      await updatePropertyField(property.id, "renovation_cost", summary.totalRenovationCost, "Estimation travaux", "estimated");
      setApplied(true);
    });
  }

  // Group items by category
  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof summary.items>();
    for (const cat of TRAVAUX_CATEGORIES) {
      map.set(cat.key, []);
    }
    for (const item of summary.items) {
      const arr = map.get(item.category);
      if (arr) arr.push(item);
    }
    return map;
  }, [summary.items]);

  return (
    <div className="space-y-4 mt-4">
      {/* Summary card */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-gray-900">Travaux</h3>
          {isPending && <span className="text-xs text-gray-400">Sauvegarde...</span>}
        </div>

        {/* DPE indicator */}
        {hasDpe && (
          <div className="mb-4 p-3 bg-tiili-surface rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">DPE</span>
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

        {/* Budget summary */}
        {hasAnyRating ? (
          <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-2xl font-extrabold text-orange-700">
                  {formatCurrency(summary.totalRenovationCost)}
                </div>
                <div className="text-xs text-orange-500 font-medium">Budget travaux estimé</div>
              </div>
              <button
                onClick={handleApplyToSimulation}
                disabled={isPending || applied}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[44px] ${
                  applied
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {applied ? "Appliqué" : "Appliquer"}
              </button>
            </div>
            {summary.monthlyMaintenanceCost > 0 && (
              <div className="text-sm text-orange-600">
                Entretien : +{summary.monthlyMaintenanceCost} €/mois
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">
            Notez l'état de chaque poste pour estimer le budget travaux.
          </p>
        )}

        {/* Category sections */}
        {TRAVAUX_CATEGORIES.map(({ key: catKey, label: catLabel }) => {
          const items = groupedItems.get(catKey);
          if (!items || items.length === 0) return null;
          return (
            <div key={catKey} className="mb-4 last:mb-0">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {catLabel}
              </h4>
              <div className="space-y-1">
                {items.map((item) => {
                  const poste = TRAVAUX_POSTES.find((p) => p.key === item.key)!;
                  const isExpanded = expandedKey === item.key;
                  const showCost = item.rating !== null && item.finalCost > 0;

                  return (
                    <div key={item.key} className="rounded-lg border border-gray-100 bg-white">
                      {/* Compact row */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer min-h-[48px]"
                        onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                      >
                        <span className="text-sm font-medium text-gray-700 w-28 shrink-0 truncate">
                          {item.label}
                        </span>
                        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <StarRating
                            value={item.rating}
                            onChange={(v) => handleRatingChange(item.key, v)}
                            size="sm"
                          />
                        </div>
                        {showCost && !item.isRecurrent && (
                          <span className="text-xs font-semibold text-orange-600 shrink-0">
                            ~{formatCurrency(item.finalCost)}
                          </span>
                        )}
                        {item.isRecurrent && item.monthlyProvision > 0 && (
                          <span className="text-xs font-semibold text-blue-600 shrink-0">
                            {item.monthlyProvision} €/mois
                          </span>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-2">
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Coût réf. :</span>{" "}
                            {formatReferenceCostLabel(poste, property.surface, item.referenceCost)}
                          </div>
                          {item.rating !== null && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Facteur ({item.rating}★) :</span>{" "}
                              {Math.round((RATING_FACTORS[item.rating] ?? 0) * 100)}% × {formatCurrency(item.referenceCost)} = {formatCurrency(item.estimatedCost)}
                            </div>
                          )}
                          {poste.hint && (
                            <p className="text-xs text-gray-400 italic">{poste.hint}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <label className="text-xs text-gray-500">Montant personnalisé :</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="—"
                              value={item.overrideCost ?? ""}
                              onChange={(e) => handleOverrideChange(item.key, e.target.value)}
                              className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <span className="text-xs text-gray-400">€</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function formatReferenceCostLabel(poste: TravauxPoste, surface: number, refCost: number): string {
  switch (poste.costMode) {
    case "per_m2":
      return `${poste.referenceCostPerUnit} €/m² × ${surface} m² = ${formatCurrency(refCost)}`;
    case "per_m2_half":
      return `${poste.referenceCostPerUnit} €/m² × ${Math.round(surface / 2)} m² = ${formatCurrency(refCost)}`;
    case "per_m2_x1_5":
      return `${poste.referenceCostPerUnit} €/m² × ${Math.round(surface * 1.5)} m² = ${formatCurrency(refCost)}`;
    case "per_unit":
      return `${poste.referenceCostPerUnit} € × ${poste.defaultUnitCount ?? 1} unités = ${formatCurrency(refCost)}`;
    case "forfait":
      return `${formatCurrency(refCost)} (forfait)`;
    default:
      return formatCurrency(refCost);
  }
}
