import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { AggregateStats } from '@/lib/types';

// Module-level cache (survives across requests within the same serverless instance).
// Only used for non-personalized responses (no gpa param) to avoid stale percentiles.
let cachedStats: AggregateStats | null = null;
let cacheTs = 0;
const CACHE_TTL = 60_000; // 60 s



const EMPTY: AggregateStats = {
    totalParticipants: 0,
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

    // Arbitrary GPA percentile queries permit reconstructing individual GPAs.
    if (personalized) return NextResponse.json({ error: '個別順位の公開は停止しています。' }, { status: 400 });

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

    const stats: AggregateStats = data?.totalParticipants >= 10 && data.stdDev > 0 ? {
        ...data, userPercentile: null,
        // Suppress all subgroup averages: complements can reveal suppressed students.
        facultyBreakdown: {}, facultyGpaBreakdown: {},
        hardCourses: (data.hardCourses ?? []).filter((c: { totalCount: number; failRate: number }) => c.totalCount >= 10 && c.failRate > 0 && c.failRate < 1),
    } : { ...EMPTY, userPercentile: null };

    if (!personalized) {
        cachedStats = stats;
        cacheTs = Date.now();
    }

    const cacheControl = personalized
        ? 'private, no-store'
        : 'public, s-maxage=60, stale-while-revalidate=300';

    return NextResponse.json(stats, { headers: { 'Cache-Control': cacheControl } });
}
