import type { Grade } from './types';
import { FACULTY_OPTIONS } from './types';
import { validGrades } from './validate-grades';
import { validProfile } from './learning-profile';
/** Allowlist construction prevents accidental persistence of student identifiers or raw CSV. */
export function sanitizeCreditSnapshot(body: Record<string, unknown>) {
    if (!validGrades(body.grades) || !body.grades.every(g => ['university-csv', 'university-image'].includes(g.categorySource ?? '')) ||
        !FACULTY_OPTIONS.includes(body.faculty as never) || !validProfile(body.profile)) return null;
    const grades: Grade[] = [];
    for (const g of body.grades) {
        if (typeof g.passed !== 'boolean' || (g.grade === 'F') === g.passed ||
            (g.semester !== null && (typeof g.semester !== 'string' || g.semester.length > 30)) ||
            typeof g.category !== 'string' || !g.category || g.category.length > 200 ||
            typeof g.categoryDetail !== 'string' || !g.categoryDetail || g.categoryDetail.length > 200) return null;
        grades.push({subject:g.subject,teacher:'',year:g.year,semester:g.semester,credits:g.credits,grade:g.grade,
            category:g.category,categoryDetail:g.categoryDetail,categorySource:g.categorySource,passed:g.passed});
    }
    const p=body.profile;
    return {grades,faculty:body.faculty,profile:{department:p.department,admissionYear:p.admissionYear,yearLevels:p.yearLevels,
        completedYear:p.completedYear,completedTerm:p.completedTerm,complete:p.complete}};
}
