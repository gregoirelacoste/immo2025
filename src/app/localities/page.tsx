import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserById } from "@/domains/auth/repository";

export default async function LocalitiesPage() {
  // Localities management is admin-only → redirect to /admin
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await getUserById(session.user.id);
  if (user?.role === "admin") {
    redirect("/admin");
  }

  redirect("/dashboard");
}
