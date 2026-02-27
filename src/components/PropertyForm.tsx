"use client";

import { useState, useEffect } from "react";
import { Property } from "@/types/property";
import {
  calculateNotaryFees,
  calculateMonthlyPayment,
  calculateAll,
  formatCurrency,
  formatPercent,
} from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type PropertyFormData = Omit<Property, "id" | "user_id" | "created_at" | "updated_at">;

const defaultFormData: PropertyFormData = {
  address: "",
  city: "",
  purchase_price: 0,
  surface: 0,
  property_type: "ancien",
  description: "",
  loan_amount: 0,
  interest_rate: 3.5,
  loan_duration: 20,
  personal_contribution: 0,
  insurance_rate: 0.34,
  loan_fees: 0,
  notary_fees: 0,
  monthly_rent: 0,
  condo_charges: 0,
  property_tax: 0,
  vacancy_rate: 5,
  airbnb_price_per_night: 0,
  airbnb_occupancy_rate: 60,
  airbnb_charges: 0,
};

interface Props {
  existingProperty?: Property;
}

export default function PropertyForm({ existingProperty }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<PropertyFormData>(() => {
    if (existingProperty) {
      const { id, user_id, created_at, updated_at, ...rest } = existingProperty;
      void id; void user_id; void created_at; void updated_at;
      return rest;
    }
    return defaultFormData;
  });

  // Auto-calculate notary fees when price or type changes
  useEffect(() => {
    if (form.purchase_price > 0 && form.notary_fees === 0) {
      // Don't auto-update if user has manually set notary fees
    }
  }, [form.purchase_price, form.property_type, form.notary_fees]);

  // Auto-set loan amount to purchase_price + notary fees - apport
  useEffect(() => {
    if (form.purchase_price > 0 && form.loan_amount === 0) {
      const notary = calculateNotaryFees(form.purchase_price, form.property_type);
      setForm((prev) => ({
        ...prev,
        loan_amount: form.purchase_price + notary - form.personal_contribution,
      }));
    }
  }, [form.purchase_price, form.property_type, form.personal_contribution, form.loan_amount]);

  function updateField(field: keyof PropertyFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNumberChange(field: keyof PropertyFormData, value: string) {
    const num = value === "" ? 0 : parseFloat(value);
    updateField(field, isNaN(num) ? 0 : num);
  }

  // Build a full Property object for calculations
  const fakeProperty: Property = {
    id: "",
    user_id: "",
    created_at: "",
    updated_at: "",
    ...form,
  };

  const calcs = calculateAll(fakeProperty);
  const autoNotary = calculateNotaryFees(form.purchase_price, form.property_type);
  const monthlyPaymentPreview = calculateMonthlyPayment(
    form.loan_amount,
    form.interest_rate,
    form.loan_duration
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Vous devez être connecté");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      user_id: user.id,
      notary_fees: form.notary_fees > 0 ? form.notary_fees : autoNotary,
    };

    let result;
    if (existingProperty) {
      result = await supabase
        .from("properties")
        .update(payload)
        .eq("id", existingProperty.id);
    } else {
      result = await supabase.from("properties").insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Infos du bien */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Informations du bien</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className={inputClass}
              placeholder="12 rue de la Paix"
            />
          </div>
          <div>
            <label className={labelClass}>Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              required
              className={inputClass}
              placeholder="Paris"
            />
          </div>
          <div>
            <label className={labelClass}>Prix d&apos;achat</label>
            <input
              type="number"
              value={form.purchase_price || ""}
              onChange={(e) => handleNumberChange("purchase_price", e.target.value)}
              required
              className={inputClass}
              placeholder="200000"
            />
          </div>
          <div>
            <label className={labelClass}>Surface (m²)</label>
            <input
              type="number"
              value={form.surface || ""}
              onChange={(e) => handleNumberChange("surface", e.target.value)}
              required
              className={inputClass}
              placeholder="45"
            />
          </div>
          <div>
            <label className={labelClass}>Type de bien</label>
            <select
              value={form.property_type}
              onChange={(e) =>
                updateField("property_type", e.target.value as "ancien" | "neuf")
              }
              className={inputClass}
            >
              <option value="ancien">Ancien (~7.5% frais notaire)</option>
              <option value="neuf">Neuf (~2.5% frais notaire)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Prix au m² :{" "}
              {form.surface > 0
                ? formatCurrency(form.purchase_price / form.surface)
                : "—"}
            </label>
            <input disabled className={inputClass + " bg-gray-50"} value="Calculé automatiquement" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Description / Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="Notes libres sur le bien..."
            />
          </div>
        </div>
      </section>

      {/* Prêt */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Prêt immobilier</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Apport personnel</label>
            <input
              type="number"
              value={form.personal_contribution || ""}
              onChange={(e) => handleNumberChange("personal_contribution", e.target.value)}
              className={inputClass}
              placeholder="10000"
            />
          </div>
          <div>
            <label className={labelClass}>Montant emprunté</label>
            <input
              type="number"
              value={form.loan_amount || ""}
              onChange={(e) => handleNumberChange("loan_amount", e.target.value)}
              required
              className={inputClass}
              placeholder="190000"
            />
          </div>
          <div>
            <label className={labelClass}>Taux d&apos;intérêt (%)</label>
            <input
              type="number"
              step="0.01"
              value={form.interest_rate || ""}
              onChange={(e) => handleNumberChange("interest_rate", e.target.value)}
              required
              className={inputClass}
              placeholder="3.5"
            />
          </div>
          <div>
            <label className={labelClass}>Durée (années)</label>
            <input
              type="number"
              value={form.loan_duration || ""}
              onChange={(e) => handleNumberChange("loan_duration", e.target.value)}
              required
              className={inputClass}
              placeholder="20"
            />
          </div>
          <div>
            <label className={labelClass}>Assurance emprunteur (% /an)</label>
            <input
              type="number"
              step="0.01"
              value={form.insurance_rate || ""}
              onChange={(e) => handleNumberChange("insurance_rate", e.target.value)}
              className={inputClass}
              placeholder="0.34"
            />
          </div>
          <div>
            <label className={labelClass}>Frais de dossier</label>
            <input
              type="number"
              value={form.loan_fees || ""}
              onChange={(e) => handleNumberChange("loan_fees", e.target.value)}
              className={inputClass}
              placeholder="1000"
            />
          </div>
        </div>
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-700">
            Mensualité crédit :{" "}
            <span className="font-bold">{formatCurrency(monthlyPaymentPreview)}</span>
            {" | "}
            Assurance : <span className="font-bold">{formatCurrency(calcs.monthly_insurance)}</span>/mois
            {" | "}
            Total mensuel :{" "}
            <span className="font-bold">
              {formatCurrency(monthlyPaymentPreview + calcs.monthly_insurance)}
            </span>
          </p>
        </div>
      </section>

      {/* Frais de notaire */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Frais de notaire</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Frais de notaire estimés : {formatCurrency(autoNotary)}
            </label>
            <input
              type="number"
              value={form.notary_fees || ""}
              onChange={(e) => handleNumberChange("notary_fees", e.target.value)}
              className={inputClass}
              placeholder={`Auto: ${autoNotary}`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Laissez vide pour le calcul automatique (
              {form.property_type === "ancien" ? "7.5%" : "2.5%"} du prix)
            </p>
          </div>
          <div>
            <label className={labelClass}>Coût total du projet</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold">
              {formatCurrency(
                form.purchase_price +
                  (form.notary_fees > 0 ? form.notary_fees : autoNotary) +
                  form.loan_fees
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Location classique */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Location classique</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Loyer mensuel estimé</label>
            <input
              type="number"
              value={form.monthly_rent || ""}
              onChange={(e) => handleNumberChange("monthly_rent", e.target.value)}
              className={inputClass}
              placeholder="800"
            />
          </div>
          <div>
            <label className={labelClass}>Charges copro / mois</label>
            <input
              type="number"
              value={form.condo_charges || ""}
              onChange={(e) => handleNumberChange("condo_charges", e.target.value)}
              className={inputClass}
              placeholder="100"
            />
          </div>
          <div>
            <label className={labelClass}>Taxe foncière / an</label>
            <input
              type="number"
              value={form.property_tax || ""}
              onChange={(e) => handleNumberChange("property_tax", e.target.value)}
              className={inputClass}
              placeholder="800"
            />
          </div>
          <div>
            <label className={labelClass}>Vacance locative (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.vacancy_rate || ""}
              onChange={(e) => handleNumberChange("vacancy_rate", e.target.value)}
              className={inputClass}
              placeholder="5"
            />
          </div>
        </div>
      </section>

      {/* Airbnb */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Airbnb / Location courte durée</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Prix par nuit</label>
            <input
              type="number"
              value={form.airbnb_price_per_night || ""}
              onChange={(e) => handleNumberChange("airbnb_price_per_night", e.target.value)}
              className={inputClass}
              placeholder="80"
            />
          </div>
          <div>
            <label className={labelClass}>Taux d&apos;occupation (%)</label>
            <input
              type="number"
              step="0.1"
              value={form.airbnb_occupancy_rate || ""}
              onChange={(e) => handleNumberChange("airbnb_occupancy_rate", e.target.value)}
              className={inputClass}
              placeholder="60"
            />
          </div>
          <div>
            <label className={labelClass}>Charges mensuelles Airbnb</label>
            <input
              type="number"
              value={form.airbnb_charges || ""}
              onChange={(e) => handleNumberChange("airbnb_charges", e.target.value)}
              className={inputClass}
              placeholder="200"
            />
          </div>
        </div>
      </section>

      {/* Résultats en temps réel */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Résultats estimés</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location classique */}
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-medium mb-3 text-indigo-100">Location classique</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Rentabilité brute</span>
                <span className="font-bold">{formatPercent(calcs.gross_yield)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rentabilité nette</span>
                <span className="font-bold">{formatPercent(calcs.net_yield)}</span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-2">
                <span>Cash-flow mensuel</span>
                <span
                  className={`font-bold text-lg ${
                    calcs.monthly_cashflow >= 0 ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {formatCurrency(calcs.monthly_cashflow)}
                </span>
              </div>
            </div>
          </div>

          {/* Airbnb */}
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-medium mb-3 text-indigo-100">Airbnb</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Rentabilité brute</span>
                <span className="font-bold">{formatPercent(calcs.airbnb_gross_yield)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rentabilité nette</span>
                <span className="font-bold">{formatPercent(calcs.airbnb_net_yield)}</span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-2">
                <span>Cash-flow mensuel</span>
                <span
                  className={`font-bold text-lg ${
                    calcs.airbnb_monthly_cashflow >= 0 ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {formatCurrency(calcs.airbnb_monthly_cashflow)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving
            ? "Sauvegarde..."
            : existingProperty
            ? "Mettre à jour"
            : "Sauvegarder le bien"}
        </button>
      </div>
    </form>
  );
}
