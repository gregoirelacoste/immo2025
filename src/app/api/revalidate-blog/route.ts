import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/revalidate-blog
 * Revalide les pages blog après publication d'un article.
 * Protégé par REVALIDATE_SECRET.
 */
export async function POST(request: NextRequest) {
  const { secret, slug } = await request.json().catch(() => ({ secret: "", slug: "" }));

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidatePath("/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }

  return NextResponse.json({ revalidated: true, slug: slug || null });
}
