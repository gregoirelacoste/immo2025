/**
 * INSEE socio-economic data collection (Données Locales).
 * Source: api.insee.fr — requires OAuth2 authentication.
 *
 * Required env vars: INSEE_CONSUMER_KEY, INSEE_CONSUMER_SECRET
 */

import { InseeCityData } from "./types";

interface InseeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InseeCellule {
  Zone: { codgeo: string; libgeo: string };
  Mesure: { code: string; libelle: string };
  Modalite: { code: string; libelle: string };
  ValeurCellule: string;
  Millesime: string;
}

interface InseeDonneesResponse {
  Cellule: InseeCellule[];
}

const INSEE_API_BASE = "https://api.insee.fr/donnees-locales/V0.1";
const INSEE_TOKEN_URL = "https://api.insee.fr/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Check if INSEE credentials are configured */
export function isInseeConfigured(): boolean {
  return !!(process.env.INSEE_CONSUMER_KEY && process.env.INSEE_CONSUMER_SECRET);
}

async function getInseeToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const key = process.env.INSEE_CONSUMER_KEY;
  const secret = process.env.INSEE_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error("INSEE_CONSUMER_KEY ou INSEE_CONSUMER_SECRET manquante");
  }

  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await fetch(INSEE_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`INSEE token error: ${response.status}`);
  }

  const data: InseeTokenResponse = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function fetchCroisement(
  source: string,
  croisement: string,
  codeGeo: string
): Promise<InseeCellule[]> {
  const token = await getInseeToken();
  const url = `${INSEE_API_BASE}/donnees/geo-${source}@${croisement}/COM-${codeGeo}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`INSEE API ${response.status}: ${url}`);
  }

  const data: InseeDonneesResponse = await response.json();
  return data.Cellule ?? [];
}

function extractValue(
  cells: InseeCellule[],
  mesureCode: string,
  modaliteCode?: string
): number | null {
  const cell = cells.find(
    (c) =>
      c.Mesure.code === mesureCode &&
      (!modaliteCode || c.Modalite.code === modaliteCode)
  );
  if (!cell) return null;
  const v = parseFloat(cell.ValeurCellule);
  return isNaN(v) ? null : v;
}

/**
 * Fetch INSEE socio-economic data for a city.
 * Returns null if credentials are not configured.
 */
export async function fetchInseeData(
  codeInsee: string
): Promise<InseeCityData | null> {
  if (!isInseeConfigured()) return null;

  const [popCells, logCells, revCells, actCells] = await Promise.allSettled([
    fetchCroisement("GEO2021RP2020", "POPLEG-POPLEG", codeInsee),
    fetchCroisement("GEO2021RP2020", "LOG-T1", codeInsee),
    fetchCroisement("GEO2021FILOSOFI2020", "REVDISP-MEDDISP", codeInsee),
    fetchCroisement("GEO2021RP2020", "ACT-T1", codeInsee),
  ]);

  const safe = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === "fulfilled" ? r.value : null;

  const pop = safe(popCells) ?? [];
  const log = safe(logCells) ?? [];
  const rev = safe(revCells) ?? [];
  const act = safe(actCells) ?? [];

  const population = extractValue(pop, "POP_T", "ENS");
  const totalLogements = extractValue(log, "LOG_T1", "ENS");
  const logVacants = extractValue(log, "LOG_T1", "3");
  const logProp = extractValue(log, "LOG_T7", "10");
  const medianIncome = extractValue(rev, "MED", "ENS");
  const povertyRate = extractValue(rev, "TP60", "ENS");
  const actifs = extractValue(act, "ACT_T1", "11");
  const chomeurs = extractValue(act, "ACT_T1", "12");

  const unemploymentRate =
    actifs != null && chomeurs != null && actifs + chomeurs > 0
      ? Math.round((chomeurs / (actifs + chomeurs)) * 1000) / 10
      : null;

  return {
    population,
    medianIncome,
    povertyRate,
    unemploymentRate,
    vacantHousingPct:
      totalLogements && logVacants
        ? Math.round((logVacants / totalLogements) * 1000) / 10
        : null,
    ownerOccupierPct:
      totalLogements && logProp
        ? Math.round((logProp / totalLogements) * 1000) / 10
        : null,
    housingStockCount: totalLogements,
    householdSizeAvg: null,
    studentPopulationPct: null,
    seniorPopulationPct: null,
    totalJobs: null,
    millesime: pop[0]?.Millesime ?? null,
  };
}
