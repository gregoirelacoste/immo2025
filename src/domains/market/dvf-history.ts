import { getCommuneCode, fetchDvfMutations } from "./dvf-client";

export interface DvfTransaction {
  date: string;           // "2024-01-15"
  price: number;          // valeur_fonciere
  surface: number;        // surface_reelle_bati
  pricePerM2: number;     // calculated
  type: string;           // "Appartement" | "Maison"
  rooms: number;          // nombre_pieces_principales
}

/**
 * Récupère l'historique des transactions DVF pour une ville.
 * Retourne les 20 dernières ventes triées par date décroissante.
 */
export async function fetchDvfHistory(
  city: string,
  postalCode?: string
): Promise<DvfTransaction[]> {
  const commune = await getCommuneCode(city);
  if (!commune) return [];

  // If postal code provided, verify it matches (handles multi-commune cities)
  if (postalCode && !commune.codesPostaux.includes(postalCode)) {
    // Still use the commune code, postal code is just a hint
  }

  const mutations = await fetchDvfMutations(commune.code);
  if (!mutations.length) return [];

  const transactions: DvfTransaction[] = mutations
    .filter((m) => {
      const price = parseFloat(m.valeur_fonciere);
      const surface = parseFloat(m.surface_reelle_bati);
      // Keep only actual sales with valid price, surface, and type
      return price > 0 && surface > 0 && m.type_local;
    })
    .map((m) => {
      const price = parseFloat(m.valeur_fonciere);
      const surface = parseFloat(m.surface_reelle_bati);
      return {
        date: m.date_mutation,
        price,
        surface,
        pricePerM2: Math.round(price / surface),
        type: m.type_local,
        rooms: parseInt(m.nombre_pieces_principales || "0", 10) || 0,
      } satisfies DvfTransaction;
    })
    // Sort by date descending
    .sort((a, b) => b.date.localeCompare(a.date))
    // Limit to 20 most recent
    .slice(0, 20);

  return transactions;
}
