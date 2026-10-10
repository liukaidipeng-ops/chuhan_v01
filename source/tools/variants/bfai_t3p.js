// 固定配置的对手：调好的权重 w_t3p 写回公式（= C68 的 bfai_tune.patch）。底版跟 BFAI_NEXT_BASE（设成 54ba8bc = 含 C65、C66 的线上，就和 C68 上线后的电脑逐步相同）
//   对打里拿它当“已交 TD 的那一版”，和后几轮权重比（两边都用 bfai_next 时环境变量只能给一边）
'use strict';
module.exports = require('./bfai_next.js').make({ BFAI_TUNE_W: 'tools/tune/w_t3p.json', BFAI_TUNE_FAST: '1' }, 't3p');
