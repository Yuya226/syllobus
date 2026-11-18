/** Read-only recovery export. Does not write either database or log personal rows. */
import dotenv from 'dotenv';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const tables={
 subjects:{key:'id',columns:'id,code,name,category,credits,teacher,semester,source,year'},
 grade_submissions:{key:'id',columns:'id,session_id,faculty,subject_name,course_code,grade,credits,year,session_gpa,parser_version'},
 credit_snapshots:{key:'session_id',columns:'session_id,faculty,grades,profile,updated_at'},
};
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
export async function readAll(table,request,pageSize=500) {
 const def=tables[table];if(!def)throw new Error('Unknown source table');
 const rows=[],seen=new Set();let total=null;
 do {
  const r=await request(`${table}?select=${def.columns}&order=${def.key}.asc&offset=${rows.length}&limit=${pageSize}`);
  if(!r.ok)throw new Error(`${table}: HTTP ${r.status}; export stopped`);
  const match=/\/(\d+)$/.exec(r.headers.get('content-range')??'');
  if(!match)throw new Error(`${table}: exact count unavailable`);
  const count=Number(match[1]);
  if(count>500000||(total!==null&&count!==total))throw new Error(`${table}: source changed or size exceeds safety limit`);
  total=count;
  const page=await r.json();
  if(!Array.isArray(page)||page.length>pageSize||(!page.length&&rows.length<total))throw new Error(`${table}: incomplete page`);
  for(const row of page) {
   if(!row||typeof row!=='object'||!(def.key in row)||seen.has(String(row[def.key])))throw new Error(`${table}: invalid/duplicate primary key`);
   seen.add(String(row[def.key]));
   if(Object.keys(row).some(k=>!def.columns.split(',').includes(k)))throw new Error(`${table}: unexpected fields`);
   rows.push(row);
  }
  if(rows.length>total)throw new Error(`${table}: inconsistent count`);
 } while(rows.length<total);
 return rows;
}
export async function exportLegacy() {
 dotenv.config({path:'.env.local',quiet:true});
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=(process.env.SUPABASE_SERVICE_ROLE_KEY??'').replace(/^"|"$/g,'');
 if(!base||!key||new URL(base).protocol!=='https:')throw new Error('Source configuration unavailable');
 const headers={apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact'};
 const request=(path,method='GET')=>fetch(`${base}/rest/v1/${path}`,{method,headers,signal:AbortSignal.timeout(30000)});
 // Missing tables are a blocked source, never an empty backup.
 for(const table of Object.keys(tables)) {
  const r=await request(`${table}?select=${tables[table].key}&limit=0`,'HEAD');
  if(!r.ok)throw new Error(`${table}: HTTP ${r.status}; no export created, no database writes`);
 }
 const snapshot={};
 for(const table of Object.keys(tables))snapshot[table]=await readAll(table,request);
 // A second pass detects concurrent updates/deletions even when counts are unchanged.
 for(const table of Object.keys(tables)) {
  if(digest(await readAll(table,request))!==digest(snapshot[table]))throw new Error(`${table}: source changed during export; retry with source writes disabled`);
 }
 const dir=await mkdtemp(join(tmpdir(),'syllobus-legacy-'));
 try {
  const manifest={version:1,exportedAt:new Date().toISOString(),source:new URL(base).hostname,tables:{}};
  for(const [table,rows] of Object.entries(snapshot)) {
   const payload=JSON.stringify(rows);
   await writeFile(join(dir,table+'.json'),payload,{mode:0o600,flag:'wx'});
   manifest.tables[table]={count:rows.length,sha256:digest(rows)};
  }
  await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});
  console.log('Private recovery export:',dir);
  for(const [table,meta] of Object.entries(manifest.tables))console.log(`${table}: ${meta.count} rows, checksum recorded`);
  console.log('No database writes. Keep this directory private. Validate source schema and target session conflicts before importing.');
 } catch(e) {await rm(dir,{recursive:true,force:true});throw e;}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 exportLegacy().catch(e=>{
  // Provider errors may contain credentials/rows: only emit our sanitized diagnostics.
  console.error(/^(subjects|grade_submissions|credit_snapshots):|^Source configuration/.test(e.message)?e.message:'Recovery export failed; no database writes.');
  process.exitCode=1;
 });
}
