import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Property } from "@/types/property";
import Navbar from "@/components/Navbar";
import PropertyForm from "@/components/PropertyForm";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!property) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Modifier le bien
        </h1>
        <PropertyForm existingProperty={property as Property} />
      </main>
    </div>
  );
}
