import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { aggregateLearning, type CreditSnapshot } from '@/lib/learning-stats';
/** No arbitrary subgroup/percentile query: publish only fixed protected aggregates. */
export async function GET() {
    try {
        const rows: CreditSnapshot[]=[];
        const db=getSupabaseAdmin();
        for(let offset=0;offset<=10000;offset+=100) {
            const {data,error}=await db.from('credit_snapshots').select('session_id,faculty,grades,profile').order('session_id').range(offset,offset+99);
            if(error || offset===10000) throw new Error('Incomplete aggregate');
            rows.push(...(data??[]) as CreditSnapshot[]);
            if(!data || data.length<100) return NextResponse.json(aggregateLearning(rows),{headers:{'Cache-Control':'public, s-maxage=3600'}});
        }
    } catch { return NextResponse.json({error:'比較データを取得できません。端末内の分析は利用できます。'},{status:503}); }
}
