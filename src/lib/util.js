const crypto = require('node:crypto');

function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';
}

function uniqueSlug(base, exists) {
  let s = slugify(base), i = 2;
  while (exists(s)) s = `${slugify(base)}-${i++}`;
  return s;
}

// Preços em euros no formato "20,50 €"
function formatPrice(cents) {
  if (cents == null || cents === '') return '';
  const v = (Number(cents) / 100).toFixed(2).split('.');
  const int = v[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${int},${v[1]} €`;
}
function parsePrice(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(/\s|€/g, '');
  if (!s) return null;
  // aceita "20,50", "20.50", "1.234,56"
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(norm);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

// Datas no formato dd/mm/aaaa
function formatDate(d) {
  if (!d) return '';
  const s = String(d);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}
function formatNumber(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function formatPct(x) {
  return `${(Number(x) * 100 || 0).toFixed(1).replace('.', ',')}%`;
}

function parseJSON(s, fallback) {
  try { const v = JSON.parse(s); return v ?? fallback; } catch { return fallback; }
}

function splitList(s, max) {
  const arr = String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const uniq = [...new Set(arr)];
  return max ? uniq.slice(0, max) : uniq;
}

function token(bytes = 24) { return crypto.randomBytes(bytes).toString('base64url'); }

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

function normUrl(u) {
  u = String(u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.toString() : ''; } catch { return ''; }
}
function displayUrl(u) { return String(u || '').replace(/^https?:\/\//i, '').replace(/\/$/, ''); }

function initials(name) {
  return String(name || '?').trim().charAt(0).toUpperCase();
}

function nowISO() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }
function daysFromNow(n) { return new Date(Date.now() + n * 864e5).toISOString().slice(0, 19).replace('T', ' '); }

module.exports = { slugify, uniqueSlug, formatPrice, parsePrice, formatDate, formatNumber, formatPct, parseJSON, splitList, token, isEmail, normUrl, displayUrl, initials, nowISO, daysFromNow };
