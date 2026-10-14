// Emails automáticos. Os modelos são editáveis pelo administrador (tabela email_templates).
// Todas as mensagens ficam registadas na "caixa de saída" (tabela outbox), visível na gestão.
// Envio real, conforme as variáveis de ambiente:
//   BREVO_API_KEY + MAIL_FROM            → API HTTP da Brevo (funciona onde as portas SMTP estão bloqueadas)
//   nenhuma                              → só caixa de saída
const { db, get, run } = require('../db');

// Estado do envio na caixa de saída (acrescenta as colunas em bases de dados criadas antes desta versão)
const cols = db.prepare('PRAGMA table_info(outbox)').all().map((c) => c.name);
if (!cols.includes('status')) db.exec("ALTER TABLE outbox ADD COLUMN status TEXT NOT NULL DEFAULT 'registado'; ALTER TABLE outbox ADD COLUMN error TEXT;");

const BASE_URL = () => (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const FROM_NAME = () => process.env.MAIL_FROM_NAME || 'Marketplace INCUBTRANS';

function provider() {
  if (process.env.NODE_ENV === 'test') return null;
  if (process.env.BREVO_API_KEY && process.env.MAIL_FROM) return 'brevo';
  return null;
}

async function deliver(to, subject, body) {
  const p = provider();
  if (p === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: FROM_NAME(), email: process.env.MAIL_FROM }, to: [{ email: to }], subject, textContent: body }),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

function sendTemplate(key, to, lang, vars = {}) {
  const tpl = get('SELECT * FROM email_templates WHERE key = ?', key);
  if (!tpl) throw new Error(`Modelo de email em falta: ${key}`);
  const L = lang === 'es' ? 'es' : 'pt';
  const v = { site: 'Marketplace INCUBTRANS', base_url: BASE_URL(), ...vars };
  const subject = fill(tpl[`subject_${L}`], v);
  const body = fill(tpl[`body_${L}`], v);
  return send(to, subject, body);
}

// Regista na caixa de saída e envia em segundo plano (o pedido do utilizador não espera pelo envio).
function send(to, subject, body) {
  const id = run('INSERT INTO outbox(to_email, subject, body) VALUES (?,?,?)', to, subject, body).lastInsertRowid;
  if (process.env.LOG_EMAILS !== '0' && process.env.NODE_ENV !== 'test') console.log(`[email] para ${to}: ${subject}`);
  if (provider()) {
    deliver(to, subject, body)
      .then(() => run("UPDATE outbox SET status = 'enviado', error = NULL WHERE id = ?", id))
      .catch((e) => { console.error(`[email] falhou para ${to}:`, e.message); run("UPDATE outbox SET status = 'erro', error = ? WHERE id = ?", String(e.message).slice(0, 500), id); });
  }
  return id;
}

module.exports = { sendTemplate, send, BASE_URL, mailProvider: provider };
