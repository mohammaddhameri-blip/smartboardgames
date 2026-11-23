/* Sketch Battle v0.4: phone host pairing, precision controls, 30-entrant tournament. */
(function(){
"use strict";
const api=window.SketchBattleBridge;
if(!api){console.warn("Sketch Battle bridge was not loaded");return}
const $=id=>document.getElementById(id);
const DB_URL="https://qekcgsfeomjckctiubgm.supabase.co";
const DB_KEY="sb_publishable_yJbCYOLDeMreuqM01g_oqA_eF5YEWwq";
const STORE="sketchBattleCompetitionV04";
let client=null,channel=null,online=false,active=null,lastCount=-1;
let state={selected:[],rounds:[],champion:null};
try{const old=JSON.parse(localStorage.getItem(STORE)||"null");if(old&&Array.isArray(old.selected)&&Array.isArray(old.rounds))state=old}catch{}
const selected=new Set(state.selected.length?state.selected:api.getRoster().slice(0,30).map(b=>b.id));
const css=document.createElement("style");css.textContent=".sb-class{background:#162f41;border:1px solid #47647a;border-radius:12px;padding:12px;margin:10px 0}.sb-class h3{font-size:14px;margin:0 0 8px;color:#e5f6ff}.sb-class p{font-size:12px;color:#b1c6d5}.sb-flex{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.sb-flex>*{flex:1;min-width:0}.sb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.sb-grid button{min-height:40px}.sb-name-list,.sb-history{max-height:240px;overflow:auto;border:1px solid #36546b;padding:7px;border-radius:8px}.sb-name-list label{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px}.sb-name-list input{width:19px;height:19px}.sb-history div{border-bottom:1px solid #3a5264;padding:3px 0;font-size:12px}.sb-code{color:#c4f26b;font-size:23px;font-weight:900;letter-spacing:2px}.sb-class input[type=number]{width:90px;max-width:100%}";document.head.append(css);
const pairing=document.createElement("section");pairing.className="sb-class";
pairing.innerHTML='<h3>📱 Pair phone camera</h3><div id="sbCode" class="sb-code">—</div><p>On your phone, open the host page and enter this code. Each scan appears in the smartboard workshop for final adjustment.</p><div class="sb-flex"><button class="btn" id="sbConnect">Connect</button><button class="btn" id="sbNewCode">New code</button></div><p id="sbPairStatus">Offline</p><a id="sbPhoneLink" href="./phone.html" target="_blank" rel="noopener">Open phone host</a>';
$("workshopPanel").querySelectorAll(".section")[1].after(pairing);
const precision=document.createElement("section");precision.className="sb-class";
precision.innerHTML='<h3>🎯 Precision mounting</h3><div class="sb-flex"><select id="sbTarget" class="field"><option value="wheel0">Front wheel 1</option><option value="wheel1">Front wheel 2</option><option value="wheel2">Rear wheel 3</option><option value="wheel3">Rear wheel 4</option><option value="weapon">Weapon mount</option></select><select id="sbStep" class="field"><option value="1">1 px</option><option value="5" selected>5 px</option><option value="10">10 px</option></select></div><div class="sb-flex"><label>X <input id="sbX" class="field" type="number" min="20" max="780"></label><label>Y <input id="sbY" class="field" type="number" min="20" max="480"></label></div><div class="sb-grid"><span></span><button class="btn" data-sb-dir="0,-1">↑</button><span></span><button class="btn" data-sb-dir="-1,0">←</button><button id="sbAuto" class="btn">Auto-place</button><button class="btn" data-sb-dir="1,0">→</button><span></span><button class="btn" data-sb-dir="0,1">↓</button><span></span></div><p>Move wheels and weapon by 1 pixel if needed. Final mounting is checked before saving.</p>';
$("workshopPanel").querySelectorAll(".section")[2].append(precision);
const tournament=document.createElement("section");tournament.className="sb-class";
tournament.innerHTML='<h3>🏆 Class tournament · 30 pupils maximum</h3><p>Single-elimination bracket: two bots battle at a time and winners advance. Uneven brackets include automatic byes.</p><p id="sbEntrantCount">0 selected / 30</p><div id="sbNames" class="sb-name-list"></div><div class="sb-flex"><button class="btn" id="sbAll">Select up to 30</button><button class="btn" id="sbNone">Clear</button></div><button class="btn primary full" id="sbNewTournament">Create / restart tournament</button><p id="sbNextInfo">Choose participants to begin.</p><div class="sb-flex"><button class="btn primary" id="sbFightNext">⚔ Start next match</button><button class="btn" id="sbCSV">↓ Results CSV</button></div><div id="sbHistory" class="sb-history"></div>';
$("arenaPanel").append(tournament);
const getRoster=()=>api.getRoster(),name=id=>getRoster().find(b=>b.id===id)?.name||"Unknown bot";
function refreshPrecision(){
 const bot=api.getDraft(),t=$("sbTarget").value,p=t==="weapon"?bot.weapon:bot.wheels[Number(t.slice(5))];
 if(!p)return;
 if(document.activeElement!==$("sbX"))$("sbX").value=Math.round(p.x);
 if(document.activeElement!==$("sbY"))$("sbY").value=Math.round(p.y);
}
function precise(x,y){
 const t=$("sbTarget").value;
 api.moveEquipment(t==="weapon"?"weapon":"wheel",t==="weapon"?-1:Number(t.slice(5)),x,y);
 refreshPrecision();
}
$("sbTarget").onchange=refreshPrecision;
$("sbX").onchange=()=>{
 const b=api.getDraft(),t=$("sbTarget").value,p=t==="weapon"?b.weapon:b.wheels[Number(t.slice(5))];
 precise(Number($("sbX").value),p.y);
};
$("sbY").onchange=()=>{
 const b=api.getDraft(),t=$("sbTarget").value,p=t==="weapon"?b.weapon:b.wheels[Number(t.slice(5))];
 precise(p.x,Number($("sbY").value));
};
precision.querySelectorAll("[data-sb-dir]").forEach(button=>button.onclick=()=>{
 const [dx,dy]=button.dataset.sbDir.split(",").map(Number),t=$("sbTarget").value;
 const bot=api.getDraft(),p=t==="weapon"?bot.weapon:bot.wheels[Number(t.slice(5))],step=Number($("sbStep").value)||5;
 precise(p.x+dx*step,p.y+dy*step);
});
$("sbAuto").onclick=()=>{api.autoPlace();refreshPrecision()};
$("editor").addEventListener("pointerup",()=>setTimeout(refreshPrecision,0));
function code(){const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return Array.from(bytes,b=>alphabet[b%alphabet.length]).join("")}
let room=sessionStorage.getItem("sketchBattleRoomV04")||code();sessionStorage.setItem("sketchBattleRoomV04",room);
function showRoom(){$("sbCode").textContent=room;$("sbPhoneLink").href="./phone.html?room="+encodeURIComponent(room)}
showRoom();
async function send(event,payload={}){if(channel&&online)return channel.send({type:"broadcast",event,payload})}
function status(s){$("sbPairStatus").textContent=s}
function rosterMessage(){send("roster",{count:getRoster().length}).catch(()=>{})}
async function disconnect(){online=false;if(client&&channel)await client.removeChannel(channel);channel=null}
async function connect(){
 if(!window.supabase?.createClient){status("Pairing library unavailable. Check internet.");return}
 await disconnect();status("Opening room…");
 try{
  client=client||window.supabase.createClient(DB_URL,DB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const ch=client.channel("sketch-battle:classroom:"+room,{config:{private:false,broadcast:{ack:true}}});channel=ch;
  ch.on("broadcast",{event:"phone-hello"},async()=>{
   if(ch!==channel||!online)return;
   await send("board-ready",{version:"0.4"});rosterMessage();status("Phone connected ✓");
  });
  ch.on("broadcast",{event:"roster-request"},rosterMessage);
  const requests=new Set();
  ch.on("broadcast",{event:"snapshot"},async({payload})=>{
   if(ch!==channel||!online)return;
   const requestId=String(payload?.requestId||"").slice(0,100);
   if(!requestId)return;
   if(requests.has(requestId)){send("registration-result",{requestId,ok:true}).catch(()=>{});return}
   try{
    if(typeof payload?.image!=="string"||!/^data:image\/jpeg;base64,/.test(payload.image)||payload.image.length>330000)throw Error("Invalid or oversized photo");
    const pupil=String(payload?.name||"").trim().slice(0,40);
    if(!pupil)throw Error("Missing pupil or bot name");
    await api.importPhoto(payload.image,pupil);requests.add(requestId);
    if(requests.size>100)requests.clear();
    await send("registration-result",{requestId,ok:true});
    status("Received "+pupil+" · adjust and save on smartboard");refreshPrecision();
   }catch(error){send("registration-result",{requestId,ok:false,error:String(error.message||error).slice(0,90)}).catch(()=>{});status("Photo rejected: "+String(error.message||error))}
  });
  ch.subscribe(async s=>{
   if(ch!==channel)return;
   if(s==="SUBSCRIBED"){online=true;status("Room ready · connect your phone");await send("board-ready",{version:"0.4"})}
   if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(s)){online=false;status("Connection interrupted · reconnect")}
  });
 }catch{status("Could not open pairing room. Check internet.")}
}
$("sbConnect").onclick=connect;
$("sbNewCode").onclick=async()=>{await disconnect();room=code();sessionStorage.setItem("sketchBattleRoomV04",room);showRoom();status("New code created. Reconnect both devices.")};
function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{status("Competition backup failed: local storage is full.")}}
function shuffle(a){const result=a.slice();for(let i=result.length-1;i>0;i--){const b=new Uint32Array(1);crypto.getRandomValues(b);const j=b[0]%(i+1);[result[i],result[j]]=[result[j],result[i]]}return result}
function advance(){
 while(state.rounds.length&&state.rounds[state.rounds.length-1].every(m=>m.winner)){
  const round=state.rounds[state.rounds.length-1];
  if(round.length===1){state.champion=round[0].winner;return}
  const next=[];for(let i=0;i<round.length;i+=2)next.push({a:round[i].winner,b:round[i+1].winner,winner:null});
  state.rounds.push(next);
 }
}
function entrants(){
 const box=$("sbNames");box.innerHTML="";
 const bots=getRoster();
 if(!bots.length)box.textContent="No saved bots. Register pupil drawings in the Workshop.";
 bots.forEach(bot=>{
  const label=document.createElement("label"),ck=document.createElement("input");ck.type="checkbox";ck.checked=selected.has(bot.id);
  ck.onchange=()=>{
   if(ck.checked&&selected.size>=30){ck.checked=false;alert("Maximum 30 pupils in a tournament.");return}
   if(ck.checked)selected.add(bot.id);else selected.delete(bot.id);
   $("sbEntrantCount").textContent=selected.size+" selected / 30";
  };
  label.append(ck,document.createTextNode(bot.name+" · "+bot.weapon));box.append(label);
 });
 $("sbEntrantCount").textContent=selected.size+" selected / 30";
}
function renderTournament(){
 entrants();const history=$("sbHistory");history.innerHTML="";
 if(!state.rounds.length){$("sbNextInfo").textContent="Select 2–30 pupils to create the bracket.";$("sbFightNext").disabled=true;return}
 state.rounds.forEach((round,i)=>{
  const h=document.createElement("div");h.style.color="#c4ef75";h.textContent="Round "+(i+1);history.append(h);
  round.forEach(m=>{const line=document.createElement("div");line.textContent=name(m.a)+" vs "+(m.b?name(m.b):"BYE")+" · "+(m.winner?"✓ "+name(m.winner):"Pending");history.append(line)});
 });
 const next=state.rounds[state.rounds.length-1].find(m=>!m.winner);
 $("sbNextInfo").textContent=state.champion?"🏆 Champion: "+name(state.champion):
  active?"In progress: "+name(active.a)+" vs "+name(active.b):
  next?"Next: "+name(next.a)+" vs "+name(next.b)+" · round "+state.rounds.length:"Preparing next round…";
 $("sbFightNext").disabled=!!state.champion||!!active||!next;
}
$("sbAll").onclick=()=>{selected.clear();getRoster().slice(0,30).forEach(b=>selected.add(b.id));entrants()};
$("sbNone").onclick=()=>{selected.clear();entrants()};
$("sbNewTournament").onclick=()=>{
 if(active||api.getMatch()?.running){alert("Stop or finish the current battle first.");return}
 const ids=getRoster().filter(b=>selected.has(b.id)).slice(0,30).map(b=>b.id);
 if(ids.length<2){alert("Select at least two pupils.");return}
 if(state.rounds.length&&!confirm("Replace existing bracket and its results?"))return;
 const all=shuffle(ids),size=2**Math.ceil(Math.log2(all.length)),byes=size-all.length,slots=Array(size);
 // One bye maximum per opening pair; all 2–30-entrant brackets are supported.
 for(let i=0;i<byes;i++)slots[2*i+1]=null;
 let n=0;for(let i=0;i<size;i++)if(slots[i]===undefined)slots[i]=all[n++];
 const round=[];for(let i=0;i<size;i+=2){const a=slots[i],b=slots[i+1];round.push({a:a||b,b:a&&b?b:null,winner:a&&b?null:a||b})}
 state={selected:ids,rounds:[round],champion:null};advance();save();renderTournament();
};
$("sbFightNext").onclick=()=>{
 if(active||state.champion||!state.rounds.length)return;
 advance();const r=state.rounds.length-1,i=state.rounds[r].findIndex(m=>!m.winner);
 if(i<0)return;const m=state.rounds[r][i];
 if(!api.startMatch(m.a,m.b)){alert("Another duel is already in progress.");return}
 active={r,i,a:m.a,b:m.b};renderTournament();
};
$("sbCSV").onclick=()=>{
 if(!state.rounds.length){alert("No tournament results yet.");return}
 const rows=[["Round","Robot A","Robot B","Winner"]];
 state.rounds.forEach((round,i)=>round.forEach(m=>rows.push([i+1,name(m.a),m.b?name(m.b):"BYE",m.winner?name(m.winner):""])));
 const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="sketch-battle-tournament.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
$("save").addEventListener("click",()=>setTimeout(()=>{renderTournament();rosterMessage()},0));
setInterval(()=>{
 refreshPrecision();
 const count=getRoster().length;
 if(count!==lastCount){lastCount=count;renderTournament();rosterMessage()}
 if(!active)return;
 const match=api.getMatch();
 if(!match){active=null;renderTournament();$("sbNextInfo").textContent="Duel stopped. Start next match to replay.";return}
 if(match.running)return;
 const m=state.rounds[active.r]?.[active.i];if(!m){active=null;return}
 if(match.winnerId===m.a||match.winnerId===m.b){m.winner=match.winnerId;active=null;advance();save();renderTournament()}
 else{active=null;renderTournament();$("sbNextInfo").textContent="Draw. Replay the same match to determine a winner."}
},600);
renderTournament();refreshPrecision();
if(window.supabase?.createClient)connect();
})();