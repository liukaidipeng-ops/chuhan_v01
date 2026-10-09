// 复盘（第二版，用 TD 的正式观察接口 BFAI.obsVersion ≥ 1，C62 / H54；不再给电脑打文字补丁）
//   node tools/review/review.js 对局.txt [--side r|b] [--level hard] [--deep 1000000] [--wide 500000] [--dd 4] [--dw 3]
//                                        [--fast] [--from 回合] [--to 回合] [--md 报告.md] [--json 明细.json] [--branch i]
//   对局：游戏里导出的文本，或「对局」工单解出来的（tools/review/decode_issue.js）。
//
// 一、用哪份引擎和电脑：按导出里的版本号（data.ver）在 main 的 version.json 历史里找到那次部署的提交，取那时的
//     src/rules.js、bingfa.js、bfai.js——规则天天在改（拒马、象攻击……），只有当时的引擎才重放得了、电脑也才是“当时的它”。
//     找不到（本地版本、太老）就用工作区的 src。那份电脑没有观察接口（obsVersion）时，换用工作区的电脑（报告里会写明）。
// 二、每一步电脑行动：
//   · 当时的它：导出里有思考记录（data.think，网页里按时间收手的那次真实思考）就用它：算了几层、为什么停、前 8 个候选和预想线、
//     被筛掉的升级 / 召回（和原因）、是不是随机没选第一名、一步杀保险换没换。没有记录（老导出）就按节点数重算一遍（标“重算”）。
//   · 深裁判：同一套估值、多算很多（--deep 节点）。宽裁判：升级全看（对方第 1、3 层所有升法 + 根上自己不筛，--wide 节点）。
//     比分：裁判最好的那步和实走那步，走完以后各按同样的固定层数算（--dd / --dw；单双数层分差大，必须同层数比）。
//   · 精确查一步杀：实走完，对方能不能（先升一级再）一步将死。
//   · 错因：送一步杀 / 被筛掉（守子没被捉、攒军功、名额满了……）/ 升级盲区（只有宽裁判看得出）/ 随机 / 算浅（当时只算了 N 层）。
//   · 估值拆分（BFAI.scoreParts）：它预想的线和裁判的线，末局面各项分差在哪。
//   · Ham 标的“这步笨”（data.flags）优先列出。
// 三、输出：报告（--md，默认打印）、明细（--json：每步的局面压缩串、判断、错因——出考题、进调权重的数据集用）。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const SRC = path.join(__dirname, '..', '..'), REPO = path.join(SRC, '..');

const argv = process.argv.slice(2);
const opt = { file: null, side: null, level: null, deep: 1000000, wide: 500000, dd: 4, dw: 3, from: 1, to: 999, md: null, json: null, branch: null, nodes: 100000 };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--side') opt.side = v(); else if (k === '--level') opt.level = v(); else if (k === '--deep') opt.deep = +v(); else if (k === '--wide') opt.wide = +v();
  else if (k === '--dd') opt.dd = +v(); else if (k === '--dw') opt.dw = +v(); else if (k === '--from') opt.from = +v(); else if (k === '--to') opt.to = +v();
  else if (k === '--md') opt.md = v(); else if (k === '--json') opt.json = v(); else if (k === '--branch') opt.branch = +v(); else if (k === '--nodes') opt.nodes = +v();
  else if (k === '--fast') { opt.deep = 300000; opt.wide = 200000; opt.dd = 3; opt.dw = 3; }
  else if (!opt.file) opt.file = k; else throw new Error('多余的参数 ' + k);
}
if (!opt.file) { console.log('用法见文件开头'); process.exit(1); }

