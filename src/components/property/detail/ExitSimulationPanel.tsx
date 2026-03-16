"use client";

import { ExitSimulation } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  exitSim: ExitSimulation;
}

export default function ExitSimulationPanel({ exitSim }: Props) {
  const {
    holdingDuration,
    salePrice,
    remainingCapital,
    totalRentCollected,
    capitalGainsTax,
    netProfit,
    roi,
    totalInvested,
  } = exitSim;

  const isExonereIR = capitalGainsTax.abattementIR >= 100;
  const isExonerePS = capitalGainsTax.abattementPS >= 100;
  const isExonereTotale = isExonereIR && isExonerePS;

  return (
    <section className="bg-white rounded-xl border border-tiili-border p-4 md:p-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1">
        Bilan de l&apos;opération
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Projection sur {holdingDuration} an{holdingDuration > 1 ? "s" : ""} de détention
      </p>

      {/* KPIs grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Prix de revente */}
        <div className="p-3 bg-tiili-surface rounded-xl">
          <p className="text-lg font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(salePrice)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            Prix de revente
          </p>
        </div>

        {/* Capital restant dû */}
        <div className="p-3 bg-tiili-surface rounded-xl">
          <p className="text-lg font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {formatCurrency(remainingCapital)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            Capital restant dû
          </p>
        </div>

        {/* Loyers nets cumulés */}
        <div className="p-3 bg-tiili-surface rounded-xl">
          <p className={`text-lg font-extrabold font-[family-name:var(--font-mono)] ${
            totalRentCollected >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            {totalRentCollected > 0 ? "+" : ""}{formatCurrency(totalRentCollected)}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            Loyers nets cumulés
          </p>
        </div>

        {/* Taxe plus-value */}
        <div className="p-3 bg-tiili-surface rounded-xl">
          <p className="text-lg font-extrabold text-gray-700 font-[family-name:var(--font-mono)]">
            {isExonereTotale ? (
              <span className="text-green-600">Exonéré</span>
            ) : (
              formatCurrency(capitalGainsTax.taxeTotale)
            )}
          </p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
            Taxe plus-value
          </p>
          {!isExonereTotale && capitalGainsTax.taxeTotale > 0 && (
            <p className="text-[9px] text-gray-400 mt-0.5">
              {isExonereIR ? "IR exonéré" : `IR ${Math.round(capitalGainsTax.abattementIR)}%`}
              {" · "}
              {isExonerePS ? "PS exonérées" : `PS ${Math.round(capitalGainsTax.abattementPS)}%`}
            </p>
          )}
        </div>

        {/* Profit net — full width */}
        <div className={`col-span-2 p-4 rounded-xl border-2 ${
          netProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-2xl font-extrabold font-[family-name:var(--font-mono)] ${
                netProfit >= 0 ? "text-green-700" : "text-red-700"
              }`}>
                {netProfit > 0 ? "+" : ""}{formatCurrency(netProfit)}
              </p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                Profit net total
              </p>
            </div>
            <div className="text-right">
              <p className={`text-xl font-extrabold font-[family-name:var(--font-mono)] ${
                roi >= 0 ? "text-green-700" : "text-red-700"
              }`}>
                {roi > 0 ? "+" : ""}{roi.toFixed(1)}{"\u202f"}%
              </p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                ROI
              </p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Sur un investissement de {formatCurrency(totalInvested)} (apport + frais)
          </p>
        </div>
      </div>
    </section>
  );
}
