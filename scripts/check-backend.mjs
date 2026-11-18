import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });

// Match the application normalization; never log credentials or retrieve grade rows.
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^"|"$/g, '');
if (!base || !key) {
    console.error('Supabase URL/service key is missing.');
    process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
console.log('Configured project:', new URL(base).hostname);
let failed = false;
for (const table of ['subjects', 'grade_submissions', 'credit_snapshots']) {
    try {
        const response = await fetch(`${base}/rest/v1/${table}?select=*&limit=0`, {
            method: 'HEAD', headers, signal: AbortSignal.timeout(10000),
        });
        console.log(`${table}: HTTP ${response.status}`);
        if (!response.ok) failed = true;
    } catch {
        console.log(`${table}: connection failed or timed out`);
        failed = true;
    }
}
try {
    const response = await fetch(`${base}/rest/v1/`, {
        headers: { ...headers, Accept: 'application/openapi+json' },
        signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
        const schema = await response.json();
        const paths = Object.keys(schema.paths ?? {}).filter(path => path !== '/');
        console.log('REST-exposed table/function paths:', paths.length);
        if (!paths.length) failed = true;
    } else {
        console.log(`Schema: HTTP ${response.status}`);
        failed = true;
    }
} catch {
    console.log('Schema: connection failed or timed out');
    failed = true;
}
if (failed) console.log('Check project identity, schema exposure, grants, and migrations in the Supabase dashboard. No database writes were performed.');
process.exitCode = failed ? 1 : 0;
