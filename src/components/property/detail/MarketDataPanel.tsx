import { Property } from "@/domains/property/types";
import type { MarketData } from "@/domains/market/types";
import { formatCurrency } from "@/lib/calculations";
import Spinner from "@/components/ui/Spinner";

interface Props {
  property: Property;
  marketData: MarketData | null;
  loading: boolean;
}

export default function MarketDataPanel({ property, marketData, loading }: Props) {
  if (loading) {
    return (
      <section className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 md:p-6">
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Spinner />
          Chargement des données du marché...
        </div>
      </section>
    );
  }

  if (!marketData) return null;

  const propertyPricePerM2 = property.surface > 0 ? property.purchase_price / property.surface : 0;
  const diff = marketData.medianPurchasePricePerM2 && propertyPricePerM2
    ? ((propertyPricePerM2 - marketData.medianPurchasePricePerM2) / marketData.medianPurchasePricePerM2) * 100
    : null;
  const estimatedMonthlyRent = marketData.avgRentPerM2 && property.surface > 0
    ? Math.round(marketData.avgRentPerM2 * property.surface)
    : null;

  return (
    <section className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-1 text-emerald-900">
        Données du marché — {marketData.communeName}
      </h2>
      <p className="text-xs text-emerald-600 mb-4">
        {marketData.transactionCount > 0
          ? `DVF (data.gouv.fr) — ${marketData.transactionCount} ventes (${marketData.period})`
          : `Données ${marketData.period}`}
        {marketData.rentSource === "reference" && " + observatoire des loyers"}
      </p>

      {marketData.medianPurchasePricePerM2 && (
        <>
          <h3 className="text-sm font-medium text-emerald-800 mb-2">Prix à l&apos;achat</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Prix médian /m²</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(marketData.medianPurchasePricePerM2)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Prix moyen /m²</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(marketData.avgPurchasePricePerM2 ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Votre prix /m²</p>
              <p className="text-lg font-bold text-gray-900">
                {propertyPricePerM2 > 0 ? formatCurrency(propertyPricePerM2) : "—"}
              </p>
            </div>
            <div className={`rounded-lg p-3 border ${
              diff == null ? "bg-white border-emerald-100" : diff <= 0 ? "bg-green-100 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <p className="text-xs text-gray-500">Écart marché</p>
              <p className={`text-lg font-bold ${
                diff == null ? "text-gray-400" : diff <= 0 ? "text-green-700" : "text-red-700"
              }`}>
                {diff != null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)} %` : "—"}
              </p>
            </div>
          </div>
        </>
      )}

      <h3 className="text-sm font-medium text-emerald-800 mb-2">
        Données locatives
        {marketData.rentSource === "reference" && (
          <span className="ml-2 text-xs font-normal text-emerald-600">(observatoire des loyers)</span>
        )}
        {marketData.rentSource === "dvf-estimate" && (
          <span className="ml-2 text-xs font-normal text-emerald-600">(estimé via DVF, rendement 5.5%)</span>
        )}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-gray-500">Loyer moyen /m²</p>
          <p className="text-lg font-bold text-gray-900">
            {marketData.avgRentPerM2 ? `${marketData.avgRentPerM2.toFixed(1)} €` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-gray-500">Loyer estimé /mois</p>
          <p className="text-lg font-bold text-gray-900">
            {estimatedMonthlyRent ? formatCurrency(estimatedMonthlyRent) : "—"}
          </p>
        </div>
        {property.monthly_rent > 0 ? (
          <div className="bg-white rounded-lg p-3 border border-emerald-100">
            <p className="text-xs text-gray-500">Votre loyer /mois</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(property.monthly_rent)}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 border border-emerald-100">
            <p className="text-xs text-gray-500">Votre loyer</p>
            <p className="text-lg font-bold text-gray-400">Non renseigné</p>
          </div>
        )}
        {property.monthly_rent > 0 && estimatedMonthlyRent ? (
          <div className={`rounded-lg p-3 border ${
            property.monthly_rent >= estimatedMonthlyRent ? "bg-green-100 border-green-200" : "bg-amber-50 border-amber-200"
          }`}>
            <p className="text-xs text-gray-500">Écart marché</p>
            <p className={`text-lg font-bold ${
              property.monthly_rent >= estimatedMonthlyRent ? "text-green-700" : "text-amber-600"
            }`}>
              {property.monthly_rent >= estimatedMonthlyRent ? "+" : ""}
              {((property.monthly_rent - estimatedMonthlyRent) / estimatedMonthlyRent * 100).toFixed(0)} %
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 border border-emerald-100">
            <p className="text-xs text-gray-500">Écart marché</p>
            <p className="text-lg font-bold text-gray-400">—</p>
          </div>
        )}
      </div>
    </section>
  );
}
