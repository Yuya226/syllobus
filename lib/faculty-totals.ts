import type {Faculty, Grade} from './types';
import {universityCategory} from './university-category';

// These are minimum-credit comparisons, not a decision that graduation is possible.
// Bucket totals do not validate required courses, recognition, caps or substitutions.
type Bucket = 'liberal' | 'basic' | 'specialized' | 'international' | 'advancedLiberal' | 'advancedInternational';
export interface MinimumRow {label: string; buckets: Bucket[]; minimum: number}
export interface FacultyTotals {
    source: string;
    verifiedYears: number[];
    rows: MinimumRow[];
    total?: number;
    checks: string[];
}
const ruleURL=(id:string)=>`https://www.osaka-u.ac.jp/kitei/reiki_honbun/u035RG${id.padStart(8,'0')}.html`;
const labels:Record<Bucket,string>={liberal:'教養',basic:'専門基礎',specialized:'専門教育',international:'国際性涵養',advancedLiberal:'高度教養',advancedInternational:'高度国際性涵養'};
const row=(bucket:Bucket,minimum:number,includeAdvanced=false):MinimumRow=>({label:labels[bucket]+(includeAdvanced?'（高度科目を含む）':''),minimum,buckets:[bucket,...(includeAdvanced&&bucket==='liberal'?['advancedLiberal' as const]:includeAdvanced&&bucket==='international'?['advancedInternational' as const]:[])]});
const standard=(liberal:number,basic:number,specialized:number,international:number)=>[row('liberal',liberal,true),...(basic?[row('basic',basic)]:[]),row('specialized',specialized),row('international',international,true)];
export const SCIENCE_SOURCES:Record<number,string>={
    2024:'https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R6gakuseibinran.pdf',
    2025:'https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R7gakuseibinran.pdf',
    2026:'https://www.sci.osaka-u.ac.jp/ja/wp-content/uploads/2020/08/R8_ri_gakuseibinran_seikatu_kitei.pdf',
};
const science:Record<string,[number,number,number,number,number]>={
    '数学科':[25,62,15,2,124], '物理学科':[25,64,14,1,125], '化学科':[25,72,15,2,128],
    '生物科学科・生物科学コース':[24,67,15,2,125], '生物科学科・生命理学コース':[24,67,15,2,125],
};
const engineering:Record<string,[number,number,number,number]>={
    '応用自然科学科':[24,81,1,133], '応用理工学科':[26,81,2,136], '電子情報工学科':[20,89,1,137],
    '環境・エネルギー工学科':[26,83,2,138], '地球総合工学科':[26,80,2,135],
};
export const BASIC_ENGINEERING_COURSES:Record<string,Record<string,[number,number]>>={
    '電子物理科学科':{'エレクトロニクスコース':[23,81],'物性物理科学コース':[23,81]},
    '化学応用科学科':{'合成化学コース':[20,80],'化学工学コース':[20,80]},
    'システム科学科':{'機械科学コース':[20,78],'知能システム学コース':[20,78],'生物工学コース':[20,82]},
    '情報科学科':{'計算機科学コース':[18,84],'ソフトウェア科学コース':[18,84],'数理科学コース':[18,84]},
};
const commonChecks=['必修・選択必修の内訳、卒業研究・論文、進級・在学期間を公式便覧で確認してください。','他学部科目・認定単位・重複履修・超過単位の算入制限はこの比較に反映していません。'];
/** Only the science handbooks establish the listed admission-year applicability. */
export function facultyTotals(faculty:Faculty,department:string,year:number,course=''):FacultyTotals|null {
    let result:Omit<FacultyTotals,'verifiedYears'>|null=null;
    if(faculty==='理学部' && science[department]) {
        const [basic,specialized,intl,advIntl,total]=science[department];
        return {source:SCIENCE_SOURCES[year]??ruleURL('174'),verifiedYears:[2024,2025,2026],total,
            rows:[...standard(14,basic,specialized,intl),row('advancedLiberal',2),row('advancedInternational',advIntl)],
            checks:[...commonChecks,'高度科目の行は大区分の内数です。区分最低数の合計とは別に総単位の条件があります。','基盤教養の自然科学系など、卒業単位に含まれない科目を便覧と照合してください。']};
    }
    if(faculty==='工学部' && engineering[department]) {
        const [basic,specialized,advIntl,total]=engineering[department];
        result={source:ruleURL('221'),total,rows:[row('liberal',10),row('basic',basic),row('specialized',specialized),row('international',15),row('advancedLiberal',2),row('advancedInternational',advIntl)],checks:['高度科目は教養・国際性涵養の行とは別に集計します。コース別必修・選択科目と振替承認は手動確認が必要です。']};
    }
    if(faculty==='基礎工学部' && BASIC_ENGINEERING_COURSES[department]?.[course]) {
        const [basic,specialized]=BASIC_ENGINEERING_COURSES[department][course];
        result={source:ruleURL('230'),rows:[row('basic',basic),row('specialized',specialized)],checks:[`${course}の専門最低数です。必修・選択必修・選択群の内訳はコース別に確認してください。`,'高度教養の開講学部制限と高度国際性涵養の指定科目は未判定です。総単位の充足とは扱いません。']};
    }
    if(faculty==='文学部' && department==='人文学科') result={source:ruleURL('151'),rows:standard(14,0,78,28),checks:['専門78単位の内訳は必修30・選択38・卒業論文10。専修の指定科目と演習の単位条件を確認してください。','自由選択や超過単位の算入条件を自動判定していないため、総単位の比較は表示しません。']};
    if(faculty==='人間科学部' && department==='人間科学科') result={source:ruleURL('156'),total:128,rows:standard(14,6,62,21),checks:['通常課程の別表1の参考値です。Human Sciences Course（英語による課程）には適用しません。','専門基礎6＋専門教育62＝専門教育系68単位。学科目指定・卒業研究・口頭試問を確認してください。']};
    if(faculty==='法学部' && ['法学科','国際公共政策学科'].includes(department)) result={source:ruleURL('164'),total:132,rows:[{label:'全学共通教育（高度科目を除く）',buckets:['liberal','international','basic'],minimum:32},row('advancedLiberal',2),row('advancedInternational',2),row('specialized',80)],checks:['専門の必修内訳・演習条件は学科によって異なります。132単位への算入範囲を第24条と照合してください。']};
    if(faculty==='医学部' && department==='医学科') result={source:ruleURL('183'),total:213,rows:[{label:'教養・国際性涵養の合算',buckets:['liberal','international','advancedLiberal','advancedInternational'],minimum:33},row('basic',14),row('specialized',166)],checks:['専門の基礎医学74・臨床医学46・臨床実習44・専門英語2の内訳、Post-CC OSCE合格は別途確認が必要です。編入生への適用は未対応です。']};
    if(faculty==='医学部（保健学科）') {
        const min:Record<string,number>={'看護学専攻':90,'放射線技術科学専攻':87,'検査技術科学専攻':101};
        if(min[department]) result={source:ruleURL('183'),rows:[row('specialized',min[department])],checks:['看護・放射線は必修のみ、検査は必修99＋選択2の専門最低数です。実習・必修の科目別充足と総単位は未判定です。']};
    }
    if(faculty==='歯学部' && department==='歯学科') result={source:ruleURL('203'),total:223,rows:standard(18,20,168,17),checks:['臨床実習とPost-CC PX合格、教養の系統別内訳を別途確認してください。']};
    if(faculty==='薬学部' && department==='薬学科') result={source:ruleURL('213'),rows:standard(14,18,136,18),checks:['専門136単位は必修129・選択7。特別科目は卒業単位に含みません。履修コース別指定・実務実習・旧薬科学科は別途確認が必要です。']};
    return result?{...result,verifiedYears:[],checks:[...commonChecks,...result.checks]}:null;
}
const normalize=(s:string|null|undefined)=>(s??'').normalize('NFKC').replace(/\s/g,'');
/** Exact university categories only. Unknown or conflicting categories remain unassigned. */
export function creditBucket(g:Grade):Bucket|null {
    if(g.categorySource!=='university-csv') return null;
    const detail=normalize(g.categoryDetail),sub=normalize(g.category);
    if(/卒業要件外|教職|自由選択|特別科目/.test(detail+sub)) return null;
    const c=universityCategory(g);
    if(c==='adv_lib') return 'advancedLiberal';
    if(c==='adv_intl') return 'advancedInternational';
    if(c==='spec_basic_celas') return 'basic';
    if(c && ['gateway','info','sports','lib_base','adv_seminar'].includes(c)) return 'liberal';
    if(c && ['english','lang2','sel_lang','global'].includes(c)) return 'international';
    // Parent category alone cannot tell specialized education from basic education.
    if(['専門教育系科目(専門教育科目)','専門教育科目'].includes(detail)) return 'specialized';
    return null;
}
export function compareFacultyTotals(grades:Grade[],rule:FacultyTotals) {
    const credits:Record<Bucket,number>={liberal:0,basic:0,specialized:0,international:0,advancedLiberal:0,advancedInternational:0};
    let unassigned=0;
    for(const g of grades) {
        if(g.grade==='F'||g.passed===false||!Number.isFinite(g.credits)||g.credits<=0||(!g.grade&&g.passed!==true)) continue;
        const bucket=creditBucket(g);
        if(bucket) credits[bucket]+=g.credits; else unassigned++;
    }
    return {rows:rule.rows.map(r=>({...r,earned:r.buckets.reduce((sum,k)=>sum+credits[k],0)})),
        // Sum each bucket once; detail rows may overlap their parent rows.
        total:Object.values(credits).reduce((sum,c)=>sum+c,0),unassigned};
}
