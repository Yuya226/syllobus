import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { AggregateStats, HardCourse, Grade, Faculty } from './types';
import type { LearningProfile } from './learning-profile';
import type { Subject } from './subjects';

// Small, parameterized compatibility layer for the queries used by existing routes.
// No public SQL endpoint and no browser database credentials.
interface Row extends Subject {
    session_id: string; faculty: Faculty; subject_name: string; course_code: string | null;
    grade: Grade['grade']; session_gpa: number; parser_version: number;
    grades: Grade[]; profile: LearningProfile;
}
const columns = new Set(['id','code','name','category','credits','teacher','semester','source','year','session_id','faculty','subject_name','course_code','grade','session_gpa','parser_version','grades','profile']);
const tables = new Set(['subjects','grade_submissions','credit_snapshots']);
function column(value:string) { if(!columns.has(value)) throw new Error('Unsupported column'); return `"${value}"`; }
const error = {code:'D1_ERROR',message:'Database operation failed'};
async function db() { const {env}=await getCloudflareContext({async:true}); if(!env.DB) throw new Error('D1 binding unavailable'); return env.DB; }
class Query implements PromiseLike<{data:Row[]|null;error:typeof error|null}> {
    private fields='*'; private conditions:string[]=[]; private args:(string|number|null)[]=[];
    private ordering=''; private offset=0; private count=10001; private deleting=false;
    constructor(private table:string) { if(!tables.has(table)) throw new Error('Unsupported table'); }
    select(fields:string) { this.fields=fields.split(',').map(v=>column(v.trim())).join(','); return this; }
    eq(field:string,value:string|number|null) { this.conditions.push(`${column(field)} = ?`);this.args.push(value);return this; }
    in(field:string,values:(string|number)[]) { this.conditions.push(values.length ? `${column(field)} IN (SELECT value FROM json_each(?))` : '0'); if(values.length)this.args.push(JSON.stringify(values));return this; }
    ilike(field:string,value:string) { this.conditions.push(`${column(field)} LIKE ?`);this.args.push(value);return this; }
    order(field:string) {this.ordering=` ORDER BY ${column(field)}`;return this;}
    range(from:number,to:number) {this.offset=from;this.count=to-from+1;return this;}
    delete() {this.deleting=true;return this;}
    async execute() {
        try {
            const binding=await db(); const where=this.conditions.length?' WHERE '+this.conditions.join(' AND '):'';
            if(this.deleting) {if(!this.conditions.length)throw new Error('Unbounded delete');await binding.prepare(`DELETE FROM ${this.table}${where}`).bind(...this.args).run();return {data:[],error:null};}
            const result=await binding.prepare(`SELECT ${this.fields} FROM ${this.table}${where}${this.ordering} LIMIT ? OFFSET ?`).bind(...this.args,this.count,this.offset).all<Row>();
            if(this.count===10001 && result.results.length>=10001)throw new Error('Query requires pagination');
            const rows=result.results.map(row=>{
                if(this.table==='credit_snapshots')return {...row, ...(typeof row.grades==='string'?{grades:JSON.parse(row.grades)}:{}),...(typeof row.profile==='string'?{profile:JSON.parse(row.profile)}:{})};
                return row;
            });
            return {data:rows,error:null};
        }catch{return {data:null,error};}
    }
    async maybeSingle() {const r=await this.execute();if(r.error || (r.data?.length??0)>1)return {data:null,error};return {data:r.data?.[0]??null,error:null};}
    then<TResult1={data:Row[]|null;error:typeof error|null}, TResult2=never>(resolve?:((value:{data:Row[]|null;error:typeof error|null})=>TResult1|PromiseLike<TResult1>)|null,reject?:((reason:unknown)=>TResult2|PromiseLike<TResult2>)|null):PromiseLike<TResult1|TResult2>{return this.execute().then(resolve,reject);}
}
export function getD1Client() {
    return {
        from:(table:string)=>new Query(table),
        async rpc(name:string,args:Record<string,unknown>):Promise<{data:AggregateStats|null;error:typeof error|null}> {
            try {
                const binding=await db();const id=String(args.target_session??'');
                if(name==='get_aggregate_stats') {
                    const {results}=await binding.prepare('SELECT session_id, MAX(session_gpa) AS gpa FROM grade_submissions GROUP BY session_id LIMIT 10001').all<{session_id:string;gpa:number}>();
                    if(results.length>10000)throw new Error('Aggregate too large');
                    const hard=await binding.prepare(`WITH unique_courses AS (
                        SELECT session_id,subject_name,MIN(grade) AS grade FROM grade_submissions GROUP BY session_id,subject_name
                    ) SELECT subject_name,COUNT(*) AS totalCount,1.0*SUM(grade='F')/COUNT(*) AS failRate
                    FROM unique_courses GROUP BY subject_name HAVING COUNT(*)>=10 AND SUM(grade='F')>0 AND SUM(grade='F')<COUNT(*)
                    ORDER BY failRate DESC LIMIT 10`).all<HardCourse>();
                    const mean=results.reduce((n,r)=>n+r.gpa,0)/(results.length||1);
                    const variance=results.reduce((n,r)=>n+(r.gpa-mean)**2,0)/(results.length||1);
                    return {data:{totalParticipants:results.length,averageGpa:Math.round(mean*100)/100,stdDev:Math.sqrt(variance),userPercentile:null,facultyBreakdown:{},facultyGpaBreakdown:{},hardCourses:hard.results},error:null};
                }
                if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid session');
                const removeOld=binding.prepare('DELETE FROM grade_submissions WHERE session_id=?').bind(id);
                const removeNew=binding.prepare('DELETE FROM credit_snapshots WHERE session_id=?').bind(id);
                if(name==='delete_session_records') await binding.batch([removeOld,removeNew]);
                else if(name==='replace_credit_snapshot') {
                    const payload=args.payload as {faculty:string;grades:Grade[];profile:LearningProfile};
                    await binding.batch([removeOld,binding.prepare('INSERT INTO credit_snapshots(session_id,faculty,grades,profile) VALUES(?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET faculty=excluded.faculty,grades=excluded.grades,profile=excluded.profile,updated_at=CURRENT_TIMESTAMP').bind(id,payload.faculty,JSON.stringify(payload.grades),JSON.stringify(payload.profile))]);
                } else if(name==='replace_session_grades') {
                    const rows=args.new_rows as Row[];
                    if(!Array.isArray(rows)||!rows.length||rows.length>500||rows.some(r=>r.session_id!==id))throw new Error('Invalid rows');
                    await binding.batch([removeNew,removeOld,binding.prepare(`INSERT INTO grade_submissions(session_id,faculty,subject_name,course_code,grade,credits,year,session_gpa,parser_version)
                    SELECT json_extract(value,'$.session_id'),json_extract(value,'$.faculty'),json_extract(value,'$.subject_name'),json_extract(value,'$.course_code'),json_extract(value,'$.grade'),json_extract(value,'$.credits'),json_extract(value,'$.year'),json_extract(value,'$.session_gpa'),json_extract(value,'$.parser_version') FROM json_each(?) WHERE 1 ON CONFLICT(session_id,subject_name,year,grade) DO NOTHING`).bind(JSON.stringify(rows))]);
                } else throw new Error('Unsupported operation');
                return {data:null,error:null};
            }catch{return {data:null,error};}
        },
    };
}
