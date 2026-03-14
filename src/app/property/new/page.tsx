import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getUserProfile } from "@/domains/auth/repository";
import { DEFAULT_INPUTS, mergeDefaults } from "@/domains/auth/defaults";
import Navbar from "@/components/Navbar";
import PropertyForm from "@/components/property/form/PropertyForm";

export default async function NewPropertyPage() {
  const session = await auth();
  let defaultInputs = DEFAULT_INPUTS;

  if (session?.user?.id) {
    const profile = await getUserProfile(session.user.id);
    if (profile) {
      defaultInputs = mergeDefaults(DEFAULT_INPUTS, profile.default_inputs);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">
          Ajouter un bien
        </h1>
        <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
          <PropertyForm defaultInputs={defaultInputs} />
        </Suspense>
      </main>
    </div>
  );
}
