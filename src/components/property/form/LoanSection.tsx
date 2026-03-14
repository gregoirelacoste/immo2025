import { ReactNode } from "react";
import { PropertyFormData, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";
import FieldTooltip from "@/components/ui/FieldTooltip";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  onLoanChange: (value: string) => void;
  calcs: PropertyCalculations;
  monthlyPaymentPreview: number;
  prefillHint: (field: string) => ReactNode;
  loanAutoCalc?: boolean;
  readOnly?: boolean;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const autoCalcClass =
  "w-full px-3 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px] bg-blue-50/50";

const valueClass = "text-base font-medium text-[#1a1a2e] py-2";

export default function LoanSection({ form, onChange, onLoanChange, calcs, monthlyPaymentPreview, prefillHint, loanAutoCalc, readOnly }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Prêt immobilier</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Apport personnel{!readOnly && <FieldTooltip text="Somme investie sans emprunt. Réduit le montant emprunté et donc les mensualités." />}</label>
          {readOnly ? (
            <p className={valueClass}>{formatCurrency(form.personal_contribution)}</p>
          ) : (
            <>
              <input type="number" inputMode="numeric" value={form.personal_contribution || ""} onChange={(e) => onChange("personal_contribution", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="10000" />
              {prefillHint("personal_contribution")}
            </>
          )}
        </div>
        <div>
          <label className={labelClass}>Montant emprunté</label>
          {readOnly ? (
            <p className={valueClass}>{formatCurrency(form.loan_amount)}</p>
          ) : (
            <>
              <input type="number" inputMode="numeric" value={form.loan_amount || ""} onChange={(e) => onLoanChange(e.target.value)} className={loanAutoCalc ? autoCalcClass : inputClass} placeholder="190000" readOnly={loanAutoCalc} />
              {prefillHint("loan_amount")}
            </>
          )}
        </div>
        <div>
          <label className={labelClass}>Taux d&apos;intérêt (%){!readOnly && <FieldTooltip text="Taux nominal annuel du prêt. En 2024-2025, les taux oscillent entre 3% et 4% sur 20 ans." />}</label>
          {readOnly ? (
            <p className={valueClass}>{form.interest_rate} %</p>
          ) : (
            <input type="number" inputMode="decimal" step="0.01" value={form.interest_rate || ""} onChange={(e) => onChange("interest_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="3.5" />
          )}
        </div>
        <div>
          <label className={labelClass}>Durée (années)</label>
          {readOnly ? (
            <p className={valueClass}>{form.loan_duration} ans</p>
          ) : (
            <input type="number" inputMode="numeric" value={form.loan_duration || ""} onChange={(e) => onChange("loan_duration", parseInt(e.target.value, 10) || 0)} className={inputClass} placeholder="20" />
          )}
        </div>
        <div>
          <label className={labelClass}>Assurance emprunteur (% /an){!readOnly && <FieldTooltip text="Assurance obligatoire sur le capital emprunté. Environ 0.30% à 0.40% /an selon l'âge et la santé." />}</label>
          {readOnly ? (
            <p className={valueClass}>{form.insurance_rate} %</p>
          ) : (
            <input type="number" inputMode="decimal" step="0.01" value={form.insurance_rate || ""} onChange={(e) => onChange("insurance_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0.34" />
          )}
        </div>
      </div>
      <div className="mt-4 p-4 bg-amber-50 rounded-lg">
        <div className="text-sm text-amber-700 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <span className="text-amber-500 text-xs">Mensualité</span>
            <p className="font-bold">{formatCurrency(monthlyPaymentPreview)}</p>
          </div>
          <div>
            <span className="text-amber-500 text-xs">Assurance / mois</span>
            <p className="font-bold">{formatCurrency(calcs.monthly_insurance)}</p>
          </div>
          <div>
            <span className="text-amber-500 text-xs">Total mensuel</span>
            <p className="font-bold">{formatCurrency(monthlyPaymentPreview + calcs.monthly_insurance)}</p>
          </div>
          <div>
            <span className="text-amber-500 text-xs">Coût total crédit</span>
            <p className="font-bold">{formatCurrency(calcs.total_loan_cost)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
