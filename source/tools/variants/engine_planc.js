// 规则变体引擎（只供模拟）：Plan C「相 / 象变强」（用户 2026-10-04 拍板单：让进攻方得先用远程 + 近战配合拆掉士象）。
//   在 git 上某一版的 src/bingfa.js 上按文字锚点改（环境变量 ENGINE_REV 指定提交，默认 98dd206 = chat 的背水正式版）。
//   新开关默认全关：一个都不开时和那一版引擎完全一样（test_planc.js 核对过：一批局面上 expand / gen / evaluate / pofuPairs / 界面候选逐项相同，bfsim 6 局逐局相同）。
//   电脑不用改：bfai 只通过 BF.attempt / BF.ai.* 看规则，--ai git:98dd206 直接配这个引擎用。
//   1. CFG.skills.qishe.dirs：汉相「齐射」往哪儿射。'diag'（默认，现行：斜线）| 'ortho'（横竖，代替斜线）| 'both'（横竖、斜线都行）。
//      用户：“相可以改成横竖远程两格远程攻击……齐射只能斜射会显得鸡肋”。射程、挡子和斜线一样：每个方向 1～range 格，
//      碰到的第一枚子是敌方非帅将就能射，碰到子（不管哪方）就挡住后面；不限河界（现行斜线也不限）。
//      伤害照旧是 qishe.damage（不看攻击力）。界面（skillTargets / skillWhy）、电脑（expand / gen）、结算（resolve）都走 arrowTargets()，一处改全改。
//   2. CFG.skills.jianta.onMove：楚象「践踏」走到空格也踩（用户：“象的践踏改成踏空格也能对周围造成伤害”）。
//      象走到空格的每一种走法都算：普通走子、飞越、背水一战 / 破釜沉舟里的每一步。和攻击后的践踏同一套：落点周围一圈（ring8）的敌方非帅将子
//      各扣 splashDamage（不看攻击力），残血的直接踩死，不伤己方；周围没有踩得到的敌子就不算踩（不出事件、不占冷却）。
//      踩死的子算背水一战的“最多吃一个子”（用户：“践踏踩死也算”）。
//   3. CFG.skills.jianta.moveCooldown：踩空格的冷却（用户的第二种：“踩空格那种每 2 回合一次，攻击、吃子后照旧随时触发”）。
//      0 = 不限；N = 同一头象踩过一次空格，己方接下来 N - 1 次行动里它踩空格都不触发（每 N 回合最多一次；同一回合背水连走两步也只踩一次）。
//      攻击、吃子后的践踏不看这个冷却、也不占它。记在象的主技能冷却位（cdKey(象, 'jianta') = 'cd'），和引擎别的冷却一样按 S.cnt 记“到第几次行动才能再踩”。
//   连带改动（都只在 onMove 开着时生效）：
//      · 电脑的静态搜索（gen 只要打到敌子的）把“走到空格、践踏踩得到敌子”的一步（普通走子、飞越）也算作打到敌子；
//      · 背水 / 破釜组合（pofuPairs，和老写法 pofuPairsRef 同样改）筛“两步里至少一步打到敌子”时，这种一步也算打到；
//      · 界面的背水第二步候选 / 预览（pofuSecond / pofuPreview）和老写法 pofuPairsRef 的第一步照 resolve() 原样结算（含践踏、被动走法的冷却），
//        这样第一步踩死了子、让开了路，第二步的候选也跟着变（底版只走 strike，践踏踩死的子还当它在）；快慢两种写法逐项相同（自测核对）。
// 用法（在 source/ 下）：
//   BFSIM_ENGINE=tools/variants/engine_planc.js node tools/bfsim.js --ai git:98dd206 --nodes mid=60000 --set beishui.on=true --set beishui.twoPieces=false \
//     --set skills.qishe.level=3 --set skills.jianta.level=3 --set skills.qishe.dirs=ortho --set skills.jianta.onMove=true --set skills.jianta.moveCooldown=2 …
//   （dirs 的值不用加引号：bfsim 的 --set 解析不了 JSON 时按字符串用）。自测：node tools/variants/test_planc.js
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let built = null;
function enginePath() {
  if (built) return built;
  const rev = process.env.ENGINE_REV || '98dd206';
  let s = execFileSync('git', ['show', rev + ':source/src/bingfa.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  // 锚点必须正好出现 n 次（默认 1 次），否则报错：底版引擎改过了，别悄悄套错地方
  const rep = (a, b, n = 1) => { const k = s.split(a).length - 1; if (k !== n) throw new Error(`engine_planc：锚点出现 ${k} 次、应为 ${n} 次（${rev} 的引擎改过了？）：${a.slice(0, 80)}`); s = s.split(a).join(b); };
  // ---- 配置：新开关，默认全关 ----
  rep("      qishe: { level: 4, cooldown: 3, range: 2, damage: 1 }, // 汉相四级",
      "      qishe: { level: 4, cooldown: 3, range: 2, damage: 1, dirs: 'diag' }, // 汉相四级；变体·Plan C dirs：'diag' 斜线（现行）| 'ortho' 横竖 | 'both' 横竖、斜线都行");
  rep("ring8: true }, // 楚象四级被动：攻击 / 吃子后踩那一格周围一圈，各扣 1 点（残血的直接踩死），走空格不踩，无冷却",
      "ring8: true, onMove: false, moveCooldown: 0 }, // 楚象四级被动：攻击 / 吃子后踩那一格周围一圈，各扣 1 点（残血的直接踩死），走空格不踩，无冷却；" +
      "变体·Plan C：onMove = 走到空格也踩（周围有踩得到的敌子才踩），moveCooldown = N 时踩空格每 N 回合最多一次（0 = 不限；攻击、吃子后照旧随时踩）");
  // ---- 技能说明（界面用）：跟着开关说 ----
  rep("    qishe: '不动身，射斜线 1～2 格内的一个敌子，扣 1 点。',",
      "    get qishe() { const d = CFG.skills.qishe.dirs; return `不动身，射${d === 'ortho' ? '横竖' : d === 'both' ? '横竖或斜线' : '斜线'} 1～2 格内的一个敌子，扣 1 点。`; },   // 变体·Plan C");
  rep("    jianta: '攻击或吃掉敌子后就地跺脚：那一格周围一圈（含斜向）的敌子各扣 1 点，只剩 1 血的直接踩死。走到空格不触发。',",
      "    get jianta() {   // 变体·Plan C\n" +
      "      const J = CFG.skills.jianta;\n" +
      "      if (!J.onMove) return '攻击或吃掉敌子后就地跺脚：那一格周围一圈（含斜向）的敌子各扣 1 点，只剩 1 血的直接踩死。走到空格不触发。';\n" +
      "      return '攻击、吃掉敌子或者走到空格后就地跺脚：那一格周围一圈（含斜向）的敌子各扣 1 点，只剩 1 血的直接踩死。' + (J.moveCooldown > 0 ? `走到空格踩，每 ${J.moveCooldown} 回合最多一次（攻击、吃子后随时踩）。` : '');\n" +
      "    },");
  // ---- 践踏：走到空格也踩 ----
  rep("  // 楚战象被动「践踏」：三级战象落子（走到空格或吃掉）后溅伤四周\n  function trample(S, P, to, res, side, ev) {",
`  // 变体·Plan C：象 P 走到空格 c，践踏会不会触发：onMove 开着、踩空格的冷却好了、落点周围有踩得到的敌子（和 splash() 里扣血的条件一样）
  //   周围只看敌方，所以 P 已经走到 c 还是还在原位都一样
  const jtMoveOk = (S, P, c, side) => {
    const J = CFG_CUR.skills.jianta;
    if (!J.onMove || !cdReady(S, P, 'jianta')) return false;
    for (const [df, dr] of (J.ring8 ? RING8 : ORTHO)) { const q = at(S, c[0] + df, c[1] + dr); if (q && q.s !== side && q.t !== 'k' && q.lv >= J.splashMinLevel) return true; }
    return false;
  };
  // 变体·Plan C：这一步（m：from → to，走之前的局面）是不是“走到空格、践踏踩得到敌子”——电脑筛候选用，只看不改；判断和 trample() 完全一样
  const jtStep = (S, m) => {
    if (!CFG_CUR.skills.jianta.onMove) return false;
    const P = at(S, m.from[0], m.from[1]);
    if (!P || at(S, m.to[0], m.to[1]) || SKILL_OF(P.t, P.s) !== 'jianta' || P.lv < skLevel('jianta') || (P.s === 'b' && smActive(S))) return false;
    return jtMoveOk(S, P, m.to, P.s);
  };
  // 楚战象被动「践踏」：三级战象落子（走到空格或吃掉）后溅伤四周
  function trample(S, P, to, res, side, ev) {`);
  rep("    // 落子处得有敌子（打伤或吃掉了它）才踩；走到空格不踩\n    if (res !== 'kill' && res !== 'hit') return;",
`    // 变体·Plan C（onMove）：走到空格也踩（周围有踩得到的敌子才算踩）；moveCooldown = N：踩过一次空格，这头象己方接下来 N - 1 次行动里踩空格不触发
    //   （攻击、吃子后的践踏不看、也不占这个冷却）。splash 事件标上 mv = 1：这一下是踩空格
    if (res === 'move' && jtMoveOk(S, P, c, side)) {
      const J = CFG_CUR.skills.jianta;
      if (J.moveCooldown > 0) P[cdKey(P, 'jianta')] = S.cnt[P.s] + J.moveCooldown;
      const i = ev.length; splash(S, c, side, ev, 'jianta', P); ev[i].mv = 1;
      return;
    }
    // 落子处得有敌子（打伤或吃掉了它）才踩；走到空格不踩
    if (res !== 'kill' && res !== 'hit') return;`);
  // ---- 齐射：方向按 dirs ----
  rep("    for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {\n      for (let k = 1; k <= CFG_CUR.skills.qishe.range; k++) {",
`    // 变体·Plan C：dirs = 'diag' 斜线（现行，方向顺序也不变）| 'ortho' 横竖 | 'both' 都行；挡子、目标规则不变
    const D = CFG_CUR.skills.qishe.dirs || 'diag', DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    if (D !== 'diag' && D !== 'ortho' && D !== 'both') throw new Error('skills.qishe.dirs 只能是 diag / ortho / both，现在是 ' + JSON.stringify(D));
    for (const [df, dr] of (D === 'ortho' ? ORTHO : D === 'both' ? DIAG.concat(ORTHO) : DIAG)) {
      for (let k = 1; k <= CFG_CUR.skills.qishe.range; k++) {`);
  // ---- 背水 / 破釜的一步照 resolve() 原样结算（界面预览、第二步候选、老写法用；onMove 开着才用，不开时照旧只走 strike） ----
  rep("  const findMove = (S, from, to) => moveTargets(S, from[0], from[1]).find(m => m.to[0] === to[0] && m.to[1] === to[1]) || null;\n",
`  const findMove = (S, from, to) => moveTargets(S, from[0], from[1]).find(m => m.to[0] === to[0] && m.to[1] === to[1]) || null;
  // 变体·Plan C：背水 / 破釜的一步照 resolve() 里那一段原样结算（走子、被动走法记冷却、践踏），返回 strike 的结果
  function stepFull(T, m, side, ev) {
    const p = at(T, m.from[0], m.from[1]), mm = findMove(T, m.from, m.to);
    const res = strike(T, m.from, m.to, side, ev);
    if (mm && mm.via) { setCd(T, p, mm.via); ev.push({ e: 'passive', sk: mm.via, id: p.id }); }
    trample(T, p, m.to, res, side, ev);
    return res;
  }
`);
  // ---- 电脑的静态搜索：踩空格踩得到敌子的一步也算打到敌子 ----
  rep("      for (const m of moveTargets(S, f, r)) { const q = b[m.to[1]][m.to[0]]; if (capsOnly && !q) continue; out.push({ a: { k: 'mv', from: m.from, to: m.to }, p, q: q || null }); }",
      "      for (const m of moveTargets(S, f, r)) { const q = b[m.to[1]][m.to[0]]; if (capsOnly && !q && !jtStep(S, m)) continue; out.push({ a: { k: 'mv', from: m.from, to: m.to }, p, q: q || null }); }   // 变体·Plan C：踩空格踩得到敌子也算打到");
  rep("        if (tg) for (const m of tg) { const q = b[m.to[1]][m.to[0]]; if (capsOnly && !(q && q.s !== side)) continue; out.push({ a: mk(m.to), p, q: q && q.s !== side ? q : null, sk }); }",
      "        if (tg) for (const m of tg) { const q = b[m.to[1]][m.to[0]]; if (capsOnly && !(q && q.s !== side) && !(sk === 'feiyue' && jtStep(S, m))) continue; out.push({ a: mk(m.to), p, q: q && q.s !== side ? q : null, sk }); }   // 变体·Plan C：飞越踩空格同上");
  // ---- 背水 / 破釜组合：快的写法和老写法同样改 ----
  rep("        const t1 = at(S, m1.to[0], m1.to[1]), hit1 = !!t1;",
      "        const t1 = at(S, m1.to[0], m1.to[1]), hit1 = !!t1 || jtStep(S, m1);   // 变体·Plan C：踩空格踩得到敌子也算打到", 2);
  rep("            if (!hit1 && !t2 && !bsDef) continue;",
      "            if (!hit1 && !t2 && !bsDef && !jtStep(T, m2)) continue;   // 变体·Plan C：同上");
  rep("        strike(T, m1.from, m1.to, 'b', ev);\n        if (!T.final && inCheck(T.board, 'b') && !BSon()) continue;",
      "        if (CFG_CUR.skills.jianta.onMove) stepFull(T, m1, 'b', ev); else strike(T, m1.from, m1.to, 'b', ev);   // 变体·Plan C：第一步照 resolve() 原样结算，第二步的候选才和快的写法一样\n" +
      "        if (!T.final && inCheck(T.board, 'b') && !BSon()) continue;");
  rep("            if (!hit1 && !t2 && !(BSon() && inCheckF(S, 'b'))) continue;",
      "            if (!hit1 && !t2 && !(BSon() && inCheckF(S, 'b')) && !jtStep(T, m2)) continue;   // 变体·Plan C：同上");
  // ---- 界面：背水第二步候选、第一步预览 ----
  rep("    if (!at(T, m1.from[0], m1.from[1])) return [];\n    strike(T, m1.from, m1.to, 'b', ev);",
      "    if (!at(T, m1.from[0], m1.from[1])) return [];\n    if (CFG_CUR.skills.jianta.onMove) stepFull(T, m1, 'b', ev); else strike(T, m1.from, m1.to, 'b', ev);   // 变体·Plan C：第一步踩死的子不再挡路");
  rep("    strike(T, m1.from, m1.to, 'b', ev);\n    return { S: T, ev };",
      "    if (CFG_CUR.skills.jianta.onMove) stepFull(T, m1, 'b', ev); else strike(T, m1.from, m1.to, 'b', ev);   // 变体·Plan C：预览里也踩\n    return { S: T, ev };");
  const file = path.join(os.tmpdir(), `bingfa_planc_${rev.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
  fs.writeFileSync(file, s);
  process.on('exit', () => { try { fs.unlinkSync(file); } catch (e) { } });   // 临时文件只给本进程用（require 之后就不再读），进程结束就删
  built = file;
  return file;
}
module.exports = { enginePath };
