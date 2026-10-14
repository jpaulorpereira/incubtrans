// Comportamentos leves da interface (o site funciona sem JavaScript)
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // Menu em telemóvel
  const btn = $('.menu-btn'), nav = $('#nav');
  if (btn && nav) btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });

  // Aviso de cookies: reabrir a partir do rodapé
  $$('.js-cookie-open').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const c = $('#cookie'); if (c) { c.hidden = false; c.querySelector('button').focus(); } }));

  // Emails protegidos contra recolha automática
  $$('.js-mail, .js-mail-static').forEach((a) => { if (a.dataset.u && a.dataset.d) a.textContent = a.dataset.u + '@' + a.dataset.d; });

  // Confirmação antes de eliminar
  $$('form.js-confirm').forEach((f) => f.addEventListener('submit', (e) => { if (!window.confirm(f.dataset.confirm || '?')) e.preventDefault(); }));

  // Ordenação: submete ao mudar
  $$('.js-autosubmit').forEach((s) => s.addEventListener('change', () => s.form.submit()));

  // Galeria de imagens
  $$('.js-thumb').forEach((b) => b.addEventListener('click', () => {
    const main = $('#gal-main'); if (main) main.src = b.dataset.src;
    $$('.js-thumb').forEach((x) => x.classList.toggle('on', x === b));
  }));

  // Linhas repetíveis (redes sociais, localizações)
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('.js-rm');
    if (rm) { const row = rm.closest('.js-row'); const box = row.parentElement; if (box.querySelectorAll('.js-row').length > 1) row.remove(); else row.querySelectorAll('input').forEach((i) => { i.value = ''; }); return; }
    const add = e.target.closest('.js-add');
    if (add) { const box = document.getElementById(add.dataset.target); const rows = box.querySelectorAll('.js-row'); const c = rows[rows.length - 1].cloneNode(true); c.querySelectorAll('input').forEach((i) => { i.value = ''; }); c.querySelectorAll('select').forEach((s) => { s.selectedIndex = 0; }); box.appendChild(c); const f = c.querySelector('input, select'); if (f) f.focus(); }
  });

  // Pesquisa com sugestões (RF-24)
  $$('input[data-suggest]').forEach((input) => {
    const wrap = input.closest('.searchbar') || input.parentElement;
    wrap.style.position = 'relative';
    const box = document.createElement('div');
    box.className = 'suggest'; box.hidden = true; box.setAttribute('role', 'listbox');
    wrap.appendChild(box);
    input.setAttribute('aria-autocomplete', 'list');
    let timer, idx = -1, items = [];
    const close = () => { box.hidden = true; idx = -1; };
    const render = () => {
      box.innerHTML = '';
      items.forEach((it, i) => {
        const a = document.createElement('a');
        a.href = it.url; a.setAttribute('role', 'option'); if (i === idx) a.className = 'on';
        a.textContent = it.label;
        const s = document.createElement('span'); s.textContent = it.kind; a.appendChild(s);
        box.appendChild(a);
      });
      box.hidden = !items.length;
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { items = []; return close(); }
      timer = setTimeout(() => {
        fetch('/api/sugestoes?q=' + encodeURIComponent(q)).then((r) => r.json()).then((d) => { items = d; idx = -1; render(); }).catch(close);
      }, 180);
    });
    input.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { idx = Math.max(-1, idx - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); window.location = items[idx].url; }
      else if (e.key === 'Escape') close();
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  });
})();
