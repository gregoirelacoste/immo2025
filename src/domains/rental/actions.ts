"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-actions";
import { getOwnPropertyById } from "@/domains/property/repository";
import { addRentalEntry, deleteRentalEntry, getRentalEntries } from "./repository";

export async function saveRentalEntry(
  propertyId: string,
  data: {
    month: string;
    rent_received: number;
    charges_paid: number;
    vacancy_days: number;
    notes: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const property = await getOwnPropertyById(propertyId, userId);
    if (!property) return { success: false, error: "Bien introuvable ou acces refuse." };

    await addRentalEntry({
      property_id: propertyId,
      user_id: userId,
      month: data.month,
      rent_received: data.rent_received,
      charges_paid: data.charges_paid,
      vacancy_days: data.vacancy_days,
      notes: data.notes,
    });

    revalidatePath(`/property/${propertyId}/rental`);
    revalidatePath("/portfolio");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteRentalEntryAction(
  entryId: string,
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();

    // Verify ownership via rental entries
    const entries = await getRentalEntries(propertyId);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry || entry.user_id !== userId) {
      return { success: false, error: "Entree introuvable ou acces refuse." };
    }

    await deleteRentalEntry(entryId);

    revalidatePath(`/property/${propertyId}/rental`);
    revalidatePath("/portfolio");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
