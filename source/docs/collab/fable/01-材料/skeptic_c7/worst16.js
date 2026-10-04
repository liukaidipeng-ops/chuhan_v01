'use strict';
// 核查员 C7：只复现种子 21 第 16 步（校尉，时间模式），数 pofuPairs 调用：按对象 / 按内容 / 是否“先升级”变体
const path=require('path'); const SP=path.join(__dirname,'..');
global.XQ=require('/home/user/chuhan_v01/source/src/rules.js'); const BF=global.BF=require('/home/user/chuhan_v01/source/src/bingfa.js');
const OLD=require(path.join(SP,'bfai_25eb911.js')), NEW=require(path.join(SP,'bfai_b18c278.js'));
function mulberry32(a){return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const cpuMs=()=>{const u=process.cpuUsage();return (u.user+u.system)/1000;};
const A=BF.ai, real=A.pofuPairs; let calls=0, ms=0, out=0, upCalls=0; const keys=new Map();
A.pofuPairs=function(S){const c0=cpuMs();const r=real.call(this,S);ms+=cpuMs()-c0;calls++;out+=r.length;if(S.upgraded)upCalls++;
  const k=JSON.stringify([S.board,S.merit,S.cnt,S.turn,S.used,S.fx,S.upgraded,S.freeUsed,S.jmLock]); keys.set(k,(keys.get(k)||0)+1); return r;};
(async()=>{
  OLD.LEVELS.mid.nodes=6000; Math.random=mulberry32(21*2654435761); const g=new BF.Game(); let P=null;
  for(let ply=0;ply<17&&!g.result;ply++){ if(ply===16) P=BF.cloneState(g.S); if(g.status&&g.status.mustPass){g.apply({k:'pass'});continue;} if(ply===16)break; const seq=await OLD.think(BF.cloneState(g.S),'mid'); for(const a of seq) g.apply(a); }
  delete OLD.LEVELS.mid.nodes;
  console.log('turn',P.turn,'pofu在手',!P.used.art.b,'楚军功',P.merit.b,'汉军功',P.merit.r);
  for(const [name,X] of [['旧 25eb911',OLD],['新 b18c278',NEW]]){ calls=0;ms=0;out=0;upCalls=0;keys.clear();
    Math.random=mulberry32(31+16); const c0=cpuMs(); const t0=Date.now(); const seq=await X.think(BF.cloneState(P),'mid'); const L=X.think.last;
    console.log(`${name}: CPU ${Math.round(cpuMs()-c0)} ms 墙钟 ${Date.now()-t0} ms 节点 ${L.nodes} 层 ${L.depth} 根着法 ${L.n} | pofuPairs 调用 ${calls}（其中先升级变体 ${upCalls}），不同局面 ${keys.size}，组合 ${out}，${Math.round(ms)} ms | 选 ${JSON.stringify(seq)}`); }
})();
