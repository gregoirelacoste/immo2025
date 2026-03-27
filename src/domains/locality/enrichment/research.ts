/**
 * Neighborhood qualitative research via Gemini with Google Search grounding.
 * Searches the web for qualitative data about a specific neighborhood:
 * vibe, strengths/weaknesses, urban projects, transport, safety, investment outlook.
 */

import { callGeminiWithSearch, callGemini } from "@/infrastructure/ai/gemini";
import { extractJsonFromAIResponse } from "@/infrastructure/ai/json-extractor";
import type { LocalityDataFields } from "@/domains/locality/types";

/** What the Gemini prompt returns (before we map to LocalityDataFields) */
export interface NeighborhoodResearchPayload {
  vibe: string;
  strengths: string[];
  weaknesses: string[];
  urban_projects: string[];
  transport_details: string;
  safety_perception: string;
  investment_outlook: string;
  main_employers: string[];
  target_tenants: string;
  purchase_prices: {
    t1: number | null;
    t2: number | null;
    t3: number | null;
    t4plus: number | null;
    house: number | null;
  };
  rent_prices: {
    t1: number | null;
    t2: number | null;
    t3: number | null;
    t4plus: number | null;
    house: number | null;
  };
  /** "quartier" if prices found specifically for the neighborhood, "ville" if city-level fallback */
  pricing_level: "quartier" | "ville";
}

/** Cache validity in days */
export const RESEARCH_CACHE_DAYS = 30;

