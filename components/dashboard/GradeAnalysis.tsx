"use client";

import { DEMO_GRADES } from "@/lib/demo";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotateCcw, ListChecks } from "lucide-react";
import { FACULTY_OPTIONS } from "@/lib/types";
import type { AnalysisResult, AggregateStats, Faculty, Grade } from "@/lib/types";
import { calculateGPA } from "@/lib/gpa";
import { getTotalRequiredCredits } from "@/lib/requirements";
import GradeReview from "@/components/dashboard/GradeReview";
import UploadPanel from "@/components/dashboard/UploadPanel";
import GpaDeviationCard from "@/components/dashboard/GpaDeviationCard";
import LearningProfileEditor from './LearningProfileEditor';
import LearningInsights from './LearningInsights';
import { EMPTY_PROFILE, validProfile, type LearningProfile } from '@/lib/learning-profile';
import StatsPanel from "@/components/dashboard/StatsPanel";

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
    const reviewRef = useRef<HTMLDivElement>(null);
    const [reviewWarning, setReviewWarning] = useState('');
    const [importInfo, setImportInfo] = useState<AnalysisResult['importInfo']>();
    const [profile, setProfile] = useState<LearningProfile>(() => {
        if (demo || typeof window === 'undefined') return EMPTY_PROFILE;
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
    const [faculty, setFaculty] = useState<Faculty | ''>(() => {
        if (demo) return "経済学部";
        if (typeof window === "undefined") return '';
        return (localStorage.getItem('handai_faculty') as Faculty | null) ?? '';
    });
    // localStorage にデータがなく session_id がある場合、Supabase から復元が必要な可能性がある
    const [restoring, setRestoring] = useState(false);

    // localStorage が空でも session_id が Supabase にあれば成績を復元する
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
                    <span>確認した成績・大学の区分・修得学期・学部と入力した比較条件をSupabaseに保存し、復元と統計に利用することに同意します（任意）。未選択ならこのブラウザ内のみに保存します。<Link href="/about" className="underline">保存・削除の説明</Link></span>
                </label>
                {reviewWarning && <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{reviewWarning}</p>}
                {pendingGrades.every(g=>g.categorySource==='university-csv') && <LearningProfileEditor grades={pendingGrades} value={profile} onChange={changeProfile}/>}
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

    return (
        <div className="space-y-5">
            {demo && <div className="rounded border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">デモモード：単位修得CSVの形式を再現した、架空の経済学部生の成績です。サーバーへの送信・保存や実際の学生との比較は行いません。</div>}
            {!demo && <label className="block text-sm">学部 <select className="rounded border p-2" value={faculty} onChange={e=>{setFaculty(e.target.value as Faculty);localStorage.setItem('handai_faculty',e.target.value);}}><option value="">選択してください</option>{FACULTY_OPTIONS.map(f=><option key={f}>{f}</option>)}</select></label>}
            {!demo && <div className="space-y-2 text-sm"><p role="status">{saveMessage}</p><div className="flex flex-wrap gap-2">
                <label className="flex gap-2"><input type="checkbox" checked={saveConsent} onChange={e=>setSaveConsent(e.target.checked)}/>成績・区分・比較条件の共有保存に同意する（任意）</label>
                {saveConsent && <Button disabled={busy} variant="outline" onClick={() => saveGrades(analysisData.grades)}>確認した内容を共有保存</Button>}
                <Button disabled={busy} variant="outline" onClick={deleteGrades}>サーバー・端末の成績を削除</Button>
            </div></div>}
            {staleData && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
                    <p className="text-amber-800 dark:text-amber-300">
                        解析精度が向上しました。再アップロードするとより正確なデータになります。
                    </p>
                    <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100">
                        再アップロード
                    </Button>
                </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
                {!demo && <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link href="/courses">
                        <ListChecks className="h-4 w-4" />
                        成績を編集
                    </Link>
                </Button>}
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    もう一度
                </Button>
            </div>

            {!demo && !analysisData.importInfo && <GpaDeviationCard
                analysisData={analysisData}
                stats={stats}
                deviation={deviation}
                participantCount={participantCount}
            />}

            {demo && <details className="rounded border p-3"><summary>サンプル成績一覧（架空）</summary><ul className="mt-3 space-y-2 text-sm">{analysisData.grades.map(g => <li key={g.subject}>{g.subject}：{g.grade}／{g.credits}単位／{g.year}年度</li>)}</ul></details>}
            {analysisData.importInfo && !demo && <p className="rounded border bg-card p-4 text-sm">大学CSV記載の通算GPA：{analysisData.importInfo.officialGpa ?? '記載なし'}。以下のGPAは取込明細のみの参考計算です。不合格・再履修等の扱いにより大学の通算GPAと一致しない場合があります。</p>}
            {(analysisData.importInfo || demo) && <><LearningProfileEditor grades={analysisData.grades} value={profile} onChange={changeProfile}/><LearningInsights grades={analysisData.grades} faculty={faculty} profile={profile} demo={demo}/></>}
            <StatsPanel
                analysisData={analysisData}
                stats={demo || analysisData.importInfo ? null : stats}
                faculty={faculty}
            />
        </div>
    );
}
