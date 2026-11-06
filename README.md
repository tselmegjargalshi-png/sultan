# Sultan Sofrası · Türk Restoranı · Digital Menu

Live: **https://sultansofrasi.vercel.app** · Admin: **/admin** · QR codes: **/qr**

A mobile first digital menu for a Turkish restaurant. UI in Mongolian, dish names, categories and prices (₺) in Turkish. Every dish shows calories and allergen badges (14 EU allergens), plus signature, spicy and vegetarian tags. No build step: static HTML/CSS/JS plus three Vercel Functions.

## Structure

| Path | Purpose |
| --- | --- |
| `index.html`, `assets/js/app.js`, `assets/css/style.css` | Public menu: category tabs with scrollspy, search, allergen/vegetarian/kcal filters, live "open now" status (Europe/Istanbul), allergen legend, contact, meal cards |
| `admin.html`, `assets/js/admin.js`, `assets/css/admin.css` | Password protected dashboard: dishes, categories, images (logo, banner, gallery, optional per dish photo), restaurant info, hours, JSON backup/restore |
| `assets/js/icons.js` | Hand drawn SVG allergen and UI icons shared by both pages |
| `api/menu.js` | `GET` menu JSON, `POST` save (auth) |
| `api/upload.js` | `POST` image upload, `DELETE` image (auth) |
| `api/login.js` | `POST` password check |
| `data/default-menu.json` | Seed menu, used until the first save |
| `assets/qr/` | Two branded QR codes (PNG for print, SVG for scaling) |
| `scripts/make-qr.mjs`, `scripts/verify-qr.py` | Regenerate and decode check the QR codes |

## Storage and auth

* Data and images are stored in **Vercel Blob** (store `sultan-menu-blob`, connected to the project, which provides `BLOB_READ_WRITE_TOKEN`). Each save writes a new JSON object and keeps the last 5 versions, so CDN caching never serves a stale menu.
* If no Blob token exists, the public menu falls back to `data/default-menu.json`, and the admin keeps unsaved edits as a draft in the browser's localStorage but cannot publish them.
* The admin password comes from the `ADMIN_PASSWORD` environment variable (set in Vercel project settings). It is sent as a header over HTTPS and compared with a constant time check. There is no rate limiting or multi user account system; change the password in Vercel and redeploy if it leaks.
* Images are resized in the browser (max 1600 to 2000 px, WebP) before upload because Vercel Functions accept request bodies up to 4.5 MB.

## Local development

```bash
npm install
ADMIN_PASSWORD=dev npm run dev     # http://localhost:3000, storage emulated in .local-blob/
```

## QR codes

```bash
node scripts/make-qr.mjs https://sultansofrasi.vercel.app
pip install zxing-cpp pillow && python3 scripts/verify-qr.py
```

Both codes use error correction level H, so the centre emblem does not affect scanning. They were decoded successfully with ZXing at 100%, 50%, 25% and 15% size.
