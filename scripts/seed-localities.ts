/**
 * Seed localities — insère la hiérarchie France > villes principales
 * avec des données de marché initiales dans les tables thématiques.
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
  prices: { avg: number; median: number; transactions?: number };
  rental: { rent: number; furnished: number; vacancy: number };
  charges: { condo: number; tax: number };
  airbnb: { nightPrice: number; occupancy: number };
  socio: { population: number; income: number; unemployment: number };
  infra: { schools: number; university: boolean; transport: number };
}

// ~30 villes françaises principales avec données marché estimées
const CITIES: CityData[] = [
  { name: "Paris", code: "75056", postalCodes: ["75001"], parentDept: "Paris", prices: { avg: 9800, median: 9500 }, rental: { rent: 28, furnished: 32, vacancy: 3 }, charges: { condo: 4.5, tax: 1.8 }, airbnb: { nightPrice: 120, occupancy: 75 }, socio: { population: 2161000, income: 27400, unemployment: 8.2 }, infra: { schools: 800, university: true, transport: 10 }},
  { name: "Lyon", code: "69123", postalCodes: ["69001"], parentDept: "Rhône", prices: { avg: 4500, median: 4200 }, rental: { rent: 14, furnished: 16, vacancy: 4 }, charges: { condo: 3.2, tax: 1.5 }, airbnb: { nightPrice: 85, occupancy: 68 }, socio: { population: 522969, income: 23800, unemployment: 7.5 }, infra: { schools: 200, university: true, transport: 9 }},
  { name: "Marseille", code: "13055", postalCodes: ["13001"], parentDept: "Bouches-du-Rhône", prices: { avg: 3200, median: 2900 }, rental: { rent: 13, furnished: 15, vacancy: 6 }, charges: { condo: 2.8, tax: 1.6 }, airbnb: { nightPrice: 70, occupancy: 62 }, socio: { population: 870731, income: 19800, unemployment: 12.5 }, infra: { schools: 300, university: true, transport: 7 }},
  { name: "Toulouse", code: "31555", postalCodes: ["31000"], parentDept: "Haute-Garonne", prices: { avg: 3500, median: 3300 }, rental: { rent: 12.5, furnished: 14.5, vacancy: 5 }, charges: { condo: 2.5, tax: 1.4 }, airbnb: { nightPrice: 65, occupancy: 60 }, socio: { population: 498003, income: 22500, unemployment: 8.0 }, infra: { schools: 180, university: true, transport: 8 }},
  { name: "Bordeaux", code: "33063", postalCodes: ["33000"], parentDept: "Gironde", prices: { avg: 4200, median: 4000 }, rental: { rent: 13.5, furnished: 15.5, vacancy: 5 }, charges: { condo: 3.0, tax: 1.5 }, airbnb: { nightPrice: 80, occupancy: 65 }, socio: { population: 260958, income: 23200, unemployment: 8.5 }, infra: { schools: 120, university: true, transport: 8 }},
  { name: "Nantes", code: "44109", postalCodes: ["44000"], parentDept: "Loire-Atlantique", prices: { avg: 3800, median: 3600 }, rental: { rent: 12.5, furnished: 14.5, vacancy: 4 }, charges: { condo: 2.8, tax: 1.4 }, airbnb: { nightPrice: 70, occupancy: 62 }, socio: { population: 320732, income: 23000, unemployment: 7.0 }, infra: { schools: 130, university: true, transport: 8 }},
  { name: "Montpellier", code: "34172", postalCodes: ["34000"], parentDept: "Hérault", prices: { avg: 3300, median: 3100 }, rental: { rent: 13, furnished: 15, vacancy: 6 }, charges: { condo: 2.5, tax: 1.8 }, airbnb: { nightPrice: 65, occupancy: 60 }, socio: { population: 299096, income: 20500, unemployment: 11.0 }, infra: { schools: 100, university: true, transport: 7 }},
  { name: "Strasbourg", code: "67482", postalCodes: ["67000"], parentDept: "Bas-Rhin", prices: { avg: 3200, median: 3000 }, rental: { rent: 12, furnished: 14, vacancy: 4 }, charges: { condo: 2.5, tax: 1.3 }, airbnb: { nightPrice: 70, occupancy: 60 }, socio: { population: 287228, income: 22000, unemployment: 8.5 }, infra: { schools: 110, university: true, transport: 9 }},
  { name: "Lille", code: "59350", postalCodes: ["59000"], parentDept: "Nord", prices: { avg: 3200, median: 3000 }, rental: { rent: 13, furnished: 15, vacancy: 5 }, charges: { condo: 2.8, tax: 2.0 }, airbnb: { nightPrice: 65, occupancy: 55 }, socio: { population: 236710, income: 20800, unemployment: 10.5 }, infra: { schools: 100, university: true, transport: 8 }},
  { name: "Rennes", code: "35238", postalCodes: ["35000"], parentDept: "Ille-et-Vilaine", prices: { avg: 3500, median: 3300 }, rental: { rent: 12, furnished: 14, vacancy: 3 }, charges: { condo: 2.5, tax: 1.3 }, airbnb: { nightPrice: 60, occupancy: 55 }, socio: { population: 222485, income: 23500, unemployment: 6.5 }, infra: { schools: 90, university: true, transport: 8 }},
  { name: "Saint-Étienne", code: "42218", postalCodes: ["42000"], parentDept: "Loire", prices: { avg: 1200, median: 1100 }, rental: { rent: 8, furnished: 10, vacancy: 9 }, charges: { condo: 2.0, tax: 1.8 }, airbnb: { nightPrice: 40, occupancy: 45 }, socio: { population: 174082, income: 18500, unemployment: 12.0 }, infra: { schools: 60, university: true, transport: 6 }},
  { name: "Le Mans", code: "72181", postalCodes: ["72000"], parentDept: "Sarthe", prices: { avg: 1600, median: 1500 }, rental: { rent: 9, furnished: 11, vacancy: 7 }, charges: { condo: 2.0, tax: 1.5 }, airbnb: { nightPrice: 45, occupancy: 45 }, socio: { population: 145502, income: 20000, unemployment: 9.0 }, infra: { schools: 50, university: true, transport: 5 }},
  { name: "Mulhouse", code: "68224", postalCodes: ["68100"], parentDept: "Haut-Rhin", prices: { avg: 1400, median: 1300 }, rental: { rent: 9.5, furnished: 11, vacancy: 8 }, charges: { condo: 2.2, tax: 1.6 }, airbnb: { nightPrice: 45, occupancy: 40 }, socio: { population: 110514, income: 17500, unemployment: 15.0 }, infra: { schools: 40, university: true, transport: 6 }},
  { name: "Perpignan", code: "66136", postalCodes: ["66000"], parentDept: "Pyrénées-Orientales", prices: { avg: 1600, median: 1500 }, rental: { rent: 9, furnished: 11, vacancy: 9 }, charges: { condo: 2.0, tax: 1.7 }, airbnb: { nightPrice: 50, occupancy: 55 }, socio: { population: 121875, income: 17800, unemployment: 14.5 }, infra: { schools: 45, university: true, transport: 5 }},
  { name: "Limoges", code: "87085", postalCodes: ["87000"], parentDept: "Haute-Vienne", prices: { avg: 1500, median: 1400 }, rental: { rent: 9, furnished: 10.5, vacancy: 7 }, charges: { condo: 1.8, tax: 1.5 }, airbnb: { nightPrice: 45, occupancy: 45 }, socio: { population: 132175, income: 19500, unemployment: 9.0 }, infra: { schools: 50, university: true, transport: 5 }},
  { name: "Clermont-Ferrand", code: "63113", postalCodes: ["63000"], parentDept: "Puy-de-Dôme", prices: { avg: 2100, median: 2000 }, rental: { rent: 10, furnished: 12, vacancy: 6 }, charges: { condo: 2.2, tax: 1.5 }, airbnb: { nightPrice: 50, occupancy: 50 }, socio: { population: 147865, income: 21000, unemployment: 8.5 }, infra: { schools: 55, university: true, transport: 6 }},
  { name: "Angers", code: "49007", postalCodes: ["49000"], parentDept: "Maine-et-Loire", prices: { avg: 2800, median: 2600 }, rental: { rent: 11, furnished: 13, vacancy: 4 }, charges: { condo: 2.2, tax: 1.3 }, airbnb: { nightPrice: 55, occupancy: 50 }, socio: { population: 157175, income: 21500, unemployment: 7.5 }, infra: { schools: 60, university: true, transport: 7 }},
  { name: "Grenoble", code: "38185", postalCodes: ["38000"], parentDept: "Isère", prices: { avg: 2500, median: 2300 }, rental: { rent: 11, furnished: 13, vacancy: 5 }, charges: { condo: 2.5, tax: 1.5 }, airbnb: { nightPrice: 60, occupancy: 55 }, socio: { population: 158198, income: 21800, unemployment: 8.0 }, infra: { schools: 65, university: true, transport: 7 }},
  { name: "Dijon", code: "21231", postalCodes: ["21000"], parentDept: "Côte-d'Or", prices: { avg: 2300, median: 2100 }, rental: { rent: 11, furnished: 13, vacancy: 5 }, charges: { condo: 2.3, tax: 1.4 }, airbnb: { nightPrice: 55, occupancy: 50 }, socio: { population: 159346, income: 21500, unemployment: 8.0 }, infra: { schools: 60, university: true, transport: 7 }},
  { name: "Rouen", code: "76540", postalCodes: ["76000"], parentDept: "Seine-Maritime", prices: { avg: 2400, median: 2200 }, rental: { rent: 11.5, furnished: 13.5, vacancy: 5 }, charges: { condo: 2.5, tax: 1.6 }, airbnb: { nightPrice: 55, occupancy: 48 }, socio: { population: 113000, income: 20500, unemployment: 9.5 }, infra: { schools: 50, university: true, transport: 7 }},
  { name: "Nice", code: "06088", postalCodes: ["06000"], parentDept: "Alpes-Maritimes", prices: { avg: 4800, median: 4500 }, rental: { rent: 15, furnished: 17, vacancy: 4 }, charges: { condo: 3.5, tax: 1.5 }, airbnb: { nightPrice: 90, occupancy: 70 }, socio: { population: 342669, income: 22000, unemployment: 9.0 }, infra: { schools: 130, university: true, transport: 7 }},
  { name: "Toulon", code: "83137", postalCodes: ["83000"], parentDept: "Var", prices: { avg: 2800, median: 2600 }, rental: { rent: 11.5, furnished: 13, vacancy: 5 }, charges: { condo: 2.5, tax: 1.5 }, airbnb: { nightPrice: 60, occupancy: 60 }, socio: { population: 178745, income: 20500, unemployment: 10.0 }, infra: { schools: 65, university: true, transport: 6 }},
  { name: "Metz", code: "57463", postalCodes: ["57000"], parentDept: "Moselle", prices: { avg: 2000, median: 1850 }, rental: { rent: 10.5, furnished: 12, vacancy: 6 }, charges: { condo: 2.3, tax: 1.4 }, airbnb: { nightPrice: 55, occupancy: 48 }, socio: { population: 120205, income: 20800, unemployment: 9.5 }, infra: { schools: 50, university: true, transport: 6 }},
  { name: "Tours", code: "37261", postalCodes: ["37000"], parentDept: "Indre-et-Loire", prices: { avg: 2600, median: 2400 }, rental: { rent: 11, furnished: 13, vacancy: 5 }, charges: { condo: 2.3, tax: 1.4 }, airbnb: { nightPrice: 55, occupancy: 50 }, socio: { population: 136125, income: 21500, unemployment: 8.0 }, infra: { schools: 55, university: true, transport: 7 }},
  { name: "Amiens", code: "80021", postalCodes: ["80000"], parentDept: "Somme", prices: { avg: 2100, median: 1900 }, rental: { rent: 10.5, furnished: 12, vacancy: 6 }, charges: { condo: 2.0, tax: 1.6 }, airbnb: { nightPrice: 50, occupancy: 45 }, socio: { population: 135501, income: 20000, unemployment: 10.5 }, infra: { schools: 50, university: true, transport: 6 }},
  { name: "Besançon", code: "25056", postalCodes: ["25000"], parentDept: "Doubs", prices: { avg: 1800, median: 1650 }, rental: { rent: 9.5, furnished: 11, vacancy: 6 }, charges: { condo: 2.0, tax: 1.4 }, airbnb: { nightPrice: 50, occupancy: 45 }, socio: { population: 119163, income: 20500, unemployment: 9.0 }, infra: { schools: 45, university: true, transport: 6 }},
  { name: "Orléans", code: "45234", postalCodes: ["45000"], parentDept: "Loiret", prices: { avg: 2400, median: 2200 }, rental: { rent: 11, furnished: 13, vacancy: 5 }, charges: { condo: 2.3, tax: 1.4 }, airbnb: { nightPrice: 55, occupancy: 48 }, socio: { population: 116685, income: 22000, unemployment: 8.5 }, infra: { schools: 50, university: true, transport: 7 }},
  { name: "Reims", code: "51454", postalCodes: ["51100"], parentDept: "Marne", prices: { avg: 2200, median: 2000 }, rental: { rent: 10.5, furnished: 12.5, vacancy: 6 }, charges: { condo: 2.2, tax: 1.5 }, airbnb: { nightPrice: 55, occupancy: 50 }, socio: { population: 187206, income: 20500, unemployment: 10.0 }, infra: { schools: 70, university: true, transport: 6 }},
  { name: "Caen", code: "14118", postalCodes: ["14000"], parentDept: "Calvados", prices: { avg: 2300, median: 2100 }, rental: { rent: 11, furnished: 13, vacancy: 5 }, charges: { condo: 2.2, tax: 1.3 }, airbnb: { nightPrice: 55, occupancy: 48 }, socio: { population: 106260, income: 21000, unemployment: 8.5 }, infra: { schools: 45, university: true, transport: 7 }},
  { name: "Brest", code: "29019", postalCodes: ["29200"], parentDept: "Finistère", prices: { avg: 1700, median: 1550 }, rental: { rent: 9, furnished: 10.5, vacancy: 5 }, charges: { condo: 2.0, tax: 1.3 }, airbnb: { nightPrice: 50, occupancy: 45 }, socio: { population: 142722, income: 20500, unemployment: 8.0 }, infra: { schools: 50, university: true, transport: 6 }},
  { name: "Le Havre", code: "76351", postalCodes: ["76600"], parentDept: "Seine-Maritime", prices: { avg: 1800, median: 1600 }, rental: { rent: 10, furnished: 11.5, vacancy: 7 }, charges: { condo: 2.0, tax: 1.7 }, airbnb: { nightPrice: 50, occupancy: 45 }, socio: { population: 172366, income: 19000, unemployment: 12.0 }, infra: { schools: 60, university: true, transport: 6 }},
  { name: "Avignon", code: "84007", postalCodes: ["84000"], parentDept: "Vaucluse", prices: { avg: 2200, median: 2000 }, rental: { rent: 11, furnished: 13, vacancy: 6 }, charges: { condo: 2.2, tax: 1.6 }, airbnb: { nightPrice: 65, occupancy: 60 }, socio: { population: 93671, income: 19500, unemployment: 11.0 }, infra: { schools: 40, university: true, transport: 5 }},
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

  // 2. Créer les villes et insérer dans les tables thématiques
  const today = new Date().toISOString().slice(0, 10);
  const source = "import-initial";

  for (const city of CITIES) {
    const cityId = `loc_${city.code}`;

    await client.execute({
      sql: `INSERT INTO localities (id, name, type, parent_id, code, postal_codes)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [cityId, city.name, "ville", FRANCE_ID, city.code, JSON.stringify(city.postalCodes)],
    });

    // Prices
    await client.execute({
      sql: `INSERT INTO locality_prices (locality_id, valid_from, avg_purchase_price_per_m2, median_purchase_price_per_m2, transaction_count, source)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [cityId, today, city.prices.avg, city.prices.median, city.prices.transactions ?? null, source],
    });

    // Rental
    await client.execute({
      sql: `INSERT INTO locality_rental (locality_id, valid_from, avg_rent_per_m2, avg_rent_furnished_per_m2, vacancy_rate, source)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [cityId, today, city.rental.rent, city.rental.furnished, city.rental.vacancy, source],
    });

    // Charges
    await client.execute({
      sql: `INSERT INTO locality_charges (locality_id, valid_from, avg_condo_charges_per_m2, avg_property_tax_per_m2, source)
            VALUES (?, ?, ?, ?, ?)`,
      args: [cityId, today, city.charges.condo, city.charges.tax, source],
    });

    // Airbnb
    await client.execute({
      sql: `INSERT INTO locality_airbnb (locality_id, valid_from, avg_airbnb_night_price, avg_airbnb_occupancy_rate, source)
            VALUES (?, ?, ?, ?, ?)`,
      args: [cityId, today, city.airbnb.nightPrice, city.airbnb.occupancy, source],
    });

    // Socio
    await client.execute({
      sql: `INSERT INTO locality_socio (locality_id, valid_from, population, median_income, unemployment_rate, source)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [cityId, today, city.socio.population, city.socio.income, city.socio.unemployment, source],
    });

    // Infra
    await client.execute({
      sql: `INSERT INTO locality_infra (locality_id, valid_from, school_count, university_nearby, public_transport_score, source)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [cityId, today, city.infra.schools, city.infra.university ? 1 : 0, city.infra.transport, source],
    });

    console.log(`  + ${city.name} (${city.code}) — 7 tables`);
  }

  console.log(`\nDone: ${CITIES.length} cities seeded with market data in thematic tables.`);
}

seed().catch(console.error);
