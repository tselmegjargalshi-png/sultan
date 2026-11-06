// Generates the two branded QR posters in assets/qr/ (SVG + PNG).
// Verify afterwards with a real decoder, e.g.: pip install zxing-cpp && python3 scripts/verify-qr.py
//   node scripts/make-qr.mjs [url]
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const QR = require('qrcode');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_ = process.argv[2] || 'https://sultansofrasi.vercel.app';
const out = path.join(root, 'assets', 'qr');
await fs.mkdir(out, { recursive: true });

const b64 = async (p) => (await fs.readFile(path.join(root, p))).toString('base64');
const EMBLEM = `data:image/png;base64,${await b64('assets/img/emblem.png')}`;
const LOGO = `data:image/png;base64,${await b64('assets/img/logo-900.png')}`;

const qr = QR.create(URL_, { errorCorrectionLevel: 'H' });
const N = qr.modules.size;
const dark = (x, y) => qr.modules.get(y, x) === 1 || qr.modules.get(y, x) === true;
const inFinder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
const inCenter = (x, y, k) => { const c = (N - 1) / 2, h = k / 2; return Math.abs(x - c) < h && Math.abs(y - c) < h; };
const finders = [[0, 0], [N - 7, 0], [0, N - 7]];

/* ---------- Design 1: "Saray Mührü" (palace seal) portrait poster ---------- */
function design1() {
  const W = 1080, H = 1350, S = 18, qs = N * S, ox = (W - qs) / 2, oy = 400;
  let mods = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!dark(x, y) || inFinder(x, y) || inCenter(x, y, 11)) continue;
    mods += `<circle cx="${ox + x * S + S / 2}" cy="${oy + y * S + S / 2}" r="${S * 0.46}"/>`;
  }
  const eye = ([fx, fy]) => {
    const X = ox + fx * S, Y = oy + fy * S;
    return `<rect x="${X + S / 2}" y="${Y + S / 2}" width="${S * 6}" height="${S * 6}" rx="${S * 2}" fill="none" stroke="url(#wine)" stroke-width="${S}"/>
      <rect x="${X + S * 2}" y="${Y + S * 2}" width="${S * 3}" height="${S * 3}" rx="${S * 0.9}" fill="url(#wine)"/>`;
  };
  const c = W / 2, cy = oy + qs / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="wine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E2330"/><stop offset="1" stop-color="#4A0911"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9CC86"/><stop offset=".5" stop-color="#B5862E"/><stop offset="1" stop-color="#D8AE5C"/></linearGradient>
    <pattern id="stars" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 6l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill="none" stroke="#D8AE5C" stroke-opacity=".22" stroke-width="1.2"/></pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#F6EEDF"/>
  <rect width="${W}" height="${H}" fill="url(#stars)"/>
  <path d="M90 ${H - 70} V420 C90 220 300 92 540 70 C780 92 990 220 990 420 V${H - 70} Z" fill="#FFFAF1" stroke="url(#gold)" stroke-width="5"/>
  <path d="M110 ${H - 90} V424 C110 236 312 114 540 92 C768 114 970 236 970 424 V${H - 90} Z" fill="none" stroke="#B5862E" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>
  <rect x="${c - 14}" y="56" width="28" height="28" transform="rotate(45 ${c} 70)" fill="url(#gold)" stroke="#F6EEDF" stroke-width="6"/>
  <image href="${LOGO}" x="${c - 190}" y="132" width="380" height="200"/>
  <g fill="url(#wine)">${mods}</g>
  ${finders.map(eye).join('')}
  <circle cx="${c}" cy="${cy}" r="${S * 5}" fill="#FFFAF1" stroke="url(#gold)" stroke-width="4"/>
  <image href="${EMBLEM}" x="${c - S * 3.6}" y="${cy - S * 2.3}" width="${S * 7.2}" height="${S * 4.4}"/>
  <g font-family="Cormorant Garamond, serif" text-anchor="middle">
    <text x="${c}" y="${oy + qs + 92}" font-size="56" font-weight="700" fill="#4A0911">Цэсээ уншуулаарай</text>
    <text x="${c}" y="${oy + qs + 140}" font-size="34" font-style="italic" fill="#B5862E">Menüyü okutun · Saray lezzeti, ev sıcaklığı</text>
  </g>
  <g font-family="Manrope, sans-serif" text-anchor="middle"><text x="${c}" y="${H - 116}" font-size="24" font-weight="700" letter-spacing="3" fill="#76604F">${URL_.replace(/^https?:\/\//, '').toUpperCase()}</text></g>
</svg>`;
}

/* ---------- Design 2: "Çini Karo" (Iznik tile) square ---------- */
function design2() {
  const W = 1080, H = 1080, S = 17, qs = N * S, pad = 3 * S, plate = qs + pad * 2, px = (W - plate) / 2, py = 190, ox = px + pad, oy = py + pad;
  let mods = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!dark(x, y) || inFinder(x, y) || inCenter(x, y, 9)) continue;
    const cx = ox + x * S + S / 2, cy = oy + y * S + S / 2, r = S * 0.62;
    mods += `<path d="M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z"/>`;
  }
  const eye = ([fx, fy]) => {
    const cx = ox + (fx + 3.5) * S, cy = oy + (fy + 3.5) * S;
    const X = ox + fx * S, Y = oy + fy * S;
    return `<rect x="${X + S / 2}" y="${Y + S / 2}" width="${S * 6}" height="${S * 6}" rx="${S * 1.1}" fill="none" stroke="#5E0C16" stroke-width="${S}"/>
      <rect x="${X + S * 2}" y="${Y + S * 2}" width="${S * 3}" height="${S * 3}" rx="${S * 0.5}" fill="#5E0C16"/>`;
  };
  const c = W / 2, cy = oy + qs / 2;
  // ring of eight point stars along the border
  let border = '';
  for (let i = 0; i < 12; i++) {
    const t = 70 + i * ((W - 140) / 11);
    for (const [x, y] of [[t, 70], [t, H - 70], [70, t], [W - 70, t]]) border += `<path transform="translate(${x} ${y})" d="M0 -16L5 -5L16 0L5 5L0 16L-5 5L-16 0L-5 -5Z"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#8E2330"/><stop offset=".55" stop-color="#6B0F1A"/><stop offset="1" stop-color="#2C060B"/></radialGradient>
    <linearGradient id="gold2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1DBA0"/><stop offset=".5" stop-color="#C99A43"/><stop offset="1" stop-color="#E5C077"/></linearGradient>
    <pattern id="tile" width="90" height="90" patternUnits="userSpaceOnUse"><g fill="none" stroke="#D8AE5C" stroke-opacity=".18" stroke-width="1.4"><path d="M45 6l11 28 28 11-28 11-11 28-11-28-28-11 28-11z"/><circle cx="45" cy="45" r="9"/></g></pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#tile)"/>
  <rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="40" fill="none" stroke="url(#gold2)" stroke-width="4"/>
  <g fill="url(#gold2)" opacity=".9">${border}</g>
  <g font-family="Forum, Cormorant Garamond, serif" text-anchor="middle" fill="url(#gold2)">
    <text x="${c}" y="140" font-size="50" letter-spacing="12">SULTAN SOFRASI</text>
  </g>
  <rect x="${px}" y="${py}" width="${plate}" height="${plate}" rx="44" fill="#FFF8EA" stroke="url(#gold2)" stroke-width="6"/>
  <g fill="#5E0C16">${mods}</g>
  ${finders.map(eye).join('')}
  <circle cx="${c}" cy="${cy}" r="${S * 4.2}" fill="#6B0F1A" stroke="url(#gold2)" stroke-width="5"/>
  <circle cx="${c}" cy="${cy}" r="${S * 3.5}" fill="#FFF8EA"/>
  <image href="${EMBLEM}" x="${c - S * 2.9}" y="${cy - S * 1.75}" width="${S * 5.8}" height="${S * 3.5}"/>
  <g text-anchor="middle">
    <text x="${c}" y="${py + plate + 74}" font-family="Cormorant Garamond, serif" font-size="46" font-style="italic" font-weight="600" fill="#FFF1D6">Ордны амт, гэрийн дулаан</text>
    <text x="${c}" y="${py + plate + 118}" font-family="Manrope, sans-serif" font-size="22" font-weight="700" letter-spacing="5" fill="#D8AE5C">QR MENÜ · ЦЭС УНШУУЛАХ</text>
  </g>
</svg>`;
}

const designs = { 'qr-saray-muhru': design1(), 'qr-cini-karo': design2() };
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (const [name, svg] of Object.entries(designs)) {
  await fs.writeFile(path.join(out, name + '.svg'), svg);
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500;1,600&family=Forum&family=Manrope:wght@700&display=swap" rel="stylesheet"><style>html,body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(out, name + '.png');
  await page.screenshot({ path: file, omitBackground: false });
  await page.close();
  console.log('wrote', path.relative(root, file));
}
await browser.close();
