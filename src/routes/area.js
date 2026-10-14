// Área reservada das entidades (empresas, incubadoras e agentes de desenvolvimento) — secção 7.9
const express = require('express');
const multer = require('multer');
const { all, get, run, tx } = require('../db');
const R = require('../lib/repo');
const U = require('../lib/util');
const { hashPassword, verifyPassword, passwordOk } = require('../lib/security');
const { emailHash } = require('../lib/security');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 5 } });

router.use((req, res, next) => {
  if (!req.user) return res.redirect(`/entrar?next=${encodeURIComponent(req.originalUrl)}`);
  if (req.user.role === 'admin') return res.redirect('/gestao');
  req.entity = R.getEntity('e.id = ?', req.user.entity_id);
  if (!req.entity) return res.redirect('/entrar');
  res.locals.entity = req.entity;
  res.locals.role = req.user.role;
  res.locals.pending = req.user.status === 'pendente';
  res.locals.tabs = tabsFor(req.user.role);
  res.locals.publicUrl = `/${{ empresa: 'empresas', incubadora: 'incubadoras', agente: 'agentes' }[req.user.role]}/${req.entity.slug}`;
  next();
});

function tabsFor(role) {
  const t = ['dash', 'perfil'];
  if (role === 'empresa') t.push('ofertas', 'avaliacoes');
  if (role === 'incubadora') t.push('programas', 'incubadas', 'posts');
  if (role === 'agente') t.push('projetos', 'posts');
  t.push('stats', 'conta');
  return t;
}
const only = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : res.status(403).render('error', { title: res.locals.t('err.forbiddenT'), message: res.locals.t('err.forbiddenS') }));
const ok = (req, key = 'area.guardado') => req.flash('ok', req.res.locals.t(key));

// ---------- Estatísticas (6.4) ----------
function statsFor(entityId, days) {
  const since = `datetime('now', '-${Number(days)} days')`;
  const tot = get(`SELECT SUM(type='view') v, SUM(type='contact') c FROM stats WHERE entity_id = ? AND created_at >= ${since}`, entityId);
  const prevSince = `datetime('now', '-${Number(days) * 2} days')`;
  const prev = get(`SELECT SUM(type='view') v, SUM(type='contact') c FROM stats WHERE entity_id = ? AND created_at >= ${prevSince} AND created_at < ${since}`, entityId);
  const byDay = all(`SELECT date(created_at) d, SUM(type='view') v, SUM(type='contact') c FROM stats WHERE entity_id = ? AND created_at >= ${since} GROUP BY d ORDER BY d`, entityId);
  const byChannel = all(`SELECT channel, COUNT(*) n FROM stats WHERE entity_id = ? AND type = 'contact' AND created_at >= ${since} GROUP BY channel ORDER BY n DESC`, entityId);
  const byOffer = all(`SELECT o.id, o.title_pt, o.title_es, o.kind, o.status, SUM(s.type='view') v, SUM(s.type='contact') c FROM offers o LEFT JOIN stats s ON s.offer_id = o.id AND s.created_at >= ${since}
                       WHERE o.entity_id = ? AND o.status != 'removido' GROUP BY o.id ORDER BY v DESC`, entityId);
  const byCategory = all(`SELECT c.name_pt, c.name_es, SUM(s.type='view') v, SUM(s.type='contact') c FROM stats s JOIN offers o ON o.id = s.offer_id JOIN categories c ON c.id = o.category_id
                          WHERE s.entity_id = ? AND s.created_at >= ${since} GROUP BY c.id ORDER BY v DESC`, entityId);
  const profile = get(`SELECT SUM(type='view') v, SUM(type='contact') c FROM stats WHERE entity_id = ? AND offer_id IS NULL AND created_at >= ${since}`, entityId);
  const v = tot.v || 0, c = tot.c || 0;
  const delta = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
  return { days, views: v, contacts: c, rate: v ? c / v : 0, dViews: delta(v, prev.v || 0), dContacts: delta(c, prev.c || 0), byDay, byChannel, byOffer, byCategory, profile };
}

