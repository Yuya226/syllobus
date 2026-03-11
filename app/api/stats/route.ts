import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { AggregateStats } from '@/lib/types';

// Module-level cache (survives across requests within the same serverless instance).
// Only used for non-personalized responses (no gpa param) to avoid stale percentiles.
let cachedStats: AggregateStats | null = null;
let cacheTs = 0;
const CACHE_TTL = 60_000; // 60 s

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY: AggregateStats = {
    totalParticipants: 0,
    collectionRate: 0,
    averageGpa: 0,
    stdDev: 0,
    userPercentile: 50,
    facultyBreakdown: {},
    facultyGpaBreakdown: {},
    hardCourses: [],
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userGpa = parseFloat(searchParams.get('gpa') ?? 'NaN');
    const personalized = !isNaN(userGpa);

    // パーソナライズ（gpa あり）のみ session_id 認証を要求する。
    // 非パーソナライズ（参加者数・学部別GPAなど）は未アップロードユーザーにも公開する。
    if (personalized) {
        const sessionId = searchParams.get('session_id');
        if (!sessionId || !UUID_RE.test(sessionId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { count, error: authError } = await getSupabaseAdmin()
            .from('grade_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        if (authError) {
            console.error('Supabase auth check error:', authError);
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }
        if (!count || count === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Return cached result for non-personalized requests when cache is warm.
    if (!personalized && cachedStats && Date.now() - cacheTs < CACHE_TTL) {
        return NextResponse.json(cachedStats, {
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        });
    }

    const { data, error } = await getSupabaseAdmin().rpc('get_aggregate_stats', {
        user_gpa: personalized ? userGpa : null,
    });

    if (error) {
        console.error('Supabase stats RPC error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    const stats: AggregateStats = data?.totalParticipants ? data : EMPTY;

    if (!personalized) {
        cachedStats = stats;
        cacheTs = Date.now();
    }

    const cacheControl = personalized
        ? 'private, no-store'
        : 'public, s-maxage=60, stale-while-revalidate=300';

    return NextResponse.json(stats, { headers: { 'Cache-Control': cacheControl } });
}
