import type { Grade } from './types';

/** Only remove identical OCR rows from overlapping screenshots. Conflicts need review. */
export function mergeImageGrades(batches: Grade[][]): Grade[] {
    const rows = new Map<string, Grade>();
    for (const grade of batches.flat()) {
        const key = JSON.stringify([
            grade.courseCode ?? null, grade.subject, grade.teacher,
            grade.year, grade.semester, grade.credits, grade.grade,
            grade.sourceRow ?? null, grade.category ?? null, grade.categoryDetail ?? null, grade.categorySource ?? null, grade.passed ?? null,
        ]);
        if (!rows.has(key)) rows.set(key, grade);
    }
    return [...rows.values()];
}
