import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ownsSession, sameOrigin } from '@/lib/session-auth';
import { validGrades } from '@/lib/validate-grades';
import { FACULTY_OPTIONS } from '@/lib/types';
import { calculateGPA } from '@/lib/gpa';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => null);
    if (!ownsSession(req, body?.session_id)) return NextResponse.json({ error: '保存権限を確認できません。ページを再読み込みしてください。' }, { status: 403 });
    if (!validGrades(body.grades) || !['', ...FACULTY_OPTIONS].includes(body.faculty) || body.consent !== true) {
        return NextResponse.json({ error: '成績と保存への同意を確認してください。' }, { status: 400 });
    }
    const limited = await checkRateLimit(req);
    if (limited) return limited;
    try {
        const gpa = calculateGPA(body.grades).cumulative;
        const rows = body.grades.map((g: import('@/lib/types').Grade) => ({
            session_id: body.session_id, faculty: body.faculty, subject_name: g.subject,
            course_code: g.courseCode ?? null, grade: g.grade, credits: g.credits,
            year: g.year, session_gpa: gpa, parser_version: Number(process.env.PARSER_VERSION ?? 1),
        }));
        const { error } = await getSupabaseAdmin().rpc('replace_session_grades', { target_session: body.session_id, new_rows: rows });
        if (error) throw new Error('DB write failed');
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: '保存できませんでした。成績はこのブラウザに残っています。再試行してください。' }, { status: 503 });
    }
}
export async function DELETE(req: NextRequest) {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const id = req.nextUrl.searchParams.get('session_id');
    if (!ownsSession(req, id)) return NextResponse.json({ error: '削除権限を確認できません。' }, { status: 403 });
    try {
        const { error } = await getSupabaseAdmin().from('grade_submissions').delete().eq('session_id', id);
        if (error) throw new Error('DB delete failed');
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'サーバーから削除できませんでした。時間をおいて再試行してください。' }, { status: 503 });
    }
}
