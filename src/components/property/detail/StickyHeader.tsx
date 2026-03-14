import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { getGrade, rentaColor, cashflowColor } from "@/lib/grade";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
}

export default function StickyHeader({ property, calcs }: Props) {
  const dpe = property.dpe_rating;
  const isDpeAlert = dpe === "F" || dpe === "G";
  const grade = getGrade(property.investment_score);

  return (
    <div className="sticky top-12 md:top-16 z-10 bg-white/95 backdrop-blur border-b border-tiili-border -mx-4 px-4 md:-mx-6 md:px-6 py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${grade.bg} ${grade.color}`}>
            {grade.letter}{property.investment_score ?? ""}
          </span>
          <span className="font-bold text-[#1a1a2e] truncate font-[family-name:var(--font-mono)]">
            {formatCurrency(property.purchase_price)}
          </span>
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
            <p className="text-[10px] text-[#b0b0b8] leading-none font-semibold">Net</p>
            <p className={`font-bold font-[family-name:var(--font-mono)] ${rentaColor(calcs.net_yield)}`}>
              {formatPercent(calcs.net_yield)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#b0b0b8] leading-none font-semibold">CF/mois</p>
            <p className={`font-bold font-[family-name:var(--font-mono)] ${cashflowColor(calcs.monthly_cashflow)}`}>
              {formatCurrency(calcs.monthly_cashflow)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