router.get('/', (req, res) => {
  const e = req.entity;
  const days = [7, 30, 90].includes(Number(req.query.periodo)) ? Number(req.query.periodo) : 30;
  const data = { title: res.locals.t(`area.titulo.${req.user.role}`), tab: 'dash', stats: statsFor(e.id, days) };
  if (req.user.role === 'empresa') {
    data.activeOffers = get(`SELECT COUNT(*) n FROM offers WHERE entity_id = ? AND status = 'ativo'`, e.id).n;
    data.recent = all(`${R.OFFER_SELECT} WHERE o.entity_id = ? AND o.status != 'removido' ORDER BY o.created_at DESC LIMIT 4`, e.id).map(R.decorateOffer);
    data.rating = R.ratingOf(e.id);
    data.pendingReviews = get(`SELECT COUNT(*) n FROM reviews WHERE entity_id = ? AND status = 'publicada' AND reply IS NULL`, e.id).n;
  } else {
    data.programs = all('SELECT * FROM programs WHERE entity_id = ?', e.id);
    data.projects = all('SELECT * FROM projects WHERE entity_id = ?', e.id);
    data.posts = all(`SELECT * FROM posts WHERE entity_id = ? AND status != 'removido' ORDER BY date DESC LIMIT 4`, e.id);
    data.incubatedCount = get('SELECT COUNT(*) n FROM incubated WHERE entity_id = ?', e.id).n;
  }
  res.render('area/dashboard', data);
});

router.get('/estatisticas', (req, res) => {
  const days = [7, 30, 90, 365].includes(Number(req.query.periodo)) ? Number(req.query.periodo) : 30;
  res.render('area/stats', { title: res.locals.t('area.tabs.stats'), tab: 'stats', stats: statsFor(req.entity.id, days) });
});

// ---------- Perfil público (RF-04) ----------
router.get('/perfil', (req, res) => {
  res.render('area/profile', {
    title: res.locals.t('area.tabs.perfil'), tab: 'perfil',
    cats: all('SELECT * FROM categories WHERE active = 1 ORDER BY sort'),
    territories: all('SELECT * FROM territories ORDER BY country DESC, region, municipality'),
  });
});

