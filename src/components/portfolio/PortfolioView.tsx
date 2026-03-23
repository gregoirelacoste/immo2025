"use client";

import Link from "next/link";
import { Property, PropertyCalculations } from "@/domains/property/types";
import { RentalSummary } from "@/domains/rental/types";
import { formatCurrency, getEffectivePrice } from "@/lib/calculations";

interface Props {
  properties: Property[];
  calculations: Map<string, PropertyCalculations>;
  rentalData: Map<string, RentalSummary>;
}

export default function PortfolioView({ properties, calculations, rentalData }: Props) {
  // Aggregate stats
  const totalInvested = properties.reduce((s, p) => {
    const calcs = calculations.get(p.id);
    return s + (calcs?.total_project_cost ?? 0);
  }, 0);

  const totalMonthlyRent = properties.reduce((s, p) => {
    const rental = rentalData.get(p.id);
    if (rental) return s + rental.avg_monthly_rent;
    return s + p.monthly_rent;
  }, 0);

  const totalMonthlyCharges = properties.reduce((s, p) => {
    const rental = rentalData.get(p.id);
    if (rental) return s + rental.avg_monthly_charges;
    const calcs = calculations.get(p.id);
    return s + (calcs ? calcs.annual_charges / 12 : 0);
  }, 0);

  const portfolioYield =
    totalInvested > 0
      ? (((totalMonthlyRent - totalMonthlyCharges) * 12) / totalInvested) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-tiili-border p-4">
          <p className="text-xs text-gray-500 mb-1">Patrimoine investi</p>
          <p className="text-xl font-bold text-[#1a1a2e]">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-tiili-border p-4">
          <p className="text-xs text-gray-500 mb-1">Revenus mensuels</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalMonthlyRent)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-tiili-border p-4">
          <p className="text-xs text-gray-500 mb-1">Charges mensuelles</p>
          <p className="text-xl font-bold text-[#1a1a2e]">{formatCurrency(totalMonthlyCharges)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-tiili-border p-4">
          <p className="text-xs text-gray-500 mb-1">Rendement global</p>
          <p className={`text-xl font-bold ${portfolioYield >= 0 ? "text-green-600" : "text-red-600"}`}>
            {portfolioYield.toFixed(2)} %
          </p>
        </div>
      </div>

      {/* Properties list */}
      <div className="bg-white rounded-xl shadow-sm border border-tiili-border overflow-hidden">
        <div className="p-4 border-b border-tiili-border">
          <h2 className="text-lg font-semibold">{properties.length} bien{properties.length > 1 ? "s" : ""} en portefeuille</h2>
        </div>

        {properties.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <p>Aucun bien achete ou en gestion.</p>
            <p className="mt-1">Passez un bien en statut &quot;Achete&quot; ou &quot;En gestion&quot; pour le voir ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {properties.map((property) => {
              const calcs = calculations.get(property.id);
              const rental = rentalData.get(property.id);
              const predictedYield = calcs?.net_yield ?? 0;
              const actualYield = rental?.actual_net_yield;
              const delta = rental?.yield_delta;

              return (
                <Link
                  key={property.id}
                  href={`/property/${property.id}/rental`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1a1a2e] truncate">
                      {property.address || property.city}
                    </p>
                    <p className="text-sm text-gray-500">
                      {property.city} {property.postal_code ? `(${property.postal_code})` : ""}
                      {" "} | {formatCurrency(getEffectivePrice(property))}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Prevu</p>
                      <p className="font-medium text-gray-700">{predictedYield.toFixed(2)} %</p>
                    </div>

                    {actualYield !== undefined && delta !== undefined ? (
                      <>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Reel</p>
                          <p className={`font-medium ${actualYield >= predictedYield ? "text-green-600" : "text-red-600"}`}>
                            {actualYield.toFixed(2)} %
                          </p>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className="text-xs text-gray-400">Delta</p>
                          <p className={`font-bold ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {delta >= 0 ? "+" : ""}{delta.toFixed(2)} %
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-right min-w-[60px]">
                        <p className="text-xs text-gray-400">Suivi</p>
                        <p className="text-xs text-gray-500">Pas de donnees</p>
                      </div>
                    )}

                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
