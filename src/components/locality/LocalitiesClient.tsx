"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Locality, LocalityDataSnapshot, LocalityTableName } from "@/domains/locality/types";
import { addLocality, removeLocality, importLocalityData, removeLocalityData, enrichLocalityAction, fetchSnapshotFields } from "@/domains/locality/actions";
import Alert from "@/components/ui/Alert";

const TYPE_LABELS: Record<string, string> = {
  pays: "Pays",
  region: "Région",
  departement: "Département",
  canton: "Canton",
  ville: "Ville",
  quartier: "Quartier",
  rue: "Rue",
};

const TABLE_LABELS: Record<LocalityTableName, string> = {
  locality_prices: "Prix",
  locality_rental: "Locatif",
  locality_charges: "Charges",
  locality_airbnb: "Airbnb",
  locality_socio: "Socio",
  locality_infra: "Infra",
  locality_risks: "Risques",
  locality_energy: "Énergie",
};

interface Props {
  localities: Locality[];
  dataMap: Record<string, LocalityDataSnapshot[]>;
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
        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
      >
        {showAddForm ? "Annuler" : "+ Ajouter une localité"}
      </button>

      {showAddForm && (
        <AddLocalityForm
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

// ─── Add Locality Form (JSON import) ───

const ADD_LOCALITY_EXAMPLE = `{
  "name": "Albi",
  "type": "ville",
  "code": "81004",
  "postal_codes": ["81000"],
  "parent_id": null,
  "data": {
    "valid_from": "2025-01-01",
    "fields": {
      "avg_purchase_price_per_m2": 2500,
      "median_purchase_price_per_m2": 2300,
      "transaction_count": 450,
      "price_trend_pct": -1.2,
      "avg_rent_per_m2": 10.5,
      "avg_rent_furnished_per_m2": 13,
      "vacancy_rate": 7,
      "typical_cashflow_per_m2": -2.5,
      "rent_elasticity_alpha": 0.72,
      "rent_reference_surface": 45,
      "avg_condo_charges_per_m2": 2.5,
      "avg_property_tax_per_m2": 12,
      "avg_airbnb_night_price": 65,
      "avg_airbnb_occupancy_rate": 55,
      "population": 50000,
      "population_growth_pct": 0.3,
      "median_income": 21000,
      "poverty_rate": 15,
      "unemployment_rate": 9.5,
      "school_count": 35,
      "university_nearby": true,
      "public_transport_score": 6,
      "risk_level": "faible",
      "natural_risks": [{"type": "inondation", "level": "moyen"}]
    }
  }
}`;

function buildPrompt(sector: string) {
  return `Tu es un expert en analyse immobilière en France. Analyse le secteur suivant : "${sector}".

Recherche les données les plus récentes disponibles et retourne un JSON strictement conforme au format ci-dessous. Tous les champs "fields" sont optionnels — remplis ceux pour lesquels tu as des données fiables, mets null pour les autres.

Format JSON attendu :
\`\`\`json
{
  "name": "${sector}",
  "type": "ville",
  "code": "<code INSEE si connu>",
  "postal_codes": ["<code postal>"],
  "parent_id": null,
  "data": {
    "valid_from": "${new Date().toISOString().split("T")[0]}",
    "fields": {
      "avg_purchase_price_per_m2": <number|null>,
      "median_purchase_price_per_m2": <number|null>,
      "transaction_count": <number|null>,
      "price_trend_pct": <number en % annuel, peut être négatif|null>,
      "avg_rent_per_m2": <number|null>,
      "avg_rent_furnished_per_m2": <number|null>,
      "vacancy_rate": <number en %|null>,
      "typical_cashflow_per_m2": <number €/m²/mois, négatif si marché tendu|null>,
      "rent_elasticity_alpha": <number 0.6-0.8, exposant dégressivité loyer/surface|null>,
      "rent_reference_surface": <number m², surface de référence du loyer moyen|null>,
      "avg_condo_charges_per_m2": <number|null>,
      "avg_property_tax_per_m2": <number|null>,
      "avg_airbnb_night_price": <number|null>,
      "avg_airbnb_occupancy_rate": <number en %|null>,
      "population": <number|null>,
      "population_growth_pct": <number en %|null>,
      "median_income": <number annuel|null>,
      "poverty_rate": <number en %|null>,
      "unemployment_rate": <number en %|null>,
      "school_count": <number|null>,
      "university_nearby": <boolean|null>,
      "public_transport_score": <1-10|null>,
      "risk_level": <"faible"|"moyen"|"élevé"|null>,
      "natural_risks": [{"type": "<type de risque>", "level": "<faible|moyen|élevé>"}]
    }
  }
}
\`\`\`

IMPORTANT :
- Retourne UNIQUEMENT le JSON, sans texte avant ni après.
- "type" peut être : pays, region, departement, canton, ville, quartier, rue.
- Adapte le "type" en fonction du secteur demandé.
- Sources possibles : DVF, INSEE, observatoires des loyers, AirDNA, Georisques.`;
}

function AddLocalityForm({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [saving, setSaving] = useState(false);
  const [sector, setSector] = useState("");
  const [copied, setCopied] = useState<"example" | "prompt" | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const parsed = JSON.parse(jsonText);
      const { name, type, code, postal_codes, parent_id, data } = parsed;

      if (!name || !type) {
        onError("Le JSON doit contenir au minimum 'name' et 'type'.");
        setSaving(false);
        return;
      }

      // Create locality
      const result = await addLocality({
        name,
        type,
        parent_id: parent_id || null,
        code: code || "",
        postal_codes: postal_codes || [],
      });

      if (!result.success) {
        onError(result.error || "Erreur lors de la création");
        setSaving(false);
        return;
      }

      // If data is provided, import it into thematic tables
      if (data?.fields && result.id) {
        const dataResult = await importLocalityData(
          result.id,
          data.valid_from || new Date().toISOString().split("T")[0],
          JSON.stringify(data.fields)
        );
        if (!dataResult.success) {
          onError(`Localité créée mais erreur données : ${dataResult.error}`);
          setSaving(false);
          return;
        }
      }

      onSuccess(`Localité "${name}" créée${data?.fields ? " avec données" : ""}.`);
    } catch {
      onError("JSON invalide. Vérifiez le format.");
    }

    setSaving(false);
  }

  function handleCopy(text: string, type: "example" | "prompt") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-tiili-border p-4 space-y-4">
      {/* Prompt generator */}
      <div className="bg-amber-50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-amber-800">
          Générer les données via IA (Gemini, ChatGPT...)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="ex: Albi, Toulouse centre, Tarn..."
            className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          />
          <button
            type="button"
            disabled={!sector.trim()}
            onClick={() => handleCopy(buildPrompt(sector.trim()), "prompt")}
            className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
          >
            {copied === "prompt" ? "Copié !" : "Copier le prompt"}
          </button>
        </div>
        <p className="text-xs text-amber-600">
          Copiez le prompt, collez-le dans Gemini/ChatGPT, puis collez le résultat JSON ci-dessous.
        </p>
      </div>

      {/* JSON input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Coller le JSON ici</label>
            <button
              type="button"
              onClick={() => handleCopy(ADD_LOCALITY_EXAMPLE, "example")}
              className="text-xs text-amber-600 hover:underline"
            >
              {copied === "example" ? "Copié !" : "Copier l'exemple"}
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            required
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder={ADD_LOCALITY_EXAMPLE}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Import..." : "Importer"}
        </button>
      </form>
    </div>
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
  dataMap: Record<string, LocalityDataSnapshot[]>;
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
  const router = useRouter();
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const children = childrenOf(locality.id);
  const snapshots = dataMap[locality.id] || [];
  const isExpanded = expandedLocality === locality.id;
  const postalCodes: string[] = (() => {
    try { return JSON.parse(locality.postal_codes || "[]"); } catch { return []; }
  })();

  async function handleEnrich() {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const r = await enrichLocalityAction(locality.id);
      if (r.success && r.result) {
        const ok = r.result.sourceReports.filter((s) => s.status === "ok");
        const errors = r.result.sourceReports.filter((s) => s.status === "error");
        const parts: string[] = [];
        if (ok.length > 0) parts.push(`${r.result.fieldsUpdated} champs (${ok.map((s) => s.source).join(", ")})`);
        if (errors.length > 0) parts.push(`erreurs: ${errors.map((s) => s.source).join(", ")}`);
        if (r.result.fieldsSkipped > 0) parts.push(`${r.result.fieldsSkipped} protégé(s)`);
        setEnrichResult(parts.join(" — ") || "Aucune donnée mise à jour");
        router.refresh();
      } else {
        onError(r.error || "Erreur d'enrichissement");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    }
    setEnriching(false);
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="bg-white rounded-lg border border-tiili-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
              {TYPE_LABELS[locality.type]}
            </span>
            <span className="font-medium text-[#1a1a2e] text-sm truncate">{locality.name}</span>
            {locality.code && (
              <span className="text-xs text-gray-400">{locality.code}</span>
            )}
            {postalCodes.length > 0 && (
              <span className="text-xs text-gray-400">({postalCodes.join(", ")})</span>
            )}
            <span className="text-xs text-gray-400">
              {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
            </span>
            {enrichResult && (
              <span className="text-xs text-green-600">{enrichResult}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpandedLocality(isExpanded ? null : locality.id)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded"
            >
              {isExpanded ? "Fermer" : "Détails"}
            </button>
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium disabled:opacity-50"
            >
              {enriching ? "Enrichissement..." : "Enrichir"}
            </button>
            <button
              onClick={() => setShowDataImport(showDataImport === locality.id ? null : locality.id)}
              className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded font-medium"
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
                  key={`${snap.table_name}-${snap.valid_from}`}
                  snapshot={snap}
                  onDelete={async () => {
                    const r = await removeLocalityData(snap.table_name, snap.locality_id, snap.valid_from);
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
  "transaction_count": 450,
  "price_trend_pct": -1.2,
  "avg_rent_per_m2": 10.5,
  "avg_rent_furnished_per_m2": 13,
  "vacancy_rate": 7,
  "typical_cashflow_per_m2": -2.5,
  "rent_elasticity_alpha": 0.72,
  "rent_reference_surface": 45,
  "avg_condo_charges_per_m2": 2.5,
  "avg_property_tax_per_m2": 12,
  "avg_airbnb_night_price": 65,
  "avg_airbnb_occupancy_rate": 55,
  "population": 50000,
  "population_growth_pct": 0.3,
  "median_income": 21000,
  "poverty_rate": 15,
  "unemployment_rate": 9.5,
  "school_count": 35,
  "university_nearby": true,
  "public_transport_score": 6,
  "risk_level": "faible",
  "natural_risks": [{"type": "inondation", "level": "moyen"}]
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
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Données JSON
          <button
            type="button"
            onClick={() => setJsonText(EXAMPLE_JSON)}
            className="ml-2 text-amber-600 hover:underline"
          >
            Insérer exemple
          </button>
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          required
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          placeholder={EXAMPLE_JSON}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
      >
        {saving ? "Import..." : "Importer"}
      </button>
    </form>
  );
}

// ─── Snapshot Row ───

const FIELD_LABELS: Record<string, string> = {
  avg_purchase_price_per_m2: "Prix moyen/m²",
  median_purchase_price_per_m2: "Prix médian/m²",
  transaction_count: "Transactions",
  price_trend_pct: "Tendance prix (%)",
  avg_rent_per_m2: "Loyer moyen/m²",
  avg_rent_furnished_per_m2: "Loyer meublé/m²",
  vacancy_rate: "Vacance locative (%)",
  typical_cashflow_per_m2: "Cashflow/m²",
  rent_elasticity_alpha: "Élasticité loyer (α)",
  rent_reference_surface: "Surface réf. loyer",
  avg_condo_charges_per_m2: "Charges copro/m²",
  avg_property_tax_per_m2: "TF/m²",
  property_tax_rate_pct: "Taux TFB (%)",
  avg_airbnb_night_price: "Airbnb prix/nuit",
  avg_airbnb_occupancy_rate: "Airbnb occupation (%)",
  population: "Population",
  population_growth_pct: "Croissance pop. (%)",
  median_income: "Revenu médian",
  poverty_rate: "Taux pauvreté (%)",
  unemployment_rate: "Taux chômage (%)",
  vacant_housing_pct: "Logements vacants (%)",
  owner_occupier_pct: "Propriétaires (%)",
  school_count: "Écoles",
  university_nearby: "Université",
  public_transport_score: "Score transports",
  doctor_count: "Médecins",
  pharmacy_count: "Pharmacies",
  supermarket_count: "Supermarchés",
  risk_level: "Niveau risque",
  natural_risks: "Risques naturels",
  flood_risk_level: "Inondation",
  seismic_zone: "Zone sismique",
  radon_level: "Radon",
  industrial_risk: "Risque industriel",
  avg_dpe_class: "Classe DPE moy.",
  avg_energy_consumption: "Conso énergie (kWh/m²)",
  avg_ges_class: "Classe GES moy.",
  dpe_count: "Nb DPE",
};

function formatFieldValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (key === "university_nearby") return value ? "Oui" : "Non";
  if (key === "industrial_risk") return value ? "Oui" : "Non";
  if (key === "natural_risks") {
    try {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (Array.isArray(arr)) return arr.map((r: { type: string }) => r.type).join(", ") || "—";
    } catch { /* fallthrough */ }
    return String(value);
  }
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  return String(value);
}

function SnapshotRow({
  snapshot,
  onDelete,
}: {
  snapshot: LocalityDataSnapshot;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!fields) {
      setLoading(true);
      const data = await fetchSnapshotFields(snapshot.table_name, snapshot.locality_id, snapshot.valid_from);
      setFields(data);
      setLoading(false);
    }
    setExpanded(true);
  }

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 text-xs text-left min-w-0"
        >
          <span className="text-gray-400">{expanded ? "▼" : "▶"}</span>
          <span className="font-medium text-gray-700">{snapshot.valid_from}</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
            {TABLE_LABELS[snapshot.table_name]}
          </span>
          <span className="text-gray-400">{snapshot.field_count} champ{snapshot.field_count !== 1 ? "s" : ""}</span>
          {snapshot.source && <span className="text-gray-400">({snapshot.source})</span>}
        </button>
        <button
          onClick={onDelete}
          className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded shrink-0"
        >
          Suppr.
        </button>
      </div>
      {expanded && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          {loading ? (
            <span className="text-xs text-gray-400">Chargement...</span>
          ) : fields ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(fields).map(([key, value]) => (
                value != null && (
                  <div key={key} className="flex justify-between py-0.5 text-xs">
                    <span className="text-gray-500">{FIELD_LABELS[key] || key}</span>
                    <span className="font-medium text-gray-800 font-[family-name:var(--font-mono)]">
                      {formatFieldValue(key, value)}
                    </span>
                  </div>
                )
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Aucune donnée</span>
          )}
        </div>
      )}
    </div>
  );
}