router.post('/perfil', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res, next) => {
  try {
    const e = req.entity, b = req.body;
    const name = String(b.name || '').trim().slice(0, 160) || e.name;
    const nif = String(b.nif || '').trim().slice(0, 30) || null;
    const files = req.files || {};
    const logo = files.logo ? await R.saveImage(files.logo[0], { width: 400, height: 400 }) : (b.remove_logo ? null : e.logo);
    const cover = files.cover ? await R.saveImage(files.cover[0], { width: 1600, height: 700 }) : (b.remove_cover ? null : e.cover);
    if (logo !== e.logo) R.deleteImage(e.logo);
    if (cover !== e.cover) R.deleteImage(e.cover);
    const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
    const socials = arr(b.social_net).map((net, i) => ({ net: String(net).slice(0, 30), url: U.normUrl(arr(b.social_url)[i]) })).filter((s) => s.net && s.url).slice(0, 8);
    const locs = arr(b.loc_territory).map((tid, i) => ({
      territory_id: Number(tid) || null, address: String(arr(b.loc_address)[i] || '').slice(0, 200),
      phone: String(arr(b.loc_phone)[i] || '').slice(0, 40), email: String(arr(b.loc_email)[i] || '').slice(0, 160),
      coords: String(arr(b.loc_coords)[i] || ''),
    })).filter((l) => l.territory_id || l.address).slice(0, 10);
    const oldAddr = JSON.stringify(e.locations.map((l) => [l.territory_id, l.address || '']));
    const newAddr = JSON.stringify(locs.map((l) => [l.territory_id, l.address || null].map((x) => x || '')));

    tx(() => {
      run(`UPDATE entities SET name = ?, short_name = ?, desc_pt = ?, desc_es = ?, support_pt = ?, support_es = ?, year = ?, category_id = ?, areas = ?, services = ?, startups = ?, nif = ?,
           phone = ?, email = ?, website = ?, socials = ?, contact_person = ?, contact_person_public = ?, logo = ?, cover = ?, updated_at = datetime('now') WHERE id = ?`,
      name, String(b.short_name || '').slice(0, 60) || null, String(b.desc_pt || '').slice(0, 4000) || null, String(b.desc_es || '').slice(0, 4000) || null,
      String(b.support_pt || '').slice(0, 2000) || null, String(b.support_es || '').slice(0, 2000) || null,
      Number(b.year) || null, Number(b.category_id) || null, JSON.stringify(U.splitList(b.areas, 12)), JSON.stringify(U.splitList(b.services, 12)), Number(b.startups) || null, nif,
      String(b.phone || '').slice(0, 40), String(b.email || '').slice(0, 160), U.normUrl(b.website), JSON.stringify(socials),
      String(b.contact_person || '').slice(0, 120) || null, b.contact_person_public ? 1 : 0, logo, cover, e.id);
      run('DELETE FROM locations WHERE entity_id = ?', e.id);
      locs.forEach((l, i) => {
        const m = l.coords.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/);
        run('INSERT INTO locations(entity_id, territory_id, address, phone, email, lat, lng, sort) VALUES (?,?,?,?,?,?,?,?)', e.id, l.territory_id, l.address || null, l.phone || null, l.email || null, m ? Number(m[1]) : null, m ? Number(m[2]) : null, i);
      });
      // Alterar nome, NIF/CIF ou morada obriga a nova validação do selo "Verificado" (6.2)
      if (e.type === 'empresa' && e.verified && (name !== e.name || (nif || null) !== (e.nif || null) || oldAddr !== newAddr)) {
        run('UPDATE entities SET needs_revalidation = 1 WHERE id = ?', e.id);
        R.audit(req, 'revalidacao_pedida', e.name, 'Alteração de nome, NIF ou morada');
      }
    });
    ok(req);
    res.redirect('/area/perfil');
  } catch (err) { next(err); }
});

// ---------- Produtos e serviços (RF-05) ----------
router.get('/ofertas', only('empresa'), (req, res) => {
  const offers = all(`${R.OFFER_SELECT} WHERE o.entity_id = ? AND o.status != 'removido' ORDER BY o.created_at DESC`, req.entity.id).map(R.decorateOffer);
  const hl = all(`SELECT h.* FROM highlight_requests h JOIN offers o ON o.id = h.offer_id WHERE o.entity_id = ? ORDER BY h.created_at DESC`, req.entity.id);
  res.render('area/offers', { title: res.locals.t('area.tabs.ofertas'), tab: 'ofertas', offers, hl, canHighlight: !hasHighlight(req.entity.id) });
});

function hasHighlight(entityId) {
  return !!get(`SELECT 1 FROM offers o WHERE o.entity_id = ? AND (o.featured_until > datetime('now') OR EXISTS (SELECT 1 FROM highlight_requests h WHERE h.offer_id = o.id AND h.status = 'pendente'))`, entityId);
}

function offerForm(res, o, tab = 'ofertas') {
  return { title: res.locals.t(o.id ? 'area.editarOferta' : 'area.novaOferta'), tab, o, cats: all('SELECT * FROM categories WHERE active = 1 ORDER BY sort') };
}
router.get('/ofertas/nova', only('empresa'), (req, res) => res.render('area/offer-form', offerForm(res, { kind: 'produto', price_type: 'fixo', status: 'ativo', tags: [], images: [] })));
router.get('/ofertas/:id', only('empresa'), (req, res, next) => {
  const o = R.decorateOffer(get(`SELECT * FROM offers WHERE id = ? AND entity_id = ? AND status != 'removido'`, Number(req.params.id), req.entity.id));
  if (!o) return next();
  res.render('area/offer-form', offerForm(res, o));
});

