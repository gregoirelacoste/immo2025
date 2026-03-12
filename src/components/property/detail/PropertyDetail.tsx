"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Property, type PropertyStatus } from "@/domains/property/types";
import { calculateAll, formatCurrency, formatPercent } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
import type { MarketData } from "@/domains/market/types";
import type { SocioEconomicData } from "@/domains/enrich/socioeconomic-types";
import { parseAmenities, AMENITY_LABELS, AMENITY_ICONS } from "@/domains/property/amenities";
import PropertyHeader from "./PropertyHeader";
import InvestmentScorePanel from "./InvestmentScorePanel";
import MarketDataPanel from "./MarketDataPanel";
import SocioEconomicPanel from "./SocioEconomicPanel";
import RescrapePanel from "./RescrapePanel";
import StatusSelector from "@/components/property/StatusSelector";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

const PropertyMap = dynamic(() => import("./PropertyMap"), { ssr: false });

interface Props {
  property: Property;
  isOwner?: boolean;
}

function parseJson<T>(json: string, fallback: T): T {
  try { return json ? JSON.parse(json) : fallback; }
  catch { return fallback; }
}

export default function PropertyDetail({ property, isOwner = false }: Props) {
  const router = useRouter();
  const calcs = calculateAll(property);
  const [refreshing, setRefreshing] = useState(false);

  const marketData = parseJson<MarketData | null>(property.market_data, null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoreBreakdown = parseJson<any>(property.score_breakdown, null);
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

  return (
    <div className="space-y-4 pb-safe">
      <PropertyHeader property={property} isOwner={isOwner} onDelete={handleDelete} />

      {/* ════════════════════════════════════════════
          NIVEAU 1 — Hero : KPIs critiques (above the fold)
          ════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-4 md:p-6">
        {/* Ligne 1 : Ville + Prix + Surface */}
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{property.city}</h2>
              <StatusSelector propertyId={property.id} currentStatus={(property.property_status || "added") as PropertyStatus} />
            </div>
            {property.address && (
              <p className="text-sm text-gray-500">{property.address}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-gray-900">{formatCurrency(property.purchase_price)}</p>
            <p className="text-sm text-gray-500">{property.surface} m²</p>
          </div>
        </div>

        {/* Ligne 2 : KPIs investisseur — les 4 métriques clés */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Rendement net classique */}
          <div className="bg-white rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-gray-500">Renta nette</p>
            <p className={`text-xl font-bold ${calcs.net_yield >= 6 ? "text-green-600" : calcs.net_yield >= 4 ? "text-blue-600" : calcs.net_yield >= 2 ? "text-amber-600" : "text-red-600"}`}>
              {formatPercent(calcs.net_yield)}
            </p>
          </div>

          {/* Cash-flow mensuel */}
          <div className="bg-white rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-gray-500">Cash-flow / mois</p>
            <p className={`text-xl font-bold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(calcs.monthly_cashflow)}
            </p>
          </div>

          {/* Airbnb rendement (si renseigné) ou mensualité */}
          {property.airbnb_price_per_night > 0 ? (
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-gray-500">Renta Airbnb</p>
              <p className={`text-xl font-bold ${calcs.airbnb_net_yield >= 6 ? "text-green-600" : calcs.airbnb_net_yield >= 4 ? "text-blue-600" : "text-amber-600"}`}>
                {formatPercent(calcs.airbnb_net_yield)}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-xs text-gray-500">Mensualite</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(calcs.monthly_payment + calcs.monthly_insurance)}
              </p>
            </div>
          )}

          {/* Score d'investissement compact */}
          <div className={`rounded-lg p-3 border ${
            property.investment_score == null ? "bg-white border-slate-100" :
            property.investment_score >= 71 ? "bg-green-50 border-green-200" :
            property.investment_score >= 51 ? "bg-blue-50 border-blue-200" :
            property.investment_score >= 31 ? "bg-amber-50 border-amber-200" :
            "bg-red-50 border-red-200"
          }`}>
            <p className="text-xs text-gray-500">Score</p>
            <p className={`text-xl font-bold ${
              property.investment_score == null ? "text-gray-400" :
              property.investment_score >= 71 ? "text-green-600" :
              property.investment_score >= 51 ? "text-blue-600" :
              property.investment_score >= 31 ? "text-amber-600" :
              "text-red-600"
            }`}>
              {property.investment_score != null ? `${property.investment_score}/100` : "..."}
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          NIVEAU 2 — Infos importantes (visible, pas de clic)
          ════════════════════════════════════════════ */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Prix au m²</span>
            <p className="font-semibold">{pricePerM2 > 0 ? formatCurrency(pricePerM2) : "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">Loyer / m²</span>
            <p className="font-semibold">{property.rent_per_m2 > 0 ? `${property.rent_per_m2.toFixed(1)} €` : "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">Loyer mensuel</span>
            <p className="font-semibold">{property.monthly_rent > 0 ? formatCurrency(property.monthly_rent) : "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">Type</span>
            <p className="font-semibold capitalize">{property.property_type}</p>
          </div>
          <div>
            <span className="text-gray-500">Ecart marche</span>
            <p className={`font-semibold ${
              marketDiff == null ? "text-gray-400" :
              marketDiff <= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {marketDiff != null ? `${marketDiff > 0 ? "+" : ""}${marketDiff.toFixed(1)}%` : "—"}
            </p>
          </div>
          {property.airbnb_price_per_night > 0 && (
            <>
              <div>
                <span className="text-gray-500">CF Airbnb / mois</span>
                <p className={`font-semibold ${calcs.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(calcs.airbnb_monthly_cashflow)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Mensualite pret</span>
                <p className="font-semibold">{formatCurrency(calcs.monthly_payment + calcs.monthly_insurance)}</p>
              </div>
            </>
          )}
        </div>

        {/* Equipements (niveau 2, inline) */}
        {amenities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  <span>{AMENITY_ICONS[key]}</span>
                  <span>{AMENITY_LABELS[key]}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════
          NIVEAU 2 — Score investissement (breakdown detail)
          ════════════════════════════════════════════ */}
      <InvestmentScorePanel
        score={property.investment_score}
        breakdown={scoreBreakdown}
        status={property.enrichment_status}
        error={property.enrichment_error}
        onRefresh={handleRefreshEnrichment}
        refreshing={refreshing}
      />

      {/* ════════════════════════════════════════════
          NIVEAU 3 — Sections repliables (1 clic)
          ════════════════════════════════════════════ */}

      <CollapsibleSection title="Financement">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Montant emprunte</span>
            <p className="font-semibold">{formatCurrency(property.loan_amount)}</p>
          </div>
          <div>
            <span className="text-gray-500">Taux d&apos;interet</span>
            <p className="font-semibold">{property.interest_rate} %</p>
          </div>
          <div>
            <span className="text-gray-500">Duree</span>
            <p className="font-semibold">{property.loan_duration} ans</p>
          </div>
          <div>
            <span className="text-gray-500">Apport</span>
            <p className="font-semibold">{formatCurrency(property.personal_contribution)}</p>
          </div>
          <div>
            <span className="text-gray-500">Mensualite credit</span>
            <p className="font-semibold">{formatCurrency(calcs.monthly_payment)}</p>
          </div>
          <div>
            <span className="text-gray-500">Assurance / mois</span>
            <p className="font-semibold">{formatCurrency(calcs.monthly_insurance)}</p>
          </div>
          <div>
            <span className="text-gray-500">Frais de notaire</span>
            <p className="font-semibold">{formatCurrency(calcs.total_notary_fees)}</p>
          </div>
          <div>
            <span className="text-gray-500">Cout total du credit</span>
            <p className="font-semibold">{formatCurrency(calcs.total_loan_cost)}</p>
          </div>
          <div>
            <span className="text-gray-500">Cout total projet</span>
            <p className="font-semibold text-indigo-600">{formatCurrency(calcs.total_project_cost)}</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Location classique" variant="blue">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Loyer mensuel</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(property.monthly_rent)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Revenu annuel net</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(calcs.annual_rent_income)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Rentabilite brute</p>
            <p className="text-lg font-bold text-gray-900">{formatPercent(calcs.gross_yield)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Rentabilite nette</p>
            <p className="text-lg font-bold text-gray-900">{formatPercent(calcs.net_yield)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Cash-flow / mois</p>
            <p className={`text-lg font-bold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(calcs.monthly_cashflow)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Charges annuelles</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(calcs.annual_charges)}</p>
          </div>
        </div>
      </CollapsibleSection>

      {property.airbnb_price_per_night > 0 && (
        <CollapsibleSection title="Airbnb" variant="purple">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Prix / nuit</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(property.airbnb_price_per_night)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Revenu annuel</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(calcs.airbnb_annual_income)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Rentabilite brute</p>
              <p className="text-lg font-bold text-gray-900">{formatPercent(calcs.airbnb_gross_yield)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Rentabilite nette</p>
              <p className="text-lg font-bold text-gray-900">{formatPercent(calcs.airbnb_net_yield)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Cash-flow / mois</p>
              <p className={`text-lg font-bold ${calcs.airbnb_monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(calcs.airbnb_monthly_cashflow)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Charges annuelles</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(calcs.airbnb_annual_charges)}</p>
            </div>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Donnees du marche" variant="emerald" defaultOpen={!!marketData}>
        <MarketDataPanel property={property} marketData={marketData} loading={property.enrichment_status === "running"} />
      </CollapsibleSection>

      {/* ════════════════════════════════════════════
          NIVEAU 4 — Contextuel (replie par defaut)
          ════════════════════════════════════════════ */}

      {images.length > 0 && (
        <CollapsibleSection title={`Photos (${images.length})`}>
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 md:-mx-6 md:px-6 pb-2">
            {images.map((url: string, i: number) => (
              <div key={i} className="snap-center shrink-0 w-[85%] md:w-auto md:max-w-[400px] aspect-[4/3] relative bg-gray-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1} — ${property.city}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {property.description && (
        <CollapsibleSection title="Description">
          <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
        </CollapsibleSection>
      )}

      {property.latitude != null && property.longitude != null && (
        <CollapsibleSection title="Carte">
          <div className="rounded-lg overflow-hidden -mx-4 md:-mx-6">
            <PropertyMap
              latitude={property.latitude}
              longitude={property.longitude}
              address={property.address}
              city={property.city}
            />
          </div>
        </CollapsibleSection>
      )}

      {socioData && (
        <CollapsibleSection title="Donnees socio-economiques" variant="violet">
          <SocioEconomicPanel data={socioData} />
        </CollapsibleSection>
      )}

      {/* ════════════════════════════════════════════
          NIVEAU 5 — Technique
          ════════════════════════════════════════════ */}
      <RescrapePanel property={property} isOwner={isOwner} />
    </div>
  );
}
