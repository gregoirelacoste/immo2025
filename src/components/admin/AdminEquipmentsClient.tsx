"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Equipment } from "@/domains/property/equipment-service";
import { adminUpdateEquipment, adminDeleteEquipment, adminCreateEquipment } from "@/domains/admin/actions";

const CATEGORIES = [
  { value: "exterieur", label: "Extérieur" },
  { value: "securite", label: "Sécurité" },
  { value: "confort", label: "Confort" },
  { value: "technique", label: "Technique" },
  { value: "general", label: "Autres" },
];

interface Props {
  equipments: Equipment[];
}

export default function AdminEquipmentsClient({ equipments }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Equipment>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEq, setNewEq] = useState({ key: "", label: "", icon: "🏠", category: "general" });

  const startEdit = (eq: Equipment) => {
    setEditing(eq.id);
    setEditData({
      label: eq.label,
      icon: eq.icon,
      category: eq.category,
      value_impact_per_sqm: eq.value_impact_per_sqm,
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditData({});
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    setError("");
    const result = await adminUpdateEquipment(id, {
      label: editData.label,
      icon: editData.icon,
      category: editData.category,
      value_impact_per_sqm: editData.value_impact_per_sqm ?? null,
    });
    setSaving(false);
    if (result.success) {
      setEditing(null);
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (eq: Equipment) => {
    if (eq.is_default) return;
    if (!confirm(`Supprimer l'équipement "${eq.label}" ?`)) return;
    const result = await adminDeleteEquipment(eq.id);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const handleAdd = async () => {
    if (!newEq.key.trim() || !newEq.label.trim()) {
      setError("Clé et label requis");
      return;
    }
    setSaving(true);
    setError("");
    const result = await adminCreateEquipment(newEq);
    setSaving(false);
    if (result.success) {
      setNewEq({ key: "", label: "", icon: "🏠", category: "general" });
      setShowAdd(false);
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la création");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Equipements</h2>
        <button
          onClick={() => { setShowAdd(!showAdd); setError(""); }}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          {showAdd ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {showAdd && (
        <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-gray-700 mb-3">Nouvel équipement</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input
              placeholder="Clé (snake_case)"
              value={newEq.key}
              onChange={(e) => setNewEq({ ...newEq, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <input
              placeholder="Label"
              value={newEq.label}
              onChange={(e) => setNewEq({ ...newEq, label: e.target.value })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <input
              placeholder="Emoji"
              value={newEq.icon}
              onChange={(e) => setNewEq({ ...newEq, icon: e.target.value })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg w-20"
            />
            <select
              value={newEq.category}
              onChange={(e) => setNewEq({ ...newEq, category: e.target.value })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "..." : "Créer"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Icône</th>
              <th className="px-4 py-3 font-medium">Clé</th>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium text-right">Impact €/m²</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {equipments.map((eq) => {
              const isEditing = editing === eq.id;
              return (
                <tr key={eq.id} className={`${isEditing ? "bg-amber-50" : "hover:bg-gray-50"} transition-colors`}>
                  {/* Icône */}
                  <td className="px-4 py-2.5 text-center w-16">
                    {isEditing ? (
                      <input
                        value={editData.icon || ""}
                        onChange={(e) => setEditData({ ...editData, icon: e.target.value })}
                        className="w-12 text-center px-1 py-0.5 border border-gray-300 rounded text-lg"
                      />
                    ) : (
                      <span className="text-lg">{eq.icon}</span>
                    )}
                  </td>
                  {/* Clé */}
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{eq.key}</td>
                  {/* Label */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        value={editData.label || ""}
                        onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                        className="w-full px-2 py-0.5 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-gray-900">{eq.label}</span>
                    )}
                  </td>
                  {/* Catégorie */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <select
                        value={editData.category || "general"}
                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                        className="px-2 py-0.5 border border-gray-300 rounded text-sm"
                      >
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {CATEGORIES.find((c) => c.value === eq.category)?.label || eq.category}
                      </span>
                    )}
                  </td>
                  {/* Impact €/m² */}
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={editData.value_impact_per_sqm ?? ""}
                        onChange={(e) => setEditData({
                          ...editData,
                          value_impact_per_sqm: e.target.value === "" ? null : parseFloat(e.target.value),
                        })}
                        className="w-24 text-right px-2 py-0.5 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className={eq.value_impact_per_sqm != null ? (eq.value_impact_per_sqm > 0 ? "text-green-700 font-medium" : eq.value_impact_per_sqm < 0 ? "text-red-600 font-medium" : "text-gray-400") : "text-gray-300"}>
                        {eq.value_impact_per_sqm != null ? `${eq.value_impact_per_sqm > 0 ? "+" : ""}${eq.value_impact_per_sqm} €` : "—"}
                      </span>
                    )}
                  </td>
                  {/* Source */}
                  <td className="px-4 py-2.5">
                    {eq.is_default ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">défaut</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">IA</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => saveEdit(eq.id)}
                          disabled={saving}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {saving ? "..." : "Sauver"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => startEdit(eq)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Modifier
                        </button>
                        {!eq.is_default && (
                          <button
                            onClick={() => handleDelete(eq)}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {equipments.length} équipement{equipments.length > 1 ? "s" : ""} • Impact €/m² : valeur ajoutée ou retirée au prix au m² du bien
      </p>
    </div>
  );
}
