import { ShareSource, ShareHints } from "@/domains/collect/types";

interface ParseResult {
  source: ShareSource;
  hints: ShareHints;
}

/** Detect the source app from a URL and extract quick hints from shared text */
export function parseShareHints(url: string, text: string, title: string): ParseResult {
  const combined = [title, text].filter(Boolean).join(" ");

  if (isLeBonCoin(url)) {
    return { source: "leboncoin", hints: parseLeBonCoin(combined) };
  }
  if (isSeLoger(url)) {
    return { source: "seloger", hints: parseSeLoger(combined) };
  }
  if (isPap(url)) {
    return { source: "pap", hints: parsePap(combined) };
  }

  return { source: "generic", hints: {} };
}

// ─── Detection ───

function isLeBonCoin(url: string): boolean {
  return /leboncoin\.fr/i.test(url);
}

function isSeLoger(url: string): boolean {
  return /seloger\.com/i.test(url);
}

function isPap(url: string): boolean {
  return /pap\.fr/i.test(url);
}

// ─── Parsers ───

/** LeBonCoin: title often contains price + city, e.g. "Appartement 3 pièces 65m² - 180 000 € - Lyon" */
function parseLeBonCoin(text: string): ShareHints {
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

/** SeLoger: title has surface + city, e.g. "Appartement 3p 65m² Lyon 3ème" */
function parseSeLoger(text: string): ShareHints {
  const hints: ShareHints = {};

  const surfaceMatch = text.match(/(\d+)\s*m[²2]/);
  if (surfaceMatch) {
    const n = parseInt(surfaceMatch[1], 10);
    if (n > 5 && n < 10000) hints.surface = n;
  }

  const priceMatch = text.match(/([\d\s.]+)\s*€/);
  if (priceMatch) {
    const n = parseInt(priceMatch[1].replace(/[\s.]/g, ""), 10);
    if (n > 1000) hints.price = n;
  }

  return hints;
}

/** PAP: title often has price, e.g. "Vente appartement 180 000 €" */
function parsePap(text: string): ShareHints {
  const hints: ShareHints = {};

  const priceMatch = text.match(/([\d\s.]+)\s*€/);
  if (priceMatch) {
    const n = parseInt(priceMatch[1].replace(/[\s.]/g, ""), 10);
    if (n > 1000) hints.price = n;
  }

  return hints;
}
