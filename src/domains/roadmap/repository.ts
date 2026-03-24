/**
 * Roadmap & Feedback repository — CRUD en base de données.
 */

import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import type {
  RoadmapItem,
  RoadmapItemInput,
  RoadmapStatus,
  FeedbackItem,
  FeedbackInput,
} from "./types";

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Roadmap CRUD ──

export async function getAllRoadmapItems(): Promise<RoadmapItem[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM roadmap_items ORDER BY priority ASC, vote_count DESC, created_at DESC"
  );
  return res.rows.map((r) => rowAs<RoadmapItem>(r));
}

export async function getRoadmapItemById(id: string): Promise<RoadmapItem | undefined> {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM roadmap_items WHERE id = ?", args: [id] });
  return res.rows[0] ? rowAs<RoadmapItem>(res.rows[0]) : undefined;
}

export async function createRoadmapItem(input: RoadmapItemInput): Promise<RoadmapItem> {
  const db = await getDb();
  const id = genId("road");
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO roadmap_items (id, title, description, category, status, source, source_detail, priority, vote_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    args: [
      id,
      input.title,
      input.description ?? "",
      input.category ?? "idea",
      input.status ?? "backlog",
      input.source ?? "admin",
      input.source_detail ?? "",
      input.priority ?? 0,
      now,
      now,
    ],
  });

  const item = await getRoadmapItemById(id);
  if (!item) throw new Error("Failed to create roadmap item");
  return item;
}

const UPDATABLE_COLUMNS = new Set([
  "title", "description", "category", "status", "priority", "source", "source_detail",
]);

export async function updateRoadmapItem(
  id: string,
  fields: Partial<Pick<RoadmapItem, "title" | "description" | "category" | "status" | "priority" | "source" | "source_detail">>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined && UPDATABLE_COLUMNS.has(key)) {
      sets.push(`${key} = ?`);
      args.push(val);
    }
  }
  if (sets.length === 0) return;

  sets.push("updated_at = ?");
  args.push(new Date().toISOString());
  args.push(id);

  await db.execute({ sql: `UPDATE roadmap_items SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM roadmap_items WHERE id = ?", args: [id] });
}

export async function incrementVote(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE roadmap_items SET vote_count = vote_count + 1, updated_at = ? WHERE id = ?",
    args: [new Date().toISOString(), id],
  });
}

/** Find existing roadmap item by exact title (used for dedup of AI insights) */
export async function findByTitle(title: string): Promise<RoadmapItem | undefined> {
  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT * FROM roadmap_items WHERE LOWER(title) = LOWER(?) LIMIT 1",
    args: [title],
  });
  return res.rows[0] ? rowAs<RoadmapItem>(res.rows[0]) : undefined;
}

// ── Feedback CRUD ──

export async function getAllFeedback(): Promise<FeedbackItem[]> {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM feedback ORDER BY created_at DESC");
  return res.rows.map((r) => rowAs<FeedbackItem>(r));
}

export async function createFeedback(
  userId: string,
  userEmail: string,
  input: FeedbackInput
): Promise<FeedbackItem> {
  const db = await getDb();
  const id = genId("fb");
  const now = new Date().toISOString();

  // Auto-create a roadmap item from the feedback
  const roadmapItem = await createRoadmapItem({
    title: input.title,
    description: input.description ?? "",
    category: input.type === "bug" ? "fix" : input.type === "other" ? "idea" : input.type,
    source: "user_feedback",
    source_detail: userEmail,
    status: "backlog",
  });

  await db.execute({
    sql: `INSERT INTO feedback (id, user_id, user_email, type, title, description, page_url, roadmap_item_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      userEmail,
      input.type,
      input.title,
      input.description ?? "",
      input.page_url ?? "",
      roadmapItem.id,
      now,
    ],
  });

  return {
    id,
    user_id: userId,
    user_email: userEmail,
    type: input.type,
    title: input.title,
    description: input.description ?? "",
    page_url: input.page_url ?? "",
    roadmap_item_id: roadmapItem.id,
    created_at: now,
  };
}
