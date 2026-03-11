/**
 * Géorisques API — georisques.gouv.fr
 * Open data, no API key needed
 * Docs: https://www.georisques.gouv.fr/doc-api
 *
 * IMPORTANT: latlon param format is longitude,latitude (NOT lat,lon)
 */

import { NaturalRisk } from "./socioeconomic-types";

interface GeorisquesResult {
  risks: NaturalRisk[];
  riskLevel: "faible" | "moyen" | "élevé" | null;
}

const NATURAL_RISK_KEYS = [
  "inondation", "remonteeNappe", "risqueCotier", "seisme",
  "mouvementTerrain", "retraitGonflementArgile", "avalanche",
  "feuForet", "radon",
] as const;

const RISK_LABELS: Record<string, string> = {
  inondation: "Inondation",
  remonteeNappe: "Remontée de nappe",
  risqueCotier: "Risque côtier",
  seisme: "Séisme",
  mouvementTerrain: "Mouvement de terrain",
  retraitGonflementArgile: "Argile (retrait-gonflement)",
  avalanche: "Avalanche",
  feuForet: "Feu de forêt",
  radon: "Radon",
};

/**
 * Fetch comprehensive risk report for a location.
 * Uses the unified /resultats_rapport_risque endpoint.
 */
export async function fetchGeorisques(
  latitude: number,
  longitude: number
): Promise<GeorisquesResult> {
  const risks: NaturalRisk[] = [];

  try {
    // latlon format: longitude,latitude
    const url = `https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${longitude},${latitude}`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) return { risks: [], riskLevel: null };

    const data = await res.json();

    // Parse natural risks
    const naturels = data.risquesNaturels;
    if (naturels) {
      for (const key of NATURAL_RISK_KEYS) {
        const risk = naturels[key];
        if (risk && risk.present === true) {
          risks.push({
            type: RISK_LABELS[key] || key,
            level: classifyRiskLevel(key, risk),
          });
        }
      }
    }
  } catch {
    // Georisques failure is non-fatal — API can be flaky
    return { risks: [], riskLevel: null };
  }

  const riskLevel = computeOverallRiskLevel(risks);
  return { risks, riskLevel };
}

function classifyRiskLevel(key: string, risk: Record<string, unknown>): string {
  // Use address-level status if available, else commune-level
  const statusAdresse = String(risk.libelleStatutAdresse || "").toLowerCase();
  const statusCommune = String(risk.libelleStatutCommune || "").toLowerCase();
  const status = statusAdresse || statusCommune;

  if (status.includes("fort") || status.includes("très") || status.includes("élevé")) return "Fort";
  if (status.includes("moyen") || status.includes("modéré")) return "Moyen";
  if (status.includes("faible")) return "Faible";

  // Seisme-specific: zone code matters
  if (key === "seisme") {
    const zone = risk.zone || risk.codeZone;
    if (typeof zone === "number" || typeof zone === "string") {
      const n = Number(zone);
      if (n >= 4) return "Fort";
      if (n >= 3) return "Moyen";
      return "Faible";
    }
  }

  // Radon: classe 3 = fort, 2 = moyen, 1 = faible
  if (key === "radon") {
    const classe = risk.classe_potentiel || risk.classePotentiel;
    if (typeof classe === "number" || typeof classe === "string") {
      const n = Number(classe);
      if (n >= 3) return "Fort";
      if (n >= 2) return "Moyen";
      return "Faible";
    }
  }

  // Default: if present, at least "Moyen"
  return "Moyen";
}

function computeOverallRiskLevel(risks: NaturalRisk[]): "faible" | "moyen" | "élevé" | null {
  if (risks.length === 0) return null;

  const hasFort = risks.some((r) => r.level === "Fort");
  if (hasFort || risks.length >= 4) return "élevé";
  if (risks.length >= 2) return "moyen";
  return "faible";
}
