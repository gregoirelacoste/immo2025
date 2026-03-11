/** Données socio-économiques d'un quartier (IRIS) ou d'une commune */
export interface SocioEconomicData {
  communeCode: string;
  communeName: string;

  // Quartier IRIS (si résolu depuis les coordonnées GPS)
  irisCode: string | null;
  irisName: string | null;
  dataLevel: "iris" | "commune"; // indique la granularité des données

  // Démographie (source: geo.api.gouv.fr + INSEE RP)
  population: number | null;
  populationYear: number | null;
  ageDistribution: AgeDistribution | null;

  // Revenus (source: INSEE Filosofi)
  medianIncome: number | null;    // Revenu médian par unité de consommation (€/an)
  povertyRate: number | null;     // Taux de pauvreté (%)

  // Emploi (source: INSEE)
  unemploymentRate: number | null; // Taux de chômage zone d'emploi (%)
  totalJobs: number | null;        // Nombre d'emplois dans la commune

  // Éducation (source: annuaire éducation)
  schoolCount: number | null;      // Écoles/collèges/lycées à proximité
  universityNearby: boolean | null; // Université dans un rayon de 10km

  // Équipements (source: INSEE BPE)
  equipmentScore: number | null;   // Score 0-10 basé sur la diversité d'équipements

  // Risques (source: Géorisques)
  naturalRisks: NaturalRisk[];
  riskLevel: "faible" | "moyen" | "élevé" | null;
}

export interface AgeDistribution {
  under20Pct: number;   // % de moins de 20 ans
  age20to39Pct: number; // % 20-39 ans (actifs jeunes, étudiants)
  age40to59Pct: number; // % 40-59 ans (familles)
  over60Pct: number;    // % 60 ans et plus (retraités)
}

export interface NaturalRisk {
  type: string;    // ex: "Inondation", "Séisme", "Argile", "Radon"
  level: string;   // ex: "Fort", "Moyen", "Faible"
}

/** Profil dominant de la commune pour l'investissement */
export type PopulationProfile =
  | "étudiant"       // forte proportion 18-25 + université
  | "jeune-actif"    // forte proportion 25-39
  | "famille"        // forte proportion 0-14 + 30-50
  | "retraité"       // forte proportion 60+
  | "mixte";         // pas de profil dominant

export function inferPopulationProfile(age: AgeDistribution | null, universityNearby: boolean | null): PopulationProfile {
  if (!age) return "mixte";

  if (age.under20Pct + age.age20to39Pct > 55 && universityNearby) return "étudiant";
  if (age.age20to39Pct > 35) return "jeune-actif";
  if (age.under20Pct > 28 && age.age40to59Pct > 25) return "famille";
  if (age.over60Pct > 35) return "retraité";
  return "mixte";
}
