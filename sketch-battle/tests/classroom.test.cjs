"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const base=path.join(__dirname,"..");
const {openingRound,nextRound}=require(path.join(base,"tournament-logic.js"));
function walkToWinner(n){
 const names=Array.from({length:n},(_,i)=>"pupil-"+(i+1));
 let round=openingRound(names),fights=0,byes=round.filter(m=>!m.b).length;
 const seen=new Set();
 while(true){
  round.forEach(m=>{
   assert.ok(m.a&&!seen.has(m.a),"a robot competes only once in a round");
   seen.add(m.a);
   if(m.b){assert.ok(!seen.has(m.b),"opponents must be unique");seen.add(m.b)}
   if(m.b){fights++;m.winner=m.a}
   else assert.equal(m.winner,m.a);
  });
  if(round.length===1)return {fights,byes,winner:round[0].winner};
  seen.clear();
  round=nextRound(round);
 }
}
test("all 2–30-pupil brackets have exactly n-1 battles and one champion",()=>{
 for(let n=2;n<=30;n++){
  const result=walkToWinner(n);
  assert.equal(result.fights,n-1,"expected "+(n-1)+" battles for "+n+" pupils");
  assert.equal(typeof result.winner,"string");
  assert.equal(result.byes,2**Math.ceil(Math.log2(n))-n);
 }
});
test("rejects empty, oversized and duplicate rosters",()=>{
 assert.throws(()=>openingRound(["solo"]));
 assert.throws(()=>openingRound(Array.from({length:31},(_,i)=>"b"+i)));
 assert.throws(()=>openingRound(["duplicate","duplicate"]));
 assert.throws(()=>nextRound([{a:"a",b:"b",winner:null},{a:"c",b:"d",winner:"c"}]));
});
test("all classroom JavaScript syntax is valid",()=>{
 for(const file of ["classroom.js","trace.js","photo-storage.js","tournament-logic.js","sw.js","index.html","phone.html"]){
  let text=fs.readFileSync(path.join(base,file),"utf8");
  if(file.endsWith(".html")){
   text=[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join("\n");
  }
  assert.doesNotThrow(()=>new Function(text),file+" must parse");
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(base,"phone.webmanifest"),"utf8"));
 assert.equal(manifest.display,"standalone");
});
test("classroom scripts are loaded in the intended order",()=>{
 const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
 const names=["trace.js","photo-storage.js","tournament-logic.js","classroom.js"];
 for(const name of names)assert.ok(html.includes('src="./'+name+'"'),name+" must be loaded");
 assert.ok(html.indexOf('src="./trace.js"')<html.indexOf("window.SketchBattleBridge"),"tracing loads before bridge");
 assert.ok(html.indexOf('src="./tournament-logic.js"')<html.indexOf('src="./classroom.js"'),"brackets load before tournament UI");
});
test("traced outline retains inward notches instead of always returning a convex hull",()=>{
 const w=320,h=200,rgba=new Uint8ClampedArray(w*h*4);
 rgba.fill(255);
 function blackRect(x0,y0,x1,y1){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*w+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0}}
 blackRect(80,35,120,165);
 blackRect(80,135,250,165);
 const fakeCanvas={width:0,height:0,getContext(){return{fillRect(){},drawImage(){},getImageData(){return {data:rgba}}}}};
 const context={window:{},document:{createElement(type){assert.equal(type,"canvas");return fakeCanvas}}};
 vm.runInNewContext(fs.readFileSync(path.join(base,"trace.js"),"utf8"),context);
 const shape=context.window.traceBattlebotOutline({});
 assert.ok(shape?.length>=5,"detect the connected L-shaped chassis");
 const xs=shape.map(p=>p.x),ys=shape.map(p=>p.y);
 const bounds=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));
 const area=Math.abs(shape.reduce((a,p,i)=>{const q=shape[(i+1)%shape.length];return a+p.x*q.y-q.x*p.y},0))/2;
 assert.ok(area<bounds*.75,"preserve concavity and avoid a rectangular convex hull");
});
test("leaving the arena aborts the active duel cleanly for a new phone scan",()=>{
 const source=fs.readFileSync(path.join(base,"index.html"),"utf8");
 const start=source.indexOf("function setView(s){");
 const end=source.indexOf("function canvasPoint(ev){",start);
 assert.ok(start>0&&end>start,"setView should exist");
 const script=source.slice(start,end);
 const elements=new Map();
 const get=id=>{
  if(!elements.has(id))elements.set(id,{classList:{toggle(){}},textContent:""});
  return elements.get(id);
 };
 const duel={running:true};
 const context={
  view:"arena",duel,
  document:{querySelectorAll:()=>[]},
  $:get,
  render(){},renderGarage(){},populateArena(){},message(){},
 };
 vm.createContext(context);
 vm.runInContext(script+";setView('workshop');",context);
 assert.equal(duel.running,false,"old duel stops when the teacher opens workshop");
 assert.equal(context.duel,null,"stale duel is cleared so the next match can begin");
 assert.equal(context.view,"workshop");
});
