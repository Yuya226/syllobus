'use client';
import { useEffect, useState } from 'react';
import type { LearningStats } from '@/lib/learning-stats';

/** One public aggregate request for both dashboard tabs; no grade data is sent. */
export function useLearningStats(enabled: boolean) {
    const [stats, setStats] = useState<LearningStats | null>(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        let active = true;
        const timer = setTimeout(() => controller.abort(), 10000);
        async function load() {
            setBusy(true); setMessage('');
            try {
                const response = await fetch('/api/learning-stats', { signal: controller.signal });
                if (!response.ok) throw new Error('Unavailable');
                const data: LearningStats = await response.json();
                if (active) setStats(data);
            } catch {
                if (active) setMessage('比較データを取得できませんでした。');
            } finally {
                clearTimeout(timer);
                if (active) setBusy(false);
            }
        }
        void load();
        return () => { active = false; clearTimeout(timer); controller.abort(); };
    }, [enabled, attempt]);
    return { stats, message, busy, retry: () => setAttempt(n => n + 1) };
}
