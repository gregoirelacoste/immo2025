import { ReactNode } from "react";
import { PropertyFormData, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  calcs: PropertyCalculations;
  prefillHint: (field: string) => ReactNode;
  rentAutoCalc?: boolean;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const autoCalcClass =
  "w-full px-3 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px] bg-blue-50/50";

export default function ClassicRentalSection({ form, onChange, calcs, prefillHint, rentAutoCalc }: Props) {
  const calculatedRent = form.rent_per_m2 > 0 && form.surface > 0
    ? Math.round(form.rent_per_m2 * form.surface)
    : null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Location classique</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Loyer au m² / mois<FieldTooltip text="Prix de location au m² dans le quartier. Consultez l'observatoire des loyers pour votre ville." /></label>
          <input type="number" inputMode="decimal" step="0.1" value={form.rent_per_m2 || ""} onChange={(e) => onChange("rent_per_m2", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="12.5" />
          {prefillHint("rent_per_m2")}
          {form.rent_per_m2 > 0 && form.surface > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              = {formatCurrency(calculatedRent!)} / mois pour {form.surface} m²
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>
            Loyer mensuel
            {rentAutoCalc && <span className="ml-1 text-[10px] text-blue-500 font-normal">(auto)</span>}
          </label>
          <input type="number" inputMode="numeric" value={form.monthly_rent || ""} onChange={(e) => onChange("monthly_rent", parseFloat(e.target.value) || 0)} className={rentAutoCalc ? autoCalcClass : inputClass} placeholder="800" />
          {prefillHint("monthly_rent")}
          {calculatedRent != null && form.monthly_rent > 0 && form.monthly_rent !== calculatedRent && (
            <p className="text-xs text-amber-500 mt-0.5">
              Valeur manuelle ({formatCurrency(form.monthly_rent)}) ≠ calcul prix/m² ({formatCurrency(calculatedRent)})
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Charges copro / mois<FieldTooltip text="Charges de copropriété mensuelles (entretien, gardien, ascenseur...). Demandez le PV d'AG pour les connaître." /></label>
          <input type="number" inputMode="numeric" value={form.condo_charges || ""} onChange={(e) => onChange("condo_charges", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="100" />
          {prefillHint("condo_charges")}
        </div>
        <div>
          <label className={labelClass}>Taxe foncière / an<FieldTooltip text="Impôt local annuel payé par le propriétaire. Variable selon la commune (souvent 10-20€/m²)." /></label>
          <input type="number" inputMode="numeric" value={form.property_tax || ""} onChange={(e) => onChange("property_tax", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("property_tax")}
        </div>
        <div>
          <label className={labelClass}>Vacance locative (%)<FieldTooltip text="Pourcentage de temps sans locataire. 5-8% est réaliste en zone tendue, 10-15% en zone détendue." /></label>
          <input type="number" inputMode="decimal" step="0.1" value={form.vacancy_rate || ""} onChange={(e) => onChange("vacancy_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="5" />
        </div>
      </div>
      {form.monthly_rent > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="text-blue-500 text-xs">Rendement brut</span>
              <p className="font-bold text-blue-700">{formatPercent(calcs.gross_yield)}</p>
            </div>
            <div>
              <span className="text-blue-500 text-xs">Rendement net</span>
              <p className="font-bold text-blue-700">{formatPercent(calcs.net_yield)}</p>
            </div>
            <div>
              <span className="text-blue-500 text-xs">Revenus nets / an</span>
              <p className="font-bold">{formatCurrency(calcs.annual_rent_income)}</p>
            </div>
            <div>
              <span className="text-blue-500 text-xs">Cash-flow / mois</span>
              <p className={`font-bold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(calcs.monthly_cashflow)}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
