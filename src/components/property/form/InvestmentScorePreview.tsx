import { PropertyCalculations } from "@/domains/property/types";
import { getScoreLabel } from "@/components/ui/InvestmentScoreBadge";

interface Props {
  calcs: PropertyCalculations;
}

/** Simplified client-side score preview for the form (no market data) */
export default function InvestmentScorePreview({ calcs }: Props) {
  // Net yield: 0-30
  let netYieldScore = 0;
  if (calcs.net_yield >= 8) netYieldScore = 30;
  else if (calcs.net_yield >= 6) netYieldScore = 25;
  else if (calcs.net_yield >= 4) netYieldScore = 18;
  else if (calcs.net_yield >= 2) netYieldScore = 10;

  // Cashflow: 0-25
  let cashflowScore = 0;
  if (calcs.monthly_cashflow >= 200) cashflowScore = 25;
  else if (calcs.monthly_cashflow >= 0) cashflowScore = 15;
  else if (calcs.monthly_cashflow >= -100) cashflowScore = 8;

  // No market data in form → neutral scores
  const priceVsMarketScore = 12;
  const rentVsMarketScore = 10;

  const total = netYieldScore + cashflowScore + priceVsMarketScore + rentVsMarketScore;
  const label = getScoreLabel(total);
  const pct = Math.round((total / 100) * 283);

  function ringColor(): string {
    if (total >= 71) return "text-green-500";
    if (total >= 51) return "text-blue-500";
    if (total >= 31) return "text-amber-500";
    return "text-red-500";
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Score estimé</h2>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200" />
            <circle
              cx="50" cy="50" r="45"
              fill="none" stroke="currentColor" strokeWidth="8"
              strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - pct}
              className={`${ringColor()} transition-all duration-500`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{total}</span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-xs text-gray-400 mt-1">Score partiel — les données marché seront ajoutées après sauvegarde</p>
        </div>
      </div>
    </section>
  );
}
