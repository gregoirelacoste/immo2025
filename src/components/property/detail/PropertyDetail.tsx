"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Property, type PropertyStatus } from "@/domains/property/types";
import { calculateAll, calculateSimulation, formatCurrency } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
import type { MarketData } from "@/domains/market/types";
import type { SocioEconomicData } from "@/domains/enrich/socioeconomic-types";
import type { InvestmentScoreBreakdown } from "@/domains/enrich/types";
import { parseAmenities, AMENITY_LABELS, AMENITY_ICONS } from "@/domains/property/amenities";
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
}

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback; }
  catch { return fallback; }
}

export default function PropertyDetail({ property, isOwner = false, userProfile, photos = [], simulations = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Use first simulation's data for KPIs if available, otherwise fall back to property data
  const firstSim = simulations.length > 0 ? simulations[0] : null;
  const calcs = firstSim ? calculateSimulation(property, firstSim) : calculateAll(property);
  const [refreshing, setRefreshing] = useState(false);

  const activeTab = (searchParams.get("tab") as TabId) || "bien";

  const marketData = parseJson<MarketData | null>(property.market_data, null);
  const scoreBreakdown = parseJson<InvestmentScoreBreakdown | null>(property.score_breakdown, null);
  const socioData = parseJson<SocioEconomicData | null>(property.socioeconomic_data, null);
  const amenities = parseAmenities(property.amenities);
  const images: string[] = parseJson(property.image_urls, []);

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
                {/* Score circle */}
                <div
                  className={`w-[52px] h-[52px] rounded-full ${grade.bg} flex flex-col items-center justify-center shrink-0`}
                  style={{ border: `2.5px solid ${grade.hex}` }}
                >
                  <span className={`text-[8px] font-bold ${grade.color} leading-none mb-0.5`}>{grade.letter}</span>
                  <span className={`text-lg font-extrabold ${grade.color} leading-none`}>
                    {property.investment_score ?? "?"}
                  </span>
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
              {property.renovation_cost > 0 && (
                <div>
                  <span className="text-gray-500">Travaux</span>
                  <p className="font-semibold text-orange-600">{formatCurrency(property.renovation_cost)}</p>
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

            {amenities.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((key) => (
                    <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-100">
                      <span>{AMENITY_ICONS[key]}</span>
                      <span>{AMENITY_LABELS[key]}</span>
                    </span>
                  ))}
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

          {/* Données marché */}
          <CollapsibleSection title="Données du marché" variant="emerald" defaultOpen={!!marketData}>
            <MarketDataPanel property={property} marketData={marketData} loading={property.enrichment_status === "running"} />
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

      {/* ═══════════════════ ONGLET VISITE ═══════════════════ */}
      {activeTab === "visite" && (
        <div className="space-y-4 mt-4">
          <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6 text-center">
            <Link
              href={`/property/${property.id}/visit`}
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
      )}
    </div>
  );
}
