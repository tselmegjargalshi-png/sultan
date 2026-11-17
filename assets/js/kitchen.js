/* Sultan Sofrası · kitchen tablet. Live orders (Realtime ping + 3 s polling fallback), sound + visual alert, status buttons. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLS = [['new', 'Yeni'], ['preparing', 'Hazırlanıyor'], ['ready', 'Hazır'], ['served', 'Servis edildi']];
  const NEXT = { new: ['preparing', 'Hazırlamaya başla'], preparing: ['ready', 'Hazır'], ready: ['served', 'Servis edildi'] };
  const PREV = { preparing: 'new', ready: 'preparing', served: 'ready' };

  let pin = sessionStorage.getItem('kpin') || '', orders = [], seen = null, ringing = new Set(), audio = null, soundOn = false, pollTimer = null, wake = null;

  /* ---------- sound ---------- */
  function ensureAudio() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  }
  function beep() {
    if (!soundOn || !audio) return;
    [0, 0.28, 0.56].forEach((d, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = i === 1 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, audio.currentTime + d);
      g.gain.exponentialRampToValueAtTime(0.35, audio.currentTime + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d + 0.22);
      o.connect(g).connect(audio.destination); o.start(audio.currentTime + d); o.stop(audio.currentTime + d + 0.25);
    });
  }
  setInterval(() => { if (ringing.size) beep(); }, 3500); // repeats until acknowledged
  $('#soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    if (soundOn) { ensureAudio(); beep(); }
    $('#soundBtn').textContent = soundOn ? '🔊 Ses açık' : '🔇 Sesi aç';
  });
  $('#ackBtn').addEventListener('click', () => { ringing.clear(); renderAlert(); });
  $('#fsBtn').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()));

  /* ---------- data ---------- */
  async function api(method, body) {
    const r = await fetch('/api/orders', { method, headers: { 'content-type': 'application/json', 'x-kitchen-pin': pin }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { logout(); throw new Error(d.error || 'PIN hatalı'); }
    if (!r.ok) throw new Error(d.error || 'Hata');
    return d;
  }
  let busy = false;
  async function load() {
    if (busy) return; busy = true;
    try {
      const { orders: list } = await api('GET');
      const ids = new Set(list.map((o) => o.id));
      if (seen === null) seen = new Set(ids); // first load: do not ring for orders that were already there
      for (const o of list) if (o.status === 'new' && !seen.has(o.id)) { ringing.add(o.id); o._fresh = true; }
      list.forEach((o) => seen.add(o.id));
      ringing.forEach((id) => { if (list.find((o) => o.id === id)?.status !== 'new') ringing.delete(id); });
      orders = list;
      setLive(true); render(); renderAlert();
      if (ringing.size) beep();
    } catch { setLive(false); } finally { busy = false; }
  }
  function setLive(ok) {
    const el = $('#live'); el.className = 'live ' + (ok ? 'ok' : 'bad'); el.textContent = ok ? '● canlı' : '● bağlantı yok';
  }
  async function setStatus(id, status) {
    try { await api('POST', { id, status }); ringing.delete(id); await load(); } catch (e) { alert(e.message); }
  }

  /* ---------- render ---------- */
  const ageMin = (o) => Math.floor((Date.now() - new Date(o.created_at)) / 60000);
  function render() {
    $('#board').innerHTML = COLS.map(([s, label]) => {
      const list = orders.filter((o) => o.status === s).sort((a, b) => (s === 'served' ? b.order_no - a.order_no : a.order_no - b.order_no));
      return `<section class="col" data-s="${s}"><h2><span>${label}</span><span>${list.length}</span></h2>` +
        (list.length ? list.map(card).join('') : '<p class="col__empty">—</p>') + '</section>';
    }).join('');
    const open = orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length;
    $('#count').textContent = `${open} açık sipariş`;
    document.title = (ringing.size ? `(${ringing.size}) ` : '') + 'Mutfak · Sultan Sofrası';
  }
  function card(o) {
    const a = ageMin(o), next = NEXT[o.status];
    return `<article class="ord ${o._fresh ? 'fresh' : ''}" data-id="${o.id}">
      <div class="ord__top"><span class="ord__table">Masa ${o.table_no}</span>
        <span class="ord__meta">#${o.order_no} · ${new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}<br><span class="ord__age ${a >= 15 && o.status !== 'served' ? 'late' : ''}">${a} dk önce</span></span></div>
      <ul>${o.items.map((i) => `<li><b>${i.qty}×</b>${esc(i.name)}</li>`).join('')}</ul>
      ${o.note ? `<div class="ord__note">📝 ${esc(o.note)}</div>` : ''}
      <div class="ord__btns">
        ${next ? `<button class="kbtn kbtn--main" data-act="${next[0]}">${next[1]}</button>` : ''}
        ${PREV[o.status] ? `<button class="kbtn kbtn--sm" data-act="${PREV[o.status]}">↶ Geri</button>` : ''}
        ${['new', 'preparing'].includes(o.status) ? `<button class="kbtn kbtn--sm" data-act="cancelled" data-confirm="1">İptal</button>` : ''}
      </div></article>`;
  }
  function renderAlert() {
    const n = ringing.size;
    $('#alert').hidden = !n;
    $('#alertText').textContent = n ? `🔔 ${n} YENİ SİPARİŞ` : '';
    document.title = (n ? `(${n}) ` : '') + 'Mutfak · Sultan Sofrası';
  }
  $('#board').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.confirm && !confirm('Siparişi iptal etmek istiyor musunuz?')) return;
    ensureAudio();
    setStatus(b.closest('.ord').dataset.id, b.dataset.act);
  });
  setInterval(() => { if (!$('#app').hidden) render(); }, 30000); // refresh "x dk önce"

  /* ---------- login + realtime ---------- */
  function logout() { pin = ''; sessionStorage.removeItem('kpin'); clearInterval(pollTimer); $('#app').hidden = true; $('#login').hidden = false; }
  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    await load();
    clearInterval(pollTimer); pollTimer = setInterval(load, 3000);
    try { wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }
    document.addEventListener('visibilitychange', async () => { if (!document.hidden) { load(); try { wake = await navigator.wakeLock?.request('screen'); } catch { /* optional */ } } });
    try {
      const cfg = await (await fetch('/api/config')).json();
      if (cfg.realtime) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
        s.onload = () => window.supabase.createClient(cfg.realtime.url, cfg.realtime.key).channel('kitchen').on('broadcast', { event: 'ping' }, load).subscribe();
        document.head.append(s);
      }
    } catch { /* polling continues */ }
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); ensureAudio(); soundOn = true; $('#soundBtn').textContent = '🔊 Ses açık';
    pin = $('#pin').value.trim(); $('#loginErr').textContent = '';
    try { await api('GET'); sessionStorage.setItem('kpin', pin); start(); } catch (err) { $('#loginErr').textContent = err.message; }
  });
  if (pin) api('GET').then(start).catch(() => {});
})();
