"use server";

import { revalidatePath } from "next/cache";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { addPhoto, deletePhoto, getPhotosForProperty } from "./repository";
import { requireUserId } from "@/lib/auth-actions";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function uploadPhoto(
  propertyId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "Aucun fichier fourni." };
    }

    const tag = (formData.get("tag") as string) || "";
    const note = (formData.get("note") as string) || "";
    const source = (formData.get("source") as string) || "upload";
    const latStr = formData.get("latitude") as string | null;
    const lngStr = formData.get("longitude") as string | null;

    await ensureUploadDir();

    const ext = path.extname(file.name) || ".jpg";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(filePath, bytes);

    const url = `/uploads/photos/${filename}`;

    await addPhoto({
      property_id: propertyId,
      user_id: userId,
      url,
      thumbnail_url: url,
      source: source as "scraping" | "upload" | "camera" | "visit",
      tag,
      note,
      latitude: latStr ? parseFloat(latStr) : null,
      longitude: lngStr ? parseFloat(lngStr) : null,
      width: null,
      height: null,
    });

    revalidatePath(`/property/${propertyId}`);
    return { success: true };
  } catch (e) {
    console.error("uploadPhoto error:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function deletePhotoAction(
  photoId: string,
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();

    // Find the photo to get the file path
    const photos = await getPhotosForProperty(propertyId);
    const photo = photos.find((p) => p.id === photoId);

    if (photo && photo.url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", photo.url);
      try {
        await unlink(filePath);
      } catch {
        // file may not exist, ignore
      }
    }

    await deletePhoto(photoId, userId);

    revalidatePath(`/property/${propertyId}`);
    return { success: true };
  } catch (e) {
    console.error("deletePhotoAction error:", e);
    return { success: false, error: (e as Error).message };
  }
}
