import { FieldSelector, ScrapedPropertyData } from "@/types/scraping";
import { cleanHtmlForAi } from "./html-cleaner";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante. Ajoutez-la dans .env.local");
  }

  const cleanedHtml = cleanHtmlForAi(html);
  const basePrompt =
    previousErrors.length > 0
      ? buildRetryPrompt(previousErrors)
      : GENERATE_PROMPT;
  const prompt = basePrompt + "\nHTML à analyser :\n" + cleanedHtml;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
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
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text.trim()) {
    throw new Error("L'IA a retourné une réponse vide");
  }

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

  return { selectors, extractedValues: data };
}
