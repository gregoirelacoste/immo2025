"use client";

import { Property } from "@/domains/property/types";
import type { MarketData } from "@/domains/market/types";
import type { SocioEconomicData } from "@/domains/enrich/socioeconomic-types";
import MarketDataPanel from "./MarketDataPanel";
import SocioEconomicPanel from "./SocioEconomicPanel";

interface Props {
  property: Property;
  marketData: MarketData | null;
  socioData: SocioEconomicData | null;
  monthlyRent?: number;
}

function fmt(n: number | null | undefined, suffix = ""): string {
  if (n == null) return "\u2014";
  return n.toLocaleString("fr-FR") + suffix;
}

function ComparisonRow({ label, propertyValue, marketValue, unit, lowerIsBetter = false }: {
  label: string;
  propertyValue: number | null;
  marketValue: number | null;
  unit: string;
  lowerIsBetter?: boolean;
}) {
  if (propertyValue == null || marketValue == null || marketValue === 0) return null;
  const diff = ((propertyValue - marketValue) / marketValue) * 100;
  const isGood = lowerIsBetter ? diff <= 0 : diff >= 0;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#1a1a2e] font-[family-name:var(--font-mono)]">
          {fmt(Math.round(propertyValue), ` ${unit}`)}
        </span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          isGood ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        }`}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-400">
          vs {fmt(Math.round(marketValue), ` ${unit}`)}
        </span>
      </div>
    </div>
  );
}

export default function LocaliteTab({ property, marketData, socioData, monthlyRent }: Props) {
  const pricePerM2 = property.surface > 0 ? property.purchase_price / property.surface : null;
  const rentPerM2 = property.monthly_rent > 0 && property.surface > 0
    ? property.monthly_rent / property.surface
    : null;

  const hasComparison = pricePerM2 != null || rentPerM2 != null;

  return (
    <div className="space-y-4 mt-4">
      {/* Property vs Market comparison */}
      {hasComparison && (marketData?.avgPurchasePricePerM2 || marketData?.avgRentPerM2) && (
        <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Votre bien vs le marché</h3>
          <div className="space-y-0">
            <ComparisonRow
              label="Prix au m²"
              propertyValue={pricePerM2}
              marketValue={marketData?.medianPurchasePricePerM2 ?? marketData?.avgPurchasePricePerM2 ?? null}
              unit="€/m²"
              lowerIsBetter
            />
            <ComparisonRow
              label="Loyer au m²"
              propertyValue={rentPerM2}
              marketValue={marketData?.avgRentPerM2 ?? null}
              unit="€/m²"
            />
          </div>
        </section>
      )}

      {/* Market data */}
      <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Données du marché</h3>
        <MarketDataPanel
          property={property}
          marketData={marketData}
          loading={property.enrichment_status === "running"}
          monthlyRent={monthlyRent}
        />
      </section>

      {/* Socio-economic data */}
      {socioData && (
        <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Données socio-économiques</h3>
          <SocioEconomicPanel data={socioData} />
        </section>
      )}

      {!marketData && !socioData && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Aucune donnée de localité disponible pour {property.city || "cette ville"}.
        </div>
      )}
    </div>
  );
}
