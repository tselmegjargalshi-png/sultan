import { checkAuth, json, saveImage, deleteImage } from './_lib.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const MAX = 4 * 1024 * 1024; // Vercel function request bodies are limited to 4.5 MB

export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED.includes(type)) return json({ error: 'Зөвхөн зураг (JPG, PNG, WEBP, GIF, SVG) оруулна уу' }, 415);
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) return json({ error: 'Файл хоосон байна' }, 400);
  if (buf.length > MAX) return json({ error: 'Зураг 4 MB аас бага байх ёстой' }, 413);
  const name = new URL(request.url).searchParams.get('name') || 'image';
  try {
    const url = await saveImage(name, type, buf);
    return json({ ok: true, url });
  } catch (e) {
    return json({ error: e.message || 'Зураг хадгалж чадсангүй' }, e.status || 500);
  }
}

export async function DELETE(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  const url = new URL(request.url).searchParams.get('url');
  if (!url) return json({ error: 'url шаардлагатай' }, 400);
  try { await deleteImage(url); return json({ ok: true }); }
  catch (e) { return json({ error: e.message }, 500); }
}
