import { getD1Client } from './d1';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
    var _supabaseAdmin: SupabaseClient | undefined;
}

export function getSupabaseAdmin() {
    if (process.env.DATABASE_PROVIDER === "d1") return getD1Client();
    if (!globalThis._supabaseAdmin) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^"|"$/g, '') || undefined;
        if (!url || !key) {
            throw new Error('Supabase env vars not configured');
        }
        globalThis._supabaseAdmin = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: {
                // Next.js App Router はデフォルトで fetch をキャッシュするため
                // DB更新が即座に反映されるよう no-store を指定する
                fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
            },
        });
    }
    return globalThis._supabaseAdmin;
}
