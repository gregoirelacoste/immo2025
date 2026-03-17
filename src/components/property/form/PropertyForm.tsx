"use client";

import { useState, useEffect, useRef, useCallback, useMemo, ReactNode } from "react";
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
import RenovationSection from "./RenovationSection";
import FiscalSection from "./FiscalSection";
import AmenitiesSection from "./AmenitiesSection";
import { parseAmenities } from "@/domains/property/amenities";
import type { Equipment } from "@/domains/property/equipment-service";
import ResultsSummarySection from "./ResultsSummarySection";
import InvestmentScorePreview from "./InvestmentScorePreview";
import Alert from "@/components/ui/Alert";
import { PhotoMetadata } from "@/domains/collect/types";
import { reverseGeocode } from "@/domains/collect/geocoding";
import type { DefaultInputs } from "@/domains/auth/defaults";

function buildDefaultFormData(defaults?: DefaultInputs): PropertyFormData {
  return {
    user_id: "",
    visibility: "public",
    address: "",
    city: "",
    postal_code: "",
    purchase_price: 0,
    surface: 0,
    property_type: "ancien",
    description: "",
    neighborhood: "",
    loan_amount: 0,
    interest_rate: defaults?.interest_rate ?? 3.5,
    loan_duration: defaults?.loan_duration ?? 20,
    personal_contribution: 0,
    insurance_rate: defaults?.insurance_rate ?? 0.34,
    loan_fees: defaults?.loan_fees ?? 0,
    notary_fees: 0,
    rent_per_m2: 0,
    monthly_rent: 0,
    condo_charges: 0,
    property_tax: 0,
    vacancy_rate: 8,
    airbnb_price_per_night: 0,
    airbnb_occupancy_rate: 60,
    airbnb_charges: 0,
    renovation_cost: 0,
    dpe_rating: null,
    fiscal_regime: "micro_bic",
    amenities: "[]",
    travaux_ratings: "{}",
    travaux_overrides: "{}",
    equipment_costs: "{}",
    source_url: "",
    image_urls: "[]",
    prefill_sources: "{}",
  };
}

const defaultFormData = buildDefaultFormData();

function stripToFormData(p: Property): PropertyFormData {
  const {
    id: _id, created_at: _created_at, updated_at: _updated_at,
    latitude: _lat, longitude: _lng, market_data: _md,
    investment_score: _is, score_breakdown: _sb, socioeconomic_data: _sed,
    enrichment_status: _es, enrichment_error: _ee, enrichment_at: _ea,
    collect_urls: _cu, collect_texts: _ct,
    is_favorite: _fav, status_changed_at: _sca,
    property_status: _ps,
    ...rest
  } = p;
  return rest;
}

interface Props {
  existingProperty?: Property;
  defaultInputs?: DefaultInputs;
  equipments?: Equipment[];
}

