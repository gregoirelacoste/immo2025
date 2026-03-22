import { NextRequest, NextResponse } from "next/server";
import { storeShareData } from "@/domains/collect/share-store";
import { parseShareHints, isSearchUrl } from "@/domains/scraping/app-parsers";
import { ShareData } from "@/domains/collect/types";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per image
const MAX_IMAGES = 5;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const url = (formData.get("url") as string) || "";
    const text = (formData.get("text") as string) || "";
    const title = (formData.get("title") as string) || "";

    // Extract URL from text if not provided directly (Android behavior)
    let resolvedUrl = url;
    if (!resolvedUrl && text) {
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) resolvedUrl = urlMatch[0];
    }

    // Parse images from multipart
    const imageFiles = formData.getAll("images") as File[];
    const images: string[] = [];

    for (const file of imageFiles.slice(0, MAX_IMAGES)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_SIZE) continue;

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      images.push(`data:${file.type};base64,${base64}`);
    }

    // Detect source app and extract hints
    const { source, hints } = parseShareHints(resolvedUrl, text, title);

    // Search URL path: bookmark the search instead of scraping a property
    if (resolvedUrl && isSearchUrl(resolvedUrl)) {
      const target = new URL("/share/search", request.url);
      target.searchParams.set("url", resolvedUrl);
      if (title) target.searchParams.set("title", title);
      return NextResponse.redirect(target, 303);
    }

    // Fast path: URL-only share → pass URL in query params (serverless-safe)
    if (resolvedUrl && images.length === 0) {
      const target = new URL("/share/preview", request.url);
      target.searchParams.set("url", resolvedUrl);
      if (text && text !== resolvedUrl) target.searchParams.set("text", text);
      if (title) target.searchParams.set("title", title);
      return NextResponse.redirect(target, 303);
    }

    // Full path: images present → use in-memory store (works in single-process only)
    const shareData: ShareData = {
      url: resolvedUrl,
      text,
      title,
      images,
      source,
      hints,
      receivedAt: Date.now(),
    };

    const sessionId = storeShareData(shareData);

    return NextResponse.redirect(
      new URL(`/share/preview?sessionId=${sessionId}`, request.url),
      303
    );
  } catch {
    // Fallback: redirect to dashboard on error
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }
}
