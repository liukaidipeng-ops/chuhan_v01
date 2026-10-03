// 技能模式平衡模拟：用 src/bfai.js 的电脑自我对弈，统计汉楚胜率、对局节奏、技能 / 兵法使用率、翻盘率
// 不改任何游戏源码；调参通过 --set / --preset 在进程里覆盖 BF.CFG（和改 bingfa.js 里的 CFG 等效）
//
// 用法：node tools/bfsim.js [选项]
//   --games N        局数（默认 200）
//   --level L        双方电脑档位 easy | mid | hard（默认 mid；--red / --black 可分别指定）
//   --budget MS      霸王档每步时间上限（默认 600，原值 3800 太慢）
//   --ai FILE        双方用哪个电脑（默认 src/bfai.js；--ai-r / --ai-b 分别指定，可让两个版本对打）
//   --jobs N         并行进程数（默认 CPU 核数）
//   --max-rounds N   超过这么多回合算和（默认 150）
//   --open N         开局多样化：前 N 步（双方合计）在“差不到约 1.5 分”的着法里随机挑（默认 6；0 = 关）
//   --seed N         起始随机种子（第 i 局用 seed + i，可复现）
//   --preset NAME    预设配置（见下方 PRESETS；可多个，逗号分隔）
//   --set PATH=JSON  覆盖单个配置项，如 --set skills.jianta.splashMinLevel=2（可多次）
//   --save-ult       军功离终极兵法差 7 以内时不再升级、攒着放大招（霸王档本来就这样；校尉 / 新兵默认不攒）
//   --json FILE      把每局明细写到 FILE
//   --quiet          只输出汇总
'use strict';
const path = require('path');
const os = require('os');
const { fork } = require('child_process');
const SRC = path.join(__dirname, '..', 'src');

// ---------- 预设 ----------
// baseline：关掉一切技能系统（不给军功、不能升级、不能用兵法），得到同一个电脑下的“普通象棋”对照组
const PRESETS = {
  baseline: {
    set: {
      'merit.start': 0, 'merit.autoIncomeFromRound': 99999, 'merit.checkReward': 0, 'merit.pawnCrossRiverReward': 0,
      'merit.lostPieceCompensation': 0, 'merit.killRewardPerLevel': 0, 'merit.killReward': { p: 0, a: 0, e: 0, n: 0, c: 0, r: 0 },
      'upgrade.autoByPlates': false,
    },
    noArts: true,
  },
  // 单项消融：只关掉一样东西，看它对胜率的影响
  'no-simian': { set: { 'ultimates.simian.usesPerGame': 0 } },
  'no-hongmen': { set: { 'ultimates.hongmen.usesPerGame': 0 } },
  'no-ult': { set: { 'ultimates.simian.usesPerGame': 0, 'ultimates.hongmen.usesPerGame': 0 } },
  'no-revive': { set: { 'generalArts.xiaohe.usesPerGame': 0 } },
  'no-pofu': { set: { 'generalArts.pofu.usesPerGame': 0 } },
  'no-arts': { set: { 'generalArts.xiaohe.usesPerGame': 0, 'generalArts.pofu.usesPerGame': 0 } },
  'no-e4': { set: { 'upgrade.maxLevel': { r: 4, p: 4, a: 4, e: 3 } } },
};

