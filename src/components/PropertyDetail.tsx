"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Property } from "@/types/property";
import { calculateAll, formatCurrency, formatPercent } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/client";

interface Props {
  property: Property;
}

export default function PropertyDetail({ property }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const calcs = calculateAll(property);

  async function handleDelete() {
    if (!confirm("Supprimer ce bien ?")) return;
    await supabase.from("properties").delete().eq("id", property.id);
    router.push("/dashboard");
    router.refresh();
  }

  const statCard = (
    label: string,
    value: string,
    color?: "green" | "red" | "default"
  ) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-xl font-bold mt-1 ${
          color === "green"
            ? "text-green-600"
            : color === "red"
            ? "text-red-600"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{property.city}</h1>
          {property.address && (
            <p className="text-gray-500">{property.address}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            Ajouté le{" "}
            {new Date(property.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/property/${property.id}/edit`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            Modifier
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Infos du bien */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Le bien</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Prix d&apos;achat</span>
            <p className="font-semibold">{formatCurrency(property.purchase_price)}</p>
          </div>
          <div>
            <span className="text-gray-500">Surface</span>
            <p className="font-semibold">{property.surface} m²</p>
          </div>
          <div>
            <span className="text-gray-500">Prix au m²</span>
            <p className="font-semibold">
              {property.surface > 0
                ? formatCurrency(property.purchase_price / property.surface)
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Type</span>
            <p className="font-semibold capitalize">{property.property_type}</p>
          </div>
        </div>
        {property.description && (
          <p className="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg">
            {property.description}
          </p>
        )}
      </section>

      {/* Financement */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
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
            <p className="font-semibold">
              {formatCurrency(property.personal_contribution)}
            </p>
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
            <p className="font-semibold text-indigo-600">
              {formatCurrency(calcs.total_project_cost)}
            </p>
          </div>
        </div>
      </section>

      {/* Indicateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location classique */}
        <section className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-900">
            Location classique
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {statCard("Loyer mensuel", formatCurrency(property.monthly_rent))}
            {statCard("Revenu annuel net", formatCurrency(calcs.annual_rent_income))}
            {statCard("Rentabilité brute", formatPercent(calcs.gross_yield))}
            {statCard("Rentabilité nette", formatPercent(calcs.net_yield))}
            {statCard(
              "Cash-flow / mois",
              formatCurrency(calcs.monthly_cashflow),
              calcs.monthly_cashflow >= 0 ? "green" : "red"
            )}
            {statCard("Charges annuelles", formatCurrency(calcs.annual_charges))}
          </div>
        </section>

        {/* Airbnb */}
        <section className="bg-purple-50 rounded-xl border border-purple-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-purple-900">Airbnb</h2>
          <div className="grid grid-cols-2 gap-3">
            {statCard(
              "Prix / nuit",
              formatCurrency(property.airbnb_price_per_night)
            )}
            {statCard(
              "Revenu annuel",
              formatCurrency(calcs.airbnb_annual_income)
            )}
            {statCard(
              "Rentabilité brute",
              formatPercent(calcs.airbnb_gross_yield)
            )}
            {statCard(
              "Rentabilité nette",
              formatPercent(calcs.airbnb_net_yield)
            )}
            {statCard(
              "Cash-flow / mois",
              formatCurrency(calcs.airbnb_monthly_cashflow),
              calcs.airbnb_monthly_cashflow >= 0 ? "green" : "red"
            )}
            {statCard(
              "Charges annuelles",
              formatCurrency(calcs.airbnb_annual_charges)
            )}
          </div>
        </section>
      </div>

      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-indigo-600 hover:underline text-sm"
        >
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
