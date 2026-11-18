import { NextRequest, NextResponse } from 'next/server';
import { ownsSession, sameOrigin } from '@/lib/session-auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sanitizeCreditSnapshot } from '@/lib/credit-snapshot';
const headers = {'Cache-Control':'private, no-store'};
export async function POST(req: NextRequest) {
    if (!sameOrigin(req)) return NextResponse.json({error:'Forbidden'},{status:403});
    const body=await req.json().catch(()=>null);
    if (!ownsSession(req,body?.session_id)) return NextResponse.json({error:'保存権限を確認できません。'},{status:403});
    const snapshot=body && body.consent === true ? sanitizeCreditSnapshot(body) : null;
    if(!snapshot) return NextResponse.json({error:'学部・成績・比較条件と保存への同意を確認してください。'},{status:400});
    const limited=await checkRateLimit(req); if(limited) return limited;
    try {
        const {error}=await getSupabaseAdmin().rpc('replace_credit_snapshot',{target_session:body.session_id,payload:snapshot});
        if(error) throw error;
        return NextResponse.json({ok:true},{headers});
    } catch { return NextResponse.json({error:'共有保存を利用できません。データは端末に保持しています。運営側のDB設定が必要な場合があります。'},{status:503,headers}); }
}
export async function GET(req: NextRequest) {
    const id=req.nextUrl.searchParams.get('session_id');
    if(!ownsSession(req,id)) return NextResponse.json({error:'Forbidden'},{status:403});
    try {
        const {data,error}=await getSupabaseAdmin().from('credit_snapshots').select('faculty,grades,profile').eq('session_id',id).maybeSingle();
        if(error) throw error;
        return NextResponse.json({snapshot:data},{headers});
    } catch { return NextResponse.json({error:'復元を利用できません。'},{status:503,headers}); }
}
export async function DELETE(req: NextRequest) {
    const id=req.nextUrl.searchParams.get('session_id');
    if(!sameOrigin(req)||!ownsSession(req,id)) return NextResponse.json({error:'Forbidden'},{status:403});
    try {
        const {error}=await getSupabaseAdmin().rpc('delete_session_records',{target_session:id});
        if(error) throw error;
        return NextResponse.json({ok:true},{headers});
    } catch { return NextResponse.json({error:'サーバーの削除に失敗しました。再試行してください。'},{status:503,headers}); }
}
