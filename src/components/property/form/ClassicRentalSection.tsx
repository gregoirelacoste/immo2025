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

export default function ClassicRentalSection({ form, onChange, calcs, prefillHint }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Location classique</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Loyer mensuel</label>
          <input type="number" inputMode="numeric" value={form.monthly_rent || ""} onChange={(e) => onChange("monthly_rent", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("monthly_rent")}
        </div>
        <div>
          <label className={labelClass}>Charges copro / mois<FieldTooltip text="Charges de copropriété mensuelles (entretien, gardien, ascenseur...). Demandez le PV d'AG pour les connaître." /></label>
          <input type="number" inputMode="numeric" value={form.condo_charges || ""} onChange={(e) => onChange("condo_charges", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="100" />
          {prefillHint("condo_charges")}
        </div>
        <div>
          <label className={labelClass}>Taxe foncière / an<FieldTooltip text="Taxe foncière annuelle. Demandez le montant au vendeur ou consultez l'avis d'imposition." /></label>
          <input type="number" inputMode="numeric" value={form.property_tax || ""} onChange={(e) => onChange("property_tax", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("property_tax")}
        </div>
        <div>
          <label className={labelClass}>Vacance locative (%)<FieldTooltip text="Pourcentage du temps où le bien est inoccupé. 5-8% est courant." /></label>
          <input type="number" inputMode="decimal" step="1" value={form.vacancy_rate || ""} onChange={(e) => onChange("vacancy_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="5" />
          {prefillHint("vacancy_rate")}
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
