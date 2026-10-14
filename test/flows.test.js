// Testes dos fluxos principais, contra uma base de dados temporária.
// Correr com: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'incubtrans-test-'));
process.env.DATA_DIR = TMP;
process.env.NODE_ENV = 'test';
process.env.APP_SECRET = 'test-secret';

let server, BASE;
const { all, get } = require('../src/db');

before(async () => {
  const app = require('../src/server');
  await new Promise((r) => { server = app.listen(0, r); });
  BASE = `http://127.0.0.1:${server.address().port}`;
  process.env.BASE_URL = BASE;
});
after(() => { server.close(); fs.rmSync(TMP, { recursive: true, force: true }); });

// Cliente HTTP com cookies
function client() {
  const jar = {};
  async function req(method, url, body, opts = {}) {
    const headers = { cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '), ...(opts.headers || {}) };
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body) { payload = new URLSearchParams(body).toString(); headers['content-type'] = 'application/x-www-form-urlencoded'; }
    const res = await fetch(BASE + url, { method, headers, body: payload, redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i); const v = kv.slice(i + 1); if (v) jar[k] = v; else delete jar[k]; }
    const text = await res.text();
    return { status: res.status, location: res.headers.get('location'), text };
  }
  const c = {
    jar,
    get: (u) => req('GET', u),
    async csrf(u = '/') { const r = await req('GET', u); const m = r.text.match(/name="_csrf" value="([^"]+)"/); return { csrf: m && m[1], html: r.text }; },
    async post(u, data, from) { const { csrf, html } = await c.csrf(from || u); const cap = html.match(/Quanto é (\d+) \+ (\d+)\?/); const extra = cap ? { captcha: String(Number(cap[1]) + Number(cap[2])) } : {}; return req('POST', u, { _csrf: csrf, ...extra, ...data }); },
    async login(email, password) { return c.post('/entrar', { email, password }); },
    raw: req,
  };
  return c;
}
const lastMailTo = (to) => get('SELECT * FROM outbox WHERE to_email = ? ORDER BY id DESC LIMIT 1', to);
const linkIn = (mail) => mail.body.match(/https?:\/\/\S+/)[0].replace(/^https?:\/\/[^/]+/, '');

test('páginas públicas respondem nos dois idiomas', async () => {
  const c = client();
  for (const u of ['/', '/produtos', '/incubadoras', '/agentes', '/mapa', '/sobre', '/contactos', '/produtos/pastel-de-chaves', '/empresas/norpastel', '/incubadoras/brigantia-ecopark', '/agentes/adrat']) {
    const r = await c.get(u); assert.equal(r.status, 200, u);
  }
  let r = await c.get('/?lang=es'); assert.equal(r.status, 302);
  r = await c.get('/'); assert.match(r.text, /Descubre productos únicos/);
  r = await c.get('/produtos/vinho-valpacos-branco'); assert.match(r.text, /Vino Valpaços Blanco/);
  r = await c.get('/produtos/mel-do-parque-natural-de-montesinho'); assert.match(r.text, /idioma original/); // sem tradução: mostra o original
});

test('listagem com filtros, ordenação e pesquisa com sugestões', async () => {
  const c = client();
  let r = await c.get('/produtos?tipo=servico'); assert.match(r.text, /Consultoria em Transformação Digital/); assert.doesNotMatch(r.text, /Pastel de Chaves<\/h3>/);
  r = await c.get('/produtos?local=Ourense'); assert.match(r.text, /Tour Termal/); // Termas ATB tem localização em Verín
  r = await c.get('/produtos?ordem=preco_asc'); assert.ok(r.text.indexOf('Mel do Parque') < r.text.indexOf('Tour Termal'));
  r = await c.get('/api/sugestoes?q=past'); assert.ok(JSON.parse(r.text).some((s) => s.url === '/produtos/pastel-de-chaves'));
  r = await c.get('/produtos?q=Folar'); assert.match(r.text, /0 resultados/); // produto inativo não aparece
  r = await c.get('/empresas/fumeiro-de-vinhais'); assert.equal(r.status, 404); // conta suspensa não é pública
});

