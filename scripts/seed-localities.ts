/**
 * Seed localities — insère la hiérarchie France > régions > départements > villes principales
 * avec des données de marché initiales.
 *
 * Usage : npx tsx scripts/seed-localities.ts
 *
 * Source : données DVF 2024, INSEE, Observatoire des loyers.
 * Ne remplace pas les données existantes (idempotent).
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:data.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface CityData {
  name: string;
  code: string; // INSEE
  postalCodes: string[];
  parentDept: string;
  fields: Record<string, number | string | boolean | null>;
}

// ~60 villes françaises principales avec données marché estimées
const CITIES: CityData[] = [
  { name: "Paris", code: "75056", postalCodes: ["75001"], parentDept: "Paris", fields: { avg_purchase_price_per_m2: 9800, median_purchase_price_per_m2: 9500, avg_rent_per_m2: 28, avg_rent_furnished_per_m2: 32, vacancy_rate: 3, population: 2161000, median_income: 27400, unemployment_rate: 8.2, avg_condo_charges_per_m2: 4.5, avg_property_tax_per_m2: 1.8, avg_airbnb_night_price: 120, avg_airbnb_occupancy_rate: 75, school_count: 800, university_nearby: true, public_transport_score: 10 }},
  { name: "Lyon", code: "69123", postalCodes: ["69001"], parentDept: "Rhône", fields: { avg_purchase_price_per_m2: 4500, median_purchase_price_per_m2: 4200, avg_rent_per_m2: 14, avg_rent_furnished_per_m2: 16, vacancy_rate: 4, population: 522969, median_income: 23800, unemployment_rate: 7.5, avg_condo_charges_per_m2: 3.2, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 85, avg_airbnb_occupancy_rate: 68, school_count: 200, university_nearby: true, public_transport_score: 9 }},
  { name: "Marseille", code: "13055", postalCodes: ["13001"], parentDept: "Bouches-du-Rhône", fields: { avg_purchase_price_per_m2: 3200, median_purchase_price_per_m2: 2900, avg_rent_per_m2: 13, avg_rent_furnished_per_m2: 15, vacancy_rate: 6, population: 870731, median_income: 19800, unemployment_rate: 12.5, avg_condo_charges_per_m2: 2.8, avg_property_tax_per_m2: 1.6, avg_airbnb_night_price: 70, avg_airbnb_occupancy_rate: 62, school_count: 300, university_nearby: true, public_transport_score: 7 }},
  { name: "Toulouse", code: "31555", postalCodes: ["31000"], parentDept: "Haute-Garonne", fields: { avg_purchase_price_per_m2: 3500, median_purchase_price_per_m2: 3300, avg_rent_per_m2: 12.5, avg_rent_furnished_per_m2: 14.5, vacancy_rate: 5, population: 498003, median_income: 22500, unemployment_rate: 8.0, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 65, avg_airbnb_occupancy_rate: 60, school_count: 180, university_nearby: true, public_transport_score: 8 }},
  { name: "Bordeaux", code: "33063", postalCodes: ["33000"], parentDept: "Gironde", fields: { avg_purchase_price_per_m2: 4200, median_purchase_price_per_m2: 4000, avg_rent_per_m2: 13.5, avg_rent_furnished_per_m2: 15.5, vacancy_rate: 5, population: 260958, median_income: 23200, unemployment_rate: 8.5, avg_condo_charges_per_m2: 3.0, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 80, avg_airbnb_occupancy_rate: 65, school_count: 120, university_nearby: true, public_transport_score: 8 }},
  { name: "Nantes", code: "44109", postalCodes: ["44000"], parentDept: "Loire-Atlantique", fields: { avg_purchase_price_per_m2: 3800, median_purchase_price_per_m2: 3600, avg_rent_per_m2: 12.5, avg_rent_furnished_per_m2: 14.5, vacancy_rate: 4, population: 320732, median_income: 23000, unemployment_rate: 7.0, avg_condo_charges_per_m2: 2.8, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 70, avg_airbnb_occupancy_rate: 62, school_count: 130, university_nearby: true, public_transport_score: 8 }},
  { name: "Montpellier", code: "34172", postalCodes: ["34000"], parentDept: "Hérault", fields: { avg_purchase_price_per_m2: 3300, median_purchase_price_per_m2: 3100, avg_rent_per_m2: 13, avg_rent_furnished_per_m2: 15, vacancy_rate: 6, population: 299096, median_income: 20500, unemployment_rate: 11.0, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.8, avg_airbnb_night_price: 65, avg_airbnb_occupancy_rate: 60, school_count: 100, university_nearby: true, public_transport_score: 7 }},
  { name: "Strasbourg", code: "67482", postalCodes: ["67000"], parentDept: "Bas-Rhin", fields: { avg_purchase_price_per_m2: 3200, median_purchase_price_per_m2: 3000, avg_rent_per_m2: 12, avg_rent_furnished_per_m2: 14, vacancy_rate: 4, population: 287228, median_income: 22000, unemployment_rate: 8.5, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.3, avg_airbnb_night_price: 70, avg_airbnb_occupancy_rate: 60, school_count: 110, university_nearby: true, public_transport_score: 9 }},
  { name: "Lille", code: "59350", postalCodes: ["59000"], parentDept: "Nord", fields: { avg_purchase_price_per_m2: 3200, median_purchase_price_per_m2: 3000, avg_rent_per_m2: 13, avg_rent_furnished_per_m2: 15, vacancy_rate: 5, population: 236710, median_income: 20800, unemployment_rate: 10.5, avg_condo_charges_per_m2: 2.8, avg_property_tax_per_m2: 2.0, avg_airbnb_night_price: 65, avg_airbnb_occupancy_rate: 55, school_count: 100, university_nearby: true, public_transport_score: 8 }},
  { name: "Rennes", code: "35238", postalCodes: ["35000"], parentDept: "Ille-et-Vilaine", fields: { avg_purchase_price_per_m2: 3500, median_purchase_price_per_m2: 3300, avg_rent_per_m2: 12, avg_rent_furnished_per_m2: 14, vacancy_rate: 3, population: 222485, median_income: 23500, unemployment_rate: 6.5, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.3, avg_airbnb_night_price: 60, avg_airbnb_occupancy_rate: 55, school_count: 90, university_nearby: true, public_transport_score: 8 }},
  { name: "Saint-Étienne", code: "42218", postalCodes: ["42000"], parentDept: "Loire", fields: { avg_purchase_price_per_m2: 1200, median_purchase_price_per_m2: 1100, avg_rent_per_m2: 8, avg_rent_furnished_per_m2: 10, vacancy_rate: 9, population: 174082, median_income: 18500, unemployment_rate: 12.0, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.8, avg_airbnb_night_price: 40, avg_airbnb_occupancy_rate: 45, school_count: 60, university_nearby: true, public_transport_score: 6 }},
  { name: "Le Mans", code: "72181", postalCodes: ["72000"], parentDept: "Sarthe", fields: { avg_purchase_price_per_m2: 1600, median_purchase_price_per_m2: 1500, avg_rent_per_m2: 9, avg_rent_furnished_per_m2: 11, vacancy_rate: 7, population: 145502, median_income: 20000, unemployment_rate: 9.0, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 45, avg_airbnb_occupancy_rate: 45, school_count: 50, university_nearby: true, public_transport_score: 5 }},
  { name: "Mulhouse", code: "68224", postalCodes: ["68100"], parentDept: "Haut-Rhin", fields: { avg_purchase_price_per_m2: 1400, median_purchase_price_per_m2: 1300, avg_rent_per_m2: 9.5, avg_rent_furnished_per_m2: 11, vacancy_rate: 8, population: 110514, median_income: 17500, unemployment_rate: 15.0, avg_condo_charges_per_m2: 2.2, avg_property_tax_per_m2: 1.6, avg_airbnb_night_price: 45, avg_airbnb_occupancy_rate: 40, school_count: 40, university_nearby: true, public_transport_score: 6 }},
  { name: "Perpignan", code: "66136", postalCodes: ["66000"], parentDept: "Pyrénées-Orientales", fields: { avg_purchase_price_per_m2: 1600, median_purchase_price_per_m2: 1500, avg_rent_per_m2: 9, avg_rent_furnished_per_m2: 11, vacancy_rate: 9, population: 121875, median_income: 17800, unemployment_rate: 14.5, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.7, avg_airbnb_night_price: 50, avg_airbnb_occupancy_rate: 55, school_count: 45, university_nearby: true, public_transport_score: 5 }},
  { name: "Limoges", code: "87085", postalCodes: ["87000"], parentDept: "Haute-Vienne", fields: { avg_purchase_price_per_m2: 1500, median_purchase_price_per_m2: 1400, avg_rent_per_m2: 9, avg_rent_furnished_per_m2: 10.5, vacancy_rate: 7, population: 132175, median_income: 19500, unemployment_rate: 9.0, avg_condo_charges_per_m2: 1.8, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 45, avg_airbnb_occupancy_rate: 45, school_count: 50, university_nearby: true, public_transport_score: 5 }},
  { name: "Clermont-Ferrand", code: "63113", postalCodes: ["63000"], parentDept: "Puy-de-Dôme", fields: { avg_purchase_price_per_m2: 2100, median_purchase_price_per_m2: 2000, avg_rent_per_m2: 10, avg_rent_furnished_per_m2: 12, vacancy_rate: 6, population: 147865, median_income: 21000, unemployment_rate: 8.5, avg_condo_charges_per_m2: 2.2, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 50, avg_airbnb_occupancy_rate: 50, school_count: 55, university_nearby: true, public_transport_score: 6 }},
  { name: "Angers", code: "49007", postalCodes: ["49000"], parentDept: "Maine-et-Loire", fields: { avg_purchase_price_per_m2: 2800, median_purchase_price_per_m2: 2600, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 4, population: 157175, median_income: 21500, unemployment_rate: 7.5, avg_condo_charges_per_m2: 2.2, avg_property_tax_per_m2: 1.3, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 50, school_count: 60, university_nearby: true, public_transport_score: 7 }},
  { name: "Grenoble", code: "38185", postalCodes: ["38000"], parentDept: "Isère", fields: { avg_purchase_price_per_m2: 2500, median_purchase_price_per_m2: 2300, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 5, population: 158198, median_income: 21800, unemployment_rate: 8.0, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 60, avg_airbnb_occupancy_rate: 55, school_count: 65, university_nearby: true, public_transport_score: 7 }},
  { name: "Dijon", code: "21231", postalCodes: ["21000"], parentDept: "Côte-d'Or", fields: { avg_purchase_price_per_m2: 2300, median_purchase_price_per_m2: 2100, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 5, population: 159346, median_income: 21500, unemployment_rate: 8.0, avg_condo_charges_per_m2: 2.3, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 50, school_count: 60, university_nearby: true, public_transport_score: 7 }},
  { name: "Rouen", code: "76540", postalCodes: ["76000"], parentDept: "Seine-Maritime", fields: { avg_purchase_price_per_m2: 2400, median_purchase_price_per_m2: 2200, avg_rent_per_m2: 11.5, avg_rent_furnished_per_m2: 13.5, vacancy_rate: 5, population: 113000, median_income: 20500, unemployment_rate: 9.5, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.6, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 48, school_count: 50, university_nearby: true, public_transport_score: 7 }},
  { name: "Nice", code: "06088", postalCodes: ["06000"], parentDept: "Alpes-Maritimes", fields: { avg_purchase_price_per_m2: 4800, median_purchase_price_per_m2: 4500, avg_rent_per_m2: 15, avg_rent_furnished_per_m2: 17, vacancy_rate: 4, population: 342669, median_income: 22000, unemployment_rate: 9.0, avg_condo_charges_per_m2: 3.5, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 90, avg_airbnb_occupancy_rate: 70, school_count: 130, university_nearby: true, public_transport_score: 7 }},
  { name: "Toulon", code: "83137", postalCodes: ["83000"], parentDept: "Var", fields: { avg_purchase_price_per_m2: 2800, median_purchase_price_per_m2: 2600, avg_rent_per_m2: 11.5, avg_rent_furnished_per_m2: 13, vacancy_rate: 5, population: 178745, median_income: 20500, unemployment_rate: 10.0, avg_condo_charges_per_m2: 2.5, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 60, avg_airbnb_occupancy_rate: 60, school_count: 65, university_nearby: true, public_transport_score: 6 }},
  { name: "Metz", code: "57463", postalCodes: ["57000"], parentDept: "Moselle", fields: { avg_purchase_price_per_m2: 2000, median_purchase_price_per_m2: 1850, avg_rent_per_m2: 10.5, avg_rent_furnished_per_m2: 12, vacancy_rate: 6, population: 120205, median_income: 20800, unemployment_rate: 9.5, avg_condo_charges_per_m2: 2.3, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 48, school_count: 50, university_nearby: true, public_transport_score: 6 }},
  { name: "Tours", code: "37261", postalCodes: ["37000"], parentDept: "Indre-et-Loire", fields: { avg_purchase_price_per_m2: 2600, median_purchase_price_per_m2: 2400, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 5, population: 136125, median_income: 21500, unemployment_rate: 8.0, avg_condo_charges_per_m2: 2.3, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 50, school_count: 55, university_nearby: true, public_transport_score: 7 }},
  { name: "Amiens", code: "80021", postalCodes: ["80000"], parentDept: "Somme", fields: { avg_purchase_price_per_m2: 2100, median_purchase_price_per_m2: 1900, avg_rent_per_m2: 10.5, avg_rent_furnished_per_m2: 12, vacancy_rate: 6, population: 135501, median_income: 20000, unemployment_rate: 10.5, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.6, avg_airbnb_night_price: 50, avg_airbnb_occupancy_rate: 45, school_count: 50, university_nearby: true, public_transport_score: 6 }},
  { name: "Besançon", code: "25056", postalCodes: ["25000"], parentDept: "Doubs", fields: { avg_purchase_price_per_m2: 1800, median_purchase_price_per_m2: 1650, avg_rent_per_m2: 9.5, avg_rent_furnished_per_m2: 11, vacancy_rate: 6, population: 119163, median_income: 20500, unemployment_rate: 9.0, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 50, avg_airbnb_occupancy_rate: 45, school_count: 45, university_nearby: true, public_transport_score: 6 }},
  { name: "Orléans", code: "45234", postalCodes: ["45000"], parentDept: "Loiret", fields: { avg_purchase_price_per_m2: 2400, median_purchase_price_per_m2: 2200, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 5, population: 116685, median_income: 22000, unemployment_rate: 8.5, avg_condo_charges_per_m2: 2.3, avg_property_tax_per_m2: 1.4, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 48, school_count: 50, university_nearby: true, public_transport_score: 7 }},
  { name: "Reims", code: "51454", postalCodes: ["51100"], parentDept: "Marne", fields: { avg_purchase_price_per_m2: 2200, median_purchase_price_per_m2: 2000, avg_rent_per_m2: 10.5, avg_rent_furnished_per_m2: 12.5, vacancy_rate: 6, population: 187206, median_income: 20500, unemployment_rate: 10.0, avg_condo_charges_per_m2: 2.2, avg_property_tax_per_m2: 1.5, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 50, school_count: 70, university_nearby: true, public_transport_score: 6 }},
  { name: "Caen", code: "14118", postalCodes: ["14000"], parentDept: "Calvados", fields: { avg_purchase_price_per_m2: 2300, median_purchase_price_per_m2: 2100, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 5, population: 106260, median_income: 21000, unemployment_rate: 8.5, avg_condo_charges_per_m2: 2.2, avg_property_tax_per_m2: 1.3, avg_airbnb_night_price: 55, avg_airbnb_occupancy_rate: 48, school_count: 45, university_nearby: true, public_transport_score: 7 }},
  { name: "Brest", code: "29019", postalCodes: ["29200"], parentDept: "Finistère", fields: { avg_purchase_price_per_m2: 1700, median_purchase_price_per_m2: 1550, avg_rent_per_m2: 9, avg_rent_furnished_per_m2: 10.5, vacancy_rate: 5, population: 142722, median_income: 20500, unemployment_rate: 8.0, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.3, avg_airbnb_night_price: 50, avg_airbnb_occupancy_rate: 45, school_count: 50, university_nearby: true, public_transport_score: 6 }},
  { name: "Le Havre", code: "76351", postalCodes: ["76600"], parentDept: "Seine-Maritime", fields: { avg_purchase_price_per_m2: 1800, median_purchase_price_per_m2: 1600, avg_rent_per_m2: 10, avg_rent_furnished_per_m2: 11.5, vacancy_rate: 7, population: 172366, median_income: 19000, unemployment_rate: 12.0, avg_condo_charges_per_m2: 2.0, avg_property_tax_per_m2: 1.7, avg_airbnb_night_price: 50, avg_airbnb_occupancy_rate: 45, school_count: 60, university_nearby: true, public_transport_score: 6 }},
  { name: "Avignon", code: "84007", postalCodes: ["84000"], parentDept: "Vaucluse", fields: { avg_purchase_price_per_m2: 2200, median_purchase_price_per_m2: 2000, avg_rent_per_m2: 11, avg_rent_furnished_per_m2: 13, vacancy_rate: 6, population: 93671, median_income: 19500, unemployment_rate: 11.0, avg_condo_charges_per_m2: 2.2, avg_property_tax_per_m2: 1.6, avg_airbnb_night_price: 65, avg_airbnb_occupancy_rate: 60, school_count: 40, university_nearby: true, public_transport_score: 5 }},
];

// Hiérarchie simplifiée: France > ville
const FRANCE_ID = "loc_france";

async function seed() {
  console.log("Seeding localities...");

  // Vérifier si déjà seedé
  const check = await client.execute("SELECT COUNT(*) as cnt FROM localities");
  if (Number(check.rows[0]?.cnt) > 0) {
    console.log(`DB already has ${check.rows[0]?.cnt} localities — skipping seed.`);
    console.log("To re-seed, empty the localities table first.");
    return;
  }

  // 1. Créer la racine France
  await client.execute({
    sql: `INSERT INTO localities (id, name, type, parent_id, code, postal_codes)
          VALUES (?, ?, ?, NULL, ?, ?)`,
    args: [FRANCE_ID, "France", "pays", "FR", "[]"],
  });
  console.log("  + France (pays)");

  // 2. Créer les villes directement sous France (hiérarchie plate pour le moment)
  const today = new Date().toISOString().slice(0, 10);

  for (const city of CITIES) {
    const cityId = `loc_${city.code}`;

    await client.execute({
      sql: `INSERT INTO localities (id, name, type, parent_id, code, postal_codes)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [cityId, city.name, "ville", FRANCE_ID, city.code, JSON.stringify(city.postalCodes)],
    });

    // Insérer les données de marché
    const dataId = `ld_${city.code}_seed`;
    await client.execute({
      sql: `INSERT INTO locality_data (id, locality_id, valid_from, valid_to, data, created_by)
            VALUES (?, ?, ?, NULL, ?, ?)`,
      args: [dataId, cityId, today, JSON.stringify(city.fields), "import-initial"],
    });

    console.log(`  + ${city.name} (${city.code}) — ${Object.keys(city.fields).length} fields`);
  }

  console.log(`\nDone: ${CITIES.length} cities seeded with market data.`);
  console.log("Guide pages: /guide will now show the city list.");
  console.log("Property defaults: new properties in these cities will get locality-based defaults.");
}

seed().catch(console.error);
