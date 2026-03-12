export interface RentalEntry {
  id: string;
  property_id: string;
  user_id: string;
  month: string;          // "2025-03" format
  rent_received: number;  // actual rent received
  charges_paid: number;   // actual charges paid
  vacancy_days: number;   // days without tenant
  notes: string;
  created_at: string;
}

export interface RentalSummary {
  total_rent_received: number;
  total_charges_paid: number;
  total_vacancy_days: number;
  months_tracked: number;
  avg_monthly_rent: number;
  avg_monthly_charges: number;
  actual_net_yield: number;    // calculated from real data
  predicted_net_yield: number; // from property calculations
  yield_delta: number;         // actual - predicted
}
