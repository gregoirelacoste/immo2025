export const FAILURE_THRESHOLD = 3;

export const MAX_AI_RETRIES = 3;

export const FETCH_TIMEOUT_MS = 15000;

export const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
];

export const USER_AGENT = USER_AGENTS[0]; // default for backward compat

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export const FETCH_RETRY_COUNT = 1;
export const FETCH_RETRY_DELAY_MS = 2000;

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
