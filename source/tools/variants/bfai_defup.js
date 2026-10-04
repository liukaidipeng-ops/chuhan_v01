// 电脑变体（只供模拟）：不压制士、相 / 象的电脑（用户 2026-10-04 拍板单同意跑）。
//   底版是 chat 的背水正式版电脑：从 git 取 source/src/bfai.js（默认 dev 98dd206，可用环境变量 BFAI_DEF_BASE 换），
//   按文字锚点改（每个锚点必须正好出现一次，否则报错：底版改过了就别悄悄套错地方），写到临时文件再加载。
//   为什么要它：测“让守子变强”的规则（象二级起攻击 2、Plan A 士三级攻击 3、士象反击、Plan C 齐射横竖 / 践踏踩空格……）时，
//   底版电脑自己就不爱升士象、估值也压着它们，规则改得再强，模拟里也显不出来。下面把这几处压制各做成一个开关。
//   不设任何开关时和底版电脑完全一样（test_defup.js 用 bfsim 逐局核对）。按节点数收手照常有效（nodeCap / L.nodes 都在底版里）。
//
// 开关（环境变量；设成 1 打开，不设、空串、0、false、off 都算关）。行号都指 98dd206 的 source/src/bfai.js：
//   BFAI_DEFUP=1   不压制士象升级：
//     · 候选升级 upgradeCands（第 346～361 行）：
//         - 底版只在正被捉、被将军（只算士）、“对方有两血进攻子逼近”（只算一级士）或者二级以上（升级解锁技能，见下一条）时才把士象列进候选，
//           其余一律跳过（第 353 行）→ 不跳过，和别的子一样排；
//         - 二级以上的士象（升三、四级会解锁技能）底版不进前三个名额，只另给一个额外名额（第 359 行）→ 也能进前三，额外名额照留
//           （给前三里没有的、静态分最高的那一个）。
//       被将军时相 / 象照样不算保命的升级（第 348 行没改）：DEFUP 打开后它们照样进候选，只是按普通升级排在保命的后面（给车攒军功时也和别的普通升级一样跳过）。为什么不改见下面“这一版没改”里第 348 行那条。
//     · 根节点挑着法 think（第 490～492 行）：给士象升级的走法，底版要比“不升”里最好的强 0.4 分才选 → 去掉，和别的子一样比。
//   BFAI_DGUARD=1  估值 score() 里“守方一下最多能砍掉几点血”（dR / dB，第 48～54 行）：底版只看帅将和士的攻击力；
//                  改成看帅将 + 己方站在九宫里或紧挨九宫（第 2～6 路、从己方底线数第 0～3 行）的所有子，取最大的攻击力。
//                  这个数决定“贴脸的进攻子砍不砍得死”（第 75～79 行的加分 KD）：二级攻击 2 的相 / 象、三级攻击 2 守在家门口的车马炮兵（Plan A）也算守方。
//                  和底版一样只看站位、不看那枚子打不打得到那一格。
//   BFAI_DEFVAL=1  估值里一枚子值多少（baseVal，第 34～40 行）：士、相 / 象底版按守子算（血量系数用 HPF_DEF、等级加分小一号：每级 0.03、三级 +0.4），
//                  对方有两血进攻子逼近时士另按 HPF_ADV 算。打开后，满足下面任一条的士象就和车马炮兵完全一样算（HPF、每级 0.06、三级 +0.9、四级 +0.9），
//                  HPF_ADV 那一支也不走：攻击力 ≥ 2（跟着 CFG.attack 走）；或者三级以上、而且至少有一个技能已经解锁。为什么这样定见下面 defStrong 的注释。
//                  注意现行规则下也有作用：二级以上的士（攻击 2）、三级以上的士象（三级就有护驾 / 飞越）都按进攻子算——
//                  满血三级象 3.48 → 5.55 分（比一级马的 4.2 还高），满血二级士 2.48 → 3.28。只想让会伤人的技能（齐射、践踏）算的话，改 defStrong 那一行。
//   模拟里“不压制士象的电脑”= 三个一起开：BFAI_DEFUP=1 BFAI_DGUARD=1 BFAI_DEFVAL=1。
//
// 用法（在 source/ 下）：
//   BFSIM_ENGINE=tools/variants/engine_at.js ENGINE_REV=98dd206 BFAI_DEFUP=1 BFAI_DGUARD=1 BFAI_DEFVAL=1 \
//     node tools/bfsim.js --ai tools/variants/bfai_defup.js --nodes mid=60000 --set beishui.on=true --set beishui.twoPieces=false --set attack.e=[1,2,2,2] …
//   GitHub（tools/ci_sim.js）：请求文件的 env 里写这三个开关和 BFSIM_ENGINE / ENGINE_REV，args 里写 --ai tools/variants/bfai_defup.js。
//   自测：node tools/variants/test_defup.js
//
// 底版电脑里还有几处按现行规则写死的假设，这一版没改，只记下来（行号同上）：
//   · 第 33 行 heavyAt：“一级士、帅砍不死的进攻子”写死成 hp ≥ 2（将帅攻击 2 / 9 时不对）。它只管士的估值（第 35 行）和一级士进不进候选（第 353 行），
//     三个开关都开时这两处都不起作用了（一级士两张表本来一样；跳过已经去掉）。
//   · 第 34～40 行：士象以外，子力只看血量和等级、不看攻击力（Plan A / B 三级攻击 2 在静态估值里不加分，搜索里照样算得到）。
//   · 第 70 行：士象只在决战里有位置分（象守河口、相横竖齐射的站位都不算分）。
//   · 第 129～133、150 行：静态搜索里 Plan C 的“踩空格”一步没有被打的子，按安静着法排在所有吃子后面，每层最多只试 6 步。
//   · 第 336～339、354 行：“给车攒军功”的窗口写死 3 点（车升级价 15/15/20 时意思变了）；第 83 行军功一律按 0.3 分一点折算。
//   · 第 348 行：被将军时相 / 象和兵都不算保命的升级（底版说相 / 象“砍不了人”；象二级攻击 2、Plan A / B 兵三级攻击 2 时，它们其实可能砍得死将军的子）；兵被捉也不救。
//     相 / 象这一半是故意不改的（早先的版本在 DEFUP 里改过，核查发现有害，已退回）：保命的升级排在最前，但连同别的一共只留静态分前三个；
//     被将军时两只相 / 象一起算成保命的，就可能把真正砍得到将军子的士挤出候选。例：象二级攻击 2、三个开关全开，汉帅被楚二级车贴脸将军，
//     九宫边上的一级相升二级静态分 2.69，比一级士升二级的 2.58 还高，前三就成了车、相、相，“升士 + 士吃车”这一手看不见，电脑算出来被将死
//     （test_defup.js 第 4 段 e）。只开 DEFUP 时，一级相升级的静态分也可能比士高（第 4 段 b2），再有车马炮要保命时士一样会被挤掉。
//   · 第 315～325 行 threatened：“正被捉”只看普通走子，齐射、霹雳、冲阵、踏营和践踏的溅射都不算（Plan C 三级横竖齐射、踩空格时漏得更多），
//     所以被这些技能盯上的子不会触发保命的升级。
//   · 第 406～414 行：召回良将不救士象兵（士象反击规则下一级的士象也有用）。
//   · 第 9 行：子力基数 VAL 里象 2.3、士 2.1 是按现行规则定的；士象反击这种一级就有的本事，估值里也没有。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const base = process.env.BFAI_DEF_BASE || '98dd206';
let s = execFileSync('git', ['show', base + ':source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
// 锚点必须正好出现一次；用 split / join 换（替换文字里有 $ 也不会被当成特殊写法）
const rep = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error(`bfai_defup：锚点出现 ${n} 次（${base} 的电脑改过了？）：${a.slice(0, 80)}`); s = s.split(a).join(b); };

// 0. 开关和两个小工具：放在底版读环境变量的那一行后面（A、CFG、BF 在那之前就有了）
rep("  const ENV = (typeof process !== 'undefined' && process.env) || {};\n",
  "  const ENV = (typeof process !== 'undefined' && process.env) || {};\n" +
  "  // ---- 变体·不压制士象（tools/variants/bfai_defup.js 加的，开关的说明见那个文件开头）：三个开关，默认全关 ----\n" +
  "  const swOn = k => !['', '0', 'false', 'off'].includes(String(ENV[k] == null ? '' : ENV[k]).trim().toLowerCase());\n" +
  "  const DEFUP = swOn('BFAI_DEFUP'), DGUARD = swOn('BFAI_DGUARD'), DEFVAL = swOn('BFAI_DEFVAL');\n" +
  "  // DGUARD：站在九宫里或紧挨九宫（第 2～6 路，从己方底线数第 0～3 行）\n" +
  "  const guardZone = (p, f, r) => f >= 2 && f <= 6 && (p.s === 'r' ? r : 9 - r) <= 3;\n" +
  "  // DEFVAL：士 / 相 / 象按进攻子算的条件（满足任一条）——\n" +
  "  //   1. 攻击力 ≥ 2（A.atk，跟着 CFG.attack 走）：砍得死两血的子，就不只是挡路的了。现行规则下是二级以上的士；\n" +
  "  //      --set attack.e=[1,2,2,2] 时加上二级以上的相 / 象；Plan A（attack.a=[1,2,3,3]、attack.e=[1,1,2,2]）是二级以上的士、三级以上的相 / 象。\n" +
  "  //   2. 三级以上、而且至少有一个技能已经解锁（解锁等级看 CFG.skills.<技能>.level，没写就是 CFG.skillLevel）。\n" +
  "  //      现行规则下三级的士有护驾、三级的相 / 象有飞越，所以三级以上的士象都算；Plan C 把齐射 / 践踏提到三级，结果一样。\n" +
  "  //      只看“有没有解锁的技能”、不分技能强弱（不给每个技能单独定价，改动最小）；“三级以上”照字面写上，有人把技能调到二级时二级的子也不算。\n" +
  "  //   都不满足的（一级的士象；攻击 1、又没有技能的二级相 / 象）照底版算。一级的子两张表本来就一样（1 血、没有等级加分），所以实际只影响二级以上。\n" +
  "  const skLv = sk => (CFG.skills[sk] && CFG.skills[sk].level) || CFG.skillLevel;\n" +
  "  const defStrong = p => A.atk(p) >= 2 || (p.lv >= 3 && BF.SKILLS_OF(p.t, p.s).some(sk => p.lv >= skLv(sk)));\n");

// 1. DEFVAL：baseVal 里能打的士象不走守子的两支（HPF_ADV、HPF_DEF）
rep("    if (p.t === 'a' && !p.j && heavy) return VAL.a * (HPF_ADV[",
  "    const strong = DEFVAL && (p.t === 'a' || p.t === 'e') && !p.j && defStrong(p);   // 变体·DEFVAL：能打的士象和进攻子一样算（下面两行守子的算法都不走）\n" +
  "    if (p.t === 'a' && !p.j && heavy && !strong) return VAL.a * (HPF_ADV[");
rep("    const def = (p.t === 'a' || p.t === 'e') && !p.j;\n",
  "    const def = (p.t === 'a' || p.t === 'e') && !p.j && !strong;\n");

// 2. DGUARD：score() 里守方一下最多砍掉几点血
rep("      if (p.t === 'k' || p.t === 'a') { const k = A.atk(p); if (p.s === 'r') { if (k > dR) dR = k; } else if (k > dB) dB = k; }\n",
  "      if (DGUARD ? p.t === 'k' || guardZone(p, f, r) : p.t === 'k' || p.t === 'a') { const k = A.atk(p); if (p.s === 'r') { if (k > dR) dR = k; } else if (k > dB) dB = k; }   // 变体·DGUARD：帅将 + 九宫里和紧挨九宫的所有子\n");

// 3. DEFUP：候选升级（第 348 行“被将军时相 / 象不算保命的升级”不改，见开头的说明）
rep("      if (defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2)) continue;\n",
  "      if (defender && !must && !unlock && !(p.t === 'a' && heavy && p.lv < 2) && !DEFUP) continue;   // 变体·DEFUP：士象不跳过，和别的子一样排\n");
rep("    const top = cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock);\n",
  "    const top = DEFUP ? cand.slice(0, 3) : cand.filter(c => !c.unlock).slice(0, 3), ex = cand.find(c => c.unlock && !top.includes(c));   // 变体·DEFUP：二级以上的士象也能进前三，额外名额照留\n");

// 4. DEFUP：根节点不再要求士象升级比“不升”强 0.4 分
rep("    for (const k of kids) { if (!k.up || fin0) continue; const t = S0.board[k.up.at[1]][k.up.at[0]].t; if ((t === 'a' || t === 'e') && k.v < plainBest + 0.4) k.w = k.v - 100; }\n",
  "    for (const k of kids) { if (!k.up || fin0 || DEFUP) continue; const t = S0.board[k.up.at[1]][k.up.at[0]].t; if ((t === 'a' || t === 'e') && k.v < plainBest + 0.4) k.w = k.v - 100; }   // 变体·DEFUP：和别的子一样比\n");

const file = path.join(os.tmpdir(), `bfai_defup_${base.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
fs.writeFileSync(file, s);
process.once('exit', () => { try { fs.unlinkSync(file); } catch (e) { } });   // 用完删掉临时文件
module.exports = require(file);
