import { ScrapedPropertyData } from "@/domains/scraping/types";
import { callGemini } from "@/infrastructure/ai/gemini";
import { getAllEquipments, ensureEquipmentsExist } from "@/domains/property/equipment-service";

// ── Registre des champs à extraire ──
// Chaque entrée = clé JSON attendue + description pour le prompt + type + validation

interface ExtractField {
  key: string;
  description: string;
  type: "integer" | "float" | "string" | "enum";
  enumValues?: string[];
}

const EXTRACT_FIELDS: ExtractField[] = [
  { key: "purchase_price", description: "Prix de vente en euros (nombre entier, sans espaces ni symboles)", type: "integer" },
  { key: "surface", description: "Surface habitable en m² (nombre, peut avoir une décimale)", type: "float" },
  { key: "room_count", description: "Nombre de pièces (T1=1, T2=2, T3=3, etc.)", type: "integer" },
  { key: "city", description: "Ville du bien (nom uniquement, sans département ni code postal)", type: "string" },
  { key: "postal_code", description: "Code postal (5 chiffres)", type: "string" },
  { key: "address", description: "Adresse complète si disponible", type: "string" },
  { key: "neighborhood", description: "Quartier du bien (ex: 'Centre historique', 'Saint-Cyprien')", type: "string" },
  { key: "description", description: "Résumé factuel de l'annonce (max 500 caractères)", type: "string" },
  { key: "property_type", description: "Type de bien", type: "enum", enumValues: ["ancien", "neuf"] },
  { key: "dpe_rating", description: "Classe DPE / diagnostic énergétique (lettre A à G)", type: "enum", enumValues: ["A", "B", "C", "D", "E", "F", "G"] },
  { key: "monthly_rent", description: "Loyer mensuel en euros si mentionné (loyer, loyer estimé, revenus locatifs, loyer HC). Nombre entier", type: "integer" },
  { key: "condo_charges", description: "Charges de copropriété ANNUELLES en euros. Si le montant est mensuel, multiplie par 12", type: "integer" },
  { key: "property_tax", description: "Taxe foncière annuelle en euros", type: "integer" },
];

function buildExtractPrompt(knownKeys: string[]): string {
  const fieldLines = EXTRACT_FIELDS.map((f) => {
    let line = `- "${f.key}" : ${f.description}`;
    if (f.type === "enum" && f.enumValues) {
      line += ` — valeurs possibles : ${f.enumValues.map((v) => `"${v}"`).join(", ")}`;
    }
    return line;
  }).join("\n");

  const keysList = knownKeys.map((k) => `"${k}"`).join(", ");

  return `Tu es un expert en immobilier français. Extrais les informations d'une annonce immobilière à partir du texte brut.

Champs à extraire (clés exactes du JSON) :
${fieldLines}
- "amenities" : tableau de clés d'équipements détectés parmi : ${keysList}. Synonymes : stationnement=parking, cellier=cave, véranda=terrasse, clim=climatisation, DV=double_vitrage, FTTH=fibre.
- "amenities_new" : tableau d'équipements NON présents dans la liste connue. Format : [{ "key": "snake_case", "label": "Label FR", "icon": "emoji" }].

- "missing_insights" : tableau d'informations PRÉSENTES dans le texte de l'annonce mais NON couvertes par les champs ci-dessus, et qui seraient pertinentes pour un simulateur d'investissement locatif. Exemples : étage, année de construction, orientation, nombre de lots copropriété, montant des travaux votés, rentabilité annoncée, régime fiscal suggéré, bail en cours, durée du bail, montant du dépôt de garantie, frais d'agence, etc. Format : [{ "field": "nom_du_champ_snake_case", "value": "valeur brute extraite", "reason": "pourquoi c'est utile pour un investisseur" }]. Ne remonte que les infos réellement présentes dans le texte.

RÈGLES :
- Retourne UNIQUEMENT un objet JSON valide avec ces clés exactes.
- Omets les champs non trouvés dans le texte (ne mets pas null ni "").
- Les nombres doivent être des nombres JSON (pas de chaînes).
- Ne retourne rien d'autre que le JSON.`;
}

