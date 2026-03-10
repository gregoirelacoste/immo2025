import { ScrapedPropertyData } from "@/types/scraping";

const EXTRACT_PROMPT = `Tu es un expert en immobilier français. Extrais les informations d'une annonce immobilière à partir du texte brut collé par l'utilisateur.

Extrais ces champs :
- purchase_price : le prix de vente en euros (nombre entier)
- surface : la surface habitable en m² (nombre)
- city : la ville du bien (nom uniquement, pas le département)
- postal_code : le code postal (5 chiffres)
- address : l'adresse complète si disponible
- description : résumé de l'annonce (max 500 caractères)
- property_type : "ancien" ou "neuf"

Retourne UNIQUEMENT un objet JSON valide avec ces champs. Si un champ n'est pas trouvé, omets-le.
Ne retourne rien d'autre que le JSON.
`;

export async function extractFromText(
  rawText: string
): Promise<ScrapedPropertyData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante");
  }

  // Limiter le texte à 30000 caractères
  const text = rawText.slice(0, 30000);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: EXTRACT_PROMPT + "\nTexte de l'annonce :\n" + text }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}`);
  }

  const result = await response.json();
  const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const parsed = JSON.parse(raw);

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
  if (parsed.property_type === "neuf") data.property_type = "neuf";
  else if (parsed.property_type === "ancien") data.property_type = "ancien";

  return data;
}