// ---------- 参数 ----------
function parseArgs(argv) {
  const o = { games: 200, level: 'mid', red: null, black: null, budget: 600, jobs: os.cpus().length, maxRounds: 150, open: 6, seed: 1, presets: [], sets: [], json: null, quiet: false, saveUlt: false, ai: 'src/bfai.js', aiR: null, aiB: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '--games') o.games = +v();
    else if (k === '--level') o.level = v();
    else if (k === '--red') o.red = v();
    else if (k === '--black') o.black = v();
    else if (k === '--budget') o.budget = +v();
    else if (k === '--jobs') o.jobs = +v();
    else if (k === '--max-rounds') o.maxRounds = +v();
    else if (k === '--open') o.open = +v();
    else if (k === '--seed') o.seed = +v();
    else if (k === '--preset') o.presets.push(...v().split(',').filter(Boolean));
    else if (k === '--set') o.sets.push(v());
    else if (k === '--json') o.json = v();
    else if (k === '--quiet') o.quiet = true;
    else if (k === '--save-ult') o.saveUlt = true;
    else if (k === '--ai') o.ai = v();
    else if (k === '--ai-r') o.aiR = v();
    else if (k === '--ai-b') o.aiB = v();
    else if (k === '--worker') o.worker = true;
    else throw new Error('未知参数 ' + k);
  }
  return o;
}
function setPath(obj, p, val) {
  const ks = p.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') throw new Error('配置里没有 ' + p); o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}
// 把预设和 --set 合成一份覆盖表
function overrides(o) {
  const set = {}; let noArts = false;
  for (const n of o.presets) { const P = PRESETS[n]; if (!P) throw new Error('没有这个预设 ' + n + '（可选：' + Object.keys(PRESETS).join(' ') + '）'); Object.assign(set, P.set); if (P.noArts) noArts = true; }
  for (const s of o.sets) { const i = s.indexOf('='); if (i < 0) throw new Error('--set 要写成 PATH=JSON'); const raw = s.slice(i + 1); let v; try { v = JSON.parse(raw); } catch (e) { v = raw; } set[s.slice(0, i)] = v; }
  return { set, noArts };
}

// ---------- 子进程：下棋 ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const VAL = { r: 9, c: 4.5, n: 4, e: 2, a: 2, p: 1, k: 0 };

function worker() {
  global.XQ = require(path.join(SRC, 'rules.js'));
  const BF = global.BF = require(path.join(SRC, 'bingfa.js'));
  let AI = null, AIS = null;   // AIS.r / AIS.b：双方各用哪个电脑
  let ov = null;
  const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
  const other = s => (s === 'r' ? 'b' : 'r');
  // 中立的局面分（汉方视角）：子力按血量加价 + 军功；不用任何一个电脑自己的估值，免得两个版本对打时偏向一方
  const neutral = S => { let v = 0; for (const row of S.board) for (const p of row) if (p && p.t !== 'k') v += (p.s === 'r' ? 1 : -1) * VAL[p.t] * (1 + 0.45 * (p.hp - 1)); return v + 0.3 * (S.merit.r - S.merit.b); };
  const material = S => { const m = { r: 0, b: 0 }; for (const row of S.board) for (const p of row) if (p) m[p.s] += VAL[p.t]; return m; };

  async function play(job) {
    Math.random = mulberry32(job.seed * 2654435761);
    const lvl = { r: job.red, b: job.black };
    const g = new BF.Game();
    if (ov.noArts) g.setup(T => { T.used.art = { r: 99, b: 99 }; T.used.ult = { r: 99, b: 99 }; });
    const side2 = () => ({ r: {}, b: {} });
    const R = {
      seed: job.seed, winner: null, reason: null, rounds: 0, plies: 0, final: false, finalRound: null,
      act: side2(), up: side2(), kills: side2(), hits: side2(), meritBy: side2(), friendly: side2(),
      ultRound: {}, artRound: {}, artKind: {}, firstLv: { r: {}, b: {} }, samples: [], rescue: 0, jumaCounter: side2(), msMax: 0, ms: 0,
    };
    let lastRound = 0, guard = 0;
    const sample = () => {
      const rd = g.round;
      if (rd !== lastRound && rd % 5 === 0) { lastRound = rd; const m = material(g.S); R.samples.push({ round: rd, score: +neutral(g.S).toFixed(2), mat: m, merit: { ...g.merit }, lv: lvSum(g.S) }); }
    };
    const lvSum = S => { const o = { r: 0, b: 0 }; for (const row of S.board) for (const p of row) if (p && p.t !== 'k') o[p.s] += p.lv - 1; return o; };
    const record = (a, info, side) => {
      const A = R.act[side];
      if (a.k === 'up') {
        inc(R.up[side], info.t + info.lv);
        if (R.firstLv[side][info.lv] == null) R.firstLv[side][info.lv] = g.round;
        return;
      }
      let key;
      if (a.k === 'mv') key = info.extra && info.extra.via ? 'via_' + info.extra.via : 'mv';
      else if (a.k === 'sk') key = 'sk_' + ((info.extra && info.extra.sk) || '?');
      else if (a.k === 'art') { key = a.steps ? 'art_pofu' : 'art_revive'; if (R.artRound[side] == null) { R.artRound[side] = g.round; R.artKind[side] = a.steps ? 'pofu' : (BF.START && info.ev.find(e => e.e === 'revive') || {}).t; } }
      else if (a.k === 'ult') { key = 'ult'; if (R.ultRound[side] == null) R.ultRound[side] = g.round; }
      else key = a.k;
      inc(A, key);
      const via = info.extra && info.extra.via;
      for (const e of info.ev || []) {
        if (e.e === 'kill') {
          const killer = e.friendly ? e.s : other(e.s);
          let how = e.how || 'capture';
          if (how === 'capture' && via) how = 'via_' + via;
          if (e.friendly) inc(R.friendly[killer], how); else inc(R.kills[killer], how);
        } else if (e.e === 'hit') {
          inc(R.hits[side], e.how || 'attack');
        } else if (e.e === 'merit') inc(R.meritBy[e.s], e.why, e.n);
        else if (e.e === 'autoup') { inc(R.up[e.s], e.t + e.lv + '*'); if (R.firstLv[e.s][e.lv] == null) R.firstLv[e.s][e.lv] = g.round; }
        else if (e.e === 'final' && !R.final) { R.final = true; R.finalRound = g.round; }
        else if (e.e === 'rescue') R.rescue++;
        else if (e.e === 'counter') inc(R.jumaCounter[other(side)], 'hit');
      }
    };
    while (!g.result) {
      if (g.round > job.maxRounds) { R.reason = 'cap'; break; }
      if (++guard > job.maxRounds * 6) { R.reason = 'stuck'; break; }
      const side = g.turn;
      if (g.status && g.status.mustPass) { const info = g.apply({ k: 'pass' }); if (!info) throw new Error('pass 失败'); record({ k: 'pass' }, info, side); R.plies++; sample(); continue; }
      const t0 = Date.now();
      let L = R.plies < job.open ? 'open' : lvl[side];
      if (job.saveUlt && L !== 'hard') {
        const U = BF.CFG.ultimates, left = g.used.ult[side] < U[side === 'r' ? 'simian' : 'hongmen'].usesPerGame;
        if (left && g.merit[side] >= U.cost - 7) L += 'Save';
      }
      const seq = await AIS[side].think(BF.cloneState(g.S), L);
      const dt = Date.now() - t0; R.ms += dt; if (dt > R.msMax) R.msMax = dt;
      if (!seq.length) throw new Error('电脑没有给出行动');
      for (const a of seq) {
        const info = g.apply(a);
        if (!info) throw new Error('非法行动 ' + JSON.stringify(a) + ' seed=' + job.seed);
        record(a, info, side);
      }
      R.plies++;
      sample();
    }
    if (g.result) { R.winner = g.result.winner; R.reason = g.result.reason; }
    R.rounds = g.round;
    R.endMerit = { ...g.merit };
    R.endMat = material(g.S);
    return R;
  }

  process.on('message', async m => {
    if (m.init) {
      ov = m.init;
      for (const [k, v] of Object.entries(ov.set)) setPath(BF.CFG, k, v);
      const load = f => require(path.resolve(__dirname, '..', f));
      AIS = { r: load(m.aiR), b: load(m.aiB) };
      AI = AIS.r;
      for (const X of new Set([AIS.r, AIS.b])) {
        X.LEVELS.hard.budget = m.budget;
        // 开局多样化用：校尉的搜索深度，但在分差不大的着法里随机挑
        X.LEVELS.open = { ...X.LEVELS.mid, noise: 0.9, top: 3 };
        // 攒终极兵法：这一步不升级
        for (const k of ['easy', 'mid', 'open']) X.LEVELS[k + 'Save'] = { ...X.LEVELS[k], up: -1 };
      }
      process.send({ ready: true });
      return;
    }
    if (m.job) {
      try { process.send({ result: await play(m.job) }); }
      catch (e) { process.send({ error: String(e && e.stack || e), seed: m.job.seed }); }
    }
    if (m.exit) process.exit(0);
  });
}

// ---------- 主进程：分发、汇总 ----------
async function run(o) {
  const ov = overrides(o);
  const jobs = [];
  for (let i = 0; i < o.games; i++) jobs.push({ seed: o.seed + i, red: o.red || o.level, black: o.black || o.level, maxRounds: o.maxRounds, open: o.open, saveUlt: o.saveUlt });
  const results = [], errors = [];
  let next = 0, done = 0;
  const t0 = Date.now();
  await new Promise((resolve) => {
    const n = Math.max(1, Math.min(o.jobs, jobs.length));
    let alive = n;
    for (let w = 0; w < n; w++) {
      const c = fork(__filename, ['--worker'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      const feed = () => { if (next < jobs.length) c.send({ job: jobs[next++] }); else { c.send({ exit: true }); } };
      c.on('message', m => {
        if (m.ready) return feed();
        if (m.result) results.push(m.result);
        if (m.error) errors.push(m);
        done++;
        if (!o.quiet && process.stderr.isTTY) process.stderr.write(`\r${done}/${jobs.length}`);
        feed();
      });
      c.on('exit', () => { if (--alive === 0) resolve(); });
      c.send({ init: ov, budget: o.budget, aiR: o.aiR || o.ai, aiB: o.aiB || o.ai });
    }
  });
  if (!o.quiet && process.stderr.isTTY) process.stderr.write('\n');
  results.sort((a, b) => a.seed - b.seed);
  if (o.json) require('fs').writeFileSync(o.json, JSON.stringify({ args: o, overrides: ov, results, errors }, null, 1));
  const sum = summarize(results);
  sum.errors = errors.length; sum.seconds = Math.round((Date.now() - t0) / 1000);
  sum.label = [o.presets.join('+'), ...o.sets, o.saveUlt ? 'save-ult' : ''].filter(Boolean).join(' ') || 'current';
  sum.level = (o.red || o.level) + ' vs ' + (o.black || o.level) + ((o.aiR || o.aiB || o.ai !== 'src/bfai.js') ? `  [汉 ${o.aiR || o.ai} | 楚 ${o.aiB || o.ai}]` : '');
  print(sum, o);
  if (errors.length) console.log('出错的局：', errors.slice(0, 3).map(e => e.seed + ' ' + e.error.split('\n')[0]).join(' | '));
  return sum;
}

function wilson(k, n) { if (!n) return [0, 0]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d]; }
const pct = x => (100 * x).toFixed(1) + '%';
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const quant = (a, q) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

function summarize(rs) {
  const N = rs.length, S = { n: N };
  const w = { r: 0, b: 0, draw: 0 };
  const reasons = {};
  for (const r of rs) { if (r.winner) w[r.winner]++; else w.draw++; reasons[(r.winner || '-') + ':' + r.reason] = (reasons[(r.winner || '-') + ':' + r.reason] || 0) + 1; }
  S.win = w; S.reasons = reasons;
  const dec = w.r + w.b;
  S.redShareDecisive = dec ? w.r / dec : 0; S.redCI = wilson(w.r, dec);
  const rounds = rs.map(r => r.rounds);
  S.rounds = { mean: mean(rounds), median: quant(rounds, 0.5), p90: quant(rounds, 0.9), within60: rounds.filter(x => x <= 60).length / N };
  S.final = rs.filter(r => r.final).length / N;
  // 每方每种行动：用过的局占比、平均次数
  const keys = new Set();
  for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.act[s])) keys.add(k);
  S.act = {};
  for (const k of [...keys].sort()) S.act[k] = { r: use(rs, r => r.act.r[k]), b: use(rs, r => r.act.b[k]) };
  const ukeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.up[s])) ukeys.add(k);
  S.up = {}; for (const k of [...ukeys].sort()) S.up[k] = { r: use(rs, r => r.up.r[k]), b: use(rs, r => r.up.b[k]) };
  const kkeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.kills[s])) kkeys.add(k);
  S.kills = {}; for (const k of [...kkeys].sort()) S.kills[k] = { r: use(rs, r => r.kills.r[k]), b: use(rs, r => r.kills.b[k]) };
  const hkeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.hits[s])) hkeys.add(k);
  S.hits = {}; for (const k of [...hkeys].sort()) S.hits[k] = { r: use(rs, r => r.hits.r[k]), b: use(rs, r => r.hits.b[k]) };
  const mkeys = new Set(); for (const r of rs) for (const s of ['r', 'b']) for (const k of Object.keys(r.meritBy[s])) mkeys.add(k);
  S.merit = {}; for (const k of [...mkeys].sort()) S.merit[k] = { r: mean(rs.map(r => r.meritBy.r[k] || 0)), b: mean(rs.map(r => r.meritBy.b[k] || 0)) };
  // 兵法、终极兵法：用了的局里，用的一方赢了多少
  const usedWin = (pick) => { const g = { r: [0, 0], b: [0, 0] }; for (const r of rs) for (const s of ['r', 'b']) if (pick(r)[s] != null) { g[s][0]++; if (r.winner === s) g[s][1]++; } return g; };
  S.ult = { used: usedWin(r => r.ultRound), round: { r: mean(rs.filter(r => r.ultRound.r != null).map(r => r.ultRound.r)), b: mean(rs.filter(r => r.ultRound.b != null).map(r => r.ultRound.b)) } };
  S.art = { used: usedWin(r => r.artRound), round: { r: mean(rs.filter(r => r.artRound.r != null).map(r => r.artRound.r)), b: mean(rs.filter(r => r.artRound.b != null).map(r => r.artRound.b)) } };
  S.rescue = rs.filter(r => r.rescue).length;
  // 翻盘：第 R 回合时局面分落后 ≥ T 的一方，最后赢了的比例
  S.comeback = {};
  for (const rd of [10, 20, 30]) for (const T of [2, 4]) {
    let n = 0, k = 0, nd = 0;
    for (const r of rs) {
      const s = r.samples.find(x => x.round === rd); if (!s || Math.abs(s.score) < T) continue;
      n++; const behind = s.score < 0 ? 'r' : 'b'; if (r.winner === behind) k++; if (!r.winner) nd++;
    }
    S.comeback[`R${rd}≥${T}`] = { n, trailingWins: k, draws: nd };
  }
  // 局面分（汉方视角）随回合
  S.scoreByRound = {};
  for (const rd of [5, 10, 15, 20, 30, 40]) { const xs = rs.map(r => r.samples.find(x => x.round === rd)).filter(Boolean); if (xs.length >= N * 0.2) S.scoreByRound[rd] = { n: xs.length, score: mean(xs.map(x => x.score)), meritR: mean(xs.map(x => x.merit.r)), meritB: mean(xs.map(x => x.merit.b)), lvR: mean(xs.map(x => x.lv.r)), lvB: mean(xs.map(x => x.lv.b)) }; }
  S.firstLv = {};
  for (const L of [2, 3, 4]) S.firstLv[L] = { r: mean(rs.filter(r => r.firstLv.r[L] != null).map(r => r.firstLv.r[L])), b: mean(rs.filter(r => r.firstLv.b[L] != null).map(r => r.firstLv.b[L])), rn: rs.filter(r => r.firstLv.r[L] != null).length / N, bn: rs.filter(r => r.firstLv.b[L] != null).length / N };
  S.msPerPly = mean(rs.map(r => r.ms / Math.max(1, r.plies)));
  return S;
  function use(rs, f) { let g = 0, t = 0; for (const r of rs) { const v = f(r) || 0; if (v) g++; t += v; } return { games: g / N, avg: t / N }; }
}

