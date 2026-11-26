import { FACULTY_CATALOG } from './faculty-catalog';
import type { Faculty } from './types';

/** Existing verified labels only; never publish free-form profile text in aggregates. */
export function departmentOptions(faculty: Faculty | ''): string[] {
    if (faculty === '経済学部') return ['経済・経営学科'];
    return faculty ? Object.keys(FACULTY_CATALOG[faculty]?.departments ?? {}) : [];
}
export function canonicalDepartment(faculty: Faculty | '', value: string): string | null {
    const normalized = value.normalize('NFKC').trim();
    return departmentOptions(faculty).find(d => d.normalize('NFKC') === normalized) ?? null;
}
