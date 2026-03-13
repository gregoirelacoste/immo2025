import { Property, PropertyCalculations } from "@/domains/property/types";
import { AlertThresholds } from "@/domains/auth/alert-types";

export interface AlertResult {
  property_id: string;
  alerts: AlertItem[];
  matchesAll: boolean;
}

export interface AlertItem {
  type: "yield" | "cashflow" | "price" | "score" | "city";
  label: string;
  passed: boolean;
  value: string;
  threshold: string;
}

export function checkPropertyAlerts(
  property: Property,
  calcs: PropertyCalculations,
  thresholds: AlertThresholds
): AlertResult {
  const alerts: AlertItem[] = [];

  if (thresholds.min_net_yield !== null) {
    alerts.push({
      type: "yield",
      label: "Rendement net",
      passed: calcs.net_yield >= thresholds.min_net_yield,
      value: `${calcs.net_yield.toFixed(2)} %`,
      threshold: `>= ${thresholds.min_net_yield} %`,
    });
  }

  if (thresholds.min_cashflow !== null) {
    alerts.push({
      type: "cashflow",
      label: "Cash-flow mensuel",
      passed: calcs.monthly_cashflow >= thresholds.min_cashflow,
      value: `${Math.round(calcs.monthly_cashflow)} €`,
      threshold: `>= ${thresholds.min_cashflow} €`,
    });
  }

  if (thresholds.max_price !== null) {
    alerts.push({
      type: "price",
      label: "Prix d'achat",
      passed: property.purchase_price <= thresholds.max_price,
      value: `${Math.round(property.purchase_price).toLocaleString("fr-FR")} €`,
      threshold: `<= ${thresholds.max_price.toLocaleString("fr-FR")} €`,
    });
  }

  if (thresholds.min_score !== null) {
    const score = property.investment_score ?? 0;
    alerts.push({
      type: "score",
      label: "Score investissement",
      passed: score >= thresholds.min_score,
      value: `${Math.round(score)} / 100`,
      threshold: `>= ${thresholds.min_score}`,
    });
  }

  if (thresholds.target_cities.length > 0) {
    const cityLower = property.city.toLowerCase().trim();
    const matched = thresholds.target_cities.some(
      (c) => c.toLowerCase().trim() === cityLower
    );
    alerts.push({
      type: "city",
      label: "Ville cible",
      passed: matched,
      value: property.city || "N/A",
      threshold: thresholds.target_cities.join(", "),
    });
  }

  return {
    property_id: property.id,
    alerts,
    matchesAll: alerts.length > 0 && alerts.every((a) => a.passed),
  };
}

/** Check if any thresholds are actually configured */
export function hasActiveThresholds(thresholds: AlertThresholds): boolean {
  return (
    thresholds.min_net_yield !== null ||
    thresholds.min_cashflow !== null ||
    thresholds.max_price !== null ||
    thresholds.min_score !== null ||
    thresholds.target_cities.length > 0
  );
}
