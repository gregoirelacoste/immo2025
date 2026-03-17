/**
 * Article Generator — appelle Gemini avec le NewsContext pour produire
 * un article HTML + des données structurées extractées.
 */

import { callGemini } from "@/infrastructure/ai/gemini";
import { NewsContext, GeneratedArticle, ArticleCategory } from "./types";
import { serializeNewsContext } from "./news-fetcher";

/** Modèle Gemini pour la rédaction (plus capable que flash-lite) */
const GEMINI_ARTICLE_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Prompt système commun à tous les types d'articles */
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

FORMAT DE SORTIE :
Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "article": {
    "title": "Titre H1 avec ville et année",
    "slug": "slug-url-en-minuscules",
    "content": "Contenu HTML complet de l'article (balises h2, h3, p, ul, table, etc.)",
    "excerpt": "Résumé 2-3 phrases (150-200 caractères)",
    "meta_description": "Meta description SEO (150-160 caractères)",
    "tags": ["tag1", "tag2"],
    "json_ld": { "@context": "https://schema.org", "@type": "Article", ... }
  },
  "extracted_data": {
    "localities": [
      {
        "city": "Nom de la ville",
        "code_insee": "12345",
        "fields": {
          "avg_purchase_price_per_m2": 4200,
          "avg_rent_per_m2": 12.5,
          ...
        }
      }
    ],
    "global": {}
  }
}`;

/** Prompts spécifiques par catégorie */
const CATEGORY_PROMPTS: Record<ArticleCategory, string> = {
  guide_ville: `Rédige un GUIDE D'INVESTISSEMENT COMPLET pour la ville indiquée.
Longueur : 2 500-4 000 mots.
Sections obligatoires : marché immobilier (prix segmentés), marché locatif, rendement estimé,
Airbnb/LCD, meilleurs quartiers (3+), démographie/économie, qualité de vie, transports,
fiscalité/dispositifs, risques, projets urbains, FAQ (5+ questions), CTA.
Extraire le MAXIMUM de champs LocalityDataFields dans extracted_data.`,

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

/**
 * Appelle Gemini directement avec le modèle Flash (pas flash-lite)
 * pour la rédaction d'articles (plus de qualité nécessaire).
 */
async function callGeminiFlash(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_ARTICLE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120_000), // 2 min pour les articles longs
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 16384,
          responseMimeType: "application/json",
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

Génère l'article en JSON selon le format demandé.`;

  const raw = await callGeminiFlash(fullPrompt);

  // Parser le JSON (Gemini peut parfois entourer de ```json...```)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: GeneratedArticle;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Erreur parsing JSON Gemini: ${e instanceof Error ? e.message : String(e)}\nRéponse brute (500 premiers chars): ${cleaned.slice(0, 500)}`
    );
  }

  // Validation minimale de la structure
  if (!parsed.article?.title || !parsed.article?.content) {
    throw new Error("Article généré invalide : title ou content manquant");
  }
  if (!parsed.article.slug) {
    parsed.article.slug = slugify(parsed.article.title);
  }

  return parsed;
}

/** Génère un slug URL à partir d'un titre */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Retirer les accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
