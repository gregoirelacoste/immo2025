import { callGeminiWithSearch, callGemini } from "@/infrastructure/ai/gemini";
import { extractJsonFromAIResponse } from "@/infrastructure/ai/json-extractor";
import type { Property, PropertyCalculations } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";
import type { LocalityDataFields } from "@/domains/locality/types";
import type { AiEvaluation } from "./types";
import { formatCurrency } from "@/lib/calculations";

// ─── Prompt builder ─────────────────────────────────────────────

function buildEvaluationPrompt(
  property: Property,
  simulation: Simulation,
  calcs: PropertyCalculations,
  locality: Partial<LocalityDataFields> | null
): string {
  const lines: string[] = [];

  // Section 1: Le bien
  lines.push("## LE BIEN");
  lines.push(`- Ville : ${property.city} (${property.postal_code})`);
  if (property.neighborhood) lines.push(`- Quartier : ${property.neighborhood}`);
  lines.push(`- Prix d'achat : ${formatCurrency(property.purchase_price)}`);
  lines.push(`- Surface : ${property.surface} m²`);
  lines.push(`- Prix/m² : ${formatCurrency(property.surface > 0 ? property.purchase_price / property.surface : 0)}`);
  lines.push(`- Type : ${property.property_type} (${property.building_type})`);
  if (property.room_count > 0) lines.push(`- Pièces : ${property.room_count}`);
  if (property.dpe_rating) lines.push(`- DPE : ${property.dpe_rating}`);
  if (property.renovation_cost > 0) lines.push(`- Travaux prévus : ${formatCurrency(property.renovation_cost)}`);
  lines.push(`- Charges copro : ${formatCurrency(property.condo_charges)}/an`);
  lines.push(`- Taxe foncière : ${formatCurrency(property.property_tax)}/an`);

  // Section 2: La simulation active
  lines.push("\n## SIMULATION ACTIVE");
  const negoPrice = simulation.negotiated_price ?? 0;
  if (negoPrice > 0 && negoPrice !== property.purchase_price) {
    lines.push(`- Prix négocié : ${formatCurrency(negoPrice)} (vs ${formatCurrency(property.purchase_price)} affiché)`);
  }
  lines.push(`- Loyer mensuel retenu : ${formatCurrency(simulation.monthly_rent > 0 ? simulation.monthly_rent : property.monthly_rent)}`);
  lines.push(`- Taux vacance : ${simulation.vacancy_rate}%`);
  lines.push(`- Taux emprunt : ${simulation.interest_rate}%`);
  lines.push(`- Durée prêt : ${simulation.loan_duration} ans`);
  lines.push(`- Apport : ${formatCurrency(simulation.personal_contribution)}`);
  lines.push(`- Régime fiscal : ${simulation.fiscal_regime}`);
  lines.push(`- Rendement brut : ${calcs.gross_yield.toFixed(2)}%`);
  lines.push(`- Rendement net : ${calcs.net_yield.toFixed(2)}%`);
  lines.push(`- Rendement net-net (après impôts) : ${calcs.net_net_yield.toFixed(2)}%`);
  lines.push(`- Cash-flow mensuel : ${Math.round(calcs.monthly_cashflow)} €`);
  lines.push(`- Coût total crédit : ${formatCurrency(calcs.total_loan_cost)}`);
  lines.push(`- Coût total projet : ${formatCurrency(calcs.total_project_cost)}`);

  // Section 3: Marché local
  if (locality) {
    lines.push("\n## MARCHÉ LOCAL (données officielles)");
    if (locality.avg_purchase_price_per_m2)
      lines.push(`- Prix moyen achat : ${Math.round(locality.avg_purchase_price_per_m2)} €/m²`);
    if (locality.median_purchase_price_per_m2)
      lines.push(`- Prix médian achat : ${Math.round(locality.median_purchase_price_per_m2)} €/m²`);
    if (locality.price_trend_pct != null)
      lines.push(`- Tendance prix 1 an : ${locality.price_trend_pct > 0 ? "+" : ""}${locality.price_trend_pct.toFixed(1)}%`);
    if (locality.avg_rent_per_m2)
      lines.push(`- Loyer moyen : ${locality.avg_rent_per_m2.toFixed(1)} €/m²`);
    if (locality.avg_rent_furnished_per_m2)
      lines.push(`- Loyer moyen meublé : ${locality.avg_rent_furnished_per_m2.toFixed(1)} €/m²`);
    if (locality.vacancy_rate != null)
      lines.push(`- Taux de vacance marché : ${locality.vacancy_rate.toFixed(1)}%`);
    if (locality.avg_condo_charges_per_m2)
      lines.push(`- Charges copro moyennes : ${locality.avg_condo_charges_per_m2.toFixed(1)} €/m²/mois`);
    if (locality.avg_airbnb_night_price)
      lines.push(`- Airbnb : ${Math.round(locality.avg_airbnb_night_price)} €/nuit (occupation ${locality.avg_airbnb_occupancy_rate ?? "?"}%)`);

    // Socio-économique
    lines.push("\n## CONTEXTE SOCIO-ÉCONOMIQUE");
    if (locality.population)
      lines.push(`- Population : ${locality.population.toLocaleString("fr-FR")}`);
    if (locality.population_growth_pct != null)
      lines.push(`- Croissance pop. : ${locality.population_growth_pct > 0 ? "+" : ""}${locality.population_growth_pct.toFixed(1)}%`);
    if (locality.median_income)
      lines.push(`- Revenu médian : ${locality.median_income.toLocaleString("fr-FR")} €/an`);
    if (locality.unemployment_rate != null)
      lines.push(`- Taux chômage : ${locality.unemployment_rate.toFixed(1)}%`);
    if (locality.poverty_rate != null)
      lines.push(`- Taux pauvreté : ${locality.poverty_rate.toFixed(1)}%`);
    if (locality.vacant_housing_pct != null)
      lines.push(`- Logements vacants : ${locality.vacant_housing_pct.toFixed(1)}%`);
    if (locality.public_transport_score != null)
      lines.push(`- Score transports : ${locality.public_transport_score}/10`);

    // Risques
    lines.push("\n## RISQUES NATURELS");
    if (locality.risk_level)
      lines.push(`- Niveau global : ${locality.risk_level}`);
    if (locality.flood_risk_level)
      lines.push(`- Inondation : ${locality.flood_risk_level}`);
    if (locality.seismic_zone != null)
      lines.push(`- Zone sismique : ${locality.seismic_zone}/5`);
    if (locality.radon_level != null)
      lines.push(`- Radon : niveau ${locality.radon_level}/3`);

    // Qualitatif
    if (locality.neighborhood_vibe || locality.neighborhood_strengths?.length) {
      lines.push("\n## ANALYSE QUARTIER (déjà connue)");
      if (locality.neighborhood_vibe)
        lines.push(`- Ambiance : ${locality.neighborhood_vibe}`);
      if (locality.neighborhood_strengths?.length)
        lines.push(`- Forces : ${locality.neighborhood_strengths.join(", ")}`);
      if (locality.neighborhood_weaknesses?.length)
        lines.push(`- Faiblesses : ${locality.neighborhood_weaknesses.join(", ")}`);
      if (locality.neighborhood_investment_outlook)
        lines.push(`- Perspective investissement : ${locality.neighborhood_investment_outlook}`);
      if (locality.neighborhood_safety)
        lines.push(`- Sécurité : ${locality.neighborhood_safety}`);
    }
  }

  return `Tu es un expert indépendant en investissement locatif en France. On te soumet un dossier complet d'un bien immobilier avec sa simulation financière et les données marché de la localité.

Ton rôle : CHALLENGER honnêtement ce bien et cette simulation. Sois critique, factuel, et utilise tes connaissances + des données internet récentes pour croiser les informations.

${lines.join("\n")}

---

CONSIGNES D'ANALYSE :

1. **Prix** (/20) : Le prix/m² est-il cohérent vs le marché local et les tendances ? Y a-t-il une surcote ou décote ? Recherche sur internet les prix récents dans ce secteur.

2. **Rendement** (/20) : Les rendements simulés (brut/net/net-net) sont-ils réalistes pour cette ville ? Compare avec les rendements moyens observés dans ce secteur. Le loyer retenu est-il atteignable ?

3. **Localisation** (/20) : La ville/quartier est-il porteur pour du locatif ? Demande locative, dynamisme économique, projets urbains, bassin d'emploi. Recherche les dernières tendances.

4. **Risques** (/20) : Red flags ? Risques naturels, vacance locative élevée, DPE problématique, marché en déclin, réglementation défavorable (encadrement des loyers ?), copropriété à risque.

5. **Hypothèses** (/20) : Les hypothèses de la simulation sont-elles raisonnables ? Taux de vacance réaliste ? Charges sous-estimées ? Taux d'emprunt cohérent ? Régime fiscal optimal ?

IMPORTANT :
- Score chaque axe sur 20 de façon HONNÊTE (pas de complaisance)
- Cite des données concrètes trouvées sur internet quand possible
- Identifie les RED FLAGS et les POINTS FORTS
- Donne un AVIS GLOBAL sincère en 3-4 phrases

Retourne ta réponse en JSON dans un bloc \`\`\`json ... \`\`\` :

\`\`\`json
{
  "prix": { "score": 15, "comment": "..." },
  "rendement": { "score": 12, "comment": "..." },
  "localisation": { "score": 16, "comment": "..." },
  "risques": { "score": 14, "comment": "..." },
  "hypotheses": { "score": 13, "comment": "..." },
  "score_global": 70,
  "avis_global": "...",
  "red_flags": ["...", "..."],
  "points_forts": ["...", "..."]
}
\`\`\`

Ne retourne RIEN d'autre que le bloc JSON.`;
}