// ---------- 读对局 ----------
const parse = text => { const i = text.indexOf('---DATA---'); const raw = (i >= 0 ? text.slice(i + 10) : text).trim(); return JSON.parse(raw.slice(raw.indexOf('{'))); };
let data = parse(fs.readFileSync(opt.file, 'utf8'));
if (opt.branch != null) {   // 悔棋分支：把被悔掉的那段接回去当一局看
  const b = (data.branches || [])[opt.branch]; if (!b) throw new Error('没有第 ' + opt.branch + ' 个悔棋分支');
  data = { ...data, entries: data.entries.slice(0, b.at).concat(b.entries), think: { ...(data.think || {}), ...(b.think || {}) }, result: null };
}

// ---------- 找当时的引擎和电脑 ----------
const git = args => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
function commitOf(ver) {
  if (!ver) return null;
  for (const ref of ['origin/main', 'main', 'HEAD']) {
    try {
      for (const c of git(['log', ref, '--format=%H', '-S' + ver, '--', 'version.json']).split('\n').filter(Boolean)) {
        try { if (JSON.parse(git(['show', c + ':version.json'])).v === ver) return c; } catch (e) { }
      }
    } catch (e) { }
  }
  return null;
}
const commit = commitOf(data.ver);
let dir = path.join(SRC, 'src'), engineNote = '工作区 src（没找到版本 ' + (data.ver || '?') + ' 对应的部署）';
if (commit) {
  dir = path.join(os.tmpdir(), 'bfreview_' + commit.slice(0, 10));
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['rules.js', 'bingfa.js', 'bfai.js']) { const p = path.join(dir, f); if (!fs.existsSync(p)) fs.writeFileSync(p, git(['show', commit + ':source/src/' + f])); }
  engineNote = `版本 ${data.ver} = main ${commit.slice(0, 7)} 的引擎`;
}
global.XQ = require(path.join(dir, 'rules.js'));
const BF = global.BF = require(path.join(dir, 'bingfa.js'));
let AI = require(path.join(dir, 'bfai.js')), aiNote = '当时的电脑';
if (!(AI.obsVersion >= 1)) { AI = require(path.join(SRC, 'src', 'bfai.js')); aiNote = '工作区的电脑（当时那份没有观察接口；和当时的差别见 git log）'; }
if (!(AI.obsVersion >= 1)) throw new Error('电脑没有观察接口（obsVersion），先合并 main');
AI.trace = true;
// 规则开关：导出里记了就照它
const o = data.opts || {};
if (BF.CFG.beishui && 'bs' in o) BF.CFG.beishui.on = !!o.bs;
if (BF.CFG.r6 && 'r6' in o) BF.CFG.r6.on = !!o.r6;