const CN = {
  mv: '普通走子', pass: '停着', ult: '终极兵法', art_revive: '召回良将', art_pofu: '破釜沉舟',
  sk_juma: '拒马', sk_chongzhen: '冲阵', sk_taying: '踏营', sk_pili: '霹雳', sk_qishe: '齐射', sk_hujia: '护驾', sk_feiyue: '飞越',
  via_shensu: '神速营(被动)', via_huifang: '回防(被动)', via_jinwei: '铁甲禁卫(被动)',
  capture: '普通吃子', chongzhen: '冲阵', taying: '踏营', pili: '霹雳', qishe: '齐射', jianta: '践踏', juma: '拒马反伤', feiyue: '飞越', attack: '强攻',
};
function print(S, o) {
  const L = [];
  const cn = k => CN[k] || k;
  const ci = S.redCI.map(x => (100 * x).toFixed(0)).join('–');
  L.push(`== ${S.label} | ${S.level} | ${S.n} 局 | ${S.seconds}s ==`);
  L.push(`胜负：汉 ${S.win.r}  楚 ${S.win.b}  和/超时 ${S.win.draw}   汉方胜率（分胜负的局）${pct(S.redShareDecisive)}  95%CI ${ci}%`);
  L.push(`结局：${Object.entries(S.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join('  ')}`);
  L.push(`回合：平均 ${S.rounds.mean.toFixed(1)}  中位 ${S.rounds.median}  P90 ${S.rounds.p90}  60 回合内结束 ${pct(S.rounds.within60)}  进入决战 ${pct(S.final)}`);
  if (o.quiet) { console.log(L.join('\n')); return; }
  L.push('行动（用过的局占比 / 每局平均次数）  汉 | 楚');
  for (const [k, v] of Object.entries(S.act)) L.push(`  ${cn(k).padEnd(10)} ${pct(v.r.games).padStart(6)} ${v.r.avg.toFixed(2).padStart(6)} | ${pct(v.b.games).padStart(6)} ${v.b.avg.toFixed(2).padStart(6)}`);
  L.push('升级（* = 甲片自动晋升）  汉 | 楚 （用过的局占比 / 每局平均）');
  for (const [k, v] of Object.entries(S.up)) L.push(`  ${k.padEnd(5)} ${pct(v.r.games).padStart(6)} ${v.r.avg.toFixed(2).padStart(5)} | ${pct(v.b.games).padStart(6)} ${v.b.avg.toFixed(2).padStart(5)}`);
  L.push('击杀来源（每局平均）  汉 | 楚');
  for (const [k, v] of Object.entries(S.kills)) L.push(`  ${cn(k).padEnd(10)} ${v.r.avg.toFixed(2).padStart(6)} | ${v.b.avg.toFixed(2).padStart(6)}`);
  L.push('造成伤害但没打死（每局平均）  汉 | 楚');
  for (const [k, v] of Object.entries(S.hits)) L.push(`  ${cn(k).padEnd(10)} ${v.r.avg.toFixed(2).padStart(6)} | ${v.b.avg.toFixed(2).padStart(6)}`);
  L.push('军功来源（每局平均）  汉 | 楚');
  for (const [k, v] of Object.entries(S.merit)) L.push(`  ${k.padEnd(6)} ${v.r.toFixed(1).padStart(6)} | ${v.b.toFixed(1).padStart(6)}`);
  const ur = S.ult.used, ar = S.art.used;
  L.push(`终极兵法：汉用 ${ur.r[0]} 局（平均第 ${S.ult.round.r.toFixed(1)} 回合，用了的局胜 ${ur.r[0] ? pct(ur.r[1] / ur.r[0]) : '-'}）  楚用 ${ur.b[0]} 局（第 ${S.ult.round.b.toFixed(1)} 回合，胜 ${ur.b[0] ? pct(ur.b[1] / ur.b[0]) : '-'}）  护驾破鸿门宴 ${S.rescue} 局`);
  L.push(`主帅兵法：汉召回 ${ar.r[0]} 局（第 ${S.art.round.r.toFixed(1)} 回合，胜 ${ar.r[0] ? pct(ar.r[1] / ar.r[0]) : '-'}）  楚破釜 ${ar.b[0]} 局（第 ${S.art.round.b.toFixed(1)} 回合，胜 ${ar.b[0] ? pct(ar.b[1] / ar.b[0]) : '-'}）`);
  L.push('首次升到 N 级（平均回合 / 出现的局占比）  汉 | 楚');
  for (const [k, v] of Object.entries(S.firstLv)) L.push(`  ${k} 级  第 ${v.r.toFixed(1)} 回合 ${pct(v.rn)} | 第 ${v.b.toFixed(1)} 回合 ${pct(v.bn)}`);
  L.push('局面分随回合（汉方视角，正 = 汉优）/ 军功 / 等级总和');
  for (const [k, v] of Object.entries(S.scoreByRound)) L.push(`  R${k}（${v.n} 局在下）分 ${v.score.toFixed(2)}  军功 汉 ${v.meritR.toFixed(1)} 楚 ${v.meritB.toFixed(1)}  等级 汉 ${v.lvR.toFixed(1)} 楚 ${v.lvB.toFixed(1)}`);
  L.push('翻盘（某回合落后 ≥ T 分的一方最后赢了）');
  for (const [k, v] of Object.entries(S.comeback)) if (v.n) L.push(`  ${k}：${v.n} 局，落后方赢 ${v.trailingWins}（${pct(v.trailingWins / v.n)}），和 ${v.draws}`);
  L.push(`每步平均 ${S.msPerPly.toFixed(0)}ms`);
  console.log(L.join('\n'));
}

const o = parseArgs(process.argv.slice(2));
if (o.worker) worker();
else run(o).catch(e => { console.error(e); process.exit(1); });
module.exports = { PRESETS, summarize };
