/**
 * Robust JSON extraction from AI responses.
 * Handles Gemini Search grounding artifacts: inline citations [1], footnotes,
 * zero-width characters, trailing commas, and extra prose around JSON blocks.
 */

/**
 * Strip characters and patterns that commonly break JSON parsing
 * from Gemini Search grounding responses.
 */
function sanitizeJsonString(raw: string): string {
  return raw
    // Remove zero-width and invisible Unicode characters
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, "")
    // Remove inline citation markers like [1], [2], [Source 1], etc.
    .replace(/\[(?:Source\s*)?\d+\]/g, "")
    // Remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, "$1");
}

/**
 * Extract the first balanced JSON object from a string.
 * Handles nested braces and strings with escaped characters.
 */
function extractBalancedJson(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return raw.substring(start, i + 1);
    }
  }
  return null;
}

/**
 * Extract and parse a JSON object from an AI response string.
 * Tries multiple strategies in order:
 * 1. Fenced code block (```json ... ```)
 * 2. Balanced brace extraction
 * 3. Greedy brace match
 * Each attempt is tried raw first, then with sanitization.
 *
 * @throws Error if no valid JSON can be extracted
 */
export function extractJsonFromAIResponse<T = Record<string, unknown>>(
  raw: string,
  errorLabel: string
): T {
  const attempts: Array<{ label: string; value: string }> = [];

  // Strategy 1: fenced code block
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) {
    attempts.push({ label: "fenced", value: fencedMatch[1].trim() });
  }

  // Strategy 2: balanced brace extraction
  const balanced = extractBalancedJson(raw);
  if (balanced) {
    attempts.push({ label: "balanced", value: balanced });
  }

  // Strategy 3: greedy brace match (last resort)
  if (!fencedMatch && !balanced) {
    const greedy = raw.match(/\{[\s\S]*\}/);
    if (greedy) {
      attempts.push({ label: "greedy", value: greedy[0].trim() });
    }
  }

  // Try each attempt: first raw, then sanitized
  for (const { label, value } of attempts) {
    // Try raw
    try {
      return JSON.parse(value) as T;
    } catch { /* continue */ }

    // Try sanitized
    try {
      return JSON.parse(sanitizeJsonString(value)) as T;
    } catch {
      console.warn(`[extractJsonFromAIResponse] ${label} attempt failed for ${errorLabel}`);
    }
  }

  // Log for debugging
  console.error(
    `[extractJsonFromAIResponse] All parse attempts failed for ${errorLabel}. Raw (first 800 chars):`,
    raw.substring(0, 800)
  );
  throw new Error(`Échec du parsing de la réponse IA (${errorLabel})`);
}
