import { ReactNode } from "react";
import { PropertyFormData } from "@/domains/property/types";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function ClassicRentalSection({ form, onChange, prefillHint }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Location classique</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Loyer mensuel</label>
          <input type="number" inputMode="numeric" value={form.monthly_rent || ""} onChange={(e) => onChange("monthly_rent", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("monthly_rent")}
        </div>
        <div>
          <label className={labelClass}>Charges copro / an<FieldTooltip text="Charges de copropriété annuelles (entretien, gardien, ascenseur...). Demandez le PV d'AG pour les connaître." /></label>
          <input type="number" inputMode="numeric" value={form.condo_charges || ""} onChange={(e) => onChange("condo_charges", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="1200" />
          {prefillHint("condo_charges")}
        </div>
        <div>
          <label className={labelClass}>Taxe foncière / an<FieldTooltip text="Taxe foncière annuelle. Consultez l'avis d'imposition du vendeur ou estimez ~1 mois de loyer." /></label>
          <input type="number" inputMode="numeric" value={form.property_tax || ""} onChange={(e) => onChange("property_tax", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="800" />
          {prefillHint("property_tax")}
        </div>
      </div>
    </section>
  );
}
