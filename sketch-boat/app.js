"use strict";
(() => {
const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2, WIDTH = 1200, HEIGHT = 680, STORAGE = "sketch-boat-v1";
let END_X = 2600;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const lerp = (a,b,t) => a+(b-a)*t;
const wrap = (a) => Math.atan2(Math.sin(a),Math.cos(a));
const fmt = (v) => Number.isFinite(v) ? v.toFixed(1) + "s" : "DNF";
const categories = ["quick","challenge","sailing","test"];
const modes = {
  quick:{name:"Quick Race",title:"Design your powerboat",subtitle:"AUTOMATIC POWERBOAT RACING",help:"Draw a top-view boat, bow pointing right. All boats use the same engine.",kind:"power"},
  challenge:{name:"Challenge Mode",title:"Design your powerboat",subtitle:"10-COURSE POWERBOAT CHALLENGE",help:"Use the same boat across 10 increasingly difficult courses. Failure restarts your challenge.",kind:"power"},
  sailing:{name:"Sailing Challenge",title:"Design your sailboat",subtitle:"WIND-POWERED SAILING CHALLENGE",help:"Side view: draw the hull below and the mast and sail above. Without a usable sail, the boat cannot power itself.",kind:"sail"},
  test:{name:"Boat Testing",title:"Design your powerboat",subtitle:"PHYSICS TESTING LAB",help:"Observe speed, steering, collisions and recovery with the same physics used in races.",kind:"power"}
};
function makeTrack(preset="calm"){
 const values=Array.from({length:65},(_,i)=>{const x=i/64;if(preset==="winding")return .5+.24*Math.sin(x*13)+.08*Math.sin(x*27);if(preset==="islands")return .5+.18*Math.sin(x*19)+.05*Math.cos(x*31);if(preset==="slalom")return .5+.3*Math.sin(x*27)+.055*Math.sin(x*43);return .5+.045*Math.sin(x*9);});
 const rocks=preset==="islands"?[{x:.28,offset:-35,r:22},{x:.57,offset:35,r:23},{x:.79,offset:-30,r:21}]:preset==="slalom"?[{x:.22,offset:30,r:19},{x:.46,offset:-30,r:19},{x:.7,offset:33,r:19}]:[];
 return {values,width:200,distance:2600,rocks,preset};
}
function validTrack(raw){
 if(!raw||!Array.isArray(raw.values)||raw.values.length!==65)return makeTrack();
 return {values:raw.values.map(v=>clamp(Number(v)||.5,.08,.92)),width:clamp(Number(raw.width)||200,125,280),distance:[2600,5200,7800,13000].includes(Number(raw.distance))?Number(raw.distance):2600,rocks:(Array.isArray(raw.rocks)?raw.rocks:[]).slice(0,15).map(r=>({x:clamp(Number(r.x)||.5,.05,.95),offset:clamp(Number(r.offset)||0,-90,90),r:clamp(Number(r.r)||20,12,30)})),preset:String(raw.preset||"custom")};
}
const state={mode:"quick",boats:[],chosen:null,level:1,race:null,lastResults:[],history:{power:{},sail:{}},customTrack:makeTrack(),photo:null,photoAngle:0,photoThreshold:205,tool:"pen",drawing:false,stepAccumulator:0,lastFrame:0};
const draw=$("drawCanvas"), dc=draw.getContext("2d",{willReadFrequently:true}), view=$("raceCanvas"), ctx=view.getContext("2d");
const boatImgs=new Map();
const palette=["#c1f38b","#f9bc73","#ff8ca0","#7ce0ec","#c3adff","#f2da83","#98bdfc","#ff9f63"];
function notice(msg){$("editorNotice").textContent=msg;}
function save(){
 try {localStorage.setItem(STORAGE,JSON.stringify({boats:state.boats,history:state.history,customTrack:state.customTrack}));$("storageState").textContent="● Saved on this device";}
 catch(e){$("storageState").textContent="⚠ Device storage full"; notice("Storage is unavailable; results may not persist.");}
}
function load(){
 try {const obj=JSON.parse(localStorage.getItem(STORAGE)||"{}");state.boats=Array.isArray(obj.boats)?obj.boats.slice(0,20):[];if(obj.history)state.history=obj.history;if(obj.customTrack)state.customTrack=validTrack(obj.customTrack);END_X=state.customTrack.distance;}
 catch(e){state.boats=[];}
}
function kind(){return modes[state.mode].kind;}
function listBoats(){return state.boats.filter(b=>b.kind===kind());}
function currentBoat(){return listBoats().find(b=>b.id===state.chosen)||listBoats()[0]||null;}
function drawBase(){
 dc.clearRect(0,0,draw.width,draw.height);
 dc.save();dc.strokeStyle="rgba(23,104,121,.12)";dc.setLineDash([4,6]);dc.lineWidth=1;
 if(kind()==="sail"){dc.beginPath();dc.moveTo(0,148);dc.lineTo(360,148);dc.stroke();}
 else {dc.beginPath();dc.moveTo(0,105);dc.lineTo(360,105);dc.moveTo(180,0);dc.lineTo(180,210);dc.stroke();}
 dc.restore();
}
function clearDrawing(){dc.clearRect(0,0,360,210);drawBase();}
function setTool(tool){
 state.tool=tool;
 document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("selected",b.dataset.tool===tool));
}
let lastPointer=null;
function penColor(){
 if(state.tool==="hull")return "#143e5d";
 if(state.tool==="sail")return "#e39a42";
 return kind()==="sail"?"#18425c":"#172d40";
}
function drawPoint(e){
 const r=draw.getBoundingClientRect(),x=(e.clientX-r.left)*360/r.width,y=(e.clientY-r.top)*210/r.height;
 if(!lastPointer)lastPointer={x,y};
 dc.save();dc.lineCap="round";dc.lineJoin="round";dc.globalCompositeOperation=state.tool==="erase"?"destination-out":"source-over";
 dc.strokeStyle=penColor();dc.lineWidth=state.tool==="erase"?Number($("brush").value)*2:Number($("brush").value);
 dc.beginPath();dc.moveTo(lastPointer.x,lastPointer.y);dc.lineTo(x+.01,y+.01);dc.stroke();dc.restore();
 lastPointer={x,y};
}
draw.addEventListener("pointerdown",(e)=>{if(state.race?.running)return;state.drawing=true;lastPointer=null;draw.setPointerCapture(e.pointerId);drawPoint(e);});
draw.addEventListener("pointermove",(e)=>{if(state.drawing)drawPoint(e);});
const stopDraw=()=>{state.drawing=false;lastPointer=null;};
draw.addEventListener("pointerup",stopDraw);draw.addEventListener("pointercancel",stopDraw);
document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
$("clearDraw").addEventListener("click",()=>{clearDrawing();notice("Drawing cleared.");});
function example(){
 dc.clearRect(0,0,360,210);
 if(kind()==="power"){
  dc.fillStyle="#17859d";dc.strokeStyle="#113f61";dc.lineWidth=5;
  dc.beginPath();dc.moveTo(65,75);dc.lineTo(198,72);dc.quadraticCurveTo(271,82,306,105);dc.quadraticCurveTo(271,128,198,138);dc.lineTo(65,135);dc.quadraticCurveTo(49,105,65,75);dc.closePath();dc.fill();dc.stroke();
  dc.fillStyle="#a7e5ee";dc.beginPath();dc.roundRect(130,85,65,40,9);dc.fill();dc.stroke();
  dc.fillStyle="#ffc86f";dc.fillRect(78,85,12,40);
 } else {
  dc.fillStyle="#117f9c";dc.strokeStyle="#16465b";dc.lineWidth=5;
  dc.beginPath();dc.moveTo(52,152);dc.lineTo(281,152);dc.lineTo(258,178);dc.lineTo(91,178);dc.closePath();dc.fill();dc.stroke();
  dc.strokeStyle="#704327";dc.lineWidth=7;dc.beginPath();dc.moveTo(157,152);dc.lineTo(157,31);dc.stroke();
  dc.fillStyle="#f3dca0";dc.strokeStyle="#bf8748";dc.lineWidth=3;
  dc.beginPath();dc.moveTo(165,40);dc.lineTo(165,146);dc.lineTo(271,144);dc.closePath();dc.fill();dc.stroke();
 }
 notice("Sample created. You can edit it before registering.");
}
$("exampleBtn").addEventListener("click",example);
$("rotateLeft").addEventListener("click",()=>{
 const temp=document.createElement("canvas");temp.width=360;temp.height=210;temp.getContext("2d").drawImage(draw,0,0);
 dc.clearRect(0,0,360,210);dc.save();dc.translate(180,105);dc.rotate(-Math.PI/2);
 dc.drawImage(temp,-105,-180,210,360);dc.restore();notice("Drawing rotated. Make sure the bow points right.");
});
function previewPhoto(){
 if(!state.photo)return;
 const tmp=document.createElement("canvas");tmp.width=360;tmp.height=210;
 const t=tmp.getContext("2d",{willReadFrequently:true}),img=state.photo;
 t.save();t.translate(180,105);t.rotate(state.photoAngle*Math.PI/180);
 const zoom=Math.min(330/img.width,182/img.height);t.drawImage(img,-img.width*zoom/2,-img.height*zoom/2,img.width*zoom,img.height*zoom);t.restore();
 const pix=t.getImageData(0,0,360,210),d=pix.data,thr=state.photoThreshold,clean=$("lineClean").checked;
 for(let i=0;i<d.length;i+=4){
  const r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b;
  if(d[i+3]===0)continue;
  const ruled=clean && b>r*1.18 && b>g*1.05 && lum>110;
  if(lum>thr || ruled){d[i+3]=0;continue;}
  const strength=clamp((thr-lum)/95,0.35,1);
  d[i]=18;d[i+1]=48;d[i+2]=68;d[i+3]=Math.round(255*strength);
 }
 dc.clearRect(0,0,360,210);dc.putImageData(pix,0,0);
}
$("photoInput").addEventListener("change",async(e)=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 if(!file.type.startsWith("image/")){notice("Please select an image.");return;}
 try{
  const url=URL.createObjectURL(file),img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});
  URL.revokeObjectURL(url);state.photo=img;state.photoAngle=0;state.photoThreshold=205;
  $("threshold").value=205;$("rotation").value=0;$("photoEditor").classList.remove("hidden");
  previewPhoto();notice("Photo imported. Adjust cleanup and angle, then apply.");
 }catch(e){notice("Unable to read this photo.");}
 e.target.value="";
});
$("threshold").addEventListener("input",(e)=>{state.photoThreshold=Number(e.target.value);$("thresholdValue").textContent=e.target.value;previewPhoto();});
$("rotation").addEventListener("input",(e)=>{state.photoAngle=Number(e.target.value);$("rotationValue").textContent=e.target.value+"°";previewPhoto();});
$("lineClean").addEventListener("change",()=>{if(state.photo)previewPhoto();});
$("applyPhoto").addEventListener("click",()=>{state.photo=null;$("photoEditor").classList.add("hidden");notice("Photo applied. You can erase stray marks before registering.");});
$("cancelPhoto").addEventListener("click",()=>{state.photo=null;$("photoEditor").classList.add("hidden");clearDrawing();notice("Photo cancelled.");});
function hull(points){
 points.sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const low=[],high=[];
 for(const p of points){while(low.length>=2&&cross(low[low.length-2],low[low.length-1],p)<=0)low.pop();low.push(p);}
 for(let i=points.length-1;i>=0;i--){const p=points[i];while(high.length>=2&&cross(high[high.length-2],high[high.length-1],p)<=0)high.pop();high.push(p);}
 return low.slice(0,-1).concat(high.slice(0,-1));
}
function polygonArea(poly){let s=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];s+=p.x*q.y-p.y*q.x;}return Math.abs(s)/2;}
function scanPoints(imgData,predicate){
 const pts=[];for(let y=4;y<206;y+=3)for(let x=4;x<356;x+=3){
 const i=(y*360+x)*4;if(imgData[i+3]>75&&predicate(x,y,imgData[i],imgData[i+1],imgData[i+2]))pts.push({x,y});
 }return pts;
}
function analyze(){
 const data=dc.getImageData(0,0,360,210).data;
 const points=scanPoints(data,()=>true);
 if(points.length<32)return {error:"Draw a recognizable boat outline first, or upload a clearer photo."};
 let minX=360,maxX=0,minY=210,maxY=0;
 for(const p of points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
 const len=maxX-minX,wid=maxY-minY;
 if(len<35||wid<15)return {error:"Boat outline is too small. Draw a larger complete hull."};
 const poly=hull(points),area=polygonArea(poly);
 if(area<700)return {error:"This looks like a line, not a hull. Draw a wider connected boat shape."};
 const aspect=len/Math.max(1,wid),compact=clamp(area/(len*wid),.1,1);
 if(kind()==="power"){
  const physicalLength=clamp(len*.075,3.5,24),physicalWidth=clamp(wid*.075,1.2,15);
  const mass=120+area*.009,drag=0.24+physicalWidth*.085+physicalLength*.009+Math.abs(1-compact)*.18;
  const turn=clamp((physicalWidth/physicalLength)*2.2,.35,2.6);
  return {mass,drag,turn,length:physicalLength,width:physicalWidth,area,aspect,compact,ratio:aspect,topSpeed:Math.sqrt(23500/drag),sailArea:0,support:0,bounds:{minX,maxX,minY,maxY}};
 }
 const sailPoints=scanPoints(data,(x,y,r,g,b)=>y<148 && ((r>g*1.12&&r>b*.9) || y<110));
 const hullPoints=scanPoints(data,(x,y)=>y>=139);
 const sailPoly=sailPoints.length>5?hull(sailPoints):[],sailArea=polygonArea(sailPoly);
 const hullArea=hullPoints.length>5?polygonArea(hull(hullPoints)):0;
 const sailBounds=sailPoints.length?{lo:Math.min(...sailPoints.map(p=>p.y)),hi:Math.max(...sailPoints.map(p=>p.y))}:{lo:0,hi:0};
 const baseYs=hullPoints.length?Math.min(...hullPoints.map(p=>p.y)):210;
 const mastXs=[];for(let x=30;x<330;x+=6){
  let hits=0;for(let y=55;y<155;y+=5){const i=(y*360+x)*4;if(data[i+3]>85)hits++;}
  if(hits>10)mastXs.push({x,hits});
 }
 const mastSupport=mastXs.length?clamp(Math.max(...mastXs.map(p=>p.hits))/18,0,1):0;
 const supports=sailArea>480 && hullArea>250 && mastSupport>.34 && baseYs<179 && sailBounds.hi>65;
 const efficiency=clamp((sailArea/6500)*(.45+.55*mastSupport),0,1.8);
 const mass=120+hullArea*.009+sailArea*.0015;
 return {mass,drag:.20+Math.max(0,hullArea/20000)*.48,length:len*.075,width:wid*.075,area:hullArea,aspect,compact,turn:.6,ratio:aspect,sailArea,efficiency,support:mastSupport,validSail:supports,bounds:{minX,maxX,minY,maxY}};
}
function imageSrc(){const c=document.createElement("canvas");c.width=360;c.height=210;c.getContext("2d").drawImage(draw,0,0);return c.toDataURL("image/png");}
function imageFor(b){
 if(!boatImgs.has(b.id)){const image=new Image();image.src=b.image;boatImgs.set(b.id,image);}return boatImgs.get(b.id);
}
function register(){
 if(state.race?.running){notice("Finish the race before editing the roster.");return;}
 const name=$("racerName").value.trim().replace(/\s+/g," ");
 if(!name){notice("Enter a racer's name after capturing the drawing.");$("racerName").focus();return;}
 const existing=listBoats().find(b=>b.name.toLowerCase()===name.toLowerCase());
 if(state.boats.length>=20&&!existing){notice("20 boats maximum. Remove a boat first.");return;}
 const stats=analyze();if(stats.error){notice(stats.error);return;}
 const id="b"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 if(existing){
  const prior=state.history[kind()][existing.id];
  state.boats=state.boats.filter(b=>b.id!==existing.id);boatImgs.delete(existing.id);
  delete state.history[kind()][existing.id];
  if(prior?.best!=null)state.history[kind()][id]={levels:[],best:prior.best,failed:false};
 }
 state.boats.push({id,name,kind:kind(),stats,image:imageSrc(),color:existing?existing.color:palette[(state.boats.length)%palette.length]});
 state.chosen=id;save();renderRoster();$("racerName").value="";clearDrawing();notice(name+(existing?" received a new boat design. Previous challenge run reset.":" registered. Draw the next boat or begin racing."));
 updateStage();
}
$("addBoat").addEventListener("click",register);
function renderRoster(){
 const items=listBoats();$("boatCount").textContent=items.length+" / 20";
 const root=$("boatList");root.replaceChildren();
 if(!items.length){const p=document.createElement("p");p.className="hint";p.textContent="No boats registered yet.";root.append(p);return;}
 if(!items.some(b=>b.id===state.chosen))state.chosen=items[0].id;
 for(const b of items){
  const row=document.createElement("div");row.className="boat-row";
  const img=document.createElement("img");img.src=b.image;img.alt="Drawing by "+b.name;
  const detail=document.createElement("div");detail.className="boat-detail";
  const title=document.createElement("strong");title.textContent=b.name;
  const metrics=document.createElement("small");metrics.textContent=b.kind==="power"?"Hull "+b.stats.length.toFixed(1)+"m × "+b.stats.width.toFixed(1)+"m":b.stats.validSail?"Usable sail":"Sail needs support";
  detail.append(title,metrics);
  const btn=document.createElement("button");btn.textContent=state.chosen===b.id?"✓":"Select";btn.title="Select "+b.name;
  btn.addEventListener("click",()=>{state.chosen=b.id;renderRoster();updateStage();});
  const remove=document.createElement("button");remove.textContent="×";remove.title="Remove "+b.name;
  remove.addEventListener("click",()=>{if(state.race?.running)return;state.boats=state.boats.filter(x=>x.id!==b.id);delete state.history[b.kind][b.id];boatImgs.delete(b.id);save();renderRoster();updateStage();notice(b.name+" removed.");});
  row.append(img,detail,btn,remove);root.append(row);
 }
}
function selectMode(mode){
 if(!categories.includes(mode))return;
 if(state.race?.running){notice("Finish or reset the race before switching modes.");return;}
 const oldKind=kind();state.mode=mode;END_X=isCustom()?state.customTrack.distance:2600;const info=modes[mode];
 document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
 $("editorTitle").textContent=info.title;$("modeHelp").textContent=info.help;
 $("stageTitle").textContent=info.name;$("stageSubtitle").textContent=info.subtitle;
 $("drawingBadge").textContent=info.kind==="sail"?"SIDE VIEW":"TOP VIEW";
 $("drawDirection").textContent=info.kind==="sail"?"WIND →":"BOW →";
 document.querySelectorAll(".sail-only").forEach(el=>el.classList.toggle("hidden",info.kind!=="sail"));
 if(oldKind!==info.kind){clearDrawing();state.chosen=null;setTool("pen");}
 state.level=mode==="sailing"||mode==="challenge"?1:state.level;
 state.lastResults=[];state.race=null;
 $("nextLevel").classList.add("hidden");$("photoEditor").classList.add("hidden");state.photo=null;
 renderRoster();fillCourses();updateStage();drawIdle();renderResults();
}
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>selectMode(b.dataset.mode)));
const tracks=[
{name:"Open Water",amp:14,freq:410,width:202,obstacles:0,limit:62},
{name:"Gentle Waves",amp:30,freq:375,width:197,obstacles:0,limit:65},
{name:"First Bends",amp:40,freq:345,width:191,obstacles:1,limit:68},
{name:"Island Pass",amp:51,freq:320,width:183,obstacles:2,limit:72},
{name:"Crossing Currents",amp:57,freq:301,width:180,obstacles:2,limit:75},
{name:"Tight Channel",amp:65,freq:285,width:172,obstacles:3,limit:78},
{name:"The S-Curves",amp:77,freq:265,width:168,obstacles:3,limit:83},
{name:"Rocky Strait",amp:83,freq:253,width:157,obstacles:4,limit:88},
{name:"Hairpin Bay",amp:95,freq:242,width:150,obstacles:4,limit:92},
{name:"Grand Regatta",amp:102,freq:232,width:145,obstacles:5,limit:98}
];
function fillCourses(){
 const sel=$("raceLevel");sel.replaceChildren();
 tracks.forEach((t,i)=>{const op=document.createElement("option");op.value=String(i+1);op.textContent=(i+1)+". "+(state.mode==="sailing"?"Wind "+t.name:t.name);sel.append(op);});
 if(state.mode==="challenge"||state.mode==="sailing"){const b=currentBoat(),data=b?state.history[b.kind][b.id]:null;state.level=data&&data.levels&&data.levels.length<10?data.levels.length+1:1;sel.disabled=true;}
 else {sel.disabled=false;state.level=1;}
 sel.value=String(state.level);
 updateCourseHint();
}
function updateCourseHint(){
 const t=getCourse(state.level);$("courseHint").textContent=(state.mode==="sailing"?"Wind conditions change along the course. ":"")+t.name+" · "+t.limit+"s time limit.";
 $("levelLabel").textContent="COURSE "+String(state.level).padStart(2,"0");
}
$("raceLevel").addEventListener("change",e=>{if(state.race?.running)return;state.level=Number(e.target.value);updateCourseHint();drawIdle();});
function isCustom(){return state.mode==="quick"||state.mode==="test";}
function getCourse(lvl=state.level){return isCustom()?{name:"Designed Watercourse",width:state.customTrack.width,limit:Math.round(38+state.customTrack.distance/75),obstacles:state.customTrack.rocks.length}:tracks[lvl-1];}
function pathY(x,lvl=state.level){
 if(isCustom()){
  const arr=state.customTrack.values,n=arr.length-1,p=clamp(x/END_X,0,1)*n,i=Math.min(n-1,Math.floor(p)),u=p-i;
  const a=arr[Math.max(0,i-1)],b=arr[i],c=arr[i+1],d=arr[Math.min(n,i+2)];
  const smooth=.5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u);
  return 265+(clamp(smooth,.06,.94)-.5)*250;
 }
 const t=tracks[lvl-1],p=x/t.freq;return 265+t.amp*(.68*Math.sin(p+.25)+.24*Math.sin(p*1.64-1.3));
}
function curvature(x,lvl){
 const h=28,ya=pathY(x-h,lvl),yb=pathY(x,lvl),yc=pathY(x+h,lvl);
 const slope=(yc-ya)/(2*h),second=(yc-2*yb+ya)/(h*h);
 return Math.abs(second)/Math.pow(1+slope*slope,1.5);
}
function obstacles(level){
 if(isCustom())return state.customTrack.rocks.map(r=>({x:r.x*END_X,y:pathY(r.x*END_X,level)+r.offset,r:r.r}));
 const t=tracks[level-1],arr=[];
 for(let i=0;i<t.obstacles;i++){
  const x=540+i*470+((i+level)%2)*60;
  const y=pathY(x,level)+((i%2===0)?-1:1)*(t.width*.28);
  arr.push({x,y,r:16+i%2*6});
 }return arr;
}
function spawn(b,i,count){
 return {boat:b,x:65-i*27,y:pathY(80,state.level)+(i-(count-1)/2)*37,vx:0,vy:0,a:0,omega:0,time:0,finished:false,failed:false,collisions:0,spin:0,wall:0,top:0,lastRecovery:0,spinUntil:0,stuck:0,freeze:0};
}
function start(){
 if(state.race?.running)return;
 END_X=isCustom()?state.customTrack.distance:2600;
 const selected=currentBoat();
 const boats=(state.mode==="quick")?listBoats():(selected?[selected]:[]);
 if(!boats.length){notice("Register a boat in this category before starting.");return;}
 if(state.mode==="challenge"||state.mode==="sailing"){
  const data=state.history[kind()][selected.id];
  if(data?.failed){notice("This boat failed its challenge. Draw and register a NEW design under the same racer name to restart Level 1.");return;}
  if(data?.levels?.length===10){data.levels=[];save();}
  state.level=(data?.levels?.length<10&&data.levels.length>=0)?data.levels.length+1:1;
  $("raceLevel").value=state.level;updateCourseHint();
 }
 const racers=boats.map((b,i)=>spawn(b,i,boats.length));
 state.race={mode:state.mode,level:state.level,racers,timer:0,running:true,done:false,obstacles:obstacles(state.level),camera:0};
 state.lastResults=[];$("emptyState").classList.add("hidden");$("raceBanner").classList.add("hidden");
 $("startRace").disabled=true;$("resetRace").disabled=false;$("nextLevel").classList.add("hidden");
 $("raceInfo").textContent=state.mode==="sailing"?"Wind drives the sails. All boats use the same conditions.":"Shared engine and automatic controller. Physics decides the results.";
 $("resultsBody").textContent="Race underway…";
}
$("startRace").addEventListener("click",start);
function reset(){
 state.race=null;state.lastResults=[];$("startRace").disabled=false;$("nextLevel").classList.add("hidden");
 $("raceBanner").classList.add("hidden");$("clock").textContent="00:00.0";$("raceInfo").textContent="Ready to race";renderResults();drawIdle();
}
$("resetRace").addEventListener("click",reset);
$("nextLevel").addEventListener("click",()=>{$("nextLevel").classList.add("hidden");start();});
function scoreFailure(r){
 if(r.failed||r.finished)return;
 r.failed=true;r.time=Infinity;
}
function step(dt){
 const race=state.race;if(!race||!race.running)return;
 race.timer+=dt;const level=race.level,t=getCourse(level);
 for(const r of race.racers){
  if(r.finished||r.failed)continue;
  const s=r.boat.stats,spd=Math.hypot(r.vx,r.vy),sailing=r.boat.kind==="sail";
  if(sailing){
   const wind=13+level*.53+1.8*Math.sin(r.x/260+race.timer*.22);
   const apparent=Math.max(0,wind*17-r.vx*.40);
   const eff=s.validSail?s.efficiency:0;
   const drive=.36*s.sailArea*eff*Math.pow(apparent/100,2);
   const drag=(.06+s.drag*.18)*r.vx*Math.abs(r.vx);
   const a=(drive-drag)/s.mass;
   r.vx=clamp(r.vx+a*dt,-5,170);r.x+=r.vx*dt;
   r.y=pathY(r.x,level);r.top=Math.max(r.top,r.vx);
   if(!s.validSail&&race.timer>12){r.stuck=race.timer;}
  } else {
   const ahead=clamp(55+spd*.67,60,162);
   const targetY=pathY(r.x+ahead,level);
   const desired=Math.atan2(targetY-r.y,ahead);
   let diff=wrap(desired-r.a);
   const yawForce=clamp(diff*5-r.omega*3.3,-s.turn,s.turn);
   r.omega=clamp(r.omega+yawForce*dt,-1.65,1.65);
   r.a=wrap(r.a+r.omega*dt);
   const bend=Math.max(curvature(r.x+75,level),curvature(r.x+150,level),curvature(r.x+205,level));
   const safe=clamp(Math.sqrt(21/Math.max(.0002,bend)),65,230);
   const throttle=spd>safe?0.08:1;
   const thrust=23500*throttle;
   const forwardX=Math.cos(r.a),forwardY=Math.sin(r.a);
   const drag=s.drag*spd*spd;
   const sideways=-forwardY*r.vx+forwardX*r.vy;
   const sideForce=-sideways*s.mass*1.75;
   const fx=thrust*forwardX-(spd>0?drag*r.vx/spd:0)-forwardY*sideForce;
   const fy=thrust*forwardY-(spd>0?drag*r.vy/spd:0)+forwardX*sideForce;
   r.vx+=fx/s.mass*dt;r.vy+=fy/s.mass*dt;
   const maxSpeed=250;const vel=Math.hypot(r.vx,r.vy);
   if(vel>maxSpeed){r.vx*=maxSpeed/vel;r.vy*=maxSpeed/vel;}
   r.x+=r.vx*dt;r.y+=r.vy*dt;
   r.top=Math.max(r.top,Math.hypot(r.vx,r.vy));
   if(Math.abs(r.omega)>1.08&&spd>95)r.spin+=dt;
   const error=r.y-pathY(r.x,level);
   if(Math.abs(error)>t.width*.5-12){
    r.wall++;r.collisions++;r.vx*=.84;r.vy*=-.33;r.y=pathY(r.x,level)+Math.sign(error)*(t.width*.5-12);
    r.omega+=Math.sign(error)*-.14;
   }
   for(const obs of race.obstacles){
    const dx=r.x-obs.x,dy=r.y-obs.y,dist=Math.hypot(dx,dy),minDist=obs.r+13+s.width*.75;
    if(dist<minDist&&dist>0){
     const nx=dx/dist,ny=dy/dist,vn=r.vx*nx+r.vy*ny;
     if(vn<0){r.vx-=(1.3*vn)*nx;r.vy-=(1.3*vn)*ny;}
     r.x=obs.x+nx*minDist;r.y=obs.y+ny*minDist;
     r.omega+=Math.sign(dy)*.35;r.collisions++;r.spinUntil=race.timer+2;
    }
   }
   if(race.timer<.2||r.x>END_X){/* start / finish safeguards */}
  }
  if(r.x>=END_X){r.finished=true;r.time=race.timer;}
  if(r.x<-150)scoreFailure(r);
  if(spd<8&&race.timer>6)r.stuck+=dt;else r.stuck=0;
  if(r.stuck>14)scoreFailure(r);
  if(race.timer>=t.limit)scoreFailure(r);
 }
 if(race.mode!=="sailing")collideBoats(race.racers);
 if(race.racers.every(r=>r.finished||r.failed))finish();
}
function collideBoats(arr){
 for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
  const a=arr[i],b=arr[j];if(a.finished||a.failed||b.finished||b.failed)continue;
  const dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),ar=a.boat.stats,br=b.boat.stats;
  const r1=14+ar.length*1.1,r2=14+br.length*1.1,limit=r1+r2;
  if(dist>=limit||dist<.01)continue;
  const nx=dx/dist,ny=dy/dist,rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
  if(rel<0){
   const impulse=-(1+.25)*rel/(1/ar.mass+1/br.mass);
   a.vx-=impulse*nx/ar.mass;a.vy-=impulse*ny/ar.mass;
   b.vx+=impulse*nx/br.mass;b.vy+=impulse*ny/br.mass;
   const eccentric=clamp(dy/limit,-1,1);
   a.omega-=eccentric*impulse/(ar.mass*36);b.omega+=eccentric*impulse/(br.mass*36);
   a.collisions++;b.collisions++;a.spinUntil=b.spinUntil=state.race.timer+2;
  }
  const penetration=limit-dist;
  a.x-=nx*penetration*.5;a.y-=ny*penetration*.5;
  b.x+=nx*penetration*.5;b.y+=ny*penetration*.5;
 }
}
function finish(){
 const race=state.race;race.running=false;race.done=true;
 state.lastResults=race.racers.map(r=>({id:r.boat.id,name:r.boat.name,finished:r.finished,time:r.finished?r.time:Infinity,top:r.top,collisions:r.collisions,spin:r.spin,level:race.level,mode:race.mode,stats:r.boat.stats})).sort((a,b)=>Number(b.finished)-Number(a.finished)||a.time-b.time);
 $("startRace").disabled=false;
 const winner=state.lastResults.find(r=>r.finished);
 $("raceBanner").textContent=winner?"🏁 "+winner.name+" finishes!":"No boat finished this course";
 $("raceBanner").classList.remove("hidden");
 $("raceInfo").textContent=winner?"Race complete · "+state.lastResults.filter(r=>r.finished).length+" finished":"Course failed · redesign or try again";
 if(race.mode==="challenge"||race.mode==="sailing"){
  const r=state.lastResults[0],category=kind();
  const record=state.history[category][r.id]||{levels:[],best:null};
  if(r.finished){
   if(record.levels.length===race.level-1)record.levels.push(r.time);
   if(record.levels.length===10){
    const total=record.levels.reduce((a,b)=>a+b,0);
    record.best=record.best===null||record.best===undefined?total:Math.min(record.best,total);
    $("raceBanner").textContent="🏆 ALL 10 COURSES COMPLETED!";
   } else {$("nextLevel").classList.remove("hidden");}
  }else{
   record.levels=[];record.failed=true;
   $("raceInfo").textContent="Challenge failed. A new boat drawing is required to restart at Level 1.";
  }
  state.history[category][r.id]=record;save();
 }
 renderResults();
}
function renderResults(){
 const el=$("resultsBody");el.replaceChildren();
 if(state.mode==="test"&&state.lastResults.length){
  const r=state.lastResults[0],s=r.stats,grid=document.createElement("div");grid.className="test-grid";
  const data=[["Top speed",Math.round(r.top)+" px/s"],["Water drag",s.drag.toFixed(2)],["Hull length",s.length.toFixed(1)+" m"],["Hull width",s.width.toFixed(1)+" m"],["Contacts",String(r.collisions)],["High yaw time",r.spin.toFixed(1)+" s"]];
  for(const [k,v] of data){const card=document.createElement("div");card.className="test-data";const small=document.createElement("small");small.textContent=k;const strong=document.createElement("b");strong.textContent=v;card.append(small,strong);grid.append(card);}el.append(grid);return;
 }
 if(!state.lastResults.length){
  const hint=document.createElement("p");hint.className="hint";hint.textContent="Register a boat and begin a race to see results.";el.append(hint);
 }else for(let i=0;i<state.lastResults.length;i++){
  const r=state.lastResults[i],row=document.createElement("div");row.className="result-line";
  for(const [cls,value] of [["place",String(i+1).padStart(2,"0")],["name",r.name],["score",fmt(r.time)],["result-desc",r.finished?"FINISHED":"DNF"]]){
   const cell=document.createElement("span");cell.className=cls;cell.textContent=value;if(cls==="name")cell.style.fontWeight="800";row.append(cell);
  }el.append(row);
 }
 if(state.mode==="challenge"||state.mode==="sailing"){
  const label=document.createElement("div");label.className="leaderboard-label";label.textContent="BEST OVERALL · "+(state.mode==="sailing"?"SAILING":"POWERBOAT");el.append(label);
  const scores=listBoats().map(b=>{
   const rec=state.history[b.kind][b.id]||{levels:[]};return {name:b.name,levels:(rec.levels||[]).length,best:rec.best,total:(rec.levels||[]).reduce((a,x)=>a+x,0)};
  }).sort((a,b)=>Number(b.best!==null&&b.best!==undefined)-Number(a.best!==null&&a.best!==undefined)||(a.best??Infinity)-(b.best??Infinity)||b.levels-a.levels||a.total-b.total);
  for(let i=0;i<Math.min(scores.length,8);i++){
   const s=scores[i],line=document.createElement("div");line.className="result-line";
   for(const val of [String(i+1).padStart(2,"0"),s.name,s.best!=null?fmt(s.best):"—",s.best!=null?"10 / 10":s.levels+" / 10"]){
    const span=document.createElement("span");span.textContent=val;line.append(span);
   }el.append(line);
  }
 }
}
function exportResults(){
 const rows=[["Mode","Level","Racer","Result","Time (s)","Top speed (px/s)","Contacts","Spin time (s)"]];
 for(const r of state.lastResults)rows.push([r.mode,r.level,r.name,r.finished?"Finished":"DNF",r.finished?r.time.toFixed(2):"",r.top.toFixed(2),r.collisions,r.spin.toFixed(2)]);
 const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="sketch-boat-results.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$("exportResults").addEventListener("click",exportResults);
function updateStage(){
 $("startRace").textContent=state.mode==="test"?"🧪 RUN TEST":"🏁 BEGIN RACE";
 $("resultsTitle").textContent=state.mode==="test"?"Test report":state.mode==="challenge"||state.mode==="sailing"?"Results & Best Overall":"Race results";
 fillCourses();renderResults();
 if(!state.race?.running)drawIdle();
}
function lineCourse(camera,level,offset){
 ctx.beginPath();
 for(let x=Math.max(0,camera-40);x<=camera+1010;x+=16){
  const sx=(x-camera)*1.17,sy=pathY(x,level)*1.17+43+offset;
  if(x<=Math.max(0,camera-40))ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
 }return ctx;
}
function waterBackground(time){
 const bg=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);
 bg.addColorStop(0,"#095271");bg.addColorStop(1,"#0e7491");ctx.fillStyle=bg;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.globalAlpha=.16;ctx.strokeStyle="#a7e9ff";ctx.lineWidth=1;
 for(let y=0;y<HEIGHT;y+=52)for(let x=0;x<WIDTH;x+=102){
  ctx.beginPath();const w=x+(time*12)%102;ctx.moveTo(w,y+10*Math.sin(x+y));ctx.quadraticCurveTo(w+14,y+6*Math.sin(time+x),w+32,y);ctx.stroke();
 }ctx.globalAlpha=1;
}
function drawPowerTrack(race,time){
 const lvl=race?.level||state.level,t=getCourse(lvl),camera=race?.camera||0;
 waterBackground(time);
 const upper=[],lower=[];
 for(let x=Math.max(0,camera-35);x<camera+1070;x+=9){
  const sy=pathY(x,lvl)*1.17+43,sx=(x-camera)*1.17,half=t.width*.585;
  upper.push([sx,sy-half]);lower.push([sx,sy+half]);
 }
 ctx.beginPath();upper.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 lower.reverse().forEach(([x,y])=>ctx.lineTo(x,y));ctx.closePath();
 const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,"#258eaf");g.addColorStop(.5,"#2797b1");g.addColorStop(1,"#1c86a6");
 ctx.fillStyle=g;ctx.fill();
 for(const sign of [-1,1]){
  ctx.beginPath();for(let x=Math.max(0,camera-35);x<camera+1070;x+=8){
   const sx=(x-camera)*1.17,sy=pathY(x,lvl)*1.17+43+sign*t.width*.585;
   if(x===Math.max(0,camera-35))ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
  }ctx.strokeStyle="#a6e1e1";ctx.globalAlpha=.55;ctx.lineWidth=3;ctx.setLineDash([15,9]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
 }
 ctx.setLineDash([8,18]);ctx.strokeStyle="#c1f9e5";ctx.lineWidth=2;ctx.globalAlpha=.3;lineCourse(camera,lvl,0).stroke();ctx.globalAlpha=1;ctx.setLineDash([]);
 for(const rock of race?.obstacles||obstacles(lvl)){
  const x=(rock.x-camera)*1.17,y=rock.y*1.17+43;if(x<-100||x>1300)continue;
  ctx.fillStyle="#566674";ctx.strokeStyle="#e8d1af";ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(x,y,rock.r*1.17,rock.r*.84,Math.sin(rock.x)*.4,0,TAU);ctx.fill();ctx.stroke();
 }
 const fx=(END_X-camera)*1.17,fy=pathY(END_X,lvl)*1.17+43;
 if(fx>-60&&fx<WIDTH+70){for(let q=-4;q<4;q++){ctx.fillStyle=q%2?"#f3faff":"#152c38";ctx.fillRect(fx-6,fy+q*t.width*.146,13,t.width*.146);}}
 for(let q=0;q<7;q++){
  const x=(190+q*400-camera)*1.17,y=pathY(190+q*400,lvl)*1.17+43;
  if(x<0||x>WIDTH)continue;ctx.fillStyle="#ffe6b2";ctx.font="bold 11px system-ui";ctx.fillText(q===0?"START":"",x-15,y-t.width*.62);
 }
}
function renderBoat(r,camera,side=false){
 const img=imageFor(r.boat);if(!img.complete)return;
 const s=r.boat.stats,b=s.bounds,x=(r.x-camera)*1.17,y=side?345+Math.sin(r.x*.055+state.race.timer*3)*4:r.y*1.17+43;
 const targetLen=clamp(s.length*4.9,45,96),targetWidth=clamp(s.width*4.2,18,52);
 ctx.save();ctx.translate(x,y);if(!side)ctx.rotate(r.a);
 ctx.fillStyle="#d8fbfd";ctx.globalAlpha=.32;ctx.beginPath();ctx.ellipse(-targetLen*.28,0,targetLen*.9,targetWidth*.95,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
 const srcW=Math.max(5,b.maxX-b.minX+6),srcH=Math.max(5,b.maxY-b.minY+6);
 const dw=side?clamp(s.length*5,72,130):targetLen,dh=side?110:targetWidth;
 ctx.drawImage(img,b.minX-3,b.minY-3,srcW,srcH,-dw*.5,-dh*.5,dw,dh);
 ctx.restore();
 ctx.fillStyle="#fff";ctx.font="bold 12px system-ui";ctx.textAlign="center";
 ctx.shadowColor="#0b1c2d";ctx.shadowBlur=5;ctx.fillText(r.boat.name,x,side?235:y-targetWidth*.7-17);ctx.shadowBlur=0;ctx.textAlign="left";
}
function drawSailTrack(race,time){
 const camera=race?.camera||0,lvl=race?.level||state.level;
 const sky=ctx.createLinearGradient(0,0,0,430);sky.addColorStop(0,"#70b8df");sky.addColorStop(1,"#d1edf1");ctx.fillStyle=sky;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.fillStyle="#f0f8ed";ctx.beginPath();ctx.arc(980,82,40,0,TAU);ctx.fill();
 ctx.fillStyle="#2c7c9e";ctx.fillRect(0,365,WIDTH,HEIGHT-365);
 ctx.fillStyle="#238cac";ctx.fillRect(0,383,WIDTH,HEIGHT-383);
 ctx.lineWidth=2;ctx.strokeStyle="#ccf9ed";ctx.globalAlpha=.55;
 for(let y=382;y<HEIGHT;y+=34){ctx.beginPath();for(let x=0;x<WIDTH;x+=20){const sy=y+Math.sin((x+time*40)/39+y)*4;x===0?ctx.moveTo(x,sy):ctx.lineTo(x,sy);}ctx.stroke();}
 ctx.globalAlpha=1;
 for(let k=0;k<6;k++){
  const x=(350+k*420-camera)*1.17;if(x<-30||x>WIDTH+30)continue;
  ctx.strokeStyle="#fff0c7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,360);ctx.lineTo(x,392);ctx.stroke();
  ctx.fillStyle="#fcad60";ctx.beginPath();ctx.moveTo(x,355);ctx.lineTo(x+12,365);ctx.lineTo(x,375);ctx.closePath();ctx.fill();
 }
 const wind=13+lvl*.53;ctx.fillStyle="#174d65";ctx.font="bold 17px system-ui";ctx.fillText("WIND → "+wind.toFixed(1)+" m/s",22,34);
 ctx.strokeStyle="#fff8";ctx.lineWidth=3;for(let i=0;i<5;i++){const x=210+i*180+30*Math.sin(time*.8+i);ctx.beginPath();ctx.moveTo(x,58+i*29);ctx.lineTo(x+50,58+i*29);ctx.lineTo(x+40,52+i*29);ctx.stroke();}
 const fx=(END_X-camera)*1.17;if(fx>-20&&fx<WIDTH+20){ctx.fillStyle="#1e3e53";ctx.fillRect(fx,213,6,170);ctx.fillStyle="#f4fffe";ctx.fillRect(fx+6,213,63,24);ctx.fillStyle="#123344";ctx.font="bold 13px system-ui";ctx.fillText("FINISH",fx+10,230);}
}
function render(time){
 const race=state.race;
 const cam=race?.camera||0;ctx.clearRect(0,0,WIDTH,HEIGHT);
 if(race?.mode==="sailing"||(!race&&state.mode==="sailing"))drawSailTrack(race,time);
 else drawPowerTrack(race,time);
 if(race)for(const r of [...race.racers].sort((a,b)=>a.y-b.y))renderBoat(r,cam,race.mode==="sailing");
 if(race){const secs=race.timer,m=Math.floor(secs/60),s=(secs%60).toFixed(1).padStart(4,"0");$("clock").textContent=String(m).padStart(2,"0")+":"+s;}
}
function drawIdle(){
 if(state.race?.running)return;
 render(performance.now()/1000);
 $("emptyState").classList.toggle("hidden",listBoats().length>0);
}
function loop(now){
 if(!state.lastFrame)state.lastFrame=now;
 const delta=clamp((now-state.lastFrame)/1000,0,.07);state.lastFrame=now;
 const race=state.race;
 if(race?.running){
  state.stepAccumulator+=delta*Number($("raceSpeed").value);
  let cycles=0;
  while(state.stepAccumulator>=1/60 && cycles<8){step(1/60);state.stepAccumulator-=1/60;cycles++;if(!state.race?.running)break;}
  const leader=Math.max(...race.racers.map(r=>r.x));race.camera=clamp(lerp(race.camera,leader-255,.065),0,END_X-780);
 }
 render(now/1000);
 requestAnimationFrame(loop);
}
document.addEventListener("visibilitychange",()=>{state.lastFrame=performance.now();state.stepAccumulator=0;});
$("fullscreen").addEventListener("click",()=>{if(document.fullscreenElement)document.exitFullscreen();else $("raceCanvas").parentElement.requestFullscreen?.();});
function boot(){
 load();clearDrawing();renderRoster();fillCourses();updateStage();renderResults();
 requestAnimationFrame(loop);
 if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

function publicRoster(){
 return listBoats().map(b=>({id:b.id,remoteId:b.remoteId||b.id,name:b.name,kind:b.kind,validSail:b.stats.validSail!==false,registered:true}));
}
function replaceTrack(next){
 if(state.race?.running||!next)return {ok:false,message:"End the race before editing its course."};
 state.customTrack=validTrack(next);END_X=isCustom()?state.customTrack.distance:2600;
 save();updateCourseHint();drawIdle();return {ok:true};
}
async function registerHostPhoto(payload){
 if(state.race?.running)return {ok:false,message:"Race is underway. Register after it ends."};
 if(!payload||typeof payload.name!=="string"||!payload.name.trim())return {ok:false,message:"Enter the racer name."};
 const name=payload.name.replace(/[<>\u0000-\u001f]/g,"").trim().slice(0,28);
 if(!name)return {ok:false,message:"Invalid racer name."};
 if(payload.kind!==kind())return {ok:false,message:"Switch the smartboard to "+(payload.kind==="sail"?"Sailing":"Powerboat")+" mode before scanning."};
 const source=payload.image;
 if(typeof source!=="string"||!/^data:image\/(jpeg|png);base64,/.test(source)||source.length>235000)return {ok:false,message:"Image too large or invalid; retake it."};
 const image=new Image();
 try{
  await new Promise((ok,no)=>{image.onload=ok;image.onerror=no;image.src=source;});
  if(state.race?.running||payload.kind!==kind())return {ok:false,message:"Mode changed or racing started. Try again."};
  dc.clearRect(0,0,360,210);
  const sc=Math.min(345/image.naturalWidth,193/image.naturalHeight);
  const w=image.naturalWidth*sc,h=image.naturalHeight*sc;
  dc.drawImage(image,(360-w)/2,(210-h)/2,w,h);
  const pixels=dc.getImageData(0,0,360,210),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
   if(data[i+3]<25)continue;
   const r=data[i],g=data[i+1],b=data[i+2],lum=.299*r+.587*g+.114*b;
   if(lum>208 || (b>r*1.18&&b>g*1.1&&lum>135)){data[i+3]=0;continue;}
   data[i+3]=Math.round(data[i+3]*clamp((220-lum)/80,.3,1));
  }
  dc.putImageData(pixels,0,0);
  const before=new Set(state.boats.map(b=>b.id));
  $("racerName").value=name;
  register();
  let boat=state.boats.find(b=>!before.has(b.id)&&b.name===name&&b.kind===kind());
  if(!boat)return {ok:false,message:$("editorNotice").textContent||"Boat not detected. Retake photograph."};
  if(typeof payload.racerId==="string"&&/^[\w-]{8,64}$/.test(payload.racerId)){boat.remoteId=payload.racerId;save();}
  return {ok:true,message:"Registered",racer:{id:boat.id,name:boat.name},racers:publicRoster()};
 }catch(error){console.warn("Host sketch failed",error);return {ok:false,message:"Unable to process photo. Try again."};}
}
function removeHostBoat(id){
 if(state.race?.running)return {ok:false,message:"Race in progress."};
 const b=state.boats.find(x=>x.id===id||x.remoteId===id);
 if(!b)return {ok:false,message:"Racer no longer in the roster."};
 state.boats=state.boats.filter(x=>x.id!==b.id);
 delete state.history[b.kind][b.id];boatImgs.delete(b.id);save();renderRoster();updateStage();
 return {ok:true,message:b.name+" removed.",racers:publicRoster()};
}
window.SketchBoatBridge=Object.freeze({
 getState:()=>({mode:state.mode,kind:kind(),running:!!state.race?.running,level:state.level,boats:publicRoster(),results:state.lastResults.map(r=>({name:r.name,finished:r.finished,time:r.time}))}),
 getTrack:()=>JSON.parse(JSON.stringify(state.customTrack)),
 setTrack:replaceTrack,
 presetTrack:(name)=>replaceTrack(makeTrack(name)),
 registerPhoto:registerHostPhoto,
 removeBoat:removeHostBoat,
 changeMode:(mode)=>{if(state.race?.running)return {ok:false,message:"Race in progress."};if(!categories.includes(mode))return {ok:false,message:"Unknown mode."};selectMode(mode);return {ok:true};},
 start:()=>{if(state.race?.running)return {ok:false,message:"Already racing."};start();return state.race?.running?{ok:true,message:"Race started"}:{ok:false,message:$("editorNotice").textContent||"Cannot start race"};},
 reset:()=>{reset();return {ok:true};}
});

boot();
})();