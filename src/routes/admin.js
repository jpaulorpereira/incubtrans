// Área de administração (secção 7.10). Endereço próprio (/gestao), fora da navegação pública.
const express = require('express');
const { all, get, run, tx } = require('../db');
const R = require('../lib/repo');
const U = require('../lib/util');
const { sendTemplate } = require('../lib/mail');

const router = express.Router();

router.use((req, res, next) => {
  if (!req.user) return res.redirect(`/entrar?next=${encodeURIComponent(req.originalUrl)}`);
  if (req.user.role !== 'admin') return res.status(403).render('error', { title: res.locals.t('err.forbiddenT'), message: res.locals.t('err.forbiddenS') });
  res.locals.counts = {
    pend: get(`SELECT COUNT(*) n FROM users WHERE status = 'pendente' AND role != 'admin'`).n,
    reports: get(`SELECT COUNT(*) n FROM reports WHERE status = 'aberta'`).n,
    hl: get(`SELECT COUNT(*) n FROM highlight_requests WHERE status = 'pendente'`).n,
    reval: get(`SELECT COUNT(*) n FROM entities WHERE type = 'empresa' AND (needs_revalidation = 1 OR (verified = 1 AND verified_at < datetime('now', '-365 days')))`).n,
    msgs: get('SELECT COUNT(*) n FROM contact_messages WHERE handled = 0').n,
  };
  next();
});
const done = (req, url, msg) => { req.flash('ok', msg || req.res.locals.tr('Alteração registada.', 'Cambio registrado.')); req.res.redirect(url); };
const back = (req, fallback) => { const r = req.get('Referer'); return r && new URL(r, 'http://x').pathname.startsWith('/gestao') ? new URL(r, 'http://x').pathname + new URL(r, 'http://x').search : fallback; };

// ---------- Resumo ----------
router.get('/', (req, res) => {
  const kpi = {
    users: get(`SELECT COUNT(*) n FROM users WHERE role != 'admin'`).n,
    offers: get(`SELECT COUNT(*) n FROM offers WHERE status = 'ativo'`).n,
    views30: get(`SELECT COUNT(*) n FROM stats WHERE type = 'view' AND created_at >= datetime('now','-30 days')`).n,
    contacts30: get(`SELECT COUNT(*) n FROM stats WHERE type = 'contact' AND created_at >= datetime('now','-30 days')`).n,
  };
  const pending = all(`SELECT u.*, e.name AS entity_name, e.type FROM users u JOIN entities e ON e.id = u.entity_id WHERE u.status = 'pendente' ORDER BY u.created_at LIMIT 6`);
  const reports = all(`SELECT * FROM reports WHERE status = 'aberta' ORDER BY created_at LIMIT 6`).map(describeReport);
  res.render('admin/dashboard', { title: res.locals.t('admin.titulo'), tab: 'dash', kpi, pending, reports });
});

// ---------- Contas e validação (RF-03, RF-25) ----------
router.get('/contas', (req, res) => {
  const where = [`u.role != 'admin'`], p = [];
  if (['empresa', 'incubadora', 'agente'].includes(req.query.perfil)) { where.push('u.role = ?'); p.push(req.query.perfil); }
  if (['pendente', 'aprovada', 'rejeitada', 'suspensa'].includes(req.query.estado)) { where.push('u.status = ?'); p.push(req.query.estado); }
  if (req.query.estado === 'revalidar') where.push(`e.type = 'empresa' AND (e.needs_revalidation = 1 OR (e.verified = 1 AND e.verified_at < datetime('now','-365 days')))`);
  if (req.query.q) { where.push('(u.name LIKE ? OR u.email LIKE ? OR e.name LIKE ?)'); const l = `%${req.query.q}%`; p.push(l, l, l); }
  const rows = all(`SELECT u.*, e.name AS entity_name, e.slug, e.type, e.nif, e.verified, e.verified_at, e.needs_revalidation FROM users u LEFT JOIN entities e ON e.id = u.entity_id
                    WHERE ${where.join(' AND ')} ORDER BY CASE u.status WHEN 'pendente' THEN 0 ELSE 1 END, u.created_at DESC`, ...p);
  rows.forEach((r) => { r.isVerified = R.isVerified(r); });
  const tally = all(`SELECT role, status, COUNT(*) n FROM users WHERE role != 'admin' GROUP BY role, status`);
  res.render('admin/accounts', { title: res.locals.t('admin.tabs.contas'), tab: 'contas', rows, tally });
});

