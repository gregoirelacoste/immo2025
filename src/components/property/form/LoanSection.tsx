import { ReactNode } from "react";
import { PropertyFormData, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  form: PropertyFormData;
  onChange: (field: keyof PropertyFormData, value: string | number) => void;
  onLoanChange: (value: string) => void;
  calcs: PropertyCalculations;
  monthlyPaymentPreview: number;
  prefillHint: (field: string) => ReactNode;
}

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export default function LoanSection({ form, onChange, onLoanChange, calcs, monthlyPaymentPreview, prefillHint }: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Prêt immobilier</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Apport personnel</label>
          <input type="number" inputMode="numeric" value={form.personal_contribution || ""} onChange={(e) => onChange("personal_contribution", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="10000" />
          {prefillHint("personal_contribution")}
        </div>
        <div>
          <label className={labelClass}>Montant emprunté</label>
          <input type="number" inputMode="numeric" value={form.loan_amount || ""} onChange={(e) => onLoanChange(e.target.value)} className={inputClass} placeholder="190000" />
          {prefillHint("loan_amount")}
        </div>
        <div>
          <label className={labelClass}>Taux d&apos;intérêt (%)</label>
          <input type="number" inputMode="decimal" step="0.01" value={form.interest_rate || ""} onChange={(e) => onChange("interest_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="3.5" />
        </div>
        <div>
          <label className={labelClass}>Durée (années)</label>
          <input type="number" inputMode="numeric" value={form.loan_duration || ""} onChange={(e) => onChange("loan_duration", parseInt(e.target.value, 10) || 0)} className={inputClass} placeholder="20" />
        </div>
        <div>
          <label className={labelClass}>Assurance emprunteur (% /an)</label>
          <input type="number" inputMode="decimal" step="0.01" value={form.insurance_rate || ""} onChange={(e) => onChange("insurance_rate", parseFloat(e.target.value) || 0)} className={inputClass} placeholder="0.34" />
        </div>
      </div>
      <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
        <div className="text-sm text-indigo-700 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <span className="text-indigo-500 text-xs">Mensualité</span>
            <p className="font-bold">{formatCurrency(monthlyPaymentPreview)}</p>
          </div>
          <div>
            <span className="text-indigo-500 text-xs">Assurance / mois</span>
            <p className="font-bold">{formatCurrency(calcs.monthly_insurance)}</p>
          </div>
          <div>
            <span className="text-indigo-500 text-xs">Total mensuel</span>
            <p className="font-bold">{formatCurrency(monthlyPaymentPreview + calcs.monthly_insurance)}</p>
          </div>
          <div>
            <span className="text-indigo-500 text-xs">Coût total crédit</span>
            <p className="font-bold">{formatCurrency(calcs.total_loan_cost)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
