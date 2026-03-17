/**
 * Collecte d'actualités via flux RSS.
 * Parse les flux RSS/Atom immobilier et Google News.
 * Pas de dépendance externe — parsing XML minimal natif.
 */

import { RssItem } from "../types";

interface RssFeedConfig {
  url: string;
  source: string;
}

/** Flux RSS immobilier français */
const IMMO_RSS_FEEDS: RssFeedConfig[] = [
  {
    url: "https://news.google.com/rss/search?q=investissement+immobilier+locatif+France&hl=fr&gl=FR&ceid=FR:fr",
    source: "Google News",
  },
  {
    url: "https://www.lesechos.fr/rss/patrimoine/immobilier.xml",
    source: "Les Echos",
  },
  {
    url: "https://immobilier.lefigaro.fr/rss/articles.xml",
    source: "Le Figaro Immo",
  },
  {
    url: "https://www.capital.fr/immobilier/feed",
    source: "Capital",
  },
];

/** Mots-clés de pertinence pour le filtrage */
const RELEVANCE_KEYWORDS = [
  "investissement",
  "locatif",
  "rendement",
  "loyer",
  "prix immobilier",
  "taux",
  "crédit immobilier",
  "pinel",
  "lmnp",
  "déficit foncier",
  "taxe foncière",
  "marché immobilier",
  "vacance locative",
  "airbnb",
  "location meublée",
];

/** Parse un flux RSS/Atom XML et extrait les items */
function parseRssXml(xml: string, source: string): RssItem[] {
  const items: RssItem[] = [];

  // Pattern pour extraire les <item> (RSS 2.0) ou <entry> (Atom)
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1] || match[2];

    const title = extractTag(content, "title");
    const link =
      extractTag(content, "link") ||
      extractAttr(content, "link", "href");
    const pubDate =
      extractTag(content, "pubDate") ||
      extractTag(content, "published") ||
      extractTag(content, "updated");
    const description =
      extractTag(content, "description") ||
      extractTag(content, "summary") ||
      extractTag(content, "content");

    if (title && link) {
      items.push({
        title: cleanHtml(title),
        link: cleanHtml(link),
        pubDate: pubDate || "",
        source,
        snippet: cleanHtml(description || "").slice(0, 300),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // Gère les CDATA
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`,
    "is"
  );
  const match = regex.exec(xml);
  return match?.[1]?.trim() || "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = regex.exec(xml);
  return match?.[1]?.trim() || "";
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score de pertinence d'un article (0-100) */
function scoreRelevance(item: RssItem, cityName?: string): number {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  let score = 0;

  for (const keyword of RELEVANCE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) score += 10;
  }

  // Bonus si la ville est mentionnée
  if (cityName && text.includes(cityName.toLowerCase())) {
    score += 30;
  }

  // Bonus fraîcheur (< 7 jours)
  if (item.pubDate) {
    const age = Date.now() - new Date(item.pubDate).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    if (days < 1) score += 20;
    else if (days < 3) score += 15;
    else if (days < 7) score += 10;
  }

  return Math.min(score, 100);
}

/** Fetch un seul flux RSS */
async function fetchSingleFeed(config: RssFeedConfig): Promise<RssItem[]> {
  try {
    const res = await fetch(config.url, {
      headers: {
        "User-Agent": "tiili.fr/news-fetcher/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseRssXml(xml, config.source);
  } catch {
    return [];
  }
}

/**
 * Collecte et agrège les actualités RSS immobilier.
 * Filtre par pertinence et retourne les N meilleures.
 */
export async function fetchRssNews(options?: {
  cityName?: string;
  maxItems?: number;
  additionalFeeds?: RssFeedConfig[];
}): Promise<RssItem[]> {
  const maxItems = options?.maxItems ?? 10;
  const feeds = [...IMMO_RSS_FEEDS, ...(options?.additionalFeeds ?? [])];

  // Fetch tous les flux en parallèle
  const results = await Promise.allSettled(feeds.map(fetchSingleFeed));

  const allItems: RssItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Dédupliquer par titre (approximatif)
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Scorer et trier par pertinence
  const scored = unique.map((item) => ({
    item,
    score: scoreRelevance(item, options?.cityName),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxItems).map((s) => s.item);
}
