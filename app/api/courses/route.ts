import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface CourseResult {
    id: number;
    code: string | null;
    name: string;
    category: string | null;
    credits: number | null;
    teacher: string | null;
    semester: string | null;
    source: string;
    failRate: number | null;
    totalCount: number | null;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);

    if (!q) return NextResponse.json([]);

    const supabase = getSupabaseAdmin();

    // コード検索（6桁数字）か名前検索かを判定
    const isCodeQuery = /^\d{6}$/.test(q);

    let query = supabase
        .from('subjects')
        .select('id, code, name, category, credits, teacher, semester, source');

    if (isCodeQuery) {
        query = query.eq('code', q);
    } else {
        query = query.ilike('name', `%${q}%`).limit(limit);
    }

    // コード順にソート（NULLは末尾）
    query = query.order('code', { ascending: true, nullsFirst: false });

    const { data: subjects, error: subjectError } = await query;

    if (subjectError) {
        console.error('subjects search error:', subjectError);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    if (!subjects || subjects.length === 0) return NextResponse.json([]);

    // ヒット科目の不可率を grade_submissions から一括集計
    const subjectNames = [...new Set(subjects.map(s => s.name))];

    const { data: gradeRows } = await supabase
        .from('grade_submissions')
        .select('subject_name, grade')
        .in('subject_name', subjectNames);

    const failMap = new Map<string, { total: number; fails: number }>();
    for (const row of gradeRows ?? []) {
        if (!row.subject_name) continue;
        const entry = failMap.get(row.subject_name) ?? { total: 0, fails: 0 };
        entry.total++;
        if (row.grade === 'F') entry.fails++;
        failMap.set(row.subject_name, entry);
    }

    const MIN_COUNT = 3;
    const results: CourseResult[] = subjects.map(s => {
        const stats = failMap.get(s.name);
        const hasRate = stats && stats.total >= MIN_COUNT;
        return {
            ...s,
            failRate: hasRate ? Math.round((stats!.fails / stats!.total) * 100) / 100 : null,
            totalCount: hasRate ? stats!.total : null,
        };
    });

    return NextResponse.json(results);
}
