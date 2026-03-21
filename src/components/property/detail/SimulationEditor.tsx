"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Property } from "@/domains/property/types";
import { Simulation, SimulationFormData } from "@/domains/simulation/types";
import { calculateSimulation, calculateExitSimulation, formatCurrency, formatPercent, calculateNotaryFees, getEffectiveRent } from "@/lib/calculations";
import { updateSimulationAction } from "@/domains/simulation/actions";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import StepperField, { formatStepperValue, type StepperFieldConfig } from "@/components/ui/StepperField";
import FiscalSection from "@/components/property/form/FiscalSection";
import ExitSimulationPanel from "./ExitSimulationPanel";

interface Props {
  property: Property;
  simulation: Simulation;
  onUpdated: () => void;
  /** Emit the live merged simulation on every local change (for parent to update cards) */
  onLiveChange?: (sim: Simulation) => void;
  readOnly?: boolean;
  onCashflowClick?: () => void;
}

type FieldConfig = StepperFieldConfig & { field: keyof SimulationFormData };

const EDITABLE_FIELDS: FieldConfig[] = [
  { field: "personal_contribution", label: "Apport personnel", step: 1000, unit: "€" },
  { field: "loan_duration", label: "Durée du crédit", step: 1, unit: "ans" },
  { field: "interest_rate", label: "Taux d'intérêt", step: 0.05, unit: "%", decimals: 2 },
  { field: "monthly_rent", label: "Loyer mensuel", step: 10, unit: "€" },
  { field: "vacancy_rate", label: "Taux de vacance", step: 1, unit: "%" },
  { field: "renovation_cost", label: "Travaux", step: 1000, unit: "€" },
  { field: "maintenance_per_m2", label: "Entretien / m² / an", step: 1, unit: "€" },
  { field: "pno_insurance", label: "Assurance PNO", step: 10, unit: "€/an" },
  { field: "gli_rate", label: "GLI (loyers impayés)", step: 0.5, unit: "%", decimals: 1 },
];

/** Fields that come from property data (shown as read-only in Défaut sim, editable in manual sims) */
const PROPERTY_CHARGE_FIELDS: (keyof SimulationFormData)[] = ["pno_insurance", "gli_rate", "maintenance_per_m2"];

/** Compute loan_amount from property price, contribution, renovation, notary.
 *  loan_fees is a separate cost (included in total_project_cost but NOT in the loan itself).
 */
function computeLoanAmount(property: Property, form: SimulationFormData): number {
  const notary = form.notary_fees > 0
    ? form.notary_fees
    : calculateNotaryFees(property.purchase_price, property.property_type);
  const furnitureCost = property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0;
  return Math.max(0, property.purchase_price + notary + form.renovation_cost + furnitureCost - form.personal_contribution);
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
    maintenance_per_m2: sim.maintenance_per_m2,
    pno_insurance: sim.pno_insurance,
    gli_rate: sim.gli_rate,
    holding_duration: sim.holding_duration,
    annual_appreciation: sim.annual_appreciation,
  };
}


