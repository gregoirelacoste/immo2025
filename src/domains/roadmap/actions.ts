"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUserId, getAuthContext } from "@/lib/auth-actions";
import { auth } from "@/lib/auth";
import {
  getAllRoadmapItems,
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
  incrementVote,
  getAllFeedback,
  createFeedback,
  findByTitle,
} from "./repository";
import type {
  RoadmapItem,
  RoadmapItemInput,
  RoadmapStatus,
  RoadmapCategory,
  RoadmapSource,
  FeedbackItem,
  FeedbackInput,
} from "./types";

// ── Admin: Roadmap management ──

export async function adminGetRoadmap(): Promise<RoadmapItem[]> {
  await requireAdmin();
  return getAllRoadmapItems();
}

export async function adminCreateRoadmapItem(
  input: RoadmapItemInput
): Promise<{ success: boolean; error?: string; item?: RoadmapItem }> {
  try {
    await requireAdmin();
    if (!input.title?.trim()) return { success: false, error: "Titre requis" };
    const item = await createRoadmapItem(input);
    revalidatePath("/admin/roadmap");
    return { success: true, item };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminUpdateRoadmapItem(
  id: string,
  fields: Partial<Pick<RoadmapItem, "title" | "description" | "category" | "status" | "priority">>
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await updateRoadmapItem(id, fields);
    revalidatePath("/admin/roadmap");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminDeleteRoadmapItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteRoadmapItem(id);
    revalidatePath("/admin/roadmap");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Copy roadmap item as a formatted prompt for AI implementation */
export async function adminCopyForAI(id: string): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    await requireAdmin();
    const items = await getAllRoadmapItems();
    const item = items.find((i) => i.id === id);
    if (!item) return { success: false, error: "Item non trouvé" };

    const text = `## Tâche à réaliser

**Titre :** ${item.title}
**Catégorie :** ${item.category}
**Priorité :** ${item.priority === 1 ? "Haute" : item.priority === 2 ? "Moyenne" : item.priority === 3 ? "Basse" : "Non définie"}

**Description :**
${item.description || "Pas de description détaillée."}

**Source :** ${item.source}${item.source_detail ? ` (${item.source_detail})` : ""}
**Votes :** ${item.vote_count}`;

    return { success: true, text };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ── Admin: Feedback view ──

export async function adminGetFeedback(): Promise<FeedbackItem[]> {
  await requireAdmin();
  return getAllFeedback();
}

// ── Public: User feedback submission ──

export async function submitFeedback(
  input: FeedbackInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "Vous devez être connecté pour envoyer un retour." };

    if (!input.title?.trim()) return { success: false, error: "Titre requis" };
    if (!input.type) return { success: false, error: "Type requis" };

    const email = session.user?.email ?? "";
    await createFeedback(userId, email, input);
    revalidatePath("/admin/roadmap");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ── AI auto-feed: create roadmap items from text-extractor insights ──

export async function createAIInsight(
  title: string,
  description: string
): Promise<void> {
  // Deduplicate: if same title exists, just increment vote
  const existing = await findByTitle(title);
  if (existing) {
    await incrementVote(existing.id);
    return;
  }

  await createRoadmapItem({
    title,
    description,
    category: "improvement",
    source: "ai_insight",
    source_detail: "text-extractor",
    status: "backlog",
  });
}
