"use client";

import { useState, useEffect } from "react";
import { forwardGeocode } from "@/domains/collect/geocoding";

interface GeoResult {
  latitude: number;
  longitude: number;
}

export function useGeocoding(address: string, city: string): { coords: GeoResult | null; loading: boolean } {
  const [coords, setCoords] = useState<GeoResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address && !city) return;

    const query = address || city;
    setLoading(true);
    forwardGeocode(query, city || undefined)
      .then((result) => setCoords(result))
      .finally(() => setLoading(false));
  }, [address, city]);

  return { coords, loading };
}
