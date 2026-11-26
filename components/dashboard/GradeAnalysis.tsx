"use client";

import { DEMO_GRADES } from "@/lib/demo";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotateCcw, ListChecks, Settings2, X, GraduationCap, TrendingUp, BookOpen, ShieldCheck } from "lucide-react";
import { FACULTY_OPTIONS } from "@/lib/types";
import type { AnalysisResult, AggregateStats, Faculty, Grade } from "@/lib/types";
import { calculateGPA } from "@/lib/gpa";
import { getTotalRequiredCredits, getGraduationReference, calcProgress } from "@/lib/requirements";
import GradeReview from "@/components/dashboard/GradeReview";
import UploadPanel from "@/components/dashboard/UploadPanel";
import GpaDeviationCard from "@/components/dashboard/GpaDeviationCard";
import LearningProfileEditor from './LearningProfileEditor';
import LearningInsights from './LearningInsights';
import { EMPTY_PROFILE, validProfile, type LearningProfile } from '@/lib/learning-profile';
import { useLearningStats } from './useLearningStats';
import StatsPanel from "@/components/dashboard/StatsPanel";

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GraduationCheck from './GraduationCheck';
import { FACULTY_CATALOG } from '@/lib/faculty-catalog';
import { facultyTotals, compareFacultyTotals, BASIC_ENGINEERING_COURSES } from '@/lib/faculty-totals';

function calcDeviation(userGpa: number, mean: number, stdDev: number): number | null {
    if (stdDev < 0.01) return null;
    return Math.round((50 + 10 * (userGpa - mean) / stdDev) * 10) / 10;
}

function buildAnalysisResult(grades: Grade[], faculty: Faculty | '', importInfo?: AnalysisResult['importInfo']): AnalysisResult {
    const { cumulative, semesters, earnedCredits } = calculateGPA(grades);
    const total = getTotalRequiredCredits(faculty);
    return {
        grades,
        importInfo,
        gpa: { cumulative, semesters },
        earnedCredits,
        graduationRequirement: {
            total: total ?? 0,
            current: earnedCredits,
            percentage: total ? Math.min(Math.round((earnedCredits / total) * 100), 100) : 0,
        },
    };
}

interface Props {
    stats: AggregateStats | null;
    sessionId: string;
    onStatsUpdate: (s: AggregateStats) => void;
    staleData?: boolean;
    demo?: boolean;
}

