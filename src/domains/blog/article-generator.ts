/**
 * Article Generator — appelle Gemini avec le NewsContext pour produire
 * un article HTML + des données structurées extractées.
 *
 * Stratégie : délimiteurs (pas de JSON pur) pour éviter les problèmes
 * d'échappement avec du HTML long dans un champ JSON.
 *
 * Output Gemini :
 *   ---ARTICLE_META---
 *   { petit JSON : title, slug, excerpt, meta_description, tags }
 *   ---ARTICLE_CONTENT---
 *   <html libre sans contrainte d'échappement>
 *   ---EXTRACTED_DATA---
 *   { petit JSON : localities, global }
 */

import { NewsContext, GeneratedArticle, ArticleCategory } from "./types";
import { serializeNewsContext } from "./news-fetcher";

const GEMINI_ARTICLE_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `Tu es un rédacteur expert en investissement immobilier locatif en France.
Tu travailles pour tiili.fr, un simulateur d'investissement locatif.

RÈGLES D'ÉCRITURE :
- Tutoie le lecteur
- Voix active, phrases courtes (max 3 lignes par paragraphe)
- Chaque affirmation chiffrée doit indiquer sa source et sa date
- Commence par les données, pas par une question rhétorique
- Titres H2/H3 descriptifs avec données ("Prix à Lyon : 4 200 €/m²", pas "Le marché lyonnais")
- Section FAQ obligatoire (3-5 questions avec réponses directes)
- CTA final vers tiili.fr (naturel, pas commercial)
- Pas de superlatifs vagues, pas de promesses de rendement garanti
- Pas de conseil fiscal personnalisé

OPTIMISATION GEO (pour être cité par les IA) :
- Phrases assertives avec chiffres : "Le rendement brut moyen à Lyon est de 5,2 %"
- Chaque phrase doit être compréhensible hors contexte
- Inclure ville + chiffre + source dans la même phrase
- Tableaux pour les comparaisons de 3+ éléments
- Listes ordonnées pour les classements

FORMAT DE SORTIE — UTILISE EXACTEMENT CES DÉLIMITEURS :

---ARTICLE_META---
{
  "title": "Titre H1 avec ville et année",
  "slug": "slug-url-en-minuscules",
  "excerpt": "Résumé 2-3 phrases",
  "meta_description": "Meta description SEO 150-160 chars",
  "tags": ["tag1", "tag2"]
}
---ARTICLE_CONTENT---
<h2>Premier titre</h2>
<p>Contenu HTML complet ici...</p>
(tout le HTML de l'article, aussi long que nécessaire)
---EXTRACTED_DATA---
{
  "localities": [
    {
      "city": "Nom",
      "code_insee": "12345",
      "fields": { "avg_purchase_price_per_m2": 4200, "avg_rent_per_m2": 12.5 }
    }
  ],
  "global": {}
}

IMPORTANT :
- Les 3 délimiteurs (---ARTICLE_META---, ---ARTICLE_CONTENT---, ---EXTRACTED_DATA---) sont OBLIGATOIRES
- Le contenu HTML est entre ---ARTICLE_CONTENT--- et ---EXTRACTED_DATA--- (pas dans du JSON)
- Les blocs META et EXTRACTED_DATA sont du JSON valide
- Dans extracted_data.localities[].fields, utilise les noms de champs snake_case suivants :
  avg_purchase_price_per_m2, median_purchase_price_per_m2, transaction_count,
  avg_rent_per_m2, avg_rent_furnished_per_m2, vacancy_rate,
  avg_condo_charges_per_m2, avg_property_tax_per_m2,
  avg_airbnb_night_price, avg_airbnb_occupancy_rate,
  population, population_growth_pct, median_income, poverty_rate, unemployment_rate,
  school_count, university_nearby, public_transport_score, risk_level, natural_risks`;

