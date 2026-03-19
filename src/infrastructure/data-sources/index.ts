export { fetchGeoCity, fetchGeoCityByCode } from "./geo-client";
export { fetchDvfData } from "./dvf-client";
export { fetchInseeData, isInseeConfigured } from "./insee-client";
export { fetchGeorisquesData } from "./georisques-client";
export { fetchTaxeFonciereData } from "./taxe-fonciere-client";
export { fetchDpeData } from "./dpe-client";
export { fetchEducationData } from "./education-client";
export { fetchHealthData } from "./health-client";

export type {
  GeoCity,
  DvfCityData,
  InseeCityData,
  GeorisquesCityData,
  TaxeFonciereData,
  DpeAggregateData,
  EducationData,
  HealthData,
  RssItem,
} from "./types";
