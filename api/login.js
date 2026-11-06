import { checkAuth, json, storageMode } from './_lib.js';

export async function POST(request) {
  const denied = checkAuth(request);
  if (denied) return denied;
  return json({ ok: true, storage: storageMode() });
}
