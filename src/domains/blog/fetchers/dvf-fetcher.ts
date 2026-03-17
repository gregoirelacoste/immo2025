/**
 * Collecte de données DVF (Demandes de Valeurs Foncières).
 * Source : api.cquest.org (micro-API open data, pas d'auth requise).
 */

import { DvfCityData } from "../types";

interface DvfMutation {
  id_mutation: string;
  date_mutation: string;
  nature_mutation: string;
  valeur_fonciere: number;
  code_postal: string;
  code_commune: string;
  nom_commune: string;
  type_local: string;
  surface_reelle_bati: number;
  nombre_pieces_principales: number;
  longitude: number;
  latitude: number;
}

interface DvfApiResponse {
  resultats: DvfMutation[];
  nb_resultats: number;
}

const DVF_API_BASE = "https://api.cquest.org/dvf";

/**
 * Récupère et agrège les données DVF pour une commune.
 * Calcule prix moyen/médian global + segmenté par type de bien + tendance 1 an.
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

  const url = new URL(DVF_API_BASE);
  url.searchParams.set("code_commune", codeInsee);
  url.searchParams.set("nature_mutation", "Vente");

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "tiili.fr/news-fetcher/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`DVF API ${response.status}: ${response.statusText}`);
  }

  const data: DvfApiResponse = await response.json();
  const mutations = data.resultats.filter(
    (m) => m.surface_reelle_bati > 0 && m.valeur_fonciere > 0
  );

  // Filtrer par année
  const anneeMin = options?.anneeMin ?? new Date().getFullYear() - 2;
  const filtered = mutations.filter(
    (m) => new Date(m.date_mutation).getFullYear() >= anneeMin
  );

  if (filtered.length === 0) return empty;

  // Calculer prix/m² par mutation
  const withPrice = filtered.map((m) => ({
    ...m,
    pricePerM2: m.valeur_fonciere / m.surface_reelle_bati,
  }));

  // Exclure outliers (P5-P95)
  const prices = withPrice.map((m) => m.pricePerM2).sort((a, b) => a - b);
  const p5 = prices[Math.floor(prices.length * 0.05)];
  const p95 = prices[Math.floor(prices.length * 0.95)];
  const cleaned = withPrice.filter(
    (m) => m.pricePerM2 >= p5 && m.pricePerM2 <= p95
  );

  if (cleaned.length === 0) return empty;

  // Helpers statistiques
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

  // Prix par type de bien
  const allPrices = cleaned.map((m) => m.pricePerM2);
  const studios = cleaned.filter(
    (m) => m.type_local === "Appartement" && m.nombre_pieces_principales === 1
  );
  const smallApts = cleaned.filter(
    (m) =>
      m.type_local === "Appartement" &&
      m.nombre_pieces_principales >= 2 &&
      m.nombre_pieces_principales <= 3
  );
  const largeApts = cleaned.filter(
    (m) => m.type_local === "Appartement" && m.nombre_pieces_principales >= 4
  );
  const houses = cleaned.filter((m) => m.type_local === "Maison");

  // Tendance 1 an
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(now.getFullYear() - 2);

  const recentPrices = cleaned
    .filter((m) => new Date(m.date_mutation) >= oneYearAgo)
    .map((m) => m.pricePerM2);
  const previousPrices = cleaned
    .filter((m) => {
      const d = new Date(m.date_mutation);
      return d >= twoYearsAgo && d < oneYearAgo;
    })
    .map((m) => m.pricePerM2);

  const avgRecent = avg(recentPrices);
  const avgPrevious = avg(previousPrices);
  const trend =
    avgRecent && avgPrevious
      ? Math.round(((avgRecent - avgPrevious) / avgPrevious) * 1000) / 10
      : null;

  // Date dernière mutation
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime()
  );

  return {
    avgPricePerM2: round(avg(allPrices)),
    medianPricePerM2: round(median(allPrices)),
    transactionCount: filtered.length,
    avgPriceStudioPerM2: round(avg(studios.map((m) => m.pricePerM2))),
    avgPriceSmallAptPerM2: round(avg(smallApts.map((m) => m.pricePerM2))),
    avgPriceLargeAptPerM2: round(avg(largeApts.map((m) => m.pricePerM2))),
    avgPriceHousePerM2: round(avg(houses.map((m) => m.pricePerM2))),
    priceTrend1yPct: trend,
    pricePerM2Min: round(p5),
    pricePerM2Max: round(p95),
    lastMutationDate: sorted[0]?.date_mutation ?? null,
  };
}
