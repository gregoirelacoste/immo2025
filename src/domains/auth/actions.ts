"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-actions";
import { getUserProfile, upsertUserProfile } from "./repository";
import type { UserProfile } from "./types";

export async function saveUserProfile(
  data: Partial<Omit<UserProfile, "user_id" | "updated_at">>
) {
  const userId = await requireUserId();
  await upsertUserProfile(userId, data);
  revalidatePath("/profile");
  return { success: true };
}

export async function loadUserProfile() {
  const userId = await requireUserId();
  return getUserProfile(userId);
}
