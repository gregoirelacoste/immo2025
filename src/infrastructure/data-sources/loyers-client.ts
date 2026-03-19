/**
 * Carte des loyers — median rent per m² by commune.
 * Source: data.gouv.fr (open access CSV, semicolon-separated).
 * Dataset: carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025
 */

import { LoyersData } from "./types";

/** In-memory cache: INSEE code → parsed rent data */
let cache: Map<string, LoyersData> | null = null;

interface DataGouvResource {
  id: string;
  url: string;
  format: string;
  type: string;
}

interface DataGouvDataset {
  resources: DataGouvResource[];
}

/**
 * Resolve the latest CSV resource URL from data.gouv.fr dataset API.
 */
async function resolveDatasetCsvUrl(): Promise<string | null> {
  try {
    const datasetId = "693aa2feed1bf4da603faa49";
    const url = `https://www.data.gouv.fr/api/1/datasets/${datasetId}/`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const dataset: DataGouvDataset = await res.json();
    const csvResource = dataset.resources.find(
      (r) => r.format?.toLowerCase() === "csv" && r.type === "main"
    );
    // Fallback: any CSV resource
    const fallback = dataset.resources.find(
      (r) => r.format?.toLowerCase() === "csv"
    );
    return csvResource?.url ?? fallback?.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Download and parse the full CSV into the in-memory cache.
 * CSV columns (semicolon-separated): INSEE_C, LIBGEO, loypredm2, ...
 */
async function loadCsv(): Promise<Map<string, LoyersData>> {
  const map = new Map<string, LoyersData>();

  const csvUrl = await resolveDatasetCsvUrl();
  if (!csvUrl) return map;

  const res = await fetch(csvUrl, {
    headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return map;

  const text = await res.text();
  const lines = text.split("\n");
  if (lines.length < 2) return map;

  // Parse header to find column indices
  const header = lines[0].split(";").map((h) => h.trim().replace(/"/g, ""));
  const idxInsee = header.indexOf("INSEE_C");
  const idxLoyer = header.indexOf("loypredm2");
  const idxObs = header.indexOf("nbobs_com");

  if (idxInsee === -1 || idxLoyer === -1) return map;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(";").map((c) => c.trim().replace(/"/g, ""));
    const inseeCode = cols[idxInsee];
    const loyerRaw = cols[idxLoyer];

    if (!inseeCode || !loyerRaw) continue;

    // loypredm2 uses comma as decimal separator in French CSVs
    const loyerMedM2 = parseFloat(loyerRaw.replace(",", "."));
    if (isNaN(loyerMedM2)) continue;

    let nbObservations: number | null = null;
    if (idxObs !== -1 && cols[idxObs]) {
      const parsed = parseInt(cols[idxObs], 10);
      if (!isNaN(parsed)) nbObservations = parsed;
    }

    map.set(inseeCode, { loyerMedM2, nbObservations });
  }

  return map;
}

/**
 * Fetch median rent per m² for a commune by INSEE code.
 * Downloads and caches the full CSV on first call.
 * Returns null if the commune is not found or on any error.
 */
export async function fetchLoyersData(
  codeInsee: string
): Promise<LoyersData | null> {
  try {
    if (!cache) {
      cache = await loadCsv();
    }
    return cache.get(codeInsee) ?? null;
  } catch {
    return null;
  }
}
