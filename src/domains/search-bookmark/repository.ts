import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { SavedSearch } from "./types";

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => rowAs<SavedSearch>(r));
}

export async function getSavedSearchById(
  id: string,
  userId: string
): Promise<SavedSearch | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM saved_searches WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rows[0] ? rowAs<SavedSearch>(result.rows[0]) : null;
}

export async function findSavedSearchByUrl(
  url: string,
  userId: string
): Promise<SavedSearch | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM saved_searches WHERE url = ? AND user_id = ?",
    args: [url, userId],
  });
  return result.rows[0] ? rowAs<SavedSearch>(result.rows[0]) : null;
}

export async function createSavedSearch(data: {
  id: string;
  user_id: string;
  name: string;
  url: string;
  site: string;
}): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO saved_searches (id, user_id, name, url, site)
          VALUES (?, ?, ?, ?, ?)`,
    args: [data.id, data.user_id, data.name, data.url, data.site],
  });
}

export async function renameSavedSearch(
  id: string,
  userId: string,
  name: string
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE saved_searches SET name = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    args: [name, id, userId],
  });
}

export async function deleteSavedSearch(
  id: string,
  userId: string
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM saved_searches WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}
