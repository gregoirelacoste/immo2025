import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { User, UserProfile } from "./types";

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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM user_profile WHERE user_id = ?",
    args: [userId],
  });
  return result.rows[0] ? rowAs<UserProfile>(result.rows[0]) : null;
}

const PROFILE_FIELDS = new Set([
  "monthly_income", "existing_credits", "savings", "max_debt_ratio",
  "target_cities", "min_budget", "max_budget", "target_property_types",
  "default_inputs", "scoring_weights", "alert_thresholds",
]);

export async function upsertUserProfile(
  userId: string,
  data: Partial<Omit<UserProfile, "user_id" | "updated_at">>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Build columns and values for UPSERT
  const setClauses: string[] = ["updated_at = ?"];
  const insertCols = ["user_id", "updated_at"];
  const insertVals: (string | number | null)[] = [userId, now];
  const updateVals: (string | number | null)[] = [now];

  for (const [key, value] of Object.entries(data)) {
    if (!PROFILE_FIELDS.has(key)) continue;
    insertCols.push(key);
    insertVals.push((value ?? null) as string | number | null);
    setClauses.push(`${key} = ?`);
    updateVals.push((value ?? null) as string | number | null);
  }

  const placeholders = insertCols.map(() => "?").join(", ");

  await db.execute({
    sql: `INSERT INTO user_profile (${insertCols.join(", ")})
          VALUES (${placeholders})
          ON CONFLICT(user_id) DO UPDATE SET ${setClauses.join(", ")}`,
    args: [...insertVals, ...updateVals],
  });
}
