export const TERMS = ['春学期', '夏学期', '秋学期', '冬学期'] as const;
export interface LearningProfile {
    department: string;
    admissionYear: number | null;
    /** Explicitly supplied year level for each academic year; never derived from student IDs. */
    yearLevels: Record<string, number>;
    completedYear: number | null;
    completedTerm: string;
    complete: boolean;
}
export const EMPTY_PROFILE: LearningProfile = { department: '', admissionYear: null, yearLevels: {}, completedYear: null, completedTerm: '', complete: false };
export function validProfile(p: unknown): p is LearningProfile {
    if (!p || typeof p !== 'object') return false;
    const v = p as LearningProfile;
    const year = (n: unknown) => n === null || (Number.isInteger(n) && Number(n) >= 1990 && Number(n) <= 2100);
    return typeof v.department === 'string' && v.department.length <= 100 && year(v.admissionYear) && year(v.completedYear) &&
        typeof v.complete === 'boolean' && ['', ...TERMS].includes(v.completedTerm) && !!v.yearLevels && typeof v.yearLevels === 'object' &&
        !Array.isArray(v.yearLevels) && Object.keys(v.yearLevels).length <= 20 &&
        Object.entries(v.yearLevels).every(([y, n]) => /^\d{4}$/.test(y) && year(Number(y)) && Number.isInteger(n) && n >= 1 && n <= 6) &&
        (!v.complete || (v.completedYear !== null && TERMS.includes(v.completedTerm as typeof TERMS[number]) && !!v.yearLevels[v.completedYear]));
}
export function termIndex(year: number, semester: string | null): number | null {
    const i = TERMS.indexOf(semester as typeof TERMS[number]);
    return i < 0 ? null : year * 4 + i;
}
