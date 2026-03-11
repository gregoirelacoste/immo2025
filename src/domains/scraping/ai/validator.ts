import { ScrapedPropertyData } from "@/domains/scraping/types";
import { callGemini } from "@/infrastructure/ai/gemini";

const VALIDATE_PROMPT = `Tu es un expert en immobilier français. Vérifie la cohérence de ces données extraites d'une annonce immobilière.

Données extraites :
`;

const VALIDATE_SUFFIX = `
Vérifie :
1. Le prix est-il réaliste pour l'immobilier français ? (entre 10 000€ et 50 000 000€)
2. La surface est-elle réaliste ? (entre 5m² et 10 000m²)
3. Le prix au m² est-il cohérent avec le marché ? (entre 500€/m² et 25 000€/m²)
4. La ville est-elle un nom de ville français plausible ?
5. Les champs ne sont-ils pas mélangés ? (le prix n'est pas dans la surface, etc.)

Retourne UNIQUEMENT un objet JSON :
{
  "valid": true/false,
  "errors": ["description de chaque erreur détectée"],
  "suggestions": ["suggestion de correction si applicable"]
}
`;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  suggestions: string[];
}

/** Valide les données extraites via l'IA */
export async function validateWithAi(
  data: ScrapedPropertyData
): Promise<ValidationResult> {
  if (!process.env.GEMINI_API_KEY) {
    // Sans clé API, on skip la validation
    return { valid: true, errors: [], suggestions: [] };
  }

  // Construire le contexte lisible
  const context = [
    data.purchase_price != null && `Prix : ${data.purchase_price.toLocaleString("fr-FR")} €`,
    data.surface != null && `Surface : ${data.surface} m²`,
    data.city && `Ville : ${data.city}`,
    data.address && `Adresse : ${data.address}`,
    data.description && `Description : ${data.description.slice(0, 200)}...`,
    data.property_type && `Type : ${data.property_type}`,
    data.purchase_price && data.surface && `Prix au m² : ${Math.round(data.purchase_price / data.surface).toLocaleString("fr-FR")} €/m²`,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = VALIDATE_PROMPT + context + VALIDATE_SUFFIX;

  let text: string;
  try {
    text = await callGemini(prompt, {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    });
  } catch {
    // En cas d'erreur API, on ne bloque pas — on considère valide
    return { valid: true, errors: [], suggestions: [] };
  }

  try {
    const parsed = JSON.parse(text);
    return {
      valid: !!parsed.valid,
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    // JSON invalide → on considère valide pour ne pas bloquer
    return { valid: true, errors: [], suggestions: [] };
  }
}

/** Validation locale rapide avant d'appeler l'IA (évite un appel inutile) */
export function quickValidate(data: ScrapedPropertyData): string[] {
  const errors: string[] = [];

  if (data.purchase_price != null) {
    if (data.purchase_price < 1000)
      errors.push(`Prix trop bas (${data.purchase_price}€) — possible erreur d'extraction`);
    if (data.purchase_price > 100_000_000)
      errors.push(`Prix trop élevé (${data.purchase_price}€) — possible erreur d'extraction`);
  }

  if (data.surface != null) {
    if (data.surface < 5)
      errors.push(`Surface trop petite (${data.surface}m²) — possible erreur d'extraction`);
    if (data.surface > 50_000)
      errors.push(`Surface trop grande (${data.surface}m²) — possible erreur d'extraction`);
  }

  if (data.purchase_price && data.surface) {
    const pricePerM2 = data.purchase_price / data.surface;
    if (pricePerM2 < 100)
      errors.push(`Prix/m² incohérent (${Math.round(pricePerM2)}€/m²) — champs probablement mélangés`);
    if (pricePerM2 > 50_000)
      errors.push(`Prix/m² incohérent (${Math.round(pricePerM2)}€/m²) — champs probablement mélangés`);
  }

  return errors;
}
