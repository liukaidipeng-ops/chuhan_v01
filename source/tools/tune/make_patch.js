// 生成“换估值权重”补丁（给 TD）：把 src/bfai.js 的 score() 整个换成权重表版（tools/tune/score_w.js），think() 开始时清潜力缓存
//   node tools/tune/make_patch.js tools/tune/w_t3p.json [输出补丁，默认 tools/variants/bfai_tune.patch]
//   同时写出打好补丁的 bfai.js 到 /tmp/bfai_tuned_src.js（核对用）
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const wf = process.argv[2], out = process.argv[3] || path.join(ROOT, 'tools/variants/bfai_tune.patch');
const w = JSON.parse(fs.readFileSync(path.resolve(ROOT, wf), 'utf8')).w;
const src = fs.readFileSync(path.join(ROOT, 'src/bfai.js'), 'utf8');
const a = src.indexOf('  function score(S, me, P) {');
const endMark = "    if (fin && S.occ) { const u = 7 * ((S.occ[me] || 0) - (S.occ[other(me)] || 0)); v += u; if (P) P['决战'] += u; }\n    return v;\n  }\n";
const b = src.indexOf(endMark, a);
if (a < 0 || b < 0 || src.indexOf('  function score(S, me, P) {', a + 1) >= 0) throw new Error('找不到 score() 的头尾');
let s = src.slice(0, a) + require('./score_w.js').source(w).replace(/^  \/\/ ---------- 估值权重（/, '  // ---------- 估值权重（' + path.basename(wf) + '；') + src.slice(b + endMark.length);
const t = 'hist.clear(); killers.length = 0;';
if (s.split(t).length !== 2) throw new Error('找不到 think() 开头的清缓存');
s = s.replace(t, t + ' potC = null;');
fs.writeFileSync('/tmp/bfai_tuned_src.js', s);
const tmp = path.join(require('os').tmpdir(), 'bfai_tune_patch');
fs.mkdirSync(tmp + '/a/source/src', { recursive: true }); fs.mkdirSync(tmp + '/b/source/src', { recursive: true });
fs.writeFileSync(tmp + '/a/source/src/bfai.js', src); fs.writeFileSync(tmp + '/b/source/src/bfai.js', s);
let diff = '';
try { execFileSync('git', ['diff', '--no-index', '--no-prefix', 'a/source/src/bfai.js', 'b/source/src/bfai.js'], { cwd: tmp, encoding: 'utf8' }); } catch (e) { diff = e.stdout; }
diff = diff.replace(/^diff --git a\/source\/src\/bfai\.js b\/source\/src\/bfai\.js/m, 'diff --git a/source/src/bfai.js b/source/src/bfai.js').replace(/^--- a\/source/m, '--- a/source').replace(/^\+\+\+ b\/source/m, '+++ b/source');
fs.writeFileSync(out, diff);
console.log('补丁', out, diff.split('\n').length, '行；打好的文件 /tmp/bfai_tuned_src.js');
