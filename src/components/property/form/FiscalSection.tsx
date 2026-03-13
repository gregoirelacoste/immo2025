import { PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  calcs: PropertyCalculations;
  fiscalRegime: string;
}

export default function FiscalSection({ calcs, fiscalRegime }: Props) {
  const { fiscal } = calcs;

  if (calcs.annual_rent_income <= 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Simulation fiscale</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Micro-BIC */}
        <div className={`p-4 rounded-lg border-2 ${fiscalRegime === "micro_bic" || fiscalRegime === "micro_foncier" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-gray-50"}`}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Micro-BIC</h3>
          <p className="text-xs text-gray-500 mb-3">Abattement 50% sur les revenus</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Impôt/an</span>
              <span className="font-semibold text-red-600">{formatCurrency(fiscal.micro_bic_tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenu net</span>
              <span className="font-semibold">{formatCurrency(fiscal.net_net_income_micro)}</span>
            </div>
          </div>
        </div>

        {/* LMNP Réel */}
        <div className={`p-4 rounded-lg border-2 ${fiscalRegime === "lmnp_reel" || fiscalRegime === "reel_foncier" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-gray-50"}`}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">LMNP Réel</h3>
          <p className="text-xs text-gray-500 mb-3">Amortissement + déduction charges</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Impôt/an</span>
              <span className="font-semibold text-red-600">{formatCurrency(fiscal.lmnp_reel_tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenu net</span>
              <span className="font-semibold">{formatCurrency(fiscal.net_net_income_reel)}</span>
            </div>
          </div>
        </div>
      </div>

      {fiscal.fiscal_savings > 0 && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg text-center">
          <span className="text-sm text-green-700 font-semibold">
            Économie LMNP Réel : {formatCurrency(fiscal.fiscal_savings)}/an
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span>Rendement net-net (après impôts) :</span>
        <span className="font-semibold text-gray-700">{calcs.net_net_yield.toFixed(2)} %</span>
      </div>
    </section>
  );
}
