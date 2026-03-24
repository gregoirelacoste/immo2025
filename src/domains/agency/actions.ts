"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-actions";
import {
  createAgency,
  updateAgency,
  deleteAgency,
  getAgenciesByCity,
  getAgencyById,
  getAllAgencies,
  getAgencyCities,
} from "./repository";
import { Agency, AgencyFormData } from "./types";

export async function saveAgencyAction(
  data: AgencyFormData
): Promise<{ id?: string; error?: string }> {
  try {
    const userId = await requireUserId();
    const id = crypto.randomUUID();
    const agency: Agency = {
      ...data,
      id,
      user_id: userId,
      created_at: "",
      updated_at: "",
    };
    await createAgency(agency);
    revalidatePath("/agencies");
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function updateAgencyAction(
  id: string,
  data: Partial<AgencyFormData>
): Promise<{ error?: string }> {
  try {
    await requireUserId();
    await updateAgency(id, data);
    revalidatePath("/agencies");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function deleteAgencyAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireUserId();
    await deleteAgency(id);
    revalidatePath("/agencies");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}

export async function getAgenciesByCityAction(city: string): Promise<Agency[]> {
  return getAgenciesByCity(city);
}

export async function getAgencyByIdAction(id: string): Promise<Agency | undefined> {
  return getAgencyById(id);
}

export async function getAllAgenciesAction(): Promise<Agency[]> {
  return getAllAgencies();
}

export async function getAgencyCitiesAction(): Promise<Array<{ city: string; count: number }>> {
  return getAgencyCities();
}

export async function scrapeAgenciesAction(
  city: string
): Promise<{ added: number; total: number; error?: string }> {
  try {
    const userId = await requireUserId();
    const { scrapeAgenciesForCity } = await import("./scraper");
    const result = await scrapeAgenciesForCity(city, userId);
    if (result.added > 0) {
      revalidatePath("/agencies");
    }
    return result;
  } catch (e) {
    return { added: 0, total: 0, error: e instanceof Error ? e.message : "Erreur inconnue" };
  }
}
