import { FieldSelector, ScrapedPropertyData } from "@/domains/scraping/types";
import { cleanHtmlForAi } from "@/domains/scraping/pipeline/html-cleaner";
import { callGemini } from "@/infrastructure/ai/gemini";
import { AMENITY_KEYS } from "@/domains/property/amenities";

const VALID_AMENITIES = new Set<string>(AMENITY_KEYS);

const GENERATE_PROMPT = `Tu es un expert en web scraping immobilier. Analyse ce HTML d'une annonce immobilière.

TÂCHE 1 — Génère un manifest JSON de sélecteurs CSS pour extraire les champs suivants.
TÂCHE 2 — Extrais directement les valeurs que tu trouves dans le HTML.

Pour chaque champ, fournis :
- "css": le sélecteur CSS le plus fiable (préférer data-*, id, puis classes sémantiques)
- "fallbacks": tableau de 1-2 sélecteurs CSS alternatifs
- "attribute": null pour textContent, ou le nom de l'attribut (ex: "content")
- "regex": regex d'extraction (ex: "([\\d\\s]+)" pour un prix), ou null
- "transform": "number" pour les prix, "area" pour les surfaces, "text" pour le texte
- "extracted_value": la valeur brute que tu as trouvée dans le HTML pour ce champ

Champs à extraire :
- purchase_price : le prix de vente (en euros)
- surface : la surface habitable en m²
- city : la ville du bien. Cherche dans : le fil d'ariane (breadcrumb), le titre de la page, les balises meta (og:locality, geo.placename), l'URL, la section "localisation", l'adresse postale. Retourne UNIQUEMENT le nom de la ville (ex: "Lyon", "Bordeaux"), pas le département, le code postal ni l'arrondissement.
- postal_code : le code postal (5 chiffres) si trouvé dans l'adresse, le breadcrumb ou les meta
- address : l'adresse complète si disponible (numéro, rue, code postal, ville)
- description : le texte de description de l'annonce (max 500 caractères)
- property_type : "ancien" ou "neuf" si identifiable
- amenities : tableau de clés d'équipements détectés parmi EXACTEMENT ces valeurs : "garage", "parking", "cave", "balcon", "terrasse", "piscine", "jardin", "ascenseur", "gardien", "interphone", "meuble", "climatisation", "cheminee", "parquet", "double_vitrage", "fibre". Cherche dans la description, les caractéristiques, les pictogrammes, les listes de prestations, les critères. Attention : les termes varient selon les sites (ex: "stationnement"="parking", "cellier"="cave", "véranda"="terrasse", "résidence sécurisée"="interphone"+"gardien", "plancher bois"="parquet", "climatiseur/clim"="climatisation", "DV"="double_vitrage", "FTTH"="fibre", "furnished"="meuble"). Pour amenities, le champ "css" n'est pas nécessaire, mets null. Retourne directement la liste dans "extracted_value".

Retourne UNIQUEMENT un objet JSON valide. Pas de commentaires, pas de virgule après le dernier élément.
`;

function buildRetryPrompt(previousErrors: string[]): string {
  return (
    GENERATE_PROMPT +
    `\nATTENTION — Les tentatives précédentes ont échoué avec ces erreurs :\n` +
    previousErrors.map((e, i) => `- Tentative ${i + 1}: ${e}`).join("\n") +
    `\nCorrige les sélecteurs et les valeurs en tenant compte de ces erreurs.\n`
  );
}

/** Nettoie le JSON retourné par l'IA */
function sanitizeJson(text: string): string {
  return text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
}

export interface AiGenerationResult {
  selectors: Record<string, FieldSelector>;
  extractedValues: ScrapedPropertyData;
}

/** Appelle Gemini pour générer sélecteurs + extraire les valeurs */
export async function generateWithAi(
  html: string,
  previousErrors: string[] = []
): Promise<AiGenerationResult> {
  const cleanedHtml = cleanHtmlForAi(html);
  const basePrompt =
    previousErrors.length > 0
      ? buildRetryPrompt(previousErrors)
      : GENERATE_PROMPT;
  const prompt = basePrompt + "\nHTML à analyser :\n" + cleanedHtml;

  const text = await callGemini(prompt, {
    temperature: 0.1,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  });

  let raw: Record<string, Record<string, unknown>>;
  try {
    raw = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("L'IA n'a pas retourné de JSON valide");
    try {
      raw = JSON.parse(sanitizeJson(jsonMatch[0]));
    } catch (e) {
      throw new Error(`JSON invalide : ${(e as Error).message}`);
    }
  }

  // Séparer sélecteurs et valeurs extraites
  const selectors: Record<string, FieldSelector> = {};
  const extractedValues: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(raw)) {
    if (!field || typeof field !== "object") continue;

    // Récupérer la valeur extraite par l'IA
    if (field.extracted_value != null && field.extracted_value !== "") {
      extractedValues[key] = field.extracted_value;
    }

    // Construire le sélecteur
    if (field.css && typeof field.css === "string") {
      selectors[key] = {
        css: field.css as string,
        fallbacks: Array.isArray(field.fallbacks)
          ? (field.fallbacks as string[])
          : [],
        attribute: (field.attribute as string) ?? null,
        regex: (field.regex as string) ?? null,
        transform: (field.transform as FieldSelector["transform"]) ?? null,
      };
    }
  }

  // Normaliser les valeurs extraites
  const data: ScrapedPropertyData = {};
  if (extractedValues.purchase_price != null) {
    const v = String(extractedValues.purchase_price).replace(/[^\d]/g, "");
    const n = parseInt(v, 10);
    if (n > 0) data.purchase_price = n;
  }
  if (extractedValues.surface != null) {
    const v = String(extractedValues.surface).replace(/[^\d.,]/g, "").replace(",", ".");
    const n = parseFloat(v);
    if (n > 0) data.surface = n;
  }
  if (extractedValues.city) data.city = String(extractedValues.city).trim();
  if (extractedValues.postal_code) {
    const pc = String(extractedValues.postal_code).replace(/\D/g, "").slice(0, 5);
    if (pc.length === 5) data.postal_code = pc;
  }
  if (extractedValues.address) data.address = String(extractedValues.address).trim();
  if (extractedValues.description) {
    data.description = String(extractedValues.description).trim().slice(0, 1000);
  }
  if (extractedValues.property_type === "neuf") {
    data.property_type = "neuf";
  } else if (extractedValues.property_type === "ancien") {
    data.property_type = "ancien";
  }
  if (Array.isArray(extractedValues.amenities)) {
    const valid = (extractedValues.amenities as string[]).filter((k) =>
      VALID_AMENITIES.has(k)
    );
    if (valid.length > 0) data.amenities = valid;
  }

  return { selectors, extractedValues: data };
}
