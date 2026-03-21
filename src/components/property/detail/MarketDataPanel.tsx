import { Property } from "@/domains/property/types";
import type { MarketData } from "@/domains/market/types";
import { formatCurrency } from "@/lib/calculations";
import Spinner from "@/components/ui/Spinner";

interface Props {
  property: Property;
  marketData: MarketData | null;
  loading: boolean;
  /** Monthly rent from first simulation (overrides property.monthly_rent) */
  monthlyRent?: number;
}

/** Get market price/m² for the property's room count, falling back to general average */
function getMarketPriceForRooms(md: MarketData, roomCount: number): { price: number | null; label: string } {
  if (roomCount === 1 && md.avgPriceT1PerM2) return { price: md.avgPriceT1PerM2, label: "T1" };
  if (roomCount === 2 && md.avgPriceT2PerM2) return { price: md.avgPriceT2PerM2, label: "T2" };
  if (roomCount === 3 && md.avgPriceT3PerM2) return { price: md.avgPriceT3PerM2, label: "T3" };
  if (roomCount >= 4 && md.avgPriceT4PlusPerM2) return { price: md.avgPriceT4PlusPerM2, label: "T4+" };
  return { price: null, label: "" };
}

export default function MarketDataPanel({ property, marketData, loading, monthlyRent }: Props) {
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

  // Room-based price comparison (preferred when room_count is set)
  const roomPrice = property.room_count > 0 ? getMarketPriceForRooms(marketData, property.room_count) : { price: null, label: "" };
  const referencePrice = roomPrice.price ?? marketData.medianPurchasePricePerM2;
  const referenceLabel = roomPrice.price ? `médian ${roomPrice.label}` : "médian";

  const diff = referencePrice && propertyPricePerM2
    ? ((propertyPricePerM2 - referencePrice) / referencePrice) * 100
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
        {marketData.rentSource === "locality"
          ? `Données locales`
          : marketData.transactionCount > 0
            ? `DVF (data.gouv.fr) — ${marketData.transactionCount} ventes (${marketData.period})`
            : `Données ${marketData.period}`}
        {marketData.rentSource === "reference" && " + observatoire des loyers"}
      </p>

      {referencePrice && (
        <>
          <h3 className="text-sm font-medium text-emerald-800 mb-2">
            Prix à l&apos;achat
            {roomPrice.price && (
              <span className="ml-1 text-xs font-normal text-emerald-600">
                (comparaison {roomPrice.label})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Prix {referenceLabel} /m²</p>
              <p className="text-lg font-bold text-[#1a1a2e]">
                {formatCurrency(referencePrice)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Prix moyen /m²</p>
              <p className="text-lg font-bold text-[#1a1a2e]">
                {formatCurrency(marketData.avgPurchasePricePerM2 ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Votre prix /m²</p>
              <p className="text-lg font-bold text-[#1a1a2e]">
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

          {/* Show segmented room prices if available */}
          {(marketData.avgPriceT1PerM2 || marketData.avgPriceT2PerM2 || marketData.avgPriceT3PerM2 || marketData.avgPriceT4PlusPerM2) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {marketData.avgPriceT1PerM2 && (
                <div className={`rounded-lg p-2 border text-center ${property.room_count === 1 ? "bg-emerald-100 border-emerald-300" : "bg-white border-emerald-100"}`}>
                  <p className="text-xs text-gray-500">T1</p>
                  <p className="text-sm font-semibold text-[#1a1a2e]">{formatCurrency(marketData.avgPriceT1PerM2)}/m²</p>
                </div>
              )}
              {marketData.avgPriceT2PerM2 && (
                <div className={`rounded-lg p-2 border text-center ${property.room_count === 2 ? "bg-emerald-100 border-emerald-300" : "bg-white border-emerald-100"}`}>
                  <p className="text-xs text-gray-500">T2</p>
                  <p className="text-sm font-semibold text-[#1a1a2e]">{formatCurrency(marketData.avgPriceT2PerM2)}/m²</p>
                </div>
              )}
              {marketData.avgPriceT3PerM2 && (
                <div className={`rounded-lg p-2 border text-center ${property.room_count === 3 ? "bg-emerald-100 border-emerald-300" : "bg-white border-emerald-100"}`}>
                  <p className="text-xs text-gray-500">T3</p>
                  <p className="text-sm font-semibold text-[#1a1a2e]">{formatCurrency(marketData.avgPriceT3PerM2)}/m²</p>
                </div>
              )}
              {marketData.avgPriceT4PlusPerM2 && (
                <div className={`rounded-lg p-2 border text-center ${property.room_count >= 4 ? "bg-emerald-100 border-emerald-300" : "bg-white border-emerald-100"}`}>
                  <p className="text-xs text-gray-500">T4+</p>
                  <p className="text-sm font-semibold text-[#1a1a2e]">{formatCurrency(marketData.avgPriceT4PlusPerM2)}/m²</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <h3 className="text-sm font-medium text-emerald-800 mb-2">
        Données locatives
        {marketData.rentSource === "locality" && (
          <span className="ml-2 text-xs font-normal text-emerald-600">(données locales)</span>
        )}
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
          <p className="text-lg font-bold text-[#1a1a2e]">
            {marketData.avgRentPerM2 ? `${marketData.avgRentPerM2.toFixed(1)} €` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-gray-500">Loyer estimé /mois</p>
          <p className="text-lg font-bold text-[#1a1a2e]">
            {estimatedMonthlyRent ? formatCurrency(estimatedMonthlyRent) : "—"}
          </p>
        </div>
        {(monthlyRent ?? property.monthly_rent) > 0 ? (
          <div className="bg-white rounded-lg p-3 border border-emerald-100">
            <p className="text-xs text-gray-500">Votre loyer /mois</p>
            <p className="text-lg font-bold text-[#1a1a2e]">{formatCurrency(monthlyRent ?? property.monthly_rent)}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 border border-emerald-100">
            <p className="text-xs text-gray-500">Votre loyer</p>
            <p className="text-lg font-bold text-gray-400">Non renseigné</p>
          </div>
        )}
        {(monthlyRent ?? property.monthly_rent) > 0 && estimatedMonthlyRent ? (
          <div className={`rounded-lg p-3 border ${
            (monthlyRent ?? property.monthly_rent) >= estimatedMonthlyRent ? "bg-green-100 border-green-200" : "bg-amber-50 border-amber-200"
          }`}>
            <p className="text-xs text-gray-500">Écart marché</p>
            <p className={`text-lg font-bold ${
              (monthlyRent ?? property.monthly_rent) >= estimatedMonthlyRent ? "text-green-700" : "text-amber-600"
            }`}>
              {(monthlyRent ?? property.monthly_rent) >= estimatedMonthlyRent ? "+" : ""}
              {(((monthlyRent ?? property.monthly_rent) - estimatedMonthlyRent) / estimatedMonthlyRent * 100).toFixed(0)} %
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
