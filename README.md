# 楚汉·三维象棋

水墨风三维中国象棋，可与朋友联机对弈。

**在线游玩：** https://liukaidipeng-ops.github.io/chuhan_v01/

- 创建房间 → 把邀请链接或二维码发给朋友，对方点开即入局；手机、电脑、微信内均可。
- `index.html` 是完整游戏（单文件，约 2MB），放到任何静态网站都能用。

## 目录
- `index.html` — 打包好的游戏
- `source/` — 源码与构建脚本
  - `npm install && node build.js` 生成 `dist/site/index.html`
  - `node test/rules.test.js` 规则引擎测试
  - `voice/lines.json` 台词表，`voice/gen.py` 配音生成脚本（需 Kokoro 模型）
