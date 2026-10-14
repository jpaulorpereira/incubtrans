const express = require('express');
const { all, get, run } = require('../db');
const R = require('../lib/repo');
const U = require('../lib/util');
const { emailHash, rateLimit, newCaptcha, checkCaptcha } = require('../lib/security');
const { sendTemplate, send, BASE_URL } = require('../lib/mail');

const router = express.Router();
const ip = (req) => req.ip || 'x';

function categories() { return all('SELECT * FROM categories WHERE active = 1 ORDER BY sort, name_pt'); }

// ---------- Página inicial ----------
router.get('/', (req, res) => {
  const counts = {
    offers: get(`SELECT COUNT(*) n FROM offers o JOIN entities e ON e.id = o.entity_id WHERE o.status = 'ativo' AND ${R.PUBLIC_ENTITY}`).n,
    empresas: get(`SELECT COUNT(*) n FROM entities e WHERE e.type = 'empresa' AND ${R.PUBLIC_ENTITY}`).n,
    incubadoras: get(`SELECT COUNT(*) n FROM entities e WHERE e.type = 'incubadora' AND ${R.PUBLIC_ENTITY}`).n,
    territorios: get(`SELECT COUNT(DISTINCT l.territory_id) n FROM locations l JOIN entities e ON e.id = l.entity_id WHERE ${R.PUBLIC_ENTITY}`).n,
  };
  let featured = R.searchOffers({ featuredOnly: true, pageSize: 4 }).rows;
  const recent = R.searchOffers({ sort: 'recentes', pageSize: 4 }).rows.filter((o) => !featured.some((f) => f.id === o.id)).slice(0, 4);
  const cats = all(`SELECT c.*, (SELECT COUNT(*) FROM offers o JOIN entities e ON e.id = o.entity_id WHERE o.category_id = c.id AND o.status = 'ativo' AND ${R.PUBLIC_ENTITY}) AS n
                    FROM categories c WHERE c.active = 1 AND c.featured = 1 ORDER BY c.sort`);
  res.render('home', {
    title: res.locals.t('site.name'),
    counts, featured, recent, cats,
    incubs: R.searchEntities('incubadora', { pageSize: 2 }).rows,
    agents: R.searchEntities('agente', { pageSize: 2 }).rows,
  });
});

// ---------- Pesquisa global e sugestões (RF-24) ----------
function globalSearch(q, limit) {
  const like = `%${q}%`;
  const offers = all(`${R.OFFER_SELECT} WHERE o.status = 'ativo' AND ${R.PUBLIC_ENTITY} AND (o.title_pt LIKE ? OR o.title_es LIKE ? OR o.tags LIKE ? OR o.desc_pt LIKE ? OR o.desc_es LIKE ?) ORDER BY o.created_at DESC LIMIT ?`, like, like, like, like, like, limit).map(R.decorateOffer);
  const entities = all(`SELECT e.* FROM entities e WHERE ${R.PUBLIC_ENTITY} AND (e.name LIKE ? OR e.short_name LIKE ? OR e.desc_pt LIKE ? OR e.desc_es LIKE ? OR e.areas LIKE ?) ORDER BY e.name LIMIT ?`, like, like, like, like, like, limit).map(R.decorateEntity);
  const places = all(`SELECT DISTINCT t.municipality, t.region, t.country FROM territories t JOIN locations l ON l.territory_id = t.id JOIN entities e ON e.id = l.entity_id WHERE ${R.PUBLIC_ENTITY} AND (t.municipality LIKE ? OR t.region LIKE ?) LIMIT 5`, like, like);
  return { offers, entities, places };
}
const entityPath = (e) => `/${{ empresa: 'empresas', incubadora: 'incubadoras', agente: 'agentes' }[e.type]}/${e.slug}`;

router.get('/api/sugestoes', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json([]);
  const lang = req.lang;
  const { offers, entities, places } = globalSearch(q, 5);
  const t = res.locals.t;
  res.json([
    ...offers.map((o) => ({ label: (lang === 'es' ? o.title_es || o.title_pt : o.title_pt || o.title_es), kind: res.locals.kindLabel(o.kind), url: `/produtos/${o.slug}` })),
    ...entities.map((e) => ({ label: e.name, kind: t(`lbl.${e.type}`), url: entityPath(e) })),
    ...places.map((p) => ({ label: `${p.municipality} (${res.locals.country(p.country)})`, kind: t('lbl.localizacao'), url: `/produtos?local=${encodeURIComponent(p.municipality)}` })),
  ].slice(0, 10));
});

