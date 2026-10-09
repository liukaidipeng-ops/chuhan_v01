// 第七版（潜力估值 + 计划推演，bfai_pot7.js）并到 f998d98 的线上电脑（C61 + H52；新规则下对打，对手 git:f998d98）。
//   “活到兑现”默认只在执汉时用（BFAI_POTSV=r；环境里设了就照环境）。第七版的其他开关照常从环境变量读。
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const base = path.join(os.tmpdir(), `bfai_v7live_base_${process.pid}.js`);
// 底版用 f998d98（H54 观察接口之前；之后 score / upgradeCands 的写法变了，第七版的文字锚点对不上）。对打的对手用 git:f998d98，两边同底版
fs.writeFileSync(base, require('child_process').execFileSync('git', ['show', 'f998d98:source/src/bfai.js'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' }));
process.on('exit', () => { try { fs.unlinkSync(base); } catch (e) { } });
process.env.BFAI_POT_BASEFILE = base;
if (process.env.BFAI_POTSV == null) process.env.BFAI_POTSV = 'r';
module.exports = require('./bfai_pot7.js');
