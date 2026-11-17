// Order storage + validation for the QR ordering system.
// Backends: Supabase (production, REST + Realtime broadcast) or a JSON file (local dev, LOCAL_BLOB_DIR).
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readMenu } from './_lib.js';

export const STATUSES = ['new', 'preparing', 'ready', 'served', 'cancelled'];
const ACTIVE = ['new', 'preparing', 'ready'];
export const LIMITS = {
  maxLines: 25, maxQty: 20, maxTotalQty: 60, noteLen: 200,
  perIpWindowMs: 2 * 60_000, perIpMax: 4,      // orders per IP per window
  perTableOpenMax: 6,                          // open (not served/cancelled) orders per table
  recentServedMs: 2 * 3600_000,                // kitchen still lists served orders for 2 h
};

export const tableCount = () => Math.min(Math.max(parseInt(process.env.TABLE_COUNT || '30', 10) || 30, 1), 200);

const SB_URL = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const orderBackend = () => (SB_URL() && SB_KEY() ? 'supabase' : process.env.LOCAL_BLOB_DIR ? 'local' : 'none');

export const publicOrder = (o) => ({
  id: o.id, order_no: o.order_no, table_no: o.table_no, items: o.items, note: o.note || '',
  total: Number(o.total), status: o.status, created_at: o.created_at, updated_at: o.updated_at,
});

export const hashIp = (ip) => createHash('sha256').update(`${process.env.ADMIN_PASSWORD || 'salt'}|${ip}`).digest('hex').slice(0, 32);
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';

/* ---------------- Supabase ---------------- */
async function sb(pathAndQuery, init = {}) {
  const r = await fetch(`${SB_URL()}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: SB_KEY(), authorization: `Bearer ${SB_KEY()}`, 'content-type': 'application/json', ...(init.headers || {}) },
  });
  if (!r.ok) throw Object.assign(new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`), { status: 502 });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

/** Realtime "ping": clients only learn that something changed, then refetch through the API (no order data goes over the public channel). */
export async function broadcast(topics) {
  if (orderBackend() !== 'supabase') return;
  try {
    await fetch(`${SB_URL()}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: SB_KEY(), authorization: `Bearer ${SB_KEY()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messages: topics.map((topic) => ({ topic, event: 'ping', payload: { t: Date.now() }, private: false })) }),
    });
  } catch { /* clients also poll, so a missed broadcast is not fatal */ }
}

/* ---------------- Local (dev) ---------------- */
const localFile = () => path.join(process.env.LOCAL_BLOB_DIR, 'orders.json');
async function localRead() {
  try { return JSON.parse(await fs.readFile(localFile(), 'utf8')); } catch { return { seq: 0, orders: [] }; }
}
async function localWrite(db) {
  await fs.mkdir(process.env.LOCAL_BLOB_DIR, { recursive: true });
  await fs.writeFile(localFile(), JSON.stringify(db));
}

/* ---------------- Store API ---------------- */
export const store = {
  async insert(o) {
    if (orderBackend() === 'supabase') {
      const rows = await sb('orders', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify(o) });
      return rows[0];
    }
    const db = await localRead();
    const now = new Date().toISOString();
    const row = { id: randomUUID(), order_no: ++db.seq, status: 'new', created_at: now, updated_at: now, ...o };
    db.orders.push(row);
    await localWrite(db);
    return row;
  },
  async get(ids) {
    if (!ids.length) return [];
    if (orderBackend() === 'supabase') return sb(`orders?id=in.(${ids.join(',')})&select=*`);
    return (await localRead()).orders.filter((o) => ids.includes(o.id));
  },
  async listForKitchen() {
    const since = new Date(Date.now() - LIMITS.recentServedMs).toISOString();
    if (orderBackend() === 'supabase') {
      return sb(`orders?or=(status.in.(${ACTIVE.join(',')}),updated_at.gte.${since})&order=created_at.asc&limit=300&select=*`);
    }
    return (await localRead()).orders.filter((o) => ACTIVE.includes(o.status) || o.updated_at >= since);
  },
  async countRecentByIp(ipHash) {
    const since = new Date(Date.now() - LIMITS.perIpWindowMs).toISOString();
    if (orderBackend() === 'supabase') return (await sb(`orders?ip_hash=eq.${ipHash}&created_at=gte.${since}&select=id&limit=50`)).length;
    return (await localRead()).orders.filter((o) => o.ip_hash === ipHash && o.created_at >= since).length;
  },
  async countOpenByTable(table) {
    if (orderBackend() === 'supabase') return (await sb(`orders?table_no=eq.${table}&status=in.(${ACTIVE.join(',')})&select=id&limit=50`)).length;
    return (await localRead()).orders.filter((o) => o.table_no === table && ACTIVE.includes(o.status)).length;
  },
  async setStatus(id, status) {
    const updated_at = new Date().toISOString();
    if (orderBackend() === 'supabase') {
      const rows = await sb(`orders?id=eq.${id}`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ status, updated_at }) });
      return rows[0] || null;
    }
    const db = await localRead();
    const o = db.orders.find((x) => x.id === id);
    if (!o) return null;
    o.status = status; o.updated_at = updated_at;
    await localWrite(db);
    return o;
  },
};

export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));

/** Validates a customer payload against the live menu. Prices always come from the server menu, never the client. */
export async function buildOrder(body) {
  if (!body || typeof body !== 'object') return { error: 'Geçersiz istek' };
  if (body.website) return { error: 'Geçersiz istek' }; // honeypot: real users never fill this hidden field
  const table = Number(body.table);
  if (!Number.isInteger(table) || table < 1 || table > tableCount()) return { error: 'Geçersiz masa numarası. Lütfen masadaki QR kodu tekrar okutun.' };
  if (!Array.isArray(body.items) || !body.items.length) return { error: 'Sepet boş' };
  if (body.items.length > LIMITS.maxLines) return { error: 'Çok fazla farklı ürün' };
  const note = String(body.note ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIMITS.noteLen);

  const { menu } = await readMenu();
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  const merged = new Map();
  for (const line of body.items) {
    const qty = Number(line?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > LIMITS.maxQty) return { error: 'Geçersiz adet' };
    const item = byId.get(String(line?.id));
    if (!item || item.hidden) return { error: 'Menüde olmayan bir ürün var, sayfayı yenileyin' };
    merged.set(item.id, (merged.get(item.id) || 0) + qty);
  }
  let totalQty = 0, total = 0;
  const items = [];
  for (const [id, qty] of merged) {
    if (qty > LIMITS.maxQty) return { error: 'Geçersiz adet' };
    const it = byId.get(id);
    totalQty += qty; total += it.price * qty;
    items.push({ id, name: it.name, qty, price: it.price });
  }
  if (totalQty > LIMITS.maxTotalQty) return { error: 'Sipariş çok büyük, lütfen garsonla görüşün' };
  return { order: { table_no: table, items, note, total: Math.round(total * 100) / 100 } };
}