router.get('/pesquisa', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  const r = q ? globalSearch(q, 24) : { offers: [], entities: [], places: [] };
  res.render('search', { title: `${res.locals.t('btn.pesquisar')}: ${q}`, q, ...r, entityPath });
});

// ---------- Produtos e serviços ----------
router.get('/produtos', (req, res) => {
  const f = { q: String(req.query.q || '').slice(0, 80), kind: req.query.tipo, category: req.query.categoria, region: req.query.local, sort: req.query.ordem, page: req.query.pagina };
  const result = R.searchOffers(f);
  res.render('offers', { title: res.locals.t('nav.produtos'), result, f, cats: categories(), regions: R.regionsInUse(), view: req.query.vista === 'lista' ? 'lista' : 'grelha' });
});

router.get('/produtos/:slug', (req, res, next) => {
  const o = R.decorateOffer(get(`${R.OFFER_SELECT} WHERE o.slug = ? AND o.status = 'ativo' AND ${R.PUBLIC_ENTITY}`, req.params.slug));
  if (!o) return next();
  const seller = R.getEntity('e.id = ?', o.entity_id);
  R.logStat(o.entity_id, 'view', { offerId: o.id });
  const related = all(`${R.OFFER_SELECT} WHERE o.status = 'ativo' AND ${R.PUBLIC_ENTITY} AND o.id != ? AND (o.category_id = ? OR o.entity_id = ?) ORDER BY (o.entity_id = ?) DESC, o.created_at DESC LIMIT 3`, o.id, o.category_id, o.entity_id, o.entity_id).map(R.decorateOffer);
  const reviews = all(`SELECT * FROM reviews WHERE entity_id = ? AND status = 'publicada' ORDER BY created_at DESC LIMIT 5`, o.entity_id);
  res.render('offer', { title: res.locals.pick(o, 'title'), o, seller, related, reviews, rating: R.ratingOf(o.entity_id), captcha: newCaptcha(req, 'review') });
});

// ---------- Páginas de entidades ----------
function entityPage(type, view) {
  return (req, res, next) => {
    const e = R.getEntity(`e.slug = ? AND e.type = ? AND ${R.PUBLIC_ENTITY}`, req.params.slug, type);
    if (!e) return next();
    R.logStat(e.id, 'view');
    const data = { title: e.name, e };
    if (type === 'empresa') {
      data.offers = all(`${R.OFFER_SELECT} WHERE o.entity_id = ? AND o.status = 'ativo' ORDER BY o.created_at DESC`, e.id).map(R.decorateOffer);
      data.reviews = all(`SELECT * FROM reviews WHERE entity_id = ? AND status = 'publicada' ORDER BY created_at DESC`, e.id);
      data.rating = R.ratingOf(e.id);
      data.captcha = newCaptcha(req, 'review');
    } else {
      data.programs = all(`SELECT * FROM programs WHERE entity_id = ? ORDER BY CASE status WHEN 'ativo' THEN 0 WHEN 'inativo' THEN 1 ELSE 2 END, name`, e.id);
      data.projects = all(`SELECT * FROM projects WHERE entity_id = ? ORDER BY CASE status WHEN 'ativo' THEN 0 WHEN 'inativo' THEN 1 ELSE 2 END, start_date DESC`, e.id);
      data.incubated = all('SELECT * FROM incubated WHERE entity_id = ? ORDER BY year DESC, name', e.id);
      data.posts = all(`SELECT * FROM posts WHERE entity_id = ? AND status = 'ativo' ORDER BY date DESC LIMIT 6`, e.id);
    }
    res.render(view, data);
  };
}
router.get('/empresas/:slug', entityPage('empresa', 'company'));
router.get('/incubadoras/:slug', entityPage('incubadora', 'entity'));
router.get('/agentes/:slug', entityPage('agente', 'entity'));

