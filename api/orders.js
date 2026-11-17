// Kitchen endpoint (PIN protected). GET = live order list, POST {id,status} = change status.
import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from './_lib.js';
import { STATUSES, store, broadcast, publicOrder, isUuid, clientIp } from './_orders.js';

const sha = (s) => createHash('sha256').update(String(s)).digest();
// Basic brute-force throttle (per serverless instance): 8 wrong PINs per IP, then 5 min lockout.
const fails = new Map();
function kitchenAuth(request) {
  const ip = clientIp(request), f = fails.get(ip);
  if (f && f.n >= 8 && Date.now() < f.until) return json({ error: 'Çok fazla hatalı deneme. 5 dakika sonra tekrar deneyin.' }, 429);
  const expected = process.env.KITCHEN_PIN || process.env.ADMIN_PASSWORD;
  if (!expected) return json({ error: 'KITCHEN_PIN tanımlı değil' }, 500);
  const given = request.headers.get('x-kitchen-pin') || '';
  if (!given || !timingSafeEqual(sha(given), sha(expected))) {
    const n = (f && Date.now() < f.until ? f.n : 0) + 1;
    fails.set(ip, { n, until: Date.now() + 5 * 60_000 });
    return json({ error: 'PIN hatalı' }, 401);
  }
  fails.delete(ip);
  return null;
}

export async function GET(request) {
  const denied = kitchenAuth(request);
  if (denied) return denied;
  try {
    return json({ orders: (await store.listForKitchen()).map(publicOrder), now: new Date().toISOString() });
  } catch (e) {
    return json({ error: 'Siparişler okunamadı', detail: String(e.message || e) }, e.status || 500);
  }
}

export async function POST(request) {
  const denied = kitchenAuth(request);
  if (denied) return denied;
  let body; try { body = await request.json(); } catch { return json({ error: 'Geçersiz JSON' }, 400); }
  if (!isUuid(body?.id) || !STATUSES.includes(body?.status)) return json({ error: 'Geçersiz istek' }, 400);
  try {
    const row = await store.setStatus(body.id, body.status);
    if (!row) return json({ error: 'Sipariş bulunamadı' }, 404);
    await broadcast([`order:${row.id}`, 'kitchen']);
    return json({ ok: true, order: publicOrder(row) });
  } catch (e) {
    return json({ error: 'Güncellenemedi', detail: String(e.message || e) }, e.status || 500);
  }
}
