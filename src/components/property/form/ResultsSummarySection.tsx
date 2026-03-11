import { PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  calcs: PropertyCalculations;
  showAirbnb?: boolean;
}

export default function ResultsSummarySection({ calcs, showAirbnb = true }: Props) {
  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
      <h2 className="text-lg font-semibold mb-4">Résultats estimés</h2>
      <div className={`grid grid-cols-1 ${showAirbnb ? "md:grid-cols-2" : ""} gap-4 md:gap-6`}>
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3 text-indigo-100">Location classique</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Rentabilité brute</span>
              <span className="font-bold">{formatPercent(calcs.gross_yield)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rentabilité nette</span>
              <span className="font-bold">{formatPercent(calcs.net_yield)}</span>
            </div>
            <div className="flex justify-between border-t border-white/20 pt-2">
              <span>Cash-flow mensuel</span>
              <span className={`font-bold text-lg ${calcs.monthly_cashflow >= 0 ? "text-green-300" : "text-red-300"}`}>
                {formatCurrency(calcs.monthly_cashflow)}
              </span>
            </div>
          </div>
        </div>

        {showAirbnb && (
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="font-medium mb-3 text-indigo-100">Airbnb</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Rentabilité brute</span>
                <span className="font-bold">{formatPercent(calcs.airbnb_gross_yield)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rentabilité nette</span>
                <span className="font-bold">{formatPercent(calcs.airbnb_net_yield)}</span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-2">
                <span>Cash-flow mensuel</span>
                <span className={`font-bold text-lg ${calcs.airbnb_monthly_cashflow >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {formatCurrency(calcs.airbnb_monthly_cashflow)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