function accountOf(id) {
  return get(`SELECT u.*, e.name AS entity_name, e.id AS eid FROM users u LEFT JOIN entities e ON e.id = u.entity_id WHERE u.id = ? AND u.role != 'admin'`, Number(id));
}
function notify(u, key, extra = {}) {
  sendTemplate(key, u.email, u.lang, { name: u.name, entity: u.entity_name || '', ...extra });
}

router.post('/contas/:id/:acao', (req, res, next) => {
  const u = accountOf(req.params.id);
  if (!u) return next();
  const reason = String(req.body.reason || '').trim().slice(0, 500);
  const tr = res.locals.tr;
  const to = back(req, '/gestao/contas');
  switch (req.params.acao) {
    case 'aprovar':
      run(`UPDATE users SET status = 'aprovada', status_reason = NULL WHERE id = ?`, u.id);
      if (req.body.verify && u.role === 'empresa') run(`UPDATE entities SET verified = 1, verified_at = datetime('now'), needs_revalidation = 0 WHERE id = ?`, u.eid);
      notify(u, 'conta_aprovada'); R.audit(req, 'conta_aprovada', u.entity_name, req.body.verify ? 'com selo Verificado' : null);
      return done(req, to, tr('Conta aprovada e utilizador notificado.', 'Cuenta aprobada y usuario notificado.'));
    case 'rejeitar':
      if (!reason) { req.flash('error', tr('Indique o motivo da rejeição.', 'Indica el motivo del rechazo.')); return res.redirect(to); }
      run(`UPDATE users SET status = 'rejeitada', status_reason = ? WHERE id = ?`, reason, u.id);
      notify(u, 'conta_rejeitada', { reason }); R.audit(req, 'conta_rejeitada', u.entity_name, reason);
      return done(req, to, tr('Registo rejeitado e utilizador notificado.', 'Registro rechazado y usuario notificado.'));
    case 'suspender':
      run(`UPDATE users SET status = 'suspensa', status_reason = ? WHERE id = ?`, reason || null, u.id);
      run('DELETE FROM sessions WHERE data LIKE ?', `%"uid":${u.id}%`);
      notify(u, 'conta_suspensa', { reason: reason || '—' }); R.audit(req, 'conta_suspensa', u.entity_name, reason);
      return done(req, to, tr('Conta suspensa.', 'Cuenta suspendida.'));
    case 'reativar':
      run(`UPDATE users SET status = 'aprovada', status_reason = NULL WHERE id = ?`, u.id);
      notify(u, 'conta_reativada'); R.audit(req, 'conta_reativada', u.entity_name);
      return done(req, to, tr('Conta reativada.', 'Cuenta reactivada.'));
    case 'verificar':
      run(`UPDATE entities SET verified = 1, verified_at = datetime('now'), needs_revalidation = 0 WHERE id = ?`, u.eid);
      R.audit(req, 'selo_atribuido', u.entity_name, reason || null);
      return done(req, to, tr('Selo "Verificado" atribuído.', 'Sello "Verificado" asignado.'));
    case 'retirar-selo':
      run('UPDATE entities SET verified = 0, needs_revalidation = 0 WHERE id = ?', u.eid);
      notify(u, 'selo_retirado', { reason: reason || '—' }); R.audit(req, 'selo_retirado', u.entity_name, reason);
      return done(req, to, tr('Selo retirado.', 'Sello retirado.'));
    case 'reenviar':
      notify(u, 'conta_aprovada'); return done(req, to);
    case 'remover': {
      if (String(req.body.confirm || '') !== 'sim') { req.flash('error', tr('Confirme a remoção.', 'Confirma la eliminación.')); return res.redirect(to); }
      const e = get('SELECT * FROM entities WHERE id = ?', u.eid);
      tx(() => {
        run('DELETE FROM users WHERE id = ?', u.id);
        if (e) { run('DELETE FROM stats WHERE entity_id = ?', e.id); run('DELETE FROM entities WHERE id = ?', e.id); }
      });
      if (e) { R.deleteImage(e.logo); R.deleteImage(e.cover); }
      R.audit(req, 'conta_removida', u.entity_name, `${u.email}${reason ? ` — ${reason}` : ''}`);
      return done(req, '/gestao/contas', tr('Conta removida.', 'Cuenta eliminada.'));
    }
    default: return next();
  }
});

