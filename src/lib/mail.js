// Emails automáticos. Os modelos são editáveis pelo administrador (tabela email_templates).
// Nesta versão as mensagens ficam registadas na "caixa de saída" (tabela outbox), visível na gestão.
// Para envio real, ligar aqui um serviço SMTP (ex.: nodemailer) — ver README.
const { get, run } = require('../db');

const BASE_URL = () => (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

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

function send(to, subject, body) {
  const r = run('INSERT INTO outbox(to_email, subject, body) VALUES (?,?,?)', to, subject, body);
  if (process.env.LOG_EMAILS !== '0' && process.env.NODE_ENV !== 'test') console.log(`[email] para ${to}: ${subject}`);
  return r.lastInsertRowid;
}

module.exports = { sendTemplate, send, BASE_URL };
