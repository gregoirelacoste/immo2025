/**
 * Carte des loyers — median rent per m² by commune, segmented by property type.
 * Source: data.gouv.fr (open access CSVs, semicolon-separated).
 * Dataset: carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025
 *
 * 4 CSV files (same structure, ~34 900 communes):
 * - pred-app-mef-dhup  → Tous appartements
 * - pred-app12-mef-dhup → T1-T2
 * - pred-app3-mef-dhup  → T3+
 * - pred-mai-mef-dhup   → Maisons
 */

import { LoyersData } from "./types";

/** In-memory cache: INSEE code → parsed rent data (all 4 segments merged) */
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

/** CSV segment identifiers matched against resource URLs */
const CSV_SEGMENTS = [
  { key: "app", match: "pred-app-mef" },    // tous appartements
  { key: "app12", match: "pred-app12-mef" }, // T1-T2
  { key: "app3", match: "pred-app3-mef" },   // T3+
  { key: "mai", match: "pred-mai-mef" },     // maisons
] as const;

type SegmentKey = (typeof CSV_SEGMENTS)[number]["key"];

/**
 * Resolve the 4 CSV resource URLs from data.gouv.fr dataset API.
 * Returns a map: segment key → URL.
 */
async function resolveDatasetCsvUrls(): Promise<Map<SegmentKey, string>> {
  const result = new Map<SegmentKey, string>();
  try {
    const datasetId = "693aa2feed1bf4da603faa49";
    const url = `https://www.data.gouv.fr/api/1/datasets/${datasetId}/`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return result;

    const dataset: DataGouvDataset = await res.json();
    const csvResources = dataset.resources.filter(
      (r) => r.format?.toLowerCase() === "csv"
    );

    for (const segment of CSV_SEGMENTS) {
      const resource = csvResources.find((r) => r.url.includes(segment.match));
      if (resource) {
        result.set(segment.key, resource.url);
      }
    }
  } catch {
    // return whatever we found
  }
  return result;
}

/**
 * Parse a single CSV into a Map<INSEE code, rent per m²>.
 * CSV columns (semicolon-separated): INSEE_C, LIBGEO, loypredm2, ...
 */
function parseCsv(text: string): Map<string, { loyer: number; obs: number | null }> {
  const map = new Map<string, { loyer: number; obs: number | null }>();
  const lines = text.split("\n");
  if (lines.length < 2) return map;

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
    const loyer = parseFloat(loyerRaw.replace(",", "."));
    if (isNaN(loyer)) continue;

    let obs: number | null = null;
    if (idxObs !== -1 && cols[idxObs]) {
      const parsed = parseInt(cols[idxObs], 10);
      if (!isNaN(parsed)) obs = parsed;
    }

    map.set(inseeCode, { loyer, obs });
  }

  return map;
}

/**
 * Download all 4 CSVs in parallel, parse each, and merge into a single LoyersData map.
 */
async function loadAllCsvs(): Promise<Map<string, LoyersData>> {
  const merged = new Map<string, LoyersData>();

  const urls = await resolveDatasetCsvUrls();
  if (urls.size === 0) return merged;

  // Download all CSVs in parallel
  const downloads = await Promise.all(
    CSV_SEGMENTS.map(async (segment) => {
      const csvUrl = urls.get(segment.key);
      if (!csvUrl) return { key: segment.key, data: new Map() as ReturnType<typeof parseCsv> };
      try {
        const res = await fetch(csvUrl, {
          headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) return { key: segment.key, data: new Map() as ReturnType<typeof parseCsv> };
        const text = await res.text();
        return { key: segment.key, data: parseCsv(text) };
      } catch {
        return { key: segment.key, data: new Map() as ReturnType<typeof parseCsv> };
      }
    })
  );

  // Index by segment key
  const bySegment = new Map<SegmentKey, Map<string, { loyer: number; obs: number | null }>>();
  for (const { key, data } of downloads) {
    bySegment.set(key as SegmentKey, data);
  }

  const appData = bySegment.get("app") ?? new Map();
  const app12Data = bySegment.get("app12") ?? new Map();
  const app3Data = bySegment.get("app3") ?? new Map();
  const maiData = bySegment.get("mai") ?? new Map();

  // Collect all INSEE codes across all segments
  const allCodes = new Set<string>();
  for (const map of [appData, app12Data, app3Data, maiData]) {
    for (const code of map.keys()) allCodes.add(code);
  }

  // Merge into LoyersData
  for (const code of allCodes) {
    const app = appData.get(code);
    if (!app) continue; // require base "tous apparts" data

    merged.set(code, {
      loyerMedM2: app.loyer,
      nbObservations: app.obs,
      loyerT1T2M2: app12Data.get(code)?.loyer ?? null,
      loyerT3PlusM2: app3Data.get(code)?.loyer ?? null,
      loyerMaisonM2: maiData.get(code)?.loyer ?? null,
    });
  }

  return merged;
}

/**
 * Fetch median rent per m² for a commune by INSEE code.
 * Downloads and caches all 4 CSVs on first call.
 * Returns null if the commune is not found or on any error.
 */
export async function fetchLoyersData(
  codeInsee: string
): Promise<LoyersData | null> {
  try {
    if (!cache) {
      const loaded = await loadAllCsvs();
      // Only cache if we got data — avoid poisoning on transient failure
      if (loaded.size > 0) cache = loaded;
      else return null;
    }
    return cache.get(codeInsee) ?? null;
  } catch {
    return null;
  }
}