router.get('/contas/:id', (req, res, next) => {
  const u = accountOf(req.params.id);
  if (!u) return next();
  const e = u.eid ? R.getEntity('e.id = ?', u.eid) : null;
  const history = all(`SELECT * FROM audit WHERE target = ? ORDER BY created_at DESC LIMIT 20`, u.entity_name);
  res.render('admin/account', { title: u.entity_name || u.name, tab: 'contas', u, e, history, cats: all('SELECT * FROM categories ORDER BY sort') });
});
router.post('/contas/:id', (req, res, next) => {
  const u = accountOf(req.params.id);
  if (!u) return next();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!U.isEmail(email) || get('SELECT 1 FROM users WHERE lower(email) = ? AND id != ?', email, u.id)) { req.flash('error', res.locals.t('auth.errEmail')); return res.redirect(`/gestao/contas/${u.id}`); }
  run('UPDATE users SET name = ?, email = ? WHERE id = ?', String(req.body.name || u.name).slice(0, 120), email, u.id);
  if (u.eid) run('UPDATE entities SET name = ?, nif = ?, phone = ?, email = ?, website = ?, category_id = ? WHERE id = ?', String(req.body.entity_name || u.entity_name).slice(0, 160), String(req.body.nif || '').slice(0, 30) || null,
    String(req.body.phone || '').slice(0, 40), String(req.body.entity_email || '').slice(0, 160), U.normUrl(req.body.website), Number(req.body.category_id) || null, u.eid);
  R.audit(req, 'conta_editada', u.entity_name);
  done(req, `/gestao/contas/${u.id}`);
});

// ---------- Moderação (conteúdos, avaliações, denúncias) ----------
function describeReport(r) {
  let target = null, url = null, label = '';
  if (r.target_type === 'avaliacao') { target = get('SELECT r.*, e.name, e.slug FROM reviews r JOIN entities e ON e.id = r.entity_id WHERE r.id = ?', r.target_id); if (target) { label = `${target.rating}★ "${(target.comment || '').slice(0, 120)}" — ${target.name}`; url = `/empresas/${target.slug}#avaliacoes`; } }
  if (r.target_type === 'oferta') { target = get('SELECT o.*, e.name FROM offers o JOIN entities e ON e.id = o.entity_id WHERE o.id = ?', r.target_id); if (target) { label = `${target.title_pt || target.title_es} — ${target.name}`; url = `/produtos/${target.slug}`; } }
  if (r.target_type === 'entidade') { target = get('SELECT * FROM entities WHERE id = ?', r.target_id); if (target) { label = target.name; url = `/${{ empresa: 'empresas', incubadora: 'incubadoras', agente: 'agentes' }[target.type]}/${target.slug}`; } }
  if (r.target_type === 'post') { target = get('SELECT p.*, e.name FROM posts p JOIN entities e ON e.id = p.entity_id WHERE p.id = ?', r.target_id); if (target) label = `${target.title} — ${target.name}`; }
  return { ...r, exists: !!target, label: label || '(removido)', url };
}

