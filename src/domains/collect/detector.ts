import { CollectMode } from "@/domains/collect/types";

/** Auto-detect the collection mode from raw user input */
export function detectCollectMode(input: string): CollectMode {
  const trimmed = input.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return "url";
  }

  if (trimmed.startsWith("data:image") || isBase64Image(trimmed)) {
    return "photo";
  }

  return "text";
}

/** Check if a string looks like base64-encoded image data */
function isBase64Image(input: string): boolean {
  // Base64 images are typically long strings of alphanumeric + /+=
  // with no spaces or newlines in the first chunk
  if (input.length < 100) return false;
  const firstChunk = input.slice(0, 100);
  return /^[A-Za-z0-9+/=]+$/.test(firstChunk);
}
