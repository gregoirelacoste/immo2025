import { MarketData } from "./types";
import { getReferenceRent } from "./rent-reference";
import { getCommuneCode, fetchDvfMutations } from "./dvf-client";

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
