// 技能模式电脑「总闸」：一条命令跑完所有闸门，给出 合格 / 不合格 / 只测基准
// 用法：node tools/bfai_gate.js [--ai src/bfai.js] [--prev git:提交号] [--quick] [--games 16] [--jobs 4]
//   闸门（门槛写在 tools/bfai_gate.json，null = 还没定、只量基准）：
//     1. 考题自检：考卷本身摆得对（--lint）
//     2. 考卷：校尉档、霸王档的总分和每一类的分
//     3. 漏着率：校尉档自对弈，霸王档复核（--quick 跳过，最慢的一项）
//     4. 不退步：和上一版对打，换边、序贯检验（给了 --prev 才跑）
//     5. 人工认可：用户亲自下过、认可了这一版（记在 bfai_gate.json 的 humanSignoff 里）
//   有“按节点数收手”之后，门槛里可以写 nodes，考卷 / 对打 / 漏着率都按节点数跑，结果就能在不同机器上复现。
'use strict';
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const argv = process.argv.slice(2);
const opt = { ai: 'src/bfai.js', prev: null, quick: false, games: 16, jobs: require('os').cpus().length };
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = () => argv[++i];
  if (k === '--ai') opt.ai = v(); else if (k === '--prev') opt.prev = v(); else if (k === '--quick') opt.quick = true;
  else if (k === '--games') opt.games = +v(); else if (k === '--jobs') opt.jobs = +v(); else throw new Error('未知参数 ' + k);
}
const ROOT = path.join(__dirname, '..');
const CONF_FILE = path.join(__dirname, 'bfai_gate.json');
const conf = JSON.parse(fs.readFileSync(CONF_FILE, 'utf8'));

// 跑一个子脚本，返回它的全部输出（同时原样打印，方便看过程）
function run(args, label) {
  return new Promise(resolve => {
    console.log(`\n▶ ${label}：node ${args.join(' ')}`);
    const c = spawn(process.execPath, args, { cwd: ROOT });
    let out = '';
    c.stdout.on('data', d => { out += d; process.stdout.write(d); });
    c.stderr.on('data', d => { out += d; });
    c.on('close', code => resolve({ code, out }));
  });
}
const num = (re, s) => { const m = re.exec(s); return m ? +m[1] : null; };
const rows = [];
const gate = (name, value, limit, ok, note = '') => rows.push({ name, value, limit, verdict: limit == null ? '基准' : ok ? '合格' : '不合格', note });

(async () => {
  const nodes = conf.nodes ? ['--nodes', String(conf.nodes)] : [];
  // 1. 考题自检
  const lint = await run(['tools/bfai_exam.js', '--lint'], '考题自检');
  gate('考题自检', lint.code === 0 ? '通过' : '有问题', '必须通过', lint.code === 0);

  // 2. 考卷（校尉、霸王）
  for (const [lv, runs] of [['mid', 3], ['hard', 1]]) {
    const r = await run(['tools/bfai_exam.js', opt.ai, '--level', lv, '--runs', String(runs), ...nodes], `考卷·${lv}`);
    const m = /总分（每题 \d+ 次）：\S+ (\d+)\/(\d+)/.exec(r.out);
    const pctv = m ? Math.round(100 * m[1] / m[2]) : null;
    const lim = conf.exam && conf.exam[lv];
    gate(`考卷 ${lv === 'mid' ? '校尉' : '霸王'}`, pctv == null ? '出错' : `${pctv}%（${m[1]}/${m[2]}）`, lim == null ? null : `≥ ${lim}%`, pctv != null && pctv >= lim);
    // 每一类的分，最低的那一类
    const cats = /分类得分：\s*\n\s*\S+：(.*)/.exec(r.out);
    if (cats) {
      const worst = cats[1].trim().split(/\s{2,}/).map(x => { const mm = /(\S+) (\d+)\/(\d+)/.exec(x); return mm ? { c: mm[1], p: Math.round(100 * mm[2] / mm[3]) } : null; }).filter(Boolean).sort((a, b) => a.p - b.p)[0];
      const lc = conf.exam && conf.exam.minCategory;
      if (worst) gate(`  ${lv === 'mid' ? '校尉' : '霸王'}最弱一类`, `${worst.c} ${worst.p}%`, lc == null ? null : `≥ ${lc}%`, worst.p >= lc);
    }
  }

  // 3. 漏着率
  if (!opt.quick) {
    const args = ['tools/bfai_quality.js', '--ai', opt.ai, '--games', String(opt.games), '--jobs', String(opt.jobs)];
    if (conf.nodes) args.push('--nodes', String(conf.nodes), '--ref-nodes', String(conf.nodes * (conf.quality && conf.quality.refFactor || 5)));
    const r = await run(args, '漏着率');
    const bl = num(/漏着（≥4 分）([\d.]+)/, r.out), mates = (num(/看到杀没走 (\d+) 次/, r.out) || 0) + (num(/走了送杀 (\d+) 次/, r.out) || 0), drop = num(/白丢子（≥3）([\d.]+)/, r.out);
    const q = conf.quality || {};
    gate('漏着（每 100 步）', bl, q.blundersPer100 == null ? null : `≤ ${q.blundersPer100}`, bl != null && bl <= q.blundersPer100);
    gate('漏杀 + 送杀（次）', mates, q.mateErrors == null ? null : `≤ ${q.mateErrors}`, mates <= q.mateErrors);
    gate('白丢子（第二裁判，每 100 步）', drop, q.dropsPer100 == null ? null : `≤ ${q.dropsPer100}`, drop != null && drop <= q.dropsPer100);
  }

  // 4. 不退步
  if (opt.prev) {
    const sprt = (conf.match && conf.match.sprt) || [-30, 10];
    const r = await run(['tools/bfsim.js', '--match', `${opt.ai},${opt.prev}`, '--games', String((conf.match && conf.match.maxGames) || 600), '--sprt', sprt.join(','), '--jobs', String(opt.jobs), ...nodes], '不退步');
    const verdict = /→ (通过|不通过|还没有结论)/.exec(r.out), elo = /Elo 差 (\S+)（95% 区间 (\S+) ～ (\S+)）/.exec(r.out);
    gate(`对上一版（${opt.prev}）`, elo ? `Elo ${elo[1]}（${elo[2]}～${elo[3]}）` : '出错', `序贯检验 ${sprt.join(' 对 ')} 通过`, !!verdict && verdict[1] === '通过', verdict ? verdict[1] : '');
  }

  // 5. 人工认可
  const hs = conf.humanSignoff;
  gate('人工认可', hs ? `${hs.by || '用户'} ${hs.date || ''} 认可 ${hs.version || ''}` : '还没有', '用户亲自下过并认可', !!hs, hs ? '' : '下几局，觉得没有一眼能看出的蠢棋，就在 bfai_gate.json 的 humanSignoff 里记一笔');

  console.log('\n========== 总闸 ==========');
  for (const r of rows) console.log(`${r.verdict === '合格' ? '✓' : r.verdict === '不合格' ? '✗' : '·'} ${r.name.padEnd(16)} ${String(r.value).padEnd(26)} ${r.limit == null ? '（门槛未定，只量基准）' : '门槛 ' + r.limit}${r.note ? '  ' + r.note : ''}`);
  const fail = rows.filter(r => r.verdict === '不合格').length, open = rows.filter(r => r.verdict === '基准').length;
  console.log(fail ? `\n不合格：${fail} 项` : open ? `\n没有不合格的项，但有 ${open} 项门槛还没定（只量了基准）` : '\n全部合格');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
