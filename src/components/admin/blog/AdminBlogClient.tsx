"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateArticleAction,
  publishArticleAction,
  unpublishArticleAction,
  deleteArticleAction,
} from "@/domains/blog/actions";
import { BlogArticle, ARTICLE_CATEGORIES, ArticleCategory } from "@/domains/blog/types";

interface Props {
  stats: {
    total: number;
    published: number;
    draft: number;
    dataInjected: number;
    thisWeek: number;
  };
  initialArticles: BlogArticle[];
}

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  guide_ville: "Guide ville",
  guide_quartier: "Guide quartier",
  actu_marche: "Actualité marché",
  analyse_comparative: "Analyse comparative",
  conseil_investissement: "Conseil investissement",
  fiscalite: "Fiscalité",
  financement: "Financement",
  etude_de_cas: "Étude de cas",
};

export default function AdminBlogClient({ stats, initialArticles }: Props) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<ArticleCategory>("guide_ville");
  const [city, setCity] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);

  const cityRequired = ["guide_ville", "guide_quartier", "etude_de_cas"].includes(category);

  async function handleGenerate() {
    if (cityRequired && !city.trim()) {
      setError("La ville est obligatoire pour ce type d'article");
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    const result = await generateArticleAction(
      category,
      city.trim() || undefined,
      autoPublish
    );

    setGenerating(false);

    if (result.success) {
      setSuccess(`Article généré avec succès (ID: ${result.articleId})`);
      setCity("");
      router.refresh();
    } else {
      setError(result.error || "Erreur inconnue");
    }
  }

  async function handlePublish(id: string) {
    const result = await publishArticleAction(id);
    if (result.success) {
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "published" as const, published_at: new Date().toISOString() } : a))
      );
    } else {
      setError(result.error || "Erreur publication");
    }
  }

  async function handleUnpublish(id: string) {
    const result = await unpublishArticleAction(id);
    if (result.success) {
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "draft" as const } : a))
      );
    } else {
      setError(result.error || "Erreur dépublication");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    const result = await deleteArticleAction(id);
    if (result.success) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } else {
      setError(result.error || "Erreur suppression");
    }
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="Publiés" value={stats.published} color="text-green-600" />
        <KpiCard label="Brouillons" value={stats.draft} color="text-amber-600" />
        <KpiCard label="Cette semaine" value={stats.thisWeek} />
      </div>

      {/* Formulaire de génération */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Générer un article</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ArticleCategory)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {ARTICLE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ville {cityRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={cityRequired ? "Lyon, Bordeaux..." : "Optionnel"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
                className="rounded"
              />
              Publier directement
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-4 px-6 py-2.5 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? "Génération en cours..." : "Générer l'article"}
        </button>

        {generating && (
          <p className="mt-2 text-sm text-gray-500">
            Collecte des données + rédaction IA en cours (~30-60s)...
          </p>
        )}
      </div>

      {/* Liste des articles */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Articles ({articles.length})
          </h2>
        </div>

        {articles.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">Aucun article pour le moment.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {articles.map((article) => (
              <div key={article.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={article.status} />
                    <span className="text-xs text-gray-400">
                      {CATEGORY_LABELS[article.category as ArticleCategory] ?? article.category}
                    </span>
                    {article.data_injected === 1 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        données injectées
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 truncate">{article.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {article.slug} · {new Date(article.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {article.status === "draft" && (
                    <button
                      onClick={() => handlePublish(article.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                    >
                      Publier
                    </button>
                  )}
                  {article.status === "published" && (
                    <button
                      onClick={() => handleUnpublish(article.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Dépublier
                    </button>
                  )}
                  {article.status === "published" && (
                    <a
                      href={`/blog/${article.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                    >
                      Voir
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <div className={`text-2xl font-bold ${color || "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    draft: "bg-amber-100 text-amber-700",
    archived: "bg-gray-100 text-gray-600",
    error: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    published: "Publié",
    draft: "Brouillon",
    archived: "Archivé",
    error: "Erreur",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}