// ---------- 小工具 ----------
const WIN = 9000, N = { r: '车', n: '马', e: '相', a: '士', k: '帅', c: '炮', p: '兵' }, SIDE = { r: '汉', b: '楚' };
const side = opt.side || (data.ai ? Object.keys(data.ai)[0] : 'r'), level = opt.level || (data.ai && data.ai[side]) || 'hard';
const seeded = s => { let a = s; Math.random = () => { a = (a * 1103515245 + 12345) % 2147483648; return a / 2147483648; }; };
const pieceAt = (S, at) => at && S.board[at[1]] && S.board[at[1]][at[0]];
function desc(S, a) {
  if (!a) return '?';
  let pre = '';
  if (Array.isArray(a.up)) { const p = pieceAt(S, a.up); pre = `升${p ? N[p.t] : '?'}${a.up} + `; S = BF.ai.upgradeState(S, a.up) || S; }   // 召回的 up: true 是“召回后当场升级”，不是先升级再走
  if (a.k === 'up') { const p = pieceAt(S, a.at); return `升${p ? N[p.t] : '?'}${a.at}`; }
  if (a.k === 'mv') { const p = pieceAt(S, a.from), q = pieceAt(S, a.to); return pre + `${p ? N[p.t] : '?'}${a.from}→${a.to}${q ? '×' + N[q.t] : ''}`; }
  if (a.k === 'art') return pre + (a.steps ? '背水[' + a.steps.map(m => `${m.from}→${m.to}`).join(' ') + ']' : '召回' + (a.up === true ? '并升级' : ''));
  if (a.k === 'ult') return pre + '终极兵法';
  if (a.k === 'sk') return pre + '技能@' + a.at + (a.to ? '→' + a.to : '');
  if (a.k === 'pass') return pre + '停着';
  return pre + JSON.stringify(a);
}
// 执行一个行动（可带 up：先升级再走）
function step(S, a) {
  if (!S || !a) return null;
  if (a.k === 'up') return BF.ai.upgradeState(S, a.at);
  let b = a;
  if (Array.isArray(a.up)) { S = BF.ai.upgradeState(S, a.up); if (!S) return null; const { up, ...c } = a; b = c; }
  if (b.est) { const { est, ...c } = b; b = c; }
  const r = BF.attempt(S, b); return r ? r.S : null;
}
function line(S, seq, max = 6) {
  const out = []; let T = S;
  for (const a of seq || []) { if (!T) break; if (out.length < max) out.push(SIDE[T.turn] + desc(T, a) + (a.est ? '?' : '')); T = step(T, a); }
  return { text: out.join(' ') + ((seq || []).length > max ? ' …' : ''), end: T };
}
const fmtV = v => (!isFinite(v) ? '?' : v >= WIN / 2 ? '必胜' : v <= -WIN / 2 ? '必败' : v.toFixed(2));
const key = a => { if (!a) return ''; const { est, ...b } = a; return JSON.stringify(Object.keys(b).sort().map(k => [k, b[k]])); };
// 主行动 + 升级合成一个（导出里是 [up, (拒马), 主行动]）
const mainOf = seq => { const up = (seq.find(a => a.k === 'up') || {}).at, m = seq[seq.length - 1]; return up && m && m.k !== 'up' ? { up, ...m } : m; };
// 带“先升级”的行动：up 在前（和电脑的 actOf 一样），比较时按字段排序，顺序无所谓
function mate1(S, me) {
  const opp = S.turn; if (opp === me) return null;
  const st = [{ S, up: null }];
  if (!S.upgraded) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = S.board[r][f]; if (p && p.s === opp && p.t !== 'k') { const U = BF.ai.upgradeState(S, [f, r]); if (U) st.push({ S: U, up: [f, r] }); } }
  for (const x of st) for (const e of BF.ai.gen(x.S, false)) {
    const R = BF.attempt(x.S, e.a); if (!R) continue;
    const ev = BF.evaluate(R.S); if (ev && ev.result && ev.result.winner === opp) return desc(S, x.up ? { up: x.up, ...e.a } : e.a);
  }
  return null;
}
const partsTxt = P => P ? ['子力', '位置', '贴脸', '帅', '军功', '兵法', '终极兵法', '决战'].filter(k => Math.abs(P[k]) >= 0.05).map(k => `${k} ${P[k].toFixed(1)}`).join(' ') + ` = ${P['合计'].toFixed(2)}` : '';
const WHY = { depth: '层数满', time: '时间到', nodes: '节点到', mate: '看到杀', fixed: '固定层数', 'only-art': '只有兵法', 'no-move': '无着' };

// 档位
const H = AI.LEVELS[level] || AI.LEVELS.hard;
AI.LEVELS.rvNow = { ...H, nodes: opt.nodes };
AI.LEVELS.rvDeep = { ...H, noise: 0, top: 1, nodes: opt.deep };
AI.LEVELS.rvWide = { ...H, noise: 0, top: 1, nodes: opt.wide, upAll: true, rootUpAll: true };
AI.LEVELS.rvFixD = { ...H, noise: 0, top: 1, fixedDepth: opt.dd };
AI.LEVELS.rvFixW = { ...H, noise: 0, top: 1, fixedDepth: opt.dw, upAll: true, rootUpAll: true };
async function think(S, lv, sd) { seeded(sd); const seq = await AI.think(BF.cloneState(S), lv); return { seq, L: AI.think.last, T: AI.think.last.trace }; }

