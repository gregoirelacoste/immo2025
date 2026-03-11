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
