"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-actions";
import { getSearchSiteName, getSearchSiteKey } from "@/domains/scraping/app-parsers";
import {
  createSavedSearch,
  findSavedSearchByUrl,
  renameSavedSearch,
  deleteSavedSearch,
} from "./repository";

export async function saveSavedSearchAction(
  url: string,
  name?: string
): Promise<{ id?: string; error?: string }> {
  try {
    const userId = await requireUserId();

    // Deduplicate
    const existing = await findSavedSearchByUrl(url, userId);
    if (existing) {
      return { id: existing.id };
    }

    const site = getSearchSiteKey(url);
    const displayName =
      name ||
      `Recherche ${getSearchSiteName(url)} - ${new Date().toLocaleDateString("fr-FR")}`;
    const id = crypto.randomUUID();

    await createSavedSearch({ id, user_id: userId, name: displayName, url, site });
    revalidatePath("/searches");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function renameSavedSearchAction(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await renameSavedSearch(id, userId, name);
    revalidatePath("/searches");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteSavedSearchAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await deleteSavedSearch(id, userId);
    revalidatePath("/searches");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
