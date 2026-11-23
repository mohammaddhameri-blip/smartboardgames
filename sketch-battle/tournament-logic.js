/* Sketch Battle v0.4 — pure knockout bracket logic, shared by smartboard and tests. */
(function(root,factory){
 const value=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=value;
 if(root)root.SketchBattleTournament=value;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function openingRound(ids){
  if(!Array.isArray(ids)||ids.length<2||ids.length>30)throw Error("A tournament needs 2–30 entrants");
  if(ids.some(id=>typeof id!=="string"||!id)||new Set(ids).size!==ids.length)throw Error("Entrant IDs must be unique strings");
  const size=2**Math.ceil(Math.log2(ids.length));
  const byes=size-ids.length;
  const slots=Array(size),pairs=size/2,bits=Math.log2(pairs);
  const spread=Array.from({length:pairs},(_,i)=>i).sort((a,b)=>{
   let ra=0,rb=0;
   for(let k=0;k<bits;k++){ra=ra*2+((a>>k)&1);rb=rb*2+((b>>k)&1)}
   return ra-rb;
  });
  for(let i=0;i<byes;i++)slots[2*spread[i]+1]=null;
  let j=0;
  for(let i=0;i<size;i++)if(slots[i]===undefined)slots[i]=ids[j++];
  const round=[];
  for(let i=0;i<size;i+=2){
   const a=slots[i],b=slots[i+1];
   round.push({a:a||b,b:a&&b?b:null,winner:a&&b?null:a||b});
  }
  return round;
 }
 function nextRound(round){
  if(!Array.isArray(round)||round.length<2||round.length%2)throw Error("Invalid bracket round");
  if(!round.every(m=>m&&m.winner))throw Error("Finish every match before advancing");
  const next=[];
  for(let i=0;i<round.length;i+=2)next.push({a:round[i].winner,b:round[i+1].winner,winner:null});
  return next;
 }
 return {openingRound,nextRound};
});