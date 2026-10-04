// 技能模式电脑在真实页面里的每步耗时（网页按时间收手，和测试的按节点数收手不同）
// 用法：node tools/bfpage_timing.js [--ai src/bfai.js | git:提交号] [--level mid|hard] [--side b|r] [--games 1] [--max-moves 80]
//                                    [--throttle N] [--seed 1] [--json 文件]
//   做法：用指定那一版电脑临时打包一份页面（不动仓库里的 dist），无头浏览器打开 #bfai-<档>-<玩家方>，
//   电脑照常在 Web Worker 里算；“玩家”那方由页面里的同一套电脑（主线程、校尉档 2 万节点）代下，走法经 doBF 执行，和真人点棋一样走界面流程。
//   记录：电脑每步思考的毫秒（Worker 自己报的 think.last.ms）、节点、算到几层；有没有退回主线程；页面报错；电脑行动被判非法。
//   --side b：玩家执楚、电脑执汉（会碰上“提防破釜”的那段搜索）；--side r：电脑执楚（会走“先升级再破釜”）。
//   --throttle N：用浏览器的 CPU 降速模拟慢手机（只保证主线程降速；Worker 是否降速取决于浏览器版本，结果里会注明）。
//   注意：机器忙的时候墙钟偏慢，同时看 nodes / depth。
'use strict';
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const opt = { ai: 'src/bfai.js', level: 'mid', side: 'b', games: 1, maxMoves: 80, throttle: 1, seed: 1, json: null };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--ai') opt.ai = v(); else if (k === '--level') opt.level = v(); else if (k === '--side') opt.side = v();
  else if (k === '--games') opt.games = +v(); else if (k === '--max-moves') opt.maxMoves = +v(); else if (k === '--throttle') opt.throttle = +v();
  else if (k === '--seed') opt.seed = +v(); else if (k === '--json') opt.json = v(); else throw new Error('未知参数 ' + k);
}
const ROOT = path.join(__dirname, '..');

// 1. 临时打包：build.js 按自己所在目录找文件，所以在临时目录里放一份，src 里只把 bfai.js 换掉
function buildPage(spec) {
  const code = spec.startsWith('git:')
    ? execFileSync('git', ['show', spec.slice(4) + ':source/src/bfai.js'], { cwd: ROOT, encoding: 'utf8' })
    : fs.readFileSync(path.resolve(ROOT, spec), 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bfpage-'));
  for (const n of ['node_modules', 'voice', 'sfx', 'fonts']) fs.symlinkSync(path.join(ROOT, n), path.join(dir, n));
  if (!fs.existsSync(path.join(ROOT, 'node_modules/three'))) throw new Error('缺 node_modules：先在 source/ 下跑 npm ci --omit=dev');
  fs.copyFileSync(path.join(ROOT, 'build.js'), path.join(dir, 'build.js'));
  fs.mkdirSync(path.join(dir, 'src'));
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) if (f !== 'bfai.js') fs.symlinkSync(path.join(ROOT, 'src', f), path.join(dir, 'src', f));
  fs.writeFileSync(path.join(dir, 'src/bfai.js'), code);
  execFileSync(process.execPath, ['build.js'], { cwd: dir, stdio: 'ignore' });
  return path.join(dir, 'dist/site/index.html');
}

const pw = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();

const INIT = `
localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-quality', JSON.stringify('low'));
window.__bfStats = []; window.__bfLog = [];
const _W = window.Worker;
window.Worker = function (url, o) {
  const w = new _W(url, o);
  w.addEventListener('message', e => { const d = e.data; if (d && d.stat) window.__bfStats.push({ ms: d.stat.ms, nodes: d.stat.nodes, depth: d.stat.depth, n: d.stat.n, seq: d.seq }); if (d && d.err) window.__bfLog.push('worker err ' + d.err); });
  return w;
};
`;

