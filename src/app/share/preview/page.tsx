import { redirect } from "next/navigation";
import { getShareData } from "@/domains/collect/share-store";
import SharePreview from "@/components/collect/SharePreview";

export default async function SharePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.sessionId;

  if (!sessionId) {
    redirect("/dashboard");
  }

  const shareData = getShareData(sessionId);

  if (!shareData) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 pb-safe">
      <div className="mx-auto max-w-lg">
        <SharePreview sessionId={sessionId} initialData={shareData} />
      </div>
    </main>
  );
}
