import { FieldSelector } from "@/types/scraping";
import { cleanHtmlForAi } from "./html-cleaner";

const AI_PROMPT = `Tu es un expert en web scraping. Analyse ce HTML d'une annonce immobilière et génère un manifest JSON de sélecteurs CSS pour extraire les informations suivantes.

Pour chaque champ, fournis un objet avec :
- "css": le sélecteur CSS le plus fiable (préférer data-*, id, puis classes sémantiques)
- "fallbacks": tableau de 1-2 sélecteurs CSS alternatifs
- "attribute": null pour textContent, ou le nom de l'attribut (ex: "content")
- "regex": regex pour extraire la valeur du texte brut (ex: "([\\d\\s]+)" pour un prix), ou null
- "transform": "number" pour les prix/chiffres, "area" pour les surfaces, "text" pour le texte

Champs à extraire :
- purchase_price : le prix de vente
- surface : la surface habitable en m²
- city : la ville
- address : l'adresse complète si disponible
- description : le texte de description
- property_type : "ancien" ou "neuf" si identifiable

Retourne UNIQUEMENT un objet JSON valide. Pas de commentaires, pas de virgule après le dernier élément.

HTML à analyser :
`;

/** Tente de réparer un JSON malformé (trailing commas, etc.) */
function sanitizeJson(text: string): string {
  // Retirer les trailing commas avant } ou ]
  return text
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
}

/** Appelle Gemini Flash Lite pour générer les sélecteurs CSS */
export async function generateSelectorsWithAi(
  html: string
): Promise<Record<string, FieldSelector>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY manquante. Ajoutez-la dans .env.local"
    );
  }

  const cleanedHtml = cleanHtmlForAi(html);
  const prompt = AI_PROMPT + cleanedHtml;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
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
  const text =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text.trim()) {
    throw new Error("L'IA a retourné une réponse vide");
  }

  // Tenter le parse direct (mode JSON natif de Gemini)
  let selectors: Record<string, FieldSelector>;
  try {
    selectors = JSON.parse(text);
  } catch {
    // Fallback : extraire le JSON et réparer les erreurs courantes
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("L'IA n'a pas retourné de JSON valide");
    }
    try {
      selectors = JSON.parse(sanitizeJson(jsonMatch[0]));
    } catch (e) {
      throw new Error(
        `JSON invalide dans la réponse IA : ${(e as Error).message}`
      );
    }
  }

  // Valider et normaliser la structure
  for (const [key, selector] of Object.entries(selectors)) {
    if (!selector.css || typeof selector.css !== "string") {
      delete selectors[key];
      continue;
    }
    if (!Array.isArray(selector.fallbacks)) {
      selector.fallbacks = [];
    }
    if (selector.attribute === undefined) {
      selector.attribute = null;
    }
    if (selector.regex === undefined) {
      selector.regex = null;
    }
    if (selector.transform === undefined) {
      selector.transform = null;
    }
  }

  if (Object.keys(selectors).length === 0) {
    throw new Error("L'IA n'a généré aucun sélecteur valide");
  }

  return selectors;
}
