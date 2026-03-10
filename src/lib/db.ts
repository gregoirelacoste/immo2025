import { createClient, Client, Row } from "@libsql/client";
import { Property } from "@/types/property";
import { User } from "@/types/user";
import { ScrapingManifest } from "@/types/scraping";

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:data.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

async function getDb(): Promise<Client> {
  const client = getClient();
  if (!_initialized) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT DEFAULT '',
        password_hash TEXT DEFAULT '',
        plan TEXT NOT NULL DEFAULT 'free',
        stripe_customer_id TEXT DEFAULT '',
        image TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        address TEXT DEFAULT '',
        city TEXT NOT NULL,
        postal_code TEXT DEFAULT '',
        purchase_price REAL NOT NULL DEFAULT 0,
        surface REAL NOT NULL DEFAULT 0,
        property_type TEXT NOT NULL DEFAULT 'ancien' CHECK (property_type IN ('ancien', 'neuf')),
        description TEXT DEFAULT '',
        loan_amount REAL NOT NULL DEFAULT 0,
        interest_rate REAL NOT NULL DEFAULT 3.5,
        loan_duration INTEGER NOT NULL DEFAULT 20,
        personal_contribution REAL DEFAULT 0,
        insurance_rate REAL DEFAULT 0.34,
        loan_fees REAL DEFAULT 0,
        notary_fees REAL DEFAULT 0,
        monthly_rent REAL DEFAULT 0,
        condo_charges REAL DEFAULT 0,
        property_tax REAL DEFAULT 0,
        vacancy_rate REAL DEFAULT 5,
        airbnb_price_per_night REAL DEFAULT 0,
        airbnb_occupancy_rate REAL DEFAULT 60,
        airbnb_charges REAL DEFAULT 0,
        source_url TEXT DEFAULT '',
        image_urls TEXT DEFAULT '[]',
        prefill_sources TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS scraping_manifests (
        id TEXT PRIMARY KEY,
        site_hostname TEXT NOT NULL,
        page_pattern TEXT NOT NULL DEFAULT '*',
        selectors TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        sample_url TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(site_hostname, page_pattern)
      );
    `);

    // Migrations
    for (const stmt of [
      "ALTER TABLE properties ADD COLUMN image_urls TEXT DEFAULT '[]'",
      "ALTER TABLE properties ADD COLUMN postal_code TEXT DEFAULT ''",
      "ALTER TABLE properties ADD COLUMN prefill_sources TEXT DEFAULT '{}'",
      "ALTER TABLE properties ADD COLUMN user_id TEXT NOT NULL DEFAULT ''",
      "CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id)",
    ]) {
      try { await client.execute(stmt); } catch { /* already exists */ }
    }

    _initialized = true;
  }
  return client;
}

function rowAs<T>(row: Row): T {
  return row as unknown as T;
}

// ─── Users ───

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

// ─── Properties (scoped by user_id) ───

export async function getAllProperties(userId: string): Promise<Property[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });
  return result.rows.map((r) => rowAs<Property>(r));
}

export async function getPropertyById(
  id: string,
  userId: string
): Promise<Property | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

export async function getPropertyBySourceUrl(
  sourceUrl: string,
  userId: string
): Promise<Property | undefined> {
  if (!sourceUrl) return undefined;
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM properties WHERE source_url = ? AND user_id = ? LIMIT 1",
    args: [sourceUrl, userId],
  });
  return result.rows[0] ? rowAs<Property>(result.rows[0]) : undefined;
}

export async function createProperty(
  property: Omit<Property, "id" | "created_at" | "updated_at">
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO properties (
        id, user_id, address, city, postal_code, purchase_price, surface, property_type, description,
        loan_amount, interest_rate, loan_duration, personal_contribution,
        insurance_rate, loan_fees, notary_fees, monthly_rent, condo_charges,
        property_tax, vacancy_rate, airbnb_price_per_night, airbnb_occupancy_rate,
        airbnb_charges, source_url, image_urls, prefill_sources, created_at, updated_at
      ) VALUES (
        $id, $user_id, $address, $city, $postal_code, $purchase_price, $surface, $property_type, $description,
        $loan_amount, $interest_rate, $loan_duration, $personal_contribution,
        $insurance_rate, $loan_fees, $notary_fees, $monthly_rent, $condo_charges,
        $property_tax, $vacancy_rate, $airbnb_price_per_night, $airbnb_occupancy_rate,
        $airbnb_charges, $source_url, $image_urls, $prefill_sources, $created_at, $updated_at
      )
    `,
    args: { ...property, id, created_at: now, updated_at: now },
  });

  return id;
}

