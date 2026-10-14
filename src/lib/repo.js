// Consultas partilhadas pelas rotas
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { all, get, run, DATA_DIR } = require('../db');
const { parseJSON } = require('./util');

const PAGE_SIZE = 12;
const REVALIDATE_DAYS = 365;

// Uma entidade é pública quando a conta que a gere está aprovada.
const PUBLIC_ENTITY = `EXISTS (SELECT 1 FROM users u WHERE u.entity_id = e.id AND u.status = 'aprovada')`;

function isVerified(e) {
  if (!e || !e.verified || !e.verified_at || e.needs_revalidation) return false;
  return (Date.now() - new Date(e.verified_at.replace(' ', 'T') + 'Z').getTime()) / 864e5 <= REVALIDATE_DAYS;
}

function entityLocations(id) {
  return all(`SELECT l.*, t.country, t.region, t.municipality, COALESCE(l.lat, t.lat) AS plat, COALESCE(l.lng, t.lng) AS plng
              FROM locations l LEFT JOIN territories t ON t.id = l.territory_id WHERE l.entity_id = ? ORDER BY l.sort, l.id`, id);
}

function locLabel(loc) {
  if (!loc) return '';
  return [loc.municipality, loc.country].filter(Boolean).join(', ');
}

function decorateEntity(e) {
  if (!e) return e;
  e.areas = parseJSON(e.areas, []);
  e.services = parseJSON(e.services, []);
  e.socials = parseJSON(e.socials, []);
  e.locations = entityLocations(e.id);
  e.mainLoc = e.locations[0] || null;
  e.locText = e.locations.map((l) => l.municipality).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') || '';
  e.isVerified = isVerified(e);
  return e;
}

function getEntity(where, ...params) {
  return decorateEntity(get(`SELECT e.*, c.name_pt AS cat_pt, c.name_es AS cat_es FROM entities e LEFT JOIN categories c ON c.id = e.category_id WHERE ${where}`, ...params));
}

function ratingOf(entityId) {
  const r = get(`SELECT COUNT(*) n, AVG(rating) avg FROM reviews WHERE entity_id = ? AND status = 'publicada'`, entityId);
  return { n: r.n, avg: r.avg ? Math.round(r.avg * 10) / 10 : null };
}

function decorateOffer(o) {
  if (!o) return o;
  o.tags = parseJSON(o.tags, []);
  o.images = parseJSON(o.images, []);
  o.isFeatured = !!(o.featured_until && o.featured_until > new Date().toISOString().slice(0, 19).replace('T', ' '));
  return o;
}

const OFFER_SELECT = `SELECT o.*, e.name AS seller, e.slug AS seller_slug, e.verified, e.verified_at, e.needs_revalidation, e.phone AS s_phone, e.email AS s_email, e.website AS s_website,
  c.name_pt AS cat_pt, c.name_es AS cat_es,
  (SELECT t.municipality || ', ' || t.country FROM locations l JOIN territories t ON t.id = l.territory_id WHERE l.entity_id = e.id ORDER BY l.sort, l.id LIMIT 1) AS loc
  FROM offers o JOIN entities e ON e.id = o.entity_id LEFT JOIN categories c ON c.id = o.category_id`;

// Listagem de ofertas com pesquisa, filtros, ordenação e paginação (RF-06)
function searchOffers({ q, kind, category, region, sort, page = 1, pageSize = PAGE_SIZE, featuredOnly } = {}) {
  const where = [`o.status = 'ativo'`, PUBLIC_ENTITY];
  const p = [];
  if (q) {
    where.push(`(o.title_pt LIKE ? OR o.title_es LIKE ? OR o.desc_pt LIKE ? OR o.desc_es LIKE ? OR o.tags LIKE ? OR e.name LIKE ?)`);
    const like = `%${q}%`; p.push(like, like, like, like, like, like);
  }
  if (kind === 'produto' || kind === 'servico') { where.push('o.kind = ?'); p.push(kind); }
  if (category) { where.push('o.category_id = ?'); p.push(Number(category)); }
  if (region) {
    where.push(`EXISTS (SELECT 1 FROM locations l JOIN territories t ON t.id = l.territory_id WHERE l.entity_id = e.id AND (t.region = ? OR t.country = ? OR t.municipality = ?))`);
    p.push(region, region, region);
  }
  if (featuredOnly) where.push(`o.featured_until > datetime('now')`);
  const order = {
    recentes: 'o.created_at DESC, o.id DESC', antigos: 'o.created_at ASC',
    nome: 'COALESCE(o.title_pt, o.title_es) COLLATE NOCASE ASC',
    preco_asc: 'o.price_cents IS NULL, o.price_cents ASC', preco_desc: 'o.price_cents IS NULL, o.price_cents DESC',
  }[sort] || `(o.featured_until > datetime('now')) DESC, o.created_at DESC, o.id DESC`;
  const W = where.join(' AND ');
  const total = get(`SELECT COUNT(*) n FROM offers o JOIN entities e ON e.id = o.entity_id WHERE ${W}`, ...p).n;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = all(`${OFFER_SELECT} WHERE ${W} ORDER BY ${order} LIMIT ? OFFSET ?`, ...p, pageSize, (cur - 1) * pageSize).map(decorateOffer);
  return { rows, total, page: cur, pages };
}

