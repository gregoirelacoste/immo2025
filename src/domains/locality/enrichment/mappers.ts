/**
 * Pure mapping functions: API data → partial LocalityDataFields.
 */

import type { LocalityDataFields } from "@/domains/locality/types";
import type {
  DvfCityData,
  InseeCityData,
  GeorisquesCityData,
  TaxeFonciereData,
  DpeAggregateData,
  EducationData,
  HealthData,
} from "@/infrastructure/data-sources/types";

export function mapDvfToFields(dvf: DvfCityData): Partial<LocalityDataFields> {
  return {
    avg_purchase_price_per_m2: dvf.avgPricePerM2,
    median_purchase_price_per_m2: dvf.medianPricePerM2,
    transaction_count: dvf.transactionCount || null,
    price_trend_pct: dvf.priceTrend1yPct,
  };
}

export function mapInseeToFields(insee: InseeCityData): Partial<LocalityDataFields> {
  return {
    population: insee.population,
    median_income: insee.medianIncome,
    poverty_rate: insee.povertyRate,
    unemployment_rate: insee.unemploymentRate,
    vacant_housing_pct: insee.vacantHousingPct,
    owner_occupier_pct: insee.ownerOccupierPct,
  };
}

export function mapGeorisquesToFields(geo: GeorisquesCityData): Partial<LocalityDataFields> {
  return {
    risk_level: geo.riskLevel,
    natural_risks: geo.naturalRisks,
    flood_risk_level: geo.floodRiskLevel,
    seismic_zone: geo.seismicZone,
    radon_level: geo.radonLevel,
    industrial_risk: geo.industrialRisk ? 1 : 0,
  };
}

export function mapTaxeToFields(tax: TaxeFonciereData): Partial<LocalityDataFields> {
  return {
    property_tax_rate_pct: tax.tauxTFB,
  };
}

export function mapDpeToFields(dpe: DpeAggregateData): Partial<LocalityDataFields> {
  return {
    avg_dpe_class: dpe.avgDpeClass,
    avg_energy_consumption: dpe.avgEnergyConsumption,
    avg_ges_class: dpe.avgGesClass,
    dpe_count: dpe.dpeCount,
  };
}

export function mapEducationToFields(edu: EducationData): Partial<LocalityDataFields> {
  return {
    school_count: edu.schoolCount,
    university_nearby: edu.universityNearby,
  };
}

export function mapHealthToFields(health: HealthData): Partial<LocalityDataFields> {
  return {
    doctor_count: health.doctorCount,
    pharmacy_count: health.pharmacyCount,
  };
}
