import { readMenu, writeMenu, checkAuth, validateMenu, json, storageMode } from './_lib.js';

export async function GET() {
  try {
    const { menu, source, updatedAt } = await readMenu();
    return json({ ...menu, _meta: { source, updatedAt: updatedAt || null, storage: storageMode() } });
  } catch (e) {
    return json({ error: 'Меню уншихад алдаа гарлаа', detail: String(e.message || e) }, 500);
  }
}

export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  let menu;
  try { menu = await request.json(); } catch { return json({ error: 'JSON буруу байна' }, 400); }
  delete menu._meta;
  const problem = validateMenu(menu);
  if (problem) return json({ error: problem }, 400);
  menu.version = (Number(menu.version) || 0) + 1;
  menu.savedAt = new Date().toISOString();
  try {
    await writeMenu(menu);
    return json({ ok: true, version: menu.version, savedAt: menu.savedAt });
  } catch (e) {
    return json({ error: e.message || 'Хадгалж чадсангүй' }, e.status || 500);
  }
}
