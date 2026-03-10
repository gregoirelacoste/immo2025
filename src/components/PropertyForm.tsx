"use client";

import { useState, useEffect, useRef } from "react";
import { Property } from "@/types/property";
import {
  calculateNotaryFees,
  calculateMonthlyPayment,
  calculateAll,
  formatCurrency,
  formatPercent,
} from "@/lib/calculations";
import { saveProperty, scrapeAndSaveProperty } from "@/lib/actions";
import { useRouter, useSearchParams } from "next/navigation";

type PropertyFormData = Omit<Property, "id" | "created_at" | "updated_at">;

const defaultFormData: PropertyFormData = {
  address: "",
  city: "",
  postal_code: "",
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
  source_url: "",
  image_urls: "[]",
  prefill_sources: "{}",
};

interface Props {
  existingProperty?: Property;
}

export default function PropertyForm({ existingProperty }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const autoScrapeTriggered = useRef(false);

  // Scraping state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<
    | { type: "idle" }
    | { type: "error"; message: string }
  >({ type: "idle" });

  const [form, setForm] = useState<PropertyFormData>(() => {
    if (existingProperty) {
      const { id, created_at, updated_at, ...rest } = existingProperty;
      void id; void created_at; void updated_at;
      return rest;
    }
    return defaultFormData;
  });

  // Auto-recalcule loan_amount quand les paramètres changent
  // (sauf si l'utilisateur l'a modifié manuellement)
  const [loanManuallySet, setLoanManuallySet] = useState(
    () => !!existingProperty && existingProperty.loan_amount > 0
  );

  // Frais de notaire effectifs (override ou auto)
  const effectiveNotary =
    form.notary_fees > 0
      ? form.notary_fees
      : calculateNotaryFees(form.purchase_price, form.property_type);

  useEffect(() => {
    if (form.purchase_price > 0 && !loanManuallySet) {
      const notary =
        form.notary_fees > 0
          ? form.notary_fees
          : calculateNotaryFees(form.purchase_price, form.property_type);
      const autoLoan = Math.max(
        0,
        form.purchase_price + notary + form.loan_fees - form.personal_contribution
      );
      setForm((prev) => ({
        ...prev,
        loan_amount: autoLoan,
      }));
    }
  }, [
    form.purchase_price,
    form.property_type,
    form.personal_contribution,
    form.notary_fees,
    form.loan_fees,
    loanManuallySet,
  ]);

  function updateField(field: keyof PropertyFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNumberChange(field: keyof PropertyFormData, value: string) {
    const num = value === "" ? 0 : parseFloat(value);
    if (field === "loan_amount") {
      setLoanManuallySet(true);
    }
    updateField(field, isNaN(num) ? 0 : num);
  }

  async function doScrapeAndSave(url: string) {
    setScraping(true);
    setScrapeStatus({ type: "idle" });
    setError("");

    try {
      const { propertyId, error, warning } = await scrapeAndSaveProperty(url);

      if (propertyId) {
        // Sauvegardé automatiquement → redirection hard vers la fiche
        window.location.href = `/property/${propertyId}`;
        return;
      }

      // Échec → afficher l'erreur, l'utilisateur peut saisir manuellement
      setScraping(false);
      setScrapeStatus({
        type: "error",
        message: (warning || error || "Impossible d'extraire les données.") +
          " Saisissez-les manuellement ci-dessous.",
      });
      setForm((prev) => ({ ...prev, source_url: url }));
    } catch {
      setScraping(false);
      setScrapeStatus({
        type: "error",
        message: "Erreur inattendue. Saisissez les données manuellement.",
      });
    }
  }

  function handleScrape() {
    if (!scrapeUrl.trim()) return;
    doScrapeAndSave(scrapeUrl.trim());
  }

  // Auto-scrape quand une URL est passée en query param (partage PWA)
  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam && !existingProperty && !autoScrapeTriggered.current) {
      autoScrapeTriggered.current = true;
      setScrapeUrl(urlParam);
      doScrapeAndSave(urlParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fakeProperty: Property = {
    id: "",
    created_at: "",
    updated_at: "",
    ...form,
  };

  const calcs = calculateAll(fakeProperty);
  const monthlyPaymentPreview = calculateMonthlyPayment(
    form.loan_amount,
    form.interest_rate,
    form.loan_duration
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const result = await saveProperty(form, existingProperty?.id);

    if (!result.success) {
      setError(result.error || "Erreur lors de la sauvegarde");
      setSaving(false);
    } else {
      router.push("/dashboard");
    }
  }

  // Parse prefill sources pour afficher les hints
  const prefillSources: Record<string, { source: string; value: number | string }> = (() => {
    try { return JSON.parse(form.prefill_sources || "{}"); }
    catch { return {}; }
  })();

  function prefillHint(field: string) {
    const info = prefillSources[field];
    if (!info) return null;
    return (
      <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
        {info.source}
      </p>
    );
  }

  const inputClass =
    "w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base min-h-[44px]";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  function numInput(
    field: keyof PropertyFormData,
    label: string,
    placeholder: string,
    opts?: { step?: string; required?: boolean; decimal?: boolean }
  ) {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <input
          type="number"
          inputMode={opts?.decimal ? "decimal" : "numeric"}
          step={opts?.step}
          value={(form[field] as number) || ""}
          onChange={(e) => handleNumberChange(field, e.target.value)}
          required={opts?.required}
          className={inputClass}
          placeholder={placeholder}
        />
        {prefillHint(field)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-safe">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Import depuis une annonce */}
      {!existingProperty && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-2">Importer depuis une annonce</h2>
          <p className="text-sm text-gray-500 mb-4">
            Collez le lien d&apos;une annonce (LeBonCoin, SeLoger, PAP, Bien&apos;ici...) — le bien sera import&eacute; et sauvegard&eacute; automatiquement.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              placeholder="https://www.leboncoin.fr/ad/ventes_immobilieres/..."
              className={inputClass + " flex-1"}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScrape();
                }
              }}
            />
            <button
              type="button"
              onClick={handleScrape}
              disabled={scraping || !scrapeUrl.trim()}
              className="px-5 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px] min-w-[100px] shrink-0"
            >
              {scraping ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Import...
                </span>
              ) : (
                "Importer"
              )}
            </button>
          </div>

          {/* Statut du scraping */}
          {scrapeStatus.type === "error" && (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
              {scrapeStatus.message}
            </div>
          )}
        </section>
      )}

      {/* Infos du bien */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
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
            {prefillHint("address")}
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
            {prefillHint("city")}
          </div>
          {numInput("purchase_price", "Prix d'achat", "200000", { required: true })}
          {numInput("surface", "Surface (m²)", "45", { required: true })}
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
              className={inputClass + " min-h-[80px]"}
              rows={2}
              placeholder="Notes libres sur le bien..."
            />
          </div>
        </div>
      </section>

      {/* Prêt */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Prêt immobilier</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {numInput("personal_contribution", "Apport personnel", "10000")}
          {numInput("loan_amount", "Montant emprunté", "190000", { required: true })}
          {numInput("interest_rate", "Taux d'intérêt (%)", "3.5", { step: "0.01", required: true, decimal: true })}
          {numInput("loan_duration", "Durée (années)", "20", { required: true })}
          {numInput("insurance_rate", "Assurance emprunteur (% /an)", "0.34", { step: "0.01", decimal: true })}
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

      {/* Frais & coût total */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Frais & coût total</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Frais de notaire ({form.property_type === "ancien" ? "7.5%" : "2.5%"})
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={form.notary_fees || ""}
              onChange={(e) => handleNumberChange("notary_fees", e.target.value)}
              className={inputClass}
              placeholder={`Auto : ${effectiveNotary} €`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Vide = calcul auto. Estimé : {formatCurrency(effectiveNotary)}
            </p>
          </div>
          {numInput("loan_fees", "Frais de dossier bancaire", "1000")}
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
              <p className="font-bold text-indigo-700">{formatCurrency(calcs.total_project_cost)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location classique */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Location classique</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {numInput("monthly_rent", "Loyer mensuel estimé", "800")}
          {numInput("condo_charges", "Charges copro / mois", "100")}
          {numInput("property_tax", "Taxe foncière / an", "800")}
          {numInput("vacancy_rate", "Vacance locative (%)", "5", { step: "0.1", decimal: true })}
        </div>
        {form.monthly_rent > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <span className="text-blue-500 text-xs">Rendement brut</span>
                <p className="font-bold text-blue-700">{formatPercent(calcs.gross_yield)}</p>
              </div>
              <div>
                <span className="text-blue-500 text-xs">Rendement net</span>
                <p className="font-bold text-blue-700">{formatPercent(calcs.net_yield)}</p>
              </div>
              <div>
                <span className="text-blue-500 text-xs">Revenus nets / an</span>
                <p className="font-bold">{formatCurrency(calcs.annual_rent_income)}</p>
              </div>
              <div>
                <span className="text-blue-500 text-xs">Cash-flow / mois</span>
                <p className={`font-bold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(calcs.monthly_cashflow)}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Airbnb */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Airbnb / Location courte durée</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {numInput("airbnb_price_per_night", "Prix par nuit", "80")}
          {numInput("airbnb_occupancy_rate", "Taux d'occupation (%)", "60", { step: "0.1", decimal: true })}
          {numInput("airbnb_charges", "Charges mensuelles Airbnb", "200")}
        </div>
        {form.airbnb_price_per_night > 0 && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg">
            <div className="text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <span className="text-orange-500 text-xs">Rendement brut</span>
                <p className="font-bold text-orange-700">{formatPercent(calcs.airbnb_gross_yield)}</p>
              </div>
              <div>
                <span className="text-orange-500 text-xs">Rendement net</span>
                <p className="font-bold text-orange-700">{formatPercent(calcs.airbnb_net_yield)}</p>
              </div>
              <div>
                <span className="text-orange-500 text-xs">Revenus / an</span>
                <p className="font-bold">{formatCurrency(calcs.airbnb_annual_income)}</p>
              </div>
              <div>
                <span className="text-orange-500 text-xs">Cash-flow / mois</span>
                <p className={`font-bold ${calcs.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(calcs.airbnb_monthly_cashflow)}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Résultats en temps réel */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Résultats estimés</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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

      {/* Source URL display */}
      {form.source_url && (
        <div className="text-xs text-gray-400 text-center">
          Source : <a href={form.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{form.source_url}</a>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 min-h-[48px] text-base font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[48px] text-base"
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
