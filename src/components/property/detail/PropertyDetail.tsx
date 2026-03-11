"use client";

import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { calculateAll } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { useMarketData } from "./useMarketData";
import PropertyHeader from "./PropertyHeader";
import PropertyGallery from "./PropertyGallery";
import PropertyInfoPanel from "./PropertyInfoPanel";
import MarketDataPanel from "./MarketDataPanel";
import FinancingPanel from "./FinancingPanel";
import ClassicYieldPanel from "./ClassicYieldPanel";
import AirbnbYieldPanel from "./AirbnbYieldPanel";
import RescrapePanel from "./RescrapePanel";

interface Props {
  property: Property;
  isOwner?: boolean;
}

export default function PropertyDetail({ property, isOwner = false }: Props) {
  const router = useRouter();
  const calcs = calculateAll(property);
  const { data: marketData, loading: marketLoading } = useMarketData(property.city);

  async function handleDelete() {
    if (!confirm("Supprimer ce bien ?")) return;
    await removeProperty(property.id);
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6 pb-safe">
      <PropertyHeader property={property} isOwner={isOwner} onDelete={handleDelete} />
      <PropertyGallery imageUrls={property.image_urls} city={property.city} />
      <PropertyInfoPanel property={property} />
      <MarketDataPanel property={property} marketData={marketData} loading={marketLoading} />
      <FinancingPanel property={property} calcs={calcs} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <ClassicYieldPanel property={property} calcs={calcs} />
        <AirbnbYieldPanel property={property} calcs={calcs} />
      </div>
      <RescrapePanel property={property} isOwner={isOwner} />
    </div>
  );
}
