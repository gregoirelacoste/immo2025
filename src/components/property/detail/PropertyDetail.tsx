"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Property, type PropertyStatus } from "@/domains/property/types";
import { calculateSimulation, calculateAll, formatCurrency } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
import type { MarketData } from "@/domains/market/types";
import type { SocioEconomicData } from "@/domains/enrich/socioeconomic-types";
import type { InvestmentScoreBreakdown } from "@/domains/enrich/types";
import { parseAmenities } from "@/domains/property/amenities";
import type { Equipment } from "@/domains/property/equipment-service";
import { getGrade, rentaColor, cashflowColor, getVerdict, verdictColor } from "@/lib/grade";
import Link from "next/link";
import PropertyHeader from "./PropertyHeader";
import InvestmentScorePanel from "./InvestmentScorePanel";
import MarketDataPanel from "./MarketDataPanel";
import SocioEconomicPanel from "./SocioEconomicPanel";
import StatusSelector from "@/components/property/StatusSelector";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import TabNavigation, { type TabId } from "./TabNavigation";
import StickyHeader from "./StickyHeader";
import BudgetIndicator from "@/components/property/BudgetIndicator";
import SimulationTab from "./SimulationTab";
import TravauxTab from "./TravauxTab";
import EquipementsTab from "./EquipementsTab";
import CompletionBadge from "./CompletionBadge";
import { getCompletionSummary } from "@/domains/property/completion";
import { getFieldsByCategory, isFieldFilled } from "@/domains/property/field-registry";
import InlineFieldEditor from "./InlineFieldEditor";
import type { UserProfile } from "@/domains/auth/types";
import type { Photo } from "@/domains/photo/types";
import type { Simulation } from "@/domains/simulation/types";
import PhotoGallery from "./PhotoGallery";

const PropertyMap = dynamic(() => import("./PropertyMap"), { ssr: false });

interface Props {
  property: Property;
  isOwner?: boolean;
  userProfile?: UserProfile | null;
  photos?: Photo[];
  simulations?: Simulation[];
  equipments?: Equipment[];
}

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback; }
  catch { return fallback; }
}

