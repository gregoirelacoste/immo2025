import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getOwnPropertyById,
  getOrphanPropertyById,
} from "@/domains/property/repository";
import { getUserProfile } from "@/domains/auth/repository";
import { DEFAULT_INPUTS, mergeDefaults } from "@/domains/auth/defaults";
import Navbar from "@/components/Navbar";
import PropertyForm from "@/components/property/form/PropertyForm";

export const dynamic = "force-dynamic";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  // Load user defaults if authenticated
  let defaultInputs = DEFAULT_INPUTS;
  if (session?.user?.id) {
    const profile = await getUserProfile(session.user.id);
    if (profile) {
      defaultInputs = mergeDefaults(DEFAULT_INPUTS, profile.default_inputs);
    }
  }

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
            <PropertyForm existingProperty={orphan} defaultInputs={defaultInputs} />
          </Suspense>
        </main>
      </div>
    );
  }

  // Owned property — require auth and verify ownership.
  if (!session?.user?.id) redirect("/login");

  const property = await getOwnPropertyById(id, session.user.id);

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
          <PropertyForm existingProperty={property} defaultInputs={defaultInputs} />
        </Suspense>
      </main>
    </div>
  );
}
