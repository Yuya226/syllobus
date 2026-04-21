import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Grade } from '@/lib/types';

export async function GET(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ stale: false, hasSubmission: false });

    const currentVersion = parseInt(process.env.PARSER_VERSION ?? '1');
    const supabase = getSupabaseAdmin();

    const { data } = await supabase
        .from('grade_submissions')
        .select('parser_version, faculty, subject_name, course_code, grade, credits, year')
        .eq('session_id', sessionId);

    if (!data || data.length === 0) return NextResponse.json({ stale: false, hasSubmission: false });

    const sessionVersion = data[0].parser_version ?? 0;
    const stale = sessionVersion < currentVersion;

    const grades: Grade[] = data.map(row => ({
        subject: row.subject_name as string,
        teacher: '',
        semester: null,
        credits: row.credits as number,
        grade: row.grade as Grade['grade'],
        year: row.year as number,
        courseCode: (row.course_code as string | null) ?? undefined,
    }));

    const faculty = (data[0].faculty as string | null) ?? null;

    return NextResponse.json({ stale, hasSubmission: true, grades, faculty });
}