function entityList(type) {
  return (req, res) => {
    const f = { q: String(req.query.q || '').slice(0, 80), area: req.query.area, region: req.query.local, sort: req.query.ordem, page: req.query.pagina };
    const result = R.searchEntities(type, f);
    res.render('entities', { title: res.locals.t(type === 'incubadora' ? 'nav.incubadoras' : 'nav.agentes'), type, result, f, areas: R.entityAreas(type), regions: R.regionsInUse(), view: req.query.vista === 'lista' ? 'lista' : 'grelha' });
  };
}
router.get('/incubadoras', entityList('incubadora'));
router.get('/agentes', entityList('agente'));

// ---------- Mapa (RF-14) ----------
router.get('/mapa', (req, res) => {
  res.render('map', { title: res.locals.t('map.title'), cats: categories(), regions: R.regionsInUse() });
});
router.get('/api/mapa', (req, res) => {
  const rows = all(`SELECT e.id, e.type, e.name, e.slug, e.category_id, e.logo, e.desc_pt, e.desc_es, l.address, t.municipality, t.region, t.country,
      COALESCE(l.lat, t.lat) AS lat, COALESCE(l.lng, t.lng) AS lng
    FROM entities e JOIN locations l ON l.entity_id = e.id LEFT JOIN territories t ON t.id = l.territory_id WHERE ${R.PUBLIC_ENTITY}`);
  res.json(rows.filter((r) => r.lat != null).map((r) => ({
    id: r.id, type: r.type, name: r.name, url: entityPath(r), category: r.category_id, region: r.region, country: r.country,
    place: [r.address, r.municipality].filter(Boolean).join(', '), lat: r.lat, lng: r.lng,
    desc: String((req.lang === 'es' ? r.desc_es || r.desc_pt : r.desc_pt || r.desc_es) || '').slice(0, 140),
    typeLabel: res.locals.t(`lbl.${r.type}`),
  })));
});

// ---------- Contactos rastreados (sem dados pessoais) ----------
router.get('/contacto/:id/:channel{/:idx}', (req, res, next) => {
  const e = get(`SELECT e.* FROM entities e WHERE e.id = ? AND ${R.PUBLIC_ENTITY}`, Number(req.params.id));
  if (!e) return next();
  const offerId = req.query.o ? Number(req.query.o) : null;
  const validOffer = offerId && get('SELECT id FROM offers WHERE id = ? AND entity_id = ?', offerId, e.id) ? offerId : null;
  let target = null, channel = req.params.channel;
  if (channel === 'telefone' && e.phone) target = `tel:${e.phone.replace(/[^\d+]/g, '')}`;
  else if (channel === 'email' && e.email) target = `mailto:${e.email}`;
  else if (channel === 'website' && e.website) target = U.normUrl(e.website);
  else if (channel === 'redes') { const s = U.parseJSON(e.socials, [])[Number(req.params.idx) || 0]; if (s) target = U.normUrl(s.url); }
  else if (channel === 'local') {
    const l = get('SELECT * FROM locations WHERE id = ? AND entity_id = ?', Number(req.params.idx), e.id);
    if (l && req.query.k === 'telefone' && l.phone) { target = `tel:${l.phone.replace(/[^\d+]/g, '')}`; channel = 'telefone'; }
    if (l && req.query.k === 'email' && l.email) { target = `mailto:${l.email}`; channel = 'email'; }
  }
  if (!target) return next();
  R.logStat(e.id, 'contact', { offerId: validOffer, channel });
  res.redirect(target);
});

