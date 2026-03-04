import { getSupabaseAdmin } from './supabase';
import type { Grade } from './types';

export interface Subject {
    id: number;
    code: string | null;
    name: string;
    category: string | null;
    credits: number | null;
    teacher: string | null;
    semester: string | null;
    source: string;
    year: number | null; // 年度（同一コードが年度ごとに別科目に使われるため必要）
}

/** 6桁数字のみ有効なコードとみなす */
function isValidCode(code: string | null | undefined): code is string {
    return typeof code === 'string' && /^\d{6}$/.test(code.trim());
}

/** Map のキー: (code, year) の複合キー */
function makeKey(code: string, year: number | null | undefined): string {
    return `${code}-${year ?? 'null'}`;
}

/**
 * OCR で取得した grades を subjects テーブルと照合・補完する。
 *
 * - (code, year) の複合キーでルックアップ
 *   → 完全一致を優先し、なければ year=null のレコード（旧データ）にフォールバック
 * - DB にない (code, year) → OCR データを INSERT（source='ocr'）
 * - DB にある (code, year) → name / credits / category を DB 値で上書き
 */
export async function validateAndEnrichGrades(grades: Grade[]): Promise<Grade[]> {
    const supabase = getSupabaseAdmin();

    // 1. 有効なコードを収集
    const validCodes = [
        ...new Set(grades.map(g => g.courseCode).filter(isValidCode)),
    ];

    // 2. コードで一括 SELECT し、メモリ上で (code, year) を照合
    const subjectMap = new Map<string, Subject>();
    if (validCodes.length > 0) {
        const { data } = await supabase
            .from('subjects')
            .select('id, code, name, category, credits, teacher, semester, source, year')
            .in('code', validCodes);

        for (const row of data ?? []) {
            if (!isValidCode(row.code)) continue;
            subjectMap.set(makeKey(row.code, row.year), row as Subject);
        }
    }

    /**
     * (code, year) 完全一致 → year=null のフォールバック の順で検索。
     * 既存データ（year未登録）は year=null として保存されているため
     * フォールバックで category だけは取得できる。
     */
    function findSubject(grade: Grade): Subject | undefined {
        if (!isValidCode(grade.courseCode)) return undefined;
        const code = grade.courseCode!;
        return (
            subjectMap.get(makeKey(code, grade.year)) ??
            subjectMap.get(makeKey(code, null))
        );
    }

    // 3. DB にない (code, year) を収集して一括 INSERT（source='ocr'）
    const newRows: Omit<Subject, 'id'>[] = [];
    const seen = new Set<string>();

    for (const grade of grades) {
        if (!isValidCode(grade.courseCode)) continue;
        const key = makeKey(grade.courseCode!, grade.year);
        if (findSubject(grade) || seen.has(key)) continue;
        seen.add(key);
        newRows.push({
            code:     grade.courseCode!,
            name:     grade.subject,
            category: null,
            credits:  grade.credits,
            teacher:  grade.teacher !== 'Unknown' ? grade.teacher : null,
            semester: grade.semester || null,
            source:   'ocr',
            year:     grade.year,
        });
    }

    if (newRows.length > 0) {
        await supabase
            .from('subjects')
            .upsert(newRows, { onConflict: 'code,year', ignoreDuplicates: true });
    }

    // デバッグ: OCR解析科目 ↔ DB照合結果を出力
    console.log('\n=== 科目照合結果 ===');
    for (const grade of grades) {
        const matched = findSubject(grade);
        console.log({
            ocr_name:    grade.subject,
            ocr_code:    grade.courseCode ?? null,
            ocr_year:    grade.year,
            db_name:     matched?.name     ?? null,
            db_category: matched?.category ?? null,
            db_credits:  matched?.credits  ?? null,
            db_year:     matched?.year     ?? null,
        });
    }
    console.log('===================\n');

    // 4. grades の name / credits / category を DB 値で正規化
    return grades.map(grade => {
        const subject = findSubject(grade);
        if (!subject) return grade;
        return {
            ...grade,
            subject:  subject.name,
            credits:  subject.credits  ?? grade.credits,
            category: subject.category ?? grade.category ?? null,
        };
    });
}
