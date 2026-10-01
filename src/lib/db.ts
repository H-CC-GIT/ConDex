import Database from "better-sqlite3";
import path from "path";
import { dataDir, ensureDataDirs } from "./paths";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  who TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  photo_file TEXT,
  introduced_by_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
  follow_up_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up ON contacts(follow_up_on);
CREATE INDEX IF NOT EXISTS idx_contacts_introduced_by ON contacts(introduced_by_id);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS contact_points (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('email', 'phone', 'url', 'other')),
  value TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  met_on TEXT NOT NULL,
  place TEXT NOT NULL DEFAULT '',
  what TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
  contact_id UNINDEXED,
  name,
  who,
  organization,
  city,
  notes,
  tags,
  meetings,
  introducer,
  tokenize = "unicode61 remove_diacritics 2"
);
`;

const globalForDb = globalThis as unknown as {
  __condexDb?: Database.Database;
};

function openDatabase() {
  ensureDataDirs();
  const db = new Database(path.join(/*turbopackIgnore: true*/ dataDir(), "condex.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  const fts = db.prepare("SELECT sqlite_compileoption_used('ENABLE_FTS5')").pluck().get();
  if (fts !== 1) {
    throw new Error("This SQLite build does not include FTS5, which ConDex needs for search.");
  }
  db.exec(SCHEMA);
  return db;
}

export function getDb() {
  if (!globalForDb.__condexDb) {
    globalForDb.__condexDb = openDatabase();
  }
  return globalForDb.__condexDb;
}
