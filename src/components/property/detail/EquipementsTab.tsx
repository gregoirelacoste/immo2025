"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { parseAmenities } from "@/domains/property/amenities";
import { calculateEquipmentImpact } from "@/domains/property/equipment-calculator";
import { EQUIPMENT_CATEGORIES } from "@/domains/property/equipment-impact";
import { updatePropertyField } from "@/domains/property/actions";
import { formatCurrency } from "@/lib/calculations";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import type { MarketData } from "@/domains/market/types";

interface Props {
  property: Property;
  marketData: MarketData | null;
  isOwner?: boolean;
}

export default function EquipementsTab({ property, marketData, isOwner = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local state for optimistic toggles
  const [localAmenities, setLocalAmenities] = useState<string[]>(() =>
    parseAmenities(property.amenities)
  );

  // Market rent per m²
  const marketRentPerM2 = marketData?.avgRentPerM2 ?? (
    property.rent_per_m2 > 0 ? property.rent_per_m2 :
    property.monthly_rent > 0 && property.surface > 0 ? property.monthly_rent / property.surface :
    15 // fallback
  );

  const summary = useMemo(
    () => calculateEquipmentImpact(marketRentPerM2, localAmenities),
    [marketRentPerM2, localAmenities]
  );

  function handleToggle(key: string, checked: boolean) {
    const next = checked
      ? [...localAmenities, key]
      : localAmenities.filter((k) => k !== key);
    setLocalAmenities(next);

    setSaveError(null);
    startTransition(async () => {
      const res = await updatePropertyField(property.id, "amenities", JSON.stringify(next), "Saisie manuelle", "declared");
      if (!res.success) { setSaveError(res.error ?? "Erreur d'enregistrement"); return; }
      // In auto rent mode, recalculate and persist monthly_rent from equipment impact
      if (property.rent_mode !== "manual" && marketRentPerM2 > 0 && property.surface > 0) {
        const newSummary = calculateEquipmentImpact(marketRentPerM2, next);
        const autoRent = Math.round(newSummary.adjustedRentPerM2 * property.surface);
        const res2 = await updatePropertyField(property.id, "monthly_rent", autoRent, "Loyer auto (localité + équipements)", "estimated");
        if (!res2.success) { setSaveError(res2.error ?? "Erreur d'enregistrement"); return; }
      }
      router.refresh();
    });
  }

  // Group items by category
  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof summary.items>();
    for (const cat of EQUIPMENT_CATEGORIES) {
      map.set(cat.key, []);
    }
    for (const item of summary.items) {
      const arr = map.get(item.category);
      if (arr) arr.push(item);
    }
    return map;
  }, [summary.items]);

  const impactSign = summary.totalImpactPercent >= 0 ? "+" : "";
  const impactColor = summary.totalImpactPercent > 0 ? "text-green-600" : summary.totalImpactPercent < 0 ? "text-red-600" : "text-gray-600";
  const impactDelta = summary.adjustedRentPerM2 - marketRentPerM2;

  return (
    <div className="space-y-4 mt-4">
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Équipements</h3>

        {/* Impact summary */}
        <div className="mb-4 p-4 bg-tiili-surface rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Impact loyer estimé</span>
            <span className={`text-lg font-bold ${impactColor}`}>
              {impactSign}{Math.round(summary.totalImpactPercent * 100)}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Loyer ajusté : {summary.adjustedRentPerM2.toFixed(2)} €/m²
              {impactDelta !== 0 && (
                <span className={impactColor}>
                  {" "}({impactDelta > 0 ? "+" : ""}{impactDelta.toFixed(2)} €/m²)
                </span>
              )}
            </span>
            <span>vs {marketRentPerM2.toFixed(2)} €/m² marché</span>
          </div>
          {property.surface > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Loyer mensuel ajusté : ~{formatCurrency(Math.round(summary.adjustedRentPerM2 * property.surface))}
            </div>
          )}
        </div>

        {/* Equipment toggles by category */}
        {EQUIPMENT_CATEGORIES.map(({ key: catKey, label: catLabel }) => {
          const items = groupedItems.get(catKey);
          if (!items || items.length === 0) return null;
          return (
            <div key={catKey} className="mb-4 last:mb-0">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {catLabel}
              </h4>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 bg-white min-h-[48px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="text-sm font-medium text-gray-700 truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {item.impactPercent !== 0 && (
                        <span className={`text-xs font-semibold ${
                          item.impactPercent > 0 ? "text-green-600" : "text-red-500"
                        }`}>
                          {item.impactPercent > 0 ? "+" : ""}{Math.round(item.impactPercent * 100)}%
                        </span>
                      )}
                      <ToggleSwitch
                        checked={item.present}
                        onChange={isOwner ? (checked) => handleToggle(item.key, checked) : undefined}
                        disabled={!isOwner}
                        label={item.label}
                      />
                    </div>
                  </div>
                ))}
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