export default function GradeAnalysis({ stats, sessionId, onStatsUpdate, staleData = false, demo = false }: Props) {
    const inputStarted = useRef(false);
    const settingsRef = useRef<HTMLDialogElement>(null);
    const [activeTab,setActiveTab] = useState('graduation');
    const [settingsTab,setSettingsTab] = useState('profile');
    const [course,setCourse] = useState('');
    const openSettings=(tab='profile')=>{setSettingsTab(tab);settingsRef.current?.showModal();};
    const reviewRef = useRef<HTMLDivElement>(null);
    const [reviewWarning, setReviewWarning] = useState('');
    const [importInfo, setImportInfo] = useState<AnalysisResult['importInfo']>();
    const [profile, setProfile] = useState<LearningProfile>(() => {
        if (demo) return {...EMPTY_PROFILE, admissionYear:2025};
        if (typeof window === 'undefined') return EMPTY_PROFILE;
        try { const p=JSON.parse(localStorage.getItem('syllobus_learning_profile')??'null'); return validProfile(p)?p:EMPTY_PROFILE; } catch { return EMPTY_PROFILE; }
    });
    const changeProfile = (p: LearningProfile) => { setProfile(p); if(!demo) localStorage.setItem('syllobus_learning_profile',JSON.stringify(p)); };
    const [saveConsent, setSaveConsent] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [pendingGrades, setPendingGrades] = useState<Grade[] | null>(null);
    useEffect(() => { if (pendingGrades) reviewRef.current?.scrollIntoView({ block: 'start' }); }, [pendingGrades]);
    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(() => {
        if (demo) return buildAnalysisResult(DEMO_GRADES, "経済学部", {kind:"credit-status",warnings:[]});
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem('handai_analysis_data');
        try { return raw ? JSON.parse(raw) as AnalysisResult : null; } catch { return null; }
    });
    const comparison = useLearningStats(!demo && analysisData !== null);
    const [faculty, setFaculty] = useState<Faculty | ''>(() => {
        if (demo) return "経済学部";
        if (typeof window === "undefined") return '';
        return (localStorage.getItem('handai_faculty') as Faculty | null) ?? '';
    });
    // localStorage にデータがなく session_id がある場合、Cloudflare D1 から復元が必要な可能性がある
    const [restoring, setRestoring] = useState(false);

    // localStorage が空でも session_id が Cloudflare D1 にあれば成績を復元する
    useEffect(() => {
        if (demo || analysisData !== null || !sessionId) return;
        // Loading indicator synchronizes with the restoration request.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRestoring(true);
        (async () => {
            const creditResponse = await fetch(`/api/credit-records?session_id=${sessionId}`);
            if (creditResponse.ok) {
                const {snapshot}=await creditResponse.json();
                if(snapshot && !inputStarted.current) {
                    if(validProfile(snapshot.profile)) { setProfile(snapshot.profile); localStorage.setItem('syllobus_learning_profile',JSON.stringify(snapshot.profile)); }
                    const info: NonNullable<AnalysisResult['importInfo']>={kind:'credit-status',warnings:[]};
                    const result=buildAnalysisResult(snapshot.grades,snapshot.faculty,info);
                    setAnalysisData(result);setFaculty(snapshot.faculty);setImportInfo(info);
                    localStorage.setItem('handai_analysis_data',JSON.stringify(result));
                    localStorage.setItem('handai_faculty',snapshot.faculty);
                    return {hasSubmission:false};
                }
            }
            return fetch(`/api/session-info?session_id=${sessionId}`).then(r=>r.json());
        })()
            .then(({ hasSubmission, grades: savedGrades, faculty: savedFaculty }: {
                hasSubmission: boolean;
                grades?: Grade[];
                faculty?: string | null;
            }) => {
                if (inputStarted.current || !hasSubmission || !savedGrades?.length) return;
                const result = buildAnalysisResult(savedGrades, (savedFaculty ?? '') as Faculty | '');
                localStorage.setItem('handai_analysis_data', JSON.stringify(result));
                if (savedFaculty) {
                    setFaculty(savedFaculty as Faculty);
                    localStorage.setItem('handai_faculty', savedFaculty);
                }
                setAnalysisData(result);
            })
            .catch(() => {})
            .finally(() => setRestoring(false));
    // Restore once per authenticated session; reset must not immediately restore deleted local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, demo]);

    const participantCount = stats?.totalParticipants ? stats.totalParticipants : null;

    const handleConfirm = async (confirmedGrades: Grade[]) => {
        if (demo) return;
        const result = buildAnalysisResult(confirmedGrades, faculty, importInfo);
        setAnalysisData(result);
        setPendingGrades(null);
        setActiveTab('graduation');
        localStorage.setItem('handai_analysis_data', JSON.stringify(result));
        localStorage.setItem('handai_faculty', faculty);

        if (saveConsent) await saveGrades(confirmedGrades);
    };

    const saveGrades = async (grades: Grade[]) => {
        if (demo || !saveConsent) return;
        if (!sessionId) { setSaveMessage('保存機能に接続できません。成績はこのブラウザのみに保存しました。'); return; }
        setBusy(true);
        try {
            const isCredit = grades.every(g=>g.categorySource==='university-csv');
            const response = await fetch(isCredit ? '/api/credit-records' : '/api/save-grades', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, faculty, grades, profile, consent: true }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setSaveMessage('サーバーに保存しました。');
            const r = await fetch('/api/stats');
            if (r.ok) onStatsUpdate(await r.json());
        } catch (error) {
            setSaveMessage(error instanceof Error ? error.message : '保存できませんでした。再試行してください。');
        } finally { setBusy(false); }
    };
    const deleteGrades = async () => {
        if (demo || !window.confirm('サーバーとこのブラウザの成績データを削除しますか？')) return;
        setBusy(true);
        try {
            const r = await fetch(`${analysisData?.importInfo ? '/api/credit-records' : '/api/save-grades'}?session_id=${sessionId}`, { method: 'DELETE' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            handleReset();
            setSaveMessage('成績データを削除しました。');
        } catch (error) { setSaveMessage(error instanceof Error ? error.message : '削除できませんでした。'); }
        finally { setBusy(false); }
    };

    const handleReset = () => {
        // A fresh document discards demo-only memory before opening real data.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (demo) { window.location.href = '/dashboard'; return; }
        localStorage.removeItem('handai_analysis_data');
        localStorage.removeItem('handai_faculty');
        localStorage.removeItem('syllobus_learning_profile');
        setProfile(EMPTY_PROFILE);
        setCourse('');
        setSaveConsent(false);
        settingsRef.current?.close();
        setAnalysisData(null);
        setPendingGrades(null);
        setReviewWarning('');
    };

    // ── Review View ───────────────────────────────────────────────────────────
    if (pendingGrades !== null) {
        return (
            <div ref={reviewRef} className="space-y-4">
                <div className="flex justify-end">
                    <button onClick={handleReset} className="text-xs text-muted-foreground underline underline-offset-2">
                        やり直す
                    </button>
                </div>
                <label className="flex items-start gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={saveConsent} onChange={e => setSaveConsent(e.target.checked)} />
                    <span>成績・区分・修得時期・学部・比較条件をサーバーに保存し、復元と統計に利用することに同意します（任意）。未選択ならブラウザ内のみ。<Link href="/about" className="underline">保存・削除の説明</Link></span>
                </label>
                {reviewWarning && <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{reviewWarning}</p>}
                {pendingGrades.every(g=>g.categorySource==='university-csv') && <details className="dashboard-panel"><summary className="cursor-pointer text-sm font-medium">比較条件を設定する（任意）</summary><div className="mt-4"><LearningProfileEditor grades={pendingGrades} value={profile} onChange={changeProfile}/></div></details>}
                <GradeReview initialGrades={pendingGrades} onConfirm={handleConfirm} onEdited={() => changeProfile({...profile, complete:false})} />
            </div>
        );
    }

    // ── CTA View ──────────────────────────────────────────────────────────────
    if (analysisData === null) {
        return (
            <div onPointerDownCapture={() => { inputStarted.current = true; }} onFocusCapture={() => { inputStarted.current = true; }}>
            <p role="status" className="mb-3 text-sm text-muted-foreground">{restoring ? '保存済みデータを確認中です。新しいファイルも選択できます。' : ''}</p>
            <UploadPanel
                stats={stats}
                participantCount={participantCount}
                faculty={faculty}
                onFacultyChange={setFaculty}
                onGradesParsed={(grades, warning, info) => { setImportInfo(info); setProfile(p=>({...p,complete:false})); inputStarted.current = true; setReviewWarning(warning ?? ''); setPendingGrades(grades); }}
            />
            </div>
        );
    }

    // ── Results View ──────────────────────────────────────────────────────────
    const deviation = stats && stats.stdDev > 0
        ? calcDeviation(analysisData.gpa.cumulative, stats.averageGpa, stats.stdDev)
        : null;

    const reference=faculty==='経済学部'?getGraduationReference(faculty,profile.admissionYear??0):null;
    const econProgress=reference?calcProgress(analysisData.grades,reference.def):null;
    const facultyRule=faculty?facultyTotals(faculty,profile.department,profile.admissionYear??0,course):null;
    const facultyProgress=facultyRule?.verifiedYears.includes(profile.admissionYear??0)?compareFacultyTotals(analysisData.grades,facultyRule):null;
    const required=econProgress?.totalRequired || (facultyProgress?facultyRule?.total:undefined);
    const progressCredits=econProgress?.totalEarned??facultyProgress?.total??0;
    const progressPercent=required?Math.min(100,Math.round(progressCredits/required*100)):null;
    const hasCredit=Boolean(analysisData.importInfo||demo);
    const hasGpa=analysisData.grades.some(g=>g.grade&&['S','A','B','C','F'].includes(g.grade));
    const selection={year:profile.admissionYear?String(profile.admissionYear):'',department:profile.department,course};
    const catalog=faculty?FACULTY_CATALOG[faculty]:undefined;

    return (
        <div className="dashboard-workspace space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-muted-foreground">{faculty||'学部未設定'}{profile.admissionYear?` · ${profile.admissionYear}年度入学`:''}</p>{demo&&<p className="mt-2 inline-flex rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">サンプルデータ · 送信・保存なし</p>}</div>
                <Button variant="outline" onClick={()=>openSettings()} className="shrink-0 gap-2 rounded-xl"><Settings2 className="h-4 w-4"/><span>設定<span className="hidden sm:inline">とデータ管理</span></span></Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                <section className="dashboard-metric col-span-2 lg:col-span-1"><div className="flex items-center justify-between"><h2 className="text-sm text-muted-foreground">卒業単位の進捗</h2><GraduationCap className="h-4 w-4 text-primary"/></div>{progressPercent!==null?<><p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{progressPercent}<span className="ml-1 text-sm font-normal text-muted-foreground">%</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${progressPercent}%`}}/></div><p className="mt-2 text-xs text-muted-foreground">{progressCredits} / {required}単位 · 参考</p></>:<><p className="mt-4 text-lg font-semibold">{profile.admissionYear?'要確認':'年度を設定'}</p><button onClick={()=>openSettings()} className="mt-3 text-xs text-primary underline underline-offset-4">適用条件を確認する</button></>}</section>
                <section className="dashboard-metric"><div className="flex items-center justify-between"><h2 className="text-sm text-muted-foreground">修得単位</h2><BookOpen className="h-4 w-4 text-primary"/></div><p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{analysisData.earnedCredits}<span className="ml-2 text-sm font-normal text-muted-foreground">単位</span></p><p className="mt-3 text-xs text-muted-foreground">{analysisData.grades.length}科目を取り込み済み</p></section>
                <section className="dashboard-metric"><div className="flex items-center justify-between"><h2 className="text-sm text-muted-foreground">{hasCredit?'取込明細の参考GPA':'通算GPA'}</h2><TrendingUp className="h-4 w-4 text-primary"/></div><p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums">{hasGpa?analysisData.gpa.cumulative.toFixed(2):'—'}<span className="ml-2 text-sm font-normal text-muted-foreground">/ 4.00</span></p><p className="mt-3 text-xs text-muted-foreground">{hasCredit&&analysisData.importInfo?.officialGpa!==undefined?`大学CSV記載のGPA ${analysisData.importInfo.officialGpa}`:hasGpa?'取り込んだ成績から計算':'GPAの対象評語がありません'}</p></section>
            </div>
            <p className="text-xs text-muted-foreground">{demo?'架空データ・実際の学生との比較なし。':'共有保存は任意。'} 卒業進捗は参考値です。最終確認は大学の便覧で。</p>
            {saveMessage && <p role="status" className="rounded-xl border bg-card px-4 py-3 text-sm">{saveMessage}</p>}
            {staleData&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900"><p>解析精度が向上しました。再アップロードで更新できます。</p><Button variant="outline" size="sm" onClick={handleReset}>再アップロード</Button></div>}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList aria-label="ダッシュボード" className="dashboard-tabs sticky top-14 z-20 grid h-auto w-full grid-cols-3 rounded-xl border bg-background/95 p-1 backdrop-blur">
                    {[['graduation','卒業要件'],['analysis','成績分析'],['trends','履修傾向']].map(([value,label])=><TabsTrigger key={value} value={value} className="min-h-11 rounded-lg px-1 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{label}</TabsTrigger>)}
                </TabsList>
                <TabsContent value="graduation" forceMount className="mt-6 data-[state=inactive]:hidden">
                    <GraduationCheck grades={analysisData.grades} faculty={faculty} selection={selection} onSettings={()=>openSettings()}/>
                </TabsContent>
                <TabsContent value="analysis" forceMount className="mt-6 space-y-5 data-[state=inactive]:hidden">
                    {activeTab==='analysis'&&<StatsPanel analysisData={analysisData} stats={demo||hasCredit?null:stats} faculty={faculty}/>}
                    {!demo&&!hasCredit&&<GpaDeviationCard analysisData={analysisData} stats={stats} deviation={deviation} participantCount={participantCount}/>}
                    <LearningInsights comparison={comparison} grades={analysisData.grades} faculty={faculty} profile={profile} demo={demo} mode="analysis"/>
                    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">GPA・単位の計算について</summary><p className="mt-3 leading-relaxed">{hasCredit?'参考GPAは、不合格・再履修等の扱いにより大学記載のGPAと異なる場合があります。':'取り込んだ成績から算出しています。'} 必修・読替などの条件は大学の便覧で確認してください。</p></details>
                    {!demo&&<Button asChild variant="outline"><Link href="/courses"><ListChecks className="mr-2 h-4 w-4"/>成績を編集する</Link></Button>}
                </TabsContent>
                <TabsContent value="trends" forceMount className="mt-6 data-[state=inactive]:hidden">
                    <LearningInsights comparison={comparison} grades={analysisData.grades} faculty={faculty} profile={profile} demo={demo} onSettings={()=>openSettings('comparison')}/>
                </TabsContent>
            </Tabs>
            <dialog ref={settingsRef} aria-labelledby="dashboard-settings-title" className="dashboard-dialog">
                <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="dashboard-settings-title" className="font-semibold">設定とデータ管理</h2><p className="mt-1 text-xs text-muted-foreground">{demo?'デモ内だけに適用されます':'変更だけではサーバーへ送信されません'}</p></div><button autoFocus aria-label="設定を閉じる" onClick={()=>settingsRef.current?.close()} className="rounded-lg p-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"><X className="h-5 w-5"/></button></div>
                <Tabs value={settingsTab} onValueChange={setSettingsTab} className="p-5">
                    <TabsList aria-label="設定項目" className="grid h-auto grid-cols-3 mb-6"><TabsTrigger value="profile" className="min-h-10">基本情報</TabsTrigger><TabsTrigger value="comparison" className="min-h-10">比較条件</TabsTrigger><TabsTrigger value="data" className="min-h-10">データ管理</TabsTrigger></TabsList>
                    <TabsContent value="profile" className="space-y-5">
                        <label className="dashboard-field">学部<select disabled={demo} value={faculty} onChange={e=>{setFaculty(e.target.value as Faculty);if(!demo)localStorage.setItem('handai_faculty',e.target.value);changeProfile({...profile,department:'',complete:false});setCourse('');}}><option value="">選択してください</option>{FACULTY_OPTIONS.map(f=><option key={f}>{f}</option>)}</select></label>
                        <div className="grid gap-4 sm:grid-cols-2"><label className="dashboard-field">学科・専攻{catalog?<select value={profile.department} onChange={e=>{changeProfile({...profile,department:e.target.value,complete:false});setCourse('');}}><option value="">選択してください</option>{profile.department&&!(profile.department in catalog.departments)&&<option>{profile.department}</option>}{Object.keys(catalog.departments).map(d=><option key={d}>{d}</option>)}</select>:<input maxLength={100} value={profile.department} onChange={e=>changeProfile({...profile,department:e.target.value})}/>}</label><label className="dashboard-field">入学年度<input type="number" min={1990} max={2100} placeholder="例：2024" value={profile.admissionYear??''} onChange={e=>changeProfile({...profile,admissionYear:e.target.value?Number(e.target.value):null,complete:false})}/></label></div>
                        {faculty==='基礎工学部'&&BASIC_ENGINEERING_COURSES[profile.department]&&<label className="dashboard-field">履修コース<select value={course} onChange={e=>setCourse(e.target.value)}><option value="">選択してください</option>{Object.keys(BASIC_ENGINEERING_COURSES[profile.department]).map(c=><option key={c}>{c}</option>)}</select></label>}
                        <p className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">比較に使う学年は「比較条件」で設定できます。</p>
                    </TabsContent>
                    <TabsContent value="comparison"><LearningProfileEditor grades={analysisData.grades} value={profile} onChange={changeProfile} identity={false}/></TabsContent>
                    <TabsContent value="data" className="space-y-5">
                        {demo?<div className="rounded-xl bg-primary/5 p-4 text-sm leading-relaxed">架空の成績を使ったデモです。データの送信・サーバー保存・実際の学生との比較は行いません。</div>:<>
                        <div><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary"/>成績の共有と保存</h3><p className="mt-2 text-xs leading-relaxed text-muted-foreground">共有しなくても分析できます。</p></div>
                        <label className="flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={saveConsent} onChange={e=>setSaveConsent(e.target.checked)}/><span>成績・区分・修得時期・学部・比較条件をサーバーに保存し、復元と統計に利用することに同意します（任意）。<Link href="/about" className="ml-1 underline">保存・削除の説明</Link></span></label>
                        <Button disabled={!saveConsent||busy} onClick={()=>saveGrades(analysisData.grades)}>{busy?'処理中…':'同意した内容を共有保存'}</Button>
                        {saveMessage&&<p role="status" className="text-sm">{saveMessage}</p>}
                        <div className="border-t pt-5"><h3 className="text-sm font-semibold">データを削除する</h3><p className="mt-2 mb-3 text-xs text-muted-foreground">サーバーとこのブラウザの成績を削除します。実行前に確認します。</p><Button variant="outline" disabled={busy} onClick={deleteGrades} className="text-destructive">成績データを削除</Button></div>
                        </>}
                        <div className="border-t pt-5"><p className="mb-3 text-xs text-muted-foreground">{demo?'自分の成績を取り込む画面へ移動します。':'この端末の分析をリセットして、ファイルを選び直します。サーバーの保存データは削除されません。'}</p><Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4"/>{demo?'自分の成績を取り込む':'ファイルを選び直す'}</Button></div>
                    </TabsContent>
                </Tabs>
                <div className="flex justify-end border-t px-5 py-4"><Button onClick={()=>settingsRef.current?.close()}>完了</Button></div>
            </dialog>
        </div>
    );
}
