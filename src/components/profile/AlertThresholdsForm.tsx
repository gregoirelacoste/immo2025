"use client";

import { AlertThresholds, DEFAULT_ALERT_THRESHOLDS } from "@/domains/auth/alert-types";

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface Props {
  thresholds: AlertThresholds;
  onChange: (thresholds: AlertThresholds) => void;
  matchCount?: number;
}

export default function AlertThresholdsForm({ thresholds, onChange, matchCount }: Props) {
  function update(key: keyof Omit<AlertThresholds, "target_cities">, value: string) {
    onChange({
      ...thresholds,
      [key]: value === "" ? null : Number(value),
    });
  }

  function updateCities(value: string) {
    const cities = value.split(",").map((c) => c.trim()).filter(Boolean);
    onChange({ ...thresholds, target_cities: cities });
  }

  function reset() {
    onChange({ ...DEFAULT_ALERT_THRESHOLDS });
  }

  const hasAny =
    thresholds.min_net_yield !== null ||
    thresholds.min_cashflow !== null ||
    thresholds.max_price !== null ||
    thresholds.min_score !== null ||
    thresholds.target_cities.length > 0;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Alertes seuils</h2>
        {hasAny && (
          <button
            type="button"
            onClick={reset}
            className="text-sm text-amber-600 hover:text-amber-800"
          >
            Effacer
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Configurez des seuils pour identifier les biens qui correspondent a vos
        criteres. Les biens qui matchent seront signales sur le dashboard.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Rendement net minimum (%)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            className={inputClass}
            placeholder="ex: 5"
            value={thresholds.min_net_yield ?? ""}
            onChange={(e) => update("min_net_yield", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Cash-flow mensuel minimum (EUR)</label>
          <input
            type="number"
            inputMode="numeric"
            className={inputClass}
            placeholder="ex: 0"
            value={thresholds.min_cashflow ?? ""}
            onChange={(e) => update("min_cashflow", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Prix d&apos;achat maximum (EUR)</label>
          <input
            type="number"
            inputMode="numeric"
            className={inputClass}
            placeholder="ex: 150000"
            value={thresholds.max_price ?? ""}
            onChange={(e) => update("max_price", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Score investissement minimum (/100)</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            className={inputClass}
            placeholder="ex: 50"
            value={thresholds.min_score ?? ""}
            onChange={(e) => update("min_score", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Villes cibles (separees par des virgules)</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Lyon, Saint-Etienne, Bordeaux"
            value={thresholds.target_cities.join(", ")}
            onChange={(e) => updateCities(e.target.value)}
          />
        </div>
      </div>

      {hasAny && matchCount !== undefined && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg">
          <p className="text-sm font-medium text-amber-700">
            {matchCount === 0
              ? "Aucun bien ne correspond actuellement a vos criteres."
              : `${matchCount} bien${matchCount > 1 ? "s" : ""} correspond${matchCount > 1 ? "ent" : ""} a vos criteres.`}
          </p>
        </div>
      )}
    </section>
  );
}
