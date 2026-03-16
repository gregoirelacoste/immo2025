import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPropertyById } from "@/domains/property/repository";
import { getAuthContext } from "@/lib/auth-actions";
import { getUserProfile } from "@/domains/auth/repository";
import { getPhotosForProperty } from "@/domains/photo/repository";
import { getSimulationsForProperty } from "@/domains/simulation/repository";
import Navbar from "@/components/Navbar";
import PropertyDetail from "@/components/property/detail/PropertyDetail";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, isAdmin: admin } = await getAuthContext();

  const { id } = await params;
  const property = await getPropertyById(id, userId, admin);

  if (!property) {
    notFound();
  }

  const isOwner = admin || (!!userId && property.user_id === userId);
  const [userProfile, photos, simulations] = await Promise.all([
    userId ? getUserProfile(userId) : null,
    getPhotosForProperty(id),
    getSimulationsForProperty(id),
  ]);

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
          <PropertyDetail
            property={property}
            isOwner={isOwner}
            userProfile={userProfile}
            photos={photos}
            simulations={simulations}
          />
        </Suspense>
      </main>
    </div>
  );
}
