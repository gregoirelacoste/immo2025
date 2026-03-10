import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/db";
import Navbar from "@/components/Navbar";
import PropertyDetail from "@/components/PropertyDetail";

export const dynamic = "force-dynamic";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = getPropertyById(id);

  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PropertyDetail property={property} />
      </main>
    </div>
  );
}
