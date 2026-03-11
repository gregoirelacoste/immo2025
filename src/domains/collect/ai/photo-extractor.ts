import { callGeminiVision } from "@/infrastructure/ai/gemini";
import { PhotoExtractionResult, PhotoExtractedListing } from "@/domains/collect/types";

/** Sanitize a raw key-value object into a typed PhotoExtractedListing */
export function parseRawListing(item: Record<string, unknown>): PhotoExtractedListing {
  const data: PhotoExtractedListing = {};

  if (item.purchase_price != null) {
    const n = parseInt(String(item.purchase_price).replace(/\D/g, ""), 10);
    if (n > 0) data.purchase_price = n;
  }
  if (item.surface != null) {
    const n = parseFloat(String(item.surface).replace(/[^\d.,]/g, "").replace(",", "."));
    if (n > 0) data.surface = n;
  }
  if (item.monthly_rent != null) {
    const n = parseInt(String(item.monthly_rent).replace(/\D/g, ""), 10);
    if (n > 0) data.monthly_rent = n;
  }
  if (item.city) data.city = String(item.city).trim();
  if (item.postal_code) {
    const pc = String(item.postal_code).replace(/\D/g, "").slice(0, 5);
    if (pc.length === 5) data.postal_code = pc;
  }
  if (item.address) data.address = String(item.address).trim();
  if (item.description) data.description = String(item.description).trim().slice(0, 1000);
  if (item.property_type === "neuf") data.property_type = "neuf";
  else if (item.property_type === "ancien") data.property_type = "ancien";

  return data;
}

const PHOTO_PROMPT = `Tu es un expert en immobilier français. Analyse cette photo/capture d'écran et extrais les informations immobilières.

IMPORTANT : Cette image peut être :
1. Une photo d'un bien immobilier (façade, intérieur, terrain)
2. Une capture d'écran d'une annonce immobilière en ligne
3. Une photo d'une vitrine d'agence immobilière avec PLUSIEURS annonces
4. Une photo d'un document (compromis, diagnostic, etc.)

Si l'image contient PLUSIEURS annonces (vitrine d'agence, liste de biens), extrais CHAQUE annonce séparément.

Pour chaque annonce/bien trouvé, extrais ces champs si visibles :
- purchase_price : prix de vente en euros (nombre entier, sans espaces ni symboles)
- surface : surface en m² (nombre)
- city : ville du bien
- postal_code : code postal (5 chiffres)
- address : adresse si visible
- description : brève description du bien (type, nb pièces, etc., max 300 car.)
- property_type : "ancien" ou "neuf"
- monthly_rent : loyer mensuel si indiqué (nombre)

Retourne un objet JSON avec :
- "is_multi_listing": true si plusieurs annonces, false sinon
- "listings": tableau d'objets avec les champs ci-dessus

Si aucune information immobilière n'est trouvée, retourne {"is_multi_listing": false, "listings": []}.
Omets les champs non trouvés dans chaque listing. Ne retourne rien d'autre que le JSON.`;

export async function extractFromPhoto(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<PhotoExtractionResult> {
  const raw = await callGeminiVision(PHOTO_PROMPT, imageBase64, mimeType, {
    temperature: 0.1,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Échec du parsing de la réponse IA Vision");
  }

  const isMultiListing = parsed.is_multi_listing === true;
  const rawListings = Array.isArray(parsed.listings) ? parsed.listings : [];

  const listings = rawListings.map((item: Record<string, unknown>) => parseRawListing(item));

  return { isMultiListing, listings };
}