router.get('/moderacao', (req, res) => {
  const status = ['aberta', 'mantida', 'removida'].includes(req.query.estado) ? req.query.estado : 'aberta';
  const reports = all('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT 100', status).map(describeReport);
  const reviews = all(`SELECT r.*, e.name, e.slug FROM reviews r JOIN entities e ON e.id = r.entity_id WHERE r.status = 'publicada' ORDER BY r.created_at DESC LIMIT 30`);
  const offers = all(`${R.OFFER_SELECT} WHERE o.status != 'removido' ORDER BY o.created_at DESC LIMIT 30`).map(R.decorateOffer);
  res.render('admin/moderation', { title: res.locals.t('admin.tabs.moderacao'), tab: 'moderacao', reports, reviews, offers, status });
});

function removeTarget(type, id) {
  if (type === 'avaliacao') run(`UPDATE reviews SET status = 'removida' WHERE id = ?`, id);
  if (type === 'oferta') run(`UPDATE offers SET status = 'removido', featured_until = NULL WHERE id = ?`, id);
  if (type === 'post') run(`UPDATE posts SET status = 'removido' WHERE id = ?`, id);
}
router.post('/denuncias/:id/:acao', (req, res, next) => {
  const r = get('SELECT * FROM reports WHERE id = ?', Number(req.params.id));
  if (!r || !['manter', 'remover'].includes(req.params.acao)) return next();
  if (req.params.acao === 'remover') {
    if (r.target_type === 'entidade') { req.flash('error', res.locals.tr('Para entidades, suspenda a conta em "Contas e validação".', 'Para entidades, suspende la cuenta en "Cuentas y validación".')); return res.redirect('/gestao/moderacao'); }
    removeTarget(r.target_type, r.target_id);
  }
  run(`UPDATE reports SET status = ?, decided_at = datetime('now') WHERE id = ?`, req.params.acao === 'remover' ? 'removida' : 'mantida', r.id);
  // outras denúncias abertas sobre o mesmo conteúdo ficam decididas da mesma forma
  run(`UPDATE reports SET status = ?, decided_at = datetime('now') WHERE target_type = ? AND target_id = ? AND status = 'aberta'`, req.params.acao === 'remover' ? 'removida' : 'mantida', r.target_type, r.target_id);
  R.audit(req, req.params.acao === 'remover' ? 'conteudo_removido' : 'denuncia_mantida', `${r.target_type} #${r.target_id}`, r.reason);
  done(req, '/gestao/moderacao');
});
router.post('/conteudos/:type/:id/remover', (req, res, next) => {
  if (!['avaliacao', 'oferta', 'post'].includes(req.params.type)) return next();
  removeTarget(req.params.type, Number(req.params.id));
  R.audit(req, 'conteudo_removido', `${req.params.type} #${req.params.id}`, String(req.body.reason || ''));
  done(req, back(req, '/gestao/moderacao'));
});

