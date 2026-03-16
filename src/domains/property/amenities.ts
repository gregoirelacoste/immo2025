/** Liste des équipements détectables */
export const AMENITY_KEYS = [
  "garage",
  "parking",
  "cave",
  "balcon",
  "terrasse",
  "piscine",
  "jardin",
  "ascenseur",
  "gardien",
  "interphone",
  "meuble",
  "climatisation",
  "cheminee",
  "parquet",
  "double_vitrage",
  "fibre",
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  garage: "Garage",
  parking: "Place de parking",
  cave: "Cave",
  balcon: "Balcon",
  terrasse: "Terrasse",
  piscine: "Piscine",
  jardin: "Jardin",
  ascenseur: "Ascenseur",
  gardien: "Gardien / Concierge",
  interphone: "Interphone / Digicode",
  meuble: "Meublé",
  climatisation: "Climatisation",
  cheminee: "Cheminée",
  parquet: "Parquet",
  double_vitrage: "Double vitrage",
  fibre: "Fibre optique",
};

export const AMENITY_ICONS: Record<AmenityKey, string> = {
  garage: "🚗",
  parking: "🅿️",
  cave: "🏚️",
  balcon: "🌇",
  terrasse: "☀️",
  piscine: "🏊",
  jardin: "🌳",
  ascenseur: "🛗",
  gardien: "👤",
  interphone: "🔔",
  meuble: "🛋️",
  climatisation: "❄️",
  cheminee: "🔥",
  parquet: "🪵",
  double_vitrage: "🪟",
  fibre: "📡",
};

/** Parse le JSON amenities d'une Property — accepte toutes les clés string (DB-driven) */
export function parseAmenities(json: string): string[] {
  try {
    const arr = JSON.parse(json || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.filter((k: unknown) => typeof k === "string" && k.length > 0) as string[];
  } catch {
    return [];
  }
}
