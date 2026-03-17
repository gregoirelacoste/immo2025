import type { Metadata } from "next";
import { listPublishedArticles } from "@/domains/blog/repository";
import { ARTICLE_CATEGORIES, ArticleCategory } from "@/domains/blog/types";

export const metadata: Metadata = {
  title: "Blog — Investissement immobilier locatif",
  description:
    "Guides, analyses de marché et conseils pour investir dans l'immobilier locatif en France. Données DVF, INSEE et simulations.",
};

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  guide_ville: "Guide ville",
  guide_quartier: "Guide quartier",
  actu_marche: "Actualité marché",
  analyse_comparative: "Analyse",
  conseil_investissement: "Conseil",
  fiscalite: "Fiscalité",
  financement: "Financement",
  etude_de_cas: "Étude de cas",
};

export default async function BlogPage() {
  const articles = await listPublishedArticles({ limit: 50 });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Blog investissement immobilier
      </h1>
      <p className="text-gray-600 mb-8">
        Guides, analyses de marché et données pour investir dans l&apos;immobilier locatif en France.
      </p>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">Aucun article publié pour le moment.</p>
          <p className="mt-2">Les premiers guides arrivent bientôt.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <article
              key={article.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-800">
                  {CATEGORY_LABELS[article.category as ArticleCategory] ?? article.category}
                </span>
                {article.published_at && (
                  <time className="text-xs text-gray-400">
                    {new Date(article.published_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                )}
              </div>
              <a href={`/blog/${article.slug}`}>
                <h2 className="text-xl font-semibold text-gray-900 hover:text-amber-600 transition-colors">
                  {article.title}
                </h2>
              </a>
              {article.excerpt && (
                <p className="mt-2 text-gray-600 text-sm line-clamp-2">
                  {article.excerpt}
                </p>
              )}
              {article.tags && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {(JSON.parse(article.tags || "[]") as string[]).slice(0, 4).map((tag) => (
                    <span key={tag} className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
