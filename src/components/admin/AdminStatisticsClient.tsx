"use client";

import { useState, useEffect } from "react";
import { adminGetStatistics, type AdminStats } from "@/domains/admin/actions";

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminStatisticsClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStatistics()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-red-600 py-8">Erreur lors du chargement des statistiques.</p>;
  }

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Inscrits" value={stats.usersTotal} />
        <StatCard label="Nouveaux (7j)" value={stats.usersThisWeek} />
        <StatCard label="Nouveaux (30j)" value={stats.usersThisMonth} />
        <StatCard label="Biens" value={stats.propertiesTotal} />
        <StatCard label="Localités" value={stats.localitiesTotal} />
        <StatCard label="Guides ville" value={stats.guidesVille} />
        <StatCard label="Guides quartier" value={stats.guidesQuartier} />
        <StatCard label="Articles total" value={stats.articlesTotal} />
      </div>

      {/* Recent users table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Derniers inscrits</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentUsers.map((u, i) => (
                  <tr key={u.email + i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2.5 text-gray-700">{u.name || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
                {stats.recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      Aucun inscrit
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
