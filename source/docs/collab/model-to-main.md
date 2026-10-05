# 美术（Art）→ TD

最新的在最上面，编号接着往下排（M1、M2…）。格式见同目录 `MODEL-WORKFLOW.md` 第 6 节。TD 用 `git show origin/model-lab:source/docs/collab/model-to-main.md` 看。

## M1 · 10-05 · 交付

- 提交：model-lab @ f383857
- 改了什么：虎骑不再用 8 万面按系数缩，改成同一套造型参数直接出面数档。Ham 看过 999 / 1,998 / 3,000 / 4,002 / 7,688 五档的对比图，定了对局用 4,002 面那档。动作我重做了一遍：行走改成步态反解，倒地改成就地倒下，扑击时节杖跟着前指。
- 改了哪些文件：`source/src/tiger.js`、`source/docs/collab/model-shots/` 六张图、本文件。
- 入口有没有变：没变，仍是 `TigerHD.make(side, { gold })`，`speed / pounceK / roarK / dead / deadSide` 含义不变。返回对象多了两个字段：`staff`（节杖的支点组）、`gaitK`（起步收步的过渡量，模型自己维护，你不用管）。画质仍从 `Core.quality` 读。
  - 原来的 `LQ / seg() / SphG / ConG / CylG / TorG` 去掉了，换成面数档 `LOD`（0～5）和 `QLOD = { high: 2, mid: 2, low: 4 }`。想换档只改 `QLOD` 这一行。
  - `TigerHD.makeProwl(side, { lod, gold })` 还在，给预览用，返回的是不带动作的静态模型。
- 数据（含描边）：高 7,684 面 · 中 7,684 面 · 低 3,960 面 · 首次构建约 50～60 毫秒 · 克隆 1 毫秒 · 网格 60（低 51）· 贴图 8 张。四级金装：高 7,784 面、网格 62。不含描边的面数是 4,002 / 4,002 / 1,998。
- 动作：speed ✓  pounceK ✓  roarK ✓  dead ✓
  - 行走：对侧步（左后 → 左前 → 右后 → 右前），支撑相脚贴地往后送，摆动相抬腿前探；`speed` 从 0 变到 0.8 时有约 0.2 秒的过渡。步幅、抬腿高度随 `speed` 变大。
  - 倒地：`dead` 0→0.45 腿软伏成卧姿，0.3→1 绕躯干中轴侧翻。虎身留在原格，文臣和节杖倒向 `deadSide` 那一侧，节杖尖伸出去不到一格。
  - 扑击：节杖以握杖的手为支点前倾约 35 度。
  - 已知问题：行走我只看了抽帧（`walk.jpg`），没有在真实行军速度下看连续画面。步频是模型自己按 `speed` 算的，没有和小队的移动速度锁死，可能有轻微滑步，请你在对局里走一遍时留意。
- 需要 TD 做的：
  1. `squads.js` 的 `TigerRider`：低画质也用 `TigerHD.make`，缩放同样是 0.27（现在低画质退回 `Models.makeTigerRider`）。接好以后 `makeTigerRider` 可以删。
  2. 倒地时文臣倒向 `deadSide` 一侧。如果旁边那格有子，建议 `deadSide` 取没有子的那一侧，或者朝棋盘外。
  3. `MODEL-WORKFLOW.md` 第 5 节“现在的虎骑”那一列和关于 `LQ` 的那段说明过时了，请按上面的数字更新。
- 想让 Ham 定的：
  1. 画质档怎么对应面数档。我现在是高、中画质都用 4,002 面，低画质用 1,998 面。
  2. 行走、扑击、倒地三个动作的样子（见 `walk.jpg`、`acts.jpg`）。
  3. 四级金装的配色我没动，沿用的是你临时配的那套，还没给 Ham 看过。
- 图：`model-shots/` 里的 `side.jpg`、`front34.jpg`、`line_play.jpg`、`rank.jpg`、`walk.jpg`（行走四帧）、`acts.jpg`（扑击、倒地三帧）。都是高画质、真实游戏页面里用 `modelshot.py` 出的。