// ---------- Destaques (6.3) ----------
const HIGHLIGHT_DAYS = Number(process.env.HIGHLIGHT_DAYS || 30);
router.get('/destaques', (req, res) => {
  const reqs = all(`SELECT h.*, o.title_pt, o.title_es, o.slug, o.featured_until, e.name AS company FROM highlight_requests h JOIN offers o ON o.id = h.offer_id JOIN entities e ON e.id = o.entity_id ORDER BY CASE h.status WHEN 'pendente' THEN 0 ELSE 1 END, h.created_at DESC LIMIT 100`);
  const active = all(`${R.OFFER_SELECT} WHERE o.featured_until > datetime('now') ORDER BY o.featured_until`).map(R.decorateOffer);
  res.render('admin/highlights', { title: res.locals.t('admin.tabs.destaques'), tab: 'destaques', reqs, active, days: HIGHLIGHT_DAYS });
});
router.post('/destaques/:id/:acao', (req, res, next) => {
  const h = get(`SELECT h.*, o.title_pt, o.title_es, o.entity_id FROM highlight_requests h JOIN offers o ON o.id = h.offer_id WHERE h.id = ?`, Number(req.params.id));
  if (!h || !['aprovar', 'rejeitar', 'terminar'].includes(req.params.acao)) return next();
  const owner = get('SELECT u.*, e.name AS entity_name FROM users u JOIN entities e ON e.id = u.entity_id WHERE u.entity_id = ?', h.entity_id);
  const L = owner && owner.lang === 'es' ? 'es' : 'pt';
  if (req.params.acao === 'aprovar') {
    const until = U.daysFromNow(HIGHLIGHT_DAYS);
    run(`UPDATE highlight_requests SET status = 'aprovado', decided_at = datetime('now') WHERE id = ?`, h.id);
    run('UPDATE offers SET featured_until = ? WHERE id = ?', until, h.offer_id);
    if (owner) sendTemplate('destaque_decidido', owner.email, L, { name: owner.name, offer: h.title_pt || h.title_es, decision: L === 'es' ? 'aprobada' : 'aprovado', extra: `${L === 'es' ? 'Destacado hasta' : 'Em destaque até'} ${U.formatDate(until)}.` });
  } else if (req.params.acao === 'rejeitar') {
    const reason = String(req.body.reason || '').slice(0, 300);
    run(`UPDATE highlight_requests SET status = 'rejeitado', reason = ?, decided_at = datetime('now') WHERE id = ?`, reason || null, h.id);
    if (owner) sendTemplate('destaque_decidido', owner.email, L, { name: owner.name, offer: h.title_pt || h.title_es, decision: L === 'es' ? 'rechazada' : 'rejeitado', extra: reason });
  } else {
    run('UPDATE offers SET featured_until = NULL WHERE id = ?', h.offer_id);
  }
  R.audit(req, `destaque_${req.params.acao}`, h.title_pt || h.title_es);
  done(req, '/gestao/destaques');
});

// ---------- Categorias e localizações ----------
router.get('/categorias', (req, res) => {
  const rows = all('SELECT c.*, (SELECT COUNT(*) FROM offers o WHERE o.category_id = c.id) n FROM categories c ORDER BY sort, name_pt');
  res.render('admin/categories', { title: res.locals.t('admin.tabs.categorias'), tab: 'categorias', rows });
});
router.post('/categorias', (req, res) => {
  const b = req.body;
  if (!b.name_pt) return res.redirect('/gestao/categorias');
  if (b.id) run('UPDATE categories SET name_pt = ?, name_es = ?, sort = ?, active = ?, featured = ? WHERE id = ?', b.name_pt.slice(0, 80), (b.name_es || b.name_pt).slice(0, 80), Number(b.sort) || 0, b.active ? 1 : 0, b.featured ? 1 : 0, Number(b.id));
  else run('INSERT INTO categories(name_pt, name_es, sort, active, featured) VALUES (?,?,?,?,?)', b.name_pt.slice(0, 80), (b.name_es || b.name_pt).slice(0, 80), Number(b.sort) || 0, 1, b.featured ? 1 : 0);
  R.audit(req, b.id ? 'categoria_editada' : 'categoria_criada', b.name_pt);
  done(req, '/gestao/categorias');
});
router.post('/categorias/:id/eliminar', (req, res) => {
  const c = get('SELECT * FROM categories WHERE id = ?', Number(req.params.id));
  if (c) { run('DELETE FROM categories WHERE id = ?', c.id); R.audit(req, 'categoria_eliminada', c.name_pt); }
  done(req, '/gestao/categorias');
});

