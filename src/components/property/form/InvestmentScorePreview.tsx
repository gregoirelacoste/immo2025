import { PropertyCalculations } from "@/domains/property/types";
import { getScoreLabel } from "@/components/ui/InvestmentScoreBadge";

interface Props {
  calcs: PropertyCalculations;
}

/** Simplified client-side score preview for the form (no market/socio data) */
export default function InvestmentScorePreview({ calcs }: Props) {
  // Net yield: 0-20
  let netYieldScore = 0;
  if (calcs.net_yield >= 8) netYieldScore = 20;
  else if (calcs.net_yield >= 6) netYieldScore = 16;
  else if (calcs.net_yield >= 4) netYieldScore = 12;
  else if (calcs.net_yield >= 2) netYieldScore = 7;

  // Cashflow: 0-15
  let cashflowScore = 0;
  if (calcs.monthly_cashflow >= 200) cashflowScore = 15;
  else if (calcs.monthly_cashflow >= 0) cashflowScore = 10;
  else if (calcs.monthly_cashflow >= -100) cashflowScore = 5;

  // No market/socio data in form → neutral scores
  const neutralFinancial = 8 + 5; // priceVsMarket + rentVsMarket
  const neutralSocio = 5 + 5 + 5 + 5; // demo + income + employment + attractiveness

  const total = netYieldScore + cashflowScore + neutralFinancial + neutralSocio;
  const label = getScoreLabel(total);
  const pct = Math.round((total / 100) * 283);

  function ringColor(): string {
    if (total >= 71) return "text-green-500";
    if (total >= 51) return "text-blue-500";
    if (total >= 31) return "text-amber-500";
    return "text-red-500";
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-3 text-[#1a1a2e]">Score estimé</h2>
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
            <span className="text-xl font-bold text-[#1a1a2e]">{total}</span>
            <span className="text-[10px] text-gray-400">/100</span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-semibold text-gray-800">{label}</p>
          <p className="text-xs text-gray-400 mt-1">Score partiel — les données marché et socio-économiques seront ajoutées après sauvegarde</p>
        </div>
      </div>
    </section>
  );
}
