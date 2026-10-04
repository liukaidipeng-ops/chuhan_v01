'use strict';
// 核查员 C20：种子 21 第 16 步（校尉、时间模式、汉走、楚破釜在手），量每层算完时的累计 CPU，看“第 3 层超时用第 2 层”能省多少
const path=require('path'); const SP=path.join(__dirname,'..');
global.XQ=require('/home/user/chuhan_v01/source/src/rules.js'); const BF=global.BF=require('/home/user/chuhan_v01/source/src/bingfa.js');
const GEN=require(path.join(SP,'bfai_25eb911.js'));
function mulberry32(a){return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const cpuMs=()=>{const u=process.cpuUsage();return (u.user+u.system)/1000;};
(async()=>{
  GEN.LEVELS.mid.nodes=6000; Math.random=mulberry32(21*2654435761); const g=new BF.Game(); let P=null;
  for(let ply=0;ply<17&&!g.result;ply++){ if(ply===16){P=BF.cloneState(g.S);break;} if(g.status&&g.status.mustPass){g.apply({k:'pass'});continue;} const seq=await GEN.think(BF.cloneState(g.S),'mid'); for(const a of seq) g.apply(a); }
  delete GEN.LEVELS.mid.nodes;
  console.log('turn',P.turn,'楚破釜在手',!P.used.art.b);
  const which=process.argv.slice(2);
  for(const v of which){ const X=require(path.join(__dirname,`bfai_${v}_hook.js`));
    Math.random=mulberry32(31+16); const c0=cpuMs(); const rows=[];
    globalThis.__layerHook=(d,n)=>rows.push(`第${d}层算完 累计CPU ${Math.round(cpuMs()-c0)} ms 节点 ${n}`);
    const seq=await X.think(BF.cloneState(P),'mid'); const L=X.think.last;
    console.log(`${v}: 总CPU ${Math.round(cpuMs()-c0)} ms 节点 ${L.nodes} 层 ${L.depth} | ${rows.join(' | ')} | 选 ${JSON.stringify(seq)} 前5 ${JSON.stringify(L.top.map(t=>t[1]))}`); }
})();
