import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  property: Property;
  calcs: PropertyCalculations;
}

export default function FinancingPanel({ property, calcs }: Props) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Financement</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Montant emprunté</span>
          <p className="font-semibold">{formatCurrency(property.loan_amount)}</p>
        </div>
        <div>
          <span className="text-gray-500">Taux d&apos;intérêt</span>
          <p className="font-semibold">{property.interest_rate} %</p>
        </div>
        <div>
          <span className="text-gray-500">Durée</span>
          <p className="font-semibold">{property.loan_duration} ans</p>
        </div>
        <div>
          <span className="text-gray-500">Apport</span>
          <p className="font-semibold">{formatCurrency(property.personal_contribution)}</p>
        </div>
        <div>
          <span className="text-gray-500">Mensualité crédit</span>
          <p className="font-semibold">{formatCurrency(calcs.monthly_payment)}</p>
        </div>
        <div>
          <span className="text-gray-500">Assurance / mois</span>
          <p className="font-semibold">{formatCurrency(calcs.monthly_insurance)}</p>
        </div>
        <div>
          <span className="text-gray-500">Frais de notaire</span>
          <p className="font-semibold">{formatCurrency(calcs.total_notary_fees)}</p>
        </div>
        <div>
          <span className="text-gray-500">Coût total du crédit</span>
          <p className="font-semibold">{formatCurrency(calcs.total_loan_cost)}</p>
        </div>
        <div>
          <span className="text-gray-500">Coût total projet</span>
          <p className="font-semibold text-indigo-600">{formatCurrency(calcs.total_project_cost)}</p>
        </div>
      </div>
    </section>
  );
}