async function playGame(browser, url, gi) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 320 } });
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(120000);
  await pg.addInitScript(INIT);
  const logs = [];
  pg.on('pageerror', e => logs.push('pageerror ' + e));
  pg.on('console', m => { const t = m.text(); if (m.type() === 'error' || /电脑线程出错|电脑行动非法|非法/.test(t)) logs.push(m.type() + ' ' + t); });
  if (opt.throttle > 1) { const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: opt.throttle }); }
  await pg.goto(url + `#bfai-${opt.level}-${opt.side}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction('!!window.__xq && window.__xq.started', null, { timeout: 60000 });
  await pg.evaluate(`window.__xq.Fx.level='low'; window.__xq.Core.Time.boost=6; BFAI.LEVELS.mid = { ...BFAI.LEVELS.mid, nodes: 20000 }; Math.random = (s => () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; })(${opt.seed + gi * 7919});`);
  const human = opt.side;
  const t0 = Date.now();
  let moves = 0, stuck = 0, last = -1;
  while (moves < opt.maxMoves) {
    const st = await pg.evaluate(`(()=>{const x=window.__xq,g=x.game;return {res:g.result?1:0,turn:g.turn,busy:x.busy,th:x.aiThinking,h:g.history.length};})()`);
    if (st.res) break;
    if (st.h !== last) { last = st.h; stuck = Date.now(); }
    if (Date.now() - stuck > 90000) { logs.push('卡住：90 秒没有新的一步'); break; }
    if (st.turn === human && !st.busy && !st.th) {
      // 玩家那方：页面里的电脑代下（主线程），每个行动经 doBF 走界面流程
      const ok = await pg.evaluate(`(async()=>{const x=window.__xq,g=x.game;
        if (g.mustPass && g.mustPass()) return x.doBF({k:'pass'}) ? 1 : 0;
        const seq = await BFAI.think(BF.cloneState(g.S), 'mid');
        for (const a of seq) { while (x.busy) await new Promise(r=>setTimeout(r,50)); if (!x.doBF(a)) return 0; }
        return 1;})()`);
      if (!ok) { logs.push('玩家方（代下）行动非法'); break; }
      moves++;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  const out = await pg.evaluate(`(()=>{const g=window.__xq.game;return {stats:window.__bfStats, wlog:window.__bfLog, result:g.result, round:g.round, plies:g.history.length};})()`);
  await ctx.close();
  return { ...out, logs, secs: Math.round((Date.now() - t0) / 1000) };
}

(async () => {
  const url = 'file://' + buildPage(opt.ai);
  const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const games = [];
  for (let gi = 0; gi < opt.games; gi++) { games.push(await playGame(browser, url, gi)); process.stderr.write(`第 ${gi + 1} 局完 ${games[gi].secs}s\n`); }
  await browser.close();
  const all = games.flatMap(g => g.stats), ms = all.map(s => s.ms).sort((a, b) => a - b);
  const q = p => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : 0);
  const compound = all.filter(s => s.seq && s.seq.length > 1).map(s => s.seq.map(a => a.k).join('+'));
  const dd = {}; for (const s of all) dd[s.depth] = (dd[s.depth] || 0) + 1;
  console.log(`== 页面实测：${opt.ai} | ${opt.level} 档 | 电脑执${opt.side === 'b' ? '汉' : '楚'} | ${games.length} 局 | CPU 降速 ×${opt.throttle}${opt.throttle > 1 ? '（Worker 未必降速）' : ''} | 机器负载 ${os.loadavg()[0].toFixed(1)}（${os.cpus().length} 核）==`);
  console.log(`电脑思考 ${ms.length} 步：平均 ${ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0} ms，中位 ${Math.round(q(0.5))}，P90 ${Math.round(q(0.9))}，最长 ${Math.round(ms[ms.length - 1] || 0)}；超过 3 秒 ${ms.filter(x => x > 3000).length} 步，超过 5 秒 ${ms.filter(x => x > 5000).length} 步`);
  console.log(`节点 平均 ${all.length ? Math.round(all.reduce((a, s) => a + s.nodes, 0) / all.length) : 0}；算到几层 ${JSON.stringify(dd)}；组合行动 ${compound.length} 次 ${JSON.stringify([...new Set(compound)])}`);
  for (const [i, g] of games.entries()) console.log(`第 ${i + 1} 局：${g.result ? (g.result.winner === 'r' ? '汉胜' : g.result.winner === 'b' ? '楚胜' : '和') + '（' + (g.result.reason || '') + '）' : '没下完'}，${g.plies} 手，第 ${g.round} 回合，${g.secs}s` + (g.logs.length || g.wlog.length ? `；问题：${[...g.wlog, ...g.logs].slice(0, 5).join(' | ')}` : '；无报错'));
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ opt, games }, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
