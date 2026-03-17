/**
 * News Fetcher — Orchestrateur de collecte de données.
 *
 * Assemble les données de toutes les sources (DVF, INSEE, Géorisques, RSS, DB)
 * en un objet NewsContext prêt à être passé en contexte à Gemini.
 *
 * Chaque source est fail-safe : une erreur n'empêche pas les autres de fonctionner.
 */

import { NewsContext, NewsFetcherOptions } from "./types";
import { fetchGeoCity, fetchGeoCityByCode } from "./fetchers/geo-fetcher";
import { fetchDvfData } from "./fetchers/dvf-fetcher";
import { fetchGeorisquesData } from "./fetchers/georisques-fetcher";
import { fetchRssNews } from "./fetchers/rss-fetcher";
import { fetchLocalityData } from "./fetchers/locality-fetcher";
import { fetchInseeData } from "./fetchers/insee-fetcher";

/** Types d'articles qui nécessitent des données ville */
const CITY_CATEGORIES = new Set([
  "guide_ville",
  "guide_quartier",
  "etude_de_cas",
  "analyse_comparative",
]);

/** Types d'articles qui nécessitent des actus */
const NEWS_CATEGORIES = new Set([
  "actu_marche",
  "fiscalite",
  "financement",
  "analyse_comparative",
]);

/**
 * Collecte toutes les données nécessaires pour un article.
 *
 * Le choix des sources dépend du type d'article :
 * - guide_ville → DVF + INSEE + Géorisques + localité DB + RSS
 * - actu_marche → RSS principalement + DVF tendances
 * - fiscalite → RSS filtré fiscalité
 * - financement → RSS filtré taux
 * - conseil_investissement → localité DB (stats agrégées)
 */
export async function collectNewsContext(
  options: NewsFetcherOptions
): Promise<NewsContext> {
  const { category, maxNews = 10 } = options;
  const fetchErrors: NewsContext["fetchErrors"] = [];
  const now = new Date().toISOString();

  // ── Étape 1 : Résoudre la géographie ──
  let city = options.city;
  let codeInsee = options.codeInsee;
  let postalCode = options.postalCode;
  let department: string | undefined;
  let region: string | undefined;

  if (city || codeInsee || postalCode) {
    try {
      const geo = codeInsee
        ? await fetchGeoCityByCode(codeInsee)
        : await fetchGeoCity(city || "", postalCode);

      if (geo) {
        city = geo.nom;
        codeInsee = geo.code;
        postalCode = geo.codesPostaux[0];
        department = geo.departement?.nom;
        region = geo.region?.nom;
      }
    } catch (e) {
      fetchErrors.push({
        source: "geo",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const needsCity = CITY_CATEGORIES.has(category) && !!codeInsee;
  const needsNews =
    NEWS_CATEGORIES.has(category) || category === "guide_ville";

  // ── Étape 2 : Collecte parallèle ──
  const [dvfResult, inseeResult, georisquesResult, localityResult, rssResult] =
    await Promise.allSettled([
      // DVF : seulement si on a un code INSEE
      needsCity
        ? fetchDvfData(codeInsee!)
        : Promise.resolve(null),

      // INSEE : seulement si on a un code INSEE et les credentials
      needsCity
        ? fetchInseeData(codeInsee!)
        : Promise.resolve(null),

      // Géorisques : seulement si on a un code INSEE
      needsCity
        ? fetchGeorisquesData(codeInsee!)
        : Promise.resolve(null),

      // Données localité existantes en DB
      city
        ? fetchLocalityData(city, postalCode, codeInsee)
        : Promise.resolve(null),

      // RSS : filtré par ville si pertinent
      needsNews
        ? fetchRssNews({ cityName: city, maxItems: maxNews })
        : Promise.resolve([]),
    ]);

  // ── Étape 3 : Extraire les résultats et tracer les erreurs ──
  function unwrap<T>(
    result: PromiseSettledResult<T>,
    sourceName: string
  ): T | null {
    if (result.status === "fulfilled") return result.value;
    fetchErrors.push({
      source: sourceName,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    });
    return null;
  }

  const dvf = unwrap(dvfResult, "dvf");
  const insee = unwrap(inseeResult, "insee");
  const georisques = unwrap(georisquesResult, "georisques");
  const existingLocality = unwrap(localityResult, "locality_db");
  const news = unwrap(rssResult, "rss") ?? [];

  // ── Étape 4 : Assembler le contexte ──
  return {
    meta: {
      category,
      city,
      codeInsee,
      postalCode,
      department,
      region,
      generatedAt: now,
    },
    dvf,
    insee,
    georisques,
    existingLocality,
    news,
    fetchErrors,
  };
}

/**
 * Sérialise le NewsContext en texte pour l'injecter dans le prompt Gemini.
 * Format structuré en blocs <data_context>.
 */
export function serializeNewsContext(ctx: NewsContext): string {
  const sections: string[] = [];

  sections.push(`<data_context>`);
  sections.push(`<meta>`);
  sections.push(`Catégorie : ${ctx.meta.category}`);
  if (ctx.meta.city) sections.push(`Ville : ${ctx.meta.city}`);
  if (ctx.meta.codeInsee) sections.push(`Code INSEE : ${ctx.meta.codeInsee}`);
  if (ctx.meta.postalCode)
    sections.push(`Code postal : ${ctx.meta.postalCode}`);
  if (ctx.meta.department) sections.push(`Département : ${ctx.meta.department}`);
  if (ctx.meta.region) sections.push(`Région : ${ctx.meta.region}`);
  sections.push(`Date de collecte : ${ctx.meta.generatedAt}`);
  sections.push(`</meta>`);

  if (ctx.dvf) {
    sections.push(`\n<dvf_data>`);
    sections.push(JSON.stringify(ctx.dvf, null, 2));
    sections.push(`</dvf_data>`);
  }

  if (ctx.insee) {
    sections.push(`\n<insee_data>`);
    sections.push(JSON.stringify(ctx.insee, null, 2));
    sections.push(`</insee_data>`);
  }

  if (ctx.georisques) {
    sections.push(`\n<georisques_data>`);
    sections.push(JSON.stringify(ctx.georisques, null, 2));
    sections.push(`</georisques_data>`);
  }

  if (ctx.existingLocality) {
    sections.push(`\n<existing_locality_data>`);
    sections.push(
      `Source : ${ctx.existingLocality.localityName} (${ctx.existingLocality.localityType})`
    );
    sections.push(JSON.stringify(ctx.existingLocality.fields, null, 2));
    sections.push(`</existing_locality_data>`);
  }

  if (ctx.news.length > 0) {
    sections.push(`\n<recent_news>`);
    for (const item of ctx.news) {
      sections.push(`- [${item.source}] ${item.title}`);
      sections.push(`  Date : ${item.pubDate}`);
      if (item.snippet) sections.push(`  Résumé : ${item.snippet}`);
      sections.push(`  URL : ${item.link}`);
    }
    sections.push(`</recent_news>`);
  }

  if (ctx.fetchErrors.length > 0) {
    sections.push(`\n<fetch_warnings>`);
    for (const err of ctx.fetchErrors) {
      sections.push(`- ${err.source} : ${err.error}`);
    }
    sections.push(`Note : certaines sources n'ont pas pu être consultées. Rédige avec les données disponibles.`);
    sections.push(`</fetch_warnings>`);
  }

  sections.push(`</data_context>`);

  return sections.join("\n");
}
