/**
 * DVF (Demandes de Valeurs Foncières) data collection.
 * Source: Cerema DVF OpenData API (apidf-preprod.cerema.fr) — no auth required.
 * Fallback from api.cquest.org which is frequently down.
 */

import { DvfCityData } from "./types";

interface CeremaMutation {
  datemut: string;
  valeurfonc: string;
  sbati: string;
  libtypbien: string;
  libnatmut: string;
}

interface CeremaResponse {
  count: number;
  results: CeremaMutation[];
  next: string | null;
}

const CEREMA_API = "https://apidf-preprod.cerema.fr/dvf_opendata/mutations/";

/**
 * Fetch and aggregate DVF data for a city.
 * Computes avg/median price per m2 + segmented by property type + 1-year trend.
 */
export async function fetchDvfData(
  codeInsee: string,
  options?: { anneeMin?: number }
): Promise<DvfCityData> {
  const empty: DvfCityData = {
    avgPricePerM2: null,
    medianPricePerM2: null,
    transactionCount: 0,
    avgPriceStudioPerM2: null,
    avgPriceSmallAptPerM2: null,
    avgPriceLargeAptPerM2: null,
    avgPriceHousePerM2: null,
    priceTrend1yPct: null,
    pricePerM2Min: null,
    pricePerM2Max: null,
    lastMutationDate: null,
  };

  const anneeMin = options?.anneeMin ?? new Date().getFullYear() - 2;

  // Fetch up to 200 recent sales (2 pages of 100 to stay under timeout)
  const params = new URLSearchParams({
    code_insee: codeInsee,
    libnatmut: "Vente",
    anneemut_min: String(anneeMin),
    page_size: "100",
    ordering: "-datemut",
  });

  const url = `${CEREMA_API}?${params}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`DVF Cerema ${res.status} for ${codeInsee}`);
  }

  const data: CeremaResponse = await res.json();
  let allResults = data.results;

  // Fetch page 2 if available (get up to 200 mutations total)
  if (data.next) {
    try {
      const res2 = await fetch(data.next.replace("http://", "https://"), {
        signal: AbortSignal.timeout(10_000),
      });
      if (res2.ok) {
        const data2: CeremaResponse = await res2.json();
        allResults = [...allResults, ...data2.results];
      }
    } catch {
      // Non-blocking — first page is enough
    }
  }

  const mutations = allResults.filter((m) => {
    const surface = parseFloat(m.sbati);
    const price = parseFloat(m.valeurfonc);
    return surface > 0 && price > 0;
  });

  if (mutations.length === 0) return empty;

  // Compute price per m²
  const withPrice = mutations.map((m) => ({
    ...m,
    pricePerM2: parseFloat(m.valeurfonc) / parseFloat(m.sbati),
    surface: parseFloat(m.sbati),
  }));

  // Exclude outliers (P5-P95)
  const prices = withPrice.map((m) => m.pricePerM2).sort((a, b) => a - b);
  const p5 = prices[Math.floor(prices.length * 0.05)];
  const p95 = prices[Math.floor(prices.length * 0.95)];
  const cleaned = withPrice.filter(
    (m) => m.pricePerM2 >= p5 && m.pricePerM2 <= p95
  );

  if (cleaned.length === 0) return empty;

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const median = (arr: number[]) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const round = (v: number | null) => (v != null ? Math.round(v) : null);

  const allPrices = cleaned.map((m) => m.pricePerM2);

  // By property type (Cerema uses libtypbien)
  const isApt = (m: typeof cleaned[0]) => m.libtypbien?.includes("APPARTEMENT");
  const isHouse = (m: typeof cleaned[0]) => m.libtypbien?.includes("MAISON");
  const studios = cleaned.filter((m) => isApt(m) && m.surface <= 35);
  const smallApts = cleaned.filter((m) => isApt(m) && m.surface > 35 && m.surface <= 70);
  const largeApts = cleaned.filter((m) => isApt(m) && m.surface > 70);
  const houses = cleaned.filter((m) => isHouse(m));

  // 1-year trend
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const recentPrices = cleaned
    .filter((m) => new Date(m.datemut) >= oneYearAgo)
    .map((m) => m.pricePerM2);
  const previousPrices = cleaned
    .filter((m) => {
      const d = new Date(m.datemut);
      return d >= twoYearsAgo && d < oneYearAgo;
    })
    .map((m) => m.pricePerM2);

  const avgRecent = avg(recentPrices);
  const avgPrevious = avg(previousPrices);
  const trend =
    avgRecent && avgPrevious
      ? Math.round(((avgRecent - avgPrevious) / avgPrevious) * 1000) / 10
      : null;

  return {
    avgPricePerM2: round(avg(allPrices)),
    medianPricePerM2: round(median(allPrices)),
    transactionCount: data.count,
    avgPriceStudioPerM2: round(avg(studios.map((m) => m.pricePerM2))),
    avgPriceSmallAptPerM2: round(avg(smallApts.map((m) => m.pricePerM2))),
    avgPriceLargeAptPerM2: round(avg(largeApts.map((m) => m.pricePerM2))),
    avgPriceHousePerM2: round(avg(houses.map((m) => m.pricePerM2))),
    priceTrend1yPct: trend,
    pricePerM2Min: round(p5),
    pricePerM2Max: round(p95),
    lastMutationDate: cleaned[0]?.datemut ?? null,
  };
}
