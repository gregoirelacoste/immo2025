"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { calculateAll } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { refreshEnrichment } from "@/domains/enrich/actions";
import type { MarketData } from "@/domains/market/types";
import PropertyHeader from "./PropertyHeader";
import PropertyGallery from "./PropertyGallery";
import PropertyInfoPanel from "./PropertyInfoPanel";
import MarketDataPanel from "./MarketDataPanel";
import InvestmentScorePanel from "./InvestmentScorePanel";
import FinancingPanel from "./FinancingPanel";
import ClassicYieldPanel from "./ClassicYieldPanel";
import AirbnbYieldPanel from "./AirbnbYieldPanel";
import RescrapePanel from "./RescrapePanel";

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

  // Use persisted enrichment data
  const marketData: MarketData | null = parseJson(property.market_data, null);
  const scoreBreakdown = parseJson(property.score_breakdown, null);

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
    <div className="space-y-6 pb-safe">
      <PropertyHeader property={property} isOwner={isOwner} onDelete={handleDelete} />
      <PropertyGallery imageUrls={property.image_urls} city={property.city} />

      {/* Investment Score — prominent position */}
      <InvestmentScorePanel
        score={property.investment_score}
        breakdown={scoreBreakdown}
        status={property.enrichment_status}
        error={property.enrichment_error}
        onRefresh={handleRefreshEnrichment}
        refreshing={refreshing}
      />

      {property.latitude != null && property.longitude != null && (
        <PropertyMap
          latitude={property.latitude}
          longitude={property.longitude}
          address={property.address}
          city={property.city}
        />
      )}

      <PropertyInfoPanel property={property} />

      {/* Market data — separate panel */}
      <MarketDataPanel property={property} marketData={marketData} loading={property.enrichment_status === "running"} />

      <FinancingPanel property={property} calcs={calcs} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <ClassicYieldPanel property={property} calcs={calcs} />
        <AirbnbYieldPanel property={property} calcs={calcs} />
      </div>
      <RescrapePanel property={property} isOwner={isOwner} />
    </div>
  );
}
