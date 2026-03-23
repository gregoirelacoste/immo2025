"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireUserId } from "@/lib/auth-actions";
import { createProperty } from "@/domains/property/repository";
import { addPhoto } from "./repository";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "photos");

async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city: string; postal_code: string }> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}&limit=1`
    );
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) throw new Error("No result");

    const props = feature.properties;
    return {
      address: props.name || props.label || "",
      city: props.city || "",
      postal_code: props.postcode || "",
    };
  } catch {
    return { address: "", city: "", postal_code: "" };
  }
}

export async function createPropertyFromPhoto(
  formData: FormData
): Promise<{ propertyId: string | null; error?: string }> {
  try {
    const userId = await requireUserId();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { propertyId: null, error: "Aucune photo fournie." };
    }

    const latStr = formData.get("latitude") as string;
    const lngStr = formData.get("longitude") as string;
    const latitude = latStr ? parseFloat(latStr) : 0;
    const longitude = lngStr ? parseFloat(lngStr) : 0;

    // Save the photo file
    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(filePath, bytes);
    const photoUrl = `/uploads/photos/${filename}`;

    // Reverse geocode
    let address = "";
    let city = "Nouveau bien";
    let postal_code = "";
    if (latitude && longitude) {
      const geo = await reverseGeocode(latitude, longitude);
      address = geo.address;
      city = geo.city || "Nouveau bien";
      postal_code = geo.postal_code;
    }

    // Create minimal property
    const propertyId = await createProperty({
      user_id: userId,
      visibility: "private",
      address,
      city,
      postal_code,
      purchase_price: 0,
      negotiated_price: 0,
      surface: 0,
      room_count: 0,
      property_type: "ancien",
      description: "",
      neighborhood: "",
      loan_amount: 0,
      interest_rate: 3.5,
      loan_duration: 20,
      personal_contribution: 0,
      insurance_rate: 0.34,
      loan_fees: 0,
      notary_fees: 0,
      rent_mode: "auto",
      rent_per_m2: 0,
      monthly_rent: 0,
      condo_charges: 0,
      property_tax: 0,
      vacancy_rate: 5,
      airbnb_price_per_night: 0,
      airbnb_occupancy_rate: 60,
      airbnb_charges: 0,
      renovation_cost: 0,
      dpe_rating: null,
      fiscal_regime: "micro_bic",
      amenities: "[]",
      meuble_status: "non_meuble",
      furniture_cost: 0,
      pno_insurance: 200,
      gli_rate: 0,
      maintenance_per_m2: 12,
      source_url: "",
      image_urls: JSON.stringify([photoUrl]),
      prefill_sources: "{}",
    });

    // Save photo in photos table
    await addPhoto({
      property_id: propertyId,
      user_id: userId,
      url: photoUrl,
      thumbnail_url: photoUrl,
      source: "camera",
      tag: "facade",
      note: "Photo de rue",
      latitude: latitude || null,
      longitude: longitude || null,
      width: null,
      height: null,
    });

    revalidatePath("/dashboard");
    return { propertyId };
  } catch (e) {
    console.error("createPropertyFromPhoto error:", e);
    return { propertyId: null, error: (e as Error).message };
  }
}