// Listagem de incubadoras ou agentes
function searchEntities(type, { q, area, region, sort, page = 1, pageSize = PAGE_SIZE } = {}) {
  const where = ['e.type = ?', PUBLIC_ENTITY];
  const p = [type];
  if (q) { where.push('(e.name LIKE ? OR e.desc_pt LIKE ? OR e.desc_es LIKE ? OR e.areas LIKE ? OR e.services LIKE ?)'); const like = `%${q}%`; p.push(like, like, like, like, like); }
  if (area) { where.push('e.areas LIKE ?'); p.push(`%"${area.replace(/"/g, '')}"%`); }
  if (region) {
    where.push(`EXISTS (SELECT 1 FROM locations l JOIN territories t ON t.id = l.territory_id WHERE l.entity_id = e.id AND (t.region = ? OR t.country = ? OR t.municipality = ?))`);
    p.push(region, region, region);
  }
  const order = { nome: 'e.name COLLATE NOCASE ASC', antigos: 'e.created_at ASC' }[sort] || 'e.created_at DESC, e.id DESC';
  const total = get(`SELECT COUNT(*) n FROM entities e WHERE ${where.join(' AND ')}`, ...p).n;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, Number(page) || 1), pages);
  const rows = all(`SELECT e.* FROM entities e WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`, ...p, pageSize, (cur - 1) * pageSize).map(decorateEntity);
  rows.forEach((e) => {
    e.activePrograms = get(`SELECT COUNT(*) n FROM programs WHERE entity_id = ? AND status = 'ativo'`, e.id).n;
    e.activeProjects = get(`SELECT COUNT(*) n FROM projects WHERE entity_id = ? AND status = 'ativo'`, e.id).n;
    e.incubatedCount = get(`SELECT COUNT(*) n FROM incubated WHERE entity_id = ?`, e.id).n;
  });
  return { rows, total, page: cur, pages };
}

function entityAreas(type) {
  const set = new Set();
  all(`SELECT e.areas FROM entities e WHERE e.type = ? AND ${PUBLIC_ENTITY}`, type).forEach((r) => parseJSON(r.areas, []).forEach((a) => set.add(a)));
  return [...set].sort((a, b) => a.localeCompare(b, 'pt'));
}

function regionsInUse() {
  return all(`SELECT DISTINCT t.country, t.region FROM territories t JOIN locations l ON l.territory_id = t.id JOIN entities e ON e.id = l.entity_id WHERE ${PUBLIC_ENTITY} ORDER BY t.country, t.region`);
}

// ---- Estatísticas recolhidas pela própria plataforma, sem dados pessoais (6.4) ----
function logStat(entityId, type, { offerId = null, channel = null } = {}) {
  if (!entityId) return;
  run('INSERT INTO stats(entity_id, offer_id, type, channel) VALUES (?,?,?,?)', entityId, offerId, type, channel);
}

function audit(req, action, target, details) {
  const u = req && req.user;
  run('INSERT INTO audit(user_id, user_email, action, target, details) VALUES (?,?,?,?,?)', u ? u.id : null, u ? u.email : null, action, target || null, details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null);
}

// ---- Imagens: validadas, redimensionadas e convertidas para WebP (RNF-05) ----
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
async function saveImage(file, { width = 1400, height = 1400, fit = 'inside' } = {}) {
  if (!file) return null;
  if (!ALLOWED.includes(file.mimetype) || file.size > 2 * 1024 * 1024) throw Object.assign(new Error('upload'), { code: 'BAD_UPLOAD' });
  const sharp = require('sharp');
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.webp`;
  try {
    await sharp(file.buffer).rotate().resize({ width, height, fit, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(UPLOAD_DIR, name));
  } catch {
    throw Object.assign(new Error('upload'), { code: 'BAD_UPLOAD' });
  }
  return `/uploads/${name}`;
}
function deleteImage(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const f = path.join(UPLOAD_DIR, path.basename(url));
  fs.rm(f, { force: true }, () => {});
}

module.exports = { PAGE_SIZE, PUBLIC_ENTITY, isVerified, decorateEntity, getEntity, entityLocations, locLabel, ratingOf, decorateOffer, OFFER_SELECT, searchOffers, searchEntities, entityAreas, regionsInUse, logStat, audit, saveImage, deleteImage, UPLOAD_DIR };
