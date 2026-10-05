// 在 GitHub 的免费机器上分段跑 bfsim（用户 2026-10-04 同意“借 GitHub 的免费机器跑”）。
//   由 .github/workflows/bfsim.yml 调用：往分支 claude/gallant-planck-rwr5az 推一个请求文件就开跑，
//   一组拆成多段（默认 20 段，每台机器 4 核）同时跑，跑完合并，结果由机器人提交回同一个分支。
//   每局用自己的种子、按节点数收手，分段跑再合并和一次跑完逐局相同（见 bfsim --merge）；按时间收手的不要这样跑。
//
// 请求文件：source/tools/simjobs/<名字>.json（改了内容再推一次就重跑）
//   { "args": "--games 300 --seed 1000 --nodes mid=60000 --ai git:98dd206 --set beishui.on=true",
//     "env": { "BFSIM_ENGINE": "tools/variants/engine_at.js", "ENGINE_REV": "98dd206" },
//     "chunks": 20, "note": "这组是干什么的" }
//   args 按空格切开（不支持引号）；--jobs / --json / --quiet 由这里管，不用写；对打（--match）暂不支持。
// 结果：source/tools/simresults/<名字>.txt（汇总，和本机 bfsim 的输出一样）+ <名字>.json.gz（逐局，gzip 过的 --json）
//
// node tools/ci_sim.js plan <推送前的提交> <推送后的提交>   → 打印 GitHub 输出：matrix / any
// node tools/ci_sim.js run <请求文件> <第几段>               → out/<名字>-<段>.json
// node tools/ci_sim.js collect <各段所在目录>                 → 合并、写结果（目录可用环境变量 CI_SIM_RES 改，本机试用）
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
const { execFileSync, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');   // source/
const REPO = path.join(ROOT, '..');
const RES = process.env.CI_SIM_RES || path.join(ROOT, 'tools/simresults');
const nameOf = f => path.basename(f, '.json');
const load = f => JSON.parse(fs.readFileSync(path.resolve(REPO, f), 'utf8'));
const opt = (a, k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const drop = (a, ks) => a.filter((x, i) => !ks.includes(x) && !(i > 0 && ks.includes(a[i - 1]) && a[i - 1] !== '--quiet'));
const chunksOf = j => Math.max(1, Math.min(60, j.chunks || 20));
const range = (j, c) => { const a = j.args.trim().split(/\s+/), g = +opt(a, '--games', 200), n = chunksOf(j); return { lo: Math.floor(c * g / n), hi: Math.floor((c + 1) * g / n), seed: +opt(a, '--seed', 1) }; };

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'plan') {
  const [before, after] = rest;
  const spec = before && !/^0+$/.test(before) ? `${before}..${after}` : `${after}~1..${after}`;
  let files = [];
  try { files = execFileSync('git', ['diff', '--name-only', '--diff-filter=AM', spec, '--', 'source/tools/simjobs/'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(f => f.endsWith('.json')); } catch (e) { console.error(e.message); }
  const include = [];
  for (const f of files) { const j = load(f); if (/--match/.test(j.args)) throw new Error(f + '：对打暂不支持'); if (/--seedlist|--stop-after-revive/.test(j.args)) throw new Error(f + '：--seedlist / --stop-after-revive 是本机探针用的，GitHub 分段会把整串种子发给每一段（种子重复、合并失败），请改用 --seed + --games'); for (let c = 0; c < chunksOf(j); c++) if (range(j, c).hi > range(j, c).lo) include.push({ req: f, name: nameOf(f), chunk: c }); }
  console.log('matrix=' + JSON.stringify({ include }));
  console.log('any=' + (include.length ? 'true' : 'false'));
  console.error(`请求 ${files.length} 个：${files.join(' ')}；共 ${include.length} 段`);
} else if (cmd === 'run') {
  const [req, cs] = rest, j = load(req), c = +cs, { lo, hi, seed } = range(j, c);
  const out = path.join(REPO, 'out', `${nameOf(req)}-${c}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const args = [...drop(j.args.trim().split(/\s+/), ['--games', '--seed', '--jobs', '--json', '--quiet']), '--seed', String(seed + lo), '--games', String(hi - lo), '--jobs', String(os.cpus().length), '--quiet', '--json', out];
  console.log(`第 ${c + 1}/${chunksOf(j)} 段：种子 ${seed + lo}～${seed + hi - 1}（${hi - lo} 局），${os.cpus().length} 核\nnode tools/bfsim.js ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/bfsim.js'), ...args], { cwd: ROOT, env: { ...process.env, ...(j.env || {}) }, stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
} else if (cmd === 'collect') {
  const dir = path.resolve(rest[0]), by = {};   // 绝对路径：bfsim 在 source/ 下运行
  let bad = 0;
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) { const m = f.match(/^(.*)-(\d+)\.json$/); if (m) (by[m[1]] = by[m[1]] || []).push(path.join(dir, f)); }
  fs.mkdirSync(RES, { recursive: true });
  for (const [name, files] of Object.entries(by)) {
    const reqF = `source/tools/simjobs/${name}.json`, j = fs.existsSync(path.join(REPO, reqF)) ? load(reqF) : null;
    const want = j ? [...Array(chunksOf(j)).keys()].filter(c => range(j, c).hi > range(j, c).lo).length : files.length;
    const merged = path.join(os.tmpdir(), `ci_${name}_${process.pid}.json`);
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/bfsim.js'), '--merge', files.sort((a, b) => +a.match(/-(\d+)\.json$/)[1] - +b.match(/-(\d+)\.json$/)[1]).join(','), '--json', merged], { cwd: ROOT, encoding: 'utf8' });
    const head = `# ${name}（GitHub Actions${process.env.GITHUB_RUN_ID ? ' 运行 ' + process.env.GITHUB_RUN_ID : ''}）\n# 请求：${j ? JSON.stringify(j) : '（请求文件不在了）'}\n# 收到 ${files.length}/${want} 段${files.length < want ? '  ✗ 缺段，结果不完整（看那几段的日志）' : ''}\n`;
    fs.writeFileSync(path.join(RES, name + '.txt'), head + (r.stdout || '') + (r.status ? `\n✗ 合并失败：${r.stderr}` : ''));
    if (!r.status && fs.existsSync(merged)) fs.writeFileSync(path.join(RES, name + '.json.gz'), zlib.gzipSync(fs.readFileSync(merged)));
    console.log(head + (r.stdout || '').split('\n').slice(0, 3).join('\n') + (r.status ? '\n✗ 合并失败：' + r.stderr : ''));
    if (r.status || files.length < want) bad++;
  }
  if (bad) process.exit(1);   // 让这一步显示失败、不提交（修好后可以只重跑这一步）
} else {
  console.error('用法见文件开头'); process.exit(2);
}
