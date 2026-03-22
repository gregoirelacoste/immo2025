import { redirect } from "next/navigation";
import { isSearchUrl } from "@/domains/scraping/app-parsers";

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>;
}) {
  const params = await searchParams;

  // Extraire l'URL : Android la met souvent dans "text", iOS dans "url"
  let url = params.url || "";
  const text = params.text || "";
  const title = params.title || "";

  if (!url && text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      url = urlMatch[0];
    }
  }

  // Search URL → bookmark instead of creating a property
  if (url && isSearchUrl(url)) {
    const searchRedirectParams = new URLSearchParams();
    searchRedirectParams.set("url", url);
    if (title) searchRedirectParams.set("title", title);
    redirect(`/share/search?${searchRedirectParams.toString()}`);
  }

  // Combiner titre + texte pour l'IA (infos partagées par l'app source)
  const combinedText = [title, text].filter(Boolean).join("\n");

  const redirectParams = new URLSearchParams();
  if (url) redirectParams.set("url", url);
  if (combinedText) redirectParams.set("sharedText", combinedText);

  redirect(`/property/new?${redirectParams.toString()}`);
}
