import type { Grade } from './types';
export function validGrades(value: unknown, allowUnknown = false): value is Grade[] {
    return Array.isArray(value) && value.length > 0 && value.length <= 500 && value.every(g =>
        g && typeof g.subject === 'string' && g.subject.trim().length > 0 && g.subject.length <= 200 &&
        typeof g.credits === 'number' && Number.isFinite(g.credits) && g.credits > 0 && g.credits <= 30 &&
        Number.isInteger(g.year) && g.year >= 1990 && g.year <= 2100 &&
        (['S', 'A', 'B', 'C', 'F', 'P'].includes(g.grade) || (allowUnknown && g.grade === null)) &&
        (g.courseCode == null || (typeof g.courseCode === 'string' && /^\d{6}$/.test(g.courseCode)))
    );
}