const CATEGORY_PROMPTS: Record<ArticleCategory, string> = {
  guide_ville: `Rédige un GUIDE D'INVESTISSEMENT COMPLET pour la ville indiquée.
Longueur : 2 500-4 000 mots.
Sections obligatoires : marché immobilier (prix segmentés), marché locatif, rendement estimé,
Airbnb/LCD, meilleurs quartiers (3+), démographie/économie, qualité de vie, transports,
fiscalité/dispositifs, risques, projets urbains, FAQ (5+ questions), CTA.
Extraire le MAXIMUM de champs dans extracted_data.`,

  guide_quartier: `Rédige un GUIDE QUARTIER pour le quartier et la ville indiqués.
Longueur : 1 500-2 500 mots.
Sections : présentation, prix vs moyenne ville, marché locatif, rendement, atouts,
points de vigilance, transports/commodités, projets urbains, FAQ (3 questions), CTA.`,

  actu_marche: `Rédige un ARTICLE D'ACTUALITÉ MARCHÉ basé sur les actualités RSS fournies.
Longueur : 800-1 500 mots.
Sections : chiffres clés, impact pour les investisseurs, zoom ville/région, contexte, FAQ (2 questions), CTA.
Extraire les tendances prix/loyers dans extracted_data.`,

  analyse_comparative: `Rédige une ANALYSE COMPARATIVE entre les villes mentionnées.
Longueur : 1 500-2 500 mots.
Sections : critères, tableau comparatif synthétique, analyse par critère, verdict par profil, FAQ, CTA.
Extraire les données pour CHAQUE ville dans extracted_data.localities.`,

  conseil_investissement: `Rédige un ARTICLE CONSEIL thématique sur le sujet indiqué.
Longueur : 1 500-3 000 mots.
Sections : contexte, réponse structurée (3-5 sous-sections), cas pratique chiffré,
erreurs à éviter, à retenir (bullet points), FAQ, CTA.`,

  fiscalite: `Rédige un ARTICLE FISCALITÉ sur le dispositif ou sujet fiscal indiqué.
Longueur : 1 500-2 500 mots.
Sections : ce que dit la loi (références légales), impact chiffré sur un investissement type,
villes/zones éligibles, avantages et limites, démarches, FAQ (3-4 questions), CTA.
IMPORTANT : ne jamais donner de conseil fiscal personnalisé, toujours renvoyer vers un expert-comptable.`,

  financement: `Rédige un ARTICLE FINANCEMENT sur les taux ou le crédit immobilier.
Longueur : 1 000-2 000 mots.
Sections : chiffres du mois, impact sur un investissement locatif (simulation),
stratégies pour obtenir le meilleur taux, perspectives, FAQ, CTA.`,

  etude_de_cas: `Rédige une ÉTUDE DE CAS / SIMULATION détaillée.
Longueur : 1 200-2 000 mots.
Sections : le bien (type, surface, prix, localisation), le financement,
les revenus, les charges, résultats simulation (tableau), analyse, enseignements, CTA.
Montrer que les calculs sont reproductibles sur tiili.fr.`,
};

async function callGeminiFlash(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_ARTICLE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(180_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65536,
          // PAS de responseMimeType — on utilise des délimiteurs, pas du JSON pur
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text.trim()) throw new Error("Gemini a retourné une réponse vide");

  return text;
}

/**
 * Parse la réponse Gemini avec les 3 délimiteurs.
 */
function parseDelimitedResponse(raw: string): GeneratedArticle {
  const metaDelim = "---ARTICLE_META---";
  const contentDelim = "---ARTICLE_CONTENT---";
  const dataDelim = "---EXTRACTED_DATA---";

  const metaIdx = raw.indexOf(metaDelim);
  const contentIdx = raw.indexOf(contentDelim);
  const dataIdx = raw.indexOf(dataDelim);

  if (metaIdx === -1 || contentIdx === -1 || dataIdx === -1) {
    throw new Error(
      `Délimiteurs manquants dans la réponse Gemini. ` +
      `META:${metaIdx !== -1} CONTENT:${contentIdx !== -1} DATA:${dataIdx !== -1}\n` +
      `Début de la réponse: ${raw.slice(0, 300)}`
    );
  }

  // Extraire les 3 sections
  const metaRaw = raw.slice(metaIdx + metaDelim.length, contentIdx).trim();
  const contentRaw = raw.slice(contentIdx + contentDelim.length, dataIdx).trim();
  const dataRaw = raw.slice(dataIdx + dataDelim.length).trim();

  // Parser les blocs JSON (meta + extracted_data)
  let meta: {
    title: string;
    slug: string;
    excerpt: string;
    meta_description: string;
    tags: string[];
  };
  try {
    meta = JSON.parse(cleanJsonBlock(metaRaw));
  } catch (e) {
    throw new Error(
      `Erreur parsing ARTICLE_META: ${e instanceof Error ? e.message : e}\n` +
      `Contenu: ${metaRaw.slice(0, 300)}`
    );
  }

  let extractedData: GeneratedArticle["extracted_data"];
  try {
    extractedData = JSON.parse(cleanJsonBlock(dataRaw));
  } catch (e) {
    // extracted_data est optionnel — on continue sans
    console.warn(`⚠️ Erreur parsing EXTRACTED_DATA (non bloquant): ${e instanceof Error ? e.message : e}`);
    extractedData = { localities: [], global: {} };
  }

  if (!meta.title) throw new Error("ARTICLE_META: title manquant");
  if (!contentRaw) throw new Error("ARTICLE_CONTENT vide");

  return {
    article: {
      title: meta.title,
      slug: meta.slug || slugify(meta.title),
      content: contentRaw,
      excerpt: meta.excerpt || "",
      meta_description: meta.meta_description || "",
      tags: meta.tags || [],
      json_ld: {},
    },
    extracted_data: extractedData,
  };
}

/** Nettoie un bloc JSON (retire les ```json...``` si présents) */
function cleanJsonBlock(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned;
}

/** Génère un slug URL à partir d'un titre */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Génère un article complet + données extraites à partir du NewsContext.
 */
export async function generateArticle(
  context: NewsContext
): Promise<GeneratedArticle> {
  const categoryPrompt = CATEGORY_PROMPTS[context.meta.category];
  const dataContext = serializeNewsContext(context);

  const fullPrompt = `${SYSTEM_PROMPT}

${categoryPrompt}

Voici les données collectées pour cet article :

${dataContext}

Génère l'article en respectant EXACTEMENT le format avec les 3 délimiteurs.`;

  const raw = await callGeminiFlash(fullPrompt);

  return parseDelimitedResponse(raw);
}
