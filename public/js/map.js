// Mapa interativo (Leaflet + OpenStreetMap). Só é carregado depois do consentimento.
(function () {
  'use strict';
  const el = document.getElementById('map');
  if (!el || !window.L) return;
  const COLORS = { empresa: '#0A6FB0', incubadora: '#1F9D55', agente: '#F5A524' };
  const map = L.map(el, { scrollWheelZoom: el.dataset.mode === 'full' }).setView([41.95, -7.6], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const marker = (p) => L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: COLORS[p.type] || '#0B2C5C', fillOpacity: 0.95 });
  const layer = L.layerGroup().addTo(map);

  if (el.dataset.mode === 'entity') {
    const pts = JSON.parse(el.dataset.points || '[]');
    pts.forEach((p) => marker(p).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.place)}`).addTo(layer));
    if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 12);
    else if (pts.length > 1) map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [30, 30] });
    return;
  }

  let all = [];
  const list = document.getElementById('map-list'), count = document.getElementById('map-count');
  function draw() {
    const types = Array.from(document.querySelectorAll('.js-mf[name=type]:checked')).map((i) => i.value);
    const cat = (document.querySelector('.js-mf[name=category]') || {}).value || '';
    const reg = (document.querySelector('.js-mf[name=region]') || {}).value || '';
    const rows = all.filter((p) => (!document.querySelector('.js-mf[name=type]') || types.includes(p.type)) && (!cat || String(p.category) === cat) && (!reg || p.region === reg));
    layer.clearLayers();
    rows.forEach((p) => marker(p).bindPopup(`<span style="color:${COLORS[p.type]};font-weight:700;font-size:12px">${esc(p.typeLabel)}</span><br><b>${esc(p.name)}</b><br><small>${esc(p.place)}</small><p style="margin:6px 0">${esc(p.desc)}…</p><a href="${esc(p.url)}">${el.dataset.open || '→'}</a>`).addTo(layer));
    if (count) count.textContent = rows.length + ' ' + (document.documentElement.lang === 'es' ? 'ubicaciones en el mapa' : 'localizações no mapa');
    if (list) {
      list.innerHTML = '';
      const seen = new Set();
      rows.forEach((p) => { if (seen.has(p.url)) return; seen.add(p.url); const a = document.createElement('a'); a.href = p.url; a.innerHTML = `<span class="dot" style="background:${COLORS[p.type]}"></span>${esc(p.name)}<small>${esc(p.place)}</small>`; list.appendChild(a); });
    }
    if (rows.length) map.fitBounds(rows.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 11 });
  }
  document.querySelectorAll('.js-mf').forEach((i) => i.addEventListener('change', draw));
  fetch('/api/mapa').then((r) => r.json()).then((d) => { all = d; draw(); });
})();
