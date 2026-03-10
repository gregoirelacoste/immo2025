import * as cheerio from "cheerio";
import { FieldSelector, ScrapedPropertyData } from "@/types/scraping";
import { REQUIRED_FIELDS, PROPERTY_FIELDS } from "./constants";
import { applyTransform } from "./normalizers";

interface ExtractionResult {
  value: string | number | null;
  found: boolean;
}

/** Extrait une valeur du DOM en utilisant un FieldSelector */
function extractField(
  $: cheerio.CheerioAPI,
  selector: FieldSelector
): ExtractionResult {
  const allSelectors = [selector.css, ...selector.fallbacks];

  for (const sel of allSelectors) {
    try {
      const el = $(sel).first();
      if (el.length === 0) continue;

      let raw: string | undefined;
      if (selector.attribute) {
        raw = el.attr(selector.attribute);
      } else {
        raw = el.text();
      }

      if (!raw || raw.trim().length === 0) continue;

      // Appliquer le regex si présent
      if (selector.regex) {
        const match = raw.match(new RegExp(selector.regex));
        if (match) {
          raw = match[1] || match[0];
        }
      }

      const value = applyTransform(raw, selector.transform);
      return { value, found: true };
    } catch {
      continue;
    }
  }

  return { value: null, found: false };
}

/** Applique un manifest de sélecteurs sur un HTML pour extraire les données */
export function directScrape(
  html: string,
  selectors: Record<string, FieldSelector>
): { data: ScrapedPropertyData | null; allRequiredFound: boolean } {
  const $ = cheerio.load(html);
  const data: Record<string, unknown> = {};
  let allRequiredFound = true;

  for (const field of PROPERTY_FIELDS) {
    const selector = selectors[field];
    if (!selector) continue;

    const result = extractField($, selector);

    if (result.found && result.value !== null) {
      data[field] = result.value;
    } else if ((REQUIRED_FIELDS as readonly string[]).includes(field)) {
      allRequiredFound = false;
    }
  }

  const hasAnyData = Object.keys(data).length > 0;

  return {
    data: hasAnyData ? (data as ScrapedPropertyData) : null,
    allRequiredFound,
  };
}
