import type { Faculty, Grade } from './types';
import type { FacultyDef, GradCategory } from './requirements';
import { universityCategory } from './university-category';

export interface FacultyReference {
    slug: string; departments: Record<string, number | null>; english: number; language2?: number; global?: number;
    liberal?: number; electiveLanguage?: number; note: string;
}
/** CELAS public tables checked 2026-11-18. These pages do NOT establish historical cohort applicability. */
export const FACULTY_CATALOG: Partial<Record<Faculty, FacultyReference>> = {
    '文学部': {slug:'letters',departments:{'人文学科':0},english:8,language2:4,global:8,liberal:6,electiveLanguage:4,note:'専修ごとの専門科目・卒業論文・外国語の内訳は学生便覧で確認。'},
    '人間科学部': {slug:'human-sci',departments:{'人間科学科':6},english:8,language2:4,global:4,liberal:6,electiveLanguage:3,note:'専門分野・実験実習・卒業研究と外国語の選択条件は別途確認。'},
    '法学部': {slug:'law',departments:{'法学科':0,'国際公共政策学科':0},english:8,language2:4,global:4,liberal:10,note:'両学科の専門科目・演習・履修上限は別途確認。'},
    '外国語学部': {slug:'foreign-s',departments:{'外国語学科（専攻別専門要件は未対応）':0},english:6,liberal:6,note:'専攻語ごとの専門要件・外国語の読替は自動判定しません。'},
    '理学部': {slug:'science',departments:{'数学科':25,'物理学科':25,'化学科':25,'生物科学科・生物科学コース':24,'生物科学科・生命理学コース':24},english:8,language2:3,global:2,liberal:6,note:'基盤教養の自然科学系は卒業要件外。物理学科の外国語要件は便覧との照合が必要。2024〜2026年度は別途、全学科の専門を含む大区分の最低単位を比較可能。'},
    '医学部': {slug:'medicine',departments:{'医学科':14},english:8,language2:3,global:6,note:'教養8単位の内訳に自然科学系4単位以上の指定。臨床実習・進級条件は未対応。'},
    '医学部（保健学科）': {slug:'medicine',departments:{'看護学専攻':13,'放射線技術科学専攻':16,'検査技術科学専攻':18},english:8,language2:3,global:4,note:'教養6単位の内訳に基盤教養4単位以上の指定。専攻別の実習・専門科目は未対応。'},
    '歯学部': {slug:'dentistry',departments:{'歯学科':20},english:8,language2:3,global:6,note:'教養10単位には人文・社会科学系から各2単位以上の指定。専門・臨床実習は未対応。'},
    '薬学部': {slug:'pharmacy',departments:{'薬学科':18},english:8,language2:3,global:6,note:'教養の合算区分・専門・実務実習は別途確認。旧薬科学科の適用要件は未確認。'},
    '工学部': {slug:'engineering',departments:{'応用自然科学科':24,'応用理工学科':26,'電子情報工学科':20,'環境・エネルギー工学科':26,'地球総合工学科':26},english:8,language2:3,global:4,note:'学科内のコースによって専門科目や振替条件が異なります。コース別の指定科目は別途確認。'},
    '基礎工学部': {slug:'engr-sci',departments:{'電子物理科学科':23,'化学応用科学科':20,'システム科学科':20,'情報科学科':18},english:8,language2:3,global:2,note:'高度教養は基礎工学部開講科目から2単位。共通教育の高度教養をそのまま卒業単位へ算入できません。コース別専門の最低数を別途比較できます。必修内訳は要確認。'},
};
export function commonReferenceDef(faculty: Faculty, department: string): FacultyDef | null {
    const r=FACULTY_CATALOG[faculty]; if(!r || !(department in r.departments)) return null;
    const make=(id:string,label:string,minCredits:number,group:'A'|'B'|'C'):GradCategory=>({id,label,minCredits,group,groupLabel:group==='A'?'教養':group==='B'?'国際性涵養':'専門基礎',manualCheck:true});
    const a=[make('gateway','学問への扉',2,'A'),make('info','情報教育',2,'A'),make('sports','健康・スポーツ教育',2,'A')];
    if(r.liberal) a.push(make('lib_base','基盤教養（系統条件は別途確認）',r.liberal,'A'));
    const b=[make('english','第1外国語',r.english,'B')];
    if(r.language2) b.push(make('lang2','第2外国語',r.language2,'B'));
    if(r.global) b.push(make('global','グローバル理解',r.global,'B'));
    if(r.electiveLanguage) b.push(make('sel_lang','選択外国語',r.electiveLanguage,'B'));
    const basic=r.departments[department];
    return {groups:[{id:'A',label:'教養',categories:a},{id:'B',label:'国際性涵養',categories:b},...(basic?[{id:'C' as const,label:'専門基礎',categories:[make('spec_basic_celas','専門基礎教育',basic,'C')]}]:[])],classifyFn:(g:Grade)=>universityCategory(g),disclaimer:r.note};
}
export const SCIENCE_2026_SOURCE='https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R8_ri_gakuseibinran_seikatu_kitei.pdf';
/** Official handbook pp.144,148; subtotals only, detailed prerequisites remain manual. */
export function science2026Totals(year:number,department:string) {
    return year===2026 && ['生物科学科・生物科学コース','生物科学科・生命理学コース'].includes(department)
        ? {liberal:14,basic:24,specialized:67,international:15,total:125} : null;
}
