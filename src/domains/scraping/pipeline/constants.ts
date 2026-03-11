export const FAILURE_THRESHOLD = 3;

export const MAX_AI_RETRIES = 3;

export const FETCH_TIMEOUT_MS = 15000;

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const MAX_HTML_FOR_AI = 40000; // caractères max envoyés à l'IA

export const REQUIRED_FIELDS = ["purchase_price", "surface"] as const;

export const PROPERTY_FIELDS = [
  "purchase_price",
  "surface",
  "city",
  "postal_code",
  "address",
  "description",
  "property_type",
] as const;
