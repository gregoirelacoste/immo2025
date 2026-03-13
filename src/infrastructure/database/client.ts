import { createClient, Client } from "@libsql/client";

let _client: Client | null = null;
let _initialized = false;

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:data.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export async function getDb(): Promise<Client> {
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
        visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
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
      "ALTER TABLE properties ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'",
      "CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_properties_visibility ON properties(visibility)",
      "ALTER TABLE properties ADD COLUMN latitude REAL DEFAULT NULL",
      "ALTER TABLE properties ADD COLUMN longitude REAL DEFAULT NULL",
      "ALTER TABLE properties ADD COLUMN market_data TEXT DEFAULT ''",
      "ALTER TABLE properties ADD COLUMN investment_score REAL DEFAULT NULL",
      "ALTER TABLE properties ADD COLUMN score_breakdown TEXT DEFAULT '{}'",
      "ALTER TABLE properties ADD COLUMN enrichment_status TEXT NOT NULL DEFAULT 'pending'",
      "ALTER TABLE properties ADD COLUMN enrichment_error TEXT DEFAULT ''",
      "ALTER TABLE properties ADD COLUMN enrichment_at TEXT DEFAULT ''",
      "ALTER TABLE properties ADD COLUMN socioeconomic_data TEXT DEFAULT ''",
      "ALTER TABLE properties ADD COLUMN collect_urls TEXT DEFAULT '[]'",
      "ALTER TABLE properties ADD COLUMN collect_texts TEXT DEFAULT '[]'",
      "ALTER TABLE properties ADD COLUMN amenities TEXT DEFAULT '[]'",
      "ALTER TABLE properties ADD COLUMN rent_per_m2 REAL DEFAULT 0",
      "ALTER TABLE properties ADD COLUMN property_status TEXT NOT NULL DEFAULT 'added'",
    ]) {
      try { await client.execute(stmt); } catch { /* already exists */ }
    }

    // Localities tables
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS localities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('pays','region','departement','canton','ville','quartier','rue')),
        parent_id TEXT DEFAULT NULL,
        code TEXT DEFAULT '',
        postal_codes TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_localities_type ON localities(type);
      CREATE INDEX IF NOT EXISTS idx_localities_parent ON localities(parent_id);
      CREATE INDEX IF NOT EXISTS idx_localities_code ON localities(code);

      CREATE TABLE IF NOT EXISTS locality_data (
        id TEXT PRIMARY KEY,
        locality_id TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_to TEXT DEFAULT NULL,
        data TEXT NOT NULL DEFAULT '{}',
        created_by TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (locality_id) REFERENCES localities(id)
      );
      CREATE INDEX IF NOT EXISTS idx_locality_data_locality ON locality_data(locality_id);
      CREATE INDEX IF NOT EXISTS idx_locality_data_valid ON locality_data(valid_from, valid_to);
    `);

    _initialized = true;
  }
  return client;
}