// ---------- Avaliações sem conta, com confirmação por email (6.2) ----------
router.post('/avaliar/:slug', (req, res, next) => {
  const t = res.locals.t;
  const e = get(`SELECT e.* FROM entities e WHERE e.slug = ? AND e.type = 'empresa' AND ${R.PUBLIC_ENTITY}`, req.params.slug);
  if (!e) return next();
  const back = req.body.back && String(req.body.back).startsWith('/') ? String(req.body.back) : `/empresas/${e.slug}`;
  const rating = Number(req.body.rating);
  const email = String(req.body.email || '').trim();
  const fail = (msg) => { req.flash('error', msg); res.redirect(`${back}#avaliar`); };
  if (!rateLimit(`review:${ip(req)}`, 5, 60 * 60 * 1000)) return fail(t('auth.errLimite'));
  if (!checkCaptcha(req, 'review', req.body.captcha)) return fail(t('auth.errCaptcha'));
  if (!(rating >= 1 && rating <= 5)) return fail(t('review.errNota'));
  if (!U.isEmail(email)) return fail(t('auth.errEmail'));
  const h = emailHash(email);
  const existing = get('SELECT * FROM reviews WHERE entity_id = ? AND email_hash = ?', e.id, h);
  if (existing && existing.status !== 'por_confirmar') return fail(t('review.jaExiste'));
  const tok = U.token();
  const comment = String(req.body.comment || '').trim().slice(0, 1500);
  const name = String(req.body.name || '').trim().slice(0, 60);
  if (existing) run('UPDATE reviews SET rating = ?, comment = ?, author_name = ?, confirm_token = ?, created_at = datetime(\'now\') WHERE id = ?', rating, comment, name, tok, existing.id);
  else run('INSERT INTO reviews(entity_id, rating, comment, author_name, email_hash, confirm_token) VALUES (?,?,?,?,?,?)', e.id, rating, comment, name, h, tok);
  // o email é usado só para este envio e não fica guardado em claro
  sendTemplate('confirmar_avaliacao', email, req.lang, { entity: e.name, rating, link: `${BASE_URL()}/avaliacao/confirmar/${tok}` });
  res.render('message', { title: t('review.enviadaT'), heading: t('review.enviadaT'), message: t('review.enviadaS'), backUrl: back });
});

router.get('/avaliacao/confirmar/:token', (req, res) => {
  const t = res.locals.t;
  const r = get(`SELECT r.*, e.slug, e.name FROM reviews r JOIN entities e ON e.id = r.entity_id WHERE r.confirm_token = ? AND r.status = 'por_confirmar'`, req.params.token);
  if (!r) return res.status(400).render('message', { title: t('auth.tokenInvalido'), heading: t('auth.tokenInvalido'), message: '', backUrl: '/' });
  run(`UPDATE reviews SET status = 'publicada', confirm_token = NULL WHERE id = ?`, r.id);
  const owner = get('SELECT name, email, lang FROM users WHERE entity_id = ?', r.entity_id);
  if (owner) sendTemplate('nova_avaliacao', owner.email, owner.lang, { name: owner.name, entity: r.name, rating: r.rating });
  res.render('message', { title: t('review.confirmadaT'), heading: t('review.confirmadaT'), message: t('review.confirmadaS'), backUrl: `/empresas/${r.slug}#avaliacoes` });
});

// ---------- Denúncias (RF-23) ----------
const REPORT_TYPES = ['oferta', 'entidade', 'avaliacao', 'post'];
router.get('/denunciar/:type/:id', (req, res, next) => {
  if (!REPORT_TYPES.includes(req.params.type)) return next();
  res.render('report', { title: res.locals.t('report.title'), type: req.params.type, id: Number(req.params.id), back: String(req.query.voltar || '/'), captcha: newCaptcha(req, 'report') });
});
router.post('/denunciar/:type/:id', (req, res, next) => {
  const t = res.locals.t;
  if (!REPORT_TYPES.includes(req.params.type)) return next();
  const back = String(req.body.back || '/').startsWith('/') ? String(req.body.back) : '/';
  if (!rateLimit(`report:${ip(req)}`, 10, 60 * 60 * 1000)) { req.flash('error', t('auth.errLimite')); return res.redirect(back); }
  if (!checkCaptcha(req, 'report', req.body.captcha)) { req.flash('error', t('auth.errCaptcha')); return res.redirect(`/denunciar/${req.params.type}/${req.params.id}?voltar=${encodeURIComponent(back)}`); }
  const reason = Object.keys(t('report.motivos')).includes(req.body.reason) ? req.body.reason : 'outro';
  run('INSERT INTO reports(target_type, target_id, reason, details) VALUES (?,?,?,?)', req.params.type, Number(req.params.id), reason, String(req.body.details || '').slice(0, 1500));
  req.flash('ok', t('report.ok'));
  res.redirect(back);
});

