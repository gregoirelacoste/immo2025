import { PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  calcs: PropertyCalculations;
  showAirbnb?: boolean;
}

function getVerdict(calcs: PropertyCalculations): { emoji: string; text: string; color: string } {
  const cf = calcs.monthly_cashflow;
  const renta = calcs.net_yield;

  if (renta >= 6 && cf >= 0) {
    return { emoji: "🟢", text: "Excellent investissement ! Rendement élevé et cash-flow positif.", color: "text-green-100" };
  }
  if (renta >= 4 && cf >= 0) {
    return { emoji: "🟢", text: "Bon investissement. Rendement correct et cash-flow positif.", color: "text-green-100" };
  }
  if (renta >= 3 && cf >= -50) {
    return { emoji: "🟡", text: "Investissement correct mais le cash-flow est serré. Vérifiez bien les charges.", color: "text-amber-100" };
  }
  if (cf < -100) {
    return { emoji: "🔴", text: `Attention : vous devrez sortir ${formatCurrency(Math.abs(cf))} de votre poche chaque mois pour rembourser le prêt.`, color: "text-red-200" };
  }
  return { emoji: "🟡", text: "Investissement moyen. Comparez avec d'autres biens avant de vous décider.", color: "text-amber-100" };
}

export default function ResultsSummarySection({ calcs, showAirbnb = true }: Props) {
  const verdict = getVerdict(calcs);

  return (
    <section className="bg-gradient-to-r from-amber-600 to-purple-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
      <h2 className="text-lg font-semibold mb-4">Résultats estimés</h2>

      {/* Verdict — always visible */}
      <div className={`mb-4 p-3 bg-white/10 rounded-lg text-sm ${verdict.color} leading-relaxed`}>
        <span className="mr-1">{verdict.emoji}</span> {verdict.text}
      </div>

      <div className={`grid grid-cols-1 ${showAirbnb ? "md:grid-cols-2" : ""} gap-4 md:gap-6`}>
        <div className="bg-white/10 rounded-lg p-4">
          <h3 className="font-medium mb-3 text-amber-100">Location classique</h3>
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
            <h3 className="font-medium mb-3 text-amber-100">Airbnb</h3>
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
