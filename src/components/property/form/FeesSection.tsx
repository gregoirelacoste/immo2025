import { PropertyFormData, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  calcs: PropertyCalculations;
  effectiveNotary: number;
  readOnly?: boolean;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const valueClass = "text-base font-medium text-[#1a1a2e] py-2";

export default function FeesSection({ form, onChange, calcs, effectiveNotary, readOnly }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Frais &amp; coût total</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Frais de notaire ({form.property_type === "ancien" ? "7.5%" : "2.5%"})
            {!readOnly && <FieldTooltip text="Frais d'acquisition obligatoires. ~7.5% dans l'ancien, ~2.5% dans le neuf. Laissez vide pour le calcul automatique." />}
          </label>
          {readOnly ? (
            <p className={valueClass}>{formatCurrency(effectiveNotary)}</p>
          ) : (
            <>
              <input
                type="number"
                inputMode="numeric"
                value={form.notary_fees || ""}
                onChange={(e) => onChange("notary_fees", parseFloat(e.target.value) || 0)}
                className={inputClass}
                placeholder={`Auto : ${effectiveNotary} €`}
              />
              <p className="text-xs text-gray-400 mt-1">
                Vide = calcul auto. Estimé : {formatCurrency(effectiveNotary)}
              </p>
            </>
          )}
        </div>
        <div>
          <label className={labelClass}>Frais de dossier bancaire{!readOnly && <FieldTooltip text="Frais facturés par la banque pour monter le dossier de prêt. Souvent négociables (500-1500€)." />}</label>
          {readOnly ? (
            <p className={valueClass}>{formatCurrency(form.loan_fees)}</p>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              value={form.loan_fees || ""}
              onChange={(e) => onChange("loan_fees", parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="1000"
            />
          )}
        </div>
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <span className="text-gray-500 text-xs">Prix d&apos;achat</span>
            <p className="font-bold">{formatCurrency(form.purchase_price)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Frais de notaire</span>
            <p className="font-bold">{formatCurrency(effectiveNotary)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Frais de dossier</span>
            <p className="font-bold">{formatCurrency(form.loan_fees)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Coût total du projet</span>
            <p className="font-bold text-amber-700">{formatCurrency(calcs.total_project_cost)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
