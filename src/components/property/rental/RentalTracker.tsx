"use client";

import { useState } from "react";
import { RentalEntry, RentalSummary } from "@/domains/rental/types";
import { PropertyCalculations } from "@/domains/property/types";
import { saveRentalEntry, deleteRentalEntryAction } from "@/domains/rental/actions";
import { formatCurrency } from "@/lib/calculations";

interface Props {
  propertyId: string;
  entries: RentalEntry[];
  summary: RentalSummary | null;
  calcs: PropertyCalculations;
}

export default function RentalTracker({ propertyId, entries, summary, calcs }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [rentReceived, setRentReceived] = useState("");
  const [chargesPaid, setChargesPaid] = useState("");
  const [vacancyDays, setVacancyDays] = useState("0");
  const [notes, setNotes] = useState("");

  async function handleSubmit() {
    setSaving(true);
    await saveRentalEntry(propertyId, {
      month,
      rent_received: Number(rentReceived) || 0,
      charges_paid: Number(chargesPaid) || 0,
      vacancy_days: Number(vacancyDays) || 0,
      notes,
    });
    setSaving(false);
    setShowForm(false);
    setRentReceived("");
    setChargesPaid("");
    setVacancyDays("0");
    setNotes("");
  }

  async function handleDelete(entryId: string) {
    if (!confirm("Supprimer cette entree ?")) return;
    setDeleting(entryId);
    await deleteRentalEntryAction(entryId, propertyId);
    setDeleting(null);
  }

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm min-h-[44px]";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Revenus totaux</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.total_rent_received)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Charges totales</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(summary.total_charges_paid)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Rendement reel</p>
            <p className={`text-lg font-bold ${summary.yield_delta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.actual_net_yield.toFixed(2)} %
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">vs Previsionnel</p>
            <p className={`text-lg font-bold ${summary.yield_delta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {summary.yield_delta >= 0 ? "+" : ""}{summary.yield_delta.toFixed(2)} %
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Prevu: {summary.predicted_net_yield.toFixed(2)} %
            </p>
          </div>
        </div>
      )}

      {/* Predicted yield from calculations (always shown) */}
      {!summary && (
        <div className="bg-indigo-50 rounded-xl p-4">
          <p className="text-sm text-indigo-700">
            Rendement net previsionnel: <strong>{calcs.net_yield.toFixed(2)} %</strong> |
            Cash-flow mensuel: <strong>{formatCurrency(calcs.monthly_cashflow)}</strong>
          </p>
          <p className="text-xs text-indigo-500 mt-1">
            Ajoutez vos premieres donnees de suivi pour comparer avec le previsionnel.
          </p>
        </div>
      )}

      {/* Add entry button + form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Suivi mensuel</h2>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]"
          >
            {showForm ? "Annuler" : "+ Ajouter un mois"}
          </button>
        </div>

        {showForm && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
                <input
                  type="month"
                  className={inputClass}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loyer percu (EUR)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass}
                  placeholder="850"
                  value={rentReceived}
                  onChange={(e) => setRentReceived(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charges payees (EUR)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputClass}
                  placeholder="150"
                  value={chargesPaid}
                  onChange={(e) => setChargesPaid(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jours de vacance</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="31"
                  className={inputClass}
                  value={vacancyDays}
                  onChange={(e) => setVacancyDays(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Reparation plomberie, changement locataire..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !month}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}

        {/* Entries table */}
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            Aucune donnee de suivi. Cliquez sur &quot;Ajouter un mois&quot; pour commencer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-600">Mois</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Loyer</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Charges</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-600">Net</th>
                  <th className="text-center py-2 px-2 font-medium text-gray-600">Vacance</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-600 hidden md:table-cell">Notes</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const net = entry.rent_received - entry.charges_paid;
                  return (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium">{formatMonth(entry.month)}</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(entry.rent_received)}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{formatCurrency(entry.charges_paid)}</td>
                      <td className={`py-2 px-2 text-right font-medium ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(net)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {entry.vacancy_days > 0 ? (
                          <span className="text-amber-600">{entry.vacancy_days}j</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-gray-500 hidden md:table-cell max-w-48 truncate">
                        {entry.notes}
                      </td>
                      <td className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleting === entry.id}
                          className="text-red-400 hover:text-red-600 text-xs min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title="Supprimer"
                        >
                          {deleting === entry.id ? "..." : "\u2717"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatMonth(month: string): string {
  try {
    const [year, m] = month.split("-");
    const months = [
      "Janv", "Fev", "Mars", "Avr", "Mai", "Juin",
      "Juil", "Aout", "Sept", "Oct", "Nov", "Dec",
    ];
    return `${months[Number(m) - 1]} ${year}`;
  } catch {
    return month;
  }
}
