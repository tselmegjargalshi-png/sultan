// Customer endpoint. POST = place an order, GET ?ids=a,b = read status of own orders (unguessable UUIDs).
import { json } from './_lib.js';
import { buildOrder, store, broadcast, publicOrder, hashIp, clientIp, isUuid, orderBackend, LIMITS } from './_orders.js';

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients are limited by the rate limits below
  try { return new URL(origin).host === (request.headers.get('x-forwarded-host') || request.headers.get('host')); } catch { return false; }
}

export async function POST(request) {
  if (orderBackend() === 'none') return json({ error: 'Sipariş sistemi henüz yapılandırılmadı' }, 503);
  if (!sameOrigin(request)) return json({ error: 'İstek reddedildi' }, 403);
  const raw = await request.text();
  if (raw.length > 20_000) return json({ error: 'İstek çok büyük' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'Geçersiz JSON' }, 400); }

  const { order, error } = await buildOrder(body);
  if (error) return json({ error }, 400);

  try {
    const ip = hashIp(clientIp(request));
    if ((await store.countRecentByIp(ip)) >= LIMITS.perIpMax) return json({ error: 'Çok sık sipariş verdiniz. Lütfen birkaç dakika bekleyin veya garsonumuza haber verin.' }, 429, { 'retry-after': '60' });
    if ((await store.countOpenByTable(order.table_no)) >= LIMITS.perTableOpenMax) return json({ error: 'Bu masada çok fazla açık sipariş var. Lütfen garsonumuza haber verin.' }, 429);
    const saved = await store.insert({ ...order, ip_hash: ip });
    await broadcast(['kitchen']);
    return json({ ok: true, order: publicOrder(saved) }, 201);
  } catch (e) {
    return json({ error: 'Sipariş kaydedilemedi, lütfen tekrar deneyin', detail: String(e.message || e) }, e.status || 500);
  }
}

export async function GET(request) {
  const ids = (new URL(request.url).searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 10);
  if (!ids.length || !ids.every(isUuid)) return json({ error: 'Geçersiz sipariş numarası' }, 400);
  try {
    return json({ orders: (await store.get(ids)).map(publicOrder) });
  } catch (e) {
    return json({ error: 'Okunamadı' }, e.status || 500);
  }
}