export default function SimulationEditor({ property, simulation, onUpdated, onLiveChange, readOnly = false, onCashflowClick }: Props) {
  const [form, setForm] = useState<SimulationFormData>(() => simFormFromSimulation(simulation));
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(simulation.name);

  // Reset form when simulation changes (e.g. switching between simulations)
  useEffect(() => {
    setForm(simFormFromSimulation(simulation));
    setNameValue(simulation.name);
  }, [simulation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute calcs from current form state (memoized for performance)
  const currentLoan = useMemo(() => computeLoanAmount(property, form), [property, form]);
  const mergedSim = useMemo(() => ({ ...simulation, ...form, loan_amount: currentLoan }) as Simulation, [simulation, form, currentLoan]);
  const calcs = useMemo(() => calculateSimulation(property, mergedSim), [property, mergedSim]);
  const exitSim = useMemo(() => calculateExitSimulation(property, mergedSim, calcs), [property, mergedSim, calcs]);
  const effectiveRent = useMemo(() => getEffectiveRent(property, mergedSim), [property, mergedSim]);

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

  function emitLive(updatedForm: SimulationFormData) {
    if (onLiveChange) {
      const loan = computeLoanAmount(property, updatedForm);
      onLiveChange({ ...simulation, ...updatedForm, loan_amount: loan } as Simulation);
    }
  }

  function handleChange(field: string, value: number) {
    const key = field as keyof SimulationFormData;
    setForm(prev => {
      const next = { ...prev, [key]: value };
      emitLive(next);
      return next;
    });
  }

  function handleCommit(field: string, value: number) {
    const key = field as keyof SimulationFormData;
    setForm(prev => {
      const next = { ...prev, [key]: value };
      emitLive(next);
      return next;
    });
    saveChanges({ [key]: value });
  }

  function handleNameSave() {
    if (nameValue.trim() && nameValue !== simulation.name) {
      const next = { ...form, name: nameValue.trim() };
      setForm(next);
      emitLive(next);
      saveChanges({ name: nameValue.trim() });
    }
    setEditingName(false);
  }

  function handleFiscalChange(regime: string) {
    const next = { ...form, fiscal_regime: regime };
    setForm(next);
    emitLive(next);
    saveChanges({ fiscal_regime: regime });
  }

  return (
    <div className="space-y-4">
      {/* Simulation name */}
      <div className="flex items-center gap-2 mb-2">
        {!readOnly && editingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); }}
            className="text-lg font-bold text-[#1a1a2e] bg-transparent border-b-2 border-amber-400 focus:outline-none px-0"
            autoFocus
          />
        ) : readOnly ? (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span className="text-lg font-bold text-[#1a1a2e]">{form.name}</span>
          </div>
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
      {readOnly && (
        <p className="text-xs text-gray-500 -mt-2 mb-2">
          Calculée automatiquement à partir des données du bien et de la localité. Non modifiable.
        </p>
      )}

      {/* Live KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className="text-xl font-extrabold text-gray-600 font-[family-name:var(--font-mono)]">
            {calcs.gross_yield.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Renta brute</p>
        </div>
        <div className="p-3 bg-tiili-surface rounded-xl text-center">
          <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] ${
            calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"
          }`}>
            {calcs.net_yield.toFixed(2)}%
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Renta nette</p>
        </div>
        <button onClick={onCashflowClick} className="p-3 bg-tiili-surface rounded-xl text-center cursor-pointer hover:bg-gray-100 transition-colors">
          <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] underline decoration-dotted underline-offset-2 ${
            calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}&euro;
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Cash-flow /mois</p>
        </button>
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

      {/* Parameters */}
      <section className={`bg-white rounded-xl border border-tiili-border p-4 md:p-6 ${readOnly ? "opacity-80" : ""}`}>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
          {readOnly ? "Paramètres" : "Paramètres ajustables"}
        </h3>

        {/* Loan amount (read-only, computed) */}
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-sm text-gray-600 font-medium">Montant emprunté</span>
          <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
            {formatCurrency(currentLoan)}
          </span>
        </div>

        {EDITABLE_FIELDS.map((config) => {
          // For Défaut sim: PNO/GLI/maintenance are shown in "Données du bien" section, skip here
          if (readOnly && PROPERTY_CHARGE_FIELDS.includes(config.field)) return null;

          // For monthly_rent: show effective value (property fallback when 0)
          const displayValue = config.field === "monthly_rent" && (form.monthly_rent === 0 || form.monthly_rent == null)
            ? property.monthly_rent
            : form[config.field] as number;
          const isRentFallback = config.field === "monthly_rent" && (form.monthly_rent === 0 || form.monthly_rent == null);

          if (readOnly) {
            return (
              <div key={config.field} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-gray-600 font-medium">{config.label}</span>
                <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
                  {formatStepperValue(displayValue, config)}{"\u202f"}{config.unit}
                </span>
              </div>
            );
          }

          return (
            <div key={config.field}>
              <StepperField
                config={config}
                value={displayValue}
                onChange={handleChange}
                onCommit={handleCommit}
              />
              {isRentFallback && (
                <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">Valeur du bien · modifiable</p>
              )}
              {config.field === "maintenance_per_m2" && property.surface > 0 && (
                <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">
                  {formatCurrency((form.maintenance_per_m2 as number) * property.surface)}/an · {property.surface} m²
                </p>
              )}
              {config.field === "gli_rate" && (form.gli_rate as number) > 0 && effectiveRent > 0 && (
                <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">
                  {formatCurrency(effectiveRent * 12 * (form.gli_rate as number) / 100)}/an
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Fixed property data (read-only in simulator) */}
      {(property.condo_charges > 0 || property.property_tax > 0 || readOnly) && (
        <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Données du bien (non modifiables)</h3>
          <p className="text-xs text-gray-400 mb-3">Ces valeurs proviennent de la fiche du bien et sont prises en compte dans le calcul.</p>
          <div className="space-y-0">
            {property.condo_charges > 0 && (
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-gray-500">Charges de copro</span>
                <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                  {formatCurrency(property.condo_charges)}/an
                </span>
              </div>
            )}
            {property.property_tax > 0 && (
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-gray-500">Taxe foncière</span>
                <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                  {formatCurrency(property.property_tax)}/an
                </span>
              </div>
            )}
            {readOnly && (
              <>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                  <span className="text-sm text-gray-500">Assurance PNO</span>
                  <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                    {formatCurrency(property.pno_insurance)}/an
                  </span>
                </div>
                {property.gli_rate > 0 && (
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                    <span className="text-sm text-gray-500">GLI</span>
                    <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                      {property.gli_rate.toFixed(1)}{"\u202f"}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                  <span className="text-sm text-gray-500">Entretien / m² / an</span>
                  <span className="text-sm font-medium text-gray-700 font-[family-name:var(--font-mono)]">
                    {property.maintenance_per_m2}{"\u202f"}€
                  </span>
                </div>
              </>
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
              onClick={readOnly ? undefined : () => handleFiscalChange(value)}
              disabled={readOnly}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                form.fiscal_regime === value
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              } ${readOnly ? "cursor-default" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Fiscal details */}
      <FiscalSection calcs={calcs} fiscalRegime={form.fiscal_regime || "micro_bic"} />

      {/* Exit simulation — Bilan de l'opération */}
      <section className={`bg-white rounded-xl border border-tiili-border p-4 md:p-6 ${readOnly ? "opacity-80" : ""}`}>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Hypothèses de revente</h3>
        {readOnly ? (
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-600 font-medium">Durée de détention</span>
              <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
                {exitSim.holdingDuration}{"\u202f"}ans
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600 font-medium">Appréciation annuelle</span>
              <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)] py-1 px-2">
                {(form.annual_appreciation as number).toFixed(1)}{"\u202f"}%
              </span>
            </div>
          </div>
        ) : (
          <>
            <StepperField
              config={{ field: "holding_duration", label: "Durée de détention", step: 1, unit: "ans" }}
              value={exitSim.holdingDuration}
              onChange={(_, v) => handleChange("holding_duration", v)}
              onCommit={(_, v) => handleCommit("holding_duration", v)}
            />
            <StepperField
              config={{ field: "annual_appreciation", label: "Appréciation annuelle", step: 0.5, unit: "%", decimals: 1, min: -5 }}
              value={form.annual_appreciation as number}
              onChange={(_, v) => handleChange("annual_appreciation", v)}
              onCommit={(_, v) => handleCommit("annual_appreciation", v)}
            />
            {(form as SimulationFormData & { holding_duration: number }).holding_duration === 0 && (
              <p className="text-[10px] text-gray-400 text-right -mt-1 mb-1 pr-2">Par défaut : durée du crédit ({form.loan_duration} ans)</p>
            )}
          </>
        )}
      </section>

      <ExitSimulationPanel exitSim={exitSim} />

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
