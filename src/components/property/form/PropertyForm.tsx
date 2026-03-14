"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Property, PropertyFormData, type PropertyStatus } from "@/domains/property/types";
import {
  calculateNotaryFees,
  calculateMonthlyPayment,
  calculateAll,
  formatCurrency,
  formatPercent,
} from "@/lib/calculations";
import { saveProperty, removeProperty } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
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
import { parseAmenities, type AmenityKey } from "@/domains/property/amenities";
import ResultsSummarySection from "./ResultsSummarySection";
import InvestmentScorePreview from "./InvestmentScorePreview";
import InvestmentScorePanel from "@/components/property/detail/InvestmentScorePanel";
import MarketDataPanel from "@/components/property/detail/MarketDataPanel";
import SocioEconomicPanel from "@/components/property/detail/SocioEconomicPanel";
import PhotoGallery from "@/components/property/detail/PhotoGallery";
import PropertyHeader from "@/components/property/detail/PropertyHeader";
import StatusSelector from "@/components/property/StatusSelector";
import BudgetIndicator from "@/components/property/BudgetIndicator";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import Alert from "@/components/ui/Alert";
import { PhotoMetadata } from "@/domains/collect/types";
import { reverseGeocode } from "@/domains/collect/geocoding";
import type { DefaultInputs } from "@/domains/auth/defaults";
import type { MarketData } from "@/domains/market/types";
import type { SocioEconomicData } from "@/domains/enrich/socioeconomic-types";
import type { UserProfile } from "@/domains/auth/types";
import type { Photo } from "@/domains/photo/types";

const PropertyMap = dynamic(() => import("@/components/property/detail/PropertyMap"), { ssr: false });

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

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback; }
  catch { return fallback; }
}

interface Props {
  existingProperty?: Property;
  defaultInputs?: DefaultInputs;
  readOnly?: boolean;
  isOwner?: boolean;
  userProfile?: UserProfile | null;
  photos?: Photo[];
}

