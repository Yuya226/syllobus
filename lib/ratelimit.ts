import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
let limiter: Ratelimit | undefined;
export async function checkRateLimit(req: Request): Promise<Response | null> {
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Rate limiter unavailable');
        limiter ??= new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '1 h'), analytics: false });
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'anonymous';
        const { success } = await limiter.limit(ip);
        if (!success) return Response.json({ error: '利用回数の上限に達しました。時間をおいて再試行してください。' }, { status: 429 });
    } catch {
        return Response.json({ error: '解析・保存機能は一時的に利用できません。サンプルデータをご利用ください。' }, { status: 503 });
    }
    return null;
}
