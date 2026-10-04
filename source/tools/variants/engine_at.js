// 规则引擎取某个提交的版本（只供模拟）：环境变量 ENGINE_REV=<提交号>，默认 16aacba
//   用途：电脑原型要配它那一版的引擎（16aacba 的电脑用到了引擎新加的 pofuPairs 可选参数），
//   而工作区的 src/bingfa.js 还没合进那一版（背水变体的锚点依赖旧写法，等那几组模拟跑完再合）。
// 用法：BFSIM_ENGINE=tools/variants/engine_at.js ENGINE_REV=16aacba node tools/bfsim.js --match A,B …
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let built = null;
function enginePath() {
  if (built) return built;
  const rev = process.env.ENGINE_REV || '16aacba';
  const s = execFileSync('git', ['show', rev + ':source/src/bingfa.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  built = path.join(os.tmpdir(), `bingfa_${rev.replace(/[^\w.-]/g, '_')}_${process.pid}.js`);
  fs.writeFileSync(built, s);
  return built;
}
module.exports = { enginePath };
