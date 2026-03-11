// Text-only model (cheap) — used for scraping selectors, text extraction, validation
const GEMINI_TEXT_MODEL = "gemini-2.5-flash-lite";

// Vision model (more capable) — used ONLY for photo analysis
const GEMINI_VISION_MODEL = "gemini-2.5-flash-preview-05-20";

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
 */
export async function callGemini(
  prompt: string,
  config: GeminiConfig
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
