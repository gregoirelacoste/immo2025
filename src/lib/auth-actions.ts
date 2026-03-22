"use server";

import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { getUserByEmail, createUser } from "@/domains/auth/repository";
import type { UserRole } from "@/domains/auth/types";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

export async function getOptionalUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || "";
}

export async function getUserRole(): Promise<UserRole> {
  const session = await auth();
  if (!session?.user?.id) return "user";
  // Role is already stored in the JWT token and exposed via session callback
  const role = (session.user as unknown as Record<string, unknown>).role as UserRole | undefined;
  return role || "user";
}

export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const role = (session.user as unknown as Record<string, unknown>).role as string | undefined;
  if (role !== "admin") throw new Error("Accès réservé aux administrateurs");
  return session.user.id;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin";
}

/** Returns userId, admin and premium status from a single auth() call — avoids duplicate session lookups */
export async function getAuthContext(): Promise<{ userId: string | undefined; isAdmin: boolean; isPremium: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { userId: undefined, isAdmin: false, isPremium: false };
  const role = (session.user as unknown as Record<string, unknown>).role as string | undefined;
  return { userId, isAdmin: role === "admin", isPremium: role === "premium" || role === "admin" };
}

export async function loginWithCredentials(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: (formData.get("callbackUrl") as string) || "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw error; // redirect errors from signIn
  }
}

export async function loginWithGoogle(callbackUrl?: string) {
  await signIn("google", { redirectTo: callbackUrl || "/dashboard" });
}

export async function registerUser(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!email || !password || !name) {
    return { error: "Tous les champs sont requis." };
  }
  if (password.length < 8) {
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  }
  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await createUser({ email, name, password_hash: passwordHash });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Erreur lors de la connexion automatique." };
    }
    throw error;
  }
}
