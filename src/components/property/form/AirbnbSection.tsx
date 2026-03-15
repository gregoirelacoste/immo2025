import { PropertyFormData, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  calcs: PropertyCalculations;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function AirbnbSection({ form, onChange, calcs }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Airbnb / Location courte durée</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Prix par nuit</label>
          <input type="number" inputMode="numeric" value={form.airbnb_price_per_night || ""} onChange={(e) => onChange("airbnb_price_per_night", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="80" />
        </div>
        <div>
          <label className={labelClass}>Taux d&apos;occupation (%)</label>
          <input type="number" inputMode="decimal" step="0.1" value={form.airbnb_occupancy_rate || ""} onChange={(e) => onChange("airbnb_occupancy_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="60" />
        </div>
        <div>
          <label className={labelClass}>Charges mensuelles Airbnb</label>
          <input type="number" inputMode="numeric" value={form.airbnb_charges || ""} onChange={(e) => onChange("airbnb_charges", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="200" />
        </div>
      </div>
      {form.airbnb_price_per_night > 0 && (
        <div className="mt-4 p-4 bg-orange-50 rounded-lg">
          <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="text-orange-500 text-xs">Rendement brut</span>
              <p className="font-bold text-orange-700">{formatPercent(calcs.airbnb_gross_yield)}</p>
            </div>
            <div>
              <span className="text-orange-500 text-xs">Rendement net</span>
              <p className="font-bold text-orange-700">{formatPercent(calcs.airbnb_net_yield)}</p>
            </div>
            <div>
              <span className="text-orange-500 text-xs">Revenus / an</span>
              <p className="font-bold">{formatCurrency(calcs.airbnb_annual_income)}</p>
            </div>
            <div>
              <span className="text-orange-500 text-xs">Cash-flow / mois</span>
              <p className={`font-bold ${calcs.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(calcs.airbnb_monthly_cashflow)}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
