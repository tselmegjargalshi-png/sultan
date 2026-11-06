// Local development server: serves the static site and runs /api/*.js handlers
// the same way Vercel does (Web Request/Response). Storage is emulated on disk.
//   ADMIN_PASSWORD=yourpass npm run dev   →  http://localhost:3000
import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.LOCAL_BLOB_DIR ||= path.join(root, '.local-blob');
process.env.ADMIN_PASSWORD ||= 'dev';
const PORT = Number(process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const mod = await import(pathToFileURL(path.join(root, 'api', path.basename(url.pathname) + '.js')).href);
      const handler = mod[req.method];
      if (!handler) { res.writeHead(405).end(); return; }
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
      const r = await handler(request);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let p = url.pathname;
    let file = p.startsWith('/local-blob/') ? path.join(process.env.LOCAL_BLOB_DIR, p.slice(12)) : path.join(root, p);
    if (!path.extname(file)) file = p === '/' ? path.join(root, 'index.html') : file + '.html';
    const data = await fs.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain' }).end(String(e.message));
  }
}).listen(PORT, () => console.log(`Sultan Sofrası dev → http://localhost:${PORT}`));
