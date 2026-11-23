"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const directory=path.join(__dirname,"..");
const layout=require(path.join(directory,"multibot-layout.js"));
const html=fs.readFileSync(path.join(directory,"index.html"),"utf8");
function liveBot(id,position,count){
 const mult=layout.scaleForCount(count);
 return {
  bot:{id,name:id},x:position.x,y:position.y,rot:0,angle:position.angle,power:90,mass:2,
  vx:0,vy:0,turn:2.7,speed:360,body:100,wheels:[100,100,100,100],weapon:100,
  cd:0,stun:0,air:0,prevRamp:-1,score:0,damage:0,radius:35*mult,scale:.4*mult,eliminated:false
 };
}
function runEngine(count,frames){
 const positions=layout.layout(count),bots=positions.map((position,i)=>liveBot("p"+i,position,count));
 const duel={bots,remain:90,duration:90,clock:0,running:true,debris:[],sparks:[],hits:{},eliminations:[]};
 const start=html.indexOf("function battleAlive(f){"),end=html.indexOf("function arenaBackground(){",start);
 assert.ok(start>0&&end>start,"multi-bot physics must be present in the actual game");
 const surfaces=new Map();
 function get(id){if(!surfaces.has(id))surfaces.set(id,{textContent:"",disabled:false});return surfaces.get(id)}
 const context={
  duel,BOWL:{cx:400,cy:250,r:220,gravity:158,drag:.105,restitution:.53},arenaObstacles:[],
  clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
  rotTo:(current,wanted,limit)=>current+Math.max(-limit,Math.min(limit,Math.atan2(Math.sin(wanted-current),Math.cos(wanted-current)))),
  updateWeaponAnimation(){},
  hitDamage(target,source,damage){target.body=Math.max(0,target.body-damage*.65);target.damage+=damage;if(source)source.score+=damage},
  hitRamp(){return false},hitRock(){},
  setInsideBowl(f){
   const dx=f.x-400,dy=f.y-250,len=Math.hypot(dx,dy),wall=220-f.radius*.48;
   if(len>wall){f.x=400+dx/len*wall;f.y=250+dy/len*wall}
  },
  crashDamage:energy=>Math.max(0,Math.min(32,(energy-1800)/9200)),
  sparkAt(){},$:get,renderExtraArenaBots(){},message(){}
 };
 vm.createContext(context);
 vm.runInContext(html.slice(start,end),context);
 for(let j=0;j<frames&&duel.running;j++){
  vm.runInContext("stepDuel(1/90)",context);
  for(const bot of bots){
   assert.ok(Number.isFinite(bot.x)&&Number.isFinite(bot.y),"finite fighter position");
   assert.ok(Number.isFinite(bot.vx)&&Number.isFinite(bot.vy),"finite fighter speed");
   assert.ok(Math.hypot(bot.x-400,bot.y-250)<230,"bots stay in the arena");
  }
 }
 return {context,duel,bots};
}
test("all 2–30 bowl layouts are well spaced and robot scale decreases monotonically",()=>{
 let previous=Infinity;
 for(let n=2;n<=30;n++){
  const points=layout.layout(n),scale=layout.scaleForCount(n);
  assert.equal(points.length,n);
  assert.ok(scale<=previous+1e-9);
  previous=scale;
  assert.ok(scale>=.27&&scale<=1);
  for(let i=0;i<n;i++){
   const p=points[i];assert.ok(Math.hypot(p.x-400,p.y-250)<190);
   for(let j=i+1;j<n;j++){
    const q=points[j];const d=Math.hypot(p.x-q.x,p.y-q.y);
    const maxHitRadius=58*scale;
    assert.ok(d>maxHitRadius*1.2+12*scale,"no launch-position overlaps at "+n+" bots");
   }
  }
 }
 assert.equal(layout.MAX_BOTS,30);
 assert.equal(layout.scaleForCount(2),1);
 assert.ok(layout.scaleForCount(30)<.35);
});
test("simulates 2, 3, 10 and 30 concurrent bots without invalid physics",()=>{
 for(const n of [2,3,10,30]){
  const x=runEngine(n,240);
  assert.equal(x.duel.bots.length,n);
  assert.ok(x.duel.clock>0);
  assert.ok(x.bots.some(b=>b.vx!==0||b.vy!==0),"robots are moving");
 }
});
test("eliminated bots cannot be targeted and one survivor wins",()=>{
 const {context,duel,bots}=runEngine(5,10);
 assert.equal(context.nearestEnemy(bots[0],bots),bots[1]);
 for(const bot of bots.slice(1))bot.body=0;
 vm.runInContext("stepDuel(1/90)",context);
 assert.equal(duel.running,false);
 assert.equal(duel.winnerId,bots[0].bot.id);
 assert.equal(duel.eliminations.length,4);
 assert.equal(context.nearestEnemy(bots[0],bots),null);
});
test("the smartboard exposes Add Bot, Add All and keeps tournament matches at two bots",()=>{
 for(const id of ['id="addArenaBot"','id="addAllArenaBots"','id="extraArenaBots"'])assert.ok(html.includes(id));
 assert.ok(html.includes('src="./multibot-layout.js"'));
 assert.ok(html.includes("extraArenaBots.length=0;renderExtraArenaBots()"),"tournament launches must reset free-for-all additions");
 assert.ok(html.includes("function nearestEnemy(f,bots)"),"bots must target real surviving opponents");
 assert.ok(html.includes("for(let j=i+1;j<bots.length;j++)"),"all distinct pairs can collide");
});