function buildResearchPrompt(
  city: string,
  neighborhood: string,
  postalCode: string,
  quantData: Partial<LocalityDataFields>
): string {
  // Format quantitative context
  const contextLines: string[] = [];
  if (quantData.avg_purchase_price_per_m2)
    contextLines.push(`Prix moyen d'achat : ${Math.round(quantData.avg_purchase_price_per_m2).toLocaleString("fr-FR")} €/m²`);
  if (quantData.median_purchase_price_per_m2)
    contextLines.push(`Prix médian d'achat : ${Math.round(quantData.median_purchase_price_per_m2).toLocaleString("fr-FR")} €/m²`);
  if (quantData.avg_rent_per_m2)
    contextLines.push(`Loyer moyen : ${quantData.avg_rent_per_m2.toFixed(1)} €/m²`);
  if (quantData.population)
    contextLines.push(`Population : ${quantData.population.toLocaleString("fr-FR")} habitants`);
  if (quantData.median_income)
    contextLines.push(`Revenu médian : ${quantData.median_income.toLocaleString("fr-FR")} €/an`);
  if (quantData.unemployment_rate != null)
    contextLines.push(`Taux de chômage : ${quantData.unemployment_rate.toFixed(1)}%`);
  if (quantData.vacancy_rate != null)
    contextLines.push(`Taux de vacance locative : ${quantData.vacancy_rate.toFixed(1)}%`);
  if (quantData.public_transport_score != null)
    contextLines.push(`Score transports en commun : ${quantData.public_transport_score}/10`);
  if (quantData.risk_level)
    contextLines.push(`Niveau de risques naturels : ${quantData.risk_level}`);
  if (quantData.price_trend_pct != null)
    contextLines.push(`Évolution des prix : ${quantData.price_trend_pct > 0 ? "+" : ""}${quantData.price_trend_pct.toFixed(1)}%/an`);

  const quantContext = contextLines.length > 0
    ? `\n\nDonnées quantitatives connues sur ${city} :\n${contextLines.map(l => `- ${l}`).join("\n")}\n`
    : "";

  const locationDesc = neighborhood
    ? `le quartier "${neighborhood}" à ${city} (${postalCode})`
    : `la ville de ${city} (${postalCode})`;

  return `Tu es un expert en investissement locatif en France. Recherche des informations actuelles et précises sur ${locationDesc}.
${quantContext}
Recherche sur le web et synthétise les informations suivantes :

1. **vibe** : Décris l'ambiance et l'atmosphère du quartier en 2-3 phrases. Quel type d'endroit est-ce ? (calme résidentiel, animé étudiant, quartier en mutation, centre historique, zone pavillonnaire, etc.)

2. **strengths** : Liste 3 à 5 points forts de ce quartier/cette ville pour un investissement locatif (ex: "Quartier calme et familial", "Proche des commodités et commerces", "Bon réseau de transports"). Sois spécifique au lieu.

3. **weaknesses** : Liste 2 à 4 points faibles ou risques (ex: "Peu de transports en commun", "Stationnement difficile", "Quartier bruyant le week-end"). Sois honnête et spécifique.

4. **urban_projects** : Liste les projets urbains en cours ou prévus qui pourraient impacter la valeur immobilière (nouvelle ligne de tramway, rénovation urbaine, ZAC, écoquartier, etc.). Si aucun projet connu, retourne un tableau vide.

5. **transport_details** : Décris les transports en commun disponibles (lignes de métro/tramway/bus, gares SNCF, temps de trajet vers le centre-ville ou les pôles d'emploi). 2-3 phrases.

6. **safety_perception** : Évalue la perception de sécurité du quartier parmi : "sur", "moyen", ou "preoccupant". Base-toi sur les données disponibles et la réputation.

7. **investment_outlook** : Donne ton analyse d'investissement en 2-3 phrases. Le quartier est-il en hausse, stable, ou en déclin ? Quel potentiel de plus-value ou de rendement ?

8. **main_employers** : Liste les principaux employeurs ou pôles d'emploi à proximité (hôpitaux, universités, zones d'activités, entreprises majeures). Si pas d'info spécifique, retourne un tableau vide.

9. **target_tenants** : Décris le profil type des locataires potentiels dans ce quartier (étudiants, jeunes actifs, familles, retraités, cadres, etc.) en 1-2 phrases.

10. **purchase_prices** : Recherche le prix moyen au m² à l'ACHAT dans ce quartier/cette ville pour chaque type de bien. Donne un objet avec les clés : "t1" (studio/1 pièce), "t2" (2 pièces), "t3" (3 pièces), "t4plus" (4 pièces et +), "house" (maison). Les valeurs sont des nombres (€/m²) ou null si inconnu. Base-toi sur les données DVF, MeilleursAgents, SeLoger, ou toute source fiable.

11. **rent_prices** : Même chose pour le prix moyen au m² de LOCATION (loyer mensuel charges comprises). Objet avec les mêmes clés : "t1", "t2", "t3", "t4plus", "house". Valeurs en €/m²/mois ou null si inconnu.

12. **pricing_level** : Indique "quartier" si tu as trouvé des prix spécifiques au quartier, ou "ville" si les prix que tu donnes sont au niveau de la ville entière (parce que tu n'as pas trouvé de données plus fines). Sois honnête et transparent.

IMPORTANT : Retourne ta réponse sous forme d'un unique objet JSON valide enveloppé dans un bloc \`\`\`json ... \`\`\`. Les champs texte sont en français. Les champs tableau contiennent des chaînes de caractères. Exemple de format :

\`\`\`json
{
  "vibe": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "urban_projects": ["...", "..."],
  "transport_details": "...",
  "safety_perception": "sur",
  "investment_outlook": "...",
  "main_employers": ["...", "..."],
  "target_tenants": "...",
  "purchase_prices": { "t1": 4500, "t2": 4200, "t3": 3800, "t4plus": 3500, "house": null },
  "rent_prices": { "t1": 18.5, "t2": 15.2, "t3": 13.0, "t4plus": 11.5, "house": null },
  "pricing_level": "quartier"
}
\`\`\`

Ne retourne RIEN d'autre que le bloc JSON.`;
}

function toNullableNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function parsePriceObject(v: unknown): { t1: number | null; t2: number | null; t3: number | null; t4plus: number | null; house: number | null } {
  const empty = { t1: null, t2: null, t3: null, t4plus: null, house: null };
  if (!v || typeof v !== "object") return empty;
  const obj = v as Record<string, unknown>;
  return {
    t1: toNullableNumber(obj.t1),
    t2: toNullableNumber(obj.t2),
    t3: toNullableNumber(obj.t3),
    t4plus: toNullableNumber(obj.t4plus),
    house: toNullableNumber(obj.house),
  };
}

