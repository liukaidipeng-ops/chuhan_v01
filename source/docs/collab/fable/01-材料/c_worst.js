'use strict';
const path=require('path'); const SP=__dirname;
global.XQ=require('/home/user/chuhan_v01/source/src/rules.js'); const BF=global.BF=require('/home/user/chuhan_v01/source/src/bingfa.js');
const OLD=require(path.join(SP,'bfai_25eb911.js')), NEW=require(path.join(SP,'bfai_b18c278.js'));
function mulberry32(a){return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const cpuMs=()=>{const u=process.cpuUsage();return (u.user+u.system)/1000;};
(async()=>{
  OLD.LEVELS.mid.nodes=6000; Math.random=mulberry32(21*2654435761); const g=new BF.Game(); const want=[16,18,20]; const pos=[];
  for(let ply=0;ply<21&&!g.result;ply++){ if(want.includes(ply)) pos.push({ply,S:BF.cloneState(g.S)}); if(g.status&&g.status.mustPass){g.apply({k:'pass'});continue;} const seq=await OLD.think(BF.cloneState(g.S),'mid'); for(const a of seq) g.apply(a); }
  delete OLD.LEVELS.mid.nodes;
  for(const p of pos){ for(const [name,X] of [['旧 25eb911',OLD],['新 b18c278',NEW]]){ Math.random=mulberry32(31+p.ply); const c0=cpuMs(); const seq=await X.think(BF.cloneState(p.S),'mid'); const L=X.think.last; console.log(`ply${p.ply} ${name}：CPU ${Math.round(cpuMs()-c0)} ms，节点 ${L.nodes}，层 ${L.depth}，根着法数 ${L.n}，选 ${JSON.stringify(seq)}`); } }
})();
