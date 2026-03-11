import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import StatCard from "@/components/ui/StatCard";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
}

export default function AirbnbYieldPanel({ property, calcs }: Props) {
  return (
    <section className="bg-purple-50 rounded-xl border border-purple-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4 text-purple-900">Airbnb</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Prix / nuit" value={formatCurrency(property.airbnb_price_per_night)} />
        <StatCard label="Revenu annuel" value={formatCurrency(calcs.airbnb_annual_income)} />
        <StatCard label="Rentabilité brute" value={formatPercent(calcs.airbnb_gross_yield)} />
        <StatCard label="Rentabilité nette" value={formatPercent(calcs.airbnb_net_yield)} />
        <StatCard
          label="Cash-flow / mois"
          value={formatCurrency(calcs.airbnb_monthly_cashflow)}
          color={calcs.airbnb_monthly_cashflow >= 0 ? "green" : "red"}
        />
        <StatCard label="Charges annuelles" value={formatCurrency(calcs.airbnb_annual_charges)} />
      </div>
    </section>
  );
}
