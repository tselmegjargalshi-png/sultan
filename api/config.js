import { json } from './_lib.js';
import { tableCount, orderBackend } from './_orders.js';

// Public, non-secret client configuration. The Supabase anon key is only used for Realtime "ping" broadcasts;
// the orders table has RLS enabled with no policies, so the key cannot read or write any data.
export async function GET() {
  return json({
    ordering: orderBackend() !== 'none',
    tables: tableCount(),
    realtime: process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY } : null,
  }, 200, { 'cache-control': 'public, max-age=60' });
}
