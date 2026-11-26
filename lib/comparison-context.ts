import type { Grade } from './types';
import { termIndex, type LearningProfile } from './learning-profile';

/** Reuse explicit choices, otherwise the latest recorded term. Never infer year level or completeness. */
export function comparisonContext(grades: Grade[], profile: LearningProfile) {
    const latest = grades.filter(g => termIndex(g.year, g.semester) !== null)
        .reduce<Grade | null>((last, g) => !last || termIndex(g.year, g.semester)! > termIndex(last.year, last.semester)! ? g : last, null);
    const explicit = profile.completedYear !== null && termIndex(profile.completedYear, profile.completedTerm) !== null;
    const year = explicit ? profile.completedYear : latest?.year ?? null;
    const semester = explicit ? profile.completedTerm : latest?.semester ?? '';
    const cutoff = year ? termIndex(year, semester) : null;
    const earned = grades.filter(g => g.passed === true || (g.passed === undefined && g.grade && g.grade !== 'F'));
    const known = cutoff !== null && earned.every(g => termIndex(g.year, g.semester) !== null);
    const credits = earned.filter(g => cutoff !== null && termIndex(g.year, g.semester) !== null && termIndex(g.year, g.semester)! <= cutoff).reduce((n,g)=>n+g.credits,0);
    return { year, semester, credits, known, complete: explicit && profile.complete && known };
}
