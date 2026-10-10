// 固定配置的对手：线上电脑（C63 电脑半 + C64，bfai_next 的 UPESC / ROOTREL / ROOTATK）+ 自动调的权重 w_t3（无潜力特征），写回原公式
//   对打里拿它和别的权重比（两边都用 bfai_next 时环境变量只能给一边）
'use strict';
module.exports = require('./bfai_next.js').make({ BFAI_UPESC: '1', BFAI_ROOTREL: '1', BFAI_ROOTATK: '1', BFAI_TUNE_W: 'tools/tune/w_t3.json', BFAI_TUNE_FAST: '1' }, 't3');
