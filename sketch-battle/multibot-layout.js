/* Sketch Battle v0.5 — shared scalable free-for-all layout. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.SketchBattleMultibot=api;
})(typeof window!=="undefined"?window:null,function(){
  "use strict";
  const MAX_BOTS=30;
  function scaleForCount(count){
    const n=Math.max(2,Math.min(MAX_BOTS,Math.floor(Number(count)||2)));
    // Retain the original 1v1 size; shrink gradually as the arena becomes crowded.
    return Math.max(.27,Math.min(1,Math.sqrt(2/n)*1.08));
  }
  function layout(count){
    const n=Math.max(2,Math.min(MAX_BOTS,Math.floor(Number(count)||2)));
    if(n===2)return [
      {x:255,y:250,angle:0},
      {x:545,y:250,angle:180}
    ];
    const points=[],ring=167,rotation=Math.PI;
    for(let i=0;i<n;i++){
      const t=rotation+2*Math.PI*i/n,x=400+ring*Math.cos(t),y=250+ring*Math.sin(t);
      const angle=(Math.atan2(250-y,400-x)*180/Math.PI+360)%360;
      points.push({x,y,angle});
    }
    return points;
  }
  return {MAX_BOTS,scaleForCount,layout};
});