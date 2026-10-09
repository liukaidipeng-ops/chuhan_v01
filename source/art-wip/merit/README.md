# 主将卡 · 军功三个样子（进度，未审）

审批台 art-070，等 Ham 选。能点着看的页面：https://claude.ai/artifact/3yNAo1y24qRqEBkdnqwyC8

- `mer.js`：甲 军功条 / 乙 军功印 / 丙 正字计功，加功、花功动画。`MV.mount(style)`、`MV.set(side, v)`、`MV.gain(side, n, why, [x, y])`、`MV.spend(side, n, why, [x, y])`。它把 `.pcard .bfm .mer` 藏起来，在 `.bfm` 最前面插一行 `.mv`。
- `mshot.py`：在真实对局里截图（借 `ui5/hp.py` 的 `start()`），`VPS=m,pc STS=A,B,C`。
- `bg.py`：截手机底图（藏掉两张主将卡和状态条），给预览页用。
- `sheet.py`：拼对比图。
- `page.html`：预览页（底图 bg.jpg 和头像 face-r/face-b.jpg 不进仓库）。
