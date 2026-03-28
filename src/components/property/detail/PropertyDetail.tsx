"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Property, type PropertyStatus } from "@/domains/property/types";
import { calculateSimulation, calculateExitSimulation, formatCurrency } from "@/lib/calculations";
import { calculateTravaux } from "@/domains/property/travaux-calculator";
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
import SimulationBanner from "./SimulationBanner";
import SimulationDrawer from "./SimulationDrawer";
import { buildSystemSimulation } from "@/domains/simulation/system";
import type { LocalityDataFields } from "@/domains/locality/types";
import TravauxTab from "./TravauxTab";
import EquipementsTab from "./EquipementsTab";
import type { Photo } from "@/domains/photo/types";
import type { Simulation } from "@/domains/simulation/types";
import PhotoGallery from "./PhotoGallery";
import LocaliteTab from "./LocaliteTab";
import AmenagementTab from "./AmenagementTab";
import FinancementTab from "./FinancementTab";
import AiEvaluationSection from "./AiEvaluationSection";
import type { AiEvaluation } from "@/domains/evaluation/types";

import CompletenessChecklist from "./CompletenessChecklist";
import CashflowBreakdownModal from "./CashflowBreakdownModal";
import YieldBreakdownModal from "./YieldBreakdownModal";
import LoanCostBreakdownModal from "./LoanCostBreakdownModal";
import BeginnerVerdict from "./BeginnerVerdict";
import { useUserMode } from "@/contexts/UserModeContext";

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
  isLoggedIn?: boolean;
  isPremium?: boolean;
  photos?: Photo[];
  simulations?: Simulation[];
}

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback; }
  catch { return fallback; }
}

