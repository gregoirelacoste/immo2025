import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug, getAllPublishedSlugs } from "@/domains/blog/repository";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article non trouvé" };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io";

  return {
    title: article.title,
    description: article.meta_description || article.excerpt,
    openGraph: {
      title: article.title,
      description: article.meta_description || article.excerpt,
      type: "article",
      url: `${baseUrl}/blog/${slug}`,
      publishedTime: article.published_at || undefined,
    },
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
  };
}

export const revalidate = 3600; // ISR: revalidate every hour

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "published") return notFound();

  const tags: string[] = JSON.parse(article.tags || "[]");
  const jsonLd = article.json_ld ? JSON.parse(article.json_ld) : null;

  return (
    <>
      {/* JSON-LD structured data */}
      {jsonLd && Object.keys(jsonLd).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <article className="mx-auto max-w-3xl px-4 py-8">
        {/* Meta */}
        <div className="mb-6">
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 mb-3">
            {article.category.replace(/_/g, " ")}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            {article.title}
          </h1>
          {article.published_at && (
            <time className="block mt-3 text-sm text-gray-500">
              Publié le{" "}
              {new Date(article.published_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          )}
        </div>

        {/* Content */}
        <div
          className="prose prose-lg prose-amber max-w-none
            prose-headings:text-gray-900
            prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200
            prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3
            prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 prose-strong:font-bold
            prose-table:text-sm prose-table:w-full prose-table:my-4
            prose-thead:bg-amber-50 prose-thead:border-b-2 prose-thead:border-amber-200
            prose-th:px-4 prose-th:py-2.5 prose-th:text-left prose-th:font-semibold prose-th:text-gray-700
            prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
            prose-li:text-gray-700 prose-li:my-1
            prose-ul:my-4 prose-ol:my-4
            prose-blockquote:border-l-amber-500 prose-blockquote:bg-amber-50/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-gray-700 prose-blockquote:font-medium prose-blockquote:my-6"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="flex gap-2 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 rounded-xl bg-amber-50 border border-amber-200 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900">
            Simulez votre investissement sur tiili.io
          </p>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Calculez rendement, cashflow et mensualités en quelques clics.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/property/new"
              className="inline-block rounded-lg bg-amber-600 px-6 py-3 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              Créer une simulation
            </a>
            <a
              href="/guide"
              className="inline-block rounded-lg border border-amber-600 px-6 py-3 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
            >
              Explorer les villes
            </a>
          </div>
        </div>
      </article>
    </>
  );
}
