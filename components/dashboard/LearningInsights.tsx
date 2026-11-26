'use client';
import { useState } from 'react';
import { BarChart3, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Grade, Faculty } from '@/lib/types';
import { normalizeSubject, relativeStanding, MIN_PEERS, type LearningStats } from '@/lib/learning-stats';
import { canonicalDepartment } from '@/lib/departments';
import { comparisonContext } from '@/lib/comparison-context';
import { termIndex, type LearningProfile } from '@/lib/learning-profile';
export default function LearningInsights({grades,faculty,profile,demo=false,mode='trends',onSettings,comparison}: {comparison:{stats:LearningStats|null;message:string;busy:boolean;retry:()=>void};mode?:'analysis'|'trends';onSettings?:()=>void;grades:Grade[];faculty:Faculty|'';profile:LearningProfile;demo?:boolean}) {
    const {stats,message,busy,retry} = comparison;
    const [view,setView]=useState<'category'|'subject'>('category');
    const earned=grades.filter(g=>g.passed===true || (g.passed===undefined && g.grade && g.grade!=='F'));
    const terms=new Map<string,number>(); const categories=new Map<string,number>();
    for(const g of earned) { const key=`${g.year} ${g.semester??'学期不明'}`;terms.set(key,(terms.get(key)??0)+g.credits);const c=g.category??'区分不明';categories.set(c,(categories.get(c)??0)+g.credits); }
    const ordered=[...terms].sort(([a],[b])=>Number(a.slice(0,4))-Number(b.slice(0,4)) || (termIndex(0,a.slice(5))??99)-(termIndex(0,b.slice(5))??99));
    const department = canonicalDepartment(faculty,profile.department);
    const context = comparisonContext(grades, profile);
    const cohort = stats?.cohorts?.find(p=>p.faculty===faculty && p.department===department && p.admissionYear===profile.admissionYear && p.year===context.year && p.semester===context.semester);
    const sameLevel = stats?.pace.find(p=>p.faculty===faculty && p.department===department && p.year===context.year && p.semester===context.semester && p.yearLevel===profile.yearLevels[p.year]);
    const pace = cohort ?? sameLevel;
    const relevant=stats?.trends.filter(t=>t.faculty===faculty && t.department===department && (view==='subject' ? t.subject!==null : t.subject===null))??[];
    const matches=grades.map(g=>{
        const distribution=stats?.courses.find(d=>d.faculty===faculty&&d.department===department&&d.subject===normalizeSubject(g.subject)&&d.year===g.year&&d.semester===g.semester);
        return {g,distribution,rank:distribution?relativeStanding(distribution,g.grade):null};
    });
    const ranked=matches.filter(m=>m.rank).length;
    const compareControl=<div className="flex flex-wrap items-center gap-3">
        {!demo && message && <Button variant="outline" size="sm" disabled={busy} onClick={retry}><RefreshCw className="mr-2 h-3.5 w-3.5"/>再試行</Button>}
        <p role="status" className="text-sm text-muted-foreground">{busy?'比較データを取得中…':message}</p>
    </div>;
    const empty=(title:string,description:string)=><div className="rounded-xl bg-muted/50 px-5 py-6 text-center"><BarChart3 className="mx-auto mb-3 h-5 w-5 text-muted-foreground"/><p className="text-sm font-semibold">{title}</p><p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">{description}</p></div>;
    if(mode==='analysis') return <section className="dashboard-panel space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">科目別の成績</h2><p className="mt-1 text-xs text-muted-foreground">{grades.length}科目 · {department?`同じ学科（${department}）`:'学科未設定'}</p></div>{compareControl}</div>
        {!ranked && !busy && !message && empty(demo?'比較は実データで利用できます':!department?'学科を設定すると比較できます':stats?'比較できるデータがまだありません':'自分の成績を、科目ごとに確認',demo?'架空データのため、順位は表示しません。':stats?'十分な比較データがある科目のみ順位を表示します。':'比較データは自動で表示されます。')}
        <p className="text-xs text-muted-foreground sm:hidden">表を左右にスクロールして相対評価を確認できます。</p>
        <div className="max-h-[460px] overflow-auto rounded-xl border"><table className="dashboard-table min-w-[620px]"><thead><tr><th>科目 / 詳細</th><th>修得時期</th><th>単位</th><th>評価</th><th>相対評価</th><th>標本数</th></tr></thead><tbody>{matches.map(({g,distribution,rank},i)=><tr key={i}>
            <td className="max-w-64"><details><summary className="cursor-pointer font-medium">{g.subject}</summary><div className="mt-2 space-y-1 text-xs text-muted-foreground"><p>{g.categoryDetail??'区分未記載'} / {g.category??'小区分未記載'}</p>{rank&&distribution&&<p>{rank.fromRank}〜{rank.toRank}位相当・同評語{rank.tied}件<br/>{Object.entries(distribution.distribution).map(([k,n])=>`${k}: ${n}件`).join(' / ')}</p>}</div></details></td>
            <td className="whitespace-nowrap text-muted-foreground">{g.year}<br/><span className="text-xs">{g.semester??'学期不明'}</span></td><td>{g.credits}</td><td><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-primary/8 px-1.5 font-semibold text-primary">{g.grade??'—'}</span></td><td className="whitespace-nowrap">{rank?`上位 ${rank.topFrom}〜${rank.topTo}%`:'—'}</td><td>{rank&&distribution?`${distribution.count}件`:'—'}</td>
        </tr>)}</tbody></table></div>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">相対評価・同順位・サンプルの見方</summary><p className="mt-3 leading-relaxed">科目名・修得年度・修得学期・学部・学科が一致する投稿を集計します。同じ学科でもコースや授業内容が異なる場合があります。順位は同評語の範囲で表示し、合否のみの評語は対象外です。{MIN_PEERS}セッション以上を基本に、少数の評語を含む分布は全体を非公開にします。修得者内の参考値であり、履修者全体の順位ではありません。科目名を開くと大学の区分と評価分布を確認できます。</p></details>
    </section>;
    return <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
            <section className="dashboard-panel"><h2 className="font-semibold">学期ごとの修得単位</h2><p className="mt-1 text-xs text-muted-foreground">これまでの積み上がり</p><div className="mt-5 max-h-72 overflow-auto space-y-4">{ordered.map(([term,credits])=><div key={term} className="text-sm"><div className="mb-2 flex justify-between gap-3"><span className="text-muted-foreground">{term}</span><span className="font-semibold tabular-nums">{credits}<span className="ml-1 text-xs font-normal">単位</span></span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary/80" style={{width:`${Math.min(credits/Math.max(...terms.values())*100,100)}%`}}/></div></div>)}</div></section>
            <section className="dashboard-panel"><h2 className="font-semibold">科目区分のバランス</h2><p className="mt-1 text-xs text-muted-foreground">大学CSVの小区分ごとに集計</p><div className="mt-5 max-h-72 overflow-auto divide-y">{[...categories].map(([c,n])=><div key={c} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">{c}</span><span className="shrink-0 font-semibold tabular-nums">{n}<span className="ml-1 text-xs font-normal">単位</span></span></div>)}</div></section>
        </div>
        <section className="dashboard-panel space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">みんなの履修と比べる</h2><p className="mt-1 text-xs text-muted-foreground">{department?`同じ学科 · ${department}`:'学科未設定'}</p></div>{compareControl}</div>
            {demo?empty('デモでは自分の履修傾向を表示します','実データを取り込むと比較を利用できます。'):<>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4"><div><p className="text-sm font-medium">単位取得ペース</p><p className="mt-1 text-xs text-muted-foreground">{context.year?`${context.year}年度 ${context.semester}末`:'修得学期の情報がありません'}</p></div>{onSettings&&<Button variant="ghost" size="sm" onClick={onSettings}>条件を変更<ArrowUpRight className="ml-1 h-4 w-4"/></Button>}</div>
                {pace&&context.known?<div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-muted-foreground">{context.complete?'自分':'自分（取込分）'}</p><p className="mt-1 text-2xl font-semibold">{context.credits}<span className="ml-1 text-sm">単位</span></p></div><div><p className="text-xs text-muted-foreground">{cohort?`${profile.admissionYear}年度入学の投稿者平均`:'同学年の投稿者平均'} · {pace.count}件</p><p className="mt-1 text-2xl font-semibold">{pace.averageCredits}<span className="ml-1 text-sm">単位</span></p></div></div>:<p className="text-sm text-muted-foreground">{busy?'取得中…':message?'比較は一時的に利用できません。':!faculty?'学部を設定すると比較できます。':!department?'学科を設定すると比較できます。':!profile.admissionYear&&!sameLevel?'入学年度を設定すると同期と比較できます。':!context.known?'修得学期が不明なため、ペースは比較できません。':'同条件の比較データはまだ十分にありません。'}</p>}
            </>}
            <div className="flex items-center justify-between gap-3 border-t pt-5"><h3 className="text-sm font-semibold">過去の修得傾向</h3><select aria-label="履修傾向の表示単位" className="rounded-lg border bg-background p-2 text-sm" value={view} onChange={e=>setView(e.target.value as typeof view)}><option value="category">科目区分別</option><option value="subject">科目別</option></select></div>
            {relevant.length?<div className="max-h-80 overflow-auto"><table className="dashboard-table min-w-[500px]"><thead><tr><th>年次・学期</th><th>{view==='subject'?'科目':'区分'}</th><th>平均単位</th><th>標本数</th></tr></thead><tbody>{relevant.map((t,i)=><tr key={i}><td>{t.yearLevel}年次 {t.semester}</td><td>{t.subject??t.category}</td><td>{t.averageCredits}</td><td>{t.count}件</td></tr>)}</tbody></table></div>:<p className="rounded-xl bg-muted/40 p-5 text-center text-sm text-muted-foreground">比較データが集まると表示されます。</p>}
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">比較条件と集計対象について</summary><p className="mt-3 leading-relaxed">大学の区分・実単位数による集計で、未修得・予定科目は含みません。比較時点は設定済みの学期末、未設定なら取込明細の最新学期です。「取込分」は全修得単位と一致しない場合があります。ペースは同じ学部・学科・入学年度を優先し、なければ設定済みの学年を使用します。同年度・学期末の全件投稿を{MIN_PEERS}セッション以上で比較します。修得傾向は本人申告の年次・学期別で、その科目を修得した投稿者内の平均です。未修得者を含む平均・推奨履修順ではなく、異なる入学年度も含みます。実人数や学部全体の平均を保証しません。</p></details>
        </section>
    </div>;
}
