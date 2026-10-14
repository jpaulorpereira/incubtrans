const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { get, run, DATA_DIR } = require('../db');
const { token } = require('./util');

// Segredo da aplicação: variável de ambiente ou ficheiro gerado no primeiro arranque.
const SECRET = process.env.APP_SECRET || (() => {
  const f = path.join(DATA_DIR, 'secret.key');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(f, 'utf8').trim();
})();

// Passwords guardadas com hash scrypt + sal (RNF-03)
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${h.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored || '').split('$');
  if (alg !== 'scrypt') return false;
  const h = crypto.scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(h, Buffer.from(hashHex, 'hex'));
}
function passwordOk(pw) {
  return typeof pw === 'string' && pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

// O email de quem avalia não é guardado em claro: só um HMAC, para impedir duplicados.
function emailHash(email) {
  return crypto.createHmac('sha256', SECRET).update(String(email).trim().toLowerCase()).digest('hex');
}

// ---- Sessões guardadas na base de dados, cookie httpOnly ----
const SESSION_COOKIE = 'itsid';
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7;

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function sessionMiddleware(req, res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  let sid = req.cookies[SESSION_COOKIE];
  let data = null;
  if (sid) {
    const row = get('SELECT data, expires FROM sessions WHERE token = ?', sid);
    if (row && row.expires > Date.now()) data = JSON.parse(row.data);
  }
  if (!data) { sid = token(); data = {}; }
  req.session = data;
  const before = JSON.stringify(data);
  req.regenerateSession = () => {
    run('DELETE FROM sessions WHERE token = ?', sid);
    sid = token();
  };
  req.destroySession = () => {
    run('DELETE FROM sessions WHERE token = ?', sid);
    req.session = {};
    sid = null;
  };
  const save = () => {
    if (!sid) { res.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`); return; }
    const now = JSON.stringify(req.session);
    if (now === '{}' && !req.cookies[SESSION_COOKIE]) return; // não cria sessões vazias
    if (now !== before || !req.cookies[SESSION_COOKIE] || req.cookies[SESSION_COOKIE] !== sid) {
      run('INSERT INTO sessions(token, data, expires) VALUES(?,?,?) ON CONFLICT(token) DO UPDATE SET data=excluded.data, expires=excluded.expires', sid, now, Date.now() + SESSION_TTL);
    }
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.append('Set-Cookie', `${SESSION_COOKIE}=${sid}; Path=/; Max-Age=${SESSION_TTL / 1000}; HttpOnly; SameSite=Lax${secure}`);
  };
  // grava antes de enviar cabeçalhos
  const origWriteHead = res.writeHead;
  res.writeHead = function (...args) { try { save(); } catch (e) { console.error(e); } return origWriteHead.apply(this, args); };
  next();
}

// ---- CSRF: token por sessão, verificado em todos os POST ----
function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = token(18);
  return req.session.csrf;
}
function csrfCheck(req, res, next) {
  if (req.method !== 'POST') return next();
  const sent = (req.body && req.body._csrf) || req.query._csrf || req.headers['x-csrf-token'];
  if (!sent || sent !== req.session.csrf) {
    res.status(403);
    return res.render('error', { title: res.locals.t('err.forbiddenT'), message: res.locals.t('err.csrf') });
  }
  next();
}

// ---- Limite de pedidos em memória (autenticação, formulários públicos) ----
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  return b.n <= max;
}
function resetRate(key) { buckets.delete(key); }

// ---- CAPTCHA simples, sem serviços externos ----
function newCaptcha(req, form) {
  const a = 1 + crypto.randomInt(9), b = 1 + crypto.randomInt(9);
  req.session.captcha = req.session.captcha || {};
  req.session.captcha[form] = String(a + b);
  return `${a} + ${b}`;
}
function checkCaptcha(req, form, answer) {
  const ok = req.session.captcha && req.session.captcha[form] && String(answer || '').trim() === req.session.captcha[form];
  if (req.session.captcha) delete req.session.captcha[form];
  // campo-armadilha para robôs
  if (req.body && req.body.website_hp) return false;
  return !!ok;
}

module.exports = { SECRET, hashPassword, verifyPassword, passwordOk, emailHash, sessionMiddleware, csrfToken, csrfCheck, rateLimit, resetRate, newCaptcha, checkCaptcha, parseCookies };
