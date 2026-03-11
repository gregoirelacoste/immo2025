"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Property } from "@/domains/property/types";
import { calculateAll } from "@/lib/calculations";
import { removeProperty } from "@/domains/property/actions";
import { useMarketData } from "./useMarketData";
import { useGeocoding } from "./useGeocoding";
import PropertyHeader from "./PropertyHeader";
import PropertyGallery from "./PropertyGallery";
import PropertyInfoPanel from "./PropertyInfoPanel";
import MarketDataPanel from "./MarketDataPanel";
import FinancingPanel from "./FinancingPanel";
import ClassicYieldPanel from "./ClassicYieldPanel";
import AirbnbYieldPanel from "./AirbnbYieldPanel";
import RescrapePanel from "./RescrapePanel";

const PropertyMap = dynamic(() => import("./PropertyMap"), { ssr: false });

interface Props {
  property: Property;
  isOwner?: boolean;
}

export default function PropertyDetail({ property, isOwner = false }: Props) {
  const router = useRouter();
  const calcs = calculateAll(property);
  const { data: marketData, loading: marketLoading } = useMarketData(property.city);
  const { coords } = useGeocoding(property.address, property.city);

  async function handleDelete() {
    if (!confirm("Supprimer ce bien ?")) return;
    const result = await removeProperty(property.id);
    if (!result.success) {
      alert(result.error ?? "Erreur lors de la suppression.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6 pb-safe">
      <PropertyHeader property={property} isOwner={isOwner} onDelete={handleDelete} />
      <PropertyGallery imageUrls={property.image_urls} city={property.city} />
      {coords && (
        <PropertyMap
          latitude={coords.latitude}
          longitude={coords.longitude}
          address={property.address}
          city={property.city}
        />
      )}
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
