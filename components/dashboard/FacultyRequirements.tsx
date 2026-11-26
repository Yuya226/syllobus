'use client';
import {useState} from 'react';
import type {Faculty,Grade} from '@/lib/types';
import {FACULTY_CATALOG,commonReferenceDef} from '@/lib/faculty-catalog';
import {facultyTotals,compareFacultyTotals,BASIC_ENGINEERING_COURSES} from '@/lib/faculty-totals';
import {calcProgress} from '@/lib/requirements';
export interface GraduationSelection {year:string;department:string;course:string}
export default function FacultyRequirements({faculty,grades,selection}: {faculty:Faculty;grades:Grade[];selection?:GraduationSelection}) {
    const [localDepartment,setDepartment]=useState('');const [localYear,setYear]=useState('');const [localCourse,setCourse]=useState('');
    const {department,year,course}=selection??{department:localDepartment,year:localYear,course:localCourse};
    const r=FACULTY_CATALOG[faculty]; if(!r) return null;
    const def=commonReferenceDef(faculty,department); const progress=def?calcProgress(grades,def):null;
    const totals=facultyTotals(faculty,department,Number(year),course);
    const comparison=totals?compareFacultyTotals(grades,totals):null;
    const verified=totals?.verifiedYears.includes(Number(year))??false;
    return <section className="dashboard-panel text-sm space-y-5">
        <h3 className="font-bold">卒業要件の確認：{faculty}</h3>
        <p className="text-xs text-muted-foreground">{department || '設定から学科・専攻を選択してください'}{year && ` · ${year}年度入学`}</p>
        {!selection && <div className="flex flex-wrap gap-3"><label>学科・専攻 <select className="block max-w-full rounded border p-2" value={department} onChange={e=>{setDepartment(e.target.value);setCourse('');}}><option value="">選択してください</option>{Object.keys(r.departments).map(d=><option key={d}>{d}</option>)}</select></label>
        <label>入学年度 <input className="block w-28 rounded border p-2" type="number" min={1990} max={2100} value={year} onChange={e=>setYear(e.target.value)}/></label></div>}
        {!selection && faculty==='基礎工学部' && BASIC_ENGINEERING_COURSES[department] && <label className="block">履修コース <select className="block max-w-full rounded border p-2" value={course} onChange={e=>setCourse(e.target.value)}><option value="">選択してください</option>{Object.keys(BASIC_ENGINEERING_COURSES[department]).map(c=><option key={c}>{c}</option>)}</select></label>}
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">参考比較です。必修・算入条件を含む卒業可否は大学の便覧で確認してください。</p>
        <details className="text-muted-foreground"><summary className="cursor-pointer text-xs">適用年度・対象範囲と公式資料</summary><div className="mt-3 space-y-3 text-xs leading-relaxed">        <p className="rounded border border-amber-300 p-3">共通教育表は2026年11月に確認した現行公開資料です。{year?`${year}年度入学生への`:'入学年度別の'}適用・経過措置は未照合です。必要数を満たしていても「卒業要件充足」とは判定しません。</p>
        <p>{r.note}</p>
        <a className="underline" href={`https://www.celas.osaka-u.ac.jp/education/prerequisite/${r.slug}/`} target="_blank" rel="noopener noreferrer">大学公式・学部／学科別共通教育表</a>
</div></details>
        {progress && <div className="overflow-x-auto"><table className="dashboard-table"><thead><tr><th>区分</th><th>取込単位</th><th>公式公開表</th><th>確認状態</th></tr></thead><tbody>{progress.byCategory.map(p=><tr className="border-t" key={p.category.id}><td className="p-2">{p.category.label}</td><td>{p.earned}</td><td>{p.category.minCredits}</td><td>年度・内訳を要確認</td></tr>)}</tbody></table><p className="mt-2">表に割り当てられない科目：{progress.unclassified.length}件。専門科目や未対応の小区分を含みます。</p></div>}
        {totals && comparison && <div className="rounded border p-3 space-y-3">
            <h4 className="font-semibold">専門科目を含む単位数の比較</h4>
            <p>{verified?`${year}年度便覧で大区分の最低単位数を確認済みです。`:'現行規程の参考値です。選択した入学年度への適用は未確認です。'}</p>
            <p>「取込単位」はCSVの区分による集計です。算入制限・認定・必修の内訳を確認するまで、卒業要件の充足を示しません。</p>
            <div className="overflow-x-auto"><table className="dashboard-table"><thead><tr><th className="p-2">区分</th><th className="p-2">取込単位</th><th className="p-2">公式最低数</th></tr></thead><tbody>
                {comparison.rows.map((r,i)=><tr key={i} className="border-t"><td className="p-2">{r.label}</td><td className="p-2">{r.earned}</td><td className="p-2">{r.minimum}</td></tr>)}
                {totals.total!==undefined && <tr className="border-t font-semibold"><td className="p-2">総単位（内数の二重加算なし）</td><td className="p-2">{comparison.total}</td><td className="p-2">{totals.total}</td></tr>}
            </tbody></table></div>
            <p>この比較に割り当てていない修得科目：{comparison.unassigned}件。未対応の区分・対象外科目を含みます。</p>
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">算入条件・手動確認が必要な項目</summary><ul className="mt-3 list-disc pl-5 space-y-2">{totals.checks.map(c=><li key={c}>{c}</li>)}</ul></details>
            <a href={totals.source} className="underline" target="_blank" rel="noopener noreferrer">{verified?`${year}年度学生便覧`:'大学公式・学部規程'}で最終確認</a>
        </div>}
        <details><summary>全学部の調査・対応状況</summary><ul className="mt-2 space-y-2"><li>経済学部：2019〜2024／2025以降、専門・自由選択を含む参考計算。</li>{Object.entries(FACULTY_CATALOG).map(([f,c])=><li key={f}>{f}：現行共通教育表を確認、専門の最低単位は学科ごとに部分対応、必修内訳・年度別適用は要確認。<a className="underline" href={`https://www.celas.osaka-u.ac.jp/education/prerequisite/${c.slug}/`}>公式資料</a></li>)}</ul></details>
    </section>;
}
