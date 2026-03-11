"use server";

import { CollectInput, CollectResult } from "@/domains/collect/types";
import {
  scrapeAndSaveProperty,
  createPropertyFromText,
} from "@/domains/scraping/actions";

/**
 * Single entry point for all property data collection.
 * Delegates to the appropriate existing action based on the mode.
 */
export async function collectProperty(
  input: CollectInput
): Promise<CollectResult> {
  switch (input.mode) {
    case "url":
      return collectFromUrl(input);
    case "text":
      return collectFromText(input);
    case "photo":
      return collectFromPhoto();
  }
}

async function collectFromUrl(input: CollectInput): Promise<CollectResult> {
  if (!input.url) {
    return { success: false, error: "URL manquante", mode: "url" };
  }

  try {
    const result = await scrapeAndSaveProperty(input.url);
    return {
      success: result.propertyId != null,
      propertyId: result.propertyId,
      error: result.error,
      warning: result.warning,
      mode: "url",
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      mode: "url",
    };
  }
}

async function collectFromText(input: CollectInput): Promise<CollectResult> {
  if (!input.text || input.text.trim().length < 10) {
    return {
      success: false,
      error: "Texte trop court pour extraire des données",
      mode: "text",
    };
  }

  try {
    const result = await createPropertyFromText(input.text);
    return {
      success: result.propertyId != null,
      propertyId: result.propertyId,
      error: result.error,
      mode: "text",
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      mode: "text",
    };
  }
}

async function collectFromPhoto(): Promise<CollectResult> {
  return {
    success: false,
    error: "Mode photo bientôt disponible",
    mode: "photo",
  };
}