export default function PropertyForm({ existingProperty, defaultInputs, equipments = [] }: Props) {
  const isEditing = !!existingProperty;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const autoScrapeTriggered = useRef(false);
  // Track property ID created by auto-scrape or SmartCollector on /property/new
  // so subsequent actions (text paste, photos) update the same property
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [autoScraping, setAutoScraping] = useState(false);

  const [form, setForm] = useState<PropertyFormData>(() =>
    existingProperty ? stripToFormData(existingProperty) : buildDefaultFormData(defaultInputs)
  );

  // Auto-show advanced if Airbnb data exists
  useEffect(() => {
    if (form.airbnb_price_per_night > 0 || form.loan_fees > 0) {
      setShowAdvanced(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync form state when existingProperty changes (after router.refresh())
  const lastUpdatedAt = useRef(existingProperty?.updated_at);
  useEffect(() => {
    if (
      existingProperty &&
      existingProperty.updated_at !== lastUpdatedAt.current
    ) {
      lastUpdatedAt.current = existingProperty.updated_at;
      setForm(stripToFormData(existingProperty));
    }
  }, [existingProperty]);

  const { loanManuallySet, setLoanManuallySet } = useLoanAutoCalc(form, setForm);

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

  function handleRentChange(field: keyof PropertyFormData, value: string | number) {
    updateField(field, value);
  }

  // Photo GPS → auto-fill address/city if empty
  const handlePhotoGeo = useCallback(async (metadata: PhotoMetadata) => {
    if (!metadata.latitude || !metadata.longitude) return;

    try {
      const geo = await reverseGeocode(metadata.latitude, metadata.longitude);
      if (geo) {
        setForm((prev) => ({
          ...prev,
          ...(!prev.address && geo.address ? { address: geo.address } : {}),
          ...(!prev.city && geo.city ? { city: geo.city } : {}),
          ...(!prev.postal_code && geo.postalCode ? { postal_code: geo.postalCode } : {}),
        }));
      }
    } catch {
      // Geocoding failure is non-fatal
    }
  }, []);

  // Auto-scrape quand une URL est passée en query param (partage PWA)
  useEffect(() => {
    const urlParam = searchParams.get("url");
    const sharedTextParam = searchParams.get("sharedText") || undefined;
    if (urlParam && !existingProperty && !autoScrapeTriggered.current) {
      autoScrapeTriggered.current = true;
      setAutoScraping(true);
      scrapeAndSaveProperty(urlParam, sharedTextParam).then(({ propertyId }) => {
        if (propertyId) {
          // Redirect to edit page so the form works in update mode
          // with full existingProperty from server
          window.location.href = `/property/${propertyId}/edit`;
        }
      }).catch(() => {
        setAutoScraping(false);
        updateField("source_url", urlParam);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calcs = useMemo(() => {
    const fakeProperty = {
      id: "", created_at: "", updated_at: "",
      latitude: null, longitude: null, market_data: "",
      investment_score: null, score_breakdown: "{}", socioeconomic_data: "",
      enrichment_status: "pending", enrichment_error: "", enrichment_at: "",
      collect_urls: "[]", collect_texts: "[]",
      property_status: existingProperty?.property_status || "added",
      ...form,
    } as Property;
    return calculateAll(fakeProperty);
  }, [form, existingProperty?.property_status]);

  const monthlyPaymentPreview = useMemo(
    () => calculateMonthlyPayment(form.loan_amount, form.interest_rate, form.loan_duration),
    [form.loan_amount, form.interest_rate, form.loan_duration]
  );

  const showAirbnb = showAdvanced || form.airbnb_price_per_night > 0;

  // Memoize JSON parsing for SmartCollector props (avoid new arrays every render)
  const existingPhotosData = useMemo(() => {
    try { return JSON.parse(existingProperty?.image_urls || "[]"); } catch { return []; }
  }, [existingProperty?.image_urls]);
  const existingCollectUrlsData = useMemo(() => {
    try { return JSON.parse(existingProperty?.collect_urls || "[]"); } catch { return []; }
  }, [existingProperty?.collect_urls]);
  const existingCollectTextsData = useMemo(() => {
    try { return JSON.parse(existingProperty?.collect_texts || "[]"); } catch { return []; }
  }, [existingProperty?.collect_texts]);

  // Parse prefill sources pour afficher les hints
  const prefillSources = useMemo<Record<string, { source: string; value: number | string }>>(() => {
    try { return JSON.parse(form.prefill_sources || "{}"); }
    catch { return {}; }
  }, [form.prefill_sources]);

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

    // Use existingProperty.id OR createdPropertyId (from SmartCollector on /property/new)
    const propertyId = existingProperty?.id ?? createdPropertyId ?? undefined;
    const result = await saveProperty(form, propertyId);

    if (!result.success) {
      setError(result.error || "Erreur lors de la sauvegarde");
      setSaving(false);
    } else if (existingProperty) {
      router.push(`/property/${existingProperty.id}`);
    } else {
      router.push("/dashboard");
    }
  }

  // When auto-scraping from URL share, block the entire form — only show loading
  if (autoScraping) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-600 font-medium">Import de l&apos;annonce en cours...</p>
        <p className="text-xs text-gray-400">Vous serez redirigé automatiquement</p>
      </div>
    );
  }

  // ─── Form ───
  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-safe">
      {error && <Alert variant="error">{error}</Alert>}

      {existingProperty ? (
        <SmartCollector
          existingPropertyId={existingProperty.id}
          existingPhotos={existingPhotosData}
          existingCollectUrls={existingCollectUrlsData}
          existingCollectTexts={existingCollectTextsData}
          sourceUrl={existingProperty.source_url}
          onSuccess={() => router.refresh()}
          onPhotoGeo={handlePhotoGeo}
        />
      ) : (
        <SmartCollector
          existingPropertyId={createdPropertyId ?? undefined}
          onSuccess={({ propertyId }) => {
            if (!createdPropertyId) setCreatedPropertyId(propertyId);
          }}
          onPhotoGeo={handlePhotoGeo}
        />
      )}

      <PropertyInfoSection form={form} onChange={updateField} prefillHint={prefillHint} />
      <AmenitiesSection
        selected={parseAmenities(form.amenities)}
        onChange={(keys: string[]) => updateField("amenities", JSON.stringify(keys))}
        equipments={equipments}
      />

      {/* Financial sections: full set when creating, key property data when editing */}
      {!isEditing ? (
        <>
          <LoanSection form={form} onChange={updateField} onLoanChange={handleLoanChange} calcs={calcs} monthlyPaymentPreview={monthlyPaymentPreview} prefillHint={prefillHint} loanAutoCalc={!loanManuallySet} />
          <FeesSection form={form} onChange={updateField} calcs={calcs} effectiveNotary={effectiveNotary} />
          <ClassicRentalSection form={form} onChange={handleRentChange} calcs={calcs} prefillHint={prefillHint} />
          <RenovationSection form={form} onChange={updateField} prefillHint={prefillHint} />
          <FiscalSection calcs={calcs} fiscalRegime={form.fiscal_regime || "micro_bic"} />

          {/* Toggle avancé */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-sm text-amber-600 hover:text-amber-800 font-medium py-2"
          >
            {showAdvanced ? "▲ Masquer les options avancées" : "▼ Afficher les options avancées (Airbnb, frais...)"}
          </button>

          {showAdvanced && (
            <AirbnbSection form={form} onChange={updateField} calcs={calcs} />
          )}
          <ResultsSummarySection calcs={calcs} showAirbnb={showAirbnb} />
          <InvestmentScorePreview calcs={calcs} />
        </>
      ) : (
        /* Edit mode: only show factual property data (rent, charges, tax) */
        <ClassicRentalSection form={form} onChange={handleRentChange} calcs={calcs} prefillHint={prefillHint} />
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
          className="px-8 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 min-h-[48px] text-base"
        >
          {saving ? "Sauvegarde..." : existingProperty ? "Mettre à jour" : "Sauvegarder le bien"}
        </button>
      </div>
    </form>
  );
}