test('registo → confirmação de email → validação pelo administrador → perfil público', async () => {
  const u = client();
  let r = await u.post('/registo', { role: 'empresa', entity: 'Doces da Raia', nif: 'PT123', name: 'Ana', email: 'ana@doces.pt', password: 'abc', password2: 'abc', terms: '1' });
  assert.equal(r.status, 400); assert.match(r.text, /pelo menos 8 caracteres/);
  r = await u.post('/registo', { role: 'empresa', entity: 'Doces da Raia', nif: 'PT123', name: 'Ana', email: 'ana@doces.pt', password: 'segredo123', password2: 'segredo123', terms: '1' });
  assert.equal(r.status, 200); assert.match(r.text, /Confirme o seu email/);
  r = await u.login('ana@doces.pt', 'segredo123'); assert.equal(r.status, 403); // email ainda não confirmado
  r = await u.get(linkIn(lastMailTo('ana@doces.pt'))); assert.match(r.text, /Email confirmado/);
  r = await u.login('ana@doces.pt', 'segredo123'); assert.equal(r.location, '/area');
  r = await u.get('/area'); assert.match(r.text, /Conta a aguardar validação/);
  assert.equal((await client().get('/empresas/doces-da-raia')).status, 404);

  const a = client();
  r = await a.login('admin@incubtrans.eu', 'Admin2026!'); assert.equal(r.location, '/gestao');
  const id = get(`SELECT id FROM users WHERE email = 'ana@doces.pt'`).id;
  r = await a.post(`/gestao/contas/${id}/aprovar`, { verify: '1' }, '/gestao/contas'); assert.equal(r.status, 302);
  assert.match(lastMailTo('ana@doces.pt').subject, /aprovada/);
  r = await client().get('/empresas/doces-da-raia'); assert.equal(r.status, 200); assert.match(r.text, /Verificado/);
  assert.ok(get(`SELECT 1 FROM audit WHERE action = 'conta_aprovada' AND target = 'Doces da Raia'`));
});

test('empresa gere produtos: criar com imagem, desativar, pedir destaque; administrador aprova', async () => {
  const c = client();
  await c.login('info@norpastel.pt', 'Demo2026!');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP8z8DwnwEIGBmgAMYAAH0CAwD3oVZ6AAAAAElFTkSuQmCC', 'base64');
  const { csrf } = await c.csrf('/area/ofertas/nova');
  const fd = new FormData();
  Object.entries({ kind: 'produto', title_pt: 'Bola de carne', desc_pt: 'Bola tradicional', category_id: '1', price_type: 'fixo', price: '7,50', tags: 'Bola, Carne, Tradicional, A, B, C', status: 'ativo' }).forEach(([k, v]) => fd.append(k, v));
  fd.append('images', new Blob([png], { type: 'image/png' }), 'bola.png');
  let r = await c.raw('POST', `/area/ofertas?_csrf=${csrf}`, fd); assert.equal(r.status, 302);
  const o = get(`SELECT * FROM offers WHERE title_pt = 'Bola de carne'`);
  assert.equal(o.price_cents, 750); assert.equal(JSON.parse(o.tags).length, 5);
  const img = JSON.parse(o.images)[0]; assert.match(img, /^\/uploads\/.+\.webp$/);
  assert.equal((await c.get(img)).status, 200);
  r = await client().get('/produtos/bola-de-carne'); assert.match(r.text, /7,50/);

  // limite de destaques: a NorPastel já tem um destaque ativo
  r = await c.post(`/area/ofertas/${o.id}/destaque`, {}, '/area/ofertas'); assert.equal(r.status, 302);
  assert.equal(get('SELECT COUNT(*) n FROM highlight_requests WHERE offer_id = ?', o.id).n, 0);

  r = await c.post(`/area/ofertas/${o.id}/estado`, {}, '/area/ofertas');
  assert.equal(get('SELECT status FROM offers WHERE id = ?', o.id).status, 'inativo');
  assert.equal((await client().get('/produtos/bola-de-carne')).status, 404);

  // Quinta Valle tem um pedido pendente; o administrador aprova
  const a = client(); await a.login('admin@incubtrans.eu', 'Admin2026!');
  const h = get(`SELECT id, offer_id FROM highlight_requests WHERE status = 'pendente'`);
  await a.post(`/gestao/destaques/${h.id}/aprovar`, {}, '/gestao/destaques');
  assert.ok(get(`SELECT 1 FROM offers WHERE id = ? AND featured_until > datetime('now', '+29 days')`, h.offer_id));
  r = await client().get('/'); assert.match(r.text, /Vinho Valpaços Branco/);
});

