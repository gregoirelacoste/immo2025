import { createClient, Client } from "@libsql/client";

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

export function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:data.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

// Bump this when adding new migrations so cold starts re-run them
const SCHEMA_VERSION = 13;

async function initializeDatabase(client: Client): Promise<void> {
  // Enable foreign key constraints
  await client.execute("PRAGMA foreign_keys = ON;");

  // Schema version check — skip heavy migrations on warm starts
  await client.execute(
    "CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL DEFAULT 0)"
  );
  const vResult = await client.execute("SELECT version FROM _schema_version LIMIT 1");
  const currentVersion = vResult.rows[0] ? Number(vResult.rows[0].version) : 0;

  if (currentVersion >= SCHEMA_VERSION) {
    // Schema already up to date — skip all CREATE/ALTER migrations
    return;
  }

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
    CREATE TABLE IF NOT EXISTS user_profile (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      monthly_income INTEGER DEFAULT NULL,
      existing_credits INTEGER DEFAULT 0,
      savings INTEGER DEFAULT NULL,
      max_debt_ratio REAL DEFAULT 35,
      target_cities TEXT DEFAULT '[]',
      min_budget INTEGER DEFAULT NULL,
      max_budget INTEGER DEFAULT NULL,
      target_property_types TEXT DEFAULT '["ancien"]',
      default_inputs TEXT NOT NULL DEFAULT '{}',
      scoring_weights TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
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
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'upload',
      tag TEXT DEFAULT '',
      note TEXT DEFAULT '',
      latitude REAL DEFAULT NULL,
      longitude REAL DEFAULT NULL,
      width INTEGER DEFAULT NULL,
      height INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_photos_property_id ON photos(property_id);
  `);

  // Migrations: CREATE TABLE / INDEX statements can be batched
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rental_entries (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      month TEXT NOT NULL,
      rent_received REAL DEFAULT 0,
      charges_paid REAL DEFAULT 0,
      vacancy_days INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      UNIQUE(property_id, month)
    );
    CREATE INDEX IF NOT EXISTS idx_rental_entries_property ON rental_entries(property_id);

    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT 'Simulation 1',
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
      renovation_cost INTEGER DEFAULT 0,
      fiscal_regime TEXT DEFAULT 'micro_bic',
      maintenance_per_m2 REAL DEFAULT 12,
      pno_insurance REAL DEFAULT 200,
      gli_rate REAL DEFAULT 0,
      holding_duration INTEGER DEFAULT 0,
      annual_appreciation REAL DEFAULT 1.5,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_simulations_property ON simulations(property_id);
    CREATE INDEX IF NOT EXISTS idx_simulations_user_property ON simulations(user_id, property_id);
    CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
    CREATE INDEX IF NOT EXISTS idx_properties_visibility ON properties(visibility);
    CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
    CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_properties_visibility_user ON properties(visibility, user_id);
    CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
    CREATE INDEX IF NOT EXISTS idx_rental_entries_user_id ON rental_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_properties_source_url ON properties(source_url);
  `);

  // ALTER TABLE migrations — run in parallel (each is idempotent)
  const alterMigrations = [
    "ALTER TABLE properties ADD COLUMN image_urls TEXT DEFAULT '[]'",
    "ALTER TABLE properties ADD COLUMN postal_code TEXT DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN prefill_sources TEXT DEFAULT '{}'",
    "ALTER TABLE properties ADD COLUMN user_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'",
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
    "ALTER TABLE properties ADD COLUMN renovation_cost INTEGER DEFAULT 0",
    "ALTER TABLE properties ADD COLUMN dpe_rating TEXT DEFAULT NULL",
    "ALTER TABLE properties ADD COLUMN fiscal_regime TEXT DEFAULT 'micro_bic'",
    "ALTER TABLE properties ADD COLUMN is_favorite INTEGER DEFAULT 0",
    "ALTER TABLE properties ADD COLUMN status_changed_at TEXT DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN neighborhood TEXT DEFAULT ''",
    "ALTER TABLE properties ADD COLUMN active_simulation_id TEXT DEFAULT ''",
    "ALTER TABLE user_profile ADD COLUMN alert_thresholds TEXT DEFAULT '{}'",
    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'",
    "ALTER TABLE simulations ADD COLUMN holding_duration INTEGER DEFAULT 0",
    "ALTER TABLE simulations ADD COLUMN annual_appreciation REAL DEFAULT 1.5",
    "ALTER TABLE simulations ADD COLUMN maintenance_per_m2 REAL DEFAULT 12",
    "ALTER TABLE simulations ADD COLUMN pno_insurance REAL DEFAULT 200",
    "ALTER TABLE simulations ADD COLUMN gli_rate REAL DEFAULT 0",
    "ALTER TABLE properties ADD COLUMN travaux_ratings TEXT DEFAULT '{}'",
    "ALTER TABLE properties ADD COLUMN travaux_overrides TEXT DEFAULT '{}'",
    "ALTER TABLE properties ADD COLUMN equipment_costs TEXT DEFAULT '{}'",
    "ALTER TABLE properties ADD COLUMN rent_mode TEXT NOT NULL DEFAULT 'auto'",
    "ALTER TABLE locality_prices ADD COLUMN price_trend_pct REAL DEFAULT NULL",
    // v7 — new columns for enrichment pipeline
    "ALTER TABLE locality_charges ADD COLUMN property_tax_rate_pct REAL DEFAULT NULL",
    "ALTER TABLE locality_socio ADD COLUMN vacant_housing_pct REAL DEFAULT NULL",
    "ALTER TABLE locality_socio ADD COLUMN owner_occupier_pct REAL DEFAULT NULL",
    "ALTER TABLE locality_infra ADD COLUMN doctor_count INTEGER DEFAULT NULL",
    "ALTER TABLE locality_infra ADD COLUMN pharmacy_count INTEGER DEFAULT NULL",
    "ALTER TABLE locality_infra ADD COLUMN supermarket_count INTEGER DEFAULT NULL",
    "ALTER TABLE locality_risks ADD COLUMN flood_risk_level TEXT DEFAULT NULL",
    "ALTER TABLE locality_risks ADD COLUMN seismic_zone INTEGER DEFAULT NULL",
    "ALTER TABLE locality_risks ADD COLUMN radon_level INTEGER DEFAULT NULL",
    "ALTER TABLE locality_risks ADD COLUMN industrial_risk INTEGER DEFAULT NULL",
    // v8 — segmented rent data from Carte des loyers
    "ALTER TABLE locality_rental ADD COLUMN avg_rent_t1t2_per_m2 REAL DEFAULT NULL",
    "ALTER TABLE locality_rental ADD COLUMN avg_rent_t3plus_per_m2 REAL DEFAULT NULL",
    "ALTER TABLE locality_rental ADD COLUMN avg_rent_house_per_m2 REAL DEFAULT NULL",
    // v9 — furniture cost for LMNP packs
    "ALTER TABLE properties ADD COLUMN furniture_cost REAL DEFAULT 0",
    // v10 — meuble status for furnished regime choice
    "ALTER TABLE properties ADD COLUMN meuble_status TEXT NOT NULL DEFAULT 'non_meuble'",
    // v12 — recurring charges on property (factual data, mirrored to default simulation)
    "ALTER TABLE properties ADD COLUMN pno_insurance REAL DEFAULT 200",
    "ALTER TABLE properties ADD COLUMN gli_rate REAL DEFAULT 0",
    "ALTER TABLE properties ADD COLUMN maintenance_per_m2 REAL DEFAULT 12",
    // v12 — data migration: neuf properties get 8 €/m²/an (lower maintenance)
    "UPDATE properties SET maintenance_per_m2 = 8 WHERE property_type = 'neuf' AND maintenance_per_m2 = 12",
  ];
  const migrationErrors: Array<{ stmt: string; error: unknown }> = [];
  for (const stmt of alterMigrations) {
    try {
      await client.execute(stmt);
    } catch (e) {
      // Only suppress "already exists" errors — log everything else
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists") && !msg.includes("duplicate column")) {
        migrationErrors.push({ stmt, error: e });
      }
    }
  }
  if (migrationErrors.length > 0) {
    console.error("DB migration errors (non-duplicate):", migrationErrors);
  }

  // Set admin role (idempotent)
  const adminEmail = process.env.ADMIN_EMAIL || "gregoire.lacoste@gmail.com";
  await client.execute({
    sql: "UPDATE users SET role = 'admin' WHERE LOWER(email) = ?",
    args: [adminEmail.toLowerCase()],
  });

  // ─── Reference items (unified generic table) ─────
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS reference_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🏠',
      category TEXT NOT NULL DEFAULT 'general',
      config TEXT NOT NULL DEFAULT '{}',
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(type, key)
    );
    CREATE INDEX IF NOT EXISTS idx_reference_items_type ON reference_items(type);
    CREATE INDEX IF NOT EXISTS idx_reference_items_type_category ON reference_items(type, category);

    CREATE TABLE IF NOT EXISTS reference_conditions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      condition_value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES reference_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reference_conditions_item ON reference_conditions(item_id);
    CREATE INDEX IF NOT EXISTS idx_reference_conditions_lookup ON reference_conditions(condition_type, condition_value);
  `);

  // Migrate legacy equipments table → reference_items (for existing DBs only)
  try {
    const existingEqs = await client.execute("SELECT * FROM equipments");
    for (const eq of existingEqs.rows) {
      const cfg = JSON.stringify({ value_impact_per_sqm: eq.value_impact_per_sqm ?? null });
      try {
        await client.execute({
          sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
                VALUES (?, 'equipment', ?, ?, ?, ?, ?, ?, 0)`,
          args: [
            `ri_eq_${eq.key}`,
            eq.key as string,
            eq.label as string,
            eq.icon as string,
            eq.category as string,
            cfg,
            eq.is_default as number,
          ],
        });
      } catch { /* already exists in reference_items */ }
    }
  } catch { /* equipments table doesn't exist on fresh DBs — expected */ }

  // Seed all reference items (equipments + visit config)
  const { seedAllReferenceItems } = await import("@/domains/reference/seed");
  await seedAllReferenceItems(client);

  // Localities table
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
    CREATE INDEX IF NOT EXISTS idx_localities_name ON localities(name COLLATE NOCASE);
  `);

  // Thematic locality data tables (replace old locality_data JSON blob)
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS locality_prices (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      avg_purchase_price_per_m2 REAL DEFAULT NULL,
      median_purchase_price_per_m2 REAL DEFAULT NULL,
      transaction_count INTEGER DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lp_price ON locality_prices(avg_purchase_price_per_m2);
    CREATE INDEX IF NOT EXISTS idx_lp_median ON locality_prices(median_purchase_price_per_m2);

    CREATE TABLE IF NOT EXISTS locality_rental (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      avg_rent_per_m2 REAL DEFAULT NULL,
      avg_rent_furnished_per_m2 REAL DEFAULT NULL,
      vacancy_rate REAL DEFAULT NULL,
      typical_cashflow_per_m2 REAL DEFAULT NULL,
      rent_elasticity_alpha REAL DEFAULT NULL,
      rent_reference_surface REAL DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_lr_rent ON locality_rental(avg_rent_per_m2);
    CREATE INDEX IF NOT EXISTS idx_lr_vacancy ON locality_rental(vacancy_rate);

    CREATE TABLE IF NOT EXISTS locality_charges (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      avg_condo_charges_per_m2 REAL DEFAULT NULL,
      avg_property_tax_per_m2 REAL DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locality_airbnb (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      avg_airbnb_night_price REAL DEFAULT NULL,
      avg_airbnb_occupancy_rate REAL DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locality_socio (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      population INTEGER DEFAULT NULL,
      population_growth_pct REAL DEFAULT NULL,
      median_income REAL DEFAULT NULL,
      poverty_rate REAL DEFAULT NULL,
      unemployment_rate REAL DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ls_population ON locality_socio(population);

    CREATE TABLE IF NOT EXISTS locality_infra (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      school_count INTEGER DEFAULT NULL,
      university_nearby INTEGER DEFAULT NULL,
      public_transport_score REAL DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locality_risks (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      risk_level TEXT DEFAULT NULL,
      natural_risks TEXT DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locality_energy (
      locality_id TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      avg_dpe_class TEXT DEFAULT NULL,
      avg_energy_consumption REAL DEFAULT NULL,
      avg_ges_class TEXT DEFAULT NULL,
      dpe_count INTEGER DEFAULT NULL,
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (locality_id, valid_from),
      FOREIGN KEY (locality_id) REFERENCES localities(id) ON DELETE CASCADE
    );
  `);

  // Migrate old locality_data JSON rows → thematic tables (v5 → v6)
  try {
    const oldRows = await client.execute("SELECT * FROM locality_data");
    for (const row of oldRows.rows) {
      const locId = row.locality_id as string;
      const validFrom = row.valid_from as string;
      const source = (row.created_by as string) || "";
      let fields: Record<string, unknown>;
      try { fields = JSON.parse(row.data as string); } catch { continue; }

      // Prices
      if (fields.avg_purchase_price_per_m2 != null || fields.median_purchase_price_per_m2 != null || fields.transaction_count != null || fields.price_trend_pct != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_prices (locality_id, valid_from, avg_purchase_price_per_m2, median_purchase_price_per_m2, transaction_count, price_trend_pct, source)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.avg_purchase_price_per_m2 as number) ?? null, (fields.median_purchase_price_per_m2 as number) ?? null, (fields.transaction_count as number) ?? null, (fields.price_trend_pct as number) ?? null, source],
          });
        } catch { /* skip duplicates */ }
      }
      // Rental
      if (fields.avg_rent_per_m2 != null || fields.avg_rent_furnished_per_m2 != null || fields.vacancy_rate != null || fields.typical_cashflow_per_m2 != null || fields.rent_elasticity_alpha != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_rental (locality_id, valid_from, avg_rent_per_m2, avg_rent_furnished_per_m2, vacancy_rate, typical_cashflow_per_m2, rent_elasticity_alpha, rent_reference_surface, source)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.avg_rent_per_m2 as number) ?? null, (fields.avg_rent_furnished_per_m2 as number) ?? null, (fields.vacancy_rate as number) ?? null, (fields.typical_cashflow_per_m2 as number) ?? null, (fields.rent_elasticity_alpha as number) ?? null, (fields.rent_reference_surface as number) ?? null, source],
          });
        } catch { /* skip duplicates */ }
      }
      // Charges
      if (fields.avg_condo_charges_per_m2 != null || fields.avg_property_tax_per_m2 != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_charges (locality_id, valid_from, avg_condo_charges_per_m2, avg_property_tax_per_m2, source)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.avg_condo_charges_per_m2 as number) ?? null, (fields.avg_property_tax_per_m2 as number) ?? null, source],
          });
        } catch { /* skip duplicates */ }
      }
      // Airbnb
      if (fields.avg_airbnb_night_price != null || fields.avg_airbnb_occupancy_rate != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_airbnb (locality_id, valid_from, avg_airbnb_night_price, avg_airbnb_occupancy_rate, source)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.avg_airbnb_night_price as number) ?? null, (fields.avg_airbnb_occupancy_rate as number) ?? null, source],
          });
        } catch { /* skip duplicates */ }
      }
      // Socio
      if (fields.population != null || fields.median_income != null || fields.unemployment_rate != null || fields.poverty_rate != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_socio (locality_id, valid_from, population, population_growth_pct, median_income, poverty_rate, unemployment_rate, source)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.population as number) ?? null, (fields.population_growth_pct as number) ?? null, (fields.median_income as number) ?? null, (fields.poverty_rate as number) ?? null, (fields.unemployment_rate as number) ?? null, source],
          });
        } catch { /* skip duplicates */ }
      }
      // Infra
      if (fields.school_count != null || fields.university_nearby != null || fields.public_transport_score != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_infra (locality_id, valid_from, school_count, university_nearby, public_transport_score, source)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.school_count as number) ?? null, fields.university_nearby != null ? (fields.university_nearby ? 1 : 0) : null, (fields.public_transport_score as number) ?? null, source],
          });
        } catch { /* skip duplicates */ }
      }
      // Risks
      if (fields.risk_level != null || fields.natural_risks != null) {
        try {
          await client.execute({
            sql: `INSERT OR IGNORE INTO locality_risks (locality_id, valid_from, risk_level, natural_risks, source)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [locId, validFrom, (fields.risk_level as string) ?? null, fields.natural_risks ? JSON.stringify(fields.natural_risks) : null, source],
          });
        } catch { /* skip duplicates */ }
      }
    }
    // Drop old table after successful migration
    await client.execute("DROP TABLE IF EXISTS locality_data");
  } catch (e) {
    // locality_data might not exist on fresh DBs — that's fine
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("no such table")) {
      console.error("locality_data migration error:", e);
    }
  }

  // Blog tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS blog_articles (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      json_ld TEXT DEFAULT '',
      source_urls TEXT DEFAULT '[]',
      category TEXT NOT NULL DEFAULT 'guide_ville',
      locality_id TEXT DEFAULT NULL,
      tags TEXT DEFAULT '[]',
      extracted_data TEXT DEFAULT '{}',
      data_injected INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','error')),
      published_at TEXT DEFAULT NULL,
      triggered_by TEXT NOT NULL DEFAULT 'admin',
      generation_model TEXT DEFAULT '',
      generation_tokens INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON blog_articles(status);
    CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category);
    CREATE INDEX IF NOT EXISTS idx_blog_articles_locality ON blog_articles(locality_id);
    CREATE INDEX IF NOT EXISTS idx_blog_articles_published ON blog_articles(published_at DESC);

    CREATE TABLE IF NOT EXISTS blog_audit_log (
      id TEXT PRIMARY KEY,
      article_id TEXT DEFAULT NULL,
      action TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      triggered_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_blog_audit_action ON blog_audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_blog_audit_article ON blog_audit_log(article_id);
  `);

  // v11: UNIQUE index on localities(code, type) to prevent duplicate IRIS quartier entries
  // First deduplicate existing data — keep the oldest row per (code, type)
  try {
    await client.execute(`
      DELETE FROM localities WHERE code != '' AND id NOT IN (
        SELECT MIN(id) FROM localities WHERE code != '' GROUP BY code, type
      )
    `);
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_localities_code_type
      ON localities(code, type) WHERE code != ''
    `);
  } catch (e) {
    // Index may already exist — safe to ignore
    const msg = String(e);
    if (!msg.includes("already exists")) {
      console.warn("[db] Failed to create UNIQUE index on localities:", msg);
    }
  }

  // Record schema version so subsequent cold starts skip migrations
  await client.execute("DELETE FROM _schema_version");
  await client.execute({ sql: "INSERT INTO _schema_version (version) VALUES (?)", args: [SCHEMA_VERSION] });
}

export async function getDb(): Promise<Client> {
  const client = getClient();
  // Use promise lock to prevent concurrent initialization
  if (!_initPromise) {
    _initPromise = initializeDatabase(client);
  }
  await _initPromise;
  return client;
}
