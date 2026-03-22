/**
 * Generates search URLs for supported real estate sites
 * from city info (name, postal code, INSEE code) + max price.
 */

export interface GeneratedSearchLink {
  site: string;
  label: string;
  url: string;
}

interface CityInfo {
  name: string;
  postalCode: string;
  codeInsee: string;
}

/** Build a Bien'ici search URL: /recherche/achat/{slug}-{cp}?prix-max={price} */
function bieniciUrl(city: CityInfo, maxPrice: number): string {
  const slug = city.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `https://www.bienici.com/recherche/achat/${slug}-${city.postalCode}?prix-max=${maxPrice}`;
}

/** Build a LeBonCoin search URL: /recherche?category=9&locations={city}&price=0-{price} */
function leboncoinUrl(city: CityInfo, maxPrice: number): string {
  const params = new URLSearchParams({
    category: "9", // Ventes immobilières
    locations: `${city.name}_${city.postalCode}`,
    price: `0-${maxPrice}`,
  });
  return `https://www.leboncoin.fr/recherche?${params}`;
}

/** Build a SeLoger search URL using places with INSEE code */
function selogerUrl(city: CityInfo, maxPrice: number): string {
  const places = JSON.stringify([{ inseeCodes: [parseInt(city.codeInsee, 10)] }]);
  const params = new URLSearchParams({
    projects: "2", // Achat
    places,
    price: `NaN/${maxPrice}`,
    qsVersion: "1.0",
  });
  return `https://www.seloger.com/list.htm?${params}`;
}

export function generateSearchUrls(
  city: CityInfo,
  maxPrice: number
): GeneratedSearchLink[] {
  return [
    { site: "leboncoin", label: "Leboncoin", url: leboncoinUrl(city, maxPrice) },
    { site: "seloger", label: "SeLoger", url: selogerUrl(city, maxPrice) },
    { site: "bienici", label: "Bien'ici", url: bieniciUrl(city, maxPrice) },
  ];
}
