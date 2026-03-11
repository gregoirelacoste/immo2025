/**
 * Géorisques API — georisques.gouv.fr
 * Open data, no API key needed
 * Docs: https://www.georisques.gouv.fr/doc-api
 */

import { NaturalRisk } from "./socioeconomic-types";

interface GeorisquesResult {
  risks: NaturalRisk[];
  riskLevel: "faible" | "moyen" | "élevé" | null;
}

/**
 * Fetch natural risks for a location
 */
export async function fetchGeorisques(
  latitude: number,
  longitude: number
): Promise<GeorisquesResult> {
  const risks: NaturalRisk[] = [];

  try {
    // Gaspar API — risques par commune ou coordonnées
    const url = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${latitude},${longitude}&rayon=1000`;

    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) return { risks: [], riskLevel: null };

    const data = await res.json();
    const rawRisks = data.data || [];

    for (const r of rawRisks) {
      if (r.libelle_risque_long || r.libelle_risque_jo) {
        risks.push({
          type: r.libelle_risque_long || r.libelle_risque_jo || "Inconnu",
          level: classifyRiskLevel(r),
        });
      }
    }
  } catch {
    // Georisques failure is non-fatal
  }

  // Also check radon level
  try {
    const radonUrl = `https://georisques.gouv.fr/api/v1/radon?latlon=${latitude},${longitude}`;
    const radonRes = await fetch(radonUrl, {
      headers: { "Accept": "application/json" },
    });

    if (radonRes.ok) {
      const radonData = await radonRes.json();
      const radonItems = radonData.data || [];
      if (radonItems.length > 0) {
        const classe = radonItems[0].classe_potentiel;
        risks.push({
          type: "Radon",
          level: classe >= 3 ? "Fort" : classe >= 2 ? "Moyen" : "Faible",
        });
      }
    }
  } catch {
    // Radon check failure is non-fatal
  }

  // Determine overall risk level
  const riskLevel = computeOverallRiskLevel(risks);

  return { risks, riskLevel };
}

function classifyRiskLevel(risk: Record<string, unknown>): string {
  // Use num_risque or other indicators if available
  const code = String(risk.cod_national_risque || "");
  // Inondation (code 1xx), Séisme (code 2xx), Mouvement terrain (code 3xx)
  if (code.startsWith("1")) return "Moyen"; // Inondation
  if (code.startsWith("2")) return "Fort";  // Séisme
  return "Moyen";
}

function computeOverallRiskLevel(risks: NaturalRisk[]): "faible" | "moyen" | "élevé" | null {
  if (risks.length === 0) return null;

  const hasFort = risks.some((r) => r.level === "Fort");
  if (hasFort || risks.length >= 4) return "élevé";
  if (risks.length >= 2) return "moyen";
  return "faible";
}
