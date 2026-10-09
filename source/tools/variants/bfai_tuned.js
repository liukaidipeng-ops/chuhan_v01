// 电脑变体（只供模拟 / 验证）：C61 的电脑（bfai_fast.js，BFAI_LMR=2）换上自动调出来的估值权重（tools/tune/）。
//   BFAI_TUNE_W：权重文件（相对 source/，fit.js --out 写的；不给就用原权重 = 和 C61 逐步相同，用来核对）。
//   只换 score()：它变成“特征 × 权重”（tools/tune/feats.js）；走法排序、吃子搜索里用到的子力表不动。
//   比原来的 score 慢（每次要建一个特征数组），按搜索量收手的对打不受影响；真要上线时再把数字原样写回原公式的结构里。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', '..');
function build(E, tag) {
  let s = require('./bfai_fast.js').source({ BFAI_LMR: E.BFAI_LMR || '2' });
  const a = '  function score(S, me) {';
  if (s.split(a).length !== 2) throw new Error('bfai_tuned：找不到 score()');
  const feats = JSON.stringify(path.join(ROOT, 'tools/tune/feats.js'));
  const wf = E.BFAI_TUNE_W ? path.resolve(ROOT, E.BFAI_TUNE_W) : null;
  const wtxt = wf ? JSON.stringify(JSON.parse(fs.readFileSync(wf, 'utf8')).w) : '{}';
  s = s.replace(a, () =>
    '  // 变体 tuned：自动调出来的权重（' + (wf ? path.basename(wf) : '原权重') + '）\n' +
    '  const TUNE = require(' + feats + '), TW = TUNE.vec(' + wtxt + ');\n' +
    '  function score(S, me) { const v = TUNE.dot(TW, TUNE.feats(S, A, CFG)); return me === \'r\' ? v : -v; }\n' +
    '  function scoreOrig(S, me) {');
  const out = path.join(os.tmpdir(), `bfai_tuned_${tag || 'env'}_${process.pid}.js`);
  fs.writeFileSync(out, s);
  process.on('exit', () => { try { fs.unlinkSync(out); } catch (e) { } });
  return require(out);
}
module.exports = build(process.env, '');
module.exports.make = (opts, tag) => build(opts, tag);
