import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { User } from "./types";

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });
  return result.rows[0] ? rowAs<User>(result.rows[0]) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });
  return result.rows[0] ? rowAs<User>(result.rows[0]) : undefined;
}

export async function createUser(user: {
  email: string;
  name: string;
  password_hash: string;
  image?: string;
}): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO users (id, email, name, password_hash, image, created_at)
          VALUES ($id, $email, $name, $password_hash, $image, $created_at)`,
    args: { id, email: user.email, name: user.name, password_hash: user.password_hash, image: user.image || "", created_at: now },
  });

  return id;
}

export async function upsertOAuthUser(user: {
  email: string;
  name: string;
  image: string;
}): Promise<User> {
  const db = await getDb();
  const existing = await getUserByEmail(user.email);

  if (existing) {
    await db.execute({
      sql: "UPDATE users SET name = $name, image = $image WHERE id = $id",
      args: { id: existing.id, name: user.name || existing.name, image: user.image || existing.image },
    });
    return { ...existing, name: user.name || existing.name, image: user.image || existing.image };
  }

  const id = await createUser({ ...user, password_hash: "" });
  return {
    id, email: user.email, name: user.name, password_hash: "",
    plan: "free" as const, stripe_customer_id: "", image: user.image,
    created_at: new Date().toISOString(),
  };
}
