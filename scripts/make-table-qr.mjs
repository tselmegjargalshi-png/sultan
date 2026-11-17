// Generates one QR per table: <base>/?table=N  →  assets/qr/tables/masa-N.svg + .png
//   node scripts/make-table-qr.mjs [baseUrl] [tableCount]
// Verify with: python3 scripts/verify-qr.py tables
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const QR = require('qrcode');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] || 'https://sultansofrasi.vercel.app').replace(/\/$/, '');
const COUNT = Number(process.argv[3] || 30);
const out = path.join(root, 'assets', 'qr', 'tables');
await fs.mkdir(out, { recursive: true });
const EMBLEM = `data:image/png;base64,${(await fs.readFile(path.join(root, 'assets/img/emblem.png'))).toString('base64')}`;

function svgFor(n) {
  const url = `${BASE}/?table=${n}`;
  const qr = QR.create(url, { errorCorrectionLevel: 'H' });
  const N = qr.modules.size, S = 16, pad = 3 * S, qs = N * S, W = qs + pad * 2, H = W + 210;
  const dark = (x, y) => !!qr.modules.get(y, x);
  const inEye = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
  const c = (N - 1) / 2;
  let mods = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!dark(x, y) || inEye(x, y) || (Math.abs(x - c) < 5.5 && Math.abs(y - c) < 5.5)) continue;
    mods += `<circle cx="${pad + x * S + S / 2}" cy="${pad + y * S + S / 2}" r="${S * 0.47}"/>`;
  }
  const eye = ([fx, fy]) => `<rect x="${pad + fx * S + S / 2}" y="${pad + fy * S + S / 2}" width="${S * 6}" height="${S * 6}" rx="${S * 1.6}" fill="none" stroke="#5E0C16" stroke-width="${S}"/><rect x="${pad + fx * S + S * 2}" y="${pad + fy * S + S * 2}" width="${S * 3}" height="${S * 3}" rx="${S * .8}" fill="#5E0C16"/>`;
  const mid = W / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" rx="40" fill="#FFF8EA"/><rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="32" fill="none" stroke="#B5862E" stroke-width="4"/>
<g fill="#5E0C16">${mods}</g>${[[0, 0], [N - 7, 0], [0, N - 7]].map(eye).join('')}
<circle cx="${mid}" cy="${pad + qs / 2}" r="${S * 4.6}" fill="#FFF8EA" stroke="#B5862E" stroke-width="4"/>
<image href="${EMBLEM}" x="${mid - S * 3.2}" y="${pad + qs / 2 - S * 1.95}" width="${S * 6.4}" height="${S * 3.9}"/>
<text x="${mid}" y="${W + 78}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="72" font-weight="700" fill="#4A0911">MASA ${n}</text>
<text x="${mid}" y="${W + 130}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="30" fill="#B5862E">Okutun, sipariş verin</text>
<text x="${mid}" y="${W + 176}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="3" fill="#76604F">SULTAN SOFRASI</text>
</svg>`;
}

const { chromium } = require('playwright');
const browser = await chromium.launch();
for (let n = 1; n <= COUNT; n++) {
  const svg = svgFor(n);
  await fs.writeFile(path.join(out, `masa-${n}.svg`), svg);
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:#fff}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: path.join(out, `masa-${n}.png`) });
  await page.close();
}
await browser.close();
console.log(`wrote ${COUNT} table QR codes to assets/qr/tables (base ${BASE})`);
