// 两组模拟逐局对比（同一批种子）：node tools/simpair.js 对照.json[.gz] 新组.json[.gz] [--max-seed N] [--skills]
//   末尾给收敛标准②（汉胜逐局差的 95% 区间含 0 且差 ≤ 5 个点）；加 --skills 再列每种技能每局次数和标准③。
//   只比两边都有的种子（第八轮 600 局对第七轮 1300 局，就只比前 600 个种子）。
//   胜负：两边各自的汉胜率；结果不同的局分两类（对照汉胜→新组楚胜、对照楚胜→新组汉胜），
//   新组净多赢的汉局 = 后者 − 前者，z = 净多 / √(两类之和)（符号检验，|z| > 2 算站得住）。
//   另外并排列：回合、60 回合内、最后一将是车、贴脸将死、R20 落后 ≥4 分翻盘、相 / 象升到三 / 四级的局、齐射 / 践踏 / 飞越的次数和击杀。
'use strict';
const fs = require('fs'), zlib = require('zlib');
const argv = process.argv.slice(2);
const files = argv.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
const maxSeed = argv.includes('--max-seed') ? +argv[argv.indexOf('--max-seed') + 1] : Infinity;
if (files.length !== 2) { console.error('用法：node tools/simpair.js 对照.json[.gz] 新组.json[.gz] [--max-seed N]'); process.exit(1); }
const load = f => { const b = fs.readFileSync(f); return JSON.parse(f.endsWith('.gz') ? zlib.gunzipSync(b) : b); };
const [A, B] = files.map(load);
const bySeed = D => new Map(D.results.filter(r => r.seed <= maxSeed).map(r => [r.seed, r]));
const ma = bySeed(A), mb = bySeed(B);
const seeds = [...ma.keys()].filter(s => mb.has(s)).sort((x, y) => x - y);
if (!seeds.length) { console.error('两组没有共同的种子'); process.exit(1); }
const pa = seeds.map(s => ma.get(s)), pb = seeds.map(s => mb.get(s));
const pct = (x, n) => n ? (100 * x / n).toFixed(1) + '%' : '—';
const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const med = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const sideSum = (rs, key, side, name) => rs.reduce((a, r) => a + (((r[key] || {})[side] || {})[name] || 0), 0);
const anyUp = (r, side, lvs) => lvs.some(l => ((r.up || {})[side] || {})['e' + l] > 0);
// R20 落后 ≥4 分的一方最后赢了（和 bfsim 汇总的“翻盘”同一个算法：分数站在汉方看）
const comeback = (rs, R, T) => {
  let n = 0, w = 0;
  for (const r of rs) {
    const s = (r.samples || []).find(x => x.round === R); if (!s || Math.abs(s.score) < T) continue;
    n++; const behind = s.score < 0 ? 'r' : 'b'; if (r.winner === behind) w++;
  }
  return { n, w };
};
function stats(rs) {
  const dec = rs.filter(r => r.winner === 'r' || r.winner === 'b'), hw = dec.filter(r => r.winner === 'r').length;
  const mates = rs.filter(r => r.mate && r.mate.n);
  const cb = comeback(rs, 20, 4);
  return {
    n: rs.length, hw, dec: dec.length,
    rounds: avg(rs.map(r => r.rounds)), med: med(rs.map(r => r.rounds)), in60: rs.filter(r => r.rounds <= 60).length,
    rookMate: mates.filter(r => r.mate.t && r.mate.t[0] === 'r').length, adjMate: mates.filter(r => r.mate.adj).length, mates: mates.length,
    cb,
    e3: { r: rs.filter(r => anyUp(r, 'r', [3, 4])).length, b: rs.filter(r => anyUp(r, 'b', [3, 4])).length },
    e4: { r: rs.filter(r => anyUp(r, 'r', [4])).length, b: rs.filter(r => anyUp(r, 'b', [4])).length },
    qishe: { use: sideSum(rs, 'act', 'r', 'sk_qishe'), kill: sideSum(rs, 'kills', 'r', 'qishe'), hit: sideSum(rs, 'hits', 'r', 'qishe') },
    jianta: { kill: sideSum(rs, 'kills', 'b', 'jianta'), hit: sideSum(rs, 'hits', 'b', 'jianta') },
    feiyue: { r: sideSum(rs, 'act', 'r', 'sk_feiyue'), b: sideSum(rs, 'act', 'b', 'sk_feiyue') },
  };
}
const sa = stats(pa), sb = stats(pb);
let ab = 0, ba = 0, same = 0;
for (let i = 0; i < seeds.length; i++) {
  const x = pa[i].winner, y = pb[i].winner;
  if (x === y) same++; else if (x === 'r' && y === 'b') ab++; else if (x === 'b' && y === 'r') ba++;
}
const net = ba - ab, z = ab + ba ? net / Math.sqrt(ab + ba) : 0;
const lab = f => f.replace(/^.*\//, '').replace(/\.json(\.gz)?$/, '');
console.log(`逐局对比：${lab(files[0])}（对照） vs ${lab(files[1])}（新组），共同种子 ${seeds.length} 个（${seeds[0]}–${seeds[seeds.length - 1]}）`);
const row = (name, f) => console.log(`  ${name.padEnd(14)} ${String(f(sa)).padEnd(26)} ${f(sb)}`);
console.log(`  ${''.padEnd(14)} ${'对照'.padEnd(26)} 新组`);
row('汉胜（分胜负的局）', s => `${pct(s.hw, s.dec)}（${s.hw}/${s.dec}）`);
row('平均 / 中位回合', s => `${s.rounds.toFixed(1)} / ${s.med}`);
row('60 回合内', s => pct(s.in60, s.n));
row('最后一将是车', s => pct(s.rookMate, s.mates));
row('贴脸将死', s => pct(s.adjMate, s.mates));
row('R20 落后≥4 翻盘', s => `${pct(s.cb.w, s.cb.n)}（${s.cb.w}/${s.cb.n}）`);
row('相升到三级以上', s => pct(s.e3.r, s.n));
row('象升到三级以上', s => pct(s.e3.b, s.n));
row('相 / 象到四级', s => `${pct(s.e4.r, s.n)} / ${pct(s.e4.b, s.n)}`);
row('齐射 每局', s => `${(s.qishe.use / s.n).toFixed(2)} 次（打死 ${s.qishe.kill}、打伤 ${s.qishe.hit}）`);
row('践踏 打死 / 打伤', s => `${s.jianta.kill} / ${s.jianta.hit}（每局 ${((s.jianta.kill + s.jianta.hit) / s.n).toFixed(2)}）`);
row('飞越 每局 汉/楚', s => `${(s.feiyue.r / s.n).toFixed(2)} / ${(s.feiyue.b / s.n).toFixed(2)}`);
console.log(`胜负不同的局：对照汉胜→新组楚胜 ${ab} 局，对照楚胜→新组汉胜 ${ba} 局（相同 ${same}，有和局的 ${seeds.length - same - ab - ba}）`);
console.log(`新组汉净多赢 ${net >= 0 ? '+' : ''}${net} 局（${(100 * net / seeds.length).toFixed(1)} 个百分点），z = ${z.toFixed(2)}${Math.abs(z) > 2 ? '，站得住' : '，在随机波动以内'}`);
// 收敛标准②：逐局差（汉胜 1、和 0.5、楚胜 0），新组 − 对照，均值和 95% 区间
const hv = r => r.winner === 'r' ? 1 : r.winner === 'b' ? 0 : 0.5;
const ci = ds => { const n = ds.length, m = avg(ds), v = ds.reduce((a, d) => a + (d - m) ** 2, 0) / Math.max(1, n - 1), h = 1.96 * Math.sqrt(v / n); return [m, m - h, m + h]; };
const [dm, dlo, dhi] = ci(seeds.map((_, i) => hv(pb[i]) - hv(pa[i])));
const pass2 = dlo <= 0 && dhi >= 0 && Math.abs(dm) <= 0.05;
console.log(`汉胜逐局差（新组 − 对照）${(100 * dm).toFixed(1)} 个点，95% 区间 ${(100 * dlo).toFixed(1)} ~ ${(100 * dhi).toFixed(1)} → 收敛标准② ${pass2 ? '过' : '没过'}（区间含 0 且差 ≤ 5 个点）`);
// 收敛标准③：每种技能每局用几次（两边分开），逐局差的 95% 区间；区间不含 0 且变了 20% 以上才算“变了”
if (argv.includes('--skills')) {
  const keys = new Set();
  for (const r of pa.concat(pb)) for (const sd of ['r', 'b']) for (const k of Object.keys((r.act || {})[sd] || {})) if (k !== 'mv') keys.add(sd + ':' + k);
  const use = (r, key) => { const [sd, k] = key.split(':'); return ((r.act || {})[sd] || {})[k] || 0; };
  let moved = 0;
  console.log('技能使用（每局次数）      对照     新组     变化     逐局差 95% 区间');
  for (const key of [...keys].sort()) {
    const ma2 = avg(pa.map(r => use(r, key))), mb2 = avg(pb.map(r => use(r, key)));
    if (ma2 < 0.02 && mb2 < 0.02) continue;
    const [, lo, hi] = ci(seeds.map((_, i) => use(pb[i], key) - use(pa[i], key)));
    const rel = ma2 ? (mb2 - ma2) / ma2 : 1, flag = (lo > 0 || hi < 0) && Math.abs(rel) > 0.2;
    if (flag) moved++;
    console.log(`  ${(key.replace(/^r:/, '汉 ').replace(/^b:/, '楚 ')).padEnd(22)} ${ma2.toFixed(2).padStart(6)}   ${mb2.toFixed(2).padStart(6)}   ${((rel >= 0 ? '+' : '') + (100 * rel).toFixed(0) + '%').padStart(6)}   ${lo.toFixed(2)} ~ ${hi.toFixed(2)}${flag ? '  ← 变了' : ''}`);
  }
  console.log(`收敛标准③：${moved ? moved + ' 项技能用法明显变了（区间不含 0 且变 20% 以上）→ 没过' : '各项技能用法没有明显变化 → 过'}`);
}
