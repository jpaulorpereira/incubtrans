const express = require('express');
const { get, run, tx } = require('../db');
const U = require('../lib/util');
const { hashPassword, verifyPassword, passwordOk, rateLimit, resetRate, newCaptcha, checkCaptcha } = require('../lib/security');
const { sendTemplate, BASE_URL } = require('../lib/mail');
const { audit } = require('../lib/repo');

const router = express.Router();
const ROLES = ['empresa', 'incubadora', 'agente'];

function homeFor(user) { return user.role === 'admin' ? '/gestao' : '/area'; }

function sendVerification(user, entityName, lang) {
  const tok = U.token();
  run('UPDATE users SET verify_token = ? WHERE id = ?', tok, user.id);
  sendTemplate('verificar_email', user.email, lang, { name: user.name, entity: entityName || '', link: `${BASE_URL()}/verificar/${tok}` });
}

// ---------- Autenticação única com encaminhamento por perfil (RF-02) ----------
router.get('/entrar', (req, res) => {
  if (req.user) return res.redirect(homeFor(req.user));
  res.render('login', { title: res.locals.t('nav.entrar'), err: null, email: '', next: String(req.query.next || '') });
});

router.post('/entrar', (req, res) => {
  const t = res.locals.t;
  const email = String(req.body.email || '').trim().toLowerCase();
  const nextUrl = String(req.body.next || '');
  const fail = (err, status = 401) => res.status(status).render('login', { title: t('nav.entrar'), err, email, next: nextUrl });
  const key = `login:${req.ip}:${email}`;
  if (!rateLimit(key, 8, 15 * 60 * 1000)) return fail(t('auth.bloqueado'), 429);
  const u = get('SELECT u.*, e.name AS entity_name FROM users u LEFT JOIN entities e ON e.id = u.entity_id WHERE lower(u.email) = ?', email);
  if (!u || !verifyPassword(String(req.body.password || ''), u.password_hash)) return fail(t('auth.erroLogin'));
  if (!u.email_verified) { sendVerification(u, u.entity_name, req.lang); return fail(t('auth.naoVerificado'), 403); }
  if (u.status === 'rejeitada') return fail(`${t('auth.rejeitada')}${u.status_reason ? ` ${t('auth.motivo')}: ${u.status_reason}` : ''}`, 403);
  if (u.status === 'suspensa') return fail(`${t('auth.suspensa')}${u.status_reason ? ` ${t('auth.motivo')}: ${u.status_reason}` : ''}`, 403);
  resetRate(key);
  req.regenerateSession();
  req.session.uid = u.id;
  run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, u.id);
  res.append('Set-Cookie', `lang=${u.lang}; Path=/; Max-Age=31536000; SameSite=Lax`);
  const dest = nextUrl.startsWith('/') && !nextUrl.startsWith('//') && (u.role === 'admin' ? nextUrl.startsWith('/gestao') : nextUrl.startsWith('/area')) ? nextUrl : homeFor(u);
  res.redirect(dest);
});

router.post('/sair', (req, res) => {
  req.destroySession();
  res.redirect('/');
});

// ---------- Registo por perfil, com verificação de email (RF-01) ----------
router.get('/registo', (req, res) => {
  const perfil = ROLES.includes(req.query.perfil) ? req.query.perfil : '';
  res.render('register', { title: res.locals.t('auth.registoT'), errs: [], form: { role: perfil }, done: null, captcha: newCaptcha(req, 'register') });
});