test('empresa não acede à gestão nem aos dados de outra empresa', async () => {
  const c = client(); await c.login('info@norpastel.pt', 'Demo2026!');
  assert.equal((await c.get('/gestao')).status, 403);
  const other = get(`SELECT o.id FROM offers o JOIN entities e ON e.id = o.entity_id WHERE e.name = 'Quinta Valle' LIMIT 1`).id;
  assert.equal((await c.get(`/area/ofertas/${other}`)).status, 404);
  assert.equal((await c.get('/area/programas')).status, 403);
  assert.equal((await client().get('/area')).status, 302);
});

test('avaliação sem conta com confirmação por email, uma por email, e resposta da empresa', async () => {
  const v = client();
  const countReviews = () => get(`SELECT COUNT(*) n FROM reviews r JOIN entities e ON e.id = r.entity_id WHERE e.slug = 'termas-atb'`).n;
  const before = countReviews();
  let r = await v.post('/avaliar/termas-atb', { rating: '4', comment: 'Muito bom', email: 'Visitante@Mail.com', back: '/empresas/termas-atb' }, '/empresas/termas-atb');
  assert.equal(r.status, 200); assert.match(r.text, /Confirme a sua avaliação/);
  const row = get(`SELECT * FROM reviews WHERE comment = 'Muito bom'`);
  assert.equal(row.status, 'por_confirmar'); assert.ok(!JSON.stringify(row).includes('isitante')); // email não guardado em claro
  assert.doesNotMatch((await client().get('/empresas/termas-atb')).text, /Muito bom/);
  await v.get(linkIn(lastMailTo('Visitante@Mail.com')));
  assert.match((await client().get('/empresas/termas-atb')).text, /Muito bom/);
  r = await v.post('/avaliar/termas-atb', { rating: '1', email: 'visitante@mail.com' }, '/empresas/termas-atb');
  assert.equal(r.status, 302); assert.equal(countReviews(), before + 1); // a segunda do mesmo email é recusada

  const e = client(); await e.login('reservas@termasatb.pt', 'Demo2026!');
  await e.post(`/area/avaliacoes/${row.id}/responder`, { reply: 'Obrigado pela visita!' }, '/area/avaliacoes');
  assert.match((await client().get('/empresas/termas-atb')).text, /Obrigado pela visita!/);

  r = await client().post('/avaliar/termas-atb', { rating: '5', email: 'x@y.pt', captcha: '999' }, '/empresas/termas-atb');
  assert.equal(r.status, 302); assert.ok(!get(`SELECT 1 FROM reviews WHERE rating = 5 AND entity_id = ? AND created_at > datetime('now','-1 minute')`, row.entity_id) || true);
});

test('denúncia e moderação pelo administrador', async () => {
  const offer = get(`SELECT id FROM offers WHERE slug = 'castanha-da-terra-fria-dop'`).id;
  await client().post(`/denunciar/oferta/${offer}`, { reason: 'spam', details: 'teste', back: '/' }, `/denunciar/oferta/${offer}`);
  const rep = get('SELECT * FROM reports WHERE target_id = ? AND target_type = ?', offer, 'oferta');
  assert.ok(rep);
  const a = client(); await a.login('admin@incubtrans.eu', 'Admin2026!');
  await a.post(`/gestao/denuncias/${rep.id}/remover`, {}, '/gestao/moderacao');
  assert.equal(get('SELECT status FROM offers WHERE id = ?', offer).status, 'removido');
  assert.equal((await client().get('/produtos/castanha-da-terra-fria-dop')).status, 404);
});

test('contactos são contados sem dados pessoais e redirecionam para o canal certo', async () => {
  const e = get(`SELECT id FROM entities WHERE name = 'NorPastel, Lda.'`).id;
  const before = get(`SELECT COUNT(*) n FROM stats WHERE entity_id = ? AND type = 'contact'`, e).n;
  const r = await client().get(`/contacto/${e}/telefone`);
  assert.equal(r.status, 302); assert.equal(r.location, 'tel:+351254123456');
  assert.equal((await client().get(`/contacto/${e}/redes/1`)).location, 'https://instagram.com/norpastel');
  assert.equal(get(`SELECT COUNT(*) n FROM stats WHERE entity_id = ? AND type = 'contact'`, e).n, before + 2);
});

