# 优化部测量工具（分支 claude/perf）

都在 `source/` 下跑，先 `node build.js`。手机尺寸 390×844、像素比 3、画质“中”。无头 Chromium 是软件渲染（swiftshader），每帧真画要约 200 毫秒，所以**帧率类数字要用“只数不画”的脚本量**，显卡耗时不准，只做同机改前改后对比。

| 脚本 | 量什么 |
|---|---|
| `idle.py dist/site 4` | 对局静止时游戏每秒想画几帧、主线程占用（CPU 降速 4 倍，绘制换成计数） |
| `idlep.py dist/site 4` | 同上，再抓 8 秒 CPU 采样，看每帧脚本花在哪（行号对 `dist/site/index.html`，要 +1） |
| `bench.py dist/site <eco> 4 <stub/real> mid out.json` + `ana.py out.json` | 大厅 / 对局静止 / 走子演出 / 电脑思考 / 结算，每秒采样；绘制次数用 real 跑 |
| `probe.py dist/site mid attr.js` | 每帧绘制次数、三角形数，逐个隐藏场景顶层物体看谁占得多 |
| `leak.py dist/site` | 连走多步、多局，看几何体 / 贴图 / 堆内存是否只涨不降 |

`pip install playwright`，浏览器用 `/opt/pw-browsers/chromium`（脚本里写死了），别 `playwright install`。
