/**
 * Doctor and pharmacy count per city.
 * Source: Base Permanente des Équipements (BPE) via Opendatasoft ODS API.
 */

import { HealthData } from "./types";

interface OdsResponse {
  results: Array<Record<string, string>>;
  total_count: number;
}

const BASE = "https://data.opendatasoft.com/api/explore/v2.1/catalog/datasets";
const DATASET = "bpe@public";

/**
 * Fetch doctor and pharmacy count for a city.
 * BPE codes: D201 = general practitioner, D301 = pharmacy.
 * Returns null if not found.
 */
export async function fetchHealthData(
  codeInsee: string
): Promise<HealthData | null> {
  try {
    // Fetch doctors (D201) and pharmacies (D301) in parallel
    const [doctorRes, pharmacyRes] = await Promise.allSettled([
      fetchBpeCount(codeInsee, "D201"),
      fetchBpeCount(codeInsee, "D301"),
    ]);

    const doctorCount = doctorRes.status === "fulfilled" ? doctorRes.value : 0;
    const pharmacyCount = pharmacyRes.status === "fulfilled" ? pharmacyRes.value : 0;

    if (doctorCount === 0 && pharmacyCount === 0) return null;

    return { doctorCount, pharmacyCount };
  } catch {
    return null;
  }
}

async function fetchBpeCount(
  codeInsee: string,
  typeEquipement: string
): Promise<number> {
  const params = new URLSearchParams({
    where: `depcom="${codeInsee}" AND typequ="${typeEquipement}"`,
    limit: "0",
  });

  const res = await fetch(`${BASE}/${DATASET}/records?${params}`, {
    headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return 0;

  const data: OdsResponse = await res.json();
  return data.total_count ?? 0;
}