router.post('/registo', (req, res) => {
  const t = res.locals.t;
  const f = {
    role: String(req.body.role || ''), name: String(req.body.name || '').trim().slice(0, 120), entity: String(req.body.entity || '').trim().slice(0, 160),
    email: String(req.body.email || '').trim().toLowerCase().slice(0, 160), nif: String(req.body.nif || '').trim().slice(0, 30),
  };
  const errs = [];
  if (!rateLimit(`register:${req.ip}`, 5, 60 * 60 * 1000)) errs.push(t('auth.errLimite'));
  if (!checkCaptcha(req, 'register', req.body.captcha)) errs.push(t('auth.errCaptcha'));
  if (!ROLES.includes(f.role)) errs.push(t('auth.errPerfil'));
  if (!f.name || !f.entity) errs.push(t('auth.errNome'));
  if (!U.isEmail(f.email)) errs.push(t('auth.errEmail'));
  else if (get('SELECT id FROM users WHERE lower(email) = ?', f.email)) errs.push(t('auth.errEmailExiste'));
  if (!passwordOk(req.body.password)) errs.push(t('auth.errPass'));
  else if (req.body.password !== req.body.password2) errs.push(t('auth.errPassIgual'));
  if (!req.body.terms) errs.push(t('auth.errTermos'));
  if (errs.length) return res.status(400).render('register', { title: t('auth.registoT'), errs, form: f, done: null, captcha: newCaptcha(req, 'register') });

  const user = tx(() => {
    const slug = U.uniqueSlug(f.entity, (s) => !!get('SELECT 1 FROM entities WHERE slug = ?', s));
    const eid = Number(run('INSERT INTO entities(type, slug, name, nif, email) VALUES (?,?,?,?,?)', f.role, slug, f.entity, f.nif || null, f.email).lastInsertRowid);
    const uid = Number(run(`INSERT INTO users(name, email, password_hash, role, status, lang, entity_id) VALUES (?,?,?,?, 'pendente', ?, ?)`, f.name, f.email, hashPassword(req.body.password), f.role, req.lang, eid).lastInsertRowid);
    return { id: uid, name: f.name, email: f.email };
  });
  sendVerification(user, f.entity, req.lang);
  audit({ user }, 'registo', `${f.role}: ${f.entity}`);
  res.render('register', { title: t('auth.registoOkT'), errs: [], form: {}, done: f.email, captcha: null });
});

router.get('/verificar/:token', (req, res) => {
  const t = res.locals.t;
  const u = get('SELECT * FROM users WHERE verify_token = ?', req.params.token);
  if (!u) return res.status(400).render('message', { title: t('auth.tokenInvalido'), heading: t('auth.tokenInvalido'), message: '', backUrl: '/entrar' });
  run('UPDATE users SET email_verified = 1, verify_token = NULL WHERE id = ?', u.id);
  res.render('message', { title: t('auth.verificadoOkT'), heading: t('auth.verificadoOkT'), message: t('auth.verificadoOkS'), backUrl: '/entrar' });
});

// ---------- Recuperação de password ----------
router.get('/recuperar', (req, res) => res.render('forgot', { title: res.locals.t('auth.recuperarT'), sent: false, err: null }));
router.post('/recuperar', (req, res) => {
  const t = res.locals.t;
  if (!rateLimit(`forgot:${req.ip}`, 5, 60 * 60 * 1000)) return res.status(429).render('forgot', { title: t('auth.recuperarT'), sent: false, err: t('auth.errLimite') });
  const u = get('SELECT * FROM users WHERE lower(email) = ?', String(req.body.email || '').trim().toLowerCase());
  if (u) {
    const tok = U.token();
    run('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', tok, Date.now() + 3600 * 1000, u.id);
    sendTemplate('recuperar_password', u.email, u.lang, { name: u.name, link: `${BASE_URL()}/recuperar/${tok}` });
  }
  res.render('forgot', { title: t('auth.recuperarT'), sent: true, err: null }); // mesma resposta, exista ou não a conta
});
router.get('/recuperar/:token', (req, res) => {
  const t = res.locals.t;
  const u = get('SELECT id FROM users WHERE reset_token = ? AND reset_expires > ?', req.params.token, Date.now());
  if (!u) return res.status(400).render('message', { title: t('auth.tokenInvalido'), heading: t('auth.tokenInvalido'), message: '', backUrl: '/recuperar' });
  res.render('reset', { title: t('auth.novaPassT'), token: req.params.token, err: null });
});
router.post('/recuperar/:token', (req, res) => {
  const t = res.locals.t;
  const u = get('SELECT id FROM users WHERE reset_token = ? AND reset_expires > ?', req.params.token, Date.now());
  if (!u) return res.status(400).render('message', { title: t('auth.tokenInvalido'), heading: t('auth.tokenInvalido'), message: '', backUrl: '/recuperar' });
  if (!passwordOk(req.body.password)) return res.status(400).render('reset', { title: t('auth.novaPassT'), token: req.params.token, err: t('auth.errPass') });
  if (req.body.password !== req.body.password2) return res.status(400).render('reset', { title: t('auth.novaPassT'), token: req.params.token, err: t('auth.errPassIgual') });
  // quem recebe o email confirma também o endereço
  run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL, email_verified = 1 WHERE id = ?', hashPassword(req.body.password), u.id);
  req.flash('ok', t('auth.novaPassOk'));
  res.redirect('/entrar');
});

module.exports = router;