router.get('/territorios', (req, res) => {
  const rows = all('SELECT t.*, (SELECT COUNT(*) FROM locations l WHERE l.territory_id = t.id) n FROM territories t ORDER BY country DESC, region, municipality');
  res.render('admin/territories', { title: res.locals.t('admin.tabs.territorios'), tab: 'territorios', rows });
});
router.post('/territorios', (req, res) => {
  const b = req.body;
  if (!b.country || !b.region || !b.municipality) return res.redirect('/gestao/territorios');
  const lat = b.lat === '' ? null : Number(b.lat), lng = b.lng === '' ? null : Number(b.lng);
  if (b.id) run('UPDATE territories SET country = ?, region = ?, municipality = ?, lat = ?, lng = ? WHERE id = ?', b.country, b.region, b.municipality, lat, lng, Number(b.id));
  else run('INSERT INTO territories(country, region, municipality, lat, lng) VALUES (?,?,?,?,?)', b.country, b.region, b.municipality, lat, lng);
  R.audit(req, b.id ? 'localizacao_editada' : 'localizacao_criada', b.municipality);
  done(req, '/gestao/territorios');
});
router.post('/territorios/:id/eliminar', (req, res) => {
  const t = get('SELECT * FROM territories WHERE id = ?', Number(req.params.id));
  if (t) { run('DELETE FROM territories WHERE id = ?', t.id); R.audit(req, 'localizacao_eliminada', t.municipality); }
  done(req, '/gestao/territorios');
});

// ---------- Páginas institucionais, FAQ e emails ----------
router.get('/paginas', (req, res) => {
  const pages = all('SELECT * FROM pages ORDER BY slug');
  const edit = req.query.editar ? get('SELECT * FROM pages WHERE slug = ?', req.query.editar) : (req.query.nova ? { slug: '', published: 1 } : null);
  res.render('admin/pages', { title: res.locals.t('admin.tabs.paginas'), tab: 'paginas', pages, edit, faqs: all('SELECT * FROM faqs ORDER BY sort') });
});
router.post('/paginas', (req, res) => {
  const b = req.body;
  const slug = U.slugify(b.slug || b.title_pt);
  if (!b.title_pt || !b.body_pt) { req.flash('error', res.locals.tr('Título e conteúdo em português são obrigatórios.', 'El título y el contenido en portugués son obligatorios.')); return res.redirect('/gestao/paginas'); }
  run(`INSERT INTO pages(slug, title_pt, title_es, body_pt, body_es, published, updated_at) VALUES (?,?,?,?,?,?, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET title_pt=excluded.title_pt, title_es=excluded.title_es, body_pt=excluded.body_pt, body_es=excluded.body_es, published=excluded.published, updated_at=datetime('now')`,
  slug, b.title_pt, b.title_es || null, b.body_pt, b.body_es || null, b.published ? 1 : 0);
  R.audit(req, 'pagina_guardada', slug);
  done(req, '/gestao/paginas');
});
router.post('/paginas/:slug/eliminar', (req, res) => {
  if (['sobre', 'como-funciona', 'termos', 'privacidade'].includes(req.params.slug)) { req.flash('error', res.locals.tr('As páginas base não podem ser eliminadas; pode despublicá-las.', 'Las páginas base no se pueden eliminar; puedes despublicarlas.')); return res.redirect('/gestao/paginas'); }
  run('DELETE FROM pages WHERE slug = ?', req.params.slug); R.audit(req, 'pagina_eliminada', req.params.slug);
  done(req, '/gestao/paginas');
});
router.post('/faqs', (req, res) => {
  const b = req.body;
  if (!b.q_pt || !b.a_pt) return res.redirect('/gestao/paginas#faq');
  if (b.id) run('UPDATE faqs SET q_pt=?, a_pt=?, q_es=?, a_es=?, sort=? WHERE id = ?', b.q_pt, b.a_pt, b.q_es || null, b.a_es || null, Number(b.sort) || 0, Number(b.id));
  else run('INSERT INTO faqs(q_pt, a_pt, q_es, a_es, sort) VALUES (?,?,?,?,?)', b.q_pt, b.a_pt, b.q_es || null, b.a_es || null, Number(b.sort) || 0);
  done(req, '/gestao/paginas#faq');
});
router.post('/faqs/:id/eliminar', (req, res) => { run('DELETE FROM faqs WHERE id = ?', Number(req.params.id)); done(req, '/gestao/paginas#faq'); });

