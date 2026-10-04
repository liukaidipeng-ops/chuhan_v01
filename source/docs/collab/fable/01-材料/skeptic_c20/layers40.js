'use strict';
// 核查员 C20：同 c_timing.js 的 40 个局面（种子 11、12，每 3 步），校尉时间模式，量“前两层”和“第三层”各占多少 CPU
const path=require('path'); const SP=path.join(__dirname,'..');
global.XQ=require('/home/user/chuhan_v01/source/src/rules.js'); const BF=global.BF=require('/home/user/chuhan_v01/source/src/bingfa.js');
const GEN=require(path.join(SP,'bfai_25eb911.js'));
function mulberry32(a){return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const cpuMs=()=>{const u=process.cpuUsage();return (u.user+u.system)/1000;};
async function gen(seed,plies,every){GEN.LEVELS.mid.nodes=6000;Math.random=mulberry32(seed*2654435761);const g=new BF.Game();const out=[];
  for(let ply=0;ply<plies&&!g.result;ply++){if(ply%every===0&&ply>=4)out.push({seed,ply,S:BF.cloneState(g.S)});if(g.status&&g.status.mustPass){g.apply({k:'pass'});continue;}const seq=await GEN.think(BF.cloneState(g.S),'mid');for(const a of seq)g.apply(a);}
  delete GEN.LEVELS.mid.nodes;return out;}
const st=a=>{const s=a.slice().sort((x,y)=>x-y);return `平均 ${Math.round(a.reduce((x,y)=>x+y,0)/a.length)} P90 ${Math.round(s[Math.floor(s.length*0.9)])} 最大 ${Math.round(s[s.length-1])}`;};
(async()=>{
  const pos=[...(await gen(11,66,3)),...(await gen(12,66,3))];
  console.log('局面数',pos.length);
  for(const v of process.argv.slice(2)){const X=require(path.join(__dirname,`bfai_${v}_hook.js`));const tot=[],l2=[],l3=[],rows=[];
    for(const p of pos){Math.random=mulberry32(777+p.ply);let c2=null;const c0=cpuMs();globalThis.__layerHook=(d)=>{if(d===2)c2=cpuMs()-c0;};
      await X.think(BF.cloneState(p.S),'mid');const t=cpuMs()-c0;const L=X.think.last;if(c2==null)c2=t;tot.push(t);l2.push(c2);l3.push(t-c2);
      rows.push(`${p.seed}/${p.ply}${p.S.turn==='r'&&!p.S.used.art.b?'*':''}:${Math.round(c2)}+${Math.round(t-c2)}`);}
    const sum=a=>a.reduce((x,y)=>x+y,0);
    console.log(`== ${v} ==\n整步 CPU ${st(tot)}\n前两层 ${st(l2)}\n第三层 ${st(l3)}\n第三层占总 CPU ${Math.round(100*sum(l3)/sum(tot))}%\n逐局面（前两层+第三层 ms，* = 汉走且楚破釜在手）：${rows.join(' ')}`);}
})();
