import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserProfile } from "@/domains/auth/repository";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/profile/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getUserProfile(session.user.id);

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">
          Mon profil
        </h1>
        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
