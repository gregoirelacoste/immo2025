/**
 * Registre des packs d'ameublement LMNP.
 *
 * Chaque pack couvre les éléments obligatoires pour un meublé (décret n°2015-981) :
 * literie, volets/rideaux, plaques de cuisson, four/micro-ondes, réfrigérateur,
 * vaisselle, ustensiles, table, chaises, rangements, luminaires, matériel d'entretien.
 *
 * Les prix sont TTC, basés sur des moyennes constatées (IKEA, Conforama, Maisons du Monde).
 * Amortissement comptable LMNP : 7 ans (durée standard mobilier).
 */

export type PropertyTypology = "studio" | "t2" | "t3" | "t4+";
export type PackLevel = "eco" | "standard" | "premium";

export interface FurnitureItem {
  label: string;
  category: "chambre" | "salon" | "cuisine" | "sdb" | "divers";
  quantity: number;
}

export interface FurniturePack {
  typology: PropertyTypology;
  level: PackLevel;
  label: string;
  totalPrice: number;
  items: FurnitureItem[];
}

export const PACK_LEVEL_CONFIG: Record<PackLevel, { label: string; description: string; color: string; bgColor: string; borderColor: string }> = {
  eco:      { label: "Éco",      description: "Essentiel, fonctionnel",         color: "text-emerald-700", bgColor: "bg-emerald-50",  borderColor: "border-emerald-300" },
  standard: { label: "Standard", description: "Confort & durabilité",           color: "text-blue-700",    bgColor: "bg-blue-50",     borderColor: "border-blue-300" },
  premium:  { label: "Premium",  description: "Qualité supérieure, déco soignée", color: "text-amber-700",   bgColor: "bg-amber-50",    borderColor: "border-amber-300" },
};

export const TYPOLOGY_CONFIG: Record<PropertyTypology, { label: string; surfaceRange: string }> = {
  studio: { label: "Studio",  surfaceRange: "≤ 25 m²" },
  t2:     { label: "T2",      surfaceRange: "26–45 m²" },
  t3:     { label: "T3",      surfaceRange: "46–70 m²" },
  "t4+":  { label: "T4+",     surfaceRange: "> 70 m²" },
};

/** Déduit la typologie depuis la surface du bien */
export function suggestTypology(surface: number): PropertyTypology {
  if (surface <= 25) return "studio";
  if (surface <= 45) return "t2";
  if (surface <= 70) return "t3";
  return "t4+";
}

/** Durée d'amortissement comptable du mobilier (années) */
export const FURNITURE_AMORTIZATION_YEARS = 7;

// ─── Items communs ───────────────────────────────────────────────

const STUDIO_ITEMS_ECO: FurnitureItem[] = [
  { label: "Lit 140x200 + matelas",        category: "chambre", quantity: 1 },
  { label: "Couette + oreillers",           category: "chambre", quantity: 1 },
  { label: "Parure de lit",                 category: "chambre", quantity: 2 },
  { label: "Table pliante + 2 chaises",     category: "salon",   quantity: 1 },
  { label: "Canapé convertible",            category: "salon",   quantity: 1 },
  { label: "Luminaire plafonnier",          category: "salon",   quantity: 2 },
  { label: "Rideaux occultants",            category: "salon",   quantity: 1 },
  { label: "Micro-ondes",                   category: "cuisine", quantity: 1 },
  { label: "Réfrigérateur",                 category: "cuisine", quantity: 1 },
  { label: "Kit vaisselle 2 pers.",         category: "cuisine", quantity: 1 },
  { label: "Ustensiles de cuisine",         category: "cuisine", quantity: 1 },
  { label: "Kit salle de bain",             category: "sdb",     quantity: 1 },
  { label: "Aspirateur",                    category: "divers",  quantity: 1 },
  { label: "Étagère rangement",             category: "divers",  quantity: 1 },
];

const STUDIO_ITEMS_STANDARD: FurnitureItem[] = [
  ...STUDIO_ITEMS_ECO,
  { label: "Table de chevet",               category: "chambre", quantity: 1 },
  { label: "Lampe de chevet",               category: "chambre", quantity: 1 },
  { label: "Commode 3 tiroirs",             category: "chambre", quantity: 1 },
  { label: "Miroir mural",                  category: "sdb",     quantity: 1 },
  { label: "Meuble TV",                     category: "salon",   quantity: 1 },
];

