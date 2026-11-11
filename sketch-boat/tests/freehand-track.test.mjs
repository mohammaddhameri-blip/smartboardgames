import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const geometrySource=fs.readFileSync(new URL("../track-geometry.js", import.meta.url),"utf8");
const appSource=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
const ctx={window:{}};
vm.runInNewContext(geometrySource,ctx);
const Geo=ctx.window.SketchBoatTrack;
const normal={
 straight:[{x:.05,y:.5},{x:.95,y:.5}],
 hairpin:[{x:.08,y:.20},{x:.80,y:.20},{x:.80,y:.82},{x:.11,y:.82},{x:.11,y:.48},{x:.65,y:.48}],
 zigzag:[{x:.05,y:.25},{x:.35,y:.25},{x:.35,y:.75},{x:.64,y:.75},{x:.64,y:.3},{x:.95,y:.3}],
 crossed:[{x:.05,y:.10},{x:.92,y:.85},{x:.9,y:.12},{x:.08,y:.82},{x:.05,y:.1}]
};
function build(points){
 return Geo.makeGeometry(Geo.normalize({points,width:170,distance:2600,rocks:[]}));
}

test("arbitrary 2D routes keep backward and reverse-direction segments",()=>{
 const geo=build(normal.hairpin);
 assert.equal(Math.round(geo.length),2600);
 assert.ok(geo.segments.some(s=>s.tx<-.5));
 assert.ok(geo.segments.some(s=>s.ty<-.5));
 for(const p of [.15,.5,.73,.9]){
  const at=Geo.at(geo,p*geo.length);
  const n=Geo.nearest(geo,at.x+3,at.y+3,p*geo.length);
  assert.ok(Math.abs(n.s-p*geo.length)<35,"Projected racer onto the wrong section of a hairpin");
 }
});
test("self-crossing course and older v1.1 tracks load",()=>{
 const g=build(normal.crossed);
 assert.ok(g.segments.length>=4);
 assert.ok(g.length>2500);
 const legacy=Geo.normalize({values:Array(65).fill(.5),distance:2600,width:200});
 assert.equal(legacy.points.length,65);
});
test("physics navigator completes straight, hairpin and zigzag without skipping",()=>{
 const start=appSource.indexOf("function stepFreeCourse(dt){");
 const end=appSource.indexOf("function collideBoats(",start);
 assert.ok(start>0&&end>start);
 const body=appSource.slice(start,end);
 for(const [label,points] of Object.entries(normal).filter(([k])=>k!=="crossed")){
  const geo=build(points),p=Geo.at(geo,10);
  const racer={boat:{stats:{mass:300,drag:.62,turn:1.6,width:3,length:13}},
   x:p.x,y:p.y,vx:0,vy:0,a:p.a,s:10,omega:0,top:0,wall:0,collisions:0,spin:0,stuck:0,
   finished:false,failed:false,spinUntil:0};
  const state={race:{custom:true,geo,level:1,running:true,timer:0,obstacles:[],racers:[racer]}};
  let settled=false;
  const run=vm.runInNewContext(body+"\nstepFreeCourse",{Geo,state,getCourse:()=>({limit:180}),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),wrap:a=>Math.atan2(Math.sin(a),Math.cos(a)),collideBoats:()=>{},finish:()=>{settled=true;state.race.running=false;},scoreFailure:r=>{r.failed=true;}});
  for(let i=0;i<60*180&&!settled;i++)run(1/60);
  assert.equal(racer.finished,true,label+" boat did not finish");
  assert.equal(racer.failed,false,label+" boat failed");
  assert.ok(state.race.timer<180,label+" timed out");
 }
});
