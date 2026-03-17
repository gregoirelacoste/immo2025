/**
 * Collecte de données Géorisques (risques naturels et technologiques).
 * Source : georisques.gouv.fr/api/v1 — accès libre, pas d'auth requise.
 */

import { GeorisquesCityData } from "../types";

interface GasparRisque {
  code_national_risque: string;
  libelle_risque_long: string;
}

interface RadonData {
  classe_potentiel: number;
}

interface SismiqueData {
  code_zone: number;
}

interface IcpeData {
  statut_seveso: string;
}

interface GeorisquesResponse<T> {
  data: T[];
  count: number;
}

const BASE = "https://georisques.gouv.fr/api/v1";

async function fetchEndpoint<T>(
  path: string,
  codeInsee: string
): Promise<T[]> {
  try {
    const url = `${BASE}${path}?code_insee=${codeInsee}&page=1&page_size=50`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/news-fetcher/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json: GeorisquesResponse<T> = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

/** Codes risque inondation (GASPAR) */
const FLOOD_CODES = ["13", "14", "15", "16"];

/** Détermine le niveau de risque global à partir du nombre de risques */
function computeRiskLevel(
  riskCount: number,
  hasFlood: boolean,
  hasSeveso: boolean,
  seismicZone: number | null
): "faible" | "moyen" | "élevé" {
  if (hasSeveso || (seismicZone && seismicZone >= 4)) return "élevé";
  if (riskCount >= 4 || hasFlood || (seismicZone && seismicZone >= 3))
    return "moyen";
  return "faible";
}

/**
 * Récupère les données de risques pour une commune.
 * Appelle 4 endpoints en parallèle.
 */
export async function fetchGeorisquesData(
  codeInsee: string
): Promise<GeorisquesCityData> {
  const [risques, radon, sismique, icpe] = await Promise.allSettled([
    fetchEndpoint<GasparRisque>("/gaspar/risques", codeInsee),
    fetchEndpoint<RadonData>("/radon", codeInsee),
    fetchEndpoint<SismiqueData>("/zonage_sismique", codeInsee),
    fetchEndpoint<IcpeData>("/installations_classees", codeInsee),
  ]);

  const safe = <T>(r: PromiseSettledResult<T[]>): T[] =>
    r.status === "fulfilled" ? r.value : [];

  const risquesList = safe(risques);
  const radonList = safe(radon);
  const sismiqueList = safe(sismique);
  const icpeList = safe(icpe);

  // Risques naturels
  const naturalRisks = risquesList.map((r) => ({
    type: r.libelle_risque_long,
    level: "identifié",
  }));

  // Inondation
  const hasFlood = risquesList.some((r) =>
    FLOOD_CODES.includes(r.code_national_risque)
  );
  const floodRiskLevel = hasFlood ? ("moyen" as const) : ("nul" as const);

  // Sismique
  const seismicZone = sismiqueList[0]?.code_zone ?? null;

  // SEVESO
  const hasSeveso = icpeList.some(
    (i) => i.statut_seveso && i.statut_seveso.toLowerCase().includes("seuil haut")
  );
  const industrialRisk =
    hasSeveso || icpeList.some((i) => i.statut_seveso?.includes("Seveso"));

  // Radon
  const radonLevel = radonList[0]?.classe_potentiel ?? null;

  // Niveau global
  const riskLevel = computeRiskLevel(
    risquesList.length,
    hasFlood,
    hasSeveso,
    seismicZone
  );

  return {
    naturalRisks,
    riskLevel,
    floodRiskLevel,
    seismicZone,
    industrialRisk,
    radonLevel,
    clayShrinkageRisk: null, // API mvt ne retourne pas directement cette info par commune
    catnatCount: 0, // À enrichir via /gaspar/catnat si besoin
  };
}
