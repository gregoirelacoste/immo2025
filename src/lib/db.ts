import Database from "better-sqlite3";
import path from "path";
import { Property } from "@/types/property";
import { ScrapingManifest } from "@/types/scraping";

const DB_PATH = path.join(process.cwd(), "data.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        address TEXT DEFAULT '',
        city TEXT NOT NULL,
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
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    _db.exec(`
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
      )
    `);
  }
  return _db;
}

// ─── Properties ───

export function getAllProperties(): Property[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM properties ORDER BY created_at DESC")
    .all() as Property[];
}

export function getPropertyById(id: string): Property | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM properties WHERE id = ?")
    .get(id) as Property | undefined;
}

export function createProperty(
  property: Omit<Property, "id" | "created_at" | "updated_at">
): string {
  const db = getDb();
  const { v4: uuidv4 } = require("uuid");
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO properties (
      id, address, city, purchase_price, surface, property_type, description,
      loan_amount, interest_rate, loan_duration, personal_contribution,
      insurance_rate, loan_fees, notary_fees, monthly_rent, condo_charges,
      property_tax, vacancy_rate, airbnb_price_per_night, airbnb_occupancy_rate,
      airbnb_charges, source_url, created_at, updated_at
    ) VALUES (
      @id, @address, @city, @purchase_price, @surface, @property_type, @description,
      @loan_amount, @interest_rate, @loan_duration, @personal_contribution,
      @insurance_rate, @loan_fees, @notary_fees, @monthly_rent, @condo_charges,
      @property_tax, @vacancy_rate, @airbnb_price_per_night, @airbnb_occupancy_rate,
      @airbnb_charges, @source_url, @created_at, @updated_at
    )
  `).run({ ...property, id, created_at: now, updated_at: now });

  return id;
}

export function updateProperty(
  id: string,
  property: Omit<Property, "id" | "created_at" | "updated_at">
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE properties SET
      address = @address, city = @city, purchase_price = @purchase_price,
      surface = @surface, property_type = @property_type, description = @description,
      loan_amount = @loan_amount, interest_rate = @interest_rate,
      loan_duration = @loan_duration, personal_contribution = @personal_contribution,
      insurance_rate = @insurance_rate, loan_fees = @loan_fees,
      notary_fees = @notary_fees, monthly_rent = @monthly_rent,
      condo_charges = @condo_charges, property_tax = @property_tax,
      vacancy_rate = @vacancy_rate, airbnb_price_per_night = @airbnb_price_per_night,
      airbnb_occupancy_rate = @airbnb_occupancy_rate, airbnb_charges = @airbnb_charges,
      source_url = @source_url, updated_at = @updated_at
    WHERE id = @id
  `).run({ ...property, id, updated_at: now });
}

export function deleteProperty(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM properties WHERE id = ?").run(id);
}

// ─── Scraping Manifests ───

export function getManifestByHostname(
  hostname: string
): ScrapingManifest | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM scraping_manifests WHERE site_hostname = ? ORDER BY updated_at DESC LIMIT 1"
    )
    .get(hostname) as ScrapingManifest | undefined;
}

export function upsertManifest(data: {
  site_hostname: string;
  page_pattern: string;
  selectors: string;
  sample_url: string;
}): void {
  const db = getDb();
  const { v4: uuidv4 } = require("uuid");
  const now = new Date().toISOString();

  const existing = db
    .prepare(
      "SELECT id, version FROM scraping_manifests WHERE site_hostname = ? AND page_pattern = ?"
    )
    .get(data.site_hostname, data.page_pattern) as
    | { id: string; version: number }
    | undefined;

  if (existing) {
    db.prepare(`
      UPDATE scraping_manifests SET
        selectors = @selectors, version = @version,
        success_count = 0, failure_count = 0,
        sample_url = @sample_url, updated_at = @updated_at
      WHERE id = @id
    `).run({
      id: existing.id,
      selectors: data.selectors,
      version: existing.version + 1,
      sample_url: data.sample_url,
      updated_at: now,
    });
  } else {
    db.prepare(`
      INSERT INTO scraping_manifests (
        id, site_hostname, page_pattern, selectors, version,
        success_count, failure_count, sample_url, created_at, updated_at
      ) VALUES (
        @id, @site_hostname, @page_pattern, @selectors, 1,
        0, 0, @sample_url, @created_at, @updated_at
      )
    `).run({
      id: uuidv4(),
      ...data,
      created_at: now,
      updated_at: now,
    });
  }
}

export function incrementManifestSuccess(id: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE scraping_manifests SET success_count = success_count + 1 WHERE id = ?"
  ).run(id);
}

export function incrementManifestFailure(id: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE scraping_manifests SET failure_count = failure_count + 1 WHERE id = ?"
  ).run(id);
}