function validatePayload(raw: Record<string, unknown>): NeighborhoodResearchPayload {
  const toStringArray = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((s): s is string => typeof s === "string").map(s => s.trim()).filter(Boolean);
  };

  return {
    vibe: typeof raw.vibe === "string" ? raw.vibe.trim() : "",
    strengths: toStringArray(raw.strengths),
    weaknesses: toStringArray(raw.weaknesses),
    urban_projects: toStringArray(raw.urban_projects),
    transport_details: typeof raw.transport_details === "string" ? raw.transport_details.trim() : "",
    safety_perception: ["sur", "moyen", "preoccupant"].includes(String(raw.safety_perception))
      ? String(raw.safety_perception)
      : "moyen",
    investment_outlook: typeof raw.investment_outlook === "string" ? raw.investment_outlook.trim() : "",
    main_employers: toStringArray(raw.main_employers),
    target_tenants: typeof raw.target_tenants === "string" ? raw.target_tenants.trim() : "",
    purchase_prices: parsePriceObject(raw.purchase_prices),
    rent_prices: parsePriceObject(raw.rent_prices),
    pricing_level: raw.pricing_level === "quartier" ? "quartier" : "ville",
  };
}

/**
 * Map validated research payload to LocalityDataFields.
 */
function mapResearchToFields(payload: NeighborhoodResearchPayload): Partial<LocalityDataFields> {
  return {
    neighborhood_vibe: payload.vibe || null,
    neighborhood_strengths: payload.strengths.length > 0 ? payload.strengths : null,
    neighborhood_weaknesses: payload.weaknesses.length > 0 ? payload.weaknesses : null,
    neighborhood_urban_projects: payload.urban_projects.length > 0 ? payload.urban_projects : null,
    neighborhood_transport_details: payload.transport_details || null,
    neighborhood_safety: (payload.safety_perception as LocalityDataFields["neighborhood_safety"]) || null,
    neighborhood_investment_outlook: payload.investment_outlook || null,
    neighborhood_main_employers: payload.main_employers.length > 0 ? payload.main_employers : null,
    neighborhood_target_tenants: payload.target_tenants || null,
    neighborhood_purchase_price_t1: payload.purchase_prices.t1,
    neighborhood_purchase_price_t2: payload.purchase_prices.t2,
    neighborhood_purchase_price_t3: payload.purchase_prices.t3,
    neighborhood_purchase_price_t4plus: payload.purchase_prices.t4plus,
    neighborhood_purchase_price_house: payload.purchase_prices.house,
    neighborhood_rent_price_t1: payload.rent_prices.t1,
    neighborhood_rent_price_t2: payload.rent_prices.t2,
    neighborhood_rent_price_t3: payload.rent_prices.t3,
    neighborhood_rent_price_t4plus: payload.rent_prices.t4plus,
    neighborhood_rent_price_house: payload.rent_prices.house,
    neighborhood_pricing_level: payload.pricing_level,
  };
}

/**
 * Run neighborhood research via Gemini with Google Search grounding.
 */
export async function researchNeighborhood(
  city: string,
  neighborhood: string,
  postalCode: string,
  quantData: Partial<LocalityDataFields>
): Promise<Partial<LocalityDataFields>> {
  const prompt = buildResearchPrompt(city, neighborhood, postalCode, quantData);

  // Strategy 1: Gemini with Google Search grounding (richer data but JSON format not guaranteed)
  try {
    const rawResponse = await callGeminiWithSearch(prompt, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    });
    console.log("[researchNeighborhood] Grounded response length:", rawResponse.length);
    const parsed = extractJsonFromAIResponse<Record<string, unknown>>(rawResponse, "recherche quartier");
    const payload = validatePayload(parsed);
    return mapResearchToFields(payload);
  } catch (e) {
    console.warn("[researchNeighborhood] Grounded call failed, falling back to non-grounded:", (e as Error).message);
  }

  // Strategy 2: Fallback — non-grounded call with responseMimeType: "application/json" (guaranteed valid JSON)
  const fallbackResponse = await callGemini(prompt, {
    temperature: 0.3,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    model: "capable",
  });
  console.log("[researchNeighborhood] Fallback response length:", fallbackResponse.length);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fallbackResponse);
  } catch {
    parsed = extractJsonFromAIResponse<Record<string, unknown>>(fallbackResponse, "recherche quartier");
  }
  const payload = validatePayload(parsed);
  return mapResearchToFields(payload);
}
