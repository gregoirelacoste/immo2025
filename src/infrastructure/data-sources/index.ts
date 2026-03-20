export { fetchGeoCity, fetchGeoCityByCode, fetchIrisFromCoordinates } from "./geo-client";
export { fetchDvfData } from "./dvf-client";
export { fetchInseeData, fetchInseeDataWithIris, isInseeConfigured } from "./insee-client";
export { fetchGeorisquesData } from "./georisques-client";
export { fetchTaxeFonciereData } from "./taxe-fonciere-client";
export { fetchDpeData } from "./dpe-client";
export { fetchEducationData } from "./education-client";
export { fetchHealthData } from "./health-client";
export { fetchLoyersData } from "./loyers-client";

export type {
  GeoCity,
  DvfCityData,
  InseeCityData,
  IrisResolution,
  GeorisquesCityData,
  TaxeFonciereData,
  DpeAggregateData,
  EducationData,
  HealthData,
  LoyersData,
  RssItem,
} from "./types";
