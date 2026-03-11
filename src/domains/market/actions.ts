"use server";

import { getMarketData } from "@/domains/market/service";
import { MarketData } from "@/domains/market/types";

export async function fetchMarketDataForCity(
  city: string
): Promise<MarketData | null> {
  return getMarketData(city);
}
