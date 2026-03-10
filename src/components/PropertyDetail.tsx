"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Property } from "@/types/property";
import { calculateAll, formatCurrency, formatPercent } from "@/lib/calculations";
import { removeProperty, rescrapeProperty, fetchMarketDataForCity, extractAndUpdateFromText } from "@/lib/actions";
import type { MarketData } from "@/lib/market-data";

interface Props {
  property: Property;
}

export default function PropertyDetail({ property }: Props) {
  const router = useRouter();
  const calcs = calculateAll(property);
  const [rescraping, setRescraping] = useState(false);
  const [rescrapeMsg, setRescrapeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleDelete() {
    if (!confirm("Supprimer ce bien ?")) return;
    await removeProperty(property.id);
    router.push("/dashboard");
  }

  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  useEffect(() => {
    if (property.city) {
      fetchMarketDataForCity(property.city)
        .then(setMarketData)
        .catch(() => setMarketData(null))
        .finally(() => setMarketLoading(false));
    } else {
      setMarketLoading(false);
    }
  }, [property.city]);

  // Paste text fallback
  const [showPasteForm, setShowPasteForm] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleRescrape() {
    setRescraping(true);
    setRescrapeMsg(null);
    const result = await rescrapeProperty(property.id);
    setRescraping(false);
    if (result.success) {
      setRescrapeMsg({ type: "success", text: "Données mises à jour." });
      router.refresh();
    } else {
      setRescrapeMsg({ type: "error", text: result.error || "Échec." });
    }
  }

  async function handleExtractFromText() {
    if (!pastedText.trim()) return;
    setExtracting(true);
    setExtractMsg(null);
    const result = await extractAndUpdateFromText(property.id, pastedText.trim());
    setExtracting(false);
    if (result.success) {
      setExtractMsg({ type: "success", text: "Données extraites et mises à jour." });
      setPastedText("");
      setShowPasteForm(false);
      router.refresh();
    } else {
      setExtractMsg({ type: "error", text: result.error || "Échec de l'extraction." });
    }
  }

  const statCard = (
    label: string,
    value: string,
    color?: "green" | "red" | "default"
  ) => (
    <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-lg md:text-xl font-bold mt-1 ${
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
    <div className="space-y-6 pb-safe">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{property.city}</h1>
          {property.address && (
            <p className="text-gray-500 text-sm truncate">{property.address}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Ajouté le{" "}
            {new Date(property.created_at).toLocaleDateString("fr-FR")}
          </p>
          {property.source_url && (
            <a
              href={property.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:underline mt-0.5 inline-block"
            >
              Voir l&apos;annonce source
            </a>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/property/${property.id}/edit`}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 min-h-[44px] flex items-center"
          >
            Modifier
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 min-h-[44px] flex items-center"
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Photos du bien */}
      {(() => {
        const images: string[] = (() => {
          try { return JSON.parse(property.image_urls || "[]"); }
          catch { return []; }
        })();
        if (images.length === 0) return null;
        return (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex gap-1 overflow-x-auto snap-x snap-mandatory">
              {images.map((url: string, i: number) => (
                <div key={i} className="snap-center shrink-0 w-full md:w-auto md:max-w-[400px] aspect-[4/3] relative bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo ${i + 1} — ${property.city}`}
                    className="w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <p className="text-xs text-gray-400 text-center py-2">
                {images.length} photos — glissez pour voir
              </p>
            )}
          </section>
        );
      })()}

      {/* Infos du bien */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
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

      {/* Données marché */}
      {marketLoading ? (
        <section className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 md:p-6">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Chargement des données du marché...
          </div>
        </section>
      ) : marketData ? (() => {
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

            {/* Prix à l'achat */}
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
                      {formatCurrency(marketData.avgPurchasePricePerM2!)}
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

            {/* Estimation location */}
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
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(property.monthly_rent)}
                  </p>
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
      })() : null}

      {/* Financement */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <section className="bg-blue-50 rounded-xl border border-blue-200 p-4 md:p-6">
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

        <section className="bg-purple-50 rounded-xl border border-purple-200 p-4 md:p-6">
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

      {/* Actions : rescrape, paste fallback, retour */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col items-center gap-3">
          {property.source_url && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={handleRescrape}
                disabled={rescraping}
                className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
              >
                {rescraping ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scraping...
                  </>
                ) : (
                  "Relancer le scraping"
                )}
              </button>
              <button
                onClick={() => setShowPasteForm(!showPasteForm)}
                className="px-5 py-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors min-h-[44px]"
              >
                {showPasteForm ? "Masquer" : "Coller le texte de l'annonce"}
              </button>
            </div>
          )}

          {!property.source_url && (
            <button
              onClick={() => setShowPasteForm(!showPasteForm)}
              className="px-5 py-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors min-h-[44px]"
            >
              {showPasteForm ? "Masquer" : "Coller le texte d'une annonce"}
            </button>
          )}

          {rescrapeMsg && (
            <p className={`text-sm ${rescrapeMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {rescrapeMsg.text}
            </p>
          )}

          {/* Paste fallback form */}
          {showPasteForm && (
            <div className="w-full mt-2 space-y-3">
              <p className="text-sm text-gray-500">
                Si le scraping automatique ne fonctionne pas, ouvrez l&apos;annonce dans votre navigateur,
                s&eacute;lectionnez tout le texte (Ctrl+A), copiez-le (Ctrl+C) et collez-le ci-dessous.
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Collez ici le texte complet de l'annonce..."
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm min-h-[120px] focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={5}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExtractFromText}
                  disabled={extracting || !pastedText.trim()}
                  className="px-5 py-3 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-2"
                >
                  {extracting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Extraction...
                    </>
                  ) : (
                    "Extraire les donn\u00e9es"
                  )}
                </button>
                {extractMsg && (
                  <p className={`text-sm ${extractMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {extractMsg.text}
                  </p>
                )}
              </div>
            </div>
          )}

          <Link
            href="/dashboard"
            className="inline-flex items-center text-indigo-600 hover:underline text-sm min-h-[44px]"
          >
            &larr; Retour au dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
