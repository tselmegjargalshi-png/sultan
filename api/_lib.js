// Shared helpers for the Sultan Sofrası API (files starting with "_" are not routes on Vercel).
import { createHash, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const DEFAULT_MENU = require('../data/default-menu.json');

const MENU_PREFIX = 'data/menu-';
const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
// Local development only: emulate Blob storage on disk when LOCAL_BLOB_DIR is set.
const localDir = () => process.env.LOCAL_BLOB_DIR;

export function storageMode() {
  if (hasBlob()) return 'blob';
  if (localDir()) return 'local';
  return 'none';
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extraHeaders },
  });
}

const sha = (s) => createHash('sha256').update(String(s)).digest();

/** Returns null when authorized, otherwise an error Response. */
export function checkAuth(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return json({ error: 'ADMIN_PASSWORD орчны хувьсагч тохируулагдаагүй байна' }, 500);
  const given = request.headers.get('x-admin-password') || '';
  if (!given || !timingSafeEqual(sha(given), sha(expected))) {
    return json({ error: 'Нууц үг буруу байна' }, 401);
  }
  return null;
}

async function blob() {
  return import('@vercel/blob');
}

export async function readMenu() {
  const mode = storageMode();
  if (mode === 'blob') {
    const { list } = await blob();
    const { blobs } = await list({ prefix: MENU_PREFIX, limit: 100 });
    if (blobs.length) {
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const r = await fetch(blobs[0].url, { cache: 'no-store' });
      if (r.ok) return { menu: await r.json(), source: 'blob', updatedAt: blobs[0].uploadedAt };
    }
  } else if (mode === 'local') {
    try {
      const raw = await fs.readFile(path.join(localDir(), 'menu.json'), 'utf8');
      return { menu: JSON.parse(raw), source: 'local' };
    } catch { /* fall through to default */ }
  }
  return { menu: DEFAULT_MENU, source: 'default' };
}

export async function writeMenu(menu) {
  const mode = storageMode();
  const body = JSON.stringify(menu);
  if (mode === 'blob') {
    const { put, list, del } = await blob();
    // A new object per save avoids CDN caching of an overwritten URL; older versions are pruned (keep 5 as history).
    const saved = await put(`${MENU_PREFIX}${Date.now()}.json`, body, {
      access: 'public', contentType: 'application/json', addRandomSuffix: true,
    });
    const { blobs } = await list({ prefix: MENU_PREFIX, limit: 100 });
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const stale = blobs.slice(5).map((b) => b.url);
    if (stale.length) await del(stale);
    return { url: saved.url };
  }
  if (mode === 'local') {
    await fs.mkdir(localDir(), { recursive: true });
    await fs.writeFile(path.join(localDir(), 'menu.json'), body);
    return { url: 'local' };
  }
  throw Object.assign(new Error('Хадгалах сан (Vercel Blob) холбогдоогүй байна'), { status: 503 });
}

export async function saveImage(name, contentType, buffer) {
  const mode = storageMode();
  const safe = String(name || 'image').toLowerCase().replace(/[^a-z0-9.]+/g, '_').slice(0, 60);
  if (mode === 'blob') {
    const { put } = await blob();
    const r = await put(`images/${safe}`, buffer, { access: 'public', contentType, addRandomSuffix: true });
    return r.url;
  }
  if (mode === 'local') {
    const dir = path.join(localDir(), 'images');
    await fs.mkdir(dir, { recursive: true });
    const file = `${Date.now()}_${safe}`;
    await fs.writeFile(path.join(dir, file), buffer);
    return `/local-blob/images/${file}`;
  }
  throw Object.assign(new Error('Хадгалах сан (Vercel Blob) холбогдоогүй байна'), { status: 503 });
}

export async function deleteImage(url) {
  const mode = storageMode();
  if (mode === 'blob' && /\.blob\.vercel-storage\.com\//.test(url)) {
    const { del } = await blob();
    await del(url);
  } else if (mode === 'local' && url.startsWith('/local-blob/images/')) {
    await fs.rm(path.join(localDir(), 'images', path.basename(url)), { force: true });
  }
}

/** Light validation so a malformed save can never break the public menu. */
export function validateMenu(m) {
  if (!m || typeof m !== 'object') return 'Өгөгдөл буруу';
  if (!m.settings || typeof m.settings !== 'object') return 'settings байхгүй';
  if (!Array.isArray(m.categories) || !Array.isArray(m.items)) return 'categories эсвэл items байхгүй';
  for (const c of m.categories) if (!c.id || !c.name) return 'Ангилалд id болон нэр шаардлагатай';
  for (const it of m.items) {
    if (!it.id || !it.name) return 'Хоолонд id болон нэр шаардлагатай';
    if (typeof it.price !== 'number' || it.price < 0) return `${it.name}: үнэ буруу`;
  }
  if (JSON.stringify(m).length > 900_000) return 'Өгөгдөл хэт том байна';
  return null;
}
