/* Optional photo storage in IndexedDB; keeps classroom rosters small in localStorage. */
(function(){
"use strict";
let database;
function db(){
 if(database)return database;
 database=new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(Error("IndexedDB not supported"));return}
  const req=indexedDB.open("sketchBattlePhotosV04",1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("photos"))req.result.createObjectStore("photos")};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error("Could not open photo storage"));
 });
 return database;
}
async function run(mode,method,id,value){
 const database=await db();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction("photos",mode),store=tx.objectStore("photos");
  const req=method==="put"?store.put(value,id):method==="get"?store.get(id):store.delete(id);
  req.onsuccess=()=>resolve(req.result||"");
  req.onerror=()=>reject(req.error||Error("Photo storage failed"));
 });
}
window.SketchBattlePhotoStorage={
 put:(id,image)=>run("readwrite","put",id,image),
 get:id=>run("readonly","get",id),
 remove:id=>run("readwrite","delete",id)
};
})();