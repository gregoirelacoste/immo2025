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
  LoyersData,
} from "@/infrastructure/data-sources/types";

export function mapDvfToFields(dvf: DvfCityData): Partial<LocalityDataFields> {
  return {
    avg_purchase_price_per_m2: dvf.avgPricePerM2,
    median_purchase_price_per_m2: dvf.medianPricePerM2,
    transaction_count: dvf.transactionCount ?? null,
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

export function mapLoyersToFields(loyers: LoyersData): Partial<LocalityDataFields> {
  return {
    avg_rent_per_m2: Math.round(loyers.loyerMedM2 * 100) / 100, // unfurnished rent only
  };
}

/**
 * Compute derived fields from already-enriched data.
 * - avg_property_tax_per_m2: estimated from TFB rate + annual rent (cadastral value ~ 50% of gross rent)
 * - typical_cashflow_per_m2: rent - charges - TF (monthly, before loan)
 */
export function computeDerivedFields(
  fields: Partial<LocalityDataFields>
): Partial<LocalityDataFields> {
  const derived: Partial<LocalityDataFields> = {};

  // Estimate property tax per m² from TFB rate + rent
  // Cadastral rental value ≈ 50% of annual gross rent (standard French estimation)
  // TF/m²/year = (rent_per_m2 * 12 * 0.5) * tauxTFB / 100
  const rent = fields.avg_rent_per_m2;
  const tauxTFB = fields.property_tax_rate_pct;
  if (rent != null && tauxTFB != null) {
    const cadastralValuePerM2 = rent * 12 * 0.5;
    derived.avg_property_tax_per_m2 = Math.round(cadastralValuePerM2 * tauxTFB) / 100;
  }

  // Compute typical cashflow per m² (monthly, before loan)
  // Only compute if we have real rent data (not hardcoded fallbacks)
  if (rent != null) {
    const chargesMonthly = fields.avg_condo_charges_per_m2 ?? 2.5; // national avg ~2.5 €/m²/month
    const tfMonthly = (derived.avg_property_tax_per_m2 ?? fields.avg_property_tax_per_m2 ?? 0) / 12;
    derived.typical_cashflow_per_m2 = Math.round((rent - chargesMonthly - tfMonthly) * 100) / 100;
  }

  return derived;
}
