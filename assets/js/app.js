/* Sultan Sofrası · public menu */
(function () {
  'use strict';
  const I = window.SS_ICONS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('tr-TR');
  const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

  let DATA = null;
  const state = { exclude: new Set(), veg: false, sig: false, noSpicy: false, maxKcal: 2000 };

  async function load() {
    const tries = ['/api/menu', '/data/default-menu.json'];
    for (const url of tries) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) return await r.json();
      } catch { /* try next */ }
    }
    throw new Error('Цэс ачаалж чадсангүй');
  }

  function tagsHtml(it) {
    const t = it.tags || [];
    let h = '';
    if (t.includes('signature')) h += `<span class="tag tag--sig">${I.ui('crown')}Тогоочийн онцлох</span>`;
    if (t.includes('spicy')) h += `<span class="tag tag--spicy">${I.ui('flame')}Халуун</span>`;
    if (t.includes('veg')) h += `<span class="tag tag--veg">${I.ui('leaf')}Цагаан хоол</span>`;
    return h;
  }

  function cardHtml(it, i) {
    const algs = (it.allergens || []).map((a) => I.allergen(a)).join('');
    const algLabel = (it.allergens || []).map((a) => I.allergens[a]?.name).filter(Boolean).join(', ');
    return `<article class="card" id="item-${esc(it.id)}" data-id="${esc(it.id)}" style="animation-delay:${Math.min(i, 8) * 40}ms">
      <div class="card__body">
        <h3 class="card__name" lang="tr">${esc(it.name)}</h3>
        <div class="card__tags">${tagsHtml(it)}</div>
        ${it.desc ? `<p class="card__desc">${esc(it.desc)}</p>` : ''}
        <div class="card__foot">
          <span class="kcal">${fmt(it.kcal || 0)} kcal</span>
          ${algs ? `<span class="algs" role="group" aria-label="Харшил: ${esc(algLabel)}">${algs}</span>` : ''}
          <span class="price" aria-label="Үнэ ${fmt(it.price)} лира">${fmt(it.price)}<small>₺</small></span>
        </div>
      </div>
      ${it.image ? `<img class="card__img" src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy" decoding="async">` : ''}
    </article>`;
  }

  function renderMenu() {
    const menu = $('#menu');
    const cats = DATA.categories.filter((c) => !c.hidden);
    menu.innerHTML = cats.map((c, ci) => {
      const items = DATA.items.filter((it) => it.cat === c.id && !it.hidden);
      if (!items.length) return '';
      return `<section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
        <header class="cat__head">
          <span class="cat__num" aria-hidden="true">${String(ci + 1).padStart(2, '0')}</span>
          <div><h2 class="cat__title" id="h-${esc(c.id)}" lang="tr">${esc(c.name)}</h2>${c.subtitle ? `<p class="cat__sub">${esc(c.subtitle)}</p>` : ''}</div>
          <span class="cat__rule" aria-hidden="true"></span>
        </header>
        <div class="grid">${items.map(cardHtml).join('')}</div>
      </section>`;
    }).join('');

    $('#tabs').innerHTML = cats
      .filter((c) => DATA.items.some((it) => it.cat === c.id && !it.hidden))
      .map((c, i) => `<button class="tab" role="tab" lang="tr" aria-selected="${i === 0}" aria-controls="cat-${esc(c.id)}" data-target="${esc(c.id)}">${esc(c.name)}</button>`)
      .join('');
    $$('#tabs .tab').forEach((b) => b.addEventListener('click', () => {
      const sec = document.getElementById('cat-' + b.dataset.target);
      if (sec) sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      setActiveTab(b.dataset.target, true);
    }));
    observeSections();
    applyFilters();
  }

  let lockSpy = 0;
  function setActiveTab(id, fromClick) {
    if (fromClick) lockSpy = Date.now() + 900;
    $$('#tabs .tab').forEach((b) => {
      const on = b.dataset.target === id;
      b.setAttribute('aria-selected', on);
      if (on) {
        const sc = $('#tabs');
        const left = b.offsetLeft - sc.clientWidth / 2 + b.clientWidth / 2;
        sc.scrollTo({ left, behavior: 'smooth' });
      }
    });
  }

  let observer;
  function observeSections() {
    observer?.disconnect();
    const header = $('.topbar').offsetHeight;
    document.documentElement.style.setProperty('--header-h', header + 8 + 'px');
    observer = new IntersectionObserver((entries) => {
      if (Date.now() < lockSpy) return;
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActiveTab(vis[0].target.dataset.cat);
    }, { rootMargin: `-${header + 10}px 0px -60% 0px` });
    $$('.cat').forEach((s) => observer.observe(s));
  }

  /* ---------- Filters ---------- */
  function matches(it) {
    if ((it.allergens || []).some((a) => state.exclude.has(a))) return false;
    const t = it.tags || [];
    if (state.veg && !t.includes('veg')) return false;
    if (state.sig && !t.includes('signature')) return false;
    if (state.noSpicy && t.includes('spicy')) return false;
    if ((it.kcal || 0) > state.maxKcal) return false;
    return true;
  }
  function activeCount() {
    return state.exclude.size + state.veg + state.sig + state.noSpicy + (state.maxKcal < 2000 ? 1 : 0);
  }
  function applyFilters() {
    let shown = 0;
    $$('.cat').forEach((sec) => {
      let any = 0;
      $$('.card', sec).forEach((card) => {
        const it = DATA.items.find((x) => x.id === card.dataset.id);
        const ok = it && matches(it);
        card.hidden = !ok;
        if (ok) any++;
      });
      sec.hidden = !any;
      shown += any;
    });
    const n = activeCount();
    const badge = $('#filterCount');
    badge.hidden = !n; badge.textContent = n;
    $('#emptyState').hidden = shown > 0;
    const box = $('#activeFilters');
    if (n) {
      const bits = [...state.exclude].map((a) => `${I.allergens[a].name} агуулаагүй`);
      if (state.veg) bits.push('Цагаан хоол');
      if (state.sig) bits.push('Тогоочийн онцлох');
      if (state.noSpicy) bits.push('Халуун ногоогүй');
      if (state.maxKcal < 2000) bits.push(`${state.maxKcal} kcal хүртэл`);
      box.innerHTML = `<span>Шүүлтүүр:</span>${bits.map((b) => `<span class="pill">${esc(b)}</span>`).join('')}<button class="linkbtn" id="clearInline">Цэвэрлэх</button>`;
      box.hidden = false;
      $('#clearInline').onclick = clearFilters;
    } else { box.hidden = true; box.innerHTML = ''; }
    $$('#tabs .tab').forEach((b) => { b.hidden = !!document.getElementById('cat-' + b.dataset.target)?.hidden; });
  }
  function clearFilters() {
    state.exclude.clear(); state.veg = state.sig = state.noSpicy = false; state.maxKcal = 2000;
    syncFilterUI(); applyFilters();
  }
  function syncFilterUI() {
    $$('#algPick input').forEach((i) => { i.checked = state.exclude.has(i.value); });
    $('#fVeg').checked = state.veg; $('#fSig').checked = state.sig; $('#fNoSpicy').checked = state.noSpicy;
    $('#fKcal').value = state.maxKcal;
    $('#kcalOut').textContent = state.maxKcal >= 2000 ? 'хязгааргүй' : `${state.maxKcal} kcal хүртэл`;
  }
  function buildFilterUI() {
    $('#algPick').innerHTML = I.order.map((k) => `<label><input type="checkbox" value="${k}">${I.allergen(k)}<span>${I.allergens[k].name}</span></label>`).join('');
    $('#algPick').addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      e.target.checked ? state.exclude.add(e.target.value) : state.exclude.delete(e.target.value);
      applyFilters();
    });
    $('#fVeg').onchange = (e) => { state.veg = e.target.checked; applyFilters(); };
    $('#fSig').onchange = (e) => { state.sig = e.target.checked; applyFilters(); };
    $('#fNoSpicy').onchange = (e) => { state.noSpicy = e.target.checked; applyFilters(); };
    $('#fKcal').oninput = (e) => { state.maxKcal = Number(e.target.value); syncFilterUI(); applyFilters(); };
    $('#clearFilters').onclick = clearFilters;
    $('#clearFilters2').onclick = clearFilters;
    syncFilterUI();
  }

  /* ---------- Sheets ---------- */
  let lastFocus = null;
  function openSheet(id) {
    const s = document.getElementById(id);
    lastFocus = document.activeElement;
    s.hidden = false;
    document.body.style.overflow = 'hidden';
    const f = s.querySelector('input, button:not([data-close])') || s.querySelector('button');
    setTimeout(() => f?.focus(), 30);
  }
  function closeSheet(s) {
    s.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  }
  function wireSheets() {
    $$('.sheet').forEach((s) => {
      s.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(s); });
      s.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSheet(s);
        if (e.key === 'Tab') { // simple focus trap
          const f = $$('button, input, [href], [tabindex]:not([tabindex="-1"])', s).filter((x) => !x.disabled && x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    });
    $$('[data-close]').forEach((b) => { if (b.classList.contains('iconbtn')) b.innerHTML = I.ui('close'); });
    $('#searchBtn').innerHTML = I.ui('search');
    $('#filterBtn').insertAdjacentHTML('afterbegin', I.ui('filter'));
    $('#searchBtn').onclick = () => { openSheet('searchSheet'); runSearch(); };
    $('#filterBtn').onclick = () => openSheet('filterSheet');
    $('.search__ico').innerHTML = I.ui('search');
  }

  /* ---------- Search ---------- */
  function highlight(text, q) {
    if (!q) return esc(text);
    const n = norm(text); const i = n.indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function runSearch() {
    const q = norm($('#searchInput').value.trim());
    const list = $('#searchResults');
    const catName = (id) => DATA.categories.find((c) => c.id === id)?.name || '';
    const items = DATA.items.filter((it) => !it.hidden && (!q || norm(it.name + ' ' + it.desc + ' ' + catName(it.cat)).includes(q)));
    if (!items.length) { list.innerHTML = `<li class="r-empty">“${esc($('#searchInput').value)}” гэсэн хоол олдсонгүй</li>`; return; }
    list.innerHTML = items.slice(0, 60).map((it) => `<li><button data-go="${esc(it.id)}">
      <span><span class="r-name" lang="tr">${highlight(it.name, q)}</span><span class="r-cat">${esc(catName(it.cat))} · ${fmt(it.kcal || 0)} kcal</span></span>
      <span class="r-price">${fmt(it.price)} ₺</span></button></li>`).join('');
  }
  function goToItem(id) {
    const card = document.getElementById('item-' + id);
    if (!card) return;
    if (card.hidden) clearFilters();
    closeSheet($('#searchSheet'));
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('is-flash'); void card.offsetWidth; card.classList.add('is-flash');
    }, 60);
  }

  /* ---------- Opening hours (Europe/Istanbul) ---------- */
  function istanbulNow() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = (t) => p.find((x) => x.type === t)?.value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { day, min: Number(g('hour')) * 60 + Number(g('minute')) };
  }
  const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
  function openState(rules) {
    if (!Array.isArray(rules) || !rules.length) return null;
    const { day, min } = istanbulNow();
    const prev = (day + 6) % 7;
    for (const r of rules) {
      const o = toMin(r.open), c = toMin(r.close);
      if (r.days.includes(day) && min >= o && min < c) return { open: true, until: r.close };
      if (r.days.includes(prev) && c > 1440 && min < c - 1440) return { open: true, until: r.close };
    }
    const today = rules.find((r) => r.days.includes(day));
    if (today && min < toMin(today.open)) return { open: false, opens: today.open };
    return { open: false };
  }
  const hhmm = (s) => { const m = toMin(s) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function renderStatus() {
    const st = openState(DATA.settings.openRules);
    const el = $('#openStatus');
    if (!st) return;
    el.classList.toggle('is-open', st.open);
    el.classList.toggle('is-closed', !st.open);
    $('.status__text', el).textContent = st.open ? `Нээлттэй · ${hhmm(st.until)} хүртэл` : (st.opens ? `${hhmm(st.opens)} цагт нээнэ` : 'Одоо хаалттай');
  }

  /* ---------- Static sections ---------- */
  function renderSettings() {
    const s = DATA.settings;
    if (s.logoUrl) { $('#brandLogo').src = s.logoUrl; $$('.footer__logo').forEach((i) => { i.src = s.logoUrl; }); }
    if (s.sloganTr) { $('#heroTitle').innerHTML = esc(s.sloganTr).replace(/,\s*/, ',<br>'); $('#footerSlogan').textContent = s.sloganTr; }
    if (s.sloganMn) $('#heroMn').textContent = s.sloganMn;
    if (s.bannerUrl) { const h = $('#hero'); h.classList.add('has-banner'); h.style.backgroundImage = `url("${encodeURI(s.bannerUrl)}")`; }
    document.title = `${s.name || 'Sultan Sofrası'} · ${s.subtitle || 'Türk Restoranı'} · Цэс`;

    const facts = [];
    if (s.since) facts.push(`${I.ui('star')}${esc(s.since)} оноос`);
    if (s.city) facts.push(`${I.ui('pin')}<span lang="tr">${esc(s.city)}</span>`);
    if (s.wifi) facts.push(`${I.ui('wifi')}WiFi: ${esc(s.wifi)}`);
    $('#heroFacts').innerHTML = facts.map((f) => `<li>${f}</li>`).join('');

    $('#notice').textContent = s.notice || '';
    $('#teaNote').innerHTML = s.teaNote ? `${I.ui('tea')}<span><strong lang="tr">Çay ikramı.</strong> ${esc(s.teaNote)}</span>` : '';
    $('#aboutText').textContent = s.about || '';
    $('#aboutSince').textContent = s.since ? `${s.since} оноос хойш нэг гал, нэг сэтгэл` : '';

    const g = (s.gallery || []).filter(Boolean);
    const gal = $('#gallery');
    gal.hidden = !g.length;
    gal.innerHTML = g.map((u, i) => `<img src="${esc(u)}" alt="Sultan Sofrası зураг ${i + 1}" loading="lazy" decoding="async">`).join('');

    const { day } = istanbulNow();
    const rules = s.openRules || [];
    $('#hoursList').innerHTML = (s.hours || []).map((h, i) => `<div class="${rules[i]?.days?.includes(day) ? 'is-today' : ''}"><dt>${esc(h.label)}</dt><dd>${esc(h.value)}</dd></div>`).join('');

    const tel = (p) => String(p).replace(/[^\d+]/g, '');
    const c = [];
    if (s.address) c.push(`<li><a href="${esc(s.mapUrl || 'https://maps.google.com/?q=' + encodeURIComponent(s.address))}" target="_blank" rel="noopener">${I.ui('pin')}<span><span lang="tr">${esc(s.address)}</span><small>Газрын зураг дээр харах</small></span></a></li>`);
    if (s.phone) c.push(`<li><a href="tel:${tel(s.phone)}">${I.ui('phone')}<span>${esc(s.phone)}<small>Ширээ захиалах</small></span></a></li>`);
    if (s.whatsapp) c.push(`<li><a href="https://wa.me/${tel(s.whatsapp).replace('+', '')}" target="_blank" rel="noopener">${I.ui('whatsapp')}<span>${esc(s.whatsapp)}<small>WhatsApp</small></span></a></li>`);
    if (s.instagram) c.push(`<li><a href="https://instagram.com/${esc(s.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">${I.ui('instagram')}<span>@${esc(s.instagram.replace(/^@/, ''))}<small>Instagram</small></span></a></li>`);
    $('#contactList').innerHTML = c.join('');
    $('#mealCards').innerHTML = (s.mealCards || []).map((m) => `<li>${esc(m)}</li>`).join('');

    $('#legendGrid').innerHTML = I.order.map((k) => `<li>${I.allergen(k)}<span>${I.allergens[k].name}</span></li>`).join('');
    $$('.legend__tags .tag--sig').forEach((e) => { e.innerHTML = I.ui('crown'); });
    $$('.legend__tags .tag--spicy').forEach((e) => { e.innerHTML = I.ui('flame'); });
    $$('.legend__tags .tag--veg').forEach((e) => { e.innerHTML = I.ui('leaf'); });
    $('#year').textContent = new Date().getFullYear();
  }

  function wireMisc() {
    const top = $('#toTop');
    top.innerHTML = I.ui('up');
    addEventListener('scroll', () => { top.hidden = scrollY < 900; }, { passive: true });
    top.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
    $('#searchInput').addEventListener('input', runSearch);
    $('#searchResults').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) goToItem(b.dataset.go); });
    addEventListener('resize', () => observeSections());
  }

  async function init() {
    $('#menu').innerHTML = '<div class="grid" style="padding-top:34px">' + '<div class="skeleton"></div>'.repeat(4) + '</div>';
    wireSheets(); buildFilterUI(); wireMisc();
    try {
      DATA = await load();
    } catch (e) {
      $('#menu').innerHTML = `<p class="empty">${esc(e.message)}. Хуудсаа дахин ачаална уу.</p>`;
      return;
    }
    renderSettings(); renderMenu(); renderStatus();
    setInterval(renderStatus, 60_000);
    if (location.hash.startsWith('#item-')) goToItem(location.hash.slice(6));
  }
  init();
})();
