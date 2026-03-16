"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReferenceItem, ReferenceItemType, ReferenceCondition } from "@/domains/reference/types";
import {
  adminCreateReferenceItem,
  adminUpdateReferenceItem,
  adminDeleteReferenceItem,
} from "@/domains/admin/actions";

// ─── Column definition ──────────────────────────────────

export interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "readonly";
  options?: { value: string; label: string }[];
  /** Extract value from config JSON for display/edit */
  configKey?: string;
  width?: string;
}

// ─── Props ──────────────────────────────────────────────

interface Props {
  type: ReferenceItemType;
  items: ReferenceItem[];
  conditions?: ReferenceCondition[];
  columns: ColumnDef[];
  categories: { value: string; label: string }[];
  title: string;
  /** Extra fields for the "add" form config JSON */
  defaultConfig?: string;
}

export default function ReferenceItemsTable({
  type,
  items,
  columns,
  categories,
  title,
  defaultConfig = "{}",
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string | number | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ key: "", label: "", icon: "🏠", category: categories[0]?.value || "general" });

  // Parse config from item
  const getConfigValue = (item: ReferenceItem, configKey: string): string | number | null => {
    try {
      const cfg = JSON.parse(item.config);
      return cfg[configKey] ?? null;
    } catch {
      return null;
    }
  };

  const getCellValue = (item: ReferenceItem, col: ColumnDef): string | number | null => {
    if (col.configKey) return getConfigValue(item, col.configKey);
    return (item as unknown as Record<string, unknown>)[col.key] as string | number | null;
  };

  const startEdit = (item: ReferenceItem) => {
    const data: Record<string, string | number | null> = {
      label: item.label,
      icon: item.icon,
      category: item.category,
    };
    // Pre-fill config keys
    for (const col of columns) {
      if (col.configKey) {
        data[`config_${col.configKey}`] = getConfigValue(item, col.configKey);
      }
    }
    setEditing(item.id);
    setEditData(data);
    setError("");
  };

  const cancelEdit = () => { setEditing(null); setEditData({}); };

  const saveEdit = async (id: string, currentItem: ReferenceItem) => {
    setSaving(true);
    setError("");

    // Merge config changes
    let config: string | undefined;
    const configCols = columns.filter((c) => c.configKey);
    if (configCols.length > 0) {
      try {
        const currentCfg = JSON.parse(currentItem.config);
        for (const col of configCols) {
          const val = editData[`config_${col.configKey}`];
          currentCfg[col.configKey!] = val;
        }
        config = JSON.stringify(currentCfg);
      } catch {
        config = currentItem.config;
      }
    }

    const result = await adminUpdateReferenceItem(id, {
      label: editData.label as string | undefined,
      icon: editData.icon as string | undefined,
      category: editData.category as string | undefined,
      config,
    });
    setSaving(false);
    if (result.success) {
      setEditing(null);
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (item: ReferenceItem) => {
    if (item.is_default) return;
    if (!confirm(`Supprimer "${item.label}" ?`)) return;
    const result = await adminDeleteReferenceItem(item.id);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const handleAdd = async () => {
    if (!newItem.key.trim() || !newItem.label.trim()) {
      setError("Clé et label requis");
      return;
    }
    setSaving(true);
    setError("");
    const result = await adminCreateReferenceItem({
      type,
      key: newItem.key,
      label: newItem.label,
      icon: newItem.icon,
      category: newItem.category,
      config: defaultConfig,
    });
    setSaving(false);
    if (result.success) {
      setNewItem({ key: "", label: "", icon: "🏠", category: categories[0]?.value || "general" });
      setShowAdd(false);
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la création");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
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
          <p className="text-sm font-medium text-gray-700 mb-3">Nouvel élément</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input
              placeholder="Clé (snake_case)"
              value={newItem.key}
              onChange={(e) => setNewItem({ ...newItem, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <input
              placeholder="Label"
              value={newItem.label}
              onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
            <input
              placeholder="Emoji"
              value={newItem.icon}
              onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg w-20"
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 font-medium ${col.type === "number" ? "text-right" : ""}`}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const isEditing = editing === item.id;
              return (
                <tr key={item.id} className={`${isEditing ? "bg-amber-50" : "hover:bg-gray-50"} transition-colors`}>
                  {/* Icône */}
                  <td className="px-4 py-2.5 text-center w-16">
                    {isEditing ? (
                      <input
                        value={(editData.icon as string) || ""}
                        onChange={(e) => setEditData({ ...editData, icon: e.target.value })}
                        className="w-12 text-center px-1 py-0.5 border border-gray-300 rounded text-lg"
                      />
                    ) : (
                      <span className="text-lg">{item.icon}</span>
                    )}
                  </td>
                  {/* Clé */}
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{item.key}</td>
                  {/* Label */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        value={(editData.label as string) || ""}
                        onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                        className="w-full px-2 py-0.5 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-gray-900">{item.label}</span>
                    )}
                  </td>
                  {/* Catégorie */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <select
                        value={(editData.category as string) || "general"}
                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                        className="px-2 py-0.5 border border-gray-300 rounded text-sm"
                      >
                        {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {categories.find((c) => c.value === item.category)?.label || item.category}
                      </span>
                    )}
                  </td>
                  {/* Extra columns */}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-2.5 ${col.type === "number" ? "text-right" : ""}`}>
                      {isEditing && col.type !== "readonly" ? (
                        col.type === "select" ? (
                          <select
                            value={(editData[`config_${col.configKey}`] as string) || ""}
                            onChange={(e) => setEditData({ ...editData, [`config_${col.configKey}`]: e.target.value })}
                            className="px-2 py-0.5 border border-gray-300 rounded text-sm"
                          >
                            <option value="">—</option>
                            {col.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : col.type === "number" ? (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={editData[`config_${col.configKey}`] ?? ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              [`config_${col.configKey}`]: e.target.value === "" ? null : parseFloat(e.target.value),
                            })}
                            className="w-24 text-right px-2 py-0.5 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <input
                            value={(editData[`config_${col.configKey}`] as string) || ""}
                            onChange={(e) => setEditData({ ...editData, [`config_${col.configKey}`]: e.target.value })}
                            className="w-full px-2 py-0.5 border border-gray-300 rounded text-sm"
                          />
                        )
                      ) : (
                        <CellDisplay value={getCellValue(item, col)} col={col} />
                      )}
                    </td>
                  ))}
                  {/* Source */}
                  <td className="px-4 py-2.5">
                    {item.is_default ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">défaut</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">custom</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-2.5 text-right">
                    {isEditing ? (
                      <div className="flex gap-1.5 justify-end">
                        <button
                          onClick={() => saveEdit(item.id, item)}
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
                          onClick={() => startEdit(item)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Modifier
                        </button>
                        {!item.is_default && (
                          <button
                            onClick={() => handleDelete(item)}
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
        {items.length} élément{items.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function CellDisplay({ value, col }: { value: string | number | null; col: ColumnDef }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  if (col.type === "number") {
    const num = typeof value === "number" ? value : parseFloat(value as string);
    if (isNaN(num)) return <span className="text-gray-300">—</span>;
    return (
      <span className={num > 0 ? "text-green-700 font-medium" : num < 0 ? "text-red-600 font-medium" : "text-gray-400"}>
        {num > 0 ? "+" : ""}{num}
      </span>
    );
  }
  if (col.type === "select") {
    const label = col.options?.find((o) => o.value === value)?.label;
    return <span className="text-gray-700">{label || value}</span>;
  }
  return <span className="text-gray-700">{String(value)}</span>;
}
