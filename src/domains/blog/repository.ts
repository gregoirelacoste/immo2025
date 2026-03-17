/**
 * Blog repository — CRUD articles en base de données.
 */

import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { BlogArticle, BlogArticleInput, ArticleStatus } from "./types";

function generateId(): string {
  return `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function auditId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── CRUD Articles ──

export async function createArticle(input: BlogArticleInput): Promise<BlogArticle> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO blog_articles
      (id, slug, title, content, excerpt, meta_description, json_ld,
       source_urls, category, locality_id, tags, extracted_data,
       status, triggered_by, generation_model, generation_tokens,
       created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.slug,
      input.title,
      input.content,
      input.excerpt ?? "",
      input.meta_description ?? "",
      input.json_ld ?? "",
      JSON.stringify(input.source_urls ?? []),
      input.category,
      input.locality_id ?? null,
      JSON.stringify(input.tags ?? []),
      JSON.stringify(input.extracted_data ?? {}),
      input.status ?? "draft",
      input.triggered_by ?? "admin",
      input.generation_model ?? "",
      input.generation_tokens ?? 0,
      now,
      now,
    ],
  });

  await logAudit(id, "created", { category: input.category, triggered_by: input.triggered_by });

  const created = await getArticleById(id);
  if (!created) throw new Error(`Failed to read back article ${id} after INSERT`);
  return created;
}

export async function getArticleById(id: string): Promise<BlogArticle | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM blog_articles WHERE id = ?",
    args: [id],
  });
  return result.rows[0] ? rowAs<BlogArticle>(result.rows[0]) : undefined;
}

export async function getArticleBySlug(slug: string): Promise<BlogArticle | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM blog_articles WHERE slug = ?",
    args: [slug],
  });
  return result.rows[0] ? rowAs<BlogArticle>(result.rows[0]) : undefined;
}

export async function listArticles(options?: {
  status?: ArticleStatus;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ articles: BlogArticle[]; total: number }> {
  const db = await getDb();
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (options?.status) {
    conditions.push("status = ?");
    args.push(options.status);
  }
  if (options?.category) {
    conditions.push("category = ?");
    args.push(options.category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const [countResult, listResult] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) as cnt FROM blog_articles ${where}`, args }),
    db.execute({
      sql: `SELECT * FROM blog_articles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
  ]);

  return {
    articles: listResult.rows.map((r) => rowAs<BlogArticle>(r)),
    total: Number(countResult.rows[0]?.cnt ?? 0),
  };
}

/** Articles publiés, triés par date de publication */
export async function listPublishedArticles(options?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<BlogArticle[]> {
  const db = await getDb();
  const conditions = ["status = 'published'"];
  const args: (string | number)[] = [];

  if (options?.category) {
    conditions.push("category = ?");
    args.push(options.category);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const result = await db.execute({
    sql: `SELECT * FROM blog_articles ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, offset],
  });

  return result.rows.map((r) => rowAs<BlogArticle>(r));
}

/** Tous les slugs publiés (pour generateStaticParams) */
export async function getAllPublishedSlugs(): Promise<string[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT slug FROM blog_articles WHERE status = 'published' ORDER BY published_at DESC"
  );
  return result.rows.map((r) => r.slug as string);
}

// ── Mutations ──

export async function updateArticleStatus(
  id: string,
  status: ArticleStatus
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const publishedAt = status === "published" ? now : null;

  await db.execute({
    sql: `UPDATE blog_articles
      SET status = ?, published_at = COALESCE(published_at, ?), updated_at = ?
      WHERE id = ?`,
    args: [status, publishedAt, now, id],
  });

  await logAudit(id, `status_changed_to_${status}`, {});
}

export async function updateArticleContent(
  id: string,
  fields: Partial<Pick<BlogArticleInput, "title" | "content" | "excerpt" | "meta_description" | "json_ld" | "tags" | "extracted_data">>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const args: (string | number | null)[] = [now];

  if (fields.title !== undefined) { sets.push("title = ?"); args.push(fields.title); }
  if (fields.content !== undefined) { sets.push("content = ?"); args.push(fields.content); }
  if (fields.excerpt !== undefined) { sets.push("excerpt = ?"); args.push(fields.excerpt); }
  if (fields.meta_description !== undefined) { sets.push("meta_description = ?"); args.push(fields.meta_description); }
  if (fields.json_ld !== undefined) { sets.push("json_ld = ?"); args.push(fields.json_ld); }
  if (fields.tags !== undefined) { sets.push("tags = ?"); args.push(JSON.stringify(fields.tags)); }
  if (fields.extracted_data !== undefined) { sets.push("extracted_data = ?"); args.push(JSON.stringify(fields.extracted_data)); }

  args.push(id);
  await db.execute({
    sql: `UPDATE blog_articles SET ${sets.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function markDataInjected(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE blog_articles SET data_injected = 1, updated_at = ? WHERE id = ?",
    args: [new Date().toISOString(), id],
  });
  await logAudit(id, "data_injected", {});
}

export async function deleteArticle(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM blog_articles WHERE id = ?", args: [id] });
  await logAudit(id, "deleted", {});
}

// ── Audit log ──

async function logAudit(
  articleId: string | null,
  action: string,
  details: Record<string, unknown>,
  triggeredBy = "system"
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute({
      sql: `INSERT INTO blog_audit_log (id, article_id, action, details, triggered_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        auditId(),
        articleId,
        action,
        JSON.stringify(details),
        triggeredBy,
        new Date().toISOString(),
      ],
    });
  } catch {
    // Audit log is best-effort, don't fail the main operation
  }
}

// ── Stats ──

export async function getArticleStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  dataInjected: number;
  thisWeek: number;
}> {
  const db = await getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const result = await db.execute({
    sql: `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
      SUM(CASE WHEN data_injected = 1 THEN 1 ELSE 0 END) as data_injected,
      SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as this_week
      FROM blog_articles`,
    args: [weekAgo],
  });

  const row = result.rows[0];
  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    draft: Number(row?.draft ?? 0),
    dataInjected: Number(row?.data_injected ?? 0),
    thisWeek: Number(row?.this_week ?? 0),
  };
}
