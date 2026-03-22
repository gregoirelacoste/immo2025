import { ShareSource, ShareHints } from "@/domains/collect/types";

interface ParseResult {
  source: ShareSource;
  hints: ShareHints;
}

// ─── Site registry ───

interface SiteConfig {
  source: ShareSource;
  label: string;
  hostPattern: RegExp;
  /** Path patterns that indicate a search/listing page (not an individual ad) */
  searchPatterns: RegExp[];
}

const SITES: SiteConfig[] = [
  {
    source: "leboncoin",
    label: "Leboncoin",
    hostPattern: /leboncoin\.fr/i,
    searchPatterns: [/\/recherche(\/|$|\?)/],
  },
  {
    source: "seloger",
    label: "SeLoger",
    hostPattern: /seloger\.com/i,
    searchPatterns: [/\/(list|recherche)(\/|$|\?)/],
  },
  {
    source: "pap",
    label: "PAP",
    hostPattern: /pap\.fr/i,
    searchPatterns: [/\/annonces?\/(vente|location|immobilier)/i],
  },
  {
    source: "bienici",
    label: "Bien'ici",
    hostPattern: /bienici\.com/i,
    searchPatterns: [/\/recherche\//],
  },
  {
    source: "logicimmo",
    label: "Logic-Immo",
    hostPattern: /logic-immo\.com/i,
    searchPatterns: [/\/(vente|location)-immobilier/i],
  },
  {
    source: "figaro",
    label: "Figaro Immo",
    hostPattern: /immobilier\.lefigaro\.fr/i,
    searchPatterns: [/\/annonces\//],
  },
  {
    source: "ouestfrance",
    label: "Ouest-France Immo",
    hostPattern: /ouestfrance-immo\.com/i,
    searchPatterns: [/\/(vente|location)\//],
  },
  {
    source: "superimmo",
    label: "Superimmo",
    hostPattern: /superimmo\.com/i,
    searchPatterns: [/\/(vente|location)\//],
  },
];

// ─── Public API ───

/** Detect the source app from a URL and extract quick hints from shared text */
export function parseShareHints(url: string, text: string, title: string): ParseResult {
  const combined = [title, text].filter(Boolean).join(" ");
  const site = detectSite(url);

  if (!site) {
    return { source: "generic", hints: parseGenericHints(combined) };
  }

  return { source: site.source, hints: parseGenericHints(combined) };
}

/** Returns true if the URL is a search/listing page (not an individual property ad) */
export function isSearchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    for (const site of SITES) {
      if (site.hostPattern.test(parsed.hostname)) {
        return site.searchPatterns.some((p) => p.test(parsed.pathname));
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Returns a display name for the site (e.g. "Leboncoin") */
export function getSearchSiteName(url: string): string {
  const site = detectSite(url);
  return site ? site.label : "Autre";
}

/** Returns the site key for DB storage (e.g. "leboncoin", "bienici") */
export function getSearchSiteKey(url: string): string {
  const site = detectSite(url);
  return site ? site.source : "other";
}

// ─── Internal ───

function detectSite(url: string): SiteConfig | null {
  for (const site of SITES) {
    if (site.hostPattern.test(url)) {
      return site;
    }
  }
  return null;
}

/** Generic hint parser — works for most French real estate sites */
function parseGenericHints(text: string): ShareHints {
  const hints: ShareHints = {};

  const priceMatch = text.match(/([\d\s.]+)\s*€/);
  if (priceMatch) {
    const n = parseInt(priceMatch[1].replace(/[\s.]/g, ""), 10);
    if (n > 1000) hints.price = n;
  }

  const surfaceMatch = text.match(/(\d+)\s*m[²2]/);
  if (surfaceMatch) {
    const n = parseInt(surfaceMatch[1], 10);
    if (n > 5 && n < 10000) hints.surface = n;
  }

  return hints;
}
