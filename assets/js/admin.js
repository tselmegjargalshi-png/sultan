/* Sultan Sofrası · admin dashboard */
(function () {
  'use strict';
  const I = window.SS_ICONS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
  const DRAFT_KEY = 'ss_admin_draft';
  const PW_KEY = 'ss_admin_pw';
  const DAYS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя']; // 0 = Sunday
  const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} }, del: (k) => { try { sessionStorage.removeItem(k); } catch {} } };
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };

  let pw = ss.get(PW_KEY) || '';
  let M = null;           // working copy of the menu
  let meta = {};
  let dirty = false;
  let storage = 'none';

  /* ---------- helpers ---------- */
  function toast(msg, bad) {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }
  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'x-admin-password': pw, ...(opts.headers || {}) } });
    let data = {}; try { data = await r.json(); } catch {}
    if (!r.ok) throw Object.assign(new Error(data.error || `Алдаа (${r.status})`), { status: r.status });
    return data;
  }
  const slug = (s) => String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x';
  const uid = (base, list) => { let id = slug(base), n = 2; while (list.some((x) => x.id === id)) id = slug(base) + '_' + n++; return id; };
  function markDirty() {
    dirty = true;
    $('#saveBtn').disabled = false; $('#saveBtn').classList.add('is-dirty'); $('#saveBtn').textContent = 'Хадгалах •';
    ls.set(DRAFT_KEY, JSON.stringify(M));
  }
  function markClean() {
    dirty = false;
    $('#saveBtn').disabled = true; $('#saveBtn').classList.remove('is-dirty'); $('#saveBtn').textContent = 'Хадгалсан';
    ls.del(DRAFT_KEY);
  }
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- auth ---------- */
  async function login(pass) {
    pw = pass;
    const r = await api('/api/login', { method: 'POST' });
    storage = r.storage;
    ss.set(PW_KEY, pass);
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    try { await login($('#pw').value); await boot(); }
    catch (err) { $('#loginErr').textContent = err.message; }
  });
  $('#logoutBtn').onclick = () => {
    if (dirty && !confirm('Хадгалаагүй өөрчлөлт байна. Гарах уу?')) return;
    ss.del(PW_KEY); pw = ''; location.reload();
  };

  async function boot() {
    const r = await fetch('/api/menu', { cache: 'no-store' });
    const data = await r.json();
    meta = data._meta || {}; delete data._meta;
    M = data;
    const draft = ls.get(DRAFT_KEY);
    if (draft && confirm('Өмнө нь хадгалаагүй үлдсэн ноорог байна. Сэргээх үү?')) { try { M = JSON.parse(draft); } catch {} }
    else ls.del(DRAFT_KEY);
    M.settings.gallery ||= [];
    $('#login').hidden = true; $('#app').hidden = false;
    const b = $('#storeBadge');
    if (storage === 'blob') { b.textContent = 'Vercel Blob холбогдсон'; b.className = 'abar__store ok'; }
    else if (storage === 'local') { b.textContent = 'Локал хадгалалт (туршилт)'; b.className = 'abar__store ok'; }
    else { b.textContent = 'Хадгалах сан холбогдоогүй'; b.className = 'abar__store warn'; }
    renderAll();
    draft && M !== data ? markDirty() : markClean();
  }

  /* ---------- tabs ---------- */
  $$('.atabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.atabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
    $$('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  }));

  function renderAll() { renderCatSelect(); renderItems(); renderCats(); renderImages(); renderInfo(); renderHours(); renderMeta(); }

  /* ---------- items ---------- */
  function renderCatSelect() {
    const sel = $('#itemCat'); const v = sel.value;
    sel.innerHTML = '<option value="">Бүх ангилал</option>' + M.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    sel.value = M.categories.some((c) => c.id === v) ? v : '';
  }
  function renderItems() {
    const q = $('#itemSearch').value.trim().toLocaleLowerCase('tr-TR');
    const cat = $('#itemCat').value;
    const catName = (id) => M.categories.find((c) => c.id === id)?.name || 'Ангилалгүй';
    const list = M.items.filter((it) => (!cat || it.cat === cat) && (!q || (it.name + ' ' + it.desc).toLocaleLowerCase('tr-TR').includes(q)));
    $('#itemCount').textContent = `${list.length} хоол харагдаж байна (нийт ${M.items.length})`;
    $('#itemRows').innerHTML = list.map((it) => {
      const idx = M.items.indexOf(it);
      return `<li class="row ${it.hidden ? 'is-hidden' : ''}">
        ${it.image ? `<img class="row__thumb" src="${esc(it.image)}" alt="">` : `<span class="row__thumb">${I.ui('star', 'ico')}</span>`}
        <div class="row__main">
          <div class="row__name" lang="tr">${esc(it.name)}</div>
          <div class="row__meta"><span>${esc(catName(it.cat))}</span><span>${fmt(it.kcal)} kcal</span>${(it.allergens || []).map((a) => I.allergen(a)).join('')}${it.hidden ? '<b>Нуусан</b>' : ''}</div>
        </div>
        <span class="row__price">${fmt(it.price)} ₺</span>
        <div class="row__btns">
          <button class="mini" data-act="up" data-i="${idx}" aria-label="Дээш" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="mini" data-act="down" data-i="${idx}" aria-label="Доош" ${idx === M.items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn--ghost btn--sm" data-act="edit" data-i="${idx}">Засах</button>
        </div>
      </li>`;
    }).join('') || '<li class="hint">Хоол олдсонгүй</li>';
  }
  $('#itemSearch').addEventListener('input', renderItems);
  $('#itemCat').addEventListener('change', renderItems);
  $('#itemRows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.act === 'edit') return openItem(i);
    const j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= M.items.length) return;
    [M.items[i], M.items[j]] = [M.items[j], M.items[i]];
    markDirty(); renderItems();
  });
  $('#addItem').onclick = () => openItem(-1);

  let editIdx = -1, editImage = '';
  function openItem(i) {
    editIdx = i;
    const it = i >= 0 ? M.items[i] : { name: '', cat: $('#itemCat').value || M.categories[0]?.id, desc: '', price: 0, kcal: 0, allergens: [], tags: [], image: '' };
    const f = $('#itemForm');
    $('#itemDlgTitle').textContent = i >= 0 ? 'Хоол засах' : 'Шинэ хоол';
    f.cat.innerHTML = M.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    f.name.value = it.name; f.cat.value = it.cat; f.desc.value = it.desc || ''; f.price.value = it.price; f.kcal.value = it.kcal || 0;
    f.signature.checked = (it.tags || []).includes('signature'); f.spicy.checked = (it.tags || []).includes('spicy'); f.veg.checked = (it.tags || []).includes('veg');
    f.hidden.checked = !!it.hidden;
    $('#dlgAlg').innerHTML = I.order.map((k) => `<label><input type="checkbox" value="${k}" ${(it.allergens || []).includes(k) ? 'checked' : ''}>${I.allergen(k)}<span>${I.allergens[k].name}</span></label>`).join('');
    editImage = it.image || '';
    renderDrop($('#itemForm .drop'), editImage, (url) => { editImage = url; });
    $('#delItem').hidden = i < 0;
    $('#itemDlg').showModal();
  }
  $('#itemDlg').addEventListener('close', () => {
    const v = $('#itemDlg').returnValue; const f = $('#itemForm');
    if (v === 'delete' && editIdx >= 0) {
      if (confirm(`“${M.items[editIdx].name}” хоолыг устгах уу?`)) { M.items.splice(editIdx, 1); markDirty(); renderItems(); toast('Устгалаа. Хадгалах товчийг дарна уу.'); }
      return;
    }
    if (v !== 'ok') return;
    const tags = ['signature', 'spicy', 'veg'].filter((t) => f[t].checked);
    const data = {
      name: f.name.value.trim(), cat: f.cat.value, desc: f.desc.value.trim(),
      price: Math.max(0, Number(f.price.value) || 0), kcal: Math.max(0, Number(f.kcal.value) || 0),
      allergens: $$('#dlgAlg input:checked').map((x) => x.value), tags, image: editImage, hidden: f.hidden.checked,
    };
    if (!data.name) return toast('Нэр шаардлагатай', true);
    if (editIdx >= 0) Object.assign(M.items[editIdx], data);
    else M.items.push({ id: uid(data.name, M.items), ...data });
    markDirty(); renderItems();
  });
  $('#itemForm .iconbtn').innerHTML = I.ui('close');
  $('#okItem').addEventListener('click', (e) => { if (!$('#itemForm').reportValidity()) e.preventDefault(); });

  /* ---------- categories ---------- */
  function renderCats() {
    $('#catRows').innerHTML = M.categories.map((c, i) => {
      const n = M.items.filter((it) => it.cat === c.id).length;
      return `<li class="row ${c.hidden ? 'is-hidden' : ''}">
        <div class="catrow">
          <input data-f="name" data-i="${i}" value="${esc(c.name)}" aria-label="Ангиллын нэр" lang="tr">
          <input data-f="subtitle" data-i="${i}" value="${esc(c.subtitle || '')}" aria-label="Дэд гарчиг" placeholder="Дэд гарчиг">
        </div>
        <span class="hint" style="margin:0">${n} хоол</span>
        <div class="row__btns">
          <button class="mini" data-act="up" data-i="${i}" aria-label="Дээш" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="mini" data-act="down" data-i="${i}" aria-label="Доош" ${i === M.categories.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn--ghost btn--sm" data-act="hide" data-i="${i}">${c.hidden ? 'Харуулах' : 'Нуух'}</button>
          <button class="btn btn--ghost btn--sm danger" data-act="del" data-i="${i}">Устгах</button>
        </div>
      </li>`;
    }).join('');
  }
  $('#catRows').addEventListener('input', (e) => {
    const el = e.target.closest('[data-f]'); if (!el) return;
    M.categories[el.dataset.i][el.dataset.f] = el.value; markDirty(); renderCatSelect();
  });
  $('#catRows').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = Number(b.dataset.i), c = M.categories[i];
    if (b.dataset.act === 'hide') c.hidden = !c.hidden;
    else if (b.dataset.act === 'del') {
      const n = M.items.filter((it) => it.cat === c.id).length;
      if (n && !confirm(`“${c.name}” ангилалд ${n} хоол байна. Ангилал болон эдгээр хоолыг устгах уу?`)) return;
      if (!n && !confirm(`“${c.name}” ангиллыг устгах уу?`)) return;
      M.items = M.items.filter((it) => it.cat !== c.id); M.categories.splice(i, 1);
    } else {
      const j = b.dataset.act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= M.categories.length) return;
      [M.categories[i], M.categories[j]] = [M.categories[j], M.categories[i]];
    }
    markDirty(); renderCats(); renderCatSelect(); renderItems();
  });
  $('#addCat').onclick = () => {
    const name = prompt('Шинэ ангиллын нэр (Турк хэлээр):'); if (!name) return;
    M.categories.push({ id: uid(name, M.categories), name: name.trim(), subtitle: '' });
    markDirty(); renderCats(); renderCatSelect();
  };

  /* ---------- images ---------- */
  async function prepareImage(file, { maxSide = 1600, keepPng = false } = {}) {
    if (!/^image\//.test(file.type)) throw new Error('Зөвхөн зураг сонгоно уу');
    if (/svg|gif/.test(file.type)) return file; // keep vector / animation as is
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const type = keepPng ? 'image/png' : 'image/webp';
    const blob = await new Promise((res) => c.toBlob(res, type, 0.86));
    if (!blob) return file;
    return blob.size < file.size || scale < 1 ? new File([blob], file.name.replace(/\.\w+$/, keepPng ? '.png' : '.webp'), { type }) : file;
  }
  async function upload(file, opts) {
    if (storage === 'none') throw new Error('Хадгалах сан холбогдоогүй тул зураг оруулах боломжгүй');
    const f = await prepareImage(file, opts);
    if (f.size > 4 * 1024 * 1024) throw new Error('Зураг хэт том байна (4 MB хүртэл)');
    const r = await api('/api/upload?name=' + encodeURIComponent(f.name || 'image'), { method: 'POST', headers: { 'content-type': f.type }, body: f });
    return r.url;
  }
  async function removeRemote(url) {
    if (!url || url.startsWith('/assets/')) return;
    try { await api('/api/upload?url=' + encodeURIComponent(url), { method: 'DELETE' }); } catch { /* not critical */ }
  }
  function renderDrop(el, url, onChange, opts) {
    el.innerHTML = `${url ? `<img src="${esc(url)}" alt="Сонгосон зураг">` : '<p class="hint">Зураг сонгоогүй байна. Энд чирж тавьж болно.</p>'}
      <div class="btnrow"><label class="btn btn--sm upbtn">${url ? 'Солих' : 'Зураг сонгох'}<input type="file" accept="image/*" hidden></label>
      ${url ? '<button type="button" class="btn btn--ghost btn--sm danger" data-rm>Арилгах</button>' : ''}</div>`;
    const set = async (file) => {
      try {
        el.querySelector('.btnrow').innerHTML = '<span class="hint">Байршуулж байна…</span>';
        const u = await upload(file, opts);
        onChange(u); markDirty(); renderDrop(el, u, onChange, opts); toast('Зураг орлоо. Хадгалах товчийг дарна уу.');
      } catch (err) { toast(err.message, true); renderDrop(el, url, onChange, opts); }
    };
    el.querySelector('input').onchange = (e) => e.target.files[0] && set(e.target.files[0]);
    const rm = el.querySelector('[data-rm]');
    if (rm) rm.onclick = () => { removeRemote(url); onChange(''); markDirty(); renderDrop(el, '', onChange, opts); };
    el.ondragover = (e) => { e.preventDefault(); el.classList.add('is-over'); };
    el.ondragleave = () => el.classList.remove('is-over');
    el.ondrop = (e) => { e.preventDefault(); el.classList.remove('is-over'); const f = e.dataTransfer.files[0]; if (f) set(f); };
  }
  function renderImages() {
    renderDrop($('[data-slot="logoUrl"]'), M.settings.logoUrl, (u) => { M.settings.logoUrl = u; }, { maxSide: 1400, keepPng: true });
    renderDrop($('[data-slot="bannerUrl"]'), M.settings.bannerUrl, (u) => { M.settings.bannerUrl = u; }, { maxSide: 2000 });
    $('#galList').innerHTML = M.settings.gallery.map((u, i) => `<figure><img src="${esc(u)}" alt="Галерей ${i + 1}"><button data-gi="${i}" aria-label="Устгах">${I.ui('close')}</button></figure>`).join('') || '<p class="hint">Галерей хоосон байна.</p>';
  }
  $('#galList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-gi]'); if (!b) return;
    const [u] = M.settings.gallery.splice(Number(b.dataset.gi), 1); removeRemote(u); markDirty(); renderImages();
  });
  $('#galInput').addEventListener('change', async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    for (const f of files) {
      try { toast(`Байршуулж байна: ${f.name}`); M.settings.gallery.push(await upload(f)); markDirty(); renderImages(); }
      catch (err) { toast(err.message, true); break; }
    }
  });

  /* ---------- info ---------- */
  const FIELDS = [
    ['name', 'Рестораны нэр'], ['subtitle', 'Дэд нэр'],
    ['sloganTr', 'Уриа үг (Турк)'], ['sloganMn', 'Уриа үг (Монгол)'],
    ['notice', 'Дээд мэдэгдэл', 'full'], ['teaNote', 'Цайны бэлэгийн мэдэгдэл', 'full'],
    ['about', 'Бидний түүх', 'full', 'textarea'], ['since', 'Үүсгэсэн он'], ['city', 'Хот'],
    ['address', 'Хаяг', 'full'], ['mapUrl', 'Газрын зургийн холбоос', 'full'],
    ['phone', 'Утас'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram хаяг (@ гүйгээр)'], ['wifi', 'WiFi нэр'],
    ['mealCards', 'Хоолны картууд (таслалаар тусгаарлана)', 'full'],
  ];
  function renderInfo() {
    const s = M.settings;
    $('#infoForm').innerHTML = '<h2>Ерөнхий мэдээлэл</h2>' + FIELDS.map(([k, label, cls, type]) => {
      const v = k === 'mealCards' ? (s.mealCards || []).join(', ') : (s[k] ?? '');
      return `<label class="field ${cls || ''}"><span>${label}</span>${type === 'textarea' ? `<textarea name="${k}" rows="4">${esc(v)}</textarea>` : `<input name="${k}" value="${esc(v)}">`}</label>`;
    }).join('');
  }
  $('#infoForm').addEventListener('input', (e) => {
    const el = e.target; if (!el.name) return;
    M.settings[el.name] = el.name === 'mealCards' ? el.value.split(',').map((x) => x.trim()).filter(Boolean) : el.value;
    markDirty();
  });
  function renderHours() {
    const s = M.settings; s.hours ||= []; s.openRules ||= [];
    while (s.openRules.length < s.hours.length) s.openRules.push({ days: [], open: '10:00', close: '22:00' });
    $('#hoursEditor').innerHTML = s.hours.map((h, i) => {
      const r = s.openRules[i];
      return `<div class="hrow" data-i="${i}">
        <input data-k="label" value="${esc(h.label)}" aria-label="Өдрүүд (текст)" placeholder="Өдрүүд">
        <input data-k="value" value="${esc(h.value)}" aria-label="Цаг (текст)" placeholder="Цаг">
        <input data-k="open" value="${esc(r.open)}" aria-label="Нээх цаг" placeholder="10:00" pattern="\\d{1,2}:\\d{2}">
        <input data-k="close" value="${esc(r.close)}" aria-label="Хаах цаг" placeholder="23:00" pattern="\\d{1,2}:\\d{2}">
        <button class="mini danger" data-rmh="${i}" aria-label="Мөр устгах" type="button">${I.ui('close')}</button>
        <div class="days">${DAYS.map((d, di) => `<label><input type="checkbox" data-day="${di}" ${r.days.includes(di) ? 'checked' : ''}>${d}</label>`).join('')}</div>
      </div>`;
    }).join('');
  }
  $('#hoursEditor').addEventListener('input', (e) => {
    const row = e.target.closest('.hrow'); if (!row) return;
    const i = Number(row.dataset.i), k = e.target.dataset.k, s = M.settings;
    if (e.target.dataset.day !== undefined) {
      s.openRules[i].days = $$('[data-day]', row).filter((x) => x.checked).map((x) => Number(x.dataset.day));
    } else if (k === 'label' || k === 'value') s.hours[i][k] = e.target.value;
    else if (k) s.openRules[i][k] = e.target.value;
    markDirty();
  });
  $('#hoursEditor').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rmh]'); if (!b) return;
    const i = Number(b.dataset.rmh); M.settings.hours.splice(i, 1); M.settings.openRules.splice(i, 1); markDirty(); renderHours();
  });
  $('#addHours').onclick = () => { M.settings.hours.push({ label: '', value: '' }); M.settings.openRules.push({ days: [], open: '10:00', close: '22:00' }); markDirty(); renderHours(); };

  /* ---------- backup ---------- */
  function renderMeta() {
    const when = M.savedAt || meta.updatedAt;
    $('#metaInfo').textContent = `Эх сурвалж: ${meta.source === 'blob' ? 'Vercel Blob' : meta.source === 'local' ? 'Локал' : 'Анхны өгөгдөл'}` + (when ? ` · Сүүлд хадгалсан: ${new Date(when).toLocaleString('mn-MN')}` : '') + (M.version ? ` · Хувилбар ${M.version}` : '');
  }
  $('#exportBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(M, null, 2)], { type: 'application/json' }));
    a.download = `sultan_sofrasi_menu_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#importInput').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d.settings || !Array.isArray(d.items) || !Array.isArray(d.categories)) throw new Error('Файлын бүтэц буруу');
      M = d; M.settings.gallery ||= []; markDirty(); renderAll(); toast('Оруулсан. Хадгалах товчийг дарна уу.');
    } catch (err) { toast(err.message, true); }
  };
  $('#resetBtn').onclick = async () => {
    if (!confirm('Бүх өөрчлөлтийг арилгаж анхны цэс рүү буцаах уу? (Хадгалах товч дарсны дараа хүчинтэй болно)')) return;
    const d = await (await fetch('/data/default-menu.json', { cache: 'no-store' })).json();
    M = d; markDirty(); renderAll();
  };

  /* ---------- save ---------- */
  $('#saveBtn').onclick = async () => {
    const btn = $('#saveBtn'); btn.disabled = true; btn.textContent = 'Хадгалж байна…';
    try {
      const r = await api('/api/menu', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(M) });
      M.version = r.version; M.savedAt = r.savedAt; markClean(); renderMeta(); toast('Амжилттай хадгалагдлаа. Цэс шинэчлэгдсэн.');
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Хадгалах •';
      if (err.status === 401) { toast('Нууц үг хүчингүй болсон. Дахин нэвтэрнэ үү.', true); ss.del(PW_KEY); }
      else toast(err.message + (err.status === 503 ? '. Ноорог энэ төхөөрөмжид хадгалагдсан.' : ''), true);
    }
  };

  /* ---------- start ---------- */
  $$('.search__ico').forEach((e) => { e.innerHTML = I.ui('search'); });
  if (pw) { login(pw).then(boot).catch(() => { ss.del(PW_KEY); pw = ''; }); }
})();
