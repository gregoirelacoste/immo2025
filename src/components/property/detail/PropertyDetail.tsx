"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Property, type PropertyStatus } from "@/domains/property/types";
import { calculateSimulation, calculateAll, formatCurrency } from "@/lib/calculations";
import { removeProperty, updatePropertyField } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
import type { MarketData } from "@/domains/market/types";
import type { SocioEconomicData } from "@/domains/enrich/socioeconomic-types";
import type { InvestmentScoreBreakdown } from "@/domains/enrich/types";
import { parseAmenities } from "@/domains/property/amenities";
import { calculateEquipmentImpact } from "@/domains/property/equipment-calculator";
import { getGrade } from "@/lib/grade";
import Link from "next/link";
import PropertyHeader from "./PropertyHeader";
import InvestmentScorePanel from "./InvestmentScorePanel";
import StatusSelector from "@/components/property/StatusSelector";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import TabNavigation, { type TabId } from "./TabNavigation";
import StickyHeader from "./StickyHeader";
import SimulationTab from "./SimulationTab";
import TravauxTab from "./TravauxTab";
import EquipementsTab from "./EquipementsTab";
import CompletionBadge from "./CompletionBadge";
import { getCompletionSummary } from "@/domains/property/completion";
import { getFieldsByCategory, isFieldFilled } from "@/domains/property/field-registry";
import InlineFieldEditor from "./InlineFieldEditor";
import type { Photo } from "@/domains/photo/types";
import type { Simulation } from "@/domains/simulation/types";
import PhotoGallery from "./PhotoGallery";
import LocaliteTab from "./LocaliteTab";

const PropertyMap = dynamic(() => import("./PropertyMap"), { ssr: false });

const SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "#0d9488", text: "#f0fdfa" },
  B: { bg: "#2563eb", text: "#eff6ff" },
  C: { bg: "#d97706", text: "#fffbeb" },
  D: { bg: "#dc2626", text: "#fef2f2" },
  "?": { bg: "#9ca3af", text: "#f9fafb" },
};

