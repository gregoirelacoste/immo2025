import { PropertyFormData } from "@/domains/property/types";
import { ReactNode } from "react";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  prefillHint: (field: string) => ReactNode;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const selectClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px] bg-white";

export default function RenovationSection({ form, onChange, prefillHint }: Props) {
  const dpe = form.dpe_rating;
  const isDpeAlert = dpe === "F" || dpe === "G";

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Travaux & Diagnostic</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label className={labelClass}>DPE<FieldTooltip text="Diagnostic de Performance Énergétique (A=excellent, G=passoire). Les DPE F et G ont des restrictions de location." /></label>
          <select
            className={selectClass}
            value={form.dpe_rating || ""}
            onChange={e => onChange("dpe_rating", e.target.value || "")}
          >
            <option value="">Non renseigné</option>
            {["A", "B", "C", "D", "E", "F", "G"].map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          {prefillHint("dpe_rating")}
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

      {isDpeAlert && (
        <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${dpe === "G" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"}`}>
          {dpe === "G"
            ? "⚠ DPE G : interdiction de location depuis 2025. Travaux énergétiques obligatoires."
            : "⚠ DPE F : interdiction de location à partir de 2028. Anticiper les travaux énergétiques."}
        </div>
      )}
    </section>
  );
}
