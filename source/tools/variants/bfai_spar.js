// 陪练（只供模拟）：线上电脑 + 根上自己的升级不筛——像真人一样什么时候升什么都考虑（线上电脑快攒够钱升车时只肯升车、守子没被捉不升、只留前 3 名）。
//   对手模型、一步杀保险都按线上电脑。见 bfai_upfix.js 第 5 条。用来测“对会用升级的对手”时改法值不值（拍板单 ai_fix3=a）。
'use strict';
module.exports = require('./bfai_upfix.js').make({ BFAI_UP3: '0', BFAI_UPNEAR: '0', BFAI_MATEG: '0', BFAI_ROOTALL: '1' }, 'spar');
