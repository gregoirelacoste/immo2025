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
import { saveProperty, scrapePropertyFromUrl } from "@/lib/actions";
import { useRouter } from "next/navigation";

type PropertyFormData = Omit<Property, "id" | "created_at" | "updated_at">;

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
  source_url: "",
};

interface Props {
  existingProperty?: Property;
}

export default function PropertyForm({ existingProperty }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Scraping state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<
    | { type: "idle" }
    | { type: "success"; method: string; hostname: string }
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

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeStatus({ type: "idle" });
    setError("");

    try {
      const result = await scrapePropertyFromUrl(scrapeUrl.trim());

      if (result.success && result.data) {
        // Pré-remplir les champs avec les données scrapées
        const d = result.data!;
        setForm((prev) => ({
          ...prev,
          ...(d.purchase_price != null && { purchase_price: d.purchase_price }),
          ...(d.surface != null && { surface: d.surface }),
          ...(d.city != null && { city: d.city }),
          ...(d.address != null && { address: d.address }),
          ...(d.description != null && { description: d.description }),
          ...(d.property_type != null && { property_type: d.property_type }),
          source_url: result.source_url,
          // Reset loan_amount pour qu'il se recalcule avec le nouveau prix
          loan_amount: 0,
        }));

        let hostname = "";
        try {
          hostname = new URL(result.source_url).hostname.replace("www.", "");
        } catch { /* ignore */ }

        setScrapeStatus({
          type: "success",
          method:
            result.method === "jsonld"
              ? "Données structurées"
              : result.method === "manifest"
              ? "Sélecteurs existants"
              : "Analyse IA",
          hostname,
        });
      } else {
        setScrapeStatus({
          type: "error",
          message:
            result.error ||
            "Impossible d'extraire les données. Saisissez-les manuellement ci-dessous.",
        });
        // Quand même sauver l'URL source
        setForm((prev) => ({ ...prev, source_url: scrapeUrl.trim() }));
      }
    } catch {
      setScrapeStatus({
        type: "error",
        message: "Erreur inattendue. Saisissez les données manuellement.",
      });
    } finally {
      setScraping(false);
    }
  }

  const fakeProperty: Property = {
    id: "",
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

    const result = await saveProperty(form, existingProperty?.id);

    if (!result.success) {
      setError(result.error || "Erreur lors de la sauvegarde");
      setSaving(false);
    } else {
      router.push("/dashboard");
    }
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
            Collez le lien d&apos;une annonce (LeBonCoin, SeLoger, PAP, Bien&apos;ici...) pour pré-remplir le formulaire.
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
          {scrapeStatus.type === "success" && (
            <div className="mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              Données importées depuis <strong>{scrapeStatus.hostname}</strong>
              <span className="text-green-500 ml-2">({scrapeStatus.method})</span>
              <br />
              <span className="text-xs text-green-600">
                Vérifiez et complétez les informations ci-dessous avant de sauvegarder.
              </span>
            </div>
          )}

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
          {numInput("loan_fees", "Frais de dossier", "1000")}
        </div>
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <div className="text-sm text-indigo-700 space-y-1 md:space-y-0">
            <p>
              Mensualité : <span className="font-bold">{formatCurrency(monthlyPaymentPreview)}</span>
              {" | "}
              Assurance : <span className="font-bold">{formatCurrency(calcs.monthly_insurance)}</span>/mois
            </p>
            <p>
              Total mensuel :{" "}
              <span className="font-bold">
                {formatCurrency(monthlyPaymentPreview + calcs.monthly_insurance)}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Frais de notaire */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Frais de notaire</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Frais estimés : {formatCurrency(autoNotary)}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={form.notary_fees || ""}
              onChange={(e) => handleNumberChange("notary_fees", e.target.value)}
              className={inputClass}
              placeholder={`Auto: ${autoNotary}`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Vide = calcul auto ({form.property_type === "ancien" ? "7.5%" : "2.5%"} du prix)
            </p>
          </div>
          <div>
            <label className={labelClass}>Coût total du projet</label>
            <div className="px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base font-semibold min-h-[44px] flex items-center">
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
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Location classique</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {numInput("monthly_rent", "Loyer mensuel estimé", "800")}
          {numInput("condo_charges", "Charges copro / mois", "100")}
          {numInput("property_tax", "Taxe foncière / an", "800")}
          {numInput("vacancy_rate", "Vacance locative (%)", "5", { step: "0.1", decimal: true })}
        </div>
      </section>

      {/* Airbnb */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4">Airbnb / Location courte durée</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {numInput("airbnb_price_per_night", "Prix par nuit", "80")}
          {numInput("airbnb_occupancy_rate", "Taux d'occupation (%)", "60", { step: "0.1", decimal: true })}
          {numInput("airbnb_charges", "Charges mensuelles Airbnb", "200")}
        </div>
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
