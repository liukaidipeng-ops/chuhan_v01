// 第七版（潜力估值 + 计划推演，bfai_pot7.js）并到 C61 的电脑上（记表 + 霸王靠后安静着法少算一层 + 一步杀保险）。
//   “活到兑现”默认只在执汉时用（BFAI_POTSV=r；环境里设了就照环境）。第七版的其他开关照常从环境变量读。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const base = path.join(os.tmpdir(), `bfai_v7c61_base_${process.pid}.js`);
fs.writeFileSync(base, require('./bfai_fast.js').source({ BFAI_LMR: '2' }));
process.on('exit', () => { try { fs.unlinkSync(base); } catch (e) { } });
process.env.BFAI_POT_BASEFILE = base;
if (process.env.BFAI_POTSV == null) process.env.BFAI_POTSV = 'r';
module.exports = require('./bfai_pot7.js');
