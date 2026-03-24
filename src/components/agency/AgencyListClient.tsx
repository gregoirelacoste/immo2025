"use client";

import { useState } from "react";
import { Agency } from "@/domains/agency/types";
import AgencyCard from "./AgencyCard";
import AgencyFormModal from "./AgencyFormModal";
import { saveAgencyAction, deleteAgencyAction, updateAgencyAction, scrapeAgenciesAction } from "@/domains/agency/actions";
import { AgencyFormData } from "@/domains/agency/types";

interface Props {
  agencies: Agency[];
  cities: Array<{ city: string; count: number }>;
}

export default function AgencyListClient({ agencies: initialAgencies, cities }: Props) {
  const [agencies, setAgencies] = useState(initialAgencies);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [scrapeCity, setScrapeCity] = useState("");
  const [scraping, setScraping] = useState(false);

  const filtered = agencies.filter((a) => {
    const matchCity = !selectedCity || a.city.toLowerCase() === selectedCity.toLowerCase();
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.city.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  async function handleSave(data: AgencyFormData) {
    if (editingAgency) {
      const result = await updateAgencyAction(editingAgency.id, data);
      if (result.error) return alert(result.error);
      setAgencies((prev) =>
        prev.map((a) => (a.id === editingAgency.id ? { ...a, ...data, updated_at: new Date().toISOString() } : a))
      );
    } else {
      const result = await saveAgencyAction(data);
      if (result.error) return alert(result.error);
      if (result.id) {
        const newAgency: Agency = {
          ...data,
          id: result.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setAgencies((prev) => [newAgency, ...prev]);
      }
    }
    setShowForm(false);
    setEditingAgency(null);
  }

  async function handleScrape() {
    if (!scrapeCity.trim()) return;
    setScraping(true);
    try {
      const result = await scrapeAgenciesAction(scrapeCity.trim());
      if (result.error) {
        alert(`Erreur: ${result.error}`);
      } else if (result.added === 0) {
        alert("Aucune nouvelle agence trouvee.");
      } else {
        alert(`${result.added} agence(s) ajoutee(s) !`);
        // Reload to get fresh data
        window.location.reload();
      }
    } finally {
      setScraping(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette agence ?")) return;
    const result = await deleteAgencyAction(id);
    if (result.error) return alert(result.error);
    setAgencies((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      {/* Scrape section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-amber-800 mb-2">Scraper les agences d&apos;une ville</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: Toulouse, Lyon, Bordeaux..."
            value={scrapeCity}
            onChange={(e) => setScrapeCity(e.target.value)}
            className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            onKeyDown={(e) => e.key === "Enter" && handleScrape()}
          />
          <button
            onClick={handleScrape}
            disabled={scraping || !scrapeCity.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {scraping ? "Recherche..." : "Scraper"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher une agence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          <option value="">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city} ({c.count})
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setEditingAgency(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
        >
          + Ajouter
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Aucune agence</p>
          <p className="text-sm mt-1">
            Ajoutez des agences manuellement ou lancez un scraping par ville.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((agency) => (
            <AgencyCard
              key={agency.id}
              agency={agency}
              onEdit={() => {
                setEditingAgency(agency);
                setShowForm(true);
              }}
              onDelete={() => handleDelete(agency.id)}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <AgencyFormModal
          agency={editingAgency}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingAgency(null);
          }}
        />
      )}
    </>
  );
}
