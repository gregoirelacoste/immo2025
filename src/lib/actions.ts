"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  updateProperty,
  deleteProperty,
} from "@/lib/db";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/lib/scraping/orchestrator";
import { ScrapeResult } from "@/types/scraping";

interface PropertyFormData {
  address: string;
  city: string;
  purchase_price: number;
  surface: number;
  property_type: "ancien" | "neuf";
  description: string;
  loan_amount: number;
  interest_rate: number;
  loan_duration: number;
  personal_contribution: number;
  insurance_rate: number;
  loan_fees: number;
  notary_fees: number;
  monthly_rent: number;
  condo_charges: number;
  property_tax: number;
  vacancy_rate: number;
  airbnb_price_per_night: number;
  airbnb_occupancy_rate: number;
  airbnb_charges: number;
  source_url: string;
}

export async function saveProperty(
  formData: PropertyFormData,
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      ...formData,
      notary_fees:
        formData.notary_fees > 0
          ? formData.notary_fees
          : calculateNotaryFees(formData.purchase_price, formData.property_type),
    };

    if (existingId) {
      updateProperty(existingId, payload);
    } else {
      createProperty(payload);
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeProperty(id: string): Promise<void> {
  deleteProperty(id);
  revalidatePath("/dashboard");
}

export async function scrapePropertyFromUrl(
  url: string
): Promise<ScrapeResult> {
  return scrapeUrl(url);
}
