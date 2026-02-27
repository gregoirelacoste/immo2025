import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Property } from "@/types/property";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardClient properties={(properties as Property[]) || []} />
      </main>
    </div>
  );
}
