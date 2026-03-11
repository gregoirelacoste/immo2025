const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiConfig {
  maxOutputTokens: number;
  temperature: number;
  responseMimeType?: string;
}

/**
 * Single HTTP wrapper for the Gemini generateContent API.
 * Validates the API key, sends the prompt, and returns the raw text response.
 * Throws on HTTP error or empty response.
 */
export async function callGemini(
  prompt: string,
  config: GeminiConfig
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante. Ajoutez-la dans .env.local");
  }

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
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
