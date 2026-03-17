import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/blog", "/guide"],
        disallow: ["/api/", "/admin/", "/property/", "/dashboard", "/login", "/register", "/profile", "/portfolio", "/compare", "/share", "/localities"],
      },
      // Autoriser les bots IA (Gemini, ChatGPT, Perplexity)
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Google-Extended", allow: ["/blog", "/guide"] },
      { userAgent: "GPTBot", allow: ["/blog", "/guide"] },
      { userAgent: "ChatGPT-User", allow: ["/blog", "/guide"] },
      { userAgent: "PerplexityBot", allow: ["/blog", "/guide"] },
      { userAgent: "ClaudeBot", allow: ["/blog", "/guide"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
