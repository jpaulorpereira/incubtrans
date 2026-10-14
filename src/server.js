const path = require('node:path');
const express = require('express');
const { get } = require('./db');
const { translator, pick, isFallback, LANGS } = require('./i18n');
const { sessionMiddleware, csrfToken, csrfCheck } = require('./lib/security');
const U = require('./lib/util');
const { UPLOAD_DIR, ratingOf } = require('./lib/repo');
const { BASE_URL, mailProvider } = require('./lib/mail');

// Primeiro arranque: carrega os dados de demonstração
const { seed, isEmpty } = require('./seed');
if (isEmpty() && process.env.NO_SEED !== '1') { seed(); console.log('Dados de demonstração carregados.'); }

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Cabeçalhos de segurança
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'; form-action 'self'",
  });
  next();
});

app.use('/static', express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }));
app.use('/img', express.static(path.join(__dirname, '..', 'public', 'img'), { maxAge: '7d' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d' }));
app.use('/static/vendor/leaflet', express.static(path.join(__dirname, '..', 'node_modules', 'leaflet', 'dist'), { maxAge: '30d' }));
app.get('/favicon.ico', (req, res) => res.redirect(301, '/static/favicon.svg'));

app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(sessionMiddleware);

// Idioma: ?lang= muda a preferência (guardada em cookie); por omissão segue o navegador
app.use((req, res, next) => {
  if (req.query.lang && LANGS.includes(req.query.lang)) {
    res.append('Set-Cookie', `lang=${req.query.lang}; Path=/; Max-Age=31536000; SameSite=Lax`);
    const u = new URL(req.originalUrl, 'http://x');
    u.searchParams.delete('lang');
    return res.redirect(u.pathname + (u.search || ''));
  }
  let lang = req.cookies.lang;
  if (!LANGS.includes(lang)) lang = /^es\b/i.test(req.headers['accept-language'] || '') ? 'es' : 'pt';
  req.lang = lang;
  next();
});

// Utilizador autenticado
app.use((req, res, next) => {
  if (req.session.uid) {
    const u = get('SELECT id, name, email, role, status, entity_id, lang FROM users WHERE id = ?', req.session.uid);
    if (u && (u.status === 'aprovada' || u.status === 'pendente')) req.user = u;
    else delete req.session.uid;
  }
  next();
});

// Variáveis e funções disponíveis em todas as vistas
app.use((req, res, next) => {
  const lang = req.lang;
  const t = translator(lang);
  const L = res.locals;
  L.lang = lang;
  L.t = t;
  L.tr = (pt, es) => (lang === 'es' && es != null ? es : pt);
  L.pick = (row, field) => pick(row, field, lang);
  L.isFallback = (row, field) => isFallback(row, field, lang);
  L.user = req.user || null;
  L.csrf = csrfToken(req);
  L.path = req.path;
  L.query = req.query;
  L.U = U;
  Object.assign(L, require('./lib/icons'));
  L.baseUrl = BASE_URL();
  L.mailProvider = mailProvider();
  L.consentMaps = req.cookies.consent === 'maps';
  L.consentSet = !!req.cookies.consent;
  L.flash = req.session.flash || null;
  delete req.session.flash;
  L.country = (c) => (lang === 'es' ? ({ Espanha: 'España' }[c] || c) : c);
  L.catName = (row) => (row ? (lang === 'es' ? row.cat_es || row.name_es : row.cat_pt || row.name_pt) || '' : '');
  L.priceLabel = (o) => {
    if (o.price_type === 'consulta') return t('lbl.consulta');
    if (o.price_type === 'gratis') return t('lbl.gratis');
    const p = U.formatPrice(o.price_cents);
    if (o.price_type === 'negociavel') return p ? `${p} · ${t('lbl.negociavel')}` : t('lbl.negociavel');
    return p;
  };
  L.kindLabel = (k) => (k === 'servico' ? t('lbl.servico') : t('lbl.produto'));
  L.statusLabel = (s) => t(`lbl.${s}`);
  L.rating = ratingOf;
  // constrói URL mantendo os parâmetros atuais
  L.qs = (changes) => {
    const p = new URLSearchParams();
    Object.entries({ ...req.query, ...changes }).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
    const s = p.toString();
    return req.path + (s ? `?${s}` : '');
  };
  // Texto simples com "## títulos" e "- listas" (páginas institucionais)
  L.md = (text) => {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const out = []; let list = false;
    String(text || '').split(/\r?\n/).forEach((line) => {
      const l = line.trim();
      if (l.startsWith('- ')) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${esc(l.slice(2))}</li>`); return; }
      if (list) { out.push('</ul>'); list = false; }
      if (!l) return;
      if (l.startsWith('## ')) out.push(`<h2>${esc(l.slice(3))}</h2>`);
      else out.push(`<p>${esc(l)}</p>`);
    });
    if (list) out.push('</ul>');
    return out.join('\n');
  };
  req.flash = (type, msg) => { req.session.flash = { type, msg }; };
  next();
});

app.use(csrfCheck);

app.use(require('./routes/public'));
app.use(require('./routes/auth'));
app.use('/area', require('./routes/area'));
app.use('/gestao', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('error', { title: res.locals.t('err.notFoundT'), message: res.locals.t('err.notFoundS') });
});
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err && (err.code === 'BAD_UPLOAD' || err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT')) {
    req.flash('error', res.locals.t('err.upload'));
    return res.redirect(req.get('Referer') || '/area');
  }
  console.error(err);
  res.status(500).render('error', { title: res.locals.t ? res.locals.t('err.serverT') : 'Erro', message: res.locals.t ? res.locals.t('err.serverS') : '' });
});

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => console.log(`Marketplace INCUBTRANS em ${BASE_URL()}`));
}

module.exports = app;
