import type { Grade, Faculty } from './types';
import { termIndex, type LearningProfile } from './learning-profile';
export const MIN_PEERS = 20;
export const MIN_CELL = 5;
export interface CreditSnapshot { session_id: string; faculty: Faculty; grades: Grade[]; profile: LearningProfile }
export interface CourseDistribution { subject: string; faculty: string; year: number; semester: string; count: number; distribution: Record<string, number> }
export interface PaceGroup { faculty: string; yearLevel: number; year: number; semester: string; count: number; averageCredits: number }
export interface CohortPaceGroup { faculty: string; admissionYear: number; year: number; semester: string; count: number; averageCredits: number }
export interface TrendGroup { faculty: string; yearLevel: number; semester: string; category: string; subject: string | null; count: number; averageCredits: number }
export interface LearningStats { courses: CourseDistribution[]; pace: PaceGroup[]; cohorts: CohortPaceGroup[]; trends: TrendGroup[] }
export const normalizeSubject = (v: string) => v.normalize('NFKC').trim().replace(/\s+/g, ' ');
const key = (...parts: unknown[]) => JSON.stringify(parts);
const mean = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
/** Fixed disjoint course cohorts. One vote per session; ambiguous repeated courses are excluded. */
export function aggregateLearning(snapshots: CreditSnapshot[]): LearningStats {
    const courses = new Map<string, { info: Omit<CourseDistribution, 'count' | 'distribution'>; values: Map<string, string> }>();
    const pace = new Map<string, { info: Omit<PaceGroup, 'count' | 'averageCredits'>; values: number[] }>();
    const cohorts = new Map<string, { info: Omit<CohortPaceGroup, 'count' | 'averageCredits'>; values: number[] }>();
    const trends = new Map<string, { info: Omit<TrendGroup, 'count' | 'averageCredits'>; values: number[] }>();
    const seen = new Set<string>();
    for (const s of snapshots) {
        if (seen.has(s.session_id)) continue; seen.add(s.session_id);
        const eligible = s.grades.filter(g => g.categorySource === 'university-csv' && g.passed === true);
        const perCourse = new Map<string, Grade[]>();
        for (const g of eligible) {
            if (!g.semester || termIndex(g.year, g.semester) === null || !g.grade || !['S','A','B','C'].includes(g.grade)) continue;
            const k = key(s.faculty, normalizeSubject(g.subject), g.year, g.semester);
            perCourse.set(k, [...(perCourse.get(k) ?? []), g]);
        }
        for (const [k, gs] of perCourse) {
            if (gs.length !== 1) continue;
            const g = gs[0];
            const group = courses.get(k) ?? { info: { faculty: s.faculty, subject: normalizeSubject(g.subject), year: g.year, semester: g.semester! }, values: new Map<string,string>() };
            group.values.set(s.session_id, g.grade!); courses.set(k, group);
        }
        const p = s.profile;
        const cutoff = p.completedYear && p.complete ? termIndex(p.completedYear, p.completedTerm) : null;
        if (cutoff === null || !p.completedYear || !p.yearLevels[p.completedYear]) continue;
        // Unknown semesters or records later than the attested cutoff make pace incomparable.
        if (eligible.some(g => termIndex(g.year, g.semester) === null || termIndex(g.year, g.semester)! > cutoff)) continue;
        if (p.admissionYear && p.admissionYear <= p.completedYear) {
            const ck = key(s.faculty, p.admissionYear, p.completedYear, p.completedTerm);
            const cohort = cohorts.get(ck) ?? { info: { faculty: s.faculty, admissionYear: p.admissionYear, year: p.completedYear, semester: p.completedTerm }, values: [] };
            cohort.values.push(eligible.reduce((n,g)=>n+g.credits,0)); cohorts.set(ck,cohort);
        }
        const k = key(s.faculty, p.yearLevels[p.completedYear], p.completedYear, p.completedTerm);
        const group = pace.get(k) ?? { info: { faculty: s.faculty, yearLevel: p.yearLevels[p.completedYear], year: p.completedYear, semester: p.completedTerm }, values: [] };
        group.values.push(eligible.reduce((n,g)=>n+g.credits,0)); pace.set(k, group);
        const personal = new Map<string, { info: Omit<TrendGroup,'count'|'averageCredits'>; credits: number }>();
        for (const g of eligible) {
            const level = p.yearLevels[g.year]; if (!level || !g.category || !g.semester) continue;
            for (const subject of [null, normalizeSubject(g.subject)]) {
                const info = {faculty:s.faculty, yearLevel:level, semester:g.semester, category:g.category, subject};
                const tk = key(...Object.values(info)); const t = personal.get(tk) ?? {info,credits:0};
                t.credits += g.credits; personal.set(tk,t);
            }
        }
        for (const [tk,t] of personal) {
            const group=trends.get(tk) ?? {info:t.info,values:[]}; group.values.push(t.credits); trends.set(tk,group);
        }
    }
    return {
        courses: [...courses.values()].flatMap(({info,values}) => {
            const distribution: Record<string,number> = {S:0,A:0,B:0,C:0};
            for(const g of values.values()) distribution[g]++;
            const cells=Object.values(distribution).filter(n=>n>0);
            return values.size >= MIN_PEERS && cells.length >= 2 && cells.every(n=>n>=MIN_CELL) ? [{...info,count:values.size,distribution}] : [];
        }),
        cohorts: [...cohorts.values()].filter(g=>g.values.length>=MIN_PEERS && new Set(g.values).size>1).map(({info,values})=>({...info,count:values.length,averageCredits:mean(values)})),
        pace: [...pace.values()].filter(g=>g.values.length>=MIN_PEERS && new Set(g.values).size>1).map(({info,values})=>({...info,count:values.length,averageCredits:mean(values)})),
        trends: [...trends.values()].filter(g=>g.values.length>=MIN_PEERS).map(({info,values})=>({...info,count:values.length,averageCredits:mean(values)})),
    };
}
/** Tie interval, not a fabricated exact percentile. P/F and absent grades have no rank. */
export function relativeStanding(distribution: CourseDistribution, grade: Grade['grade']) {
    const order=['S','A','B','C']; const index=order.indexOf(grade ?? '');
    const same=distribution.distribution[grade ?? ''] ?? 0;
    if(index<0 || !same || distribution.count<MIN_PEERS) return null;
    const better=order.slice(0,index).reduce((n,g)=>n+distribution.distribution[g],0);
    return { fromRank:better+1, toRank:better+same, topFrom:Math.round((better+1)/distribution.count*1000)/10, topTo:Math.round((better+same)/distribution.count*1000)/10, tied:same };
}
