/* Sultan Sofrası · QR table ordering (customer side).
   Table number comes from the QR URL (?table=5). Without it the menu stays view-only. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('tr-TR');
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const STATUS = {
    new: ['Sipariş alındı', 1], preparing: ['Hazırlanıyor', 2], ready: ['Hazır, birazdan masanızda', 3],
    served: ['Servis edildi, afiyet olsun', 4], cancelled: ['İptal edildi', 0],
  };

  let cfg = null, table = null, cart = LS.get('ss_cart', {}), orders = LS.get('ss_orders', []), tracked = new Map();
  let sb = null, channels = new Map(), tab = 'cart', sheet = null;

  /* ---------- table from QR ---------- */
  function resolveTable(maxTables) {
    const p = new URLSearchParams(location.search).get('table');
    if (p !== null) {
      const n = Number(p);
      if (Number.isInteger(n) && n >= 1 && n <= maxTables) { LS.set('ss_table', { n, at: Date.now() }); return n; }
      return null;
    }
    const saved = LS.get('ss_table', null); // a refresh without ?table= keeps the table for 6 hours
    return saved && Date.now() - saved.at < 6 * 3600_000 && saved.n <= maxTables ? saved.n : null;
  }

  const saveCart = () => LS.set('ss_cart', cart);
  const qtyOf = (id) => cart[id] || 0;
  const itemOf = (id) => (window.SS_MENU?.items || []).find((i) => i.id === id);
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.entries(cart).reduce((a, [id, q]) => a + (itemOf(id)?.price || 0) * q, 0);
  function setQty(id, q) {
    q = Math.max(0, Math.min(20, q));
    if (q) cart[id] = q; else delete cart[id];
    saveCart(); refreshAll();
  }
  function toast(msg) {
    const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg, role: 'status' });
    document.body.append(t); setTimeout(() => t.remove(), 2600);
  }

  /* ---------- menu cards ---------- */
  function decorateCards() {
    document.querySelectorAll('.card').forEach((card) => {
      const foot = card.querySelector('.card__foot');
      if (!foot) return;
      let slot = foot.querySelector('.ordslot');
      if (!slot) { slot = document.createElement('span'); slot.className = 'ordslot'; foot.append(slot); }
      const id = card.dataset.id, q = qtyOf(id);
      const key = String(q);
      if (slot.dataset.q === key) return;
      slot.dataset.q = key;
      slot.innerHTML = q
        ? `<span class="stepper"><button type="button" data-dec="${esc(id)}" aria-label="Azalt">−</button><output>${q}</output><button type="button" data-inc="${esc(id)}" aria-label="Artır">+</button></span>`
        : `<button type="button" class="addbtn" data-inc="${esc(id)}">+ Ekle</button>`;
    });
  }

  /* ---------- bottom bar + sheet ---------- */
  function buildUi() {
    document.body.classList.add('has-ordbar');
    const topStatus = $('#openStatus');
    if (topStatus) topStatus.insertAdjacentHTML('beforebegin', `<span class="tablebadge">Masa ${table}</span>`);
    const bar = document.createElement('div');
    bar.className = 'ordbar'; bar.id = 'ordbar';
    document.body.append(bar);
    sheet = document.createElement('div');
    sheet.className = 'sheet'; sheet.id = 'orderSheet'; sheet.hidden = true;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Sipariş');
    sheet.innerHTML = `<div class="sheet__backdrop" data-oclose></div><div class="sheet__panel">
      <div class="sheet__head"><h2>Masa ${table}</h2><button class="iconbtn" data-oclose aria-label="Kapat">✕</button></div>
      <div class="ord-tabs" role="tablist"><button role="tab" data-tab="cart">Sepet</button><button role="tab" data-tab="my">Siparişlerim</button></div>
      <div class="sheet__body" id="ordBody"></div>
      <div class="sheet__foot" id="ordFoot"></div></div>`;
    document.body.append(sheet);
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('[data-oclose]')) closeSheet();
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; renderSheet(); }
      const inc = e.target.closest('[data-inc]'); if (inc) setQty(inc.dataset.inc, qtyOf(inc.dataset.inc) + 1);
      const dec = e.target.closest('[data-dec]'); if (dec) setQty(dec.dataset.dec, qtyOf(dec.dataset.dec) - 1);
      if (e.target.closest('#sendOrder')) sendOrder();
    });
    sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
    document.addEventListener('click', (e) => {
      const inc = e.target.closest('#menu [data-inc]'); if (inc) { setQty(inc.dataset.inc, qtyOf(inc.dataset.inc) + 1); return; }
      const dec = e.target.closest('#menu [data-dec]'); if (dec) setQty(dec.dataset.dec, qtyOf(dec.dataset.dec) - 1);
      if (e.target.closest('#openCart')) openSheet('cart');
      if (e.target.closest('#openMy')) openSheet('my');
    });
  }
  function openSheet(t) { tab = t; sheet.hidden = false; document.body.style.overflow = 'hidden'; renderSheet(); }
  function closeSheet() { sheet.hidden = true; document.body.style.overflow = ''; }

  function renderBar() {
    const n = cartCount(), live = orders.some((o) => tracked.get(o)?.status && !['served', 'cancelled'].includes(tracked.get(o).status));
    $('#ordbar').innerHTML =
      (orders.length ? `<button class="mybtn" id="openMy">${live ? '<span class="dot"></span>' : ''}Siparişlerim</button>` : '') +
      (n ? `<button class="cartbtn" id="openCart"><span>Sepeti gör · ${n} ürün</span><span>${fmt(cartTotal())} ₺</span></button>` : '');
  }

  function renderSheet() {
    if (sheet.hidden) return;
    sheet.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const body = $('#ordBody'), foot = $('#ordFoot');
    if (tab === 'cart') {
      const lines = Object.entries(cart).map(([id, q]) => [itemOf(id), q]).filter(([it]) => it);
      if (!lines.length) { body.innerHTML = '<p class="ord-empty">Sepetiniz boş. Menüden yemek ekleyin.</p>'; foot.innerHTML = ''; return; }
      const noteVal = $('#ordNote')?.value || '';
      body.innerHTML = lines.map(([it, q]) => `<div class="ord-line"><div><b>${esc(it.name)}</b><br><small>${fmt(it.price)} ₺ × ${q} = ${fmt(it.price * q)} ₺</small></div>
        <span class="stepper"><button type="button" data-dec="${esc(it.id)}" aria-label="Azalt">−</button><output>${q}</output><button type="button" data-inc="${esc(it.id)}" aria-label="Artır">+</button></span></div>`).join('') +
        `<div class="ord-total"><span>Toplam</span><span>${fmt(cartTotal())} ₺</span></div>
        <label class="sr" for="ordNote">Sipariş notu</label><textarea id="ordNote" class="ord-note" maxlength="200" placeholder="Not (örn. acısız, buzsuz). Alerjiniz varsa mutlaka yazın.">${esc(noteVal)}</textarea>
        <input class="hp" id="ordHp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="ord-err" id="ordErr" role="alert"></p>`;
      foot.innerHTML = `<button class="btn" id="sendOrder" style="flex:1">Siparişi gönder · Masa ${table}</button>`;
    } else {
      foot.innerHTML = '';
      const list = orders.map((id) => tracked.get(id)).filter(Boolean).sort((a, b) => b.order_no - a.order_no);
      body.innerHTML = list.length ? list.map(trackHtml).join('') : '<p class="ord-empty">Henüz siparişiniz yok.</p>';
    }
  }

  function trackHtml(o) {
    const [label, step] = STATUS[o.status] || [o.status, 0];
    return `<article class="track" data-status="${esc(o.status)}"><div class="track__head"><span class="track__no">Sipariş #${o.order_no}</span><span class="track__state">${esc(label)}</span></div>
      <div class="steps" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <ul>${o.items.map((i) => `<li>${i.qty} × ${esc(i.name)}</li>`).join('')}</ul>
      ${o.note ? `<p class="muted" style="margin:8px 0 0">Not: ${esc(o.note)}</p>` : ''}
      <p style="margin:8px 0 0;font-weight:800">${fmt(o.total)} ₺</p></article>`;
  }

  /* ---------- submit ---------- */
  let sending = false;
  async function sendOrder() {
    if (sending) return;
    const err = $('#ordErr'), btn = $('#sendOrder');
    const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
    if (!items.length) return;
    sending = true; btn.disabled = true; btn.textContent = 'Gönderiliyor…'; err.textContent = '';
    try {
      const r = await fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ table, items, note: $('#ordNote').value, website: $('#ordHp').value }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Sipariş gönderilemedi');
      cart = {}; saveCart();
      orders = [d.order.id, ...orders].slice(0, 10); LS.set('ss_orders', orders);
      tracked.set(d.order.id, d.order); watch(d.order.id);
      refreshAll(); openSheet('my'); toast('Siparişiniz mutfağa iletildi ✓');
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false; btn.textContent = `Siparişi gönder · Masa ${table}`;
    } finally { sending = false; }
  }

  /* ---------- live status: Realtime ping + polling fallback ---------- */
  async function refreshOrders() {
    if (!orders.length) return;
    try {
      const r = await fetch('/api/order?ids=' + orders.join(','), { cache: 'no-store' });
      if (!r.ok) return;
      const { orders: list } = await r.json();
      const old = new Map(tracked);
      for (const o of list) {
        tracked.set(o.id, o);
        if (old.get(o.id) && old.get(o.id).status !== o.status && o.status === 'ready') { toast(`Sipariş #${o.order_no} hazır!`); navigator.vibrate?.([200, 100, 200]); }
      }
      orders = orders.filter((id) => tracked.has(id) && Date.now() - new Date(tracked.get(id).created_at) < 12 * 3600_000);
      LS.set('ss_orders', orders);
      renderBar(); renderSheet();
    } catch { /* offline: next poll retries */ }
  }
  function watch(id) {
    if (!sb || channels.has(id)) return;
    channels.set(id, sb.channel('order:' + id).on('broadcast', { event: 'ping' }, refreshOrders).subscribe());
  }
  function startRealtime() {
    if (!cfg.realtime) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    s.onload = () => { try { sb = window.supabase.createClient(cfg.realtime.url, cfg.realtime.key); orders.forEach(watch); } catch { /* polling still works */ } };
    document.head.append(s);
  }
  function poll() {
    const open = orders.some((id) => !['served', 'cancelled'].includes(tracked.get(id)?.status || 'new'));
    if (open && !document.hidden) refreshOrders();
  }

  function refreshAll() { decorateCards(); renderBar(); renderSheet(); }

  async function init() {
    try { cfg = await (await fetch('/api/config')).json(); } catch { return; }
    if (!cfg.ordering) return;
    table = resolveTable(cfg.tables);
    if (!table) return; // menu stays view-only without a valid QR table
    buildUi();
    const go = () => { cart = Object.fromEntries(Object.entries(cart).filter(([id]) => itemOf(id))); refreshAll(); };
    if (window.SS_MENU) go(); else document.addEventListener('ss:menu', go, { once: true });
    new MutationObserver(decorateCards).observe($('#menu'), { childList: true, subtree: true });
    await refreshOrders();
    startRealtime();
    setInterval(poll, 4000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshOrders(); });
  }
  init();
})();