export default function PropertyDetail({ property, isOwner = false, userProfile, photos = [], simulations = [], equipments = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Use first simulation's data for KPIs if available, otherwise fall back to property data
  const firstSim = simulations.length > 0 ? simulations[0] : null;
  const calcs = useMemo(
    () => firstSim ? calculateSimulation(property, firstSim) : calculateAll(property),
    [property, firstSim]
  );
  const [refreshing, setRefreshing] = useState(false);

  const activeTab = (searchParams.get("tab") as TabId) || "bien";

  const marketData = useMemo(() => parseJson<MarketData | null>(property.market_data, null), [property.market_data]);
  const scoreBreakdown = useMemo(() => parseJson<InvestmentScoreBreakdown | null>(property.score_breakdown, null), [property.score_breakdown]);
  const socioData = useMemo(() => parseJson<SocioEconomicData | null>(property.socioeconomic_data, null), [property.socioeconomic_data]);
  const amenities = useMemo(() => parseAmenities(property.amenities), [property.amenities]);
  const eqMap = useMemo(() => new Map(equipments.map((e) => [e.key, e])), [equipments]);
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

      {/* Hero KPIs — tiili style */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6 mb-4">
              {/* Header: City + Score circle */}
              <div className="flex justify-between items-start mb-4">
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
                  <BudgetIndicator monthlyPayment={calcs.monthly_payment} monthlyInsurance={calcs.monthly_insurance} userProfile={userProfile} />
                </div>
                {/* Score circle + completion badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <CompletionBadge percent={completionSummary.globalPercent} size="sm" />
                  <div
                    className={`w-[52px] h-[52px] rounded-full ${grade.bg} flex flex-col items-center justify-center`}
                    style={{ border: `2.5px solid ${grade.hex}` }}
                  >
                    <span className={`text-[8px] font-bold ${grade.color} leading-none mb-0.5`}>{grade.letter}</span>
                    <span className={`text-lg font-extrabold ${grade.color} leading-none`}>
                      {property.investment_score ?? "?"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics grid 2x2 */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-3 bg-tiili-surface rounded-xl">
                  <div className="text-xl font-extrabold text-[#1a1a2e] tracking-tight leading-tight mb-0.5">
                    {formatCurrency(property.purchase_price)}
                  </div>
                  <div className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-wider">Prix</div>
                </div>
                <div className="p-3 bg-tiili-surface rounded-xl">
                  <div className={`text-[22px] font-extrabold font-[family-name:var(--font-mono)] tracking-tighter leading-tight mb-0.5 ${rentaColor(calcs.net_yield)}`}>
                    {calcs.net_yield.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-wider">Renta nette</div>
                </div>
                <div className="p-3 bg-tiili-surface rounded-xl">
                  <div className={`text-[22px] font-extrabold font-[family-name:var(--font-mono)] tracking-tighter leading-tight mb-0.5 ${cashflowColor(calcs.monthly_cashflow)}`}>
                    {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}€
                  </div>
                  <div className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-wider">Cashflow /mois</div>
                </div>
                <div className="p-3 bg-tiili-surface rounded-xl">
                  <div className="text-xl font-extrabold text-gray-700 tracking-tight leading-tight mb-0.5">
                    {pricePerM2 > 0 ? `${Math.round(pricePerM2).toLocaleString("fr-FR")}\u202f€` : "\u2014"}
                  </div>
                  <div className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-wider">Prix /m²</div>
                </div>
              </div>

              {/* Quick verdict bar */}
              <div className="flex gap-1">
                {getVerdict(property.purchase_price, calcs.net_yield, calcs.monthly_cashflow, property.investment_score).map(({ label, val }) => {
                  const vc = verdictColor(val);
                  return (
                    <div key={label} className={`flex-1 text-center py-1.5 rounded-lg ${vc.bg}`}>
                      <div className={`text-xs font-bold ${vc.text}`}>
                        {val === 1 ? "\u2713" : val === 0 ? "~" : "\u2717"}
                      </div>
                      <div className="text-[8px] font-semibold text-[#9ca3af] uppercase tracking-wide mt-0.5">{label}</div>
                    </div>
                  );
                })}
              </div>
      </section>

      {/* Sticky header (visible on scroll) */}
      <StickyHeader property={property} calcs={calcs} />

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
              {property.dpe_rating && (
                <div>
                  <span className="text-gray-500">DPE</span>
                  <p className={`font-semibold ${property.dpe_rating === "F" || property.dpe_rating === "G" ? "text-red-600" : ""}`}>
                    {property.dpe_rating}
                  </p>
                </div>
              )}
            </div>

            {/* Données financières du bien */}
            {(property.monthly_rent > 0 || property.condo_charges > 0 || property.property_tax > 0) && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {property.monthly_rent > 0 && (
                    <div>
                      <span className="text-gray-500">Loyer</span>
                      <p className="font-semibold">{formatCurrency(property.monthly_rent)}/mois</p>
                    </div>
                  )}
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

            {amenities.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((key) => {
                    const eq = eqMap.get(key);
                    return (
                      <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-100">
                        <span>{eq?.icon ?? "🏠"}</span>
                        <span>{eq?.label ?? key}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
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

          {/* Données marché */}
          <CollapsibleSection title="Données du marché" variant="emerald" defaultOpen={!!marketData}>
            <MarketDataPanel property={property} marketData={marketData} loading={property.enrichment_status === "running"} monthlyRent={firstSim?.monthly_rent} />
          </CollapsibleSection>

          {/* Données socio-éco */}
          {socioData && (
            <CollapsibleSection title="Données socio-économiques" variant="violet" defaultOpen>
              <SocioEconomicPanel data={socioData} />
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

      {/* ═══════════════════ ONGLET SCORE ═══════════════════ */}
      {activeTab === "score" && (
        <div className="space-y-4 mt-4">
          <InvestmentScorePanel
            score={property.investment_score}
            breakdown={scoreBreakdown}
            status={property.enrichment_status}
            error={property.enrichment_error}
            onRefresh={handleRefreshEnrichment}
            refreshing={refreshing}
          />
        </div>
      )}

      {/* ═══════════════════ ONGLET TRAVAUX ═══════════════════ */}
      {activeTab === "travaux" && (
        <TravauxTab property={property} />
      )}

      {/* ═══════════════════ ONGLET ÉQUIPEMENTS ═══════════════════ */}
      {activeTab === "equipements" && (
        <EquipementsTab property={property} marketData={marketData} />
      )}
    </div>
  );
}