export default function PropertyForm({ existingProperty, defaultInputs, readOnly, isOwner, userProfile, photos = [] }: Props) {
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
  const [refreshing, setRefreshing] = useState(false);

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
    if (readOnly) return;
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

  const fakeProperty = {
    id: "", created_at: "", updated_at: "",
    latitude: null, longitude: null, market_data: "",
    investment_score: null, score_breakdown: "{}", socioeconomic_data: "",
    enrichment_status: "pending", enrichment_error: "", enrichment_at: "",
    collect_urls: "[]", collect_texts: "[]",
    property_status: existingProperty?.property_status || "added",
    ...form,
  } as Property;
  const calcs = calculateAll(fakeProperty);
  const monthlyPaymentPreview = calculateMonthlyPayment(
    form.loan_amount,
    form.interest_rate,
    form.loan_duration
  );

  const showAirbnb = showAdvanced || form.airbnb_price_per_night > 0;

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

    // Use existingProperty.id OR createdPropertyId (from SmartCollector on /property/new)
    const propertyId = existingProperty?.id ?? createdPropertyId ?? undefined;
    const result = await saveProperty(form, propertyId);

    if (!result.success) {
      setError(result.error || "Erreur lors de la sauvegarde");
      setSaving(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleDelete() {
    if (!existingProperty) return;
    if (!confirm("Supprimer ce bien ?")) return;
    const result = await removeProperty(existingProperty.id);
    if (!result.success) {
      alert(result.error ?? "Erreur lors de la suppression.");
      return;
    }
    router.push("/dashboard");
  }

  async function handleRefreshEnrichment() {
    if (!existingProperty) return;
    setRefreshing(true);
    await refreshEnrichment(existingProperty.id);
    setRefreshing(false);
    router.refresh();
  }

  // View-only data parsed from existingProperty
  const marketData = existingProperty ? parseJson<MarketData | null>(existingProperty.market_data, null) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoreBreakdown = existingProperty ? parseJson<any>(existingProperty.score_breakdown, null) : null;
  const socioData = existingProperty ? parseJson<SocioEconomicData | null>(existingProperty.socioeconomic_data, null) : null;
  const scrapedImages: string[] = existingProperty ? parseJson(existingProperty.image_urls, []) : [];

  // When auto-scraping from URL share, block the entire form — only show loading
  if (autoScraping) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-sm text-gray-600 font-medium">Import de l&apos;annonce en cours...</p>
        <p className="text-xs text-gray-400">Vous serez redirigé automatiquement</p>
      </div>
    );
  }

  // ─── Read-only mode (view page) ───
  if (readOnly && existingProperty) {
    return (
      <div className="space-y-6 pb-safe">
        {/* Header with share/edit/delete */}
        <PropertyHeader property={existingProperty} isOwner={!!isOwner} onDelete={handleDelete} />

        {/* Hero KPIs */}
        <section className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4 md:p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{existingProperty.city}</h2>
                <StatusSelector propertyId={existingProperty.id} currentStatus={(existingProperty.property_status || "added") as PropertyStatus} />
              </div>
              {existingProperty.address && (
                <p className="text-sm text-gray-500">{existingProperty.address}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-gray-900">{formatCurrency(existingProperty.purchase_price)}</p>
              <div className="flex items-center justify-end gap-2">
                <p className="text-sm text-gray-500">{existingProperty.surface} m²</p>
                <BudgetIndicator monthlyPayment={calcs.monthly_payment} monthlyInsurance={calcs.monthly_insurance} userProfile={userProfile} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-gray-500">Renta nette</p>
              <p className={`text-xl font-bold ${calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"}`}>
                {formatPercent(calcs.net_yield)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-gray-500">Cash-flow / mois</p>
              <p className={`text-xl font-bold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(calcs.monthly_cashflow)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-gray-500">Net-net (après impôts)</p>
              <p className={`text-xl font-bold ${calcs.net_net_yield >= 4 ? "text-green-600" : calcs.net_net_yield >= 2 ? "text-blue-600" : "text-red-600"}`}>
                {formatPercent(calcs.net_net_yield)}
              </p>
            </div>
            <div className={`rounded-lg p-3 border ${
              existingProperty.investment_score == null ? "bg-white border-slate-100" :
              existingProperty.investment_score >= 71 ? "bg-green-50 border-green-200" :
              existingProperty.investment_score >= 51 ? "bg-blue-50 border-blue-200" :
              existingProperty.investment_score >= 31 ? "bg-amber-50 border-amber-200" :
              "bg-red-50 border-red-200"
            }`}>
              <p className="text-xs text-gray-500">Score</p>
              <p className={`text-xl font-bold ${
                existingProperty.investment_score == null ? "text-gray-400" :
                existingProperty.investment_score >= 71 ? "text-green-600" :
                existingProperty.investment_score >= 51 ? "text-blue-600" :
                existingProperty.investment_score >= 31 ? "text-amber-600" :
                "text-red-600"
              }`}>
                {existingProperty.investment_score != null ? `${existingProperty.investment_score}/100` : "..."}
              </p>
            </div>
          </div>
        </section>

        {/* Sections in same order as edit form, but readOnly */}
        <PropertyInfoSection form={form} onChange={updateField} prefillHint={prefillHint} readOnly />
        <AmenitiesSection
          selected={parseAmenities(form.amenities)}
          onChange={(keys: AmenityKey[]) => updateField("amenities", JSON.stringify(keys))}
          readOnly
        />
        <LoanSection form={form} onChange={updateField} onLoanChange={handleLoanChange} calcs={calcs} monthlyPaymentPreview={monthlyPaymentPreview} prefillHint={prefillHint} loanAutoCalc={!loanManuallySet} readOnly />
        <FeesSection form={form} onChange={updateField} calcs={calcs} effectiveNotary={effectiveNotary} readOnly />
        <ClassicRentalSection form={form} onChange={handleRentChange} calcs={calcs} prefillHint={prefillHint} readOnly />

        {/* Airbnb (only if data exists) */}
        {form.airbnb_price_per_night > 0 && (
          <AirbnbSection form={form} onChange={updateField} calcs={calcs} readOnly />
        )}

        <RenovationSection form={form} onChange={updateField} prefillHint={prefillHint} readOnly />
        <FiscalSection calcs={calcs} fiscalRegime={form.fiscal_regime || "micro_bic"} />
        <ResultsSummarySection calcs={calcs} showAirbnb={form.airbnb_price_per_night > 0} />

        {/* Investment Score */}
        <InvestmentScorePanel
          score={existingProperty.investment_score}
          breakdown={scoreBreakdown}
          status={existingProperty.enrichment_status}
          error={existingProperty.enrichment_error}
          onRefresh={handleRefreshEnrichment}
          refreshing={refreshing}
        />

        {/* Market Data */}
        {marketData && (
          <CollapsibleSection title="Données du marché" variant="emerald" defaultOpen>
            <MarketDataPanel property={existingProperty} marketData={marketData} loading={existingProperty.enrichment_status === "running"} />
          </CollapsibleSection>
        )}

        {/* Photos */}
        {(photos.length > 0 || scrapedImages.length > 0) && (
          <PhotoGallery
            photos={photos}
            scrapedImages={scrapedImages}
            isOwner={!!isOwner}
            propertyId={existingProperty.id}
          />
        )}

        {/* Map */}
        {existingProperty.latitude != null && existingProperty.longitude != null && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <PropertyMap
              latitude={existingProperty.latitude}
              longitude={existingProperty.longitude}
              address={existingProperty.address}
              city={existingProperty.city}
            />
          </section>
        )}

        {/* Socio-economic data */}
        {socioData && (
          <CollapsibleSection title="Données socio-économiques" variant="violet" defaultOpen>
            <SocioEconomicPanel data={socioData} />
          </CollapsibleSection>
        )}

        {/* Visit mode link */}
        <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 text-center">
          <Link
            href={`/property/${existingProperty.id}/visit`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors min-h-[48px]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
            Démarrer le mode visite
          </Link>
          <p className="text-sm text-gray-500 mt-3">
            Le mode visite vous guide pour photographier chaque pièce et noter vos observations.
          </p>
        </section>
      </div>
    );
  }

  // ─── Edit mode (form) ───
  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-safe">
      {error && <Alert variant="error">{error}</Alert>}

      {existingProperty ? (
        <SmartCollector
          existingPropertyId={existingProperty.id}
          existingPhotos={(() => { try { return JSON.parse(existingProperty.image_urls || "[]"); } catch { return []; } })()}
          existingCollectUrls={(() => { try { return JSON.parse(existingProperty.collect_urls || "[]"); } catch { return []; } })()}
          existingCollectTexts={(() => { try { return JSON.parse(existingProperty.collect_texts || "[]"); } catch { return []; } })()}
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
        onChange={(keys: AmenityKey[]) => updateField("amenities", JSON.stringify(keys))}
      />
      <LoanSection form={form} onChange={updateField} onLoanChange={handleLoanChange} calcs={calcs} monthlyPaymentPreview={monthlyPaymentPreview} prefillHint={prefillHint} loanAutoCalc={!loanManuallySet} />
      <FeesSection form={form} onChange={updateField} calcs={calcs} effectiveNotary={effectiveNotary} />
      <ClassicRentalSection form={form} onChange={handleRentChange} calcs={calcs} prefillHint={prefillHint} />
      <RenovationSection form={form} onChange={updateField} prefillHint={prefillHint} />
      <FiscalSection calcs={calcs} fiscalRegime={form.fiscal_regime || "micro_bic"} />

      {/* Toggle avancé */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium py-2"
      >
        {showAdvanced ? "▲ Masquer les options avancées" : "▼ Afficher les options avancées (Airbnb, frais...)"}
      </button>

      {showAdvanced && (
        <AirbnbSection form={form} onChange={updateField} calcs={calcs} />
      )}
      <ResultsSummarySection calcs={calcs} showAirbnb={showAirbnb} />

      {/* Investment score: persisted for existing, preview for new */}
      {existingProperty && existingProperty.enrichment_status === "done" ? (
        <InvestmentScorePanel
          score={existingProperty.investment_score}
          breakdown={(() => { try { return JSON.parse(existingProperty.score_breakdown || "{}"); } catch { return null; } })()}
          status={existingProperty.enrichment_status}
        />
      ) : (
        <InvestmentScorePreview calcs={calcs} />
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
