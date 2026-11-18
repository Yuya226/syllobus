import type { Grade } from './types';
import { validGrades } from './validate-grades';

export const ENRICHMENT_WARNING = 'CSVは読み取れましたが、科目情報をサーバーで照合できませんでした。単位数は推定値、科目分類は未照合です。元の成績と照合・修正してから確定してください。';

/** Enrichment is optional. Never discard a locally parsed CSV on service failure. */
export async function enrichForReview(
    grades: Grade[],
    { fetcher = fetch, timeoutMs = 8000 }: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<{ grades: Grade[]; warning?: string }> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const request = (async () => {
            const response = await fetcher('/api/enrich', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grades }), signal: controller.signal,
            });
            if (!response.ok) throw new Error('Enrichment unavailable');
            const data = await response.json();
            if (!validGrades(data.grades, true) || data.grades.length !== grades.length) throw new Error('Invalid enrichment response');
            return { grades: data.grades };
        })();
        return await Promise.race([
            request,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => { controller.abort(); reject(new Error('Enrichment timeout')); }, timeoutMs);
            }),
        ]);
    } catch {
        return { grades, warning: ENRICHMENT_WARNING };
    } finally { if (timer !== undefined) clearTimeout(timer); }
}