router.get('/emails', (req, res) => {
  res.render('admin/emails', { title: res.locals.t('admin.tabs.emails'), tab: 'emails', rows: all('SELECT * FROM email_templates ORDER BY key'), edit: req.query.editar || null });
});
router.post('/emails/:key', (req, res, next) => {
  const tpl = get('SELECT * FROM email_templates WHERE key = ?', req.params.key);
  if (!tpl) return next();
  const b = req.body;
  run('UPDATE email_templates SET subject_pt=?, body_pt=?, subject_es=?, body_es=? WHERE key = ?', b.subject_pt || tpl.subject_pt, b.body_pt || tpl.body_pt, b.subject_es || tpl.subject_es, b.body_es || tpl.body_es, tpl.key);
  R.audit(req, 'email_editado', tpl.key);
  done(req, '/gestao/emails');
});

// ---------- Estatísticas globais ----------
router.get('/estatisticas', (req, res) => {
  const days = [7, 30, 90, 365].includes(Number(req.query.periodo)) ? Number(req.query.periodo) : 30;
  const since = `datetime('now', '-${days} days')`;
  const byType = all(`SELECT role, status, COUNT(*) n FROM users WHERE role != 'admin' GROUP BY role, status`);
  const offers = all(`SELECT kind, status, COUNT(*) n FROM offers GROUP BY kind, status`);
  const totals = get(`SELECT SUM(type='view') v, SUM(type='contact') c FROM stats WHERE created_at >= ${since}`);
  const byDay = all(`SELECT date(created_at) d, SUM(type='view') v, SUM(type='contact') c FROM stats WHERE created_at >= ${since} GROUP BY d ORDER BY d`);
  const byChannel = all(`SELECT channel, COUNT(*) n FROM stats WHERE type='contact' AND created_at >= ${since} GROUP BY channel ORDER BY n DESC`);
  const top = all(`SELECT e.name, e.type, e.slug, SUM(s.type='view') v, SUM(s.type='contact') c FROM stats s JOIN entities e ON e.id = s.entity_id WHERE s.created_at >= ${since} GROUP BY e.id ORDER BY v DESC LIMIT 10`);
  const byCountry = all(`SELECT t.country, COUNT(DISTINCT e.id) n FROM entities e JOIN locations l ON l.entity_id = e.id JOIN territories t ON t.id = l.territory_id WHERE ${R.PUBLIC_ENTITY} GROUP BY t.country`);
  const reviews = get(`SELECT COUNT(*) n, AVG(rating) a FROM reviews WHERE status = 'publicada'`);
  res.render('admin/stats', { title: res.locals.t('admin.tabs.stats'), tab: 'stats', days, byType, offers, totals, byDay, byChannel, top, byCountry, reviews });
});

// ---------- Mensagens, auditoria, caixa de saída ----------
router.get('/mensagens', (req, res) => res.render('admin/messages', { title: res.locals.t('admin.tabs.mensagens'), tab: 'mensagens', rows: all('SELECT * FROM contact_messages ORDER BY handled, created_at DESC LIMIT 200') }));
router.post('/mensagens/:id', (req, res) => { run('UPDATE contact_messages SET handled = 1 - handled WHERE id = ?', Number(req.params.id)); done(req, '/gestao/mensagens'); });
router.get('/auditoria', (req, res) => res.render('admin/audit', { title: res.locals.t('admin.tabs.auditoria'), tab: 'auditoria', rows: all('SELECT * FROM audit ORDER BY id DESC LIMIT 300') }));
router.get('/caixa', (req, res) => res.render('admin/outbox', { title: res.locals.t('admin.tabs.caixa'), tab: 'caixa', rows: all('SELECT * FROM outbox ORDER BY id DESC LIMIT 200') }));

module.exports = router;
