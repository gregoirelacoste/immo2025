import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import {
  getOwnPropertyById,
  getOrphanPropertyById,
  getPropertyByIdPublic,
} from "@/domains/property/repository";
import { getAuthContext } from "@/lib/auth-actions";
import { getUserProfile } from "@/domains/auth/repository";
import { DEFAULT_INPUTS, mergeDefaults } from "@/domains/auth/defaults";
import { getAllEquipments } from "@/domains/property/equipment-service";
import Navbar from "@/components/Navbar";
import PropertyForm from "@/components/property/form/PropertyForm";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, isAdmin: admin } = await getAuthContext();

  // Load user defaults if authenticated
  let defaultInputs = DEFAULT_INPUTS;
  if (userId) {
    const profile = await getUserProfile(userId);
    if (profile) {
      defaultInputs = mergeDefaults(DEFAULT_INPUTS, profile.default_inputs);
    }
  }

  const equipments = await getAllEquipments();

  // Orphaned property (no owner) — anyone may edit it.
  const orphan = await getOrphanPropertyById(id);
  if (orphan) {
    return (
      <div className="min-h-screen bg-[#f4f3ef]">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">
            Modifier le bien
          </h1>
          <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
            <PropertyForm existingProperty={orphan} defaultInputs={defaultInputs} equipments={equipments} />
          </Suspense>
        </main>
      </div>
    );
  }

  // Owned property — require auth and verify ownership (admin can edit any).
  if (!userId) redirect("/login");

  const property = admin
    ? await getPropertyByIdPublic(id)
    : await getOwnPropertyById(id, userId);

  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">
          Modifier le bien
        </h1>
        <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
          <PropertyForm existingProperty={property} defaultInputs={defaultInputs} equipments={equipments} />
        </Suspense>
      </main>
    </div>
  );
}
