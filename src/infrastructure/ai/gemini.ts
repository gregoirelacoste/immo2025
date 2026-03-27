// Text-only model (cheap) — used for scraping selectors, text extraction, validation
const GEMINI_TEXT_MODEL = "gemini-2.5-flash-lite";

// Vision model (more capable) — used ONLY for photo analysis
const GEMINI_VISION_MODEL = "gemini-2.5-flash";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiConfig {
  maxOutputTokens: number;
  temperature: number;
  responseMimeType?: string;
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante. Ajoutez-la dans .env.local");
  }
  return apiKey;
}

/**
 * Text-only Gemini call (flash-lite, cheap).
 * Used for scraping, text extraction, validation.
 * Set `model: "capable"` to use the more powerful flash model instead of flash-lite.
 */
export async function callGemini(
  prompt: string,
  config: GeminiConfig & { model?: "lite" | "capable" }
): Promise<string> {
  const apiKey = getApiKey();
  const modelId = config.model === "capable" ? GEMINI_VISION_MODEL : GEMINI_TEXT_MODEL;

  const response = await fetch(
    `${GEMINI_API_BASE}/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
          ...(config.responseMimeType
            ? { responseMimeType: config.responseMimeType }
            : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text: string =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text.trim()) {
    throw new Error("L'IA a retourné une réponse vide");
  }

  return text;
}

/**
 * Vision Gemini call (flash, more capable).
 * Used ONLY for photo/screenshot analysis.
 * Accepts a base64-encoded image + text prompt.
 */
export async function callGeminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  config: GeminiConfig
): Promise<string> {
  const apiKey = getApiKey();

  // Strip data URL prefix if present (e.g. "data:image/jpeg;base64,...")
  const cleanBase64 = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
          ...(config.responseMimeType
            ? { responseMimeType: config.responseMimeType }
            : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const text: string =
    result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text.trim()) {
    throw new Error("L'IA Vision a retourné une réponse vide");
  }

  return text;
}

/**
 * Gemini call with Google Search grounding (flash, capable model).
 * Used for neighborhood research — fetches real-time web data.
 * NOTE: responseMimeType is NOT supported with grounding — JSON must be parsed from text.
 */
export async function callGeminiWithSearch(
  prompt: string,
  config: Omit<GeminiConfig, "responseMimeType">
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_VISION_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Search API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  const candidate = result?.candidates?.[0];

  // Detect blocked or filtered responses
  const finishReason = candidate?.finishReason;
  const blockReason = result?.promptFeedback?.blockReason;
  if (blockReason) {
    console.error("[callGeminiWithSearch] Prompt blocked:", blockReason);
    throw new Error(`L'IA a bloqué la requête (${blockReason})`);
  }
  if (finishReason && finishReason !== "STOP") {
    console.warn("[callGeminiWithSearch] Non-STOP finishReason:", finishReason);
  }

  if (!candidate?.content?.parts) {
    console.error("[callGeminiWithSearch] Unexpected response structure:", JSON.stringify(result).substring(0, 1000));
  }

  // Grounding responses may have multiple parts (text + metadata) — collect all text
  const parts = candidate?.content?.parts;
  const text: string = Array.isArray(parts)
    ? parts.filter((p: { text?: string }) => p.text).map((p: { text: string }) => p.text).join("")
    : "";

  if (!text.trim()) {
    console.error("[callGeminiWithSearch] Empty text. finishReason:", finishReason, "Full response:", JSON.stringify(result).substring(0, 2000));
    throw new Error("L'IA (recherche web) a retourné une réponse vide");
  }

  return text;
}
