import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ProfileClient from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ProfileClient user={session.user} />
    </div>
  );
}
