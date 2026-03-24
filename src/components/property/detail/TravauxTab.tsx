"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import {
  calculateTravaux,
  parseTravauxRatings,
  parseTravauxOverrides,
  parseTravauxTargets,
  applyPresetToTargets,
  TRAVAUX_PRESETS,
  type TravauxPreset,
} from "@/domains/property/travaux-calculator";
import { TRAVAUX_POSTES, TRAVAUX_CATEGORIES, type TravauxPoste } from "@/domains/property/travaux-registry";
import { updatePropertyField } from "@/domains/property/actions";
import { syncFieldToSimulations } from "@/domains/simulation/actions";
import type { Confidence } from "@/domains/property/prefill";
import { formatCurrency } from "@/lib/calculations";
import StarRating from "@/components/ui/StarRating";

interface Props {
  property: Property;
  isOwner?: boolean;
}

export default function TravauxTab({ property, isOwner = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local state for optimistic updates
  const [localRatings, setLocalRatings] = useState<Record<string, number>>(() =>
    parseTravauxRatings(property.travaux_ratings ?? "{}")
  );
  const [localTargets, setLocalTargets] = useState<Record<string, number>>(() =>
    parseTravauxTargets(property.travaux_targets ?? "{}")
  );
  const [localOverrides, setLocalOverrides] = useState<Record<string, number>>(() =>
    parseTravauxOverrides(property.travaux_overrides ?? "{}")
  );
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<TravauxPreset>("none");

  const summary = useMemo(
    () => calculateTravaux(property.surface, JSON.stringify(localRatings), JSON.stringify(localOverrides), JSON.stringify(localTargets)),
    [property.surface, localRatings, localOverrides, localTargets]
  );

  const hasAnyRating = Object.keys(localRatings).length > 0;
  const hasAnyTarget = Object.keys(localTargets).length > 0;
  const hasDpe = !!property.dpe_rating;

  // Persist a set of fields to DB, check results, sync renovation_cost to simulations
  const persistFields = useCallback(
    (fields: Array<{ field: string; value: string | number; source: string; mode: Confidence }>, newSummary: ReturnType<typeof calculateTravaux>) => {
      setSaveError(null);
      startTransition(async () => {
        for (const f of fields) {
          const res = await updatePropertyField(property.id, f.field, f.value, f.source, f.mode);
          if (!res.success) { setSaveError(res.error ?? "Erreur d'enregistrement"); return; }
        }
        const res2 = await updatePropertyField(property.id, "renovation_cost", newSummary.totalRenovationCost, "Estimation travaux", "estimated");
        if (!res2.success) { setSaveError(res2.error ?? "Erreur d'enregistrement"); return; }
        await syncFieldToSimulations(property.id, "renovation_cost", newSummary.totalRenovationCost);
        router.refresh();
      });
    },
    [property.id, router]
  );

  const persistRatings = useCallback(
    (newRatings: Record<string, number>) => {
      const newSummary = calculateTravaux(property.surface, JSON.stringify(newRatings), JSON.stringify(localOverrides), JSON.stringify(localTargets));
      persistFields(
        [{ field: "travaux_ratings", value: JSON.stringify(newRatings), source: "Estimation travaux", mode: "estimated" }],
        newSummary
      );
    },
    [property.surface, localOverrides, localTargets, persistFields]
  );

  const persistTargets = useCallback(
    (newTargets: Record<string, number>) => {
      const newSummary = calculateTravaux(property.surface, JSON.stringify(localRatings), JSON.stringify(localOverrides), JSON.stringify(newTargets));
      persistFields(
        [{ field: "travaux_targets", value: JSON.stringify(newTargets), source: "Objectif travaux", mode: "declared" }],
        newSummary
      );
    },
    [property.surface, localRatings, localOverrides, persistFields]
  );

  const persistOverrides = useCallback(
    (newOverrides: Record<string, number>) => {
      const newSummary = calculateTravaux(property.surface, JSON.stringify(localRatings), JSON.stringify(newOverrides), JSON.stringify(localTargets));
      persistFields(
        [{ field: "travaux_overrides", value: JSON.stringify(newOverrides), source: "Estimation travaux", mode: "declared" }],
        newSummary
      );
    },
    [property.surface, localRatings, localTargets, persistFields]
  );

  function handleRatingChange(key: string, value: number | null) {
    const next = { ...localRatings };
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setLocalRatings(next);
    persistRatings(next);

    // Recalculate targets based on active preset
    const presetConfig = TRAVAUX_PRESETS.find(p => p.key === activePreset);
    if (presetConfig && presetConfig.targetRating > 0) {
      // Re-apply preset with updated ratings
      const newTargets = applyPresetToTargets(next, presetConfig.targetRating);
      setLocalTargets(newTargets);
      persistTargets(newTargets);
    } else {
      // Manual mode: remove target if rating removed, bump if target < new rating
      const nextTargets = { ...localTargets };
      if (value === null) {
        delete nextTargets[key];
      } else if (nextTargets[key] != null && nextTargets[key] < value) {
        nextTargets[key] = value;
      }
      if (JSON.stringify(nextTargets) !== JSON.stringify(localTargets)) {
        setLocalTargets(nextTargets);
        persistTargets(nextTargets);
      }
    }
  }

  // Manual target change — only available when preset is "aucun"
  function handleTargetChange(key: string, value: number | null) {
    const next = { ...localTargets };
    const currentRating = localRatings[key];
    if (value === null || (currentRating != null && value <= currentRating)) {
      delete next[key];
    } else {
      next[key] = value;
    }
    setLocalTargets(next);
    persistTargets(next);
  }

  // Preset change — overwrites ALL per-item targets
  function handlePresetChange(preset: TravauxPreset) {
    setActivePreset(preset);
    const presetConfig = TRAVAUX_PRESETS.find(p => p.key === preset);
    if (!presetConfig) return;

    const newTargets = presetConfig.targetRating === 0
      ? {}
      : applyPresetToTargets(localRatings, presetConfig.targetRating);

    setLocalTargets(newTargets);
    persistTargets(newTargets);
  }

  function handleOverrideChange(key: string, value: string) {
    const isCoefficient = key.startsWith("valo_coeff_");
    const num = isCoefficient ? parseFloat(value) : parseInt(value, 10);
    const next = { ...localOverrides };
    if (isNaN(num) || (!isCoefficient && num <= 0) || (isCoefficient && num < 0)) {
      delete next[key];
    } else {
      next[key] = num;
    }
    setLocalOverrides(next);
    persistOverrides(next);
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
        <h3 className="text-base font-semibold text-gray-900 mb-1">Travaux</h3>

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

        {/* Preset selector — only shown when at least one rating exists */}
        {hasAnyRating && isOwner && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Objectif de rénovation
            </p>
            <div className="flex gap-1.5">
              {TRAVAUX_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handlePresetChange(preset.key)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    activePreset === preset.key
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {TRAVAUX_PRESETS.find(p => p.key === activePreset)?.description}
              {" · "}Personnalisable par poste
            </p>
          </div>
        )}

        {/* Budget summary — compact */}
        {hasAnyRating && summary.totalRenovationCost > 0 ? (
          <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-extrabold text-orange-700">
                  {formatCurrency(summary.totalRenovationCost)}
                </div>
                <div className="text-xs text-orange-500 font-medium">Budget travaux estimé</div>
              </div>
              {summary.monthlyMaintenanceCost > 0 && (
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">+{summary.monthlyMaintenanceCost}{"\u202f"}€/mois</div>
                  <div className="text-[10px] text-blue-400">Entretien</div>
                </div>
              )}
            </div>
            {/* Inline split: remise à niveau / valorisation / négo */}
            {(summary.totalRemiseANiveauCost > 0 || summary.totalValorisationCost > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-orange-100">
                {summary.totalRemiseANiveauCost > 0 && (
                  <span className="text-xs text-red-600">
                    Remise à niveau : <span className="font-semibold">{formatCurrency(summary.totalRemiseANiveauCost)}</span>
                  </span>
                )}
                {summary.totalValorisationCost > 0 && (
                  <span className="text-xs text-emerald-600">
                    Valorisation : <span className="font-semibold">{formatCurrency(summary.totalValorisationCost)}</span>
                  </span>
                )}
                {summary.valorisationResaleValue > 0 && (
                  <span className="text-xs text-emerald-500">
                    Plus-value revente : <span className="font-semibold">+{formatCurrency(summary.valorisationResaleValue)}</span>
                  </span>
                )}
              </div>
            )}
            {summary.totalRemiseANiveauCost > 0 && (
              <p className="text-[11px] text-blue-600 mt-2">
                Argument de négo : <span className="font-semibold">-{formatCurrency(summary.totalRemiseANiveauCost)}</span> sur le prix d'achat
              </p>
            )}
          </div>
        ) : hasAnyRating ? (
          <div className="mb-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="text-2xl font-extrabold text-orange-700">
              {formatCurrency(summary.totalRenovationCost)}
            </div>
            <div className="text-xs text-orange-500 font-medium">Budget travaux estimé</div>
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
                  const showCost = item.finalCost > 0 && !item.isRecurrent;
                  const hasTarget = item.target !== null && item.rating !== null && item.target > item.rating;

                  return (
                    <div key={item.key} className={`rounded-lg border bg-white ${isExpanded ? "border-amber-200" : "border-gray-100"}`}>
                      {/* Compact row */}
                      <div
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer min-h-[44px]"
                        onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                      >
                        <span className="text-sm font-medium text-gray-700 w-24 shrink-0 truncate">
                          {item.label}
                        </span>
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <StarRating
                            value={item.rating}
                            onChange={isOwner ? (v) => handleRatingChange(item.key, v) : undefined}
                            readonly={!isOwner}
                            size="sm"
                          />
                          {hasTarget && (
                            <span className="text-[10px] text-emerald-600 font-semibold whitespace-nowrap">
                              →{item.target}★
                            </span>
                          )}
                        </div>
                        {showCost && (
                          <span className="text-sm font-bold text-orange-700 shrink-0 tabular-nums">
                            {formatCurrency(item.finalCost)}
                          </span>
                        )}
                        {item.isRecurrent && item.monthlyProvision > 0 && (
                          <span className="text-sm font-bold text-blue-600 shrink-0 tabular-nums">
                            {item.monthlyProvision}{"\u202f"}€/m
                          </span>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-50 space-y-2">
                          {/* Reference cost + cost breakdown inline */}
                          <div className="text-xs text-gray-500">
                            {formatReferenceCostLabel(poste, property.surface, item.referenceCost)}
                          </div>

                          {item.finalCost > 0 && !item.isRecurrent && (item.remiseANiveauCost > 0 || item.valorisationCost > 0) && (
                            <div className="flex gap-3 text-xs">
                              {item.remiseANiveauCost > 0 && (
                                <span className="text-red-600">Remise à niveau : <span className="font-semibold">{formatCurrency(item.remiseANiveauCost)}</span></span>
                              )}
                              {item.valorisationCost > 0 && (
                                <span className="text-emerald-600">Valo : <span className="font-semibold">{formatCurrency(item.valorisationCost)}</span></span>
                              )}
                            </div>
                          )}

                          {/* Target selector — only in manual mode (preset = "aucun") */}
                          {isOwner && activePreset === "none" && item.rating !== null && !item.isRecurrent && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500 font-medium shrink-0">Objectif :</label>
                              <div className="flex gap-1">
                                {[3, 4, 5].filter(v => v > (item.rating ?? 0)).map(v => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleTargetChange(item.key, item.target === v ? null : v); }}
                                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors min-h-[32px] ${
                                      item.target === v
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                  >
                                    {v}★
                                  </button>
                                ))}
                                {item.target !== null && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleTargetChange(item.key, null); }}
                                    className="px-2 py-1 text-[10px] text-gray-400 hover:text-red-500 underline min-h-[32px]"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {poste.hint && (
                            <p className="text-xs text-gray-400 italic">{poste.hint}</p>
                          )}

                          {isOwner && (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-500">Montant :</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="—"
                                  value={item.overrideCost ?? ""}
                                  onChange={(e) => handleOverrideChange(item.key, e.target.value)}
                                  className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                                <span className="text-xs text-gray-400">€</span>
                              </div>
                              {!item.isRecurrent && (
                                <div className="flex items-center gap-1.5">
                                  <label className="text-xs text-gray-500">ROI :</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="5"
                                    min="0"
                                    max="100"
                                    placeholder={String(Math.round((poste.valorisationCoefficient ?? 0) * 100))}
                                    value={localOverrides[`valo_coeff_${item.key}`] != null ? Math.round(localOverrides[`valo_coeff_${item.key}`] * 100) : ""}
                                    onChange={(e) => {
                                      const pct = parseInt(e.target.value, 10);
                                      handleOverrideChange(`valo_coeff_${item.key}`, isNaN(pct) ? "" : String(pct / 100));
                                    }}
                                    className="w-14 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                              )}
                            </div>
                          )}
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

      {isPending && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50">
          Enregistrement...
        </div>
      )}
      {saveError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          {saveError}
          <button onClick={() => setSaveError(null)} className="underline">OK</button>
        </div>
      )}
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
