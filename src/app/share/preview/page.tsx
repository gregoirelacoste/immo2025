import { redirect } from "next/navigation";
import { getShareData } from "@/domains/collect/share-store";
import SharePreview from "@/components/collect/SharePreview";

export default async function SharePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; url?: string; text?: string; title?: string }>;
}) {
  const params = await searchParams;

  // Fast path: URL passed directly in query params (serverless-safe)
  if (params.url) {
    return (
      <main className="min-h-screen bg-[#f4f3ef] px-4 py-6 pb-safe">
        <div className="mx-auto max-w-lg">
          <SharePreview
            url={params.url}
            text={params.text}
            title={params.title}
            imageCount={0}
          />
        </div>
      </main>
    );
  }

  // Fallback: sessionId from in-memory store (images present)
  const sessionId = params.sessionId;

  if (!sessionId) {
    redirect("/dashboard");
  }

  const shareData = getShareData(sessionId);

  if (!shareData) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f4f3ef] px-4 py-6 pb-safe">
      <div className="mx-auto max-w-lg">
        <SharePreview
          sessionId={sessionId}
          url={shareData.url}
          imageCount={shareData.images.length}
        />
      </div>
    </main>
  );
}
