"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Property } from "@/domains/property/types";
import { Simulation, SimulationFormData } from "@/domains/simulation/types";
import { calculateSimulation, formatCurrency, formatPercent, calculateNotaryFees } from "@/lib/calculations";
import { updateSimulationAction } from "@/domains/simulation/actions";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import FiscalSection from "@/components/property/form/FiscalSection";

interface Props {
  property: Property;
  simulation: Simulation;
  onUpdated: () => void;
}

interface FieldConfig {
  field: keyof SimulationFormData;
  label: string;
  step: number;
  unit: string;
  decimals?: number;
}

const EDITABLE_FIELDS: FieldConfig[] = [
  { field: "personal_contribution", label: "Apport personnel", step: 1000, unit: "€" },
  { field: "loan_duration", label: "Durée du crédit", step: 1, unit: "ans" },
  { field: "interest_rate", label: "Taux d'intérêt", step: 0.05, unit: "%", decimals: 2 },
  { field: "monthly_rent", label: "Loyer mensuel", step: 10, unit: "€" },
  { field: "vacancy_rate", label: "Taux de vacance", step: 1, unit: "%" },
  { field: "renovation_cost", label: "Travaux", step: 1000, unit: "€" },
];

/** Compute loan_amount from property price, contribution, renovation, notary */
function computeLoanAmount(property: Property, form: SimulationFormData): number {
  const notary = form.notary_fees > 0
    ? form.notary_fees
    : calculateNotaryFees(property.purchase_price, property.property_type);
  return Math.max(0, property.purchase_price + notary + form.renovation_cost - form.personal_contribution);
}

function simFormFromSimulation(sim: Simulation): SimulationFormData {
  return {
    name: sim.name,
    loan_amount: sim.loan_amount,
    interest_rate: sim.interest_rate,
    loan_duration: sim.loan_duration,
    personal_contribution: sim.personal_contribution,
    insurance_rate: sim.insurance_rate,
    loan_fees: sim.loan_fees,
    notary_fees: sim.notary_fees,
    monthly_rent: sim.monthly_rent,
    condo_charges: sim.condo_charges,
    property_tax: sim.property_tax,
    vacancy_rate: sim.vacancy_rate,
    airbnb_price_per_night: sim.airbnb_price_per_night,
    airbnb_occupancy_rate: sim.airbnb_occupancy_rate,
    airbnb_charges: sim.airbnb_charges,
    renovation_cost: sim.renovation_cost,
    fiscal_regime: sim.fiscal_regime,
  };
}

function formatFieldValue(value: number, config: FieldConfig): string {
  if (config.decimals) return value.toFixed(config.decimals);
  if (config.unit === "€") return Math.round(value).toLocaleString("fr-FR");
  return String(value);
}

/** Stepper input: number field with -/+ buttons, saves on blur or Enter */
function StepperField({
  config,
  value,
  onChange,
  onCommit,
}: {
  config: FieldConfig;
  value: number;
  onChange: (field: keyof SimulationFormData, v: number) => void;
  onCommit: (field: keyof SimulationFormData, v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [textValue, setTextValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setTextValue(config.decimals ? value.toFixed(config.decimals) : String(value));
    setEditing(true);
  }

  function commitText() {
    const parsed = parseFloat(textValue.replace(/\s/g, "").replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(config.field, parsed);
      onCommit(config.field, parsed);
    }
    setEditing(false);
  }

  function step(dir: 1 | -1) {
    const next = Math.max(0, +(value + dir * config.step).toFixed(config.decimals ?? 0));
    onChange(config.field, next);
    onCommit(config.field, next);
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
      <label className="text-sm text-gray-600 font-medium">{config.label}</label>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => step(-1)}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors text-lg font-medium select-none"
          aria-label={`Diminuer ${config.label}`}
        >
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === "Enter") commitText(); }}
            className="w-24 text-center text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] bg-amber-50 border border-amber-300 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="min-w-[6rem] text-center text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {formatFieldValue(value, config)}{"\u202f"}{config.unit}
          </button>
        )}
        <button
          type="button"
          onClick={() => step(1)}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors text-lg font-medium select-none"
          aria-label={`Augmenter ${config.label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SimulationEditor({ property, simulation, onUpdated }: Props) {
  const [form, setForm] = useState<SimulationFormData>(() => simFormFromSimulation(simulation));
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(simulation.name);

  // Reset form when simulation changes (e.g. switching between simulations)
  useEffect(() => {
    setForm(simFormFromSimulation(simulation));
    setNameValue(simulation.name);
  }, [simulation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute calcs from current form state
  const currentLoan = computeLoanAmount(property, form);
  const calcs = calculateSimulation(property, {
    ...simulation,
    ...form,
    loan_amount: currentLoan,
  } as Simulation);

  // Save helper — always includes computed loan_amount
  const saveChanges = useCallback(async (data: Partial<SimulationFormData>) => {
    const updatedForm = { ...form, ...data };
    const loan = computeLoanAmount(property, updatedForm);
    const payload = { ...data, loan_amount: loan };
    setSaving(true);
    await updateSimulationAction(simulation.id, payload);
    setSaving(false);
    onUpdated();
  }, [simulation.id, onUpdated, form, property]);

  function handleChange(field: keyof SimulationFormData, value: number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleCommit(field: keyof SimulationFormData, value: number) {
    setForm(prev => ({ ...prev, [field]: value }));
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

      {/* Editable parameters */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Paramètres ajustables</h3>

        {/* Loan amount (read-only, computed) */}
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-600 font-medium">Montant emprunté</span>
          <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
            {formatCurrency(currentLoan)}
          </span>
        </div>

        {EDITABLE_FIELDS.map((config) => (
          <StepperField
            key={config.field}
            config={config}
            value={form[config.field] as number}
            onChange={handleChange}
            onCommit={handleCommit}
          />
        ))}
      </section>

      {/* Fixed property data (read-only in simulator) */}
      {(form.condo_charges > 0 || form.property_tax > 0) && (
        <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Données du bien (non modifiables)</h3>
          <p className="text-xs text-gray-400 mb-3">Ces valeurs proviennent de la fiche du bien et sont prises en compte dans le calcul.</p>
          <div className="space-y-0">
            {form.condo_charges > 0 && (
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-gray-500">Charges de copro</span>
                <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                  {formatCurrency(form.condo_charges)}/mois
                </span>
              </div>
            )}
            {form.property_tax > 0 && (
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-gray-500">Taxe foncière</span>
                <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                  {formatCurrency(form.property_tax)}/an
                </span>
              </div>
            )}
          </div>
        </section>
      )}

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
            <p className="font-semibold">{formatCurrency(currentLoan)}</p>
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
