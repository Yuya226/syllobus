"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradeAnalysis from "@/components/dashboard/GradeAnalysis";
import type { AggregateStats } from "@/lib/types";

export default function Dashboard() {
    const [demo, setDemo] = useState<boolean | null>(null);
    const [sessionError, setSessionError] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [stats, setStats] = useState<AggregateStats | null>(null);
    const [staleData, setStaleData] = useState(false);

    useEffect(() => {
        const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
        // URL is browser-owned state; initialize after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDemo(isDemo);
        if (isDemo) return;
        fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: localStorage.getItem('handai_session_id') }),
        }).then(async r => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            if (data.replaced) setSessionError('以前のサーバー保存データの所有権を確認できないため、新しいセッションを作成しました。端末の成績は残ります。以前のサーバーデータの削除は運営へお問い合わせください。');
            localStorage.setItem('handai_session_id', data.session_id);
            setSessionId(data.session_id);
            const info = await fetch(`/api/session-info?session_id=${data.session_id}`);
            if (info.ok) setStaleData((await info.json()).stale);
        }).catch(e => setSessionError(e.message));
        fetch('/api/stats').then(r => r.ok ? r.json() : null)
            .then((s: AggregateStats | null) => { if (s) setStats(s); }).catch(() => {});
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/85 px-4 shadow-sm backdrop-blur-md md:px-8 justify-between">
                <Link href="/" className="flex items-center gap-1.5 font-bold text-lg text-primary hover:opacity-80 transition-opacity">
                    <TrendingUp className="h-5 w-5" />
                    Syllobus
                </Link>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link href="/search">
                        <Search className="h-3.5 w-3.5" />
                        科目検索
                    </Link>
                </Button>
            </header>

            <main className="flex-1 w-full">
                <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
                    <div className="mb-5 flex flex-col gap-1">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Dashboard</p>
                        <h1 className="text-2xl font-black tracking-tight">マイ成績・解析</h1>
                    </div>
                    {sessionError && <p role="alert" className="mb-4 text-sm text-amber-700">{sessionError}</p>}
                    {demo !== null && <GradeAnalysis
                        demo={demo}
                        stats={stats}
                        sessionId={sessionId}
                        onStatsUpdate={setStats}
                        staleData={staleData}
                    />}
                </div>
            </main>
        </div>
    );
}
