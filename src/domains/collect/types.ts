import { ScrapedPropertyData } from "@/domains/scraping/types";

/** The 3 modes of data collection */
export type CollectMode = "url" | "text" | "photo";

/** Metadata extracted from a photo */
export interface PhotoMetadata {
  /** Timestamp when photo was taken */
  takenAt: string;
  /** GPS coordinates if available */
  latitude?: number;
  longitude?: number;
  /** Reverse-geocoded address */
  address?: string;
  city?: string;
  postalCode?: string;
}

/** Data extracted from a photo — extends ScrapedPropertyData with monthly_rent */
export interface PhotoExtractedListing extends ScrapedPropertyData {
  monthly_rent?: number;
}

/** Result of photo analysis — may contain multiple listings (vitrine d'agence) */
export interface PhotoExtractionResult {
  isMultiListing: boolean;
  listings: PhotoExtractedListing[];
}

/** Data received from PWA share target (POST multipart) */
export interface ShareData {
  /** Shared URL (if any) */
  url: string;
  /** Shared text content */
  text: string;
  /** Shared title */
  title: string;
  /** Shared images as base64 data URIs */
  images: string[];
  /** Detected source app (leboncoin, seloger, pap, generic) */
  source: ShareSource;
  /** Pre-parsed hints from app-specific parser */
  hints: ShareHints;
  /** Timestamp when share was received */
  receivedAt: number;
}

export type ShareSource = "leboncoin" | "seloger" | "pap" | "generic";

export interface ShareHints {
  price?: number;
  city?: string;
  surface?: number;
  postalCode?: string;
}
