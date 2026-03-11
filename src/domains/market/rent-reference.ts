/**
 * Loyer moyen /m²/mois (non meublé) pour les grandes villes françaises.
 * Sources : observatoires locaux des loyers, données encadrement 2024-2025.
 * Clé = nom normalisé en minuscules sans accents.
 */
export const RENT_REFERENCE: Record<string, number> = {
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
export function getReferenceRent(cityName: string): number | null {
  return RENT_REFERENCE[normalizeCity(cityName)] ?? null;
}
