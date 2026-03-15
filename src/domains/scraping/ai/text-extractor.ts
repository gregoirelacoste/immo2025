import { ScrapedPropertyData } from "@/domains/scraping/types";
import { callGemini } from "@/infrastructure/ai/gemini";
import { AMENITY_KEYS } from "@/domains/property/amenities";

const VALID_AMENITIES = new Set<string>(AMENITY_KEYS);

const EXTRACT_PROMPT = `Tu es un expert en immobilier français. Extrais les informations d'une annonce immobilière à partir du texte brut collé par l'utilisateur.

Extrais ces champs :
- purchase_price : le prix de vente en euros (nombre entier)
- surface : la surface habitable en m² (nombre)
- city : la ville du bien (nom uniquement, pas le département)
- postal_code : le code postal (5 chiffres)
- address : l'adresse complète si disponible
- description : résumé de l'annonce (max 500 caractères)
- neighborhood : le quartier du bien (ex: "Centre historique", "Saint-Cyprien"). Omets si non trouvé.
- property_type : "ancien" ou "neuf"
- monthly_rent : le loyer mensuel en euros si mentionné (loyer, loyer estimé, revenus locatifs, loyer HC). Nombre entier. Omets si non trouvé.
- condo_charges : les charges de copropriété mensuelles en euros (charges, charges de copropriété, provisions sur charges). Nombre entier. Omets si non trouvé.
- property_tax : la taxe foncière annuelle en euros (taxe foncière, impôt foncier). Nombre entier. Omets si non trouvé.
- amenities : tableau de clés d'équipements détectés parmi EXACTEMENT ces valeurs : "garage", "parking", "cave", "balcon", "terrasse", "piscine", "jardin", "ascenseur", "gardien", "interphone", "meuble", "climatisation", "cheminee", "parquet", "double_vitrage", "fibre". Cherche dans la description, les caractéristiques, les listes de prestations. Attention aux synonymes (stationnement=parking, cellier=cave, véranda=terrasse, clim=climatisation, DV=double_vitrage, FTTH=fibre, etc.)

Retourne UNIQUEMENT un objet JSON valide avec ces champs. Si un champ n'est pas trouvé, omets-le.
Ne retourne rien d'autre que le JSON.
`;

export async function extractFromText(
  rawText: string
): Promise<ScrapedPropertyData> {
  // Limiter le texte à 30000 caractères
  const text = rawText.slice(0, 30000);

  const raw = await callGemini(
    EXTRACT_PROMPT + "\nTexte de l'annonce :\n" + text,
    { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: "application/json" }
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Échec du parsing de la réponse IA");
  }

  const data: ScrapedPropertyData = {};

  if (parsed.purchase_price != null) {
    const n = parseInt(String(parsed.purchase_price).replace(/\D/g, ""), 10);
    if (n > 0) data.purchase_price = n;
  }
  if (parsed.surface != null) {
    const n = parseFloat(String(parsed.surface).replace(/[^\d.,]/g, "").replace(",", "."));
    if (n > 0) data.surface = n;
  }
  if (parsed.city) data.city = String(parsed.city).trim();
  if (parsed.postal_code) {
    const pc = String(parsed.postal_code).replace(/\D/g, "").slice(0, 5);
    if (pc.length === 5) data.postal_code = pc;
  }
  if (parsed.address) data.address = String(parsed.address).trim();
  if (parsed.description) data.description = String(parsed.description).trim().slice(0, 1000);
  if (parsed.neighborhood) data.neighborhood = String(parsed.neighborhood).trim();
  if (parsed.property_type === "neuf") data.property_type = "neuf";
  else if (parsed.property_type === "ancien") data.property_type = "ancien";
  if (Array.isArray(parsed.amenities)) {
    const valid = (parsed.amenities as string[]).filter((k) => VALID_AMENITIES.has(k));
    if (valid.length > 0) data.amenities = valid;
  }
  if (parsed.monthly_rent != null) {
    const n = parseInt(String(parsed.monthly_rent).replace(/\D/g, ""), 10);
    if (n > 0) data.monthly_rent = n;
  }
  if (parsed.condo_charges != null) {
    const n = parseInt(String(parsed.condo_charges).replace(/\D/g, ""), 10);
    if (n > 0) data.condo_charges = n;
  }
  if (parsed.property_tax != null) {
    const n = parseInt(String(parsed.property_tax).replace(/\D/g, ""), 10);
    if (n > 0) data.property_tax = n;
  }

  return data;
}
