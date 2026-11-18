'use client';
import {useState} from 'react';
import type {Faculty,Grade} from '@/lib/types';
import {FACULTY_CATALOG,commonReferenceDef,science2026Totals,SCIENCE_2026_SOURCE} from '@/lib/faculty-catalog';
import {calcProgress} from '@/lib/requirements';
export default function FacultyRequirements({faculty,grades}: {faculty:Faculty;grades:Grade[]}) {
    const [department,setDepartment]=useState('');const [year,setYear]=useState('');
    const r=FACULTY_CATALOG[faculty]; if(!r) return null;
    const def=commonReferenceDef(faculty,department); const progress=def?calcProgress(grades,def):null;
    const totals=faculty==='理学部'?science2026Totals(Number(year),department):null;
    return <section className="rounded border bg-card p-4 text-sm space-y-3">
        <h3 className="font-bold">卒業要件の確認：{faculty}</h3>
        <p>大学の公開表と取込区分を並べて確認できます。現在の対応範囲は共通教育・一部専門基礎です。専門科目を含む卒業可否の全条件には未対応です。</p>
        <div className="flex flex-wrap gap-3"><label>学科・専攻 <select className="block max-w-full rounded border p-2" value={department} onChange={e=>setDepartment(e.target.value)}><option value="">選択してください</option>{Object.keys(r.departments).map(d=><option key={d}>{d}</option>)}</select></label>
        <label>入学年度 <input className="block w-28 rounded border p-2" type="number" min={1990} max={2100} value={year} onChange={e=>setYear(e.target.value)}/></label></div>
        <p className="rounded border border-amber-300 p-3">共通教育表は2026年11月に確認した現行公開資料です。{year?`${year}年度入学生への`:'入学年度別の'}適用・経過措置は未照合です。必要数を満たしていても「卒業要件充足」とは判定しません。</p>
        <p>{r.note}</p>
        <a className="underline" href={`https://www.celas.osaka-u.ac.jp/education/prerequisite/${r.slug}/`} target="_blank" rel="noopener noreferrer">大学公式・学部／学科別共通教育表</a>
        {progress && <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>区分</th><th>取込単位</th><th>公式公開表</th><th>確認状態</th></tr></thead><tbody>{progress.byCategory.map(p=><tr className="border-t" key={p.category.id}><td className="p-2">{p.category.label}</td><td>{p.earned}</td><td>{p.category.minCredits}</td><td>年度・内訳を要確認</td></tr>)}</tbody></table><p className="mt-2">表に割り当てられない科目：{progress.unclassified.length}件。専門科目や未対応の小区分を含みます。</p></div>}
        {totals && <div className="rounded border p-3 space-y-2"><h4 className="font-semibold">2026年度便覧で確認済みの大区分</h4><p>教養{totals.liberal}／専門基礎{totals.basic}／専門教育{totals.specialized}／国際性涵養{totals.international}単位以上、総計{totals.total}単位以上。合計最低数との差5単位の算入先・必修内訳・高度教養等の条件は手動確認が必要です。</p><a href={SCIENCE_2026_SOURCE} className="underline" target="_blank" rel="noopener noreferrer">2026年度学生便覧・規程</a></div>}
        <details><summary>全学部の調査・対応状況</summary><ul className="mt-2 space-y-2"><li>経済学部：2019〜2024／2025以降、専門・自由選択を含む参考計算。</li>{Object.entries(FACULTY_CATALOG).map(([f,c])=><li key={f}>{f}：現行共通教育表を確認、専門・年度別適用は部分対応。<a className="underline" href={`https://www.celas.osaka-u.ac.jp/education/prerequisite/${c.slug}/`}>公式資料</a></li>)}</ul></details>
    </section>;
}
