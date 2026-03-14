import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPropertyById } from "@/domains/property/repository";
import { getUserProfile } from "@/domains/auth/repository";
import { getPhotosForProperty } from "@/domains/photo/repository";
import Navbar from "@/components/Navbar";
import PropertyForm from "@/components/property/form/PropertyForm";

export const dynamic = "force-dynamic";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const { id } = await params;
  const property = await getPropertyById(id, userId);

  if (!property) {
    notFound();
  }

  const isOwner = !!userId && property.user_id === userId;
  const [userProfile, photos] = await Promise.all([
    userId ? getUserProfile(userId) : null,
    getPhotosForProperty(id),
  ]);

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
          <PropertyForm
            existingProperty={property}
            readOnly
            isOwner={isOwner}
            userProfile={userProfile}
            photos={photos}
          />
        </Suspense>
      </main>
    </div>
  );
}
