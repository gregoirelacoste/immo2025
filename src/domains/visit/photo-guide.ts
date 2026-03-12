export interface PhotoGuideStep {
  id: string;
  label: string;
  tip: string;
  category: string;
}

export const PHOTO_GUIDE: PhotoGuideStep[] = [
  { id: "facade", label: "Facade de l'immeuble", tip: "Vue d'ensemble, etat general", category: "exterior" },
  { id: "common_areas", label: "Parties communes", tip: "Hall, escalier, boites aux lettres", category: "common_areas" },
  { id: "living_room", label: "Piece principale", tip: "Vue large, luminosite", category: "layout" },
  { id: "kitchen", label: "Cuisine", tip: "Equipements, etat", category: "kitchen" },
  { id: "bathroom", label: "Salle de bain", tip: "Robinetterie, ventilation, joints", category: "bathroom" },
  { id: "bedroom", label: "Chambre(s)", tip: "Taille, rangements", category: "layout" },
  { id: "electrical", label: "Tableau electrique", tip: "Aux normes ? Disjoncteurs", category: "electricity" },
  { id: "windows", label: "Fenetres / vue", tip: "Double vitrage, exposition, vis-a-vis", category: "windows" },
  { id: "heating", label: "Chauffage", tip: "Type de radiateurs, chaudiere", category: "heating" },
  { id: "issues", label: "Points a signaler", tip: "Fissures, humidite, bruit...", category: "general" },
];
