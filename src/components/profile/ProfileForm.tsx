"use client";

import { useState, useRef, useEffect } from "react";
import { UserProfile } from "@/domains/auth/types";
import { DEFAULT_INPUTS, DEFAULT_SCORING_WEIGHTS, mergeDefaults } from "@/domains/auth/defaults";
import type { DefaultInputs, ScoringWeights } from "@/domains/auth/defaults";
import { AlertThresholds, DEFAULT_ALERT_THRESHOLDS } from "@/domains/auth/alert-types";
import { saveUserProfile } from "@/domains/auth/actions";
import BorrowingCapacity from "./BorrowingCapacity";
import AlertThresholdsForm from "./AlertThresholdsForm";

const inputClass =
  "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base min-h-[44px]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

interface Props {
  profile: UserProfile | null;
}

export default function ProfileForm({ profile }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  // Financial profile
  const [monthlyIncome, setMonthlyIncome] = useState(profile?.monthly_income ?? "");
  const [existingCredits, setExistingCredits] = useState(profile?.existing_credits ?? 0);
  const [savings, setSavings] = useState(profile?.savings ?? "");
  const [maxDebtRatio, setMaxDebtRatio] = useState(profile?.max_debt_ratio ?? 35);

  // Search preferences
  const [targetCities, setTargetCities] = useState(() => {
    try { return (JSON.parse(profile?.target_cities || "[]") as string[]).join(", "); }
    catch { return ""; }
  });
  const [minBudget, setMinBudget] = useState(profile?.min_budget ?? "");
  const [maxBudget, setMaxBudget] = useState(profile?.max_budget ?? "");

  // Default inputs
  const [defaults, setDefaults] = useState<DefaultInputs>(() =>
    mergeDefaults(DEFAULT_INPUTS, profile?.default_inputs || "{}")
  );

  // Scoring weights
  const [weights, setWeights] = useState<ScoringWeights>(() =>
    mergeDefaults(DEFAULT_SCORING_WEIGHTS, profile?.scoring_weights || "{}")
  );

  // Alert thresholds
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds>(() =>
    mergeDefaults(DEFAULT_ALERT_THRESHOLDS, profile?.alert_thresholds || "{}")
  );

  function updateDefault(key: keyof DefaultInputs, value: number) {
    setDefaults(prev => ({ ...prev, [key]: value }));
  }

  function updateWeight(key: keyof ScoringWeights, value: number) {
    setWeights(prev => ({ ...prev, [key]: value }));
  }

  function resetDefaults() {
    setDefaults({ ...DEFAULT_INPUTS });
    setWeights({ ...DEFAULT_SCORING_WEIGHTS });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const cities = targetCities.split(",").map(c => c.trim()).filter(Boolean);

    await saveUserProfile({
      monthly_income: monthlyIncome === "" ? null : Number(monthlyIncome),
      existing_credits: Number(existingCredits) || 0,
      savings: savings === "" ? null : Number(savings),
      max_debt_ratio: Number(maxDebtRatio) || 35,
      target_cities: JSON.stringify(cities),
      min_budget: minBudget === "" ? null : Number(minBudget),
      max_budget: maxBudget === "" ? null : Number(maxBudget),
      default_inputs: JSON.stringify(defaults),
      scoring_weights: JSON.stringify(weights),
      alert_thresholds: JSON.stringify(alertThresholds),
    });

    setSaving(false);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }

  const incomeNum = Number(monthlyIncome) || 0;

  return (
    <div className="space-y-6">
      {/* Section 1: Profil financier */}
      <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Profil financier</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Revenu net mensuel</label>
            <input
              type="number" inputMode="numeric" className={inputClass}
              placeholder="3 200" value={monthlyIncome}
              onChange={e => setMonthlyIncome(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Crédits existants (mensualités)</label>
            <input
              type="number" inputMode="numeric" className={inputClass}
              placeholder="0" value={existingCredits || ""}
              onChange={e => setExistingCredits(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Épargne disponible</label>
            <input
              type="number" inputMode="numeric" className={inputClass}
              placeholder="25 000" value={savings}
              onChange={e => setSavings(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Taux d&apos;endettement max (%)</label>
            <input
              type="number" inputMode="decimal" step="1" className={inputClass}
              value={maxDebtRatio}
              onChange={e => setMaxDebtRatio(Number(e.target.value) || 35)}
            />
          </div>
        </div>

        {incomeNum > 0 && (
          <BorrowingCapacity
            monthlyIncome={incomeNum}
            existingCredits={Number(existingCredits) || 0}
            maxDebtRatio={Number(maxDebtRatio) || 35}
            interestRate={defaults.interest_rate}
            loanDuration={defaults.loan_duration}
          />
        )}
      </section>

      {/* Section 2: Préférences de recherche */}
      <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Préférences de recherche</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Villes cibles (séparées par des virgules)</label>
            <input
              type="text" className={inputClass}
              placeholder="Lyon, Saint-Étienne, Clermont-Ferrand"
              value={targetCities}
              onChange={e => setTargetCities(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Budget minimum</label>
            <input
              type="number" inputMode="numeric" className={inputClass}
              placeholder="80 000" value={minBudget}
              onChange={e => setMinBudget(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Budget maximum</label>
            <input
              type="number" inputMode="numeric" className={inputClass}
              placeholder="150 000" value={maxBudget}
              onChange={e => setMaxBudget(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* Section 3: Inputs par défaut */}
      <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Valeurs par défaut</h2>
          <button
            type="button" onClick={resetDefaults}
            className="text-sm text-amber-600 hover:text-amber-800"
          >
            Réinitialiser
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Ces valeurs pré-remplissent les champs vides lors de l&apos;ajout d&apos;un bien.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { key: "loan_duration" as const, label: "Durée emprunt (années)", step: 1 },
            { key: "interest_rate" as const, label: "Taux d'intérêt (%)", step: 0.1 },
            { key: "insurance_rate" as const, label: "Assurance emprunteur (%)", step: 0.01 },
            { key: "personal_contribution_pct" as const, label: "Apport personnel (%)", step: 1 },
            { key: "loan_fees" as const, label: "Frais de dossier bancaire (€)", step: 100 },
          ]).map(({ key, label, step }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                type="number" inputMode="decimal" step={step} className={inputClass}
                value={defaults[key]}
                onChange={e => updateDefault(key, Number(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Pondération du score */}
      <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Pondération du score</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ajustez l&apos;importance de chaque critère dans le score d&apos;investissement (1 = normal, 2 = double, 0 = ignoré).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { key: "cashflow" as const, label: "Cash-flow mensuel" },
            { key: "net_yield" as const, label: "Rentabilité nette" },
            { key: "price_vs_market" as const, label: "Prix vs marché" },
          ]).map(({ key, label }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                type="number" inputMode="decimal" step="0.5" min="0" max="5"
                className={inputClass}
                value={weights[key]}
                onChange={e => updateWeight(key, Number(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Alertes seuils */}
      <AlertThresholdsForm
        thresholds={alertThresholds}
        onChange={setAlertThresholds}
      />

      {/* Save button */}
      <div className="flex justify-end gap-3">
        {saved && (
          <span className="self-center text-sm text-green-600 font-medium">
            Enregistré
          </span>
        )}
        <button
          type="button" onClick={handleSave} disabled={saving}
          className="px-8 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 min-h-[48px] text-base"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
