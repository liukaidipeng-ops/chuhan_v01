# 一张盘（落子入局）原型 · 美术总监（朱墨）

未经 Ham 点头，不是交付单。画布：https://claude.ai/artifact/GyegLevUTZ8RBhyCC1Q4YN

- `Main.dc.html` / `Mobile.dc.html`：画布上的两块可交互画板（电脑 / 手机）。
- `zmview2.js` + `cfg2.js` + `harness2.html`：同一套动画逻辑的本地测试页。
- `mobile-hall-main-fix.css`：手机联机大厅底部空白、主界面底边对齐的样式修改（只在截图里套用过）。
- `tools/`：截图、逐帧轨迹检查（motion.py：子走直线、不变方、不回退；linecheck.py：线宽不变、不越界、不回缩）。
- 手机对局镜头建议：phi 0.72→0.45，radius ×0.86，target z +0.15；缩放上限 30 不变，能手动缩回旧视角。
