"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import GradeAnalysis from "@/components/dashboard/GradeAnalysis";
import type { AggregateStats } from "@/lib/types";

export default function Dashboard() {
    const [sessionId, setSessionId] = useState('');
    const [stats, setStats] = useState<AggregateStats | null>(null);
    const [staleData, setStaleData] = useState(false);

    useEffect(() => {
        let id = localStorage.getItem('handai_session_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('handai_session_id', id);
        }
        setSessionId(id);

        const rawAnalysis = localStorage.getItem('handai_analysis_data');
        const params = new URLSearchParams();
        if (rawAnalysis) {
            // パーソナライズ統計は gpa + session_id の両方が必要
            params.set('gpa', String((JSON.parse(rawAnalysis) as { gpa: { cumulative: number } }).gpa.cumulative));
            params.set('session_id', id);
        }

        fetch(`/api/stats?${params}`)
            .then(r => r.ok ? r.json() : null)
            .then((s: AggregateStats | null) => { if (s) setStats(s); })
            .catch(() => {});

        fetch(`/api/session-info?session_id=${id}`)
            .then(r => r.json())
            .then(({ stale }: { stale: boolean }) => setStaleData(stale))
            .catch(() => {});
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
                        楽単検索
                    </Link>
                </Button>
            </header>

            <main className="flex-1 w-full">
                <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
                    <div className="mb-5 flex flex-col gap-1">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Dashboard</p>
                        <h1 className="text-2xl font-black tracking-tight">マイ成績・解析</h1>
                    </div>
                    <GradeAnalysis
                        stats={stats}
                        sessionId={sessionId}
                        onStatsUpdate={setStats}
                        staleData={staleData}
                    />
                </div>
            </main>
        </div>
    );
}
