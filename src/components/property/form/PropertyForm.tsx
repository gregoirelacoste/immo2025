"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Property, PropertyFormData } from "@/domains/property/types";
import {
  calculateNotaryFees,
  calculateMonthlyPayment,
  calculateAll,
} from "@/lib/calculations";
import { saveProperty } from "@/domains/property/actions";
import { scrapeAndSaveProperty } from "@/domains/scraping/actions";
import { useLoanAutoCalc } from "./useLoanAutoCalc";
import SmartCollector from "@/components/collect/SmartCollector";
import PropertyInfoSection from "./PropertyInfoSection";
import LoanSection from "./LoanSection";
import FeesSection from "./FeesSection";
import ClassicRentalSection from "./ClassicRentalSection";
import AirbnbSection from "./AirbnbSection";
import ResultsSummarySection from "./ResultsSummarySection";
import Alert from "@/components/ui/Alert";

const defaultFormData: PropertyFormData = {
  user_id: "",
  visibility: "public",
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

  const [form, setForm] = useState<PropertyFormData>(() => {
    if (existingProperty) {
      const { id: _id, created_at: _created_at, updated_at: _updated_at, ...rest } = existingProperty;
      return rest;
    }
    return defaultFormData;
  });

  const { setLoanManuallySet } = useLoanAutoCalc(form, setForm);

  const effectiveNotary =
    form.notary_fees > 0
      ? form.notary_fees
      : calculateNotaryFees(form.purchase_price, form.property_type);

  function updateField(field: keyof PropertyFormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLoanChange(value: string) {
    setLoanManuallySet(true);
    updateField("loan_amount", value === "" ? 0 : parseFloat(value) || 0);
  }

  // Auto-scrape quand une URL est passée en query param (partage PWA)
  useEffect(() => {
    const urlParam = searchParams.get("url");
    const sharedTextParam = searchParams.get("sharedText") || undefined;
    if (urlParam && !existingProperty && !autoScrapeTriggered.current) {
      autoScrapeTriggered.current = true;
      scrapeAndSaveProperty(urlParam, sharedTextParam).then(({ propertyId }) => {
        if (propertyId) window.location.href = `/property/${propertyId}/edit`;
      }).catch(() => {
        updateField("source_url", urlParam);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fakeProperty: Property = { id: "", created_at: "", updated_at: "", ...form };
  const calcs = calculateAll(fakeProperty);
  const monthlyPaymentPreview = calculateMonthlyPayment(
    form.loan_amount,
    form.interest_rate,
    form.loan_duration
  );

  // Parse prefill sources pour afficher les hints
  const prefillSources: Record<string, { source: string; value: number | string }> = (() => {
    try { return JSON.parse(form.prefill_sources || "{}"); }
    catch { return {}; }
  })();

  function prefillHint(field: string): ReactNode {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-safe">
      {error && <Alert variant="error">{error}</Alert>}

      {existingProperty ? (
        <SmartCollector existingPropertyId={existingProperty.id} onSuccess={() => router.refresh()} />
      ) : (
        <SmartCollector />
      )}

      <PropertyInfoSection form={form} onChange={updateField} prefillHint={prefillHint} />
      <LoanSection form={form} onChange={updateField} onLoanChange={handleLoanChange} calcs={calcs} monthlyPaymentPreview={monthlyPaymentPreview} prefillHint={prefillHint} />
      <FeesSection form={form} onChange={updateField} calcs={calcs} effectiveNotary={effectiveNotary} />
      <ClassicRentalSection form={form} onChange={updateField} calcs={calcs} prefillHint={prefillHint} />
      <AirbnbSection form={form} onChange={updateField} calcs={calcs} />
      <ResultsSummarySection calcs={calcs} />

      {form.source_url && (
        <div className="text-xs text-gray-400 text-center">
          Source : <a href={form.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{form.source_url}</a>
        </div>
      )}

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
          {saving ? "Sauvegarde..." : existingProperty ? "Mettre à jour" : "Sauvegarder le bien"}
        </button>
      </div>
    </form>
  );
}
