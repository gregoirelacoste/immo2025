/**
 * INSEE API client
 * Auth: Bearer token from consumer key/secret (OAuth2 client credentials)
 * Docs: https://api.insee.fr/catalogue
 */

let _cachedToken: { token: string; expiresAt: number } | null = null;

/** Get a Bearer token using OAuth2 client credentials flow */
async function getToken(): Promise<string> {
  const consumerKey = process.env.INSEE_CONSUMER_KEY;
  const consumerSecret = process.env.INSEE_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("INSEE_CONSUMER_KEY / INSEE_CONSUMER_SECRET non configurés");
  }

  // Return cached token if still valid (with 60s margin)
  if (_cachedToken && _cachedToken.expiresAt > Date.now() + 60_000) {
    return _cachedToken.token;
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch("https://api.insee.fr/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`INSEE auth failed: ${res.status}`);
  }

  const data = await res.json();
  _cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
  };

  return _cachedToken.token;
}

/** Make an authenticated request to the INSEE API */
export async function inseeGet(path: string): Promise<Response> {
  const token = await getToken();
  const url = path.startsWith("http") ? path : `https://api.insee.fr${path}`;

  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
    },
  });

  return res;
}

/** Check if INSEE API keys are configured */
export function isInseeConfigured(): boolean {
  return !!(process.env.INSEE_CONSUMER_KEY && process.env.INSEE_CONSUMER_SECRET);
}
