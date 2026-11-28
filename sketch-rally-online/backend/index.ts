const root=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origin="https://mohammaddhameri-blip.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"content-type,x-sro-session","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers});
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,"0")).join("");
async function db(path:string,method="GET",body?:unknown,prefer?:string){let r=await fetch(root+"/rest/v1/"+path,{method,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!r.ok)throw Error("db "+r.status);const data=await r.text();return data?JSON.parse(data):null}
const q=(t:string,p:Record<string,string>)=>t+"?"+new URLSearchParams(p).toString();
const rpc=(n:string,b:unknown)=>db("rpc/"+n,"POST",b);

// The roster remains private. Sessions are signed with a server-only key.
const enc=new TextEncoder();
const signingKey=crypto.subtle.importKey("raw",enc.encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
const sign=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",await signingKey,enc.encode(value))),x=>x.toString(16).padStart(2,"0")).join("");
const issue=async(id:string)=>{const v=id+"."+String(Math.floor(Date.now()/1000)+28800);return v+"."+await sign("sro-roster-session:"+v)};
async function sessionId(token:string){
 const match=/^([a-f0-9-]{36})\.(\d{10})\.([a-f0-9]{64})$/.exec(token);
 if(!match||Number(match[2])<=Math.floor(Date.now()/1000))return null;
 const bytes=Uint8Array.from(match[3].match(/../g)!,v=>parseInt(v,16));
 return await crypto.subtle.verify("HMAC",await signingKey,bytes,enc.encode("sro-roster-session:"+match[1]+"."+match[2]))?match[1]:null;
}
function eligible(s:any){return /^(?:[2-6] (?:CEMERLANG|GEMILANG|TERBILANG)|TESTERS|TEST CLASS)$/i.test(s.class_name||"")}
function codes(v:unknown){
 if(typeof v!=="string")return [];
 let c=v.trim().toUpperCase();
 if(/^(?:TST|TEST)-?\d{3}$/.test(c)){c=c.replace("-","");return [c,c.replace(/(\d{3})$/,"-$1")]}
 if(/^Y[2-6]-?\d{3}$/.test(c)){c=c.replace("-","");return [c,c.replace(/(\d{3})$/,"-$1")]}
 if(/^2[CGT][A-Z0-9]{4}$/.test(c))return [c];
 return [];
}
async function failCount(k:string,seconds:number){const r=await db(q("sro_limits",{select:"hits,bucket",key:"eq."+k,limit:"1"}));return r.length&&Number(r[0].bucket)===Math.floor(Date.now()/1000/seconds)?Number(r[0].hits):0}

// Replay data is unverified client gameplay, bounded and validated before storage.
function validReplay(v:any,p:any){
 if(!v||v.version!==1||typeof v.image!=="string"||v.image.length>1900000||!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(v.image))return false;
 // Only the game's 760 × 350 source canvas is accepted; prevent oversized image decodes.
 try{const h=Uint8Array.from(atob(v.image.slice(22,54)),c=>c.charCodeAt(0));const d=new DataView(h.buffer);
 if(d.getUint32(0)!==0x89504e47||d.getUint32(4)!==0x0d0a1a0a||d.getUint32(12)!==0x49484452||d.getUint32(16)!==760||d.getUint32(20)!==350)return false;
 }catch{return false}
 const f=v.frames,finish=p.mode==="auto_drag"?4230:84030;
 if(!Array.isArray(f)||f.length<2||f.length>7300)return false;
 let last=-1,furthest=30;
 for(const row of f){
  if(!Array.isArray(row)||row.length!==4||!row.every(Number.isFinite))return false;
  const [t,x,y,angle]=row;
  if(t<0||t>901||t<=last||last>=0&&t-last>.151||x<29.99||x>finish+.02||Math.abs(y)>100000||Math.abs(angle)>7000)return false;
  if(last<0&&(t!==0||Math.abs(x-30)>.02))return false;
  last=t;furthest=Math.max(furthest,x);
 }
 if(Math.abs(last-p.time)>.015||p.done&&Math.abs(f[f.length-1][1]-finish)>.03)return false;
 const max=p.mode==="auto_drag"?1000:20000;
 if(Math.abs((furthest-30)*max/(finish-30)-p.distance)>5)return false;
 return true;
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 if(req.headers.get("origin")&&req.headers.get("origin")!==origin)return reply({error:"Origin not allowed"},403);
 try{
 if(Number(req.headers.get("content-length")||0)>2700000)return reply({error:"Too large"},413);
 const bytes=await req.arrayBuffer();if(bytes.byteLength>2700000)return reply({error:"Too large"},413);
 let b;try{b=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply({error:"Invalid request"},400)}
 if(!b||typeof b!=="object")return reply({error:"Invalid request"},400);
 const rooms=await db(q("sro_school_rooms",{select:"id",enabled:"eq.true",limit:"2"}));if(rooms.length!==1)return reply({error:"School game unavailable."},503);
 const room=rooms[0].id;
 let student:any;
 if(b.action==="login"){
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")?.split(",")[0].trim()||"unknown";
  const ipKey="roster-login-fail:"+await hash(ip), globalKey="roster-login-fail:global";
  if(await failCount(ipKey,600)>=12||await failCount(globalKey,60)>=50)return reply({error:"Too many incorrect attempts. Please try again later."},429);
  const variants=codes(b.code);
  const found=variants.length?await db(q("students",{select:"id,display_name,class_name",pupil_code:"in.("+variants.join(",")+")",limit:"2"})):[];
  if(found.length!==1||!eligible(found[0])){
   await rpc("sro_throttle",{p_key:ipKey,p_max:12,p_seconds:600});
   await rpc("sro_throttle",{p_key:globalKey,p_max:50,p_seconds:60});
   return reply({error:"Code not recognised. Check your pupil or tester code."},401);
  }
  student=found[0];
 }else{
  const sid=await sessionId(req.headers.get("x-sro-session")||"");
  if(!sid)return reply({error:"Please log in again."},401);
  const found=await db(q("students",{select:"id,display_name,class_name",id:"eq."+sid,limit:"1"}));
  if(found.length!==1||!eligible(found[0]))return reply({error:"Please log in again."},401);
  student=found[0];
 }
 const dh=await hash("sro-roster-racer:"+student.id);
 if(!await rpc("sro_throttle",{p_key:"roster:"+dh,p_max:120,p_seconds:60}))return reply({error:"Please try again shortly."},429);
 let racers=await db(q("sro_simple_racers",{select:"id,name",room_id:"eq."+room,device_hash:"eq."+dh,limit:"1"}));
 if(b.action==="login"){
  if(!racers.length){await db(q("sro_simple_racers",{on_conflict:"room_id,device_hash"}),"POST",{room_id:room,device_hash:dh,name:student.display_name},"resolution=ignore-duplicates,return=minimal");racers=await db(q("sro_simple_racers",{select:"id,name",room_id:"eq."+room,device_hash:"eq."+dh,limit:"1"}))}
  if(!racers.length)throw Error("Racer unavailable");
  if(racers[0].name!==student.display_name)await db(q("sro_simple_racers",{id:"eq."+racers[0].id}),"PATCH",{name:student.display_name},"return=minimal");
  return reply({id:racers[0].id,name:student.display_name,className:student.class_name,session:await issue(student.id)});
 }
 if(!racers.length)return reply({error:"Please log in again."},401);
 const uid=racers[0].id;
 if(b.action==="board"){if(!["auto_drag","auto_challenge"].includes(b.mode))return reply({error:"Invalid track"},400);return reply({rows:await rpc("sro_simple_board",{p_room:room,p_mode:b.mode}),verified:false})}
 if(b.action==="ghosts"){if(!["auto_drag","auto_challenge"].includes(b.mode))return reply({error:"Invalid track"},400);return reply({rows:await rpc("sro_simple_ghosts",{p_room:room,p_racer:uid,p_mode:b.mode}),verified:false})}
 if(b.action==="submit"){
 let p=b.run;if(!p||!["auto_drag","auto_challenge"].includes(p.mode)||typeof p.done!=="boolean"||!Number.isFinite(p.time)||p.time<.01||p.time>901||!Number.isFinite(p.distance)||typeof p.name!=="string"||p.name.length>100)return reply({error:"Invalid race record"},400);
 const max=p.mode.endsWith("drag")?1000:20000;
 if(p.distance<0||p.distance>max||(p.done&&p.distance!==max)||(!p.done&&p.distance>=max)||p.time<(p.distance/(p.mode.endsWith("drag")?95:950))-.02)return reply({error:"Invalid race result"},400);
 const args={p_racer:uid,p_mode:p.mode,p_done:p.done,p_dist:p.distance,p_seconds:p.time,p_car:p.name};
 if(p.replay!==undefined){
  if(!validReplay(p.replay,p))return reply({error:"Invalid replay"},400);
  await rpc("sro_simple_submit_replay",{...args,p_payload:{version:1,image:p.replay.image,frames:p.replay.frames}});
 }else await rpc("sro_simple_submit",args);
 return reply({ok:true,verified:false});
 }
 if(b.action==="save"){
 let p=b.car;if(!p||typeof p.id!=="string"||!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||typeof p.name!=="string"||p.name.length>100||typeof p.image!=="string"||!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(p.image))return reply({error:"Invalid car"},400);
 await db(q("sro_simple_cars",{on_conflict:"racer_id,local_id"}),"POST",{racer_id:uid,local_id:p.id,payload:p},"resolution=ignore-duplicates,return=minimal");return reply({ok:true})
 }
 if(b.action==="cars"){let offset=Number.isInteger(b.offset)?Math.max(0,Math.min(100000,b.offset)):0;let rows=await db(q("sro_simple_cars",{racer_id:"eq."+uid,select:"payload",order:"local_id.asc",limit:"10",offset:String(offset)}));return reply({items:rows.map((r:any)=>r.payload),next:rows.length===10?offset+10:null})}
 return reply({error:"Unknown action"},400);
 }catch(_){return reply({error:"Could not connect. Try again."},500)}
});