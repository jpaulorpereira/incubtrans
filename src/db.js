// Base de dados SQLite (módulo nativo node:sqlite, Node >= 22.5)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'incubtrans.db');

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','empresa','incubadora','agente')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada','suspensa')),
  status_reason TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verify_token TEXT,
  reset_token TEXT,
  reset_expires INTEGER,
  lang TEXT NOT NULL DEFAULT 'pt',
  entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name_pt TEXT NOT NULL,
  name_es TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'oferta' CHECK (scope IN ('oferta','area')),
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS territories (
  id INTEGER PRIMARY KEY,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  municipality TEXT NOT NULL,
  lat REAL, lng REAL
);
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('empresa','incubadora','agente')),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT,
  logo TEXT,
  cover TEXT,
  desc_pt TEXT, desc_es TEXT,
  support_pt TEXT, support_es TEXT,
  year INTEGER,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  areas TEXT NOT NULL DEFAULT '[]',
  services TEXT NOT NULL DEFAULT '[]',
  startups INTEGER,
  nif TEXT,
  phone TEXT, email TEXT, website TEXT,
  socials TEXT NOT NULL DEFAULT '[]',
  contact_person TEXT, contact_person_public INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  verified_at TEXT,
  needs_revalidation INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  territory_id INTEGER REFERENCES territories(id) ON DELETE SET NULL,
  address TEXT, lat REAL, lng REAL, phone TEXT, email TEXT,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('produto','servico')),
  slug TEXT NOT NULL UNIQUE,
  title_pt TEXT, title_es TEXT,
  desc_pt TEXT, desc_es TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  price_cents INTEGER,
  price_type TEXT NOT NULL DEFAULT 'fixo' CHECK (price_type IN ('fixo','negociavel','consulta','gratis')),
  images TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','removido')),
  featured_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS highlight_requests (
  id INTEGER PRIMARY KEY,
  offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','terminado')),
  duration_months INTEGER
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','terminado')),
  start_date TEXT, end_date TEXT, partners TEXT, website TEXT
);
CREATE TABLE IF NOT EXISTS incubated (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, year INTEGER, area TEXT, logo TEXT, website TEXT
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('evento','noticia')),
  title TEXT NOT NULL, body TEXT, date TEXT NOT NULL, place TEXT, image TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','removido')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  author_name TEXT,
  email_hash TEXT NOT NULL,
  confirm_token TEXT,
  status TEXT NOT NULL DEFAULT 'por_confirmar' CHECK (status IN ('por_confirmar','publicada','removida')),
  reply TEXT, reply_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (entity_id, email_hash)
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('oferta','entidade','avaliacao','post')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','mantida','removida')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  offer_id INTEGER,
  type TEXT NOT NULL CHECK (type IN ('view','contact')),
  channel TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS stats_entity ON stats(entity_id, created_at);
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title_pt TEXT NOT NULL, title_es TEXT,
  body_pt TEXT NOT NULL, body_es TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY,
  q_pt TEXT NOT NULL, a_pt TEXT NOT NULL, q_es TEXT, a_es TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,
  description TEXT,
  subject_pt TEXT NOT NULL, body_pt TEXT NOT NULL,
  subject_es TEXT NOT NULL, body_es TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY,
  to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL, email TEXT NOT NULL, organization TEXT, subject TEXT, message TEXT NOT NULL,
  handled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  user_id INTEGER, user_email TEXT,
  action TEXT NOT NULL, target TEXT, details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
db.exec(SCHEMA);

// Pequenos atalhos
// node:sqlite não aceita undefined nem booleanos: normaliza os parâmetros
const norm = (p) => p.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
const all = (sql, ...p) => db.prepare(sql).all(...norm(p));
const get = (sql, ...p) => db.prepare(sql).get(...norm(p));
const run = (sql, ...p) => db.prepare(sql).run(...norm(p));
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

module.exports = { db, all, get, run, tx, DATA_DIR, DB_FILE };
