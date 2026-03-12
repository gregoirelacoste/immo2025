import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
}

export default function StickyHeader({ property, calcs }: Props) {
  const dpe = property.dpe_rating;
  const isDpeAlert = dpe === "F" || dpe === "G";

  return (
    <div className="sticky top-12 md:top-16 z-10 bg-white/95 backdrop-blur border-b border-gray-200 -mx-4 px-4 md:-mx-6 md:px-6 py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-gray-900 truncate">{formatCurrency(property.purchase_price)}</span>
          {dpe && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
              isDpeAlert ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}>
              DPE {dpe}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 leading-none">Net</p>
            <p className={`font-bold ${calcs.net_yield >= 5 ? "text-green-600" : calcs.net_yield >= 3 ? "text-blue-600" : "text-red-600"}`}>
              {formatPercent(calcs.net_yield)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 leading-none">CF/mois</p>
            <p className={`font-bold ${calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(calcs.monthly_cashflow)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 leading-none">Net-net</p>
            <p className={`font-bold ${calcs.net_net_yield >= 4 ? "text-green-600" : calcs.net_net_yield >= 2 ? "text-blue-600" : "text-red-600"}`}>
              {formatPercent(calcs.net_net_yield)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