export async function extractFromText(
  rawText: string
): Promise<ScrapedPropertyData> {
  const equipments = await getAllEquipments();
  const knownKeys = new Set(equipments.map((e) => e.key));
  const prompt = buildExtractPrompt([...knownKeys]);

  const text = rawText.slice(0, 30000);

  const raw = await callGemini(
    prompt + "\n\nTexte de l'annonce :\n" + text,
    { temperature: 0.1, maxOutputTokens: 2048, responseMimeType: "application/json" }
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Échec du parsing de la réponse IA");
  }

  // ── Extraction typée selon le registre ──
  const data: ScrapedPropertyData = {};

  for (const field of EXTRACT_FIELDS) {
    const val = parsed[field.key];
    if (val == null) continue;

    switch (field.key) {
      case "purchase_price":
      case "monthly_rent":
      case "condo_charges":
      case "property_tax":
      case "room_count": {
        const n = parseInt(String(val).replace(/\D/g, ""), 10);
        if (n > 0) (data as Record<string, unknown>)[field.key] = n;
        break;
      }
      case "surface": {
        const n = parseFloat(String(val).replace(/[^\d.,]/g, "").replace(",", "."));
        if (n > 0) data.surface = n;
        break;
      }
      case "postal_code": {
        const pc = String(val).replace(/\D/g, "").slice(0, 5);
        if (pc.length === 5) data.postal_code = pc;
        break;
      }
      case "property_type": {
        if (val === "neuf" || val === "ancien") data.property_type = val;
        break;
      }
      case "dpe_rating": {
        const letter = String(val).trim().toUpperCase();
        if (/^[A-G]$/.test(letter)) data.dpe_rating = letter;
        break;
      }
      case "city":
      case "address":
      case "neighborhood": {
        const s = String(val).trim();
        if (s) (data as Record<string, unknown>)[field.key] = s.slice(0, 1000);
        break;
      }
      case "description": {
        const s = String(val).trim();
        if (s) data.description = s.slice(0, 500);
        break;
      }
    }
  }

  // ── Équipements ──
  const allAmenities: string[] = [];
  if (Array.isArray(parsed.amenities)) {
    const valid = (parsed.amenities as string[]).filter((k) => knownKeys.has(k));
    allAmenities.push(...valid);
  }

  if (Array.isArray(parsed.amenities_new) && parsed.amenities_new.length > 0) {
    const newItems = (parsed.amenities_new as Array<{ key: string; label: string; icon: string }>)
      .filter((item) => item.key && !knownKeys.has(item.key));
    if (newItems.length > 0) {
      const createdKeys = await ensureEquipmentsExist(newItems);
      allAmenities.push(...createdKeys);
    }
  }

  if (allAmenities.length > 0) data.amenities = allAmenities;

  // ── Missing insights → auto-feed roadmap (fire & forget) ──
  if (Array.isArray(parsed.missing_insights) && parsed.missing_insights.length > 0) {
    processInsights(parsed.missing_insights as MissingInsight[]).catch((e) =>
      console.warn("[text-extractor] processInsights failed:", e)
    );
  }

  return data;
}

interface MissingInsight {
  field: string;
  value: string;
  reason: string;
}

async function processInsights(insights: MissingInsight[]): Promise<void> {
  const { createAIInsight } = await import("@/domains/roadmap/actions");
  for (const insight of insights.slice(0, 5)) {
    if (!insight.field || !insight.reason) continue;
    const title = `Ajouter le champ "${insight.field}" au simulateur`;
    const value = insight.value ?? "";
    const description = `Détecté dans une annonce.${value ? ` Valeur exemple : "${value}".` : ""} Pertinence : ${insight.reason}`;
    await createAIInsight(title, description);
  }
}
