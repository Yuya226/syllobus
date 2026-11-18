import { createHmac } from 'node:crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
let limiter: Ratelimit | undefined;
export async function checkRateLimit(req: Request): Promise<Response | null> {
    try {
        if (process.env.DATABASE_PROVIDER === 'd1') {
            if (!process.env.WRITE_TOKEN_SECRET) throw new Error('Rate limiter secret missing');
            const now = Date.now();
            const window = Math.floor(now / 3_600_000);
            const ip = req.headers.get('cf-connecting-ip') ?? 'anonymous';
            const bucket = createHmac('sha256', process.env.WRITE_TOKEN_SECRET).update(`${window}:${ip}`).digest('hex');
            const {env} = await getCloudflareContext({async:true});
            const results = await env.DB.batch([
                env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now),
                env.DB.prepare('INSERT INTO rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(bucket,(window+2)*3_600_000),
            ]);
            return results[1].results.length ? null : Response.json({error:'利用回数の上限に達しました。時間をおいて再試行してください。'},{status:429});
        }
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw new Error('Rate limiter unavailable');
        limiter ??= new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '1 h'), analytics: false });
        const ip = (process.env.DATABASE_PROVIDER === 'd1' ? req.headers.get('cf-connecting-ip') : req.headers.get('x-forwarded-for')?.split(',')[0].trim()) ?? 'anonymous';
        const { success } = await limiter.limit(ip);
        if (!success) return Response.json({ error: '利用回数の上限に達しました。時間をおいて再試行してください。' }, { status: 429 });
    } catch {
        return Response.json({ error: '解析・保存機能は一時的に利用できません。サンプルデータをご利用ください。' }, { status: 503 });
    }
    return null;
}
