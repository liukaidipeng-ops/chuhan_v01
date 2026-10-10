# 美术总监（朱墨）→ TD

最新的在最上面，编号 V1、V2…。TD 用 `git fetch origin claude/art-director && git show origin/claude/art-director:source/docs/collab/ad-to-td.md` 看。格式照 `MODEL-WORKFLOW.md` 第 6 节。回复请写在你那边（建议 `dev` 上开 `td-to-ad.md`，编号你定），写完按门铃 `trig_01NqCZdJhgejZoZdWGS9nejC`。

## V1 · 10-10 · 交付 · 界面 + 过场（落子入局「一张盘」、手机对局镜头、手机大厅 / 主界面底边）

- 提交：`claude/art-director` 上带这张交付单的那次提交。没改 `source/src/` 里任何文件，全部改法写在下面，由你接。
- Ham 确认：画布 https://claude.ai/artifact/GyegLevUTZ8RBhyCC1Q4YN（电脑、手机两块可点的画板 + 手机镜头对比）。Ham 10-10 原话：「手机对局镜头的调整OK，只要你保证能手动缩小就行」；看完「两子各生半张盘」版后：「很酷！可以推送给TD让他发布线上了！」。
- 东西都在 `source/art-director/one-board/`：`luozi.js`（过场模块）、`mobile-hall-main-fix.css`（手机两处样式）、`Main.dc.html` / `Mobile.dc.html`（画布原样）、`tools/`（我自查用的脚本）。

### 1. 落子入局（过场）

**是什么**：点「开战 / 开始」或房间开局后：页面淡出（朱底盖满）→ 两颗子沿直线飞到帥位、將位并翻面（0.6 秒）→ 两颗子各自生出半张盘：九宫斜线 → 底线 → 竖线往河界长、横线跟着画开 → 两边边线在河界会合，「楚河 漢界」淡出（约 1.75 秒）→ 朱底淡出，露出正上方「定盘」视角的对局，格线正好压在木盘的线上 → 镜头抬回玩家的视角。点遮罩任意处跳过；系统「减少动态效果」时不播。

**模块**：`luozi.js`，只用 DOM 和 Web Animations，不碰 three.js。对外只有 `LuoZi.play(opt)`，返回 Promise（结束时遮罩已移除）。说明写在文件开头。

**需要你做的**
1. 把 `luozi.js` 放进 `source/src/`，`build.js` 的 `order` 里加 `'luozi'`（`main` 前面任意位置）。文件以后归美术总监管（分工草案批下来以后算数）。
2. 正上方视角下棋盘格在屏幕上的位置（我在真实游戏里这样算，对得上）：
   ```js
   // 9 条竖线、10 条横线的屏幕像素；ys[0] 是屏幕最上面那条
   function topGrid() {
     const cam = Core.camera, R = innerWidth, H = innerHeight, xs = [], ys = [];
     const pr = (f, r) => { const v = Board.pos(f, r, 0).project(cam); return [(v.x + 1) / 2 * R, (1 - v.y) / 2 * H]; };
     for (let f = 0; f < 9; f++) xs.push(pr(f, 0)[0]);
     for (let r = 0; r < 10; r++) ys.push(pr(0, r)[1]);
     if (xs[0] > xs[8]) xs.reverse(); if (ys[0] > ys[9]) ys.reverse();
     return { xs, ys };
   }
   ```
3. 三个入口怎么接（`pieces[].to`：`'K'` = 屏幕下方自己那颗，`'J'` = 上方对手那颗；`side` 传自己执哪方，执黑时下方翻成「將」）：
   - **人机** `bAIGo`：`pieces: [{ el: $('bAIGo'), to: 'K' }, { el: document.querySelector('#aiLv button.on'), to: 'J' }]`。
   - **本地** `bCreateGo`：`pieces: [{ el: $('bCreateGo'), to: 'K' }, { rect: { x: innerWidth / 2 - 30, y: -90, w: 60, h: 60 }, round: true, text: '將', to: 'J' }]`（上方那颗从屏幕顶上落进来；手机用 32 的大小）。
   - **房间**：两边客户端各播各的：自己的座位元素 `to: 'K'`，对手的座位 `to: 'J'`。观众不播。
   - `ready` 里：开局（`startGame(...)`），把镜头直接放到正上方（`Cam.view = 2; Cam.setSide(viewSide, true)`），等一两帧让相机更新；`grid` 传 `topGrid`。
   - `play` 返回后：把 `Cam.view` 恢复成玩家存的档位，`Cam.setView(v, viewSide)` 平滑抬回去（0 沙盘时就是「起镜」）。
4. **开场白、「楚汉相争」题字、语音请等 `play` 返回后再开始**。我在真实游戏里试接时开局是在 `ready` 里调的，题字的模糊底会在朱底淡出那一下透出来。遮罩 z-index 已经放到最高，盖得住，但淡出时会叠在一起。
5. 续局（「回到对局」）不播。

**我怎么验的**
- 画布版（和 `luozi.js` 同一套时间和画法）：本地用画布的运行库逐帧量过——电脑、手机共 12 颗子全部走直线（偏离 ≤ 0.02 像素）、不回退、圆的始终是正圆、只缩不放；36 根线粗细不变、只长不缩、不越出最终位置。
- `luozi.js`：在 dev（2913e8）打包出的真实游戏里注进去跑人机这一路，电脑 1440×900、手机 390×844：无报错；格线和正上方视角的木盘线对上（量出来的格点见上面 `topGrid`）；跳过能用；结束后镜头抬回沙盘。
- 没验：本地、房间两个入口（只在画布里走过）；真手机；低画质 / 低特效档；执黑时下方翻「將」（加了 `side` 参数，没在游戏里跑过）。

### 2. 手机对局镜头（Ham 点头）

- 竖屏（宽高比 < 0.8）、沙盘档（`Cam.view === 0`）时：`phi` 0.72 → **0.45**，`radius` = `fitRadius()` × **0.86**，注视点往自己这边挪 **0.15**（`target.z` +0.15，执黑时 −0.15）。实拍对比在画布第三块。
- **缩放上限不动**（滚轮 / 双指 `Cam.radius` 限在 7～30）：新默认约 21，旧默认约 25，能缩回旧视角还能再远——这是 Ham 的条件，请保留。
- 俯瞰、定盘两档不变；电脑不变。

### 3. 手机联机大厅、主界面底边（Ham 圈出来的两处）

`mobile-hall-main-fix.css` 整段贴进 `template.html` 里 `@media (max-width:640px)` 那段的末尾（已经带了媒体查询，直接贴在样式最后也行）：
- 主界面：外框拉到离底边 24 像素（和左右边距一样）；右栏最后一格多出的 2 像素去掉。
- 联机大厅：房间列表下面空出来的地方补成同样高度的空格子，竖栏、列表、底栏三条线对齐成一根；底栏上面那 22 像素空隙去掉。
- 没动 `id` / `data-*` / 结构。房间多到要滚动时列表照常滚。看过：5 个房间、2 个房间。没看：0 个房间、横屏。

- 想让 Ham 定的：无。
- 图：画布 https://claude.ai/artifact/GyegLevUTZ8RBhyCC1Q4YN
