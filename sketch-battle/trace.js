/* Sketch Battle v0.4 — outline tracing. Heuristic: photograph one chassis drawing, crop away writing/background. */
(function(){
"use strict";
function area(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y}return Math.abs(a)/2}
function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function simplifyClosed(poly,limit=135){
  if(poly.length<4)return poly;
  let points=poly.filter((p,i)=>i===0||Math.hypot(p.x-poly[i-1].x,p.y-poly[i-1].y)>=2);
  // Remove low-detail vertices while retaining sharp inward corners.
  while(points.length>limit){
    let best=Infinity,index=-1;
    for(let i=0;i<points.length;i++){
      const d=distanceToSegment(points[i],points[(i+points.length-1)%points.length],points[(i+1)%points.length]);
      if(d<best){best=d;index=i}
    }
    if(index<0)break;
    points.splice(index,1);
  }
  let changed=true;
  while(changed&&points.length>12){
    changed=false;
    for(let i=0;i<points.length;i++){
      if(distanceToSegment(points[i],points[(i+points.length-1)%points.length],points[(i+1)%points.length])<2.7){
        points.splice(i,1);changed=true;break;
      }
    }
  }
  return points;
}
window.traceBattlebotOutline=function(image){
  const w=320,h=200,canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const cx=canvas.getContext("2d",{willReadFrequently:true});
  cx.fillStyle="#fff";cx.fillRect(0,0,w,h);cx.drawImage(image,0,0,w,h);
  const pixels=cx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);
  for(let y=6;y<h-6;y++)for(let x=6;x<w-6;x++){
    const i=y*w+x,k=i*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
    const lum=(r*3+g*5+b*2)/10;
    if(lum<145&&Math.max(r,g,b)-Math.min(r,g,b)<125)mask[i]=1;
  }
  const visited=new Uint8Array(w*h);let best=[],queue=new Int32Array(w*h);
  const neighbors=[-w-1,-w,-w+1,-1,1,w-1,w,w+1];
  for(let y=6;y<h-6;y++)for(let x=6;x<w-6;x++){
    const seed=y*w+x;if(!mask[seed]||visited[seed])continue;
    let head=0,tail=1;queue[0]=seed;visited[seed]=1;
    while(head<tail){
      const v=queue[head++],vx=v%w,vy=(v/w)|0;
      for(const delta of neighbors){
        const n=v+delta,nx=n%w,ny=(n/w)|0;
        if(nx<5||nx>=w-5||ny<5||ny>=h-5||Math.abs(nx-vx)>1||!mask[n]||visited[n])continue;
        visited[n]=1;queue[tail++]=n;
      }
    }
    if(tail>best.length)best=Array.from(queue.subarray(0,tail));
  }
  if(best.length<80)return null;
  let x0=w,x1=0,y0=h,y1=0;
  const selected=new Uint8Array(w*h);
  for(const v of best){selected[v]=1;const x=v%w,y=(v/w)|0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  if(x1-x0<35||y1-y0<24)return null;
  // Expand one pixel to join tiny diagonal breaks without imposing a convex hull.
  const filled=selected.slice();
  for(const v of best){const x=v%w,y=(v/w)|0;for(let yy=Math.max(1,y-1);yy<=Math.min(h-2,y+1);yy++)for(let xx=Math.max(1,x-1);xx<=Math.min(w-2,x+1);xx++)filled[yy*w+xx]=1}
  const edges=[],lookup=new Map(),key=(x,y)=>x+","+y;
  function edge(ax,ay,bx,by){const index=edges.length;edges.push({ax,ay,bx,by});const k=key(ax,ay);if(!lookup.has(k))lookup.set(k,[]);lookup.get(k).push(index)}
  for(let y=Math.max(1,y0-2);y<=Math.min(h-2,y1+2);y++)for(let x=Math.max(1,x0-2);x<=Math.min(w-2,x1+2);x++){
    if(!filled[y*w+x])continue;
    if(!filled[(y-1)*w+x])edge(x,y,x+1,y);
    if(!filled[y*w+x+1])edge(x+1,y,x+1,y+1);
    if(!filled[(y+1)*w+x])edge(x+1,y+1,x,y+1);
    if(!filled[y*w+x-1])edge(x,y+1,x,y);
  }
  const used=new Uint8Array(edges.length);let longest=null,bestArea=0;
  for(let i=0;i<edges.length;i++){
    if(used[i])continue;
    let at=i,poly=[],closed=false,steps=0;const first=key(edges[i].ax,edges[i].ay);
    while(at!==undefined&&!used[at]&&steps++<edges.length){
      const e=edges[at];used[at]=1;poly.push({x:e.ax,y:e.ay});
      const k=key(e.bx,e.by);if(k===first){closed=true;break}
      at=(lookup.get(k)||[]).find(j=>!used[j]);
    }
    if(!closed||poly.length<10)continue;
    const a=area(poly);
    if(a>bestArea){bestArea=a;longest=poly}
  }
  if(!longest||bestArea<800)return null;
  let shape=longest.map(p=>({x:60+p.x/w*680,y:44+p.y/h*412}));
  shape=simplifyClosed(shape,135);
  return shape.length>=3&&area(shape)>1800?shape:null;
};
})();