// ---------- Páginas institucionais, contactos, cookies ----------
for (const slug of ['sobre', 'como-funciona', 'termos', 'privacidade']) {
  router.get(`/${slug}`, (req, res, next) => {
    const p = get('SELECT * FROM pages WHERE slug = ? AND published = 1', slug);
    if (!p) return next();
    res.render('page', { title: res.locals.pick(p, 'title'), p, partners: slug === 'sobre' });
  });
}
router.get('/p/:slug', (req, res, next) => {
  const p = get('SELECT * FROM pages WHERE slug = ? AND published = 1', req.params.slug);
  if (!p) return next();
  res.render('page', { title: res.locals.pick(p, 'title'), p, partners: false });
});

router.get('/contactos', (req, res) => {
  res.render('contact', { title: res.locals.t('contact.band'), faqs: all('SELECT * FROM faqs ORDER BY sort'), sent: false, err: null, form: {}, captcha: newCaptcha(req, 'contact') });
});
router.post('/contactos', (req, res) => {
  const t = res.locals.t;
  const f = { name: String(req.body.name || '').trim().slice(0, 120), email: String(req.body.email || '').trim().slice(0, 160), organization: String(req.body.organization || '').slice(0, 160), subject: String(req.body.subject || '').slice(0, 160), message: String(req.body.message || '').trim().slice(0, 4000) };
  let err = null;
  if (!rateLimit(`contact:${ip(req)}`, 5, 60 * 60 * 1000)) err = t('auth.errLimite');
  else if (!checkCaptcha(req, 'contact', req.body.captcha)) err = t('auth.errCaptcha');
  else if (!f.name || !U.isEmail(f.email) || !f.message || !req.body.rgpd) err = t('contact.erro');
  if (err) return res.status(400).render('contact', { title: t('contact.band'), faqs: all('SELECT * FROM faqs ORDER BY sort'), sent: false, err, form: f, captcha: newCaptcha(req, 'contact') });
  run('INSERT INTO contact_messages(name, email, organization, subject, message) VALUES (?,?,?,?,?)', f.name, f.email, f.organization, f.subject, f.message);
  send(process.env.ADMIN_EMAIL || 'admin@incubtrans.eu', `Nova mensagem de contacto: ${f.subject || f.name}`, `${f.name} <${f.email}> (${f.organization})\n\n${f.message}`);
  res.render('contact', { title: t('contact.band'), faqs: all('SELECT * FROM faqs ORDER BY sort'), sent: true, err: null, form: {}, captcha: null });
});

router.post('/cookies', (req, res) => {
  const v = req.body.maps === '1' ? 'maps' : 'none';
  res.append('Set-Cookie', `consent=${v}; Path=/; Max-Age=15552000; SameSite=Lax`);
  const back = String(req.body.back || '/');
  res.redirect(back.startsWith('/') ? back : '/');
});

// ---------- SEO: sitemap e robots (RNF-06) ----------
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /area\nDisallow: /gestao\nDisallow: /contacto/\nSitemap: ${BASE_URL()}/sitemap.xml\n`);
});
router.get('/sitemap.xml', (req, res) => {
  const urls = ['/', '/produtos', '/incubadoras', '/agentes', '/mapa', '/sobre', '/como-funciona', '/contactos', '/termos', '/privacidade'];
  all(`SELECT o.slug FROM offers o JOIN entities e ON e.id = o.entity_id WHERE o.status = 'ativo' AND ${R.PUBLIC_ENTITY}`).forEach((o) => urls.push(`/produtos/${o.slug}`));
  all(`SELECT e.type, e.slug FROM entities e WHERE ${R.PUBLIC_ENTITY}`).forEach((e) => urls.push(entityPath(e)));
  const base = BASE_URL();
  const body = urls.map((u) => `<url><loc>${base}${u}</loc><xhtml:link rel="alternate" hreflang="pt" href="${base}${u}${u.includes('?') ? '&' : '?'}lang=pt"/><xhtml:link rel="alternate" hreflang="es" href="${base}${u}${u.includes('?') ? '&' : '?'}lang=es"/></url>`).join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`);
});

module.exports = router;