async function saveOffer(req, res, existing) {
  const b = req.body;
  const t = res.locals.t;
  const kind = b.kind === 'servico' ? 'servico' : 'produto';
  const priceType = ['fixo', 'negociavel', 'consulta', 'gratis'].includes(b.price_type) ? b.price_type : 'fixo';
  const title_pt = String(b.title_pt || '').trim().slice(0, 140), title_es = String(b.title_es || '').trim().slice(0, 140);
  const draft = { ...(existing || {}), ...b, kind, price_type: priceType, tags: U.splitList(b.tags, 5), images: existing ? existing.images : [] };
  const errs = [];
  if (!title_pt && !title_es) errs.push(t('auth.errNome'));
  const price = priceType === 'fixo' || priceType === 'negociavel' ? U.parsePrice(b.price) : null;
  if (priceType === 'fixo' && price == null) errs.push(`${t('area.preco')}: ${t('lbl.obrigatorio')}`);
  let images = existing ? existing.images.filter((src) => !U.splitList([].concat(b.remove_images || []).join(',')).includes(src)) : [];
  const removed = existing ? existing.images.filter((src) => !images.includes(src)) : [];
  const files = req.files || [];
  if (images.length + files.length > 5) errs.push(t('area.imagensAj'));
  if (errs.length) { draft.price = b.price; return res.status(400).render('area/offer-form', { ...offerForm(res, draft), errs }); }
  for (const f of files) images.push(await R.saveImage(f));
  removed.forEach(R.deleteImage);
  const fields = [kind, title_pt || null, title_es || null, String(b.desc_pt || '').slice(0, 5000) || null, String(b.desc_es || '').slice(0, 5000) || null,
    Number(b.category_id) || null, JSON.stringify(U.splitList(b.tags, 5)), price, priceType, JSON.stringify(images), b.status === 'inativo' ? 'inativo' : 'ativo'];
  if (existing) {
    run(`UPDATE offers SET kind=?, title_pt=?, title_es=?, desc_pt=?, desc_es=?, category_id=?, tags=?, price_cents=?, price_type=?, images=?, status=?, updated_at=datetime('now') WHERE id = ?`, ...fields, existing.id);
    return existing.id;
  }
  const slug = U.uniqueSlug(title_pt || title_es, (s) => !!get('SELECT 1 FROM offers WHERE slug = ?', s));
  return Number(run(`INSERT INTO offers(kind, title_pt, title_es, desc_pt, desc_es, category_id, tags, price_cents, price_type, images, status, entity_id, slug) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, ...fields, req.entity.id, slug).lastInsertRowid);
}

router.post('/ofertas', only('empresa'), upload.array('images', 5), async (req, res, next) => {
  try { const id = await saveOffer(req, res, null); if (res.headersSent) return; ok(req, 'area.criado'); res.redirect(`/area/ofertas#o${id}`); } catch (e) { next(e); }
});
router.post('/ofertas/:id', only('empresa'), upload.array('images', 5), async (req, res, next) => {
  try {
    const o = R.decorateOffer(get(`SELECT * FROM offers WHERE id = ? AND entity_id = ? AND status != 'removido'`, Number(req.params.id), req.entity.id));
    if (!o) return next();
    await saveOffer(req, res, o); if (res.headersSent) return;
    ok(req); res.redirect(`/area/ofertas#o${o.id}`);
  } catch (e) { next(e); }
});
router.post('/ofertas/:id/estado', only('empresa'), (req, res) => {
  run(`UPDATE offers SET status = CASE status WHEN 'ativo' THEN 'inativo' ELSE 'ativo' END, updated_at = datetime('now') WHERE id = ? AND entity_id = ? AND status != 'removido'`, Number(req.params.id), req.entity.id);
  ok(req); res.redirect('/area/ofertas');
});
router.post('/ofertas/:id/eliminar', only('empresa'), (req, res) => {
  const o = R.decorateOffer(get('SELECT * FROM offers WHERE id = ? AND entity_id = ?', Number(req.params.id), req.entity.id));
  if (o) { o.images.forEach(R.deleteImage); run('DELETE FROM offers WHERE id = ?', o.id); run('DELETE FROM stats WHERE offer_id = ?', o.id); }
  ok(req, 'area.eliminado'); res.redirect('/area/ofertas');
});
// Pedido de destaque (6.3): 1 destaque ativo ou pendente por empresa
router.post('/ofertas/:id/destaque', only('empresa'), (req, res) => {
  const o = get(`SELECT id FROM offers WHERE id = ? AND entity_id = ? AND status = 'ativo'`, Number(req.params.id), req.entity.id);
  if (!o) return res.redirect('/area/ofertas');
  if (hasHighlight(req.entity.id)) { req.flash('error', res.locals.t('area.destaqueLimite')); return res.redirect('/area/ofertas'); }
  run('INSERT INTO highlight_requests(offer_id) VALUES (?)', o.id);
  req.flash('ok', res.locals.t('area.destaquePedido'));
  res.redirect('/area/ofertas');
});

// ---------- Programas, empresas incubadas, projetos, eventos/notícias (RF-11, RF-12, RF-13) ----------
const STATUS = ['ativo', 'inativo', 'terminado'];
const COLLECTIONS = {
  programas: { roles: ['incubadora'], table: 'programs', order: 'name', fields: [
    { k: 'name', label: 'area.nome', req: true, max: 140 }, { k: 'description', label: 'area.descricao_', type: 'textarea', max: 2000 },
    { k: 'status', label: 'area.estado', type: 'status' }, { k: 'duration_months', label: 'area.duracao', type: 'number' }] },
  incubadas: { roles: ['incubadora'], table: 'incubated', order: 'year DESC, name', image: 'logo', fields: [
    { k: 'name', label: 'area.nome', req: true, max: 140 }, { k: 'description', label: 'area.descricao_', type: 'textarea', max: 1000 },
    { k: 'year', label: 'area.ano_', type: 'number' }, { k: 'area', label: 'area.area_', max: 80 }, { k: 'website', label: 'area.website', type: 'url' }] },
  projetos: { roles: ['agente'], table: 'projects', order: 'start_date DESC', fields: [
    { k: 'name', label: 'area.nome', req: true, max: 140 }, { k: 'description', label: 'area.descricao_', type: 'textarea', max: 3000 },
    { k: 'status', label: 'area.estado', type: 'status' }, { k: 'start_date', label: 'area.inicio', type: 'date' }, { k: 'end_date', label: 'area.fim', type: 'date' },
    { k: 'partners', label: 'area.parceiros', type: 'textarea', max: 1000 }, { k: 'website', label: 'area.website', type: 'url' }] },
  posts: { roles: ['incubadora', 'agente'], table: 'posts', order: 'date DESC', image: 'image', where: "status != 'removido'", fields: [
    { k: 'kind', label: 'area.tipoPost', type: 'kind' }, { k: 'title', label: 'area.nome', req: true, max: 160 }, { k: 'date', label: 'area.data', type: 'date', req: true },
    { k: 'place', label: 'area.local', max: 160 }, { k: 'body', label: 'area.texto', type: 'textarea', max: 5000 }, { k: 'status', label: 'area.estado', type: 'onoff' }] },
};

function cleanField(f, v) {
  v = v == null ? '' : String(v).trim();
  if (f.type === 'number') return v === '' ? null : Number(v) || null;
  if (f.type === 'status') return STATUS.includes(v) ? v : 'ativo';
  if (f.type === 'onoff') return v === 'inativo' ? 'inativo' : 'ativo';
  if (f.type === 'kind') return v === 'noticia' ? 'noticia' : 'evento';
  if (f.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  if (f.type === 'url') return U.normUrl(v) || null;
  return v.slice(0, f.max || 500) || null;
}

for (const [slug, C] of Object.entries(COLLECTIONS)) {
  const guard = only(...C.roles);
  const where = C.where ? ` AND ${C.where}` : '';
  router.get(`/${slug}`, guard, (req, res) => {
    const items = all(`SELECT * FROM ${C.table} WHERE entity_id = ?${where} ORDER BY ${C.order}`, req.entity.id);
    const edit = req.query.editar ? items.find((i) => i.id === Number(req.query.editar)) : null;
    res.render('area/items', { title: res.locals.t(`area.tabs.${slug}`), tab: slug, slug, C, items, edit });
  });
  const handler = (isNew) => [guard, upload.single('file'), async (req, res, next) => {
    try {
      const item = isNew ? null : get(`SELECT * FROM ${C.table} WHERE id = ? AND entity_id = ?`, Number(req.params.id), req.entity.id);
      if (!isNew && !item) return next();
      const vals = C.fields.map((f) => cleanField(f, req.body[f.k]));
      if (C.fields.some((f, i) => f.req && !vals[i])) { req.flash('error', res.locals.t('auth.errNome')); return res.redirect(`/area/${slug}`); }
      const cols = C.fields.map((f) => f.k);
      if (C.image) {
        let img = item ? item[C.image] : null;
        if (req.file) { R.deleteImage(img); img = await R.saveImage(req.file, { width: 1000, height: 1000 }); } else if (req.body.remove_file) { R.deleteImage(img); img = null; }
        cols.push(C.image); vals.push(img);
      }
      if (isNew) run(`INSERT INTO ${C.table}(entity_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`, req.entity.id, ...vals);
      else run(`UPDATE ${C.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...vals, item.id);
      ok(req, isNew ? 'area.criado' : 'area.guardado');
      res.redirect(`/area/${slug}`);
    } catch (e) { next(e); }
  }];
  router.post(`/${slug}`, ...handler(true));
  router.post(`/${slug}/:id`, ...handler(false));
  router.post(`/${slug}/:id/eliminar`, guard, (req, res) => {
    const item = get(`SELECT * FROM ${C.table} WHERE id = ? AND entity_id = ?`, Number(req.params.id), req.entity.id);
    if (item) { if (C.image) R.deleteImage(item[C.image]); run(`DELETE FROM ${C.table} WHERE id = ?`, item.id); }
    ok(req, 'area.eliminado'); res.redirect(`/area/${slug}`);
  });
}

// ---------- Avaliações recebidas (RF-15) ----------
router.get('/avaliacoes', only('empresa'), (req, res) => {
  const reviews = all(`SELECT * FROM reviews WHERE entity_id = ? AND status = 'publicada' ORDER BY created_at DESC`, req.entity.id);
  res.render('area/reviews', { title: res.locals.t('area.tabs.avaliacoes'), tab: 'avaliacoes', reviews, rating: R.ratingOf(req.entity.id) });
});
router.post('/avaliacoes/:id/responder', only('empresa'), (req, res) => {
  const reply = String(req.body.reply || '').trim().slice(0, 1500) || null;
  run(`UPDATE reviews SET reply = ?, reply_at = CASE WHEN ? IS NULL THEN NULL ELSE datetime('now') END WHERE id = ? AND entity_id = ?`, reply, reply, Number(req.params.id), req.entity.id);
  ok(req); res.redirect('/area/avaliacoes');
});
router.post('/avaliacoes/:id/denunciar', only('empresa'), (req, res) => {
  const r = get('SELECT id FROM reviews WHERE id = ? AND entity_id = ?', Number(req.params.id), req.entity.id);
  if (r) run(`INSERT INTO reports(target_type, target_id, reason, details) VALUES ('avaliacao', ?, ?, ?)`, r.id, 'outro', `Denunciada pela empresa: ${String(req.body.details || '').slice(0, 1000)}`);
  req.flash('ok', res.locals.t('report.ok')); res.redirect('/area/avaliacoes');
});

// ---------- Conta, exportação e eliminação de dados (RF-22, RGPD) ----------
router.get('/conta', (req, res) => res.render('area/account', { title: res.locals.t('area.tabs.conta'), tab: 'conta' }));
router.post('/conta/password', (req, res) => {
  const t = res.locals.t;
  const u = get('SELECT password_hash FROM users WHERE id = ?', req.user.id);
  if (!verifyPassword(String(req.body.current || ''), u.password_hash)) { req.flash('error', t('area.passErr')); return res.redirect('/area/conta'); }
  if (!passwordOk(req.body.password)) { req.flash('error', t('auth.errPass')); return res.redirect('/area/conta'); }
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(req.body.password), req.user.id);
  req.flash('ok', t('area.passOk')); res.redirect('/area/conta');
});
router.post('/conta/dados', (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120);
  const lang = req.body.lang === 'es' ? 'es' : 'pt';
  if (name) run('UPDATE users SET name = ?, lang = ? WHERE id = ?', name, lang, req.user.id);
  res.append('Set-Cookie', `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`);
  ok(req); res.redirect('/area/conta');
});
router.get('/conta/exportar', (req, res) => {
  const e = req.entity;
  const strip = (r) => { const { password_hash, verify_token, reset_token, reset_expires, ...rest } = r; return rest; }; // eslint-disable-line no-unused-vars
  const data = {
    exportado_em: new Date().toISOString(),
    utilizador: strip(get('SELECT * FROM users WHERE id = ?', req.user.id)),
    entidade: { ...get('SELECT * FROM entities WHERE id = ?', e.id), localizacoes: all('SELECT * FROM locations WHERE entity_id = ?', e.id) },
    ofertas: all('SELECT * FROM offers WHERE entity_id = ?', e.id),
    programas: all('SELECT * FROM programs WHERE entity_id = ?', e.id),
    empresas_incubadas: all('SELECT * FROM incubated WHERE entity_id = ?', e.id),
    projetos: all('SELECT * FROM projects WHERE entity_id = ?', e.id),
    eventos_noticias: all('SELECT * FROM posts WHERE entity_id = ?', e.id),
    avaliacoes_recebidas: all('SELECT id, rating, comment, author_name, status, reply, reply_at, created_at FROM reviews WHERE entity_id = ?', e.id),
    pedidos_destaque: all('SELECT h.* FROM highlight_requests h JOIN offers o ON o.id = h.offer_id WHERE o.entity_id = ?', e.id),
    estatisticas_agregadas: all(`SELECT date(created_at) dia, type tipo, channel canal, COUNT(*) n FROM stats WHERE entity_id = ? GROUP BY 1,2,3 ORDER BY 1`, e.id),
  };
  res.set('Content-Disposition', `attachment; filename="incubtrans-${e.slug}-dados.json"`);
  res.type('application/json').send(JSON.stringify(data, null, 2));
});
router.post('/conta/eliminar', (req, res) => {
  const t = res.locals.t;
  if (String(req.body.confirm || '').trim().toUpperCase() !== (req.lang === 'es' ? 'ELIMINAR' : 'ELIMINAR')) { req.flash('error', t('area.eliminarConfirm')); return res.redirect('/area/conta'); }
  const e = req.entity;
  const imgs = [e.logo, e.cover, ...all('SELECT images FROM offers WHERE entity_id = ?', e.id).flatMap((o) => U.parseJSON(o.images, [])),
    ...all('SELECT logo FROM incubated WHERE entity_id = ?', e.id).map((r) => r.logo), ...all('SELECT image FROM posts WHERE entity_id = ?', e.id).map((r) => r.image)];
  tx(() => {
    run('DELETE FROM stats WHERE entity_id = ?', e.id);
    run('DELETE FROM users WHERE id = ?', req.user.id);
    run('DELETE FROM entities WHERE id = ?', e.id);
  });
  imgs.forEach(R.deleteImage);
  R.audit(req, 'conta_eliminada_pelo_utilizador', `${e.type}: ${e.name}`);
  req.destroySession();
  res.render('message', { title: t('btn.eliminarConta'), heading: t('area.eliminado'), message: '', backUrl: '/' });
});

module.exports = router;
module.exports.statsFor = statsFor;
module.exports.emailHash = emailHash;
