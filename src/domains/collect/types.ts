/** The 3 modes of data collection */
export type CollectMode = "url" | "text" | "photo";

/** Input for the collect pipeline */
export interface CollectInput {
  mode: CollectMode;
  /** URL for "url" mode */
  url?: string;
  /** Raw text for "text" mode */
  text?: string;
  /** Base64 image data for "photo" mode */
  imageData?: string;
  /** Photo metadata */
  photoMeta?: PhotoMetadata;
}

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

/** Result of data collection */
export interface CollectResult {
  success: boolean;
  propertyId?: string;
  error?: string;
  warning?: string;
  mode: CollectMode;
  /** What data was extracted */
  extractedFields?: string[];
}
