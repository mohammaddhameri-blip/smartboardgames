"use strict";
(() => {
const $=id=>document.getElementById(id);
const api=window.SketchBoatBridge;
if(!api){console.error("Sketch Boat game bridge unavailable");return;}
const SB_URL="https://qekcgsfeomjckctiubgm.supabase.co";
const SB_KEY="sb_publishable_yJbCYOLDeMreuqM01g_oqA_eF5YEWwq";
const ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let panel="garage",tool="draw",track=api.getTrack(),previous=null,dragging=false,changed=false;
let client=null,channel=null,room="",paired=false,lastState="",sendLock=false;
const canvas=$("trackCanvas"),context=canvas.getContext("2d");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const notify=(text)=>{$("trackNotice").textContent=text;};
function state(){return api.getState();}
function setPanel(next){
 if(!["garage","track","race"].includes(next))return;
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
function yValue(t,x){
 const n=t.values.length-1,p=clamp(x,0,1)*n,i=Math.min(n-1,Math.floor(p)),u=p-i;
 const a=t.values[Math.max(0,i-1)],b=t.values[i],c=t.values[i+1],d=t.values[Math.min(n,i+2)];
 return clamp(.5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u),.04,.96);
}
function pointAt(t,x){return 30+1140*x;}
function centerAt(t,x){return 320+(yValue(t,x)-.5)*255;}
function drawTrack(){
 const w=canvas.width,h=canvas.height;
 context.clearRect(0,0,w,h);
 const water=context.createLinearGradient(0,0,w,h);water.addColorStop(0,"#1c688c");water.addColorStop(1,"#104d70");context.fillStyle=water;context.fillRect(0,0,w,h);
 context.strokeStyle="#a9ecf4";context.globalAlpha=.16;context.lineWidth=1;
 for(let y=30;y<h;y+=46)for(let x=0;x<w;x+=100){context.beginPath();context.moveTo(x,y);context.quadraticCurveTo(x+23,y-8,x+40,y);context.stroke();}
 context.globalAlpha=1;
 const curve=new Path2D();for(let i=0;i<=300;i++){const x=i/300,px=pointAt(track,x),py=centerAt(track,x);i?curve.lineTo(px,py):curve.moveTo(px,py);}
 context.lineCap="round";context.lineJoin="round";
 context.strokeStyle="#073f5e";context.lineWidth=track.width+34;context.stroke(curve);
 context.strokeStyle="#d0ead9";context.lineWidth=track.width+15;context.stroke(curve);
 const aqua=context.createLinearGradient(0,200,0,500);aqua.addColorStop(0,"#41a8c6");aqua.addColorStop(1,"#2598ba");
 context.strokeStyle=aqua;context.lineWidth=track.width;context.stroke(curve);
 context.strokeStyle="#f2fff5";context.lineWidth=2;context.globalAlpha=.45;context.setLineDash([8,14]);context.stroke(curve);context.setLineDash([]);context.globalAlpha=1;
 context.strokeStyle="#f6e4ad";context.lineWidth=5;
 for(const x of [.01,.99]){const cx=pointAt(track,x),cy=centerAt(track,x);context.beginPath();context.moveTo(cx,cy-track.width*.53);context.lineTo(cx,cy+track.width*.53);context.stroke();}
 const startX=pointAt(track,.01),startY=centerAt(track,.01),finishX=pointAt(track,.99),finishY=centerAt(track,.99);
 context.fillStyle="#ffffff";context.font="bold 18px system-ui";context.fillText("START",startX-6,startY-track.width*.62-10);
 context.fillText("FINISH",finishX-60,finishY-track.width*.62-10);
 track.rocks.forEach((r,i)=>{
  const x=pointAt(track,r.x),y=centerAt(track,r.x)+r.offset;
  context.fillStyle="#455968";context.strokeStyle="#ffd79c";context.lineWidth=4;
  context.beginPath();context.ellipse(x,y,r.r,r.r*.82,i*.2,0,Math.PI*2);context.fill();context.stroke();
  context.fillStyle="#ffffff";context.font="bold 12px system-ui";context.fillText("◆",x-5,y+4);
 });
 context.fillStyle="#e1f9fe";context.font="bold 14px system-ui";
 const km=track.distance/2600;context.fillText(km+" km · "+track.rocks.length+" rocks",23,34);
}
function position(e){
 const rect=canvas.getBoundingClientRect();
 return {x:clamp((e.clientX-rect.left)/rect.width,0,1),y:clamp((e.clientY-rect.top)/rect.height*680,0,680)};
}
function addPoint(e){
 const p=position(e),index=Math.round(p.x*64),v=clamp(.5+(p.y-320)/255,.08,.92);
 if(tool==="draw"){
  if(previous){
   const start=previous.index,end=index,a=Math.min(start,end),b=Math.max(start,end);
   for(let i=a;i<=b;i++){const u=start===end?1:(i-start)/(end-start);track.values[i]=clamp(previous.y+(v-previous.y)*u,.08,.92);}
  }else track.values[index]=v;
  previous={index,y:v};track.preset="custom";changed=true;
 }else if(tool==="rock"){
  if(!changed && track.rocks.length<15){
   const offset=clamp(p.y-centerAt(track,p.x),-track.width*.40,track.width*.40);
   if(p.x>.06&&p.x<.94){track.rocks.push({x:p.x,offset,r:20});changed=true;}
   else notify("Place obstacles away from the start and finish.");
  }
 }else{
  const idx=track.rocks.findIndex(r=>Math.hypot((r.x-p.x)*1140,(centerAt(track,r.x)+r.offset-p.y))<35);
  if(idx>=0){track.rocks.splice(idx,1);changed=true;}else notify("Tap an existing rock to erase it.");
 }
 drawTrack();
}
let undoHistory=[];
function remember(){undoHistory.push(JSON.stringify(track));if(undoHistory.length>25)undoHistory.shift();}
canvas.addEventListener("pointerdown",e=>{
 if(state().running)return;
 dragging=true;changed=false;previous=null;remember();canvas.setPointerCapture(e.pointerId);addPoint(e);
});
canvas.addEventListener("pointermove",e=>{if(dragging&&tool==="draw")addPoint(e);});
function finishEdit(){if(!dragging)return;dragging=false;previous=null;if(changed){api.setTrack(track);notify("✓ Track saved on this smartboard.");}}
canvas.addEventListener("pointerup",finishEdit);canvas.addEventListener("pointercancel",finishEdit);
document.querySelectorAll("[data-track-tool]").forEach(el=>el.addEventListener("click",()=>{
 tool=el.dataset.trackTool;document.querySelectorAll("[data-track-tool]").forEach(b=>b.classList.toggle("active",b===el));
 $("trackEditorHint").textContent=tool==="draw"?"✎ Drag to draw the route":tool==="rock"?"◆ Tap to place a rock":"⌫ Tap a rock to remove it";
}));
$("undoTrack").addEventListener("click",()=>{if(!undoHistory.length)return;track=JSON.parse(undoHistory.pop());api.setTrack(track);loadTrackInputs();drawTrack();notify("Last track change undone.");});
$("resetTrack").addEventListener("click",()=>{remember();const old=track;api.presetTrack("calm");track=api.getTrack();track.width=old.width;track.distance=old.distance;api.setTrack(track);loadTrackInputs();drawTrack();notify("Course reset to open water.");});
$("trackPreset").addEventListener("change",e=>{
 if(state().running)return;remember();
 const old=track;api.presetTrack(e.target.value);track=api.getTrack();track.width=old.width;track.distance=old.distance;
 api.setTrack(track);loadTrackInputs();drawTrack();notify("Course preset applied. You may reshape it.");
});
$("trackWidth").addEventListener("input",e=>{track.width=Number(e.target.value);$("trackWidthValue").textContent=e.target.value;drawTrack();});
$("trackWidth").addEventListener("change",()=>{api.setTrack(track);notify("Waterway width saved.");});
$("trackLength").addEventListener("change",e=>{track.distance=Number(e.target.value);api.setTrack(track);drawTrack();notify("Race distance saved.");});
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