import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import type { Photo } from "./types";

export async function getPhotosForProperty(propertyId: string): Promise<Photo[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM photos WHERE property_id = ? ORDER BY created_at ASC",
    args: [propertyId],
  });
  return result.rows.map((r) => rowAs<Photo>(r));
}

export async function addPhoto(
  photo: Omit<Photo, "id" | "created_at">
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO photos (id, property_id, user_id, url, thumbnail_url, source, tag, note, latitude, longitude, width, height)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      photo.property_id,
      photo.user_id,
      photo.url,
      photo.thumbnail_url,
      photo.source,
      photo.tag,
      photo.note,
      photo.latitude,
      photo.longitude,
      photo.width,
      photo.height,
    ],
  });
  return id;
}

export async function deletePhoto(id: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM photos WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

export async function updatePhotoTag(
  id: string,
  tag: string,
  note: string
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE photos SET tag = ?, note = ? WHERE id = ?",
    args: [tag, note, id],
  });
}
