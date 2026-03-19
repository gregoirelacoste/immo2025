"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-actions";
import { runPipeline } from "./pipeline";
import {
  listArticles,
  getArticleById,
  updateArticleStatus,
  updateArticleContent,
  deleteArticle,
  getArticleStats,
} from "./repository";
import { injectArticleData } from "./data-injector";
import { ArticleCategory, BlogArticle, GeneratedArticle } from "./types";

async function requireAdmin() {
  const { userId, isAdmin } = await getAuthContext();
  if (!userId || !isAdmin) throw new Error("Accès admin requis");
  return userId;
}

export async function generateArticleAction(
  category: ArticleCategory,
  city?: string,
  autoPublish = false
): Promise<{
  success: boolean;
  error?: string;
  articleId?: string;
  injection?: { injected: number; created: number; skipped: number; errors: Array<{ city: string; error: string }> };
}> {
  try {
    await requireAdmin();

    const result = await runPipeline({
      category,
      city: city || undefined,
      autoPublish,
      triggeredBy: "admin",
    });

    if (!result.success || !result.article) {
      return { success: false, error: result.error || "Article non généré" };
    }

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/guide", "layout");
    if (autoPublish) {
      revalidatePath(`/blog/${result.article.slug}`);
    }

    return {
      success: true,
      articleId: result.article.id,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function publishArticleAction(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await updateArticleStatus(articleId, "published");

    const article = await getArticleById(articleId);

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    if (article) {
      revalidatePath(`/blog/${article.slug}`);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function unpublishArticleAction(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await updateArticleStatus(articleId, "draft");

    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteArticleAction(
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteArticle(articleId);

    revalidatePath("/admin/blog");
    revalidatePath("/blog");

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function injectDataAction(
  articleId: string
): Promise<{ success: boolean; error?: string; injected?: number }> {
  try {
    await requireAdmin();

    const article = await getArticleById(articleId);
    if (!article) return { success: false, error: "Article non trouvé" };

    let extractedData: GeneratedArticle["extracted_data"];
    try {
      extractedData = JSON.parse(article.extracted_data || "{}");
    } catch {
      return { success: false, error: "extracted_data invalide" };
    }

    const result = await injectArticleData(articleId, extractedData);

    revalidatePath("/admin/blog");
    revalidatePath("/guide", "layout");

    return { success: true, injected: result.injected };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateArticleContentAction(
  articleId: string,
  fields: { title?: string; content?: string; excerpt?: string; meta_description?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await updateArticleContent(articleId, fields);

    const article = await getArticleById(articleId);
    revalidatePath("/admin/blog");
    if (article?.status === "published") {
      revalidatePath(`/blog/${article.slug}`);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getArticleDashboardAction(): Promise<{
  success: boolean;
  error?: string;
  stats?: Awaited<ReturnType<typeof getArticleStats>>;
  articles?: BlogArticle[];
}> {
  try {
    await requireAdmin();

    const [stats, { articles }] = await Promise.all([
      getArticleStats(),
      listArticles({ limit: 20 }),
    ]);

    return { success: true, stats, articles };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
