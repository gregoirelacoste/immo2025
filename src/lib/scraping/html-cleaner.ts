import { MAX_HTML_FOR_AI } from "./constants";

/**
 * Nettoie le HTML avant envoi à l'IA.
 * Retire scripts, styles, SVG, attributs inutiles, et tronque.
 */
export function cleanHtmlForAi(html: string): string {
  let cleaned = html;

  // Retirer les balises non pertinentes et leur contenu
  // Utilisation de regex gourmands avec gestion des imbrications
  const tagsToRemove = ["script", "style", "svg", "noscript", "iframe"];
  for (const tag of tagsToRemove) {
    // Gère les cas où le contenu contient des sous-balises ou des chaînes comme "</script>"
    const regex = new RegExp(
      `<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`,
      "gi"
    );
    // Appliquer plusieurs fois pour les scripts imbriqués
    let prev = "";
    while (prev !== cleaned) {
      prev = cleaned;
      cleaned = cleaned.replace(regex, "");
    }
  }

  // Balises auto-fermantes (link, meta, etc.)
  cleaned = cleaned.replace(
    /<(link|meta)[^>]*\/?>/gi,
    ""
  );

  // Retirer les commentaires HTML
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // Retirer les attributs non pertinents mais garder class, id, data-*, href, src, content
  cleaned = cleaned.replace(
    /\s(on\w+|style|tabindex|aria-\w+|role|loading|decoding|fetchpriority|sizes|srcset|integrity|crossorigin|nonce)="[^"]*"/gi,
    ""
  );

  // Compresser les espaces multiples
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/>\s+</g, "><");

  // Extraire le body en priorité
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    cleaned = bodyMatch[1];
  }

  // Retirer le header et footer si présents (garder le contenu principal)
  cleaned = cleaned.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  cleaned = cleaned.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");

  // Tronquer si trop long
  if (cleaned.length > MAX_HTML_FOR_AI) {
    cleaned = cleaned.slice(0, MAX_HTML_FOR_AI);
  }

  return cleaned.trim();
}