function ScoreBrick({ score, grade }: { score: number | null; grade: ReturnType<typeof getGrade> }) {
  const colors = SCORE_COLORS[grade.letter] || SCORE_COLORS["?"];
  return (
    <div
      className="w-[54px] h-[62px] rounded-md flex flex-col items-center justify-center shrink-0 relative overflow-hidden cursor-pointer"
      style={{ background: colors.bg }}
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.1,
          background: `repeating-linear-gradient(0deg, transparent, transparent 19px, ${colors.text} 19px, ${colors.text} 20px)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.07,
          background: `repeating-linear-gradient(90deg, transparent, transparent 25px, ${colors.text} 25px, ${colors.text} 26px)`,
        }}
      />
      <span className="text-[11px] font-bold leading-none z-10" style={{ color: colors.text, opacity: 0.8 }}>
        {grade.letter}
      </span>
      <span className="text-[20px] font-extrabold leading-tight z-10" style={{ color: colors.text }}>
        {score ?? 0}
      </span>
    </div>
  );
}

/** Rent section with auto/manual toggle */
function RentSection({ property, marketData, amenities }: { property: Property; marketData: MarketData | null; amenities: string[] }) {
  const router = useRouter();
  const isManual = property.rent_mode === "manual";
  const marketRentPerM2 = marketData?.avgRentPerM2 ?? (property.rent_per_m2 > 0 ? property.rent_per_m2 : 0);

  // Calculate auto rent = market × surface × (1 + equipment impact)
  const eqSummary = useMemo(
    () => marketRentPerM2 > 0 ? calculateEquipmentImpact(marketRentPerM2, amenities) : null,
    [marketRentPerM2, amenities]
  );
  const autoRent = eqSummary && property.surface > 0
    ? Math.round(eqSummary.adjustedRentPerM2 * property.surface)
    : 0;

  const displayRent = isManual ? property.monthly_rent : autoRent;

  async function toggleRentMode() {
    const newMode = isManual ? "auto" : "manual";
    await updatePropertyField(property.id, "rent_mode", newMode, "Saisie manuelle", "declared");
    // If switching to auto, also update monthly_rent to the auto value
    if (newMode === "auto" && autoRent > 0) {
      await updatePropertyField(property.id, "monthly_rent", autoRent, "Loyer auto (localité + équipements)", "estimated");
    }
    router.refresh();
  }

  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">Location classique</h3>
        <button
          onClick={toggleRentMode}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            isManual
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {isManual ? "Manuel" : "Auto"}
        </button>
      </div>

      <div className="p-3 bg-tiili-surface rounded-xl mb-3">
        <div className="text-2xl font-extrabold text-[#1a1a2e]">
          {displayRent > 0 ? `${formatCurrency(displayRent)}/mois` : "—"}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {isManual
            ? "Loyer renseigné manuellement"
            : autoRent > 0
              ? `Calculé : ${marketRentPerM2.toFixed(1)} €/m² × ${property.surface} m²${eqSummary && eqSummary.totalImpactPercent !== 0 ? ` × (1${eqSummary.totalImpactPercent > 0 ? "+" : ""}${Math.round(eqSummary.totalImpactPercent * 100)}% équip.)` : ""}`
              : "Données de localité insuffisantes"
          }
        </div>
      </div>

      {property.vacancy_rate > 0 && (
        <div className="text-xs text-gray-500">
          Vacance locative : {property.vacancy_rate}%
        </div>
      )}
    </section>
  );
}

interface Props {
  property: Property;
  isOwner?: boolean;
  photos?: Photo[];
  simulations?: Simulation[];
}

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback; }
  catch { return fallback; }
}

export default function PropertyDetail({ property, isOwner = false, photos = [], simulations = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Use first simulation's data for KPIs if available, otherwise fall back to property data
  const firstSim = simulations.length > 0 ? simulations[0] : null;
  const calcs = useMemo(
    () => firstSim ? calculateSimulation(property, firstSim) : calculateAll(property),
    [property, firstSim]
  );
  const [refreshing, setRefreshing] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [heroHidden, setHeroHidden] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // Show sticky header only when hero section scrolls out of view
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroHidden(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const VALID_TABS: TabId[] = ["bien", "travaux", "equipements", "simulation", "localite"];
  const rawTab = searchParams.get("tab") as TabId;
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : "bien";

  const marketData = useMemo(() => parseJson<MarketData | null>(property.market_data, null), [property.market_data]);
  const scoreBreakdown = useMemo(() => parseJson<InvestmentScoreBreakdown | null>(property.score_breakdown, null), [property.score_breakdown]);
  const socioData = useMemo(() => parseJson<SocioEconomicData | null>(property.socioeconomic_data, null), [property.socioeconomic_data]);
  const amenities = useMemo(() => parseAmenities(property.amenities), [property.amenities]);
  const images: string[] = parseJson(property.image_urls, []);

  const completionSummary = useMemo(() => getCompletionSummary(property), [property]);

  // Missing fields for the "Bien" tab: charges + revenus that are empty
  const missingBienFields = useMemo(() => {
    const chargesFields = getFieldsByCategory("charges");
    const revenusFields = getFieldsByCategory("revenus");
    return [...chargesFields, ...revenusFields].filter((f) => !isFieldFilled(property, f.key));
  }, [property]);

  const pricePerM2 = property.surface > 0 ? property.purchase_price / property.surface : 0;
  const marketDiff = marketData?.medianPurchasePricePerM2 && pricePerM2
    ? ((pricePerM2 - marketData.medianPurchasePricePerM2) / marketData.medianPurchasePricePerM2) * 100
    : null;

  async function handleDelete() {
    if (!confirm("Supprimer ce bien ?")) return;
    const result = await removeProperty(property.id);
    if (!result.success) {
      alert(result.error ?? "Erreur lors de la suppression.");
      return;
    }
    router.push("/dashboard");
  }

  async function handleRefreshEnrichment() {
    setRefreshing(true);
    await refreshEnrichment(property.id);
    setRefreshing(false);
    router.refresh();
  }

  const grade = getGrade(property.investment_score);

  return (
    <div className="space-y-0 pb-safe">
      <PropertyHeader property={property} isOwner={isOwner} onDelete={handleDelete} />

      {/* Hero — tiili style */}
      <section ref={heroRef} className="bg-white rounded-xl border border-tiili-border p-4 md:p-6 mb-4">
              {/* Header: City + Score brick */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-extrabold text-[#1a1a2e] tracking-tight">{property.city}</h2>
                    <StatusSelector propertyId={property.id} currentStatus={(property.property_status || "added") as PropertyStatus} />
                  </div>
                  <p className="text-[13px] text-[#9ca3af] font-medium">
                    {property.property_type === "neuf" ? "Neuf" : "Ancien"} · {property.surface} m²
                    {pricePerM2 > 0 && <> · {formatCurrency(pricePerM2)}/m²</>}
                  </p>
                  {property.address && (
                    <p className="text-xs text-[#b0b0b8] mt-0.5">{property.address}</p>
                  )}
                  <CompletionBadge percent={completionSummary.globalPercent} />
                </div>
                {/* Score brick (same style as dashboard) — click opens score modal */}
                <div onClick={() => setScoreModalOpen(true)}>
                  <ScoreBrick score={property.investment_score} grade={grade} />
                </div>
              </div>
      </section>

      {/* Sticky header (visible only on scroll past hero) */}
      <StickyHeader property={property} calcs={calcs} visible={heroHidden} />

      {/* Tab navigation */}
      <TabNavigation />

      {/* ═══════════════════ ONGLET BIEN (description factuelle) ═══════════════════ */}
      {activeTab === "bien" && (
        <div className="space-y-4 mt-4">
          {/* Infos clés */}
          <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
            {isOwner && (
              <div className="flex justify-end mb-3">
                <Link
                  href={`/property/${property.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors min-h-[36px]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Modifier le bien
                </Link>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Prix au m²</span>
                <p className="font-semibold">{pricePerM2 > 0 ? formatCurrency(pricePerM2) : "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Type</span>
                <p className="font-semibold capitalize">{property.property_type}</p>
              </div>
              <div>
                <span className="text-gray-500">Écart marché</span>
                <p className={`font-semibold ${
                  marketDiff == null ? "text-gray-400" :
                  marketDiff <= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {marketDiff != null ? `${marketDiff > 0 ? "+" : ""}${marketDiff.toFixed(1)}%` : "—"}
                </p>
              </div>
              {(firstSim?.renovation_cost ?? property.renovation_cost) > 0 && (
                <div>
                  <span className="text-gray-500">Travaux</span>
                  <p className="font-semibold text-orange-600">{formatCurrency(firstSim?.renovation_cost ?? property.renovation_cost)}</p>
                </div>
              )}
            </div>

            {/* Charges du bien */}
            {(property.condo_charges > 0 || property.property_tax > 0) && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {property.condo_charges > 0 && (
                    <div>
                      <span className="text-gray-500">Charges copro</span>
                      <p className="font-semibold">{formatCurrency(property.condo_charges)}/mois</p>
                    </div>
                  )}
                  {property.property_tax > 0 && (
                    <div>
                      <span className="text-gray-500">Taxe foncière</span>
                      <p className="font-semibold">{formatCurrency(property.property_tax)}/an</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Section Loyer — auto/manual toggle */}
          <RentSection property={property} marketData={marketData} amenities={amenities} />

          {/* Description */}
          {property.description && (
            <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
            </section>
          )}

          {/* Photos */}
          <PhotoGallery
            photos={photos}
            scrapedImages={images}
            isOwner={isOwner}
            propertyId={property.id}
          />

          {/* Carte */}
          {property.latitude != null && property.longitude != null && (
            <section className="bg-white rounded-xl border border-tiili-border overflow-hidden">
              <PropertyMap
                latitude={property.latitude}
                longitude={property.longitude}
                address={property.address}
                city={property.city}
              />
            </section>
          )}

          {/* Données manquantes — saisie inline */}
          {missingBienFields.length > 0 && (
            <CollapsibleSection title={`Données manquantes (${missingBienFields.length})`} variant="blue">
              <div className="space-y-2">
                {missingBienFields.map((field) => (
                  <div key={field.key} className="border border-dashed border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{field.label}</span>
                      {field.importance === "critical" && (
                        <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Important</span>
                      )}
                    </div>
                    <InlineFieldEditor
                      propertyId={property.id}
                      field={field}
                      onSaved={() => router.refresh()}
                    />
                    {field.agentQuestion && (
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        💡 {field.agentQuestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

        </div>
      )}

      {/* ═══════════════════ ONGLET SIMULATION ═══════════════════ */}
      {activeTab === "simulation" && (
        <SimulationTab
          property={property}
          simulations={simulations}
          isOwner={isOwner}
        />
      )}

      {/* ═══════════════════ ONGLET TRAVAUX ═══════════════════ */}
      {activeTab === "travaux" && (
        <TravauxTab property={property} />
      )}

      {/* ═══════════════════ ONGLET ÉQUIPEMENTS ═══════════════════ */}
      {activeTab === "equipements" && (
        <EquipementsTab property={property} marketData={marketData} />
      )}

      {/* ═══════════════════ ONGLET LOCALITÉ ═══════════════════ */}
      {activeTab === "localite" && (
        <LocaliteTab
          property={property}
          marketData={marketData}
          socioData={socioData}
          monthlyRent={firstSim?.monthly_rent}
        />
      )}

      {/* Score modal — opens on ScoreBrick click */}
      {scoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setScoreModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Score d'investissement</h3>
              <button
                onClick={() => setScoreModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <InvestmentScorePanel
              score={property.investment_score}
              breakdown={scoreBreakdown}
              status={property.enrichment_status}
              error={property.enrichment_error}
              onRefresh={handleRefreshEnrichment}
              refreshing={refreshing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
