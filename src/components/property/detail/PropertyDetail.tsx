"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Property, type PropertyStatus } from "@/domains/property/types";
import { calculateSimulation, calculateAll, formatCurrency } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
import type { MarketData } from "@/domains/market/types";
import type { InvestmentScoreBreakdown } from "@/domains/enrich/types";
import { getGrade } from "@/lib/grade";
import Link from "next/link";
import PropertyHeader from "./PropertyHeader";
import InvestmentScorePanel from "./InvestmentScorePanel";
import StatusSelector from "@/components/property/StatusSelector";
import TabNavigation, { type TabId } from "./TabNavigation";
import StickyHeader from "./StickyHeader";
import SimulationTab from "./SimulationTab";
import TravauxTab from "./TravauxTab";
import EquipementsTab from "./EquipementsTab";
import CompletionBadge from "./CompletionBadge";
import { getCompletionSummary } from "@/domains/property/completion";
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
  const images: string[] = parseJson(property.image_urls, []);

  const completionSummary = useMemo(() => getCompletionSummary(property), [property]);

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
      <section ref={heroRef} className="bg-white rounded-xl border border-tiili-border p-4 md:p-6 mb-2">
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Informations du bien</h3>
              {isOwner && (
                <Link
                  href={`/property/${property.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Modifier
                </Link>
              )}
            </div>

            <div className="space-y-0">
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                <span className="text-sm text-gray-500">Prix au m²</span>
                <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">{pricePerM2 > 0 ? formatCurrency(pricePerM2) : "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-semibold text-[#1a1a2e] capitalize">{property.property_type}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                <span className="text-sm text-gray-500">Écart marché</span>
                <span className={`text-sm font-semibold ${
                  marketDiff == null ? "text-gray-400" :
                  marketDiff <= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {marketDiff != null ? `${marketDiff > 0 ? "+" : ""}${marketDiff.toFixed(1)}%` : "—"}
                </span>
              </div>
              {(firstSim?.renovation_cost ?? property.renovation_cost) > 0 && (
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Travaux</span>
                  <span className="text-sm font-semibold text-orange-600">{formatCurrency(firstSim?.renovation_cost ?? property.renovation_cost)}</span>
                </div>
              )}
              {property.monthly_rent > 0 && (
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Loyer</span>
                  <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">{formatCurrency(property.monthly_rent)}/mois</span>
                </div>
              )}
              {property.condo_charges > 0 && (
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Charges copro</span>
                  <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">{formatCurrency(property.condo_charges)}/an</span>
                </div>
              )}
              {property.property_tax > 0 && (
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-500">Taxe foncière</span>
                  <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">{formatCurrency(property.property_tax)}/an</span>
                </div>
              )}
            </div>
          </section>

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
        <LocaliteTab property={property} />
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
              cityName={marketData?.communeName || property.city || undefined}
              onRefresh={handleRefreshEnrichment}
              refreshing={refreshing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
