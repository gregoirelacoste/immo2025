import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import StatCard from "@/components/ui/StatCard";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
}

export default function ClassicYieldPanel({ property, calcs }: Props) {
  return (
    <section className="bg-blue-50 rounded-xl border border-blue-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4 text-blue-900">Location classique</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Loyer mensuel" value={formatCurrency(property.monthly_rent)} />
        <StatCard label="Revenu annuel net" value={formatCurrency(calcs.annual_rent_income)} />
        <StatCard label="Rentabilité brute" value={formatPercent(calcs.gross_yield)} />
        <StatCard label="Rentabilité nette" value={formatPercent(calcs.net_yield)} />
        <StatCard
          label="Cash-flow / mois"
          value={formatCurrency(calcs.monthly_cashflow)}
          color={calcs.monthly_cashflow >= 0 ? "green" : "red"}
        />
        <StatCard label="Charges annuelles" value={formatCurrency(calcs.annual_charges)} />
      </div>
    </section>
  );
}
