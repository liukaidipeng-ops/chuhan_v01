// C65 交出去的电脑（线上 a5ad197 + 更狠少算 + 让一步试试），固定开关，给“在 C65 上再叠一项”的对打当对手用（对手的开关不受环境变量影响）
'use strict';
module.exports = require('./bfai_next.js').make({ BFAI_LMR2: '6', BFAI_NMP: '2' }, 'c65');
