/**
 * Pipeline de publication — orchestre la génération complète d'un article.
 *
 * Flux : sélection sujet → collecte données → génération IA → sauvegarde → injection données
 *
 * Utilisé par :
 * - Le cron quotidien (scripts/publish-daily.ts)
 * - Le bouton admin "Générer un article" (même pipeline, même code)
 */

import { collectNewsContext } from "./news-fetcher";
import { generateArticle } from "./article-generator";
import { createArticle, updateArticleStatus } from "./repository";
import { injectArticleData } from "./data-injector";
import {
  ArticleCategory,
  BlogArticle,
  NewsFetcherOptions,
} from "./types";

export interface PipelineOptions {
  category: ArticleCategory;
  city?: string;
  postalCode?: string;
  codeInsee?: string;
  /** Publier directement ou rester en brouillon */
  autoPublish?: boolean;
  /** Qui déclenche : "cron" | "admin" */
  triggeredBy?: string;
  /** Injecter les données extraites dans locality_data */
  injectData?: boolean;
  /** Mode dry-run : ne rien sauvegarder en base */
  dryRun?: boolean;
}

export interface PipelineResult {
  success: boolean;
  article?: BlogArticle;
  injectionResult?: {
    injected: number;
    created: number;
    skipped: number;
    errors: Array<{ city: string; error: string }>;
  };
  error?: string;
  /** Durée totale en ms */
  durationMs: number;
}

/**
 * Exécute la pipeline complète de génération d'article.
 *
 * Étapes :
 * 1. Collecte des données (News Fetcher)
 * 2. Génération de l'article (Gemini)
 * 3. Sauvegarde en base (draft)
 * 4. Publication si autoPublish
 * 5. Injection des données extraites si injectData
 */
export async function runPipeline(
  options: PipelineOptions
): Promise<PipelineResult> {
  const start = Date.now();

  try {
    // ── Étape 1 : Collecte des données ──
    const fetcherOptions: NewsFetcherOptions = {
      category: options.category,
      city: options.city,
      postalCode: options.postalCode,
      codeInsee: options.codeInsee,
    };

    const context = await collectNewsContext(fetcherOptions);

    // ── Étape 2 : Génération de l'article via Gemini ──
    const generated = await generateArticle(context);

    // ── Mode dry-run : retourner sans sauvegarder ──
    if (options.dryRun) {
      return {
        success: true,
        durationMs: Date.now() - start,
        article: {
          id: "dry-run",
          slug: generated.article.slug,
          title: generated.article.title,
          content: generated.article.content,
          excerpt: generated.article.excerpt,
          meta_description: generated.article.meta_description,
          json_ld: JSON.stringify(generated.article.json_ld ?? {}),
          source_urls: "[]",
          category: options.category,
          locality_id: context.existingLocality?.localityId ?? null,
          tags: JSON.stringify(generated.article.tags ?? []),
          extracted_data: JSON.stringify(generated.extracted_data ?? {}),
          data_injected: 0,
          status: "draft",
          published_at: null,
          triggered_by: options.triggeredBy ?? "admin",
          generation_model: "gemini-2.5-flash",
          generation_tokens: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    // ── Étape 3 : Sauvegarde en base ──
    const article = await createArticle({
      slug: generated.article.slug,
      title: generated.article.title,
      content: generated.article.content,
      excerpt: generated.article.excerpt,
      meta_description: generated.article.meta_description,
      json_ld: JSON.stringify(generated.article.json_ld ?? {}),
      source_urls: context.news.map((n) => n.link),
      category: options.category,
      locality_id: context.existingLocality?.localityId ?? null,
      tags: generated.article.tags,
      extracted_data: generated.extracted_data,
      status: "draft",
      triggered_by: options.triggeredBy ?? "admin",
      generation_model: "gemini-2.5-flash",
    });

    // ── Étape 4 : Publication si demandé ──
    if (options.autoPublish) {
      await updateArticleStatus(article.id, "published");
      article.status = "published";
      article.published_at = new Date().toISOString();
    }

    // ── Étape 5 : Injection des données extraites ──
    let injectionResult;
    if (options.injectData !== false && generated.extracted_data) {
      injectionResult = await injectArticleData(
        article.id,
        generated.extracted_data
      );
    }

    return {
      success: true,
      article,
      injectionResult,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - start,
    };
  }
}
