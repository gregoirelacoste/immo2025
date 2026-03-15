import { PropertyFormData } from "@/domains/property/types";
import { ReactNode } from "react";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const selectClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px] bg-white";

export default function RenovationSection({ form, onChange, prefillHint }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Travaux & Fiscalité</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Montant travaux (€)<FieldTooltip text="Coût estimé des travaux de rénovation. Inclus dans le coût total du projet et amortissable en LMNP Réel." /></label>
          <input
            type="number" inputMode="numeric" className={inputClass}
            placeholder="0" value={form.renovation_cost || ""}
            onChange={e => onChange("renovation_cost", parseFloat(e.target.value) || 0)}
          />
          {prefillHint("renovation_cost")}
        </div>
        <div>
          <label className={labelClass}>Régime fiscal<FieldTooltip text="Micro-BIC : abattement 50% simple. LMNP Réel : déduction des charges + amortissement (plus avantageux si charges élevées)." /></label>
          <select
            className={selectClass}
            value={form.fiscal_regime || "micro_bic"}
            onChange={e => onChange("fiscal_regime", e.target.value)}
          >
            <option value="micro_bic">Micro-BIC (LMNP)</option>
            <option value="lmnp_reel">LMNP Réel</option>
            <option value="micro_foncier">Micro-foncier</option>
            <option value="reel_foncier">Réel foncier</option>
          </select>
        </div>
      </div>
    </section>
  );
}
