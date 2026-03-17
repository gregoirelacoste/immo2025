"use client";

import { useState, useEffect } from "react";
import { Property } from "@/domains/property/types";
import type { LocalityDataFields } from "@/domains/locality/types";
import { fetchLocalityFields } from "@/domains/locality/actions";
import LocalityDataView from "@/components/locality/LocalityDataView";

interface Props {
  property: Property;
}

export default function LocaliteTab({ property }: Props) {
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState<string | null>(null);
  const [fields, setFields] = useState<LocalityDataFields | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await fetchLocalityFields(property.city, property.postal_code || undefined);
      if (cancelled) return;
      if (result) {
        setCityName(result.cityName);
        setFields(result.fields);
      }
      setLoading(false);
    }
    if (property.city) load();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [property.city, property.postal_code]);

  const pricePerM2 = property.surface > 0 ? property.purchase_price / property.surface : null;
  const rentPerM2 = property.monthly_rent > 0 && property.surface > 0
    ? property.monthly_rent / property.surface
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 mt-4">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Chargement des données localité...</span>
      </div>
    );
  }

  if (!fields) {
    return (
      <div className="text-center py-12 mt-4 text-gray-400 text-sm">
        Aucune donnée de localité disponible pour {property.city || "cette ville"}.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <LocalityDataView
        cityName={cityName || property.city}
        fields={fields}
        propertyComparison={{ pricePerM2, rentPerM2 }}
      />
    </div>
  );
}
