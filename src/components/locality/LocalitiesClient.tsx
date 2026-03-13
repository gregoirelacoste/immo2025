"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locality, LocalityData, LOCALITY_TYPES, LocalityType } from "@/domains/locality/types";
import { addLocality, removeLocality, importLocalityData, removeLocalityData } from "@/domains/locality/actions";
import Alert from "@/components/ui/Alert";

const TYPE_LABELS: Record<LocalityType, string> = {
  pays: "Pays",
  region: "Région",
  departement: "Département",
  canton: "Canton",
  ville: "Ville",
  quartier: "Quartier",
  rue: "Rue",
};

interface Props {
  localities: Locality[];
  dataMap: Record<string, LocalityData[]>;
}

export default function LocalitiesClient({ localities, dataMap }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedLocality, setExpandedLocality] = useState<string | null>(null);
  const [showDataImport, setShowDataImport] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Build tree
  const roots = localities.filter((l) => !l.parent_id);
  const childrenOf = (parentId: string) => localities.filter((l) => l.parent_id === parentId);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Add locality button */}
      <button
        onClick={() => { setShowAddForm(!showAddForm); clearMessages(); }}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        {showAddForm ? "Annuler" : "+ Ajouter une localité"}
      </button>

      {showAddForm && (
        <AddLocalityForm
          localities={localities}
          onSuccess={(msg) => {
            setSuccess(msg);
            setShowAddForm(false);
            router.refresh();
          }}
          onError={setError}
        />
      )}

      {/* Tree view */}
      {roots.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          Aucune localité. Commencez par ajouter un pays ou une région.
        </p>
      ) : (
        <div className="space-y-2">
          {roots.map((loc) => (
            <LocalityNode
              key={loc.id}
              locality={loc}
              childrenOf={childrenOf}
              dataMap={dataMap}
              depth={0}
              expandedLocality={expandedLocality}
              setExpandedLocality={setExpandedLocality}
              showDataImport={showDataImport}
              setShowDataImport={setShowDataImport}
              onDelete={async (id) => {
                clearMessages();
                const r = await removeLocality(id);
                if (r.success) { setSuccess("Localité supprimée."); router.refresh(); }
                else setError(r.error || "Erreur");
              }}
              onDataImported={() => { setSuccess("Données importées."); router.refresh(); }}
              onDataDeleted={() => { setSuccess("Snapshot supprimé."); router.refresh(); }}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Locality Form ───

function AddLocalityForm({
  localities,
  onSuccess,
  onError,
}: {
  localities: Locality[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("ville");
  const [parentId, setParentId] = useState<string>("");
  const [code, setCode] = useState("");
  const [postalCodes, setPostalCodes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const postalCodesArr = postalCodes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await addLocality({
      name,
      type,
      parent_id: parentId || null,
      code,
      postal_codes: postalCodesArr,
    });

    setSaving(false);
    if (result.success) {
      onSuccess(`Localité "${name}" créée.`);
    } else {
      onError(result.error || "Erreur");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="ex: Albi"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {LOCALITY_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Parent</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Aucun (racine)</option>
            {localities.map((l) => (
              <option key={l.id} value={l.id}>
                {TYPE_LABELS[l.type]} — {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Code INSEE</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="ex: 81004"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Codes postaux (séparés par virgule)</label>
          <input
            type="text"
            value={postalCodes}
            onChange={(e) => setPostalCodes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="ex: 81000, 81100"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Création..." : "Créer"}
      </button>
    </form>
  );
}

// ─── Locality Tree Node ───

function LocalityNode({
  locality,
  childrenOf,
  dataMap,
  depth,
  expandedLocality,
  setExpandedLocality,
  showDataImport,
  setShowDataImport,
  onDelete,
  onDataImported,
  onDataDeleted,
  onError,
}: {
  locality: Locality;
  childrenOf: (id: string) => Locality[];
  dataMap: Record<string, LocalityData[]>;
  depth: number;
  expandedLocality: string | null;
  setExpandedLocality: (id: string | null) => void;
  showDataImport: string | null;
  setShowDataImport: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDataImported: () => void;
  onDataDeleted: () => void;
  onError: (msg: string) => void;
}) {
  const children = childrenOf(locality.id);
  const snapshots = dataMap[locality.id] || [];
  const isExpanded = expandedLocality === locality.id;
  const postalCodes: string[] = (() => {
    try { return JSON.parse(locality.postal_codes || "[]"); } catch { return []; }
  })();

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
              {TYPE_LABELS[locality.type]}
            </span>
            <span className="font-medium text-gray-900 text-sm truncate">{locality.name}</span>
            {locality.code && (
              <span className="text-xs text-gray-400">{locality.code}</span>
            )}
            {postalCodes.length > 0 && (
              <span className="text-xs text-gray-400">({postalCodes.join(", ")})</span>
            )}
            <span className="text-xs text-gray-400">
              {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpandedLocality(isExpanded ? null : locality.id)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            >
              {isExpanded ? "Fermer" : "Détails"}
            </button>
            <button
              onClick={() => setShowDataImport(showDataImport === locality.id ? null : locality.id)}
              className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded font-medium"
            >
              + Données
            </button>
            <button
              onClick={() => {
                if (confirm(`Supprimer "${locality.name}" et toutes ses données ?`)) {
                  onDelete(locality.id);
                }
              }}
              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
            >
              Suppr.
            </button>
          </div>
        </div>

        {/* Data import form */}
        {showDataImport === locality.id && (
          <DataImportForm
            localityId={locality.id}
            onSuccess={onDataImported}
            onError={onError}
          />
        )}

        {/* Expanded: show snapshots */}
        {isExpanded && (
          <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
            {snapshots.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune donnée importée.</p>
            ) : (
              snapshots.map((snap) => (
                <SnapshotRow
                  key={snap.id}
                  snapshot={snap}
                  onDelete={async () => {
                    const r = await removeLocalityData(snap.id);
                    if (r.success) onDataDeleted();
                    else onError(r.error || "Erreur");
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="mt-1 space-y-1">
          {children.map((child) => (
            <LocalityNode
              key={child.id}
              locality={child}
              childrenOf={childrenOf}
              dataMap={dataMap}
              depth={depth + 1}
              expandedLocality={expandedLocality}
              setExpandedLocality={setExpandedLocality}
              showDataImport={showDataImport}
              setShowDataImport={setShowDataImport}
              onDelete={onDelete}
              onDataImported={onDataImported}
              onDataDeleted={onDataDeleted}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Data Import Form ───

const EXAMPLE_JSON = `{
  "avg_purchase_price_per_m2": 2500,
  "median_purchase_price_per_m2": 2300,
  "avg_rent_per_m2": 10.5,
  "vacancy_rate": 7,
  "avg_condo_charges_per_m2": 2.5,
  "avg_property_tax_per_m2": 12,
  "population": 50000,
  "median_income": 21000,
  "unemployment_rate": 9.5
}`;

function DataImportForm({
  localityId,
  onSuccess,
  onError,
}: {
  localityId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await importLocalityData(localityId, validFrom, jsonText);
    setSaving(false);

    if (result.success) {
      setJsonText("");
      onSuccess();
    } else {
      onError(result.error || "Erreur");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Date de validité</label>
        <input
          type="date"
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
          required
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Données JSON
          <button
            type="button"
            onClick={() => setJsonText(EXAMPLE_JSON)}
            className="ml-2 text-indigo-600 hover:underline"
          >
            Insérer exemple
          </button>
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          required
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={EXAMPLE_JSON}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Import..." : "Importer"}
      </button>
    </form>
  );
}

// ─── Snapshot Row ───

function SnapshotRow({
  snapshot,
  onDelete,
}: {
  snapshot: LocalityData;
  onDelete: () => void;
}) {
  const [showData, setShowData] = useState(false);
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(snapshot.data); } catch { /* */ }
  const fieldCount = Object.keys(data).length;

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-gray-700">{snapshot.valid_from}</span>
          {snapshot.valid_to && <span className="text-gray-400">→ {snapshot.valid_to}</span>}
          <span className="text-gray-400">{fieldCount} champs</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowData(!showData)}
            className="px-2 py-0.5 text-xs text-gray-600 hover:text-indigo-600 rounded"
          >
            {showData ? "Masquer" : "Voir"}
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded"
          >
            Suppr.
          </button>
        </div>
      </div>
      {showData && (
        <pre className="mt-2 text-xs text-gray-600 bg-white rounded p-2 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
