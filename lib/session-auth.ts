import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function authConfigured() {
    const secret = process.env.WRITE_TOKEN_SECRET;
    return !!secret && secret.length >= 32 && secret !== 'dev-secret-change-me';
}
export function makeWriteToken(id: string) {
    if (!authConfigured()) throw new Error('WRITE_TOKEN_SECRET must contain at least 32 characters');
    return createHmac('sha256', process.env.WRITE_TOKEN_SECRET!).update(id).digest('hex');
}
export function ownsSession(req: NextRequest, id: unknown): id is string {
    if (typeof id !== 'string' || !UUID_RE.test(id) || !authConfigured()) return false;
    const token = req.cookies.get('swt')?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(makeWriteToken(id), 'hex'));
}
export function sameOrigin(req: NextRequest) {
    const origin = req.headers.get('origin');
    if (!origin) return false;
    try {
        const url = new URL(origin);
        // Next may normalize nextUrl to localhost behind its internal proxy.
        // The browser's Origin must match the actual incoming Host, never a wildcard.
        return ['http:', 'https:'].includes(url.protocol) &&
            url.host === (req.headers.get('host') ?? req.nextUrl.host) &&
            url.protocol === req.nextUrl.protocol;
    } catch { return false; }
}
