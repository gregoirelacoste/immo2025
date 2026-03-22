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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function bieniciUrl(city: CityInfo, maxPrice: number): string {
  return `https://www.bienici.com/recherche/achat/${slugify(city.name)}-${city.postalCode}?prix-max=${maxPrice}`;
}

function leboncoinUrl(city: CityInfo): string {
  return `https://www.leboncoin.fr/cl/ventes_immobilieres/cp_${slugify(city.name)}_${city.postalCode}`;
}

function selogerUrl(city: CityInfo): string {
  const dept = city.codeInsee.slice(0, 2);
  return `https://www.seloger.com/immobilier/achat/immo-${slugify(city.name)}-${dept}/`;
}

export function generateSearchUrls(
  city: CityInfo,
  maxPrice: number
): GeneratedSearchLink[] {
  return [
    { site: "leboncoin", label: "Leboncoin", url: leboncoinUrl(city) },
    { site: "seloger", label: "SeLoger", url: selogerUrl(city) },
    { site: "bienici", label: "Bien'ici", url: bieniciUrl(city, maxPrice) },
  ];
}
