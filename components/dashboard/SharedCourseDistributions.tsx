'use client';
import {useState} from 'react';
import {FACULTY_OPTIONS} from '@/lib/types';
import type {CourseDistribution} from '@/lib/learning-stats';
export default function SharedCourseDistributions() {
 const [rows,setRows]=useState<CourseDistribution[]>([]);const [query,setQuery]=useState('');const [faculty,setFaculty]=useState('');const [message,setMessage]=useState('比較データはまだ取得していません。');const [busy,setBusy]=useState(false);
 const load=async()=>{setBusy(true);try{const r=await fetch('/api/learning-stats');if(!r.ok)throw Error();const d=await r.json();setRows(d.courses);setMessage(d.courses.length?'':'公開条件を満たすデータがまだありません。');}catch{setMessage('集計を取得できません。共有保存の準備中または接続障害です。');}finally{setBusy(false);}};
 const filtered=rows.filter(r=>(!faculty||r.faculty===faculty)&&r.subject.includes(query.normalize('NFKC').trim()));
 return <section className="rounded border bg-card p-4 space-y-3 mb-5">
 <h2 className="font-semibold">単位修得者の成績分布</h2><p className="text-sm">科目名・修得年度・学期・学部で比較します。時間割コードがなくても利用できます。同名科目は内容や担当者が異なる場合があります。不可率・取りやすさの指標ではありません。</p>
 <p className="text-sm">20セッション以上、各評語は0件または5件以上の分布のみ公開。合否のみの評語は除外します。全学生を代表する統計ではありません。</p>
 <button onClick={load} disabled={busy} className="rounded border px-4 py-2">{busy?'取得中…':'公開分布を取得'}</button><p role="status" className="text-sm">{message}</p>
 <div className="flex flex-wrap gap-2"><label>科目名 <input className="rounded border p-2" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>学部 <select className="rounded border p-2" value={faculty} onChange={e=>setFaculty(e.target.value)}><option value="">すべて</option>{FACULTY_OPTIONS.map(f=><option key={f}>{f}</option>)}</select></label></div>
 <ul className="space-y-3 text-sm">{filtered.map((r,i)=><li key={i} className="rounded border p-3"><p className="font-semibold">{r.subject}</p><p>{r.faculty}／{r.year}年度 {r.semester}／{r.count}セッション・参考値</p><p>{Object.entries(r.distribution).map(([g,n])=>`${g} ${n}件 (${Math.round(n/r.count*100)}%)`).join(' ／ ')}</p></li>)}</ul>
 </section>;
}
