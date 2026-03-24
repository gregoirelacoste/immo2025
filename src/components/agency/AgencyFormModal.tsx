"use client";

import { useState } from "react";
import { Agency, AgencyFormData } from "@/domains/agency/types";

interface Props {
  agency: Agency | null;
  onSave: (data: AgencyFormData) => Promise<void>;
  onClose: () => void;
}

export default function AgencyFormModal({ agency, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AgencyFormData>({
    name: agency?.name ?? "",
    city: agency?.city ?? "",
    postal_code: agency?.postal_code ?? "",
    address: agency?.address ?? "",
    phone: agency?.phone ?? "",
    email: agency?.email ?? "",
    website: agency?.website ?? "",
    management_fee_rate: agency?.management_fee_rate ?? 7,
    source: agency?.source ?? "manual",
    google_rating: agency?.google_rating ?? null,
    google_reviews_count: agency?.google_reviews_count ?? null,
    description: agency?.description ?? "",
    image_url: agency?.image_url ?? "",
    user_id: agency?.user_id ?? "",
  });

  function update<K extends keyof AgencyFormData>(key: K, value: AgencyFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {agency ? "Modifier l'agence" : "Nouvelle agence"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l&apos;agence *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ex: Century 21 Toulouse"
              className={inputClass}
              required
            />
          </div>

          {/* City + Postal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ville *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Toulouse"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code postal</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
                placeholder="31000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="12 rue de la Gare"
              className={inputClass}
            />
          </div>

          {/* Management Fee */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Frais de gestion (% du loyer mensuel)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={form.management_fee_rate}
                onChange={(e) => update("management_fee_rate", parseFloat(e.target.value) || 0)}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-gray-500">% (typiquement 5-10%)</span>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telephone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="05 61 00 00 00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="contact@agence.fr"
                className={inputClass}
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Site web</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://www.agence.fr"
              className={inputClass}
            />
          </div>

          {/* Google Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note Google</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={form.google_rating ?? ""}
                onChange={(e) => update("google_rating", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="4.2"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre d&apos;avis</label>
              <input
                type="number"
                min="0"
                value={form.google_reviews_count ?? ""}
                onChange={(e) => update("google_reviews_count", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="45"
                className={inputClass}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.city.trim()}
            className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : agency ? "Mettre a jour" : "Ajouter l'agence"}
          </button>
        </form>
      </div>
    </div>
  );
}