// ---------- 重放、切回合 ----------
const newGame = () => { const g = new BF.Game(); if (data.base) g.reset(data.base); return g; };
const entries = data.entries || [], turns = [];
{
  const g = newGame(); let start = 0, n = 0;
  for (let i = 0; i < entries.length; i++) {
    const sd = g.turn; if (!n) start = i; n++;
    if (!g.apply(entries[i])) throw new Error(`第 ${i + 1} 条行动重放失败（${engineNote}）：${JSON.stringify(entries[i])}`);
    if (g.turn !== sd || g.result) { turns.push({ round: Math.floor(turns.length / 2) + 1, side: sd, from: start, to: i + 1 }); n = 0; }
  }
}
const stateAt = n => { const g = newGame(); for (let i = 0; i < n; i++) g.apply(entries[i]); return g.S; };
const flags = new Map((data.flags || []).map(f => [f.ply, f.note || '']));

(async () => {
  const rows = [], out = [], tally = {};
  out.push(`# 复盘：${path.basename(opt.file)}${opt.branch != null ? `（悔棋分支 ${opt.branch}）` : ''}`);
  out.push(`- 电脑执${SIDE[side]}、${level}；${engineNote}；${aiNote}（obsVersion ${AI.obsVersion}）`);
  out.push(`- 结果：${data.result ? SIDE[data.result.winner] + '胜（' + data.result.reason + '）' : '未完'}；${turns.length} 手；思考记录 ${data.think ? Object.keys(data.think).length + ' 步' : '没有（老导出：按 ' + opt.nodes / 1000 + 'k 节点重算）'}；悔棋分支 ${(data.branches || []).length} 个；Ham 标记 ${flags.size} 处${data.note ? '；Ham 的话：' + data.note : ''}`);
  out.push(`- 裁判：深 ${opt.deep / 1000}k 节点（比分固定 ${opt.dd + 1} 层）；宽（升级全看）${opt.wide / 1000}k 节点（比分 ${opt.dw + 1} 层）`);
  out.push('');
  const detail = [];
  let prevV = null;
  for (const t of turns) {
    if (t.side !== side || t.round < opt.from || t.round > opt.to) continue;
    const S0 = stateAt(t.from), me = side, played = entries.slice(t.from, t.to), pMain = mainOf(played);
    // 当时的它
    let rec = data.think && (data.think[t.from] || data.think[String(t.from)]), real = !!rec;
    if (!rec) { const r = await think(S0, 'rvNow', 11); rec = r.T; }
    const cand = rec.cand || [], pk = cand.findIndex(c => key(c.a) === key(pMain));
    const myV = cand.length ? cand[Math.max(0, pk)].v : NaN;
    // 裁判
    let S1 = BF.cloneState(S0); for (const a of played) { S1 = step(S1, a); if (!S1) break; }
    const valAfter = async (T, lv, sd) => {
      if (!T) return NaN;
      const ev = BF.evaluate(T); if (ev && ev.result) return ev.result.winner === me ? WIN : -WIN;
      const r = await think(T, lv, sd); return -r.L.v;
    };
    async function judge(lv, lvFix, sd) {
      const r = await think(S0, lv, sd), best = mainOf(r.seq);
      const T = step(S0, best), b = await valAfter(T, lvFix, sd + 4);
      const p = key(best) === key(pMain) ? b : await valAfter(S1, lvFix, sd + 4);
      return { best, v: b, played: p, drop: b - p, cand: r.T.cand || [], depth: r.L.depth };
    }
    const Jd = await judge('rvDeep', 'rvFixD', 13), Jw = await judge('rvWide', 'rvFixW', 23);
    const lost = j => j.played <= -WIN / 2 && j.v > -WIN / 2;
    const m1 = S1 && !S1.final ? mate1(S1, me) : null;
    const m1j = m1 ? (() => { const T = step(S0, Jw.best); return T && !T.final ? mate1(T, me) : null; })() : null;
    const badD = Jd.drop >= 1 || lost(Jd), badW = Jw.drop >= 1 || lost(Jw), flag = flags.has(t.from) || flags.has(t.to - 1);
    const bad = badD || badW || !!m1;
    // 意外：上一步它以为的分 → 这一步的分，掉很多就是没料到对方那一手
    const swing = prevV != null && isFinite(myV) && Math.abs(myV) < WIN / 2 && Math.abs(prevV) < WIN / 2 ? myV - prevV : null;
    prevV = isFinite(myV) ? myV : prevV;
    const opMoves = (() => { const prev = turns[turns.indexOf(t) - 1]; if (!prev || prev.side === side) return ''; const S = stateAt(prev.from); return line(S, [mainOf(entries.slice(prev.from, prev.to))], 1).text; })();
    // 错因
    let why = '';
    if (bad) {
      const J = badD ? Jd : Jw, jb = J.best, inCand = cand.findIndex(c => key(c.a) === key(jb));
      const upOff = jb && jb.up ? (rec.upOff || []).find(u => u.at[0] === jb.up[0] && u.at[1] === jb.up[1]) : null;
      if (m1 && !m1j) why = '送一步杀：对方先升级再走（或直接）一步杀，它没看见';
      else if (upOff) why = `被筛掉：最好是 ${desc(S0, jb)}，可根上的升级筛子把“升${N[upOff.t]}”挡了（${upOff.why}）`;
      else if (badW && !badD) why = `升级盲区：只有升级全看的宽裁判看得出（差 ${fmtV(Jw.drop)}），最好是 ${desc(S0, Jw.best)}`;
      else if (!real && pk !== 0 && key(mainOf((await think(S0, 'rvNow', 11)).seq)) === key(jb)) why = '看不到当时：网页里那次选了别的（老导出没有思考记录）；按节点数重算的它和裁判一样'
      else if (rec.pick && rec.pick.random && inCand >= 0) why = `随机：它算出来第一名是 ${desc(S0, rec.pick.best)}，按噪声挑了第 ${rec.pick.rank + 1} 名`;
      else if (inCand < 0 && cand.length >= 8) why = `算浅：裁判那步 ${desc(S0, jb)} 不在它前 8 名（当时 ${rec.depth} 层，${WHY[rec.why] || rec.why}）`;
      else why = `算浅：当时只算了 ${rec.depth} 层（${WHY[rec.why] || rec.why}），裁判多算才看出来${inCand >= 0 ? `（裁判那步它排第 ${inCand + 1}，${fmtV(cand[inCand].v)}）` : ''}`;
      const k = why.split('：')[0]; tally[k] = (tally[k] || 0) + 1;
    }
    const pText = desc(S0, pMain);
    const head = `${bad ? '⚠' : flag ? '✎' : '·'} 第 ${t.round} 回合 ${pText}　它的分 ${fmtV(myV)}（${real ? '当时' : '重算'} ${rec.depth} 层 ${WHY[rec.why] || rec.why || ''}，${Math.round((rec.nodes || 0) / 1000)}k 节点${rec.ms ? '，' + (rec.ms / 1000).toFixed(1) + ' 秒' : ''}）` +
      (swing != null && swing <= -2 ? `　⤵ 比上一步掉 ${(-swing).toFixed(1)}（对方刚走 ${opMoves}）` : '');
    const lines = [head];
    if (flag) lines.push(`    Ham 标了：${flags.get(t.from) || flags.get(t.to - 1) || '（没写）'}`);
    if (bad || flag || (swing != null && swing <= -2)) {
      lines.push('    它的候选：' + cand.slice(0, 3).map((c, i) => `${'①②③'[i]} ${desc(S0, c.a)} ${fmtV(c.v)}${c.exact === false ? '(上界)' : ''}［${line(step(S0, c.a), c.pv, 4).text}］`).join('　'));
      if (pk > 2) lines.push(`    实走那步排第 ${pk + 1}`);
      if (rec.pick && rec.pick.random) lines.push(`    随机：第一名是 ${desc(S0, rec.pick.best)}，挑了第 ${rec.pick.rank + 1} 名`);
      if (rec.mateGuard) lines.push(`    一步杀保险：把 ${desc(S0, rec.mateGuard.from)} 换成了 ${desc(S0, rec.mateGuard.to)}`);
      if ((rec.upOff || []).length) lines.push('    被筛掉的升级：' + rec.upOff.slice(0, 6).map(u => `升${N[u.t]}${u.at}（${u.why}）`).join('、'));
      lines.push(`    深裁判：最好 ${desc(S0, Jd.best)} ${fmtV(Jd.v)}，实走 ${fmtV(Jd.played)}，差 ${fmtV(Jd.drop)}　｜　宽裁判：最好 ${desc(S0, Jw.best)} ${fmtV(Jw.v)}，实走 ${fmtV(Jw.played)}，差 ${fmtV(Jw.drop)}`);
      if (m1) lines.push(`    送一步杀：走完对方有 ${m1}${m1j ? '（裁判那步走完也有，可能已躲不开）' : ''}`);
      if (why) lines.push('    错因：' + why);
      if (bad) {
        const pc = pk >= 0 ? cand[pk] : null, myEnd = pc ? line(step(S0, pc.a), pc.pv, 99).end : S1;
        const J = badD ? Jd : Jw, jc = J.cand[0], jEnd = jc ? line(step(S0, jc.a), jc.pv, 99).end : step(S0, J.best);
        if (myEnd) lines.push(`    它以为的线末局面：${partsTxt(AI.scoreParts(myEnd, me))}`);
        if (jEnd) lines.push(`    裁判的线末局面：　${partsTxt(AI.scoreParts(jEnd, me))}`);
      }
    }
    console.log(lines.join('\n'));
    detail.push(lines.join('\n'));
    rows.push({ round: t.round, from: t.from, S0: BF.cloneState(S0), played: pMain, real, depth: rec.depth, why: rec.why, v: myV, swing, deep: { best: Jd.best, v: Jd.v, played: Jd.played }, wide: { best: Jw.best, v: Jw.v, played: Jw.played }, mate1: m1, bad, flag, cause: why });
  }
  const nb = rows.filter(r => r.bad).length;
  out.push(`## 结论`);
  out.push(`- 共 ${rows.length} 步，裁判认为走错 ${nb} 步：` + (Object.entries(tally).map(([k, v]) => `${k} ${v}`).join('、') || '无'));
  const sw = rows.filter(r => r.swing != null && r.swing <= -2);
  if (sw.length) out.push(`- 它没料到的地方（自己的分一步掉 2 分以上）：` + sw.map(r => `第 ${r.round} 回合 −${(-r.swing).toFixed(1)}`).join('、'));
  const real = rows.filter(r => r.real);
  if (real.length) out.push(`- 当时的思考：平均 ${(real.reduce((s, r) => s + r.depth, 0) / real.length).toFixed(1)} 层；只算到 3 层以下的 ${real.filter(r => r.depth <= 3).length} 步`);
  out.push('', '## 逐步（⚠ 走错　✎ Ham 标记　⤵ 没料到）', '```', ...detail, '```');
  if (opt.md) fs.writeFileSync(opt.md, out.join('\n') + '\n');
  console.log('\n' + out.slice(0, out.indexOf('## 逐步（⚠ 走错　✎ Ham 标记　⤵ 没料到）')).join('\n'));
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ file: path.basename(opt.file), ver: data.ver, commit, side, level, rows }, null, 1));
})().catch(e => { console.error(e.stack || e); process.exit(1); });
