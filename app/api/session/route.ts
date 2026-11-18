import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, makeWriteToken, ownsSession, sameOrigin } from '@/lib/session-auth';

export async function POST(req: NextRequest) {
    if (!sameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!authConfigured()) return NextResponse.json({ error: '保存機能は設定確認中です。サンプルをご利用ください。' }, { status: 503 });
    const body = await req.json().catch(() => null);
    const id = ownsSession(req, body?.session_id) ? body.session_id : randomUUID();
    const res = NextResponse.json({ session_id: id, replaced: !!body?.session_id && body.session_id !== id }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set('swt', makeWriteToken(id), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 31536000,
    });
    return res;
}