const STUDIO_ITEMS_PREMIUM: FurnitureItem[] = [
  ...STUDIO_ITEMS_STANDARD,
  { label: "Matelas mémoire de forme",      category: "chambre", quantity: 1 },
  { label: "Lave-linge",                    category: "divers",  quantity: 1 },
  { label: "Cafetière / Bouilloire",        category: "cuisine", quantity: 1 },
  { label: "Décoration murale",             category: "salon",   quantity: 1 },
  { label: "Linge de maison complet",       category: "divers",  quantity: 1 },
];

// ─── Packs ───────────────────────────────────────────────────────

export const FURNITURE_PACKS: FurniturePack[] = [
  // Studio
  { typology: "studio", level: "eco",      label: "Studio Éco",      totalPrice: 1800,  items: STUDIO_ITEMS_ECO },
  { typology: "studio", level: "standard", label: "Studio Standard", totalPrice: 3000,  items: STUDIO_ITEMS_STANDARD },
  { typology: "studio", level: "premium",  label: "Studio Premium",  totalPrice: 5000,  items: STUDIO_ITEMS_PREMIUM },

  // T2
  { typology: "t2", level: "eco",      label: "T2 Éco",      totalPrice: 2500, items: [
    ...STUDIO_ITEMS_ECO,
    { label: "Armoire / penderie",           category: "chambre", quantity: 1 },
    { label: "Table 4 places + chaises",     category: "salon",   quantity: 1 },
  ]},
  { typology: "t2", level: "standard", label: "T2 Standard", totalPrice: 4000, items: [
    ...STUDIO_ITEMS_STANDARD,
    { label: "Armoire / penderie",           category: "chambre", quantity: 1 },
    { label: "Table 4 places + chaises",     category: "salon",   quantity: 1 },
    { label: "Lave-linge",                   category: "divers",  quantity: 1 },
    { label: "Cafetière / Bouilloire",       category: "cuisine", quantity: 1 },
  ]},
  { typology: "t2", level: "premium",  label: "T2 Premium",  totalPrice: 6500, items: [
    ...STUDIO_ITEMS_PREMIUM,
    { label: "Armoire / penderie qualité",   category: "chambre", quantity: 1 },
    { label: "Table design 4 places",        category: "salon",   quantity: 1 },
    { label: "Canapé convertible qualité",   category: "salon",   quantity: 1 },
    { label: "Décoration complète",          category: "salon",   quantity: 1 },
  ]},

  // T3 (2 chambres)
  { typology: "t3", level: "eco",      label: "T3 Éco",      totalPrice: 3500, items: [
    { label: "Lit 140x200 + matelas",        category: "chambre", quantity: 2 },
    { label: "Couette + oreillers",           category: "chambre", quantity: 2 },
    { label: "Parure de lit",                 category: "chambre", quantity: 4 },
    { label: "Armoire / penderie",            category: "chambre", quantity: 2 },
    { label: "Table 4 places + chaises",      category: "salon",   quantity: 1 },
    { label: "Canapé convertible",            category: "salon",   quantity: 1 },
    { label: "Luminaire plafonnier",          category: "salon",   quantity: 3 },
    { label: "Rideaux occultants",            category: "salon",   quantity: 2 },
    { label: "Micro-ondes",                   category: "cuisine", quantity: 1 },
    { label: "Réfrigérateur",                 category: "cuisine", quantity: 1 },
    { label: "Kit vaisselle 4 pers.",         category: "cuisine", quantity: 1 },
    { label: "Ustensiles de cuisine",         category: "cuisine", quantity: 1 },
    { label: "Kit salle de bain",             category: "sdb",     quantity: 1 },
    { label: "Aspirateur",                    category: "divers",  quantity: 1 },
    { label: "Étagère rangement",             category: "divers",  quantity: 2 },
  ]},
  { typology: "t3", level: "standard", label: "T3 Standard", totalPrice: 5500, items: [
    { label: "Lit 140x200 + matelas qualité", category: "chambre", quantity: 2 },
    { label: "Couette + oreillers",            category: "chambre", quantity: 2 },
    { label: "Parure de lit",                  category: "chambre", quantity: 4 },
    { label: "Table de chevet",                category: "chambre", quantity: 2 },
    { label: "Lampe de chevet",                category: "chambre", quantity: 2 },
    { label: "Armoire / penderie",             category: "chambre", quantity: 2 },
    { label: "Commode 3 tiroirs",              category: "chambre", quantity: 1 },
    { label: "Table 6 places + chaises",       category: "salon",   quantity: 1 },
    { label: "Canapé",                         category: "salon",   quantity: 1 },
    { label: "Meuble TV",                      category: "salon",   quantity: 1 },
    { label: "Luminaire plafonnier",           category: "salon",   quantity: 4 },
    { label: "Rideaux occultants",             category: "salon",   quantity: 3 },
    { label: "Micro-ondes",                    category: "cuisine", quantity: 1 },
    { label: "Réfrigérateur-congélateur",      category: "cuisine", quantity: 1 },
    { label: "Kit vaisselle 4 pers.",          category: "cuisine", quantity: 1 },
    { label: "Ustensiles complets",            category: "cuisine", quantity: 1 },
    { label: "Cafetière / Bouilloire",         category: "cuisine", quantity: 1 },
    { label: "Kit salle de bain",              category: "sdb",     quantity: 1 },
    { label: "Miroir mural",                   category: "sdb",     quantity: 1 },
    { label: "Lave-linge",                     category: "divers",  quantity: 1 },
    { label: "Aspirateur",                     category: "divers",  quantity: 1 },
  ]},
  { typology: "t3", level: "premium",  label: "T3 Premium",  totalPrice: 8500, items: [
    { label: "Lit 160x200 + matelas premium",  category: "chambre", quantity: 1 },
    { label: "Lit 140x200 + matelas premium",  category: "chambre", quantity: 1 },
    { label: "Linge de lit complet",           category: "chambre", quantity: 4 },
    { label: "Table de chevet design",         category: "chambre", quantity: 3 },
    { label: "Lampe de chevet",                category: "chambre", quantity: 3 },
    { label: "Armoire / dressing",             category: "chambre", quantity: 2 },
    { label: "Commode design",                 category: "chambre", quantity: 1 },
    { label: "Table design 6 places",          category: "salon",   quantity: 1 },
    { label: "Canapé qualité",                 category: "salon",   quantity: 1 },
    { label: "Meuble TV",                      category: "salon",   quantity: 1 },
    { label: "Table basse",                    category: "salon",   quantity: 1 },
    { label: "Luminaires design",              category: "salon",   quantity: 5 },
    { label: "Rideaux qualité",                category: "salon",   quantity: 4 },
    { label: "Décoration complète",            category: "salon",   quantity: 1 },
    { label: "Électroménager complet",         category: "cuisine", quantity: 1 },
    { label: "Kit vaisselle 6 pers.",          category: "cuisine", quantity: 1 },
    { label: "Ustensiles complets",            category: "cuisine", quantity: 1 },
    { label: "Kit salle de bain premium",      category: "sdb",     quantity: 1 },
    { label: "Miroir éclairé",                 category: "sdb",     quantity: 1 },
    { label: "Lave-linge",                     category: "divers",  quantity: 1 },
    { label: "Aspirateur",                     category: "divers",  quantity: 1 },
    { label: "Linge de maison complet",        category: "divers",  quantity: 1 },
  ]},

  // T4+
  { typology: "t4+", level: "eco",      label: "T4+ Éco",      totalPrice: 4500, items: [
    { label: "Lit 140x200 + matelas",         category: "chambre", quantity: 3 },
    { label: "Couette + oreillers",            category: "chambre", quantity: 3 },
    { label: "Parure de lit",                  category: "chambre", quantity: 6 },
    { label: "Armoire / penderie",             category: "chambre", quantity: 3 },
    { label: "Table 6 places + chaises",       category: "salon",   quantity: 1 },
    { label: "Canapé convertible",             category: "salon",   quantity: 1 },
    { label: "Luminaire plafonnier",           category: "salon",   quantity: 4 },
    { label: "Rideaux occultants",             category: "salon",   quantity: 3 },
    { label: "Micro-ondes",                    category: "cuisine", quantity: 1 },
    { label: "Réfrigérateur-congélateur",      category: "cuisine", quantity: 1 },
    { label: "Kit vaisselle 6 pers.",          category: "cuisine", quantity: 1 },
    { label: "Ustensiles de cuisine",          category: "cuisine", quantity: 1 },
    { label: "Kit salle de bain",              category: "sdb",     quantity: 2 },
    { label: "Aspirateur",                     category: "divers",  quantity: 1 },
    { label: "Étagère rangement",              category: "divers",  quantity: 3 },
  ]},
  { typology: "t4+", level: "standard", label: "T4+ Standard", totalPrice: 7000, items: [
    { label: "Lit 140x200 + matelas qualité",  category: "chambre", quantity: 3 },
    { label: "Linge de lit complet",           category: "chambre", quantity: 6 },
    { label: "Table de chevet",                category: "chambre", quantity: 4 },
    { label: "Lampe de chevet",                category: "chambre", quantity: 4 },
    { label: "Armoire / penderie",             category: "chambre", quantity: 3 },
    { label: "Commode 3 tiroirs",              category: "chambre", quantity: 2 },
    { label: "Table 8 places + chaises",       category: "salon",   quantity: 1 },
    { label: "Canapé d'angle",                 category: "salon",   quantity: 1 },
    { label: "Meuble TV",                      category: "salon",   quantity: 1 },
    { label: "Table basse",                    category: "salon",   quantity: 1 },
    { label: "Luminaire plafonnier",           category: "salon",   quantity: 5 },
    { label: "Rideaux occultants",             category: "salon",   quantity: 4 },
    { label: "Réfrigérateur-congélateur",      category: "cuisine", quantity: 1 },
    { label: "Micro-ondes",                    category: "cuisine", quantity: 1 },
    { label: "Kit vaisselle 6 pers.",          category: "cuisine", quantity: 1 },
    { label: "Ustensiles complets",            category: "cuisine", quantity: 1 },
    { label: "Cafetière / Bouilloire",         category: "cuisine", quantity: 1 },
    { label: "Kit salle de bain",              category: "sdb",     quantity: 2 },
    { label: "Miroir mural",                   category: "sdb",     quantity: 2 },
    { label: "Lave-linge",                     category: "divers",  quantity: 1 },
    { label: "Aspirateur",                     category: "divers",  quantity: 1 },
  ]},
  { typology: "t4+", level: "premium",  label: "T4+ Premium",  totalPrice: 11000, items: [
    { label: "Lit 160x200 + matelas premium",  category: "chambre", quantity: 1 },
    { label: "Lit 140x200 + matelas premium",  category: "chambre", quantity: 2 },
    { label: "Linge de lit haut de gamme",     category: "chambre", quantity: 6 },
    { label: "Table de chevet design",         category: "chambre", quantity: 4 },
    { label: "Lampe de chevet design",         category: "chambre", quantity: 4 },
    { label: "Armoire / dressing",             category: "chambre", quantity: 3 },
    { label: "Commode design",                 category: "chambre", quantity: 2 },
    { label: "Table design 8 places",          category: "salon",   quantity: 1 },
    { label: "Canapé d'angle qualité",         category: "salon",   quantity: 1 },
    { label: "Meuble TV design",               category: "salon",   quantity: 1 },
    { label: "Table basse design",             category: "salon",   quantity: 1 },
    { label: "Luminaires design",              category: "salon",   quantity: 6 },
    { label: "Rideaux qualité",                category: "salon",   quantity: 5 },
    { label: "Décoration complète",            category: "salon",   quantity: 1 },
    { label: "Tapis",                          category: "salon",   quantity: 2 },
    { label: "Électroménager complet",         category: "cuisine", quantity: 1 },
    { label: "Kit vaisselle 8 pers.",          category: "cuisine", quantity: 1 },
    { label: "Ustensiles complets",            category: "cuisine", quantity: 1 },
    { label: "Kit salle de bain premium",      category: "sdb",     quantity: 2 },
    { label: "Miroir éclairé",                 category: "sdb",     quantity: 2 },
    { label: "Lave-linge",                     category: "divers",  quantity: 1 },
    { label: "Sèche-linge",                    category: "divers",  quantity: 1 },
    { label: "Aspirateur",                     category: "divers",  quantity: 1 },
    { label: "Linge de maison complet",        category: "divers",  quantity: 1 },
  ]},
];

/** Retourne les 3 packs (éco, standard, premium) pour une typologie donnée */
export function getPacksForTypology(typology: PropertyTypology): FurniturePack[] {
  return FURNITURE_PACKS.filter(p => p.typology === typology);
}

/** Retourne un pack spécifique */
export function getPack(typology: PropertyTypology, level: PackLevel): FurniturePack | undefined {
  return FURNITURE_PACKS.find(p => p.typology === typology && p.level === level);
}

/** Groupe les items d'un pack par catégorie */
export function groupItemsByCategory(items: FurnitureItem[]): Record<string, FurnitureItem[]> {
  const groups: Record<string, FurnitureItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export const CATEGORY_LABELS: Record<string, string> = {
  chambre: "Chambre",
  salon: "Salon / Séjour",
  cuisine: "Cuisine",
  sdb: "Salle de bain",
  divers: "Divers",
};
