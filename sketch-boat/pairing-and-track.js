"use strict";
(() => {
const $=id=>document.getElementById(id);
const api=window.SketchBoatBridge;
if(!api){console.error("Sketch Boat game bridge unavailable");return;}
const SB_URL="https://qekcgsfeomjckctiubgm.supabase.co";
const SB_KEY="sb_publishable_yJbCYOLDeMreuqM01g_oqA_eF5YEWwq";
const ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let panel="garage",tool="draw",track=api.getTrack(),dragging=false,changed=false;
let client=null,channel=null,room="",paired=false,lastState="",sendLock=false;
const canvas=$("trackCanvas"),context=canvas.getContext("2d");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const notify=(text)=>{$("trackNotice").textContent=text;};
function state(){return api.getState();}
function setPanel(next){
 if(!["garage","track","race"].includes(next))return;
 if(next==="track"&&state().running){$("raceInfo").textContent="Finish or reset the race before editing the track.";return;}
 if(next==="track"&&!["quick","test"].includes(state().mode)){
  const result=api.changeMode("quick");if(!result.ok){notify(result.message);return;}
 }
 panel=next;
 document.querySelectorAll("[data-panel]").forEach(b=>b.classList.toggle("on",b.dataset.panel===next));
 for(const name of ["garage","track","race"])$("pane-"+name).classList.toggle("hidden",name!==next);
 const editing=next==="track";
 canvas.classList.toggle("hidden",!editing);
 $("trackEditorHint").classList.toggle("hidden",!editing);
 $("emptyState").classList.toggle("hidden",editing||state().boats.length>0);
 $("stageTitle").textContent=editing?"DESIGN TRACK":next==="garage"?"GARAGE":state().mode==="sailing"?"SAILING RACE":state().mode==="challenge"?"CHALLENGE RACE":"RACE";
 $("stageSubtitle").textContent=editing?"Drag to shape bends · place rocks · choose race distance":next==="garage"?"Scan and register boats first":"Automatic racing";
 $("startRace").classList.toggle("hidden",next==="track");
 $("raceInfo").textContent=editing?"Track editor · draw your watercourse on the large screen":state().running?"Race in progress":"All boats are automatically controlled";
 $("raceStartSide").disabled=state().running;
 if(editing){track=api.getTrack();loadTrackInputs();drawTrack();}
}
document.querySelectorAll("[data-panel]").forEach(el=>el.addEventListener("click",()=>setPanel(el.dataset.panel)));
$("trackReady").addEventListener("click",()=>setPanel("race"));
$("editTrackSide").addEventListener("click",()=>setPanel("track"));
$("raceStartSide").addEventListener("click",()=>{setPanel("race");$("startRace").click();});
$("startRace").addEventListener("click",()=>{if(panel!=="race")setPanel("race");});
document.querySelectorAll("[data-mode]").forEach(el=>el.addEventListener("click",()=>{const current=state().mode;if(panel==="track"&&["challenge","sailing"].includes(current))setPanel("garage");lastState="";}));
function loadTrackInputs(){
 $("trackWidth").value=String(track.width);$("trackWidthValue").textContent=String(track.width);
 $("trackLength").value=String(track.distance);
 $("trackPreset").value=["calm","winding","islands","slalom"].includes(track.preset)?track.preset:"calm";
}
// Sketch Rally-style track editor: one thin continuous freehand centreline.
// Track width is a race-physics setting, never a drawing brush or editor border.
function toCanvas(point){return {x:point.x*1200,y:point.y*680};}
function drawTrack(){
 const w=canvas.width,h=canvas.height;
 context.clearRect(0,0,w,h);
 const bg=context.createLinearGradient(0,0,w,h);
 bg.addColorStop(0,"#12516f");bg.addColorStop(1,"#186d89");context.fillStyle=bg;context.fillRect(0,0,w,h);
 context.strokeStyle="#cbf4ff";context.globalAlpha=.13;context.lineWidth=1;
 for(let y=30;y<h;y+=50)for(let x=0;x<w;x+=97){
  context.beginPath();context.moveTo(x,y);context.quadraticCurveTo(x+19,y-5,x+41,y);context.stroke();
 }
 context.globalAlpha=1;
 context.lineCap="round";context.lineJoin="round";
 const pts=Array.isArray(track.points)?track.points:[];
 if(pts.length){
  context.beginPath();
  pts.forEach((p,i)=>i?context.lineTo(p.x*w,p.y*h):context.moveTo(p.x*w,p.y*h));
  context.strokeStyle="#10293f";context.lineWidth=10;context.stroke();
  context.strokeStyle="#c4f26b";context.lineWidth=5;context.stroke();
  if(pts.length>1){
   const first=toCanvas(pts[0]),last=toCanvas(pts[pts.length-1]);
   context.fillStyle="#f5faff";context.font="bold 15px system-ui";
   context.fillText("START",clamp(first.x+10,12,w-90),clamp(first.y-16,20,h-12));
   context.fillText("FINISH",clamp(last.x+10,12,w-90),clamp(last.y-16,20,h-12));
   context.fillStyle="#c4f26b";
   context.beginPath();context.arc(first.x,first.y,9,0,Math.PI*2);context.fill();
   context.fillStyle="#fff";context.beginPath();context.arc(last.x,last.y,9,0,Math.PI*2);context.fill();
  }
 }
 for(const rock of track.rocks){
  const x=rock.x*w,y=rock.y*h;
  context.fillStyle="#566773";context.strokeStyle="#ffda93";context.lineWidth=3;
  context.beginPath();context.ellipse(x,y,rock.r,rock.r*.78,.3,0,Math.PI*2);
  context.fill();context.stroke();
 }
 context.font="bold 14px system-ui";context.fillStyle="#edfcff";
 context.fillText((track.distance/2600)+" km · "+track.rocks.length+" rocks · FREEHAND ROUTE",17,31);
}
function position(e){
 const r=canvas.getBoundingClientRect();
 return {x:clamp((e.clientX-r.left)/r.width,.01,.99),y:clamp((e.clientY-r.top)/r.height,.03,.97)};
}
function recordPoint(e){
 const p=position(e),arr=track.points;
 if(arr.length>=1600)return;
 if(!arr.length||Math.hypot((p.x-arr[arr.length-1].x)*1200,(p.y-arr[arr.length-1].y)*680)>=2.6){
  arr.push(p);changed=true;drawTrack();
 }
}
let undoHistory=[];
function remember(){undoHistory.push(JSON.stringify(track));if(undoHistory.length>25)undoHistory.shift();}
function apply(){
 const result=api.setTrack(track);
 if(result.ok){track=api.getTrack();drawTrack();notify("✓ Freehand track saved. Sharp corners will remain sharp.");}
 else notify(result.message||"Could not save track.");
}
canvas.addEventListener("pointerdown",e=>{
 if(state().running)return;
 dragging=true;changed=false;remember();
 canvas.setPointerCapture(e.pointerId);
 if(tool==="draw"){
  // One gesture draws a complete track in arbitrary 2D. No x-monotonicity,
  // smoothing, minimum corner radius, or road-width restrictions.
  track.points=[];track.rocks=[];track.preset="custom";
  recordPoint(e);
 }else if(tool==="rock"){
  const p=position(e);
  if(track.rocks.length<20){track.rocks.push({x:p.x,y:p.y,r:17});changed=true;drawTrack();}
  else notify("Maximum 20 rocks. Remove one to add another.");
 }else{
  const p=position(e),idx=track.rocks.findIndex(r=>Math.hypot((r.x-p.x)*1200,(r.y-p.y)*680)<32);
  if(idx>=0){track.rocks.splice(idx,1);changed=true;drawTrack();}
  else notify("Tap an existing rock to erase it.");
 }
});
canvas.addEventListener("pointermove",e=>{if(dragging&&tool==="draw")recordPoint(e);});
function finishEdit(){
 if(!dragging)return;dragging=false;
 if(tool==="draw"){
  const pts=track.points;
  let length=0;for(let i=1;i<pts.length;i++)length+=Math.hypot((pts[i].x-pts[i-1].x)*1200,(pts[i].y-pts[i-1].y)*680);
  if(pts.length<3||length<35){
   track=JSON.parse(undoHistory.pop());drawTrack();
   notify("Draw a continuous route at least 35 pixels long. Previous track restored.");return;
  }
 }
 if(changed)apply();
 else {undoHistory.pop();drawTrack();}
}
canvas.addEventListener("pointerup",finishEdit);
canvas.addEventListener("pointercancel",finishEdit);
document.querySelectorAll("[data-track-tool]").forEach(el=>el.addEventListener("click",()=>{
 tool=el.dataset.trackTool;
 document.querySelectorAll("[data-track-tool]").forEach(b=>b.classList.toggle("active",b===el));
 $("trackEditorHint").textContent=tool==="draw"?"✎ Drag anywhere to draw a NEW freehand route · sharp hairpins allowed":tool==="rock"?"◆ Tap to place rocks":"⌫ Tap a rock to remove it";
}));
$("undoTrack").addEventListener("click",()=>{
 if(!undoHistory.length){notify("Nothing to undo.");return;}
 track=JSON.parse(undoHistory.pop());apply();loadTrackInputs();notify("Previous track restored.");
});
$("resetTrack").addEventListener("click",()=>{
 if(state().running)return;remember();
 const old=track;api.presetTrack("calm");track=api.getTrack();
 track.width=old.width;track.distance=old.distance;apply();loadTrackInputs();notify("Reset to an open-water line.");
});
$("trackPreset").addEventListener("change",e=>{
 if(state().running)return;remember();
 const old=track;api.presetTrack(e.target.value);track=api.getTrack();
 track.width=old.width;track.distance=old.distance;
 apply();loadTrackInputs();notify("Preset loaded. Drag a NEW route to replace it.");
});
$("trackWidth").addEventListener("input",e=>{
 track.width=Number(e.target.value);
 $("trackWidthValue").textContent=e.target.value;
 // Width is deliberately NOT rendered in the editor, as requested.
});
$("trackWidth").addEventListener("change",()=>{api.setTrack(track);track=api.getTrack();notify("Race waterway width saved. Drawing line stays thin.");});
$("trackLength").addEventListener("change",e=>{track.distance=Number(e.target.value);apply();notify("Race length saved.");});
function randomCode(){const buf=new Uint8Array(8);crypto.getRandomValues(buf);return Array.from(buf,x=>ALPHABET[x%ALPHABET.length]).join("");}
function linkForRoom(){const u=new URL("host.html",location.href);u.searchParams.set("room",room);return u.href;}
function updatePairUI(){
 $("cameraCode").textContent=room||"— — — —";const url=room?linkForRoom():new URL("host.html",location.href).href;
 $("cameraLink").textContent=url;
 const qr=$("cameraQr");qr.replaceChildren();
 if(room&&window.QRCode){new window.QRCode(qr,{text:url,width:114,height:114,correctLevel:window.QRCode.CorrectLevel.M});}
 else qr.textContent="Enter the 8-character code in the host app";
}
function pairStatus(s){$("pairStatus").textContent=s;$("phoneConnection").textContent=s;}
async function transmit(event,payload={}){
 if(!channel)return "no-channel";
 try{return await channel.send({type:"broadcast",event,payload});}
 catch(e){console.warn("Boat host transport",e);return "error";}
}
async function syncHost(){
 if(!channel)return;
 const st=state();const msg=JSON.stringify({mode:st.mode,kind:st.kind,running:st.running,boats:st.boats,level:st.level,results:st.results});
 if(msg===lastState)return;
 lastState=msg;
 await transmit("roster-state",{mode:st.mode,kind:st.kind,racing:st.running,racers:st.boats,level:st.level,results:st.results,max:30});
 const ribbon=$("hostRosterRibbon"),names=$("hostRosterNames");
 ribbon.classList.toggle("hidden",!st.boats.length);
 $("hostRosterCount").textContent=st.boats.length+" / 30 RACERS";
 names.replaceChildren();for(const boat of st.boats){const tag=document.createElement("em");tag.textContent=boat.name;names.append(tag);}
 $("raceStartSide").disabled=st.running;
}
async function respond(event,requestId,response){
 await transmit(event,{requestId,...response});
 lastState="";syncHost();
}
async function newPairCode(){
 if(!window.supabase?.createClient){pairStatus("Pairing library unavailable. Connect the smartboard to the internet and reload.");return;}
 if(channel&&client){await client.removeChannel(channel);channel=null;}
 room=randomCode();paired=false;lastState="";
 updatePairUI();pairStatus("Connecting to phone room…");
 try{
  client=client||window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const ch=client.channel("sketch-boat:host:"+room,{config:{private:false,broadcast:{ack:true}}});channel=ch;
  ch.on("broadcast",{event:"phone-hello"},async()=>{
   if(ch!==channel)return;paired=true;pairStatus("✓ Host phone connected");await transmit("board-ready",{version:"1.1"});lastState="";syncHost();
  }).on("broadcast",{event:"roster-request"},()=>{lastState="";syncHost();})
  .on("broadcast",{event:"preview"},({payload})=>{
   if(typeof payload?.image!=="string"||!payload.image.startsWith("data:image/jpeg;base64,")||payload.image.length>45000)return;
   $("hostPhotoPreview").src=payload.image;$("hostPhotoBox").classList.remove("hidden");$("hostPhotoStatus").textContent="Phone camera preview";
  })
  .on("broadcast",{event:"register-boat"},async ({payload})=>{
   if(ch!==channel)return;
   if(sendLock){await respond("registration-result",payload?.requestId,{ok:false,message:"Processing another photo. Try again."});return;}
   sendLock=true;
   try{
    const result=await api.registerPhoto(payload);
    if(result.ok){
     $("hostPhotoPreview").src=payload.image;$("hostPhotoBox").classList.remove("hidden");
     $("hostPhotoStatus").textContent=result.racer.name+" successfully registered";
     setPanel("garage");
    }
    await respond("registration-result",payload?.requestId,result);
   }catch(error){console.warn(error);await respond("registration-result",payload?.requestId,{ok:false,message:"Sketch could not be processed."});}
   finally{sendLock=false;}
  })
  .on("broadcast",{event:"remove-racer"},async ({payload})=>{
   if(ch!==channel)return;const result=api.removeBoat(String(payload?.racerId||""));
   await respond("remove-result",payload?.requestId,result);
  })
  .on("broadcast",{event:"remote-start"},async ({payload})=>{
   if(ch!==channel)return;setPanel("race");
   const result=api.start();await respond("race-result",payload?.requestId,result);
  })
  .on("broadcast",{event:"change-mode"},async ({payload})=>{
   if(ch!==channel)return;
   const result=api.changeMode(String(payload?.mode||""));
   if(result.ok){setPanel("garage");}
   await respond("mode-result",payload?.requestId,result);
  });
  ch.subscribe((status,err)=>{
   if(ch!==channel)return;
   if(status==="SUBSCRIBED"){pairStatus("Room ready · Scan QR using host phone");}
   else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(status)){pairStatus("Connection interrupted · Try New code");console.warn("Sketch Boat pairing",status,err);}
  });
 }catch(err){console.error("Sketch Boat pairing",err);pairStatus("Could not create phone room");}
}
function openPair(){
 $("pairDialog").classList.remove("hidden");if(!room)newPairCode();else updatePairUI();
}
$("openPhonePair").addEventListener("click",openPair);
$("pairPhoneSide").addEventListener("click",openPair);
$("closePair").addEventListener("click",()=>$("pairDialog").classList.add("hidden"));
$("pairDialog").addEventListener("click",e=>{if(e.target===$("pairDialog"))$("pairDialog").classList.add("hidden");});
$("changePhoneCode").addEventListener("click",newPairCode);
$("copyPhoneLink").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(linkForRoom());pairStatus("Host link copied to clipboard");}catch{pairStatus("Copy unavailable. Type the pairing code on your phone.");}});
$("openHostPage").addEventListener("click",()=>window.open(linkForRoom(),"_blank","noopener,noreferrer"));
window.addEventListener("pagehide",()=>{if(channel&&client)client.removeChannel(channel);});
setInterval(()=>{if(channel&&paired)syncHost();},1800);

const mainMenu=$("mainMenu");
function closeMenu(){mainMenu.classList.add("hidden");}
function openMenu(){if(!state().running)mainMenu.classList.remove("hidden");}
$("openMainMenu").addEventListener("click",openMenu);
$("menuEnter").addEventListener("click",()=>{closeMenu();setPanel("garage");});
$("menuHost").addEventListener("click",()=>{closeMenu();setPanel("garage");openPair();});
document.querySelectorAll("[data-enter-mode]").forEach(btn=>btn.addEventListener("click",()=>{
 const result=api.changeMode(btn.dataset.enterMode);
 if(!result.ok){$("pairStatus").textContent=result.message;return;}
 closeMenu();setPanel("garage");lastState="";syncHost();
}));
loadTrackInputs();setPanel("garage");
})();