// ─── JSON parsing ───────────────────────────────────────────────

function clampScore(v: unknown, max: number): number {
  const n = typeof v === "number" ? v : 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === "string").map(s => s.trim()).filter(Boolean);
}

function validateEvaluation(raw: Record<string, unknown>): AiEvaluation {
  const axis = (key: string) => {
    const obj = raw[key] as Record<string, unknown> | undefined;
    return {
      score: clampScore(obj?.score, 20),
      comment: typeof obj?.comment === "string" ? obj.comment.trim() : "",
    };
  };

  const prix = axis("prix");
  const rendement = axis("rendement");
  const localisation = axis("localisation");
  const risques = axis("risques");
  const hypotheses = axis("hypotheses");

  const computedTotal = prix.score + rendement.score + localisation.score + risques.score + hypotheses.score;

  return {
    prix,
    rendement,
    localisation,
    risques,
    hypotheses,
    score_global: clampScore(raw.score_global ?? computedTotal, 100),
    avis_global: typeof raw.avis_global === "string" ? raw.avis_global.trim() : "",
    red_flags: toStringArray(raw.red_flags),
    points_forts: toStringArray(raw.points_forts),
  };
}

// ─── Public API ─────────────────────────────────────────────────

export async function evaluatePropertyWithAI(
  property: Property,
  simulation: Simulation,
  calcs: PropertyCalculations,
  locality: Partial<LocalityDataFields> | null
): Promise<AiEvaluation> {
  const prompt = buildEvaluationPrompt(property, simulation, calcs, locality);

  // Strategy 1: Gemini with Google Search grounding (richer data but JSON format not guaranteed)
  try {
    const rawResponse = await callGeminiWithSearch(prompt, {
      temperature: 0.4,
      maxOutputTokens: 4096,
    });
    console.log("[evaluatePropertyWithAI] Grounded response length:", rawResponse.length);
    const parsed = extractJsonFromAIResponse<Record<string, unknown>>(rawResponse, "évaluation");
    return validateEvaluation(parsed);
  } catch (e) {
    console.warn("[evaluatePropertyWithAI] Grounded call failed, falling back to non-grounded:", (e as Error).message);
  }

  // Strategy 2: Fallback — non-grounded call with responseMimeType: "application/json" (guaranteed valid JSON)
  const fallbackResponse = await callGemini(prompt, {
    temperature: 0.4,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  });
  console.log("[evaluatePropertyWithAI] Fallback response length:", fallbackResponse.length);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fallbackResponse);
  } catch {
    // Even with responseMimeType, try the extractor as last resort
    parsed = extractJsonFromAIResponse<Record<string, unknown>>(fallbackResponse, "évaluation");
  }
  return validateEvaluation(parsed);
}
