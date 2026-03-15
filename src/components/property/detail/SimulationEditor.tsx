"use client";

import { useState, useEffect, useCallback } from "react";
import { Property, PropertyCalculations } from "@/domains/property/types";
import { Simulation, SimulationFormData } from "@/domains/simulation/types";
import { calculateSimulation, formatCurrency, formatPercent } from "@/lib/calculations";
import { updateSimulationAction } from "@/domains/simulation/actions";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import FiscalSection from "@/components/property/form/FiscalSection";

interface Props {
  property: Property;
  simulation: Simulation;
  onUpdated: () => void;
}

interface SliderConfig {
  field: keyof SimulationFormData;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  unit?: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { field: "personal_contribution", label: "Apport personnel", min: 0, max: 200000, step: 1000, format: (v) => formatCurrency(v) },
  { field: "loan_duration", label: "Durée du crédit", min: 5, max: 30, step: 1, format: (v) => `${v} ans` },
  { field: "interest_rate", label: "Taux d'intérêt", min: 0, max: 8, step: 0.05, format: (v) => `${v.toFixed(2)} %` },
  { field: "monthly_rent", label: "Loyer mensuel", min: 0, max: 5000, step: 10, format: (v) => formatCurrency(v) },
  { field: "vacancy_rate", label: "Taux de vacance", min: 0, max: 30, step: 1, format: (v) => `${v} %` },
  { field: "renovation_cost", label: "Travaux", min: 0, max: 200000, step: 1000, format: (v) => formatCurrency(v) },
];

