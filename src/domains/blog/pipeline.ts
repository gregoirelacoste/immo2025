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
import { ensureLocalityEnriched } from "@/domains/locality/enrichment/ensure";
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
  /** Thème libre — l'IA rédige sur ce sujet */
  customTopic?: string;
  /** Publier directement ou rester en brouillon */
  autoPublish?: boolean;
  /** Qui déclenche : "cron" | "admin" */
  triggeredBy?: string;
  /** Mode dry-run : ne rien sauvegarder en base */
  dryRun?: boolean;
}

export interface PipelineResult {
  success: boolean;
  article?: BlogArticle;
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
    // ── Étape 0 : Enrichir la localité en amont ──
    if (options.city || options.codeInsee) {
      await ensureLocalityEnriched(
        options.city || "",
        options.postalCode,
        options.codeInsee
      ).catch(() => {});
    }

    // ── Étape 1 : Collecte des données ──
    const fetcherOptions: NewsFetcherOptions = {
      category: options.category,
      city: options.city,
      postalCode: options.postalCode,
      codeInsee: options.codeInsee,
      customTopic: options.customTopic,
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

      // Revalider le cache Next.js pour que l'article apparaisse immédiatement
      await revalidateBlog(article.slug);
      await notifyIndexNow(article.slug);
    }

    // Étape 5 supprimée : les données API sont déjà injectées par le pipeline central
    // (ensureLocalityEnriched en étape 0). L'article conserve extracted_data pour traçabilité.

    return {
      success: true,
      article,
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

/** Appelle l'API de revalidation pour rafraîchir le cache des pages blog */
async function revalidateBlog(slug: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!baseUrl || !secret) {
    console.warn(
      `⚠️  Revalidation ignorée : ${!baseUrl ? "NEXT_PUBLIC_BASE_URL manquant" : "REVALIDATE_SECRET manquant"}`
    );
    return;
  }

  const url = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const endpoint = `${url}/api/revalidate-blog`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, slug }),
    });

    if (!res.ok) {
      console.error(`❌ Revalidation échouée : ${res.status} ${res.statusText} (${endpoint})`);
    } else {
      console.log(`✅ Cache revalidé pour /blog et /blog/${slug}`);
    }
  } catch (e) {
    console.error(`❌ Revalidation erreur réseau : ${e instanceof Error ? e.message : e} (${endpoint})`);
  }
}

/** Notifie IndexNow (Bing/Yandex) qu'une nouvelle page blog est disponible */
async function notifyIndexNow(slug: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;
  if (!baseUrl) return;

  const origin = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const host = new URL(origin).host;

  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        key,
        urlList: [`${origin}/blog/${slug}`],
      }),
    });
  } catch {
    // Non-bloquant : si IndexNow échoue, les moteurs indexeront naturellement
  }
}
