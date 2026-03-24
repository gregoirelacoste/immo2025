"use client";

import { useState, useTransition } from "react";
import type { RoadmapItem, RoadmapCategory, RoadmapStatus, RoadmapSource, FeedbackItem } from "@/domains/roadmap/types";
import {
  adminCreateRoadmapItem,
  adminUpdateRoadmapItem,
  adminDeleteRoadmapItem,
  adminCopyForAI,
} from "@/domains/roadmap/actions";

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  backlog: "Backlog",
  planned: "Planifié",
  in_progress: "En cours",
  done: "Terminé",
  rejected: "Rejeté",
};

const STATUS_COLORS: Record<RoadmapStatus, string> = {
  backlog: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  feature: "Fonctionnalité",
  fix: "Correctif",
  improvement: "Amélioration",
  idea: "Idée",
};

const CATEGORY_ICONS: Record<RoadmapCategory, string> = {
  feature: "✨",
  fix: "🐛",
  improvement: "🔧",
  idea: "💡",
};

const SOURCE_LABELS: Record<RoadmapSource, string> = {
  admin: "Administration",
  user_feedback: "Utilisateur",
  ai_insight: "IA (texte)",
  scraping_gap: "Extraction auto",
};

const SOURCE_COLORS: Record<RoadmapSource, string> = {
  admin: "bg-purple-100 text-purple-700",
  user_feedback: "bg-cyan-100 text-cyan-700",
  ai_insight: "bg-pink-100 text-pink-700",
  scraping_gap: "bg-orange-100 text-orange-700",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "—",
  1: "Haute",
  2: "Moyenne",
  3: "Basse",
};

interface Props {
  initialItems: RoadmapItem[];
  feedbackList: FeedbackItem[];
}

export default function AdminRoadmapClient({ initialItems, feedbackList }: Props) {
  const [items, setItems] = useState(initialItems);
  const [tab, setTab] = useState<"roadmap" | "feedback">("roadmap");
  const [filterStatus, setFilterStatus] = useState<RoadmapStatus | "all">("all");
  const [filterSource, setFilterSource] = useState<RoadmapSource | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState<RoadmapCategory>("idea");
  const [formStatus, setFormStatus] = useState<RoadmapStatus>("backlog");
  const [formPriority, setFormPriority] = useState(0);

  const filteredItems = items.filter((i) => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterSource !== "all" && i.source !== filterSource) return false;
    return true;
  });

  const statusCounts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  function resetForm() {
    setFormTitle("");
    setFormDesc("");
    setFormCategory("idea");
    setFormStatus("backlog");
    setFormPriority(0);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(item: RoadmapItem) {
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormCategory(item.category);
    setFormStatus(item.status);
    setFormPriority(item.priority);
    setEditingId(item.id);
    setShowForm(true);
  }

  function handleSubmit() {
    startTransition(async () => {
      if (editingId) {
        const res = await adminUpdateRoadmapItem(editingId, {
          title: formTitle,
          description: formDesc,
          category: formCategory,
          status: formStatus,
          priority: formPriority,
        });
        if (res.success) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === editingId
                ? { ...i, title: formTitle, description: formDesc, category: formCategory, status: formStatus, priority: formPriority }
                : i
            )
          );
          resetForm();
        }
      } else {
        const res = await adminCreateRoadmapItem({
          title: formTitle,
          description: formDesc,
          category: formCategory,
          status: formStatus,
          priority: formPriority,
        });
        if (res.success && res.item) {
          setItems((prev) => [res.item!, ...prev]);
          resetForm();
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cet item ?")) return;
    startTransition(async () => {
      const res = await adminDeleteRoadmapItem(id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    });
  }

  function handleStatusChange(id: string, status: RoadmapStatus) {
    startTransition(async () => {
      const res = await adminUpdateRoadmapItem(id, { status });
      if (res.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      }
    });
  }

  async function handleCopyForAI(id: string) {
    const res = await adminCopyForAI(id);
    if (res.success && res.text) {
      await navigator.clipboard.writeText(res.text);
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(STATUS_LABELS) as RoadmapStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            className={`rounded-xl border px-4 py-3 text-center transition-colors ${
              filterStatus === s ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{statusCounts[s] ?? 0}</div>
            <div className="text-xs text-gray-500">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("roadmap")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "roadmap" ? "border-amber-500 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Roadmap ({items.length})
        </button>
        <button
          onClick={() => setTab("feedback")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "feedback" ? "border-amber-500 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Feedback ({feedbackList.length})
        </button>
      </div>

      {tab === "roadmap" && (
        <>
          {/* Filters + add button */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as RoadmapSource | "all")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Toutes sources</option>
              {(Object.keys(SOURCE_LABELS) as RoadmapSource[]).map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="ml-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              + Ajouter
            </button>
          </div>

          {/* Add / Edit form */}
          {showForm && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">
                {editingId ? "Modifier l'item" : "Nouvel item roadmap"}
              </h3>
              <input
                type="text"
                placeholder="Titre"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description (optionnel)"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as RoadmapCategory)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {(Object.keys(CATEGORY_LABELS) as RoadmapCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as RoadmapStatus)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {(Object.keys(STATUS_LABELS) as RoadmapStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {[0, 1, 2, 3].map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !formTitle.trim()}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "..." : editingId ? "Modifier" : "Créer"}
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <p className="text-center text-gray-400 py-8">Aucun item trouvé</p>
            )}
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="text-xl">{CATEGORY_ICONS[item.category]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[item.source]}`}>
                        {SOURCE_LABELS[item.source]}
                      </span>
                      {item.priority > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          P{item.priority}
                        </span>
                      )}
                      {item.vote_count > 0 && (
                        <span className="text-xs text-gray-500">+{item.vote_count} votes</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {item.source_detail && (
                      <p className="text-xs text-gray-400 mt-1">Source : {item.source_detail}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as RoadmapStatus)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs"
                    >
                      {(Object.keys(STATUS_LABELS) as RoadmapStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleCopyForAI(item.id)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-blue-50 transition-colors"
                      title="Copier pour l'IA"
                    >
                      {copySuccess === item.id ? "Copié !" : "Copier IA"}
                    </button>
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "feedback" && (
        <div className="space-y-3">
          {feedbackList.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun feedback reçu</p>
          )}
          {feedbackList.map((fb) => (
            <div key={fb.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">
                  {fb.type === "bug" ? "🐛" : fb.type === "feature" ? "✨" : fb.type === "improvement" ? "🔧" : "💬"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{fb.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700">
                      {fb.type}
                    </span>
                  </div>
                  {fb.description && (
                    <p className="text-sm text-gray-600 mt-1">{fb.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{fb.user_email}</span>
                    {fb.page_url && <span>depuis {fb.page_url}</span>}
                    <span>{new Date(fb.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
