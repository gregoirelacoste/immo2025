export interface MarketData {
  avgPurchasePricePerM2: number | null;
  medianPurchasePricePerM2: number | null;
  transactionCount: number;
  communeName: string;
  period: string;
  avgRentPerM2: number | null;
  rentSource: "reference" | "dvf-estimate" | null;
}

interface GeoCommune {
  nom: string;
  code: string;
  codesPostaux: string[];
}

interface DvfMutation {
  valeur_fonciere: string;
  surface_reelle_bati: string;
  type_local: string;
  date_mutation: string;
}

/**
 * Loyer moyen /m²/mois (non meublé) pour les grandes villes françaises.
 * Sources : observatoires locaux des loyers, données encadrement 2024-2025.
 * Clé = nom normalisé en minuscules sans accents.
 */
const RENT_REFERENCE: Record<string, number> = {
  paris: 30,
  lyon: 15,
  marseille: 14,
  toulouse: 12.5,
  nice: 18,
  nantes: 13.5,
  montpellier: 15,
  strasbourg: 13,
  bordeaux: 14.5,
  lille: 14,
  rennes: 13.5,
  reims: 11,
  "saint-etienne": 8,
  "le havre": 10.5,
  toulon: 13,
  grenoble: 12.5,
  dijon: 11.5,
  angers: 12,
  nimes: 11,
  "clermont-ferrand": 10.5,
  "aix-en-provence": 16,
  brest: 10,
  tours: 12,
  limoges: 9,
  amiens: 11,
  perpignan: 10,
  besancon: 10.5,
  metz: 10.5,
  orleans: 11.5,
  rouen: 12,
  caen: 11.5,
  nancy: 11,
  avignon: 12,
  poitiers: 10,
  "la rochelle": 13,
  pau: 9.5,
  bayonne: 13,
  cannes: 18,
  antibes: 17,
  ajaccio: 13,
  bastia: 11,
  chambery: 12,
  annecy: 15,
  valence: 10,
  "saint-nazaire": 10,
  lorient: 9.5,
  quimper: 9.5,
  vannes: 11,
  colmar: 10.5,
  troyes: 10,
  "le mans": 10,
  villeurbanne: 14,
  versailles: 22,
  "boulogne-billancourt": 25,
  "saint-denis": 18,
  montreuil: 20,
  argenteuil: 16,
  "saint-malo": 12,
  "la-roche-sur-yon": 9,
};

/** Normalise un nom de ville pour correspondance dans la table */
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cherche le loyer /m² dans la table de référence */
function getReferenceRent(cityName: string): number | null {
  return RENT_REFERENCE[normalizeCity(cityName)] ?? null;
}

/** Résout un nom de ville vers son code INSEE via geo.api.gouv.fr */
async function getCommuneCode(cityName: string): Promise<GeoCommune | null> {
  const res = await fetch(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(cityName)}&fields=nom,code,codesPostaux&boost=population&limit=1`
  );
  if (!res.ok) return null;
  const data: GeoCommune[] = await res.json();
  return data[0] ?? null;
}

/** Récupère les mutations DVF pour une commune (API DVF Etalab open data) */
async function fetchDvfMutations(codeCommune: string): Promise<DvfMutation[]> {
  // Utiliser l'API DVF open data de data.gouv.fr (Cerema)
  // Endpoint : https://apidf-preprod.cerema.fr/dvf_opendata/mutations/
  // Fallback : API cquest
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 2;

  // Tenter l'API DVF open data officielle
  try {
    const url = `https://api.cquest.org/dvf?code_commune=${codeCommune}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      const results = json.resultats as DvfMutation[] | undefined;
      if (results && results.length > 0) {
        // Filtrer les mutations récentes
        return results.filter((m) => {
          const year = parseInt(m.date_mutation?.slice(0, 4) || "0", 10);
          return year >= minYear;
        });
      }
    }
  } catch {
    // Timeout ou erreur réseau
  }

  return [];
}

/** Calcule le prix moyen au m² depuis les mutations DVF */
export async function getMarketData(cityName: string): Promise<MarketData | null> {
  if (!cityName.trim()) return null;

  const commune = await getCommuneCode(cityName);
  if (!commune) return null;

  const mutations = await fetchDvfMutations(commune.code);

  // Filtrer : garder uniquement les ventes avec prix et surface valides
  const validSales = mutations
    .filter((m) => {
      const price = parseFloat(m.valeur_fonciere);
      const surface = parseFloat(m.surface_reelle_bati);
      const type = (m.type_local || "").toLowerCase();
      return (
        price > 10000 &&
        surface > 5 &&
        surface < 500 &&
        (type.includes("appartement") || type.includes("maison"))
      );
    })
    .map((m) => ({
      pricePerM2: parseFloat(m.valeur_fonciere) / parseFloat(m.surface_reelle_bati),
    }));

  // Calculer les données d'achat (même avec peu de ventes)
  let avgPurchase: number | null = null;
  let medianPurchase: number | null = null;
  let transactionCount = 0;

  if (validSales.length >= 3) {
    const prices = validSales.map((s) => s.pricePerM2).sort((a, b) => a - b);
    avgPurchase = Math.round(
      prices.reduce((sum, p) => sum + p, 0) / prices.length
    );
    medianPurchase = Math.round(prices[Math.floor(prices.length / 2)]);
    transactionCount = validSales.length;
  }

  // Données locatives : table de référence > estimation DVF
  const refRent = getReferenceRent(cityName);
  let avgRentPerM2: number | null = null;
  let rentSource: MarketData["rentSource"] = null;

  if (refRent) {
    avgRentPerM2 = refRent;
    rentSource = "reference";
  } else if (medianPurchase) {
    // Estimation : rendement brut moyen ~5.5% → loyer = prixM2 * 5.5% / 12
    avgRentPerM2 = Math.round((medianPurchase * 0.055) / 12 * 10) / 10;
    rentSource = "dvf-estimate";
  }

  // Retourner null seulement si on n'a ni données d'achat ni données de location
  if (!avgPurchase && !avgRentPerM2) return null;

  const currentYear = new Date().getFullYear();

  return {
    avgPurchasePricePerM2: avgPurchase,
    medianPurchasePricePerM2: medianPurchase,
    transactionCount,
    communeName: commune.nom,
    period: `${currentYear - 2}–${currentYear}`,
    avgRentPerM2,
    rentSource,
  };
}
