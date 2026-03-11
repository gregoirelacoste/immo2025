import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import PropertyForm from "@/components/property/form/PropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Ajouter un bien
        </h1>
        <Suspense fallback={<div className="text-gray-400">Chargement...</div>}>
          <PropertyForm />
        </Suspense>
      </main>
    </div>
  );
}
