export interface AlertThresholds {
  min_net_yield: number | null;     // minimum net yield % to flag (e.g. 5)
  min_cashflow: number | null;      // minimum monthly cashflow € (e.g. 0)
  max_price: number | null;         // maximum purchase price €
  min_score: number | null;         // minimum investment score (e.g. 50)
  target_cities: string[];          // cities to watch (empty = all)
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  min_net_yield: null,
  min_cashflow: null,
  max_price: null,
  min_score: null,
  target_cities: [],
};
