"use strict";
(() => {
const $=id=>document.getElementById(id);
const SB_URL="https://qekcgsfeomjckctiubgm.supabase.co";
const SB_KEY="sb_publishable_yJbCYOLDeMreuqM01g_oqA_eF5YEWwq";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const params=new URLSearchParams(location.search);
$("room").value=(params.get("room")||"").replace(/[^A-Z0-9]/gi,"").toUpperCase().slice(0,8);
let client=null,channel=null,paired=false,stream=null,boardMode="quick",boardKind="power",boardRacing=false,roster=[],lastRoom="";
let source=null,angle=0,threshold=210,filterLines=true,cropRect=null,cropStart=null,editBase=null;
let pending=null,request=null,rescanId=null,rescanName="",connecting=false,helloTimer=null;
const edit=$("editCanvas"),ed=edit.getContext("2d",{willReadFrequently:true});
const assign=$("assignCanvas"),ac=assign.getContext("2d");
const message=(msg,good=false)=>{
 $("connectionStatus").textContent=msg;$("connectionStatus").classList.toggle("good",good);
};
const photoStatus=(msg,good=false)=>{
 $("photoStatus").textContent=msg;$("photoStatus").classList.toggle("good",good);
};
function newId(){if(crypto.randomUUID)return crypto.randomUUID().replaceAll("-","");const a=new Uint32Array(4);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16)).join("");}
function isReady(){return paired&&!!channel;}
function controls(){
 const active=isReady(),busy=!!request;
 $("startCamera").disabled=!active;
 $("switchCamera").disabled=!active;
 $("capture").disabled=!active||!stream||busy;
 $("filePhoto").disabled=!active||busy;
 $("startRace").disabled=!active||boardRacing||!roster.length||busy;
 $("gameMode").disabled=!active||boardRacing||busy;
 $("registerBoat").disabled=!active||busy;
 $("modeBadge").textContent=boardKind==="sail"?"⛵ SAILBOAT":"🚤 POWERBOAT";
 $("gameMode").value=boardMode;
}
function setRoster(info){
 if(info&&Array.isArray(info.racers))roster=info.racers.filter(r=>r&&typeof r.name==="string").slice(0,30);
 if(typeof info?.racing==="boolean")boardRacing=info.racing;
 if(["quick","challenge","sailing","test"].includes(info?.mode)){boardMode=info.mode;boardKind=boardMode==="sailing"?"sail":"power";}
 const el=$("rosterList");el.replaceChildren();
 if(!roster.length){const d=document.createElement("div");d.className="racer-placeholder";d.textContent="No boats registered in this category yet.";el.append(d);}
 for(const racer of roster){
  const row=document.createElement("div");row.className="racer";
  const title=document.createElement("strong");title.className="racer-name";title.textContent=racer.name;
  const redo=document.createElement("button");redo.type="button";redo.textContent="Rescan";redo.addEventListener("click",()=>{
   rescanId=racer.remoteId||racer.id;rescanName=racer.name;photoStatus("Ready to rescan "+racer.name+". Take a photo first.");window.scrollTo({top:0,behavior:"smooth"});
  });
  const del=document.createElement("button");del.type="button";del.className="danger";del.textContent="Remove";del.addEventListener("click",async()=>{
   if(boardRacing||!paired)return;
   const accepted=confirm("Remove "+racer.name+" from the smartboard roster?");if(!accepted)return;
   try{await sendRequest("remove-racer",{racerId:racer.remoteId||racer.id},"remove-result");}
   catch(e){photoStatus(String(e.message||e));}
  });
  row.append(title,redo,del);el.append(row);
 }
 $("raceStatus").textContent=boardRacing?"Race running on smartboard":roster.length?roster.length+" racers ready. You can start the race.":"Register a boat to enable racing.";
 controls();
}
async function stopStream(){
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 $("video").srcObject=null;$("videoFrame").classList.add("off");$("startCamera").textContent="📷 Start camera";controls();
}
async function startStream(){
 if(stream){await stopStream();return;}
 if(!navigator.mediaDevices?.getUserMedia){photoStatus("Camera API unavailable. Use Choose a photo instead.");return;}
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:960}}});
  $("video").srcObject=stream;await $("video").play();
  $("videoFrame").classList.remove("off");$("startCamera").textContent="✕ Stop camera";
  photoStatus("Camera ready. Place one boat sketch on a flat surface.");controls();
 }catch(error){console.warn(error);photoStatus("Unable to open camera. Check camera permission, or upload a photo instead.");}
}
$("startCamera").addEventListener("click",startStream);
$("switchCamera").addEventListener("click",async()=>{
 const current=stream?.getVideoTracks()[0]?.getSettings()?.facingMode||"environment";
 await stopStream();
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:current==="environment"?"user":"environment"}}});
  $("video").srcObject=stream;await $("video").play();$("videoFrame").classList.remove("off");$("startCamera").textContent="✕ Stop camera";controls();
 }catch(error){photoStatus("Unable to switch camera. Use photo upload or restart camera.");}
});
function setSource(src){
 const img=new Image();
 img.onload=()=>{
  source=img;angle=0;cropRect=null;cropStart=null;threshold=210;filterLines=true;
  $("photoRotation").value="0";$("rotationValue").textContent="0°";$("cleanup").value="210";$("cleanupValue").textContent="210";$("removeLines").checked=true;
  editBase=null;$("editorDialog").classList.remove("hidden");$("assignDialog").classList.add("hidden");
  redraw();
 };
 img.onerror=()=>photoStatus("Image could not be decoded. Retake the photo.");
 img.src=src;
}
$("capture").addEventListener("click",()=>{
 if(!stream||!isReady())return;
 const video=$("video");
 if(video.videoWidth<20){photoStatus("Camera not ready. Try again.");return;}
 const canvas=document.createElement("canvas");const max=1200,ratio=Math.min(1,max/Math.max(video.videoWidth,video.videoHeight));
 canvas.width=Math.round(video.videoWidth*ratio);canvas.height=Math.round(video.videoHeight*ratio);
 canvas.getContext("2d").drawImage(video,0,0,canvas.width,canvas.height);
 setSource(canvas.toDataURL("image/jpeg",.85));
});
$("filePhoto").addEventListener("change",e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>12*1024*1024){photoStatus("Choose a photo smaller than 12 MB.");return;}
 if(!file.type.startsWith("image/")){photoStatus("Only image files are supported.");return;}
 const reader=new FileReader();reader.onload=()=>setSource(String(reader.result));reader.onerror=()=>photoStatus("Could not read photo.");reader.readAsDataURL(file);e.target.value="";
});
function renderEditor(){
 if(!source)return;
 const base=document.createElement("canvas");base.width=420;base.height=295;
 const c=base.getContext("2d",{willReadFrequently:true});
 c.fillStyle="#ffffff";c.fillRect(0,0,420,295);
 c.save();c.translate(210,147.5);c.rotate(angle*Math.PI/180);
 const scale=Math.min(395/source.naturalWidth,275/source.naturalHeight);
 const w=scale*source.naturalWidth,h=scale*source.naturalHeight;
 c.drawImage(source,-w/2,-h/2,w,h);
 c.restore();
 const data=c.getImageData(0,0,420,295),d=data.data;
 for(let i=0;i<d.length;i+=4){
  const r=d[i],g=d[i+1],b=d[i+2],v=.299*r+.587*g+.114*b;
  const rule=filterLines&&b>r*1.13&&b>g*1.07&&v>120;
  if(v>threshold||rule){d[i]=255;d[i+1]=255;d[i+2]=255;continue;}
  const amplify=clamp((threshold-v)*1.25,0,255);
  d[i]=clamp(r-amplify*.35,0,255);d[i+1]=clamp(g-amplify*.35,0,255);d[i+2]=clamp(b-amplify*.35,0,255);
 }
 c.putImageData(data,0,0);
 return base;
}
function redraw(){
 editBase=renderEditor();if(!editBase)return;
 ed.clearRect(0,0,420,295);ed.drawImage(editBase,0,0);
 if(cropRect){
  const {x,y,w,h}=cropRect;
  ed.fillStyle="#09203233";ed.fillRect(0,0,420,y);ed.fillRect(0,y,x,h);ed.fillRect(x+w,y,420-x-w,h);ed.fillRect(0,y+h,420,295-y-h);
  ed.strokeStyle="#e5a64d";ed.lineWidth=2;ed.setLineDash([7,6]);ed.strokeRect(x,y,w,h);ed.setLineDash([]);
 }
}
$("photoRotation").addEventListener("input",e=>{angle=Number(e.target.value);$("rotationValue").textContent=angle+"°";redraw();});
function rotate(deg){angle=((angle+deg+540)%360)-180;$("photoRotation").value=String(angle);$("rotationValue").textContent=angle+"°";redraw();}
$("rotateLeft").addEventListener("click",()=>rotate(-90));
$("rotateRight").addEventListener("click",()=>rotate(90));
$("cleanup").addEventListener("input",e=>{threshold=Number(e.target.value);$("cleanupValue").textContent=String(threshold);redraw();});
$("removeLines").addEventListener("change",e=>{filterLines=e.target.checked;redraw();});
function loc(e){const r=edit.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/r.width*420,0,420),y:clamp((e.clientY-r.top)/r.height*295,0,295)};}
edit.addEventListener("pointerdown",e=>{cropStart=loc(e);cropRect=null;edit.setPointerCapture(e.pointerId);});
edit.addEventListener("pointermove",e=>{
 if(!cropStart)return;const p=loc(e);
 cropRect={x:Math.min(p.x,cropStart.x),y:Math.min(p.y,cropStart.y),w:Math.abs(p.x-cropStart.x),h:Math.abs(p.y-cropStart.y)};redraw();
});
edit.addEventListener("pointerup",()=>{cropStart=null;if(cropRect&&(cropRect.w<35||cropRect.h<35))cropRect=null;redraw();});
edit.addEventListener("pointercancel",()=>{cropStart=null;redraw();});
$("cropPhoto").addEventListener("click",()=>{
 if(!cropRect||!editBase){photoStatus("Drag across the photo first to select a crop.");return;}
 const {x,y,w,h}=cropRect;
 const c=document.createElement("canvas");c.width=840;c.height=590;
 const cc=c.getContext("2d");cc.fillStyle="#fff";cc.fillRect(0,0,840,590);
 const factor=Math.min(810/w,560/h);cc.drawImage(editBase,x,y,w,h,420-w*factor/2,295-h*factor/2,w*factor,h*factor);
 const img=new Image();img.onload=()=>{source=img;angle=0;cropRect=null;$("photoRotation").value="0";$("rotationValue").textContent="0°";redraw();};img.src=c.toDataURL("image/jpeg",.88);
});
$("resetCrop").addEventListener("click",()=>{cropRect=null;redraw();});
$("cancelEdit").addEventListener("click",()=>$("editorDialog").classList.add("hidden"));
$("retake").addEventListener("click",()=>{$("editorDialog").classList.add("hidden");photoStatus("Retake a new photo.");});
function editedJPEG(){
 if(!editBase)throw Error("Photo missing.");
 const canvas=document.createElement("canvas");canvas.width=600;canvas.height=422;
 const c=canvas.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,600,422);
 const region=cropRect&&cropRect.w>30&&cropRect.h>30?cropRect:{x:0,y:0,w:420,h:295};
 const f=Math.min(590/region.w,410/region.h),dw=region.w*f,dh=region.h*f;
 c.drawImage(editBase,region.x,region.y,region.w,region.h,(600-dw)/2,(422-dh)/2,dw,dh);
 let result=canvas.toDataURL("image/jpeg",.72);
 if(result.length>230000)result=canvas.toDataURL("image/jpeg",.44);
 if(result.length>230000)throw Error("Image is too large. Crop more tightly or retake.");
 return result;
}
$("nextAssign").addEventListener("click",()=>{
 try{
  pending=editedJPEG();
  $("assignDialog").classList.remove("hidden");$("editorDialog").classList.add("hidden");
  const img=new Image();img.onload=()=>{ac.fillStyle="#fff";ac.fillRect(0,0,420,295);ac.drawImage(img,0,0,420,295);};img.src=pending;
  $("racerName").value=rescanName||"";
  $("assignTitle").textContent=rescanName?"Replace "+rescanName+"'s boat":"Register this boat";
  $("assignStatus").textContent="Enter pupil name, then send to paired smartboard.";
  $("racerName").focus();
 }catch(e){photoStatus(String(e.message||e));}
});
$("cancelAssign").addEventListener("click",()=>$("assignDialog").classList.add("hidden"));
$("backToEdit").addEventListener("click",()=>{$("assignDialog").classList.add("hidden");$("editorDialog").classList.remove("hidden");});
async function send(event,payload){
 if(!channel||!paired)throw Error("Host not paired.");
 const ok=await channel.send({type:"broadcast",event,payload});
 if(ok!=="ok")throw Error("Transport returned "+ok);
}
async function sendRequest(event,payload,responseEvent){
 if(request)throw Error("Another request is still in progress.");
 const id=newId(),body={...payload,requestId:id};
 return new Promise(async(resolve,reject)=>{
  const timer=setTimeout(()=>{if(request?.id===id){request=null;controls();reject(Error("Smartboard did not confirm. Check pairing and try again."));}},17000);
  request={id,responseEvent,resolve,reject,timer};controls();
  try{await send(event,body);}catch(e){clearTimeout(timer);if(request?.id===id)request=null;controls();reject(e);}
 });
}
function receiveAck(event,payload){
 if(!request||request.responseEvent!==event||request.id!==payload?.requestId)return;
 clearTimeout(request.timer);const r=request;request=null;controls();
 if(Array.isArray(payload.racers))setRoster({racers:payload.racers});
 if(payload.ok)r.resolve(payload);else r.reject(Error(String(payload.message||"Request rejected by smartboard.")));
}
$("registerBoat").addEventListener("click",async()=>{
 const name=(rescanName||$("racerName").value).trim().slice(0,28);
 if(!name){$("assignStatus").textContent="Enter the pupil's name.";return;}
 if(!pending||!isReady()){ $("assignStatus").textContent="Photo or pairing not ready.";return;}
 $("assignStatus").textContent="Sending drawing to smartboard…";
 try{
  const response=await sendRequest("register-boat",{racerId:rescanId||newId(),name,kind:boardKind,image:pending},"registration-result");
  $("assignStatus").textContent="✓ "+name+" successfully registered";
  $("assignDialog").classList.add("hidden");$("editorDialog").classList.add("hidden");
  pending=null;source=null;rescanId=null;rescanName="";$("racerName").value="";
  photoStatus("✓ "+name+" registered on the smartboard. Scan the next drawing.",true);
 }catch(e){$("assignStatus").textContent=String(e.message||e);photoStatus("Registration failed. The photo is still available; retry.");}
});
$("startRace").addEventListener("click",async()=>{
 if(boardRacing||!roster.length)return;$("raceStatus").textContent="Starting race on smartboard…";
 try{await sendRequest("remote-start",{},"race-result");$("raceStatus").textContent="🏁 Race started on smartboard";boardRacing=true;controls();}
 catch(e){$("raceStatus").textContent=String(e.message||e);}
});
$("gameMode").addEventListener("change",async e=>{
 const desired=e.target.value;
 try{await sendRequest("change-mode",{mode:desired},"mode-result");boardMode=desired;boardKind=desired==="sailing"?"sail":"power";setRoster({racers:[]});photoStatus("Mode changed. Capture boats for "+desired+".");}
 catch(error){message(String(error.message||error));$("gameMode").value=boardMode;}
});
async function disconnect(){
 if(helloTimer){clearInterval(helloTimer);helloTimer=null;}
 await stopStream();if(channel&&client){await client.removeChannel(channel);}
 channel=null;paired=false;controls();
}
async function join(){
 if(connecting)return;
 const room=$("room").value.replace(/[^A-Z0-9]/gi,"").toUpperCase().slice(0,8);$("room").value=room;
 if(room.length!==8){message("Enter the 8-character code shown on smartboard.");return;}
 if(!window.supabase?.createClient){message("Connection library unavailable. Check internet.");return;}
 connecting=true;
 await disconnect();message("Connecting to smartboard…");
 try{
  client=client||window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const ch=client.channel("sketch-boat:host:"+room,{config:{private:false,broadcast:{ack:true}}});channel=ch;lastRoom=room;
  ch.on("broadcast",{event:"board-ready"},()=>{if(ch!==channel)return;paired=true;message("✓ Connected to smartboard",true);photoStatus("Connected. Take a picture of a pupil's boat.");controls();send("roster-request",{}).catch(()=>{});if(helloTimer){clearInterval(helloTimer);helloTimer=null;}})
  .on("broadcast",{event:"roster-state"},({payload})=>{if(ch===channel)setRoster(payload);})
  .on("broadcast",{event:"registration-result"},({payload})=>receiveAck("registration-result",payload))
  .on("broadcast",{event:"remove-result"},({payload})=>receiveAck("remove-result",payload))
  .on("broadcast",{event:"race-result"},({payload})=>receiveAck("race-result",payload))
  .on("broadcast",{event:"mode-result"},({payload})=>receiveAck("mode-result",payload));
  ch.subscribe((status,err)=>{
   if(ch!==channel)return;
   if(status==="SUBSCRIBED"){
    message("Room joined. Waiting for smartboard…");
    ch.send({type:"broadcast",event:"phone-hello",payload:{version:"1.1"}}).catch(()=>{});
    if(helloTimer)clearInterval(helloTimer);
    helloTimer=setInterval(()=>{if(ch===channel&&!paired)ch.send({type:"broadcast",event:"phone-hello",payload:{version:"1.1"}}).catch(()=>{});},2600);
   }else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(status)){
    paired=false;message("Connection interrupted. Check internet and reconnect.");controls();console.warn(status,err);
   }
  });
 }catch(e){console.warn(e);message("Unable to join host room. Try again.");}
 finally{connecting=false;controls();}
}
$("connect").addEventListener("click",join);
$("room").addEventListener("keydown",e=>{if(e.key==="Enter")join();});
window.addEventListener("pagehide",()=>{stopStream();if(channel&&client)client.removeChannel(channel);});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
controls();
if($("room").value.length===8)join();
})();