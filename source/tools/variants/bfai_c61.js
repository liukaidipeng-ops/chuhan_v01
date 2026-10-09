// C61 交给 TD 的版本（记表 + 霸王靠后安静着法少算一层），当以后提速改动的对照组——和别的 bfai_fast 开关在同一进程里各生成一份
'use strict';
module.exports = require('./bfai_fast.js').make({ BFAI_LMR: '2' }, 'c61');