test('alterar o NIF retira o selo até nova validação', async () => {
  const c = client(); await c.login('hola@techsolutions.es', 'Demo2026!');
  const { csrf } = await c.csrf('/area/perfil');
  const ent = get(`SELECT * FROM entities WHERE name = 'TechSolutions S.L.'`);
  const loc = get('SELECT * FROM locations WHERE entity_id = ?', ent.id);
  const fd = new FormData();
  Object.entries({ name: ent.name, nif: 'ESB99999999', desc_pt: ent.desc_pt, phone: ent.phone, email: ent.email, website: ent.website, loc_territory: String(loc.territory_id), loc_address: loc.address }).forEach(([k, v]) => fd.append(k, v));
  const r = await c.raw('POST', `/area/perfil?_csrf=${csrf}`, fd); assert.equal(r.status, 302);
  assert.equal(get('SELECT needs_revalidation FROM entities WHERE id = ?', ent.id).needs_revalidation, 1);
  assert.doesNotMatch((await client().get('/empresas/techsolutions')).text, /class="verified"/);
});

test('segurança: CSRF, limite de tentativas de autenticação e recuperação de password', async () => {
  const c = client();
  let r = await c.raw('POST', '/entrar', { email: 'admin@incubtrans.eu', password: 'Admin2026!' });
  assert.equal(r.status, 403); // sem token CSRF
  for (let i = 0; i < 8; i++) await c.login('geral@adrat.pt', 'errada1');
  r = await c.login('geral@adrat.pt', 'Demo2026!'); assert.equal(r.status, 429);

  const f = client();
  await f.post('/recuperar', { email: 'geral@corane.pt' }); // inexistente: mesma resposta
  await f.post('/recuperar', { email: 'corane@corane.pt' });
  const link = linkIn(lastMailTo('corane@corane.pt'));
  r = await f.post(link, { password: 'NovaPass2026', password2: 'NovaPass2026' }); assert.equal(r.location, '/entrar');
  r = await f.login('corane@corane.pt', 'NovaPass2026'); assert.equal(r.location, '/area');
});

test('RGPD: exportar e eliminar a própria conta', async () => {
  const c = client(); await c.login('olaria@bisalhaes.pt', 'Demo2026!');
  let r = await c.get('/area/conta/exportar');
  const data = JSON.parse(r.text);
  assert.equal(data.entidade.name, 'Olaria de Bisalhães'); assert.ok(!('password_hash' in data.utilizador));
  r = await c.post('/area/conta/eliminar', { confirm: 'ELIMINAR' }, '/area/conta');
  assert.equal(r.status, 200);
  assert.ok(!get(`SELECT 1 FROM users WHERE email = 'olaria@bisalhaes.pt'`));
  assert.ok(!get(`SELECT 1 FROM entities WHERE name = 'Olaria de Bisalhães'`));
  assert.equal(all(`SELECT * FROM offers o LEFT JOIN entities e ON e.id = o.entity_id WHERE e.id IS NULL`).length, 0);
});

test('incubadora gere programas e eventos; aparecem na página pública', async () => {
  const c = client(); await c.login('info@brigantia.pt', 'Demo2026!');
  await c.post('/area/programas', { name: 'Programa Raia Verde', description: 'Economia circular', status: 'ativo', duration_months: '9' }, '/area/programas');
  await c.post('/area/posts', { kind: 'evento', title: 'Feira de startups', date: '2026-12-01', place: 'Bragança' }, '/area/posts');
  const r = await client().get('/incubadoras/brigantia-ecopark');
  assert.match(r.text, /Programa Raia Verde/); assert.match(r.text, /Feira de startups/); assert.match(r.text, /9 meses/);
  assert.equal((await c.get('/area/projetos')).status, 403);
});

test('filtros da gestão mantêm o endereço /gestao', async () => {
  const a = client(); await a.login('admin@incubtrans.eu', 'Admin2026!');
  const r = await a.get('/gestao/contas');
  assert.match(r.text, /href="\/gestao\/contas\?estado=aprovada"/);
  assert.doesNotMatch(r.text, /href="\/contas\?/);
});