export default function PropertyDetail({ property, isOwner = false, isLoggedIn = false, isPremium = false, photos = [], simulations = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isBeginner } = useUserMode();

  // Local optimistic state for active simulation — updates instantly on switch
  const [localActiveSimId, setLocalActiveSimId] = useState<string>(
    property.active_simulation_id || "__system__"
  );
  // Sync from server when property changes (e.g. after router.refresh)
  useEffect(() => {
    setLocalActiveSimId(property.active_simulation_id || "__system__");
  }, [property.active_simulation_id]);

  // Live simulation from SimulationDrawer editor (instant updates before server roundtrip)
  const [liveSimFromEditor, setLiveSimFromEditor] = useState<Simulation | null>(null);

  // System simulation (built from locality data, loaded async)
  const [localityFields, setLocalityFields] = useState<LocalityDataFields | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { fetchLocalityFields } = await import("@/domains/locality/actions");
      const result = await fetchLocalityFields(property.city, property.postal_code || undefined);
      if (!cancelled && result) setLocalityFields(result.fields);
    }
    if (property.city) load();
    return () => { cancelled = true; };
  }, [property.city, property.postal_code]);

  const systemSim = useMemo(
    () => buildSystemSimulation(property, localityFields),
    [property, localityFields]
  );

  // Resolve the active simulation from local state
  const activeSim = useMemo(() => {
    if (localActiveSimId === "__system__") return systemSim;
    return simulations.find((s) => s.id === localActiveSimId) ?? systemSim;
  }, [localActiveSimId, simulations, systemSim]);

  // Use live editor simulation if it matches the active one
  const effectiveSim = useMemo(() => {
    if (liveSimFromEditor && liveSimFromEditor.id === localActiveSimId) {
      return liveSimFromEditor;
    }
    return activeSim;
  }, [liveSimFromEditor, activeSim, localActiveSimId]);

  const calcs = useMemo(
    () => calculateSimulation(property, effectiveSim),
    [property, effectiveSim]
  );
  const travauxSummary = useMemo(
    () => calculateTravaux(property.surface, property.travaux_ratings ?? "{}", property.travaux_overrides ?? "{}", property.travaux_targets ?? "{}"),
    [property.surface, property.travaux_ratings, property.travaux_overrides, property.travaux_targets]
  );
  const exitSim = useMemo(
    () => calculateExitSimulation(property, effectiveSim, calcs, travauxSummary.valorisationResaleValue),
    [property, effectiveSim, calcs, travauxSummary.valorisationResaleValue]
  );
  const [refreshing, setRefreshing] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [cashflowModalOpen, setCashflowModalOpen] = useState(false);
  const [yieldModalOpen, setYieldModalOpen] = useState(false);
  const [loanCostModalOpen, setLoanCostModalOpen] = useState(false);
  const [simDrawerOpen, setSimDrawerOpen] = useState(false);
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

  const VALID_TABS: TabId[] = ["bien", "financement", "travaux", "equipements", "amenagement", "localite"];
  const rawTab = searchParams.get("tab") as TabId;
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : "bien";

  // Clear stale live sim when drawer closes (handled by SimulationDrawer)
  // Keep the effect for cleanup when component unmounts
  useEffect(() => {
    return () => setLiveSimFromEditor(null);
  }, []);

  const marketData = useMemo(() => parseJson<MarketData | null>(property.market_data, null), [property.market_data]);
  const scoreBreakdown = useMemo(() => parseJson<InvestmentScoreBreakdown | null>(property.score_breakdown, null), [property.score_breakdown]);
  const aiEvaluation = useMemo(() => parseJson<AiEvaluation | null>(property.ai_evaluation, null), [property.ai_evaluation]);
  const images: string[] = useMemo(() => parseJson(property.image_urls, []), [property.image_urls]);

  const negoPrice = effectiveSim.negotiated_price ?? 0;
  const hasNegotiatedPrice = negoPrice > 0 && negoPrice !== property.purchase_price;
  const effectivePrice = hasNegotiatedPrice ? negoPrice : property.purchase_price;
  const pricePerM2 = property.surface > 0 ? effectivePrice / property.surface : 0;
  const discount = hasNegotiatedPrice
    ? Math.round((1 - negoPrice / property.purchase_price) * 100)
    : 0;

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
      <PropertyHeader property={property} isOwner={isOwner} isLoggedIn={isLoggedIn} onDelete={handleDelete} />

      {/* Hero — KPIs + score */}
      <section ref={heroRef} className="bg-white rounded-xl border border-tiili-border p-4 md:p-6 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  {isOwner && (
                    <div className="mb-2">
                      <StatusSelector propertyId={property.id} currentStatus={(property.property_status || "added") as PropertyStatus} />
                    </div>
                  )}
                  {property.purchase_price > 0 && (
                    <div>
                      {hasNegotiatedPrice ? (
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-bold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                            {formatCurrency(negoPrice)}
                          </p>
                          <p className="text-sm text-gray-400 line-through font-[family-name:var(--font-mono)]">
                            {formatCurrency(property.purchase_price)}
                          </p>
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            -{discount}%
                          </span>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
                          {formatCurrency(property.purchase_price)}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-[13px] text-[#9ca3af] font-medium">
                    {property.property_type === "neuf" ? "Neuf" : "Ancien"} · {property.surface} m²
                    {pricePerM2 > 0 && <> · {formatCurrency(pricePerM2)}/m²</>}
                  </p>
                  {calcs.net_yield > 0 && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => setYieldModalOpen(true)}
                        className={`text-sm font-bold font-[family-name:var(--font-mono)] underline decoration-dotted underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity ${
                          calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {calcs.net_yield.toFixed(2)}% net
                      </button>
                      <button
                        onClick={() => setCashflowModalOpen(true)}
                        className={`text-sm font-bold font-[family-name:var(--font-mono)] underline decoration-dotted underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity ${
                          calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}€/mois
                      </button>
                      {!isBeginner && exitSim.holdingDuration > 0 && (
                        <span className={`text-sm font-bold font-[family-name:var(--font-mono)] ${
                          exitSim.roi >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          ROI {exitSim.roi > 0 ? "+" : ""}{exitSim.roi.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Score brick — click opens score modal */}
                <div onClick={() => setScoreModalOpen(true)}>
                  <ScoreBrick score={property.investment_score} grade={grade} />
                </div>
              </div>
      </section>

      {/* Sticky header (visible only on scroll past hero) */}
      <StickyHeader property={property} calcs={calcs} visible={heroHidden} onCashflowClick={() => setCashflowModalOpen(true)} onYieldClick={() => setYieldModalOpen(true)} />

      {/* Beginner verdict — human-readable summary */}
      {isBeginner && <BeginnerVerdict property={property} calcs={calcs} />}

      {/* Simulation banner — expert only */}
      {!isBeginner && (
        <SimulationBanner
          property={property}
          simulations={simulations}
          activeSim={effectiveSim}
          activeSimId={localActiveSimId}
          isOwner={isOwner}
          isLoggedIn={isLoggedIn}
          onSimSwitch={async (simId) => {
            setLocalActiveSimId(simId);
            setLiveSimFromEditor(null);
            // Only persist the active simulation if the user is the owner
            if (isOwner) {
              const { setActiveSimulationAction } = await import("@/domains/property/actions");
              await setActiveSimulationAction(property.id, simId === "__system__" ? "" : simId);
              router.refresh();
            }
          }}
          onOpenDrawer={() => setSimDrawerOpen(true)}
        />
      )}

      {/* Completeness checklist — only for property owners, expert mode */}
      {isOwner && !isBeginner && <CompletenessChecklist property={property} />}

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
              {property.room_count > 0 && (
                <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Pièces</span>
                  <span className="text-sm font-semibold text-[#1a1a2e]">
                    {property.room_count >= 5 ? "T5+" : `T${property.room_count}`} ({property.room_count} {property.room_count > 1 ? "pièces" : "pièce"})
                  </span>
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

      {/* ═══════════════════ ONGLET FINANCEMENT ═══════════════════ */}
      {activeTab === "financement" && (
        <FinancementTab property={property} isOwner={isOwner} />
      )}

      {/* Simulation drawer (opened from banner) */}
      <SimulationDrawer
        property={property}
        simulations={simulations}
        systemSim={systemSim}
        activeSimId={localActiveSimId}
        isOwner={isOwner}
        open={simDrawerOpen}
        onClose={() => { setSimDrawerOpen(false); setLiveSimFromEditor(null); }}
        onSimSwitch={(simId) => {
          setLocalActiveSimId(simId);
          setLiveSimFromEditor(null);
        }}
        onLiveCalcsChange={setLiveSimFromEditor}
        onCashflowClick={() => setCashflowModalOpen(true)}
        onYieldClick={() => setYieldModalOpen(true)}
        onLoanCostClick={() => setLoanCostModalOpen(true)}
      />

      {/* Expert-only tabs */}
      {!isBeginner && (
        <>
          {/* ═══════════════════ ONGLET TRAVAUX ═══════════════════ */}
          {activeTab === "travaux" && (
            <TravauxTab property={property} isOwner={isOwner} />
          )}

          {/* ═══════════════════ ONGLET ÉQUIPEMENTS ═══════════════════ */}
          {activeTab === "equipements" && (
            <EquipementsTab property={property} marketData={marketData} isOwner={isOwner} />
          )}

          {/* ═══════════════════ ONGLET AMEUBLEMENT LMNP ═══════════════════ */}
          {activeTab === "amenagement" && (
            <AmenagementTab property={property} isOwner={isOwner} />
          )}

          {/* ═══════════════════ ONGLET LOCALITÉ ═══════════════════ */}
          {activeTab === "localite" && (
            <LocaliteTab property={property} isPremium={isPremium} />
          )}
        </>
      )}

      {/* Cashflow breakdown modal — opens on cashflow click */}
      <CashflowBreakdownModal
        open={cashflowModalOpen}
        onClose={() => setCashflowModalOpen(false)}
        property={property}
        simulation={effectiveSim}
        calcs={calcs}
      />

      {/* Yield breakdown modal — opens on renta click */}
      <YieldBreakdownModal
        open={yieldModalOpen}
        onClose={() => setYieldModalOpen(false)}
        property={property}
        simulation={effectiveSim}
        calcs={calcs}
      />

      {/* Loan cost breakdown modal — opens on coût crédit click */}
      <LoanCostBreakdownModal
        open={loanCostModalOpen}
        onClose={() => setLoanCostModalOpen(false)}
        property={property}
        simulation={effectiveSim}
        calcs={calcs}
      />

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
            <AiEvaluationSection
              propertyId={property.id}
              evaluation={aiEvaluation}
              evaluatedAt={property.ai_evaluation_at}
              isPremium={isPremium}
            />
          </div>
        </div>
      )}
    </div>
  );
}
