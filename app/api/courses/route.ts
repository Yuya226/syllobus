import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface GradeDist {
    S: number; A: number; B: number; C: number; F: number;
}

export interface CourseResult {
    id: number;
    code: string | null;
    name: string;
    category: string | null;
    credits: number | null;
    teacher: string | null;
    semester: string | null;
    source: string;
    year: number | null;
    gradeDist: GradeDist | null;
    totalCount: number | null;
}

const MIN_COUNT = 1;

/** grade_submissions 行から科目名ごとの成績分布を集計する */
function buildDistMap(
    rows: { subject_name: string | null; grade: string | null; session_id?: string }[]
): Map<string, GradeDist & { total: number }> {
    const seen = new Set<string>();
    const map = new Map<string, GradeDist & { total: number }>();
    for (const row of rows) {
        if (!row.subject_name || !row.grade) continue;
        if (!['S', 'A', 'B', 'C', 'F'].includes(row.grade)) continue;
        // session_id がある場合は (session_id, subject_name) で重複除去
        if (row.session_id) {
            const key = `${row.session_id}:${row.subject_name}`;
            if (seen.has(key)) continue;
            seen.add(key);
        }
        const entry = map.get(row.subject_name) ?? { S: 0, A: 0, B: 0, C: 0, F: 0, total: 0 };
        entry[row.grade as keyof GradeDist]++;
        entry.total++;
        map.set(row.subject_name, entry);
    }
    return map;
}

function toGradeDist(d: GradeDist & { total: number }): GradeDist {
    return {
        S: Math.round(d.S / d.total * 100) / 100,
        A: Math.round(d.A / d.total * 100) / 100,
        B: Math.round(d.B / d.total * 100) / 100,
        C: Math.round(d.C / d.total * 100) / 100,
        F: Math.round(d.F / d.total * 100) / 100,
    };
}

function attachDist(subjects: any[], distMap: Map<string, GradeDist & { total: number }>): CourseResult[] {
    return subjects.map(s => {
        const d = distMap.get(s.name);
        const hasData = d && d.total >= MIN_COUNT;
        return {
            ...s,
            gradeDist: hasData ? toGradeDist(d!) : null,
            totalCount: hasData ? d!.total : null,
        };
    });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);

    const supabase = getSupabaseAdmin();

    // ── デフォルト: q なし → 成績データがある科目を件数順に返す ──────────────
    if (!q) {
        const { data: gradeRows } = await supabase
            .from('grade_submissions')
            .select('subject_name, grade, session_id');

        const distMap = buildDistMap(gradeRows ?? []);
        if (distMap.size === 0) return NextResponse.json([]);

        // 件数順 top N の科目名を取得
        const topNames = [...distMap.entries()]
            .filter(([, d]) => d.total >= MIN_COUNT)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, limit)
            .map(([name]) => name);

        const { data: subjects } = await supabase
            .from('subjects')
            .select('id, code, name, category, credits, teacher, semester, source, year')
            .in('name', topNames)
            .order('year', { ascending: false, nullsFirst: false });

        return NextResponse.json(attachDist(subjects ?? [], distMap));
    }

    // ── 検索: 科目名 or コード前方一致 ────────────────────────────────────────
    const isCodeQuery = /^\d+$/.test(q);

    let query = supabase
        .from('subjects')
        .select('id, code, name, category, credits, teacher, semester, source, year');

    if (isCodeQuery) {
        query = query.ilike('code', `${q}%`).limit(limit);
    } else {
        query = query.ilike('name', `%${q}%`).limit(limit);
    }

    query = query
        .order('year', { ascending: false, nullsFirst: false })
        .order('code', { ascending: true, nullsFirst: false });

    const { data: subjects, error } = await query;

    if (error) {
        console.error('subjects search error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
    if (!subjects || subjects.length === 0) return NextResponse.json([]);

    const subjectNames = [...new Set(subjects.map(s => s.name))];
    const { data: gradeRows } = await supabase
        .from('grade_submissions')
        .select('subject_name, grade, session_id')
        .in('subject_name', subjectNames);

    const distMap = buildDistMap(gradeRows ?? []);
    return NextResponse.json(attachDist(subjects, distMap));
}
