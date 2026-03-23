"use client";

import { useMemo, useCallback, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { updatePropertyField } from "@/domains/property/actions";
import { syncFieldToSimulations } from "@/domains/simulation/actions";
import StepperField, { type StepperFieldConfig } from "@/components/ui/StepperField";
import {
  calculateNotaryFees,
  calculateMonthlyPayment,
  formatCurrency,
} from "@/lib/calculations";

interface Props {
  property: Property;
  isOwner?: boolean;
}

type FieldConfig = StepperFieldConfig & {
  field: string & keyof Property;
  /** If true, this field also exists on simulations and should be synced */
  syncToSim?: boolean;
};

const LOAN_FIELDS: FieldConfig[] = [
  { field: "personal_contribution", label: "Apport personnel", step: 1000, unit: "€", syncToSim: true },
  { field: "interest_rate", label: "Taux d'intérêt", step: 0.05, unit: "%", decimals: 2, syncToSim: true },
  { field: "loan_duration", label: "Durée du crédit", step: 1, unit: "ans", syncToSim: true },
  { field: "insurance_rate", label: "Assurance emprunteur", step: 0.01, unit: "%/an", decimals: 2, syncToSim: true },
];

const FEES_FIELDS: FieldConfig[] = [
  { field: "notary_fees", label: "Frais de notaire", step: 500, unit: "€", syncToSim: true },
  { field: "loan_fees", label: "Frais de dossier", step: 100, unit: "€", syncToSim: true },
];

const CHARGES_FIELDS: FieldConfig[] = [
  { field: "pno_insurance", label: "Assurance PNO", step: 10, unit: "€/an", syncToSim: true },
  { field: "gli_rate", label: "GLI (loyers impayés)", step: 0.5, unit: "%", decimals: 1, syncToSim: true },
  { field: "maintenance_per_m2", label: "Provision entretien", step: 1, unit: "€/m²/an", syncToSim: true },
];

const ALL_FIELDS = [...LOAN_FIELDS, ...FEES_FIELDS, ...CHARGES_FIELDS];

export default function FinancementTab({ property, isOwner = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local optimistic state
  const [localValues, setLocalValues] = useState<Partial<Record<keyof Property, number>>>({});

  const get = useCallback((field: keyof Property): number => {
    return localValues[field] ?? (property[field] as number);
  }, [localValues, property]);

  // Computed values
  const effectiveNotary = useMemo(() => {
    const nf = get("notary_fees");
    return nf > 0 ? nf : calculateNotaryFees(property.purchase_price, property.property_type);
  }, [get, property.purchase_price, property.property_type]);

  const furnitureCost = property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0;

  const loanAmount = useMemo(() => {
    return Math.max(0, property.purchase_price + effectiveNotary + property.renovation_cost + furnitureCost - get("personal_contribution"));
  }, [property.purchase_price, effectiveNotary, property.renovation_cost, furnitureCost, get]);

  const monthlyPayment = useMemo(
    () => calculateMonthlyPayment(loanAmount, get("interest_rate"), get("loan_duration")),
    [loanAmount, get]
  );

  const monthlyInsurance = useMemo(() => {
    return (loanAmount * get("insurance_rate") / 100) / 12;
  }, [loanAmount, get]);

  const totalLoanCost = useMemo(() => {
    const months = get("loan_duration") * 12;
    return (monthlyPayment + monthlyInsurance) * months - loanAmount + get("loan_fees");
  }, [monthlyPayment, monthlyInsurance, loanAmount, get]);

  const totalProjectCost = useMemo(() => {
    return property.purchase_price + effectiveNotary + get("loan_fees") + property.renovation_cost + furnitureCost;
  }, [property.purchase_price, effectiveNotary, get, property.renovation_cost, furnitureCost]);

  // GLI annual cost
  const gliAnnualCost = useMemo(() => {
    const rate = get("gli_rate");
    if (rate <= 0 || property.monthly_rent <= 0) return 0;
    return property.monthly_rent * 12 * rate / 100;
  }, [get, property.monthly_rent]);

  // Maintenance annual cost
  const maintenanceAnnualCost = useMemo(() => {
    return get("maintenance_per_m2") * property.surface;
  }, [get, property.surface]);

  // Local-only update (instant, no server call)
  const handleChange = useCallback((field: string, value: number) => {
    const key = field as keyof Property;
    setLocalValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // Server persist (called by StepperField onCommit — debounced for +/- clicks)
  const handleCommit = useCallback((field: string, value: number) => {
    const key = field as keyof Property;
    setLocalValues(prev => ({ ...prev, [key]: value }));

    const config = ALL_FIELDS.find(c => c.field === field);

    setSaveError(null);
    startTransition(async () => {
      const res = await updatePropertyField(property.id, field, value, "Onglet Financement", "declared");
      if (!res.success) { setSaveError(res.error ?? "Erreur d'enregistrement"); return; }
      // Also recalculate loan_amount when contribution/notary changes
      if (field === "personal_contribution" || field === "notary_fees") {
        const nf = field === "notary_fees"
          ? (value > 0 ? value : calculateNotaryFees(property.purchase_price, property.property_type))
          : effectiveNotary;
        const contrib = field === "personal_contribution" ? value : get("personal_contribution");
        const newLoan = Math.max(0, property.purchase_price + nf + property.renovation_cost + furnitureCost - contrib);
        const res2 = await updatePropertyField(property.id, "loan_amount", newLoan, "Calcul auto", "estimated");
        if (!res2.success) { setSaveError(res2.error ?? "Erreur d'enregistrement"); return; }
        await syncFieldToSimulations(property.id, "loan_amount", newLoan);
      }
      if (config?.syncToSim) {
        await syncFieldToSimulations(property.id, field, value);
      }
      router.refresh();
    });
  }, [property.id, property.purchase_price, property.property_type, property.renovation_cost, effectiveNotary, get, router, furnitureCost]);

  return (
    <div className="space-y-4 mt-4">
      {/* Section 1: Crédit immobilier */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Crédit immobilier</h3>

        {/* Loan amount (read-only, computed) */}
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-600 font-medium">Montant emprunté</span>
          <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
            {formatCurrency(loanAmount)}
          </span>
        </div>

        {LOAN_FIELDS.map((config) => (
          <StepperField
            key={config.field}
            config={config}
            value={get(config.field)}
            onChange={handleChange}
            onCommit={handleCommit}
            readOnly={!isOwner}
          />
        ))}

        {/* KPI bar */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-2.5 bg-tiili-surface rounded-lg text-center">
            <p className="text-base font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
              {formatCurrency(monthlyPayment)}
            </p>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Mensualité</p>
          </div>
          <div className="p-2.5 bg-tiili-surface rounded-lg text-center">
            <p className="text-base font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
              {formatCurrency(monthlyInsurance)}
            </p>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Assurance/mois</p>
          </div>
          <div className="p-2.5 bg-tiili-surface rounded-lg text-center">
            <p className="text-base font-extrabold text-amber-600 font-[family-name:var(--font-mono)]">
              {formatCurrency(totalLoanCost)}
            </p>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Coût crédit</p>
          </div>
        </div>
      </section>

      {/* Section 2: Frais d'acquisition */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Frais d&apos;acquisition</h3>

        {FEES_FIELDS.map((config) => {
          const value = get(config.field);
          const isNotary = config.field === "notary_fees";
          return (
            <div key={config.field}>
              <StepperField
                config={config}
                value={isNotary && value === 0 ? effectiveNotary : value}
                onChange={handleChange}
                onCommit={handleCommit}
                readOnly={!isOwner}
              />
              {isNotary && value === 0 && (
                <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">
                  Auto : {property.property_type === "neuf" ? "2,5" : "7,5"}% du prix
                </p>
              )}
            </div>
          );
        })}

        {/* Total project cost summary */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Coût total projet</span>
            <span className="text-sm font-bold text-amber-600 font-[family-name:var(--font-mono)]">
              {formatCurrency(totalProjectCost)}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Prix + Notaire + Dossier + Travaux{furnitureCost > 0 ? " + Mobilier" : ""}
          </p>
        </div>
      </section>

      {/* Section 3: Charges récurrentes */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Charges récurrentes</h3>

        {CHARGES_FIELDS.map((config) => (
          <div key={config.field}>
            <StepperField
              config={config}
              value={get(config.field)}
              onChange={handleChange}
              onCommit={handleCommit}
              readOnly={!isOwner}
            />
            {config.field === "gli_rate" && gliAnnualCost > 0 && (
              <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">
                {formatCurrency(gliAnnualCost)}/an
              </p>
            )}
            {config.field === "maintenance_per_m2" && property.surface > 0 && (
              <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">
                {formatCurrency(maintenanceAnnualCost)}/an · {property.surface} m²
              </p>
            )}
          </div>
        ))}
      </section>

      {isPending && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50">
          Enregistrement...
        </div>
      )}
      {saveError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          {saveError}
          <button onClick={() => setSaveError(null)} className="underline">OK</button>
        </div>
      )}
    </div>
  );
}
