// 第七版（潜力估值 + 计划推演，bfai_pot7.js）并到线上电脑（bfai_next.js 的底版：C61 + H52，新规则）。
//   “活到兑现”默认只在执汉时用（BFAI_POTSV=r；环境里设了就照环境）。第七版的其他开关照常从环境变量读。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const base = path.join(os.tmpdir(), `bfai_v7live_base_${process.pid}.js`);
fs.writeFileSync(base, require('./bfai_next.js').source({}));
process.on('exit', () => { try { fs.unlinkSync(base); } catch (e) { } });
process.env.BFAI_POT_BASEFILE = base;
if (process.env.BFAI_POTSV == null) process.env.BFAI_POTSV = 'r';
module.exports = require('./bfai_pot7.js');
