'use client';
import { useState } from 'react';
import type { Grade, Faculty } from '@/lib/types';
import { normalizeSubject, relativeStanding, MIN_PEERS, type LearningStats } from '@/lib/learning-stats';
import { termIndex, type LearningProfile } from '@/lib/learning-profile';
export default function LearningInsights({grades,faculty,profile,demo=false}: {grades:Grade[];faculty:Faculty|'';profile:LearningProfile;demo?:boolean}) {
    const [stats,setStats]=useState<LearningStats|null>(null);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
    const [view,setView]=useState<'category'|'subject'>('category');
    const earned=grades.filter(g=>g.passed===true || (g.passed===undefined && g.grade && g.grade!=='F'));
    const terms=new Map<string,number>(); const categories=new Map<string,number>();
    for(const g of earned) { const key=`${g.year} ${g.semester??'学期不明'}`;terms.set(key,(terms.get(key)??0)+g.credits);const c=g.category??'区分不明';categories.set(c,(categories.get(c)??0)+g.credits); }
    const ordered=[...terms].sort(([a],[b])=>Number(a.slice(0,4))-Number(b.slice(0,4)) || (termIndex(0,a.slice(5))??99)-(termIndex(0,b.slice(5))??99));
    const total=earned.reduce((n,g)=>n+g.credits,0);
    const cutoff=profile.completedYear?termIndex(profile.completedYear,profile.completedTerm):null;
    const comparable=profile.complete && cutoff!==null && earned.every(g=>termIndex(g.year,g.semester)!==null && termIndex(g.year,g.semester)!<=cutoff);
    const pace=stats?.pace.find(p=>p.faculty===faculty && p.year===profile.completedYear && p.semester===profile.completedTerm && p.yearLevel===profile.yearLevels[p.year]);
    const relevant=stats?.trends.filter(t=>t.faculty===faculty && (view==='subject' ? t.subject!==null : t.subject===null))??[];
    const load=async()=>{if(demo)return;setBusy(true);setMessage('比較データを取得中…');try{const r=await fetch('/api/learning-stats');if(!r.ok)throw Error('比較データを取得できません。共有保存の準備中または接続障害です。端末内の分析は利用できます。');setStats(await r.json());setMessage('');}catch(e){setMessage(e instanceof Error?e.message:'取得できませんでした。');}finally{setBusy(false);}};
    return <section className="rounded border bg-card p-4 space-y-4">
        <h2 className="font-bold text-lg">単位の積み上がり・履修傾向</h2>
        <p className="text-sm">大学の区分・実単位数による集計。予定科目や未修得単位は含みません。</p>
        <div className="grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold">自分の学期別修得単位</h3>{ordered.map(([term,credits])=><div key={term} className="my-2 text-sm"><span>{term}：{credits}単位</span><div className="h-2 rounded bg-secondary"><div className="h-2 rounded bg-primary" style={{width:`${Math.min(credits/Math.max(...terms.values())*100,100)}%`}}/></div></div>)}</div><div><h3 className="font-semibold">大学の小区分別</h3><ul className="text-sm space-y-1">{[...categories].map(([c,n])=><li key={c}>{c}：{n}単位</li>)}</ul></div></div>
        <details className="text-sm"><summary>取り込んだ科目と区分を確認</summary><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>科目</th><th>大学の区分／小区分</th><th>修得時期</th><th>単位・評語</th></tr></thead><tbody>{grades.map((g,i)=><tr key={i} className="border-t"><td className="p-2">{g.subject}</td><td>{g.categoryDetail??'—'}／{g.category??'未分類'}</td><td>{g.year} {g.semester??'不明'}</td><td>{g.credits}／{g.grade??'未確認'}</td></tr>)}</tbody></table></div></details>
        <h3 className="font-semibold">同学部・同学年との単位取得ペース</h3>
        <p className="text-sm">同じ年度・学期末、同じ自己申告学年の全件投稿を比較。{MIN_PEERS}セッション以上で表示します。実人数や学部全体の平均を保証しません。</p>
        {demo?<p className="text-sm">デモでは架空の個人成績だけを表示します。実際の学生との比較データは取得しません。</p>:<button className="rounded border px-4 py-2" disabled={busy} onClick={load}>共有された比較データを見る</button>}
        <p role="status" className="text-sm">{message}</p>
        {stats && <p className="text-sm">{pace && comparable ? `自分 ${total}単位／投稿者平均 ${pace.averageCredits}単位（${pace.count}セッション・参考値）` : '同条件の比較データは未収集、条件未入力、または少数保護のため表示できません。ゼロ単位という意味ではありません。'}</p>}
        <h3 className="font-semibold">先輩を含む過去の修得傾向</h3><p className="text-sm">本人が申告した年次・修得学期別。下記の平均はその科目・区分を修得した投稿者内の値で、未修得者を含む平均や推奨履修順ではありません。異なる入学年度の投稿を含みます。</p>
        <select aria-label="履修傾向の表示単位" className="rounded border p-2" value={view} onChange={e=>setView(e.target.value as typeof view)}><option value="category">科目区分別</option><option value="subject">科目別</option></select>
        {relevant.length ? <ul className="text-sm space-y-2">{relevant.map((t,i)=><li key={i}>{t.yearLevel}年次 {t.semester}：{t.subject??t.category}／平均{t.averageCredits}単位（{t.count}セッション）</li>)}</ul> : <p className="text-sm text-muted-foreground">公開条件を満たしたデータが集まると表示します。</p>}
        <h3 className="font-semibold">科目ごとの相対評価（修得者内）</h3><p className="text-sm">科目名・修得年度・修得学期・学部が一致する投稿を集計します。同名でも内容が異なる可能性があります。合否のみの評語は順位対象外。少数の評語を含む分布は全体を非公開にします。</p>
        <ul className="space-y-3 text-sm">{grades.map((g,i)=>{const d=stats?.courses.find(d=>d.faculty===faculty&&d.subject===normalizeSubject(g.subject)&&d.year===g.year&&d.semester===g.semester);const rank=d?relativeStanding(d,g.grade):null;return <li key={i} className="rounded border p-3"><p>{g.subject}（{g.year} {g.semester??'学期不明'}）：{g.grade??'未確認'}</p>{d&&rank?<><p>修得者内の上位{rank.topFrom}〜{rank.topTo}%の同順位群（{rank.fromRank}〜{rank.toRank}位相当／{d.count}セッション、同評語{rank.tied}件）</p><p>{Object.entries(d.distribution).map(([k,n])=>`${k}: ${n}件`).join(' ／ ')}・参考値</p></>:<p className="text-muted-foreground">比較データなし／少数保護／順位対象外</p>}</li>;})}</ul>
    </section>;
}
