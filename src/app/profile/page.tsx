import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-actions";
import { getUserProfile, getUserById } from "@/domains/auth/repository";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/profile/ProfileForm";
import AccountCard from "@/components/profile/AccountCard";

export default async function ProfilePage() {
  const { userId } = await getAuthContext();
  if (!userId) redirect("/login");

  const [user, profile] = await Promise.all([
    getUserById(userId),
    getUserProfile(userId),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f4f3ef]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">
          Mon profil
        </h1>
        <AccountCard user={{ name: user.name, email: user.email, image: user.image, role: user.role, plan: user.plan, created_at: user.created_at }} />
        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