export async function updateProperty(
  id: string,
  userId: string,
  property: Omit<Property, "id" | "user_id" | "created_at" | "updated_at">
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE properties SET
        address = $address, city = $city, postal_code = $postal_code,
        purchase_price = $purchase_price, surface = $surface,
        property_type = $property_type, description = $description,
        loan_amount = $loan_amount, interest_rate = $interest_rate,
        loan_duration = $loan_duration, personal_contribution = $personal_contribution,
        insurance_rate = $insurance_rate, loan_fees = $loan_fees,
        notary_fees = $notary_fees, monthly_rent = $monthly_rent,
        condo_charges = $condo_charges, property_tax = $property_tax,
        vacancy_rate = $vacancy_rate, airbnb_price_per_night = $airbnb_price_per_night,
        airbnb_occupancy_rate = $airbnb_occupancy_rate, airbnb_charges = $airbnb_charges,
        source_url = $source_url, image_urls = $image_urls,
        prefill_sources = $prefill_sources, updated_at = $updated_at
      WHERE id = $id AND user_id = $user_id
    `,
    args: { ...property, id, user_id: userId, updated_at: now },
  });
}

export async function deleteProperty(id: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM properties WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

// ─── Scraping Manifests (shared across users) ───

export async function getManifestByHostname(
  hostname: string
): Promise<ScrapingManifest | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM scraping_manifests WHERE site_hostname = ? ORDER BY updated_at DESC LIMIT 1",
    args: [hostname],
  });
  return result.rows[0] ? rowAs<ScrapingManifest>(result.rows[0]) : undefined;
}

export async function upsertManifest(data: {
  site_hostname: string;
  page_pattern: string;
  selectors: string;
  sample_url: string;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.execute({
    sql: "SELECT id, version FROM scraping_manifests WHERE site_hostname = ? AND page_pattern = ?",
    args: [data.site_hostname, data.page_pattern],
  });

  if (existing.rows[0]) {
    const row = existing.rows[0] as unknown as { id: string; version: number };
    await db.execute({
      sql: `UPDATE scraping_manifests SET
              selectors = $selectors, version = $version,
              success_count = 0, failure_count = 0,
              sample_url = $sample_url, updated_at = $updated_at
            WHERE id = $id`,
      args: { id: row.id, selectors: data.selectors, version: row.version + 1, sample_url: data.sample_url, updated_at: now },
    });
  } else {
    await db.execute({
      sql: `INSERT INTO scraping_manifests (id, site_hostname, page_pattern, selectors, version, success_count, failure_count, sample_url, created_at, updated_at)
            VALUES ($id, $site_hostname, $page_pattern, $selectors, 1, 0, 0, $sample_url, $created_at, $updated_at)`,
      args: { id: crypto.randomUUID(), ...data, created_at: now, updated_at: now },
    });
  }
}

export async function incrementManifestSuccess(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE scraping_manifests SET success_count = success_count + 1 WHERE id = ?",
    args: [id],
  });
}

export async function incrementManifestFailure(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE scraping_manifests SET failure_count = failure_count + 1 WHERE id = ?",
    args: [id],
  });
}
