"use client";

import { useState, useEffect } from "react";
import { fetchMarketDataForCity } from "@/domains/market/actions";
import type { MarketData } from "@/domains/market/types";

export function useMarketData(city: string): { data: MarketData | null; loading: boolean } {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (city) {
      fetchMarketDataForCity(city)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [city]);

  return { data, loading };
}