export default function SimulationEditor({ property, simulation, onUpdated }: Props) {
  const [form, setForm] = useState<SimulationFormData>(() => ({
    name: simulation.name,
    loan_amount: simulation.loan_amount,
    interest_rate: simulation.interest_rate,
    loan_duration: simulation.loan_duration,
    personal_contribution: simulation.personal_contribution,
    insurance_rate: simulation.insurance_rate,
    loan_fees: simulation.loan_fees,
    notary_fees: simulation.notary_fees,
    monthly_rent: simulation.monthly_rent,
    condo_charges: simulation.condo_charges,
    property_tax: simulation.property_tax,
    vacancy_rate: simulation.vacancy_rate,
    airbnb_price_per_night: simulation.airbnb_price_per_night,
    airbnb_occupancy_rate: simulation.airbnb_occupancy_rate,
    airbnb_charges: simulation.airbnb_charges,
    renovation_cost: simulation.renovation_cost,
    fiscal_regime: simulation.fiscal_regime,
  }));

  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(simulation.name);

  // Reset form when simulation changes
  useEffect(() => {
    setForm({
      name: simulation.name,
      loan_amount: simulation.loan_amount,
      interest_rate: simulation.interest_rate,
      loan_duration: simulation.loan_duration,
      personal_contribution: simulation.personal_contribution,
      insurance_rate: simulation.insurance_rate,
      loan_fees: simulation.loan_fees,
      notary_fees: simulation.notary_fees,
      monthly_rent: simulation.monthly_rent,
      condo_charges: simulation.condo_charges,
      property_tax: simulation.property_tax,
      vacancy_rate: simulation.vacancy_rate,
      airbnb_price_per_night: simulation.airbnb_price_per_night,
      airbnb_occupancy_rate: simulation.airbnb_occupancy_rate,
      airbnb_charges: simulation.airbnb_charges,
      renovation_cost: simulation.renovation_cost,
      fiscal_regime: simulation.fiscal_regime,
    });
    setNameValue(simulation.name);
  }, [simulation]);

  // Auto-compute loan_amount when contribution changes
  useEffect(() => {
    const notary = form.notary_fees > 0 ? form.notary_fees : Math.round(property.purchase_price * (property.property_type === "ancien" ? 0.075 : 0.025));
    const newLoan = Math.max(0, property.purchase_price + notary + form.renovation_cost - form.personal_contribution);
    if (newLoan !== form.loan_amount) {
      setForm(prev => ({ ...prev, loan_amount: newLoan }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.personal_contribution, form.renovation_cost, property.purchase_price, property.property_type]);

  // Build a fake Property for calculations
  const fakeProperty: Property = {
    ...property,
    ...form,
    loan_amount: form.loan_amount,
  };
  const calcs = calculateSimulation(property, { ...simulation, ...form } as Simulation);

  // Debounced save
  const saveChanges = useCallback(async (data: Partial<SimulationFormData>) => {
    setSaving(true);
    await updateSimulationAction(simulation.id, data);
    setSaving(false);
    onUpdated();
  }, [simulation.id, onUpdated]);

  function handleSliderChange(field: keyof SimulationFormData, value: number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSliderCommit(field: keyof SimulationFormData, value: number) {
    saveChanges({ [field]: value });
  }

  function handleNameSave() {
    if (nameValue.trim() && nameValue !== simulation.name) {
      setForm(prev => ({ ...prev, name: nameValue.trim() }));
      saveChanges({ name: nameValue.trim() });
    }
    setEditingName(false);
  }

  function handleFiscalChange(regime: string) {
    setForm(prev => ({ ...prev, fiscal_regime: regime }));
    saveChanges({ fiscal_regime: regime });
  }

  return (
    <div className="space-y-4">
      {/* Simulation name */}
      <div className="flex items-center gap-2 mb-2">
        {editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); }}
            className="text-lg font-bold text-[#1a1a2e] bg-transparent border-b-2 border-amber-400 focus:outline-none px-0"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-lg font-bold text-[#1a1a2e] hover:text-amber-600 transition-colors flex items-center gap-1"
          >
            {form.name}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        {saving && (
          <span className="text-xs text-amber-500 animate-pulse">Sauvegarde...</span>
        )}
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] ${
            calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"
          }`}>
            {calcs.net_yield.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Renta nette</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] ${
            calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}&euro;
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Cash-flow /mois</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className="text-xl font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(calcs.monthly_payment)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Mensualité</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className="text-xl font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(calcs.total_loan_cost)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Coût crédit</p>
        </div>
      </div>

      {/* Sliders */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Paramètres ajustables</h3>
        {SLIDER_CONFIGS.map((config) => {
          const value = form[config.field] as number;
          // Dynamically extend max if current value exceeds default max
          const effectiveMax = Math.max(config.max, value * 1.5 || config.max);
          return (
            <div key={config.field}>
              <div className="flex justify-between items-baseline mb-1.5">
                <label className="text-sm text-gray-600 font-medium">{config.label}</label>
                <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                  {config.format(value)}
                </span>
              </div>
              <input
                type="range"
                min={config.min}
                max={effectiveMax}
                step={config.step}
                value={value}
                onChange={(e) => handleSliderChange(config.field, parseFloat(e.target.value))}
                onMouseUp={(e) => handleSliderCommit(config.field, parseFloat((e.target as HTMLInputElement).value))}
                onTouchEnd={(e) => handleSliderCommit(config.field, parseFloat((e.target as HTMLInputElement).value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>{config.format(config.min)}</span>
                <span>{config.format(effectiveMax)}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Fiscal regime selector */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Régime fiscal</h3>
        <div className="flex gap-2">
          {[
            { value: "micro_bic", label: "Micro-BIC" },
            { value: "lmnp_reel", label: "LMNP Réel" },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleFiscalChange(value)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                form.fiscal_regime === value
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Fiscal details */}
      <FiscalSection calcs={calcs} fiscalRegime={form.fiscal_regime || "micro_bic"} />

      {/* Detailed results */}
      <CollapsibleSection title="Détail des résultats" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Montant emprunté</span>
            <p className="font-semibold">{formatCurrency(form.loan_amount)}</p>
          </div>
          <div>
            <span className="text-gray-500">Mensualité crédit</span>
            <p className="font-semibold">{formatCurrency(calcs.monthly_payment)}</p>
          </div>
          <div>
            <span className="text-gray-500">Assurance / mois</span>
            <p className="font-semibold">{formatCurrency(calcs.monthly_insurance)}</p>
          </div>
          <div>
            <span className="text-gray-500">Frais de notaire</span>
            <p className="font-semibold">{formatCurrency(calcs.total_notary_fees)}</p>
          </div>
          <div>
            <span className="text-gray-500">Coût total projet</span>
            <p className="font-semibold text-amber-600">{formatCurrency(calcs.total_project_cost)}</p>
          </div>
          <div>
            <span className="text-gray-500">Rentabilité brute</span>
            <p className="font-semibold">{formatPercent(calcs.gross_yield)}</p>
          </div>
          <div>
            <span className="text-gray-500">Rentabilité nette</span>
            <p className="font-semibold">{formatPercent(calcs.net_yield)}</p>
          </div>
          <div>
            <span className="text-gray-500">Rentabilité net-net</span>
            <p className="font-semibold">{formatPercent(calcs.net_net_yield)}</p>
          </div>
          <div>
            <span className="text-gray-500">Charges annuelles</span>
            <p className="font-semibold">{formatCurrency(calcs.annual_charges)}</p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
