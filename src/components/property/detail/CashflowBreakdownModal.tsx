"use client";

import { Property, PropertyCalculations } from "@/domains/property/types";
import { formatCurrency } from "@/lib/calculations";
import type { Simulation } from "@/domains/simulation/types";

interface Props {
  open: boolean;
  onClose: () => void;
  property: Property;
  simulation: Simulation;
  calcs: PropertyCalculations;
}

interface LineItem {
  label: string;
  value: number;
  param?: string; // explication du paramètre source
  positive?: boolean; // true = recette, false = dépense
  bold?: boolean;
}

export default function CashflowBreakdownModal({ open, onClose, property, simulation, calcs }: Props) {
  if (!open) return null;

  const { cashflowBreakdown: cf, chargesBreakdown: ch } = calcs;
  const vacancyRate = simulation.vacancy_rate ?? property.vacancy_rate ?? 5;

  const sections: { title: string; items: LineItem[]; subtotal?: LineItem }[] = [
    {
      title: "Revenus locatifs",
      items: [
        {
          label: "Loyer mensuel brut",
          value: cf.grossMonthlyRent,
          param: `${formatCurrency(cf.grossMonthlyRent)}/mois`,
          positive: true,
        },
        {
          label: "Vacance locative",
          value: -cf.vacancyCost,
          param: `${vacancyRate}% du loyer`,
        },
      ],
      subtotal: {
        label: "Revenu net mensuel",
        value: cf.netMonthlyRent,
        bold: true,
        positive: true,
      },
    },
    {
      title: "Financement",
      items: [
        {
          label: "Mensualité crédit",
          value: -calcs.monthly_payment,
          param: `${formatCurrency(calcs.total_project_cost - calcs.total_notary_fees)} à ${simulation.interest_rate}% sur ${simulation.loan_duration} ans`,
        },
        {
          label: "Assurance emprunteur",
          value: -calcs.monthly_insurance,
          param: `${simulation.insurance_rate}% du capital`,
        },
      ],
    },
    {
      title: "Charges d'exploitation",
      items: [
        ...(ch.condo > 0
          ? [{
              label: "Charges de copropriété",
              value: -ch.condo / 12,
              param: `${formatCurrency(ch.condo)}/an`,
            }]
          : []),
        ...(ch.propertyTax > 0
          ? [{
              label: "Taxe foncière",
              value: -ch.propertyTax / 12,
              param: `${formatCurrency(ch.propertyTax)}/an`,
            }]
          : []),
        ...(ch.pnoInsurance > 0
          ? [{
              label: "Assurance PNO",
              value: -ch.pnoInsurance / 12,
              param: `${formatCurrency(ch.pnoInsurance)}/an`,
            }]
          : []),
        ...(ch.maintenance > 0
          ? [{
              label: "Provision entretien",
              value: -ch.maintenance / 12,
              param: `${simulation.maintenance_per_m2} €/m²/an × ${property.surface} m²`,
            }]
          : []),
        ...(ch.gliCost > 0
          ? [{
              label: "Garantie loyers impayés (GLI)",
              value: -ch.gliCost / 12,
              param: `${simulation.gli_rate}% du loyer net`,
            }]
          : []),
        ...(ch.managementCost > 0
          ? [{
              label: "Gestion agence",
              value: -ch.managementCost / 12,
              param: `${property.management_fee_rate}% du loyer`,
            }]
          : []),
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl md:rounded-t-2xl border-b border-gray-100 px-4 md:px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1a1a2e]">Détail du cash-flow</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 md:px-6 py-4 space-y-5">
          {/* Result banner */}
          <div className={`rounded-xl p-4 text-center ${
            calcs.monthly_cashflow >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}>
            <p className="text-xs text-gray-500 mb-1">Cash-flow mensuel net</p>
            <p className={`text-3xl font-extrabold font-[family-name:var(--font-mono)] ${
              calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
            }`}>
              {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}€
            </p>
            <p className="text-xs text-gray-400 mt-1">
              soit {formatCurrency(calcs.monthly_cashflow * 12)}/an
            </p>
          </div>

          {/* Breakdown sections */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">{section.title}</h4>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                {section.items.map((item, i) => (
                  <div key={i} className="px-3 py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700">{item.label}</p>
                      {item.param && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.param}</p>
                      )}
                    </div>
                    <span className={`text-sm font-semibold font-[family-name:var(--font-mono)] shrink-0 ${
                      item.value > 0 ? "text-green-600" : item.value < 0 ? "text-red-600" : "text-gray-400"
                    }`}>
                      {item.value > 0 ? "+" : ""}{Math.round(item.value)}{"\u202f"}€
                    </span>
                  </div>
                ))}
                {section.subtotal && (
                  <div className="px-3 py-2.5 flex items-center justify-between bg-gray-100/60">
                    <span className="text-sm font-semibold text-gray-800">{section.subtotal.label}</span>
                    <span className={`text-sm font-bold font-[family-name:var(--font-mono)] ${
                      section.subtotal.value >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {section.subtotal.value > 0 ? "+" : ""}{Math.round(section.subtotal.value)}{"\u202f"}€
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Final summary */}
          <div className="border-t-2 border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Récapitulatif mensuel</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Revenu net (après vacance)</span>
                <span className="font-semibold text-green-600 font-[family-name:var(--font-mono)]">
                  +{Math.round(cf.netMonthlyRent)}{"\u202f"}€
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Financement (crédit + assurance)</span>
                <span className="font-semibold text-red-600 font-[family-name:var(--font-mono)]">
                  -{Math.round(cf.monthlyFinancing)}{"\u202f"}€
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Charges d&apos;exploitation</span>
                <span className="font-semibold text-red-600 font-[family-name:var(--font-mono)]">
                  -{Math.round(cf.monthlyCharges)}{"\u202f"}€
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-bold text-[#1a1a2e]">Cash-flow net</span>
                <span className={`font-bold font-[family-name:var(--font-mono)] ${
                  calcs.monthly_cashflow >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  = {calcs.monthly_cashflow > 0 ? "+" : ""}{Math.round(calcs.monthly_cashflow)}{"\u202f"}€
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
