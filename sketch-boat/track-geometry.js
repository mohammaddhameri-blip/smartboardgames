"use strict";
(() => {
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 // Coordinates live in a normalized 1200×680 drawing area, with NO x-monotonic constraint.
 const defaults={
  calm:[[.04,.48],[.18,.48],[.36,.48],[.55,.48],[.74,.48],[.96,.48]],
  winding:[[.04,.42],[.17,.35],[.28,.59],[.39,.66],[.53,.39],[.65,.3],[.79,.58],[.95,.48]],
  islands:[[.04,.45],[.18,.45],[.25,.31],[.34,.3],[.42,.55],[.54,.66],[.65,.42],[.79,.42],[.96,.52]],
  slalom:[[.04,.36],[.22,.36],[.33,.68],[.43,.73],[.52,.28],[.62,.25],[.74,.68],[.86,.7],[.96,.43]]
 };
 function preset(name="calm"){
  const points=(defaults[name]||defaults.calm).map(([x,y])=>({x,y}));
  const rocks=name==="islands"?[{x:.29,y:.44,r:18},{x:.6,y:.48,r:22}]:name==="slalom"?[{x:.3,y:.55,r:17},{x:.69,y:.5,r:17}]:[];
  return {points,width:190,distance:2600,rocks,preset:name};
 }
 function normalize(t){
  if(!t||typeof t!=="object")return preset();
  const fallback=preset();
  let points;
  if(Array.isArray(t.points)&&t.points.length>=2)points=t.points.slice(0,1600).map(p=>({x:clamp(Number(p.x)||0,.01,.99),y:clamp(Number(p.y)||0,.03,.97)}));
  else if(Array.isArray(t.values)&&t.values.length>=2)points=t.values.map((v,i)=>({x:.04+.92*i/(t.values.length-1),y:clamp(.5+(Number(v)-.5)*255/680,.03,.97)}));
  else points=fallback.points;
  points=points.filter((p,i,a)=>i===0||Math.hypot((p.x-a[i-1].x)*1200,(p.y-a[i-1].y)*680)>.2);
  if(points.length<2)points=fallback.points;
  const rocks=Array.isArray(t.rocks)?t.rocks.slice(0,20).map(r=>({
   x:clamp(Number(r.x)||.5,.01,.99),
   y:clamp(Number(r.y??(.5+(Number(r.offset)||0)/680))||.5,.03,.97),
   r:clamp(Number(r.r)||18,8,30)
  })):[];
  return {points,width:clamp(Number(t.width)||190,60,330),distance:[2600,5200,7800,13000].includes(Number(t.distance))?Number(t.distance):2600,rocks,preset:String(t.preset||"custom")};
 }
 function makeGeometry(track){
  const points=track.points.map(p=>({x:p.x*1200,y:p.y*680}));
  let rawLength=0;
  for(let i=1;i<points.length;i++)rawLength+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
  const scale=track.distance/Math.max(15,rawLength);
  const world=points.map(p=>({x:p.x*scale,y:p.y*scale}));
  const segments=[];
  let length=0;
  for(let i=1;i<world.length;i++){
   const a=world[i-1],b=world[i],len=Math.hypot(b.x-a.x,b.y-a.y);
   if(len<.001)continue;
   const tx=(b.x-a.x)/len,ty=(b.y-a.y)/len;
   segments.push({ax:a.x,ay:a.y,bx:b.x,by:b.y,tx,ty,len,start:length,end:length+len});
   length+=len;
  }
  const rocks=track.rocks.map(r=>({x:r.x*1200*scale,y:r.y*680*scale,r:r.r*scale}));
  const xs=world.map(p=>p.x),ys=world.map(p=>p.y);
  return {world,segments,length,scale,width:track.width*scale,rocks,bounds:{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}};
 }
 function at(geo,s){
  if(!geo.segments.length)return {x:0,y:0,tx:1,ty:0,a:0};
  let seg=geo.segments[0];
  if(s<0){const t=s;return {x:seg.ax+seg.tx*t,y:seg.ay+seg.ty*t,tx:seg.tx,ty:seg.ty,a:Math.atan2(seg.ty,seg.tx)};}
  if(s>=geo.length){
   seg=geo.segments[geo.segments.length-1];const t=s-seg.start;return {x:seg.ax+seg.tx*t,y:seg.ay+seg.ty*t,tx:seg.tx,ty:seg.ty,a:Math.atan2(seg.ty,seg.tx)};
  }
  // Binary search along arc length; the path can double back or cross itself.
  let lo=0,hi=geo.segments.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(geo.segments[mid].end<s)lo=mid+1;else hi=mid;}
  seg=geo.segments[lo];const t=s-seg.start;
  return {x:seg.ax+seg.tx*t,y:seg.ay+seg.ty*t,tx:seg.tx,ty:seg.ty,a:Math.atan2(seg.ty,seg.tx)};
 }
 function nearest(geo,x,y,lastS=0,look=180){
  let best=null,score=Infinity;
  for(const seg of geo.segments){
   // Limit projections to nearby arclength to avoid jumping to another branch at hairpins/crossings.
   if(seg.end<lastS-look||seg.start>lastS+look)continue;
   const a=(x-seg.ax)*seg.tx+(y-seg.ay)*seg.ty;
   const t=clamp(a,0,seg.len);
   const projX=seg.ax+seg.tx*t,projY=seg.ay+seg.ty*t;
   const d2=(x-projX)**2+(y-projY)**2;
   const candidate=seg.start+t;
   const penalty=Math.max(0,Math.abs(candidate-lastS)-95)*.08;
   if(d2+penalty<score){score=d2+penalty;best={s:candidate,x:projX,y:projY,tx:seg.tx,ty:seg.ty,distance:Math.sqrt(d2)};}
  }
  if(!best){
   const p=at(geo,lastS);return {s:lastS,x:p.x,y:p.y,tx:p.tx,ty:p.ty,distance:Math.hypot(x-p.x,y-p.y)};
  }
  // Extend first segment backward so the start grid can occupy negative arclength.
  if(lastS<40){
   const fst=geo.segments[0],proj=(x-fst.ax)*fst.tx+(y-fst.ay)*fst.ty;
   if(proj<0&&proj>lastS-200){
    const px=fst.ax+fst.tx*proj,py=fst.ay+fst.ty*proj,d2=(x-px)**2+(y-py)**2;
    if(d2<score){best={s:proj,x:px,y:py,tx:fst.tx,ty:fst.ty,distance:Math.sqrt(d2)};}
   }
  }
  return best;
 }
 function curvature(geo,s){
  const before=at(geo,s-20),after=at(geo,s+28);
  const diff=Math.atan2(Math.sin(after.a-before.a),Math.cos(after.a-before.a));
  return Math.abs(diff)/48;
 }
 window.SketchBoatTrack=Object.freeze({preset,normalize,makeGeometry,at,nearest,curvature});
})();