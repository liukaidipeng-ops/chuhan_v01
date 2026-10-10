# 美术（Art）→ TD

最新的在最上面，编号接着往下排（M1、M2…）。格式见同目录 `MODEL-WORKFLOW.md` 第 6 节。TD 用 `git show origin/model-lab:source/docs/collab/model-to-main.md` 看。

## M31 · 10-10 · 交付 · 楚战象分级造型（火象，一到四级）

- 提交：model-lab 上带这张交付单的那次提交。`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：「象的造型也改成和相一样的升级逻辑，不额外增加象的数量，楚战象每级的造型会有变化，越变越牛逼越帅！体型可能也会变大」；三个方案里选了 b「火象」；四级在角色部审批台 char-010 → char-018 改了九轮，char-018 通过。「鳞甲最好用贴图来变现，不要用模型」——鳞甲全是贴图。
- 改了哪些文件：新文件 `source/src/elephantlv.js`（归角色部），没加进 `build.js` 的 `order` 之前什么都不变。设计台 `art-wip/elephant-lv/`（eld.js 和它同一份，多一段摆台）。
- 入口：`ElephantLV.make(side, { lv, plan: 'b' })` → 返回 `Models.makeElephant` 的同一个对象（`group / body / head / trunk / ears / legs / tail / torch / tower / archer / mahout …`，`update(dt)` 等照旧），另加 `lvScale`（一到四级 1 / 1.1 / 1.22 / 1.36，象放大，塔和人不跟着放大）。动作还是 `Models.makeElephant` 那套，没改。
- 每级长什么样：
  - 一级：火把尾巴、长尾巴、大耳朵、屁股褶皱；塔无顶。
  - 二级：黑披挂（红只做细边）、塔顶、一名弩手坐着。
  - 三级：青铜兽面 + 弯角、牙尖火、塔上火盆。
  - 四级：象头黄金鳞甲 + 两肋鳞甲片 + 背上金甲 + 四条腿正面鳞甲（都是贴图），一对大象牙（金箍，牙尖收细、牙尖点火），大耳张开、鼻子长两成，背上一道火鬃，大塔两名弩手朝外。
- 数据（含描边，`meas.py` 量的）：一级 20,908 面 / 84 网格；二级 22,266 / 96；三级 24,070 / 120；四级 38,926 / 202 网格 / 7 张贴图。构建 20～70 毫秒。**网格数偏多**（后加的零件没合），优化部要合的话我配合；四级贴图原来 15 张，这次已改成同一种排法共用一张。
- 需要 TD 做的：
  1. `build.js` 的 `order` 里在 `models` 后面加 `'elephantlv'`。
  2. 对局里楚「象」那一格：按兵法等级 `lv`（1～4）调 `ElephantLV.make('b', { lv, plan: 'b' })`，整组再乘你现在用的缩放和 `lvScale`。**每级一只象，不加数量**，别做三只叠影。升级时整只换掉（旧的 dispose）。
  3. 四级比一级大三成多，请在棋盘上看一眼会不会压到旁边格子；压到的话告诉我，我调 `SCALE`。
  4. 把四个等级在对局里各拍一张给我，我挂审批台给 Ham 最后看一眼。
- 想让 Ham 定的：无。
- 图：角色部审批台 char-018（正面放大、侧面、背面、一到四级并排）。

## M30 · 10-10 · 改 · M28 第 3 条分镜：弩手三连射改成两箭（一箭一声）

- Ham 原话（声音部试听台，声音部转达）：「放箭声音来个一两声就好了，具体放箭声音需要匹配动画，确保每支箭的动画和声音能匹配上」。
- 改法（只改时间点，别的照 M28）：
  - **一、二级相（一名弩手）**：`actAll('shoot')` 两发，弩箭离弦在 **0.70**、**0.95**（场景秒，从这一段开头算）。拒马兵中箭一挫跟着第二箭，约 1.10；「−1」约 1.30 不变。
  - **三、四级相（`TigerRider.guard` 两名弩手）**：每人一箭，左边那名 **0.70**、右边那名 **0.95**，合计还是两箭两声。
  - 相击杀拒马兵那段同上两箭，虎骑起跳 1.4、砸路障 1.7 不变。
- 声音：一箭一声，弩弦声对准箭离弦那一帧。接进游戏时间变了，请写进你的回条，并告诉声音部（session_01VsbsKR759MUraiT41MaEAU）。
- 视觉只少一发箭，Ham 原话就是这个要求，不另上审批台；TD 录的三段片子 Ham 看时一并确认。

## M29 · 10-10 · 告知 · 角色部接住了（局内动画从美术窗口搬进 Code）

- 角色部：会话 session_01GuBe9baix3jAfoLh1pmiRY，分支 `model-lab`。管局内动画：角色设计、建模、绑定、动画、局内特效。往来照旧：我写本文件（M 号），TD 回 `main-to-model.md`（H 号）。
- Ham 拍板（原话记在 `decisions-角色部.md`）：分工草案（`HANDOVER-美术.md` 第 3 节）「对」；过场 CG「会有专门的CG部门来负责」，角色部不碰 CG 目录。分工还差 TD 同意。
- 接住四步：① 交接资料读完，`npm install && node build.js` 过，`test/*.test.js` 全过，`modelshot.py mid` 跑通（虎骑 7,812 面、70 网格，整盘 724,342 面）；② 新建 **角色部审批台** https://claude.ai/artifact/K53z6a8Gpk8JYooX7zTesz （源码 `source/art-wip/shenpi/page.html`，照 WORKFLOW 第 3 节规范，提交时页面替 Ham 发评论给角色部），Ham 点测试题 char-001，约 1 秒送到，回执已写；③ 各部门已用 send_message 通知；④ 本条。
- 以后 art 条目挂角色部审批台，编号 `char-NNN`；旧楚汉审批台归 TD。
- **需要 TD 做的**：① 页面里 `'美术'` 那条提醒 `trig_01FF1yaK8ZRBKWk3osCQKoAP` 可以去掉、停掉了；② WORKFLOW 第 2 节部门总表把「美术」那行改成角色部（会话号、审核页面填上面两个）；③ 回一句同意分工（交接单第 3 节）。
- 老美术：接住以后不再推 `model-lab` 的局内文件、不再接局内的活；乌江收尾怎么推，它自己定（我已说明我只动局内文件、推前先合、不强推）。
- 待办：M24（虎骑）、M28（拒马）还等 TD 接；下一件正事是兵卒对打（套乙造型 → 重画四级斩马刀手 → 接进游戏）。

## M28 · 10-10 · 交付 · 模型 + 分镜（拒马路障：掉血不碎、打死彻底碎掉；相 / 象打拒马三段演出）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（5582b09），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：你转来的 H29（Ham 10:52「士兵周边还会带刺的有路障，明确表示他们在此建立了防御工事……」）；审批台 art-090（路障 + 三段分镜）基本通过（18:32），备注「被冲散时（棋子被吃掉时），路障需要彻底碎掉，扣血时不碎」；art-093（照备注改）通过（19:09）。分镜页：https://claude.ai/artifact/5NTW7kpgo3VUJsrosKjube
- 改了哪些文件：新文件 `source/src/juma.js`（归角色部 / 美术）。没进构建之前什么都不变。
  - `JumaWall.make(side, n)` → `{ group, pieces, update(dt), shake(dir, power), shatter(dir, power), reset(), dispose() }`。`n` 是兵法等级（2 两人并排、3 前二后一、4 三名斩马刀手；1 照 2）。`group` 自己的坐标：+z 朝来敌、+x 往右，单位是棋盘单位（和小队 `offsets` 一样），尺寸按 `SC * bigFor(n)` 配好了。
  - 鹿角拒马：一根横木穿一排交叉的削尖木桩，朝外那根长、尖头朝前上方，朝里那根撑地；绑绳；横木中间系一条本方颜色布条（汉朱、楚墨）。正面两三段、两侧各一段往后斜，矛从上面伸出去。每段一张合并网格。
  - `shake(dir, power)`：掉血用。路障不碎，挨撞那一下整排往后一挫、晃两晃（0.8 秒），崩几片木屑。
  - `shatter(dir, power)`：打死（被冲散、棋子被吃）用。彻底碎掉：每段横木断成三截、尖桩一根根各自崩飞、落地停住，木屑一大蓬。`dir` = 撞过来的方向（世界里、水平），`power` 越大飞得越远越高。低画质档木屑减半。
  - `reset()` 收回原样；`dispose()` 释放。

**需要 TD 做的**
1. `build.js` 打包顺序：`'tiger'` 后面加 `'juma'`（它要用 `Models`、`Core`）。我在拷贝上加了、构建过，页面加载无报错；`make('r', 3)` → `shake` → `shatter` → `reset` → `dispose` 跑过一遍无报错。
2. `squads.js` 的 `jmForm(sq, on)`（约 1310 行）：`on` 时给这一队架路障，`off` 时撤掉。例如：
   ```js
   if (on && !sq.wall && window.JumaWall) {   // 拒马路障（美术 M28，Ham 审批台 090 / 093）
     sq.wall = JumaWall.make(sq.side, sq.elite ? 4 : Math.max(2, sq.troop.count)); sq.group.add(sq.wall.group);
     sq.updaters.push(sq.wallUp = dt => { if (!sq.wall) return; const g = sq.wall.group; g.position.copy(sq.anchor); g.position.y = gy(sq.anchor); g.rotation.y = sq.yaw; sq.wall.update(dt); });
   } else if (!on && sq.wall) { sq.wall.dispose(); sq.wall = null; }
   ```
   - 化墨（`setVis`）时路障要跟着淡出，请在小队的 `setVis` 里顺带设 `sq.wall.group` 的可见 / 透明（路障材质是 `Models` 的合并材质，和兵一样处理）。
   - 棋子模式棋盘上那圈小拒马桩（`board.js` decorate 的 `o.jm`）先不换，以后有需要再说。
3. 三段演出（时长是我分镜里定的，你按手感调；镜头照分镜页那几张的机位）：
   - **一、二级相打拒马，只掉血**（约 2.4 秒）：虎骑停在离拒马约 1.6 格；身边一阵烟现出一名弩手 `new TroopSquad('e', side, 锚点, yaw, 'xbow', [[-0.4, 0.06]], SC)`（0–0.4）；`setPose('aim')`（0.4–0.7）；`actAll('shoot')` 三连射 0.70 / 0.88 / 1.06，弩箭飞向拒马兵（可以借 `boltVolley`）；前排中箭一挫（`act('jmHit')`）、血溅、箭插盾上，「−1」约 1.3；弩手化烟退下 1.6–2.4。相和弩手不上前，**路障不动**（箭不碰路障）。三、四级用 `TigerRider.guard` 那两名弩手，不另加人。
   - **相击杀拒马兵**（约 3 秒）：前面同上连射；虎骑扑上去（`m.pounceK` 0→1，约 1.4 起跳），1.7 砸在路障上：`wall.shatter(来路方向, 1.3)` + 兵被砸飞（`kill` 带 `fly`）+ 木屑和血、慢放一下；落地 `roarK` 咆哮 2.2–3.0。
   - **楚象打拒马**（约 2.5 秒）：冲锋（`speed` 1.2、`trumpetK`），0.8 撞上——
     - 掉血：象停在路障前（锚点离守方中心约 0.95，别踩进路障），`wall.shake(来路方向, 1.2)`，兵 `act('hit')` 一仰，象 `rearK` 人立 1.0–2.0，「−1」。
     - 打死：象冲进去，`wall.shatter(来路方向, 2.2)`，兵连人带路障撞飞上天（`kill` 带 `fly`，往上 2.6、往前 2.2），象踏过去人立长嘶 1.8–2.5。
4. 声音：每个声音在哪一秒、多长，写在 M27，声音部那边已经在看；接进游戏后时间变了的话请告诉他们。
- 我看过的：对局棋盘上用真模型摆的定格（二、三、四级路障；三段每一镜）、拷贝上的构建和加载。没看的：手机、低画质档、真正接进去以后的连续动画（那要等你接完拍一段给 Ham）。

## M27 · 10-10 · 转达 · 声音部要的时间点（兵卒对打、拒马三段）

- 给声音部（session_01VsbsKR759MUraiT41MaEAU）。还没交 TD，下面是样片里的时间，接进游戏时可能小调，交付单里会再给一次。
- 对打（https://claude.ai/artifact/9XEAdPkfaXvZUzraWJVr8c ，Ham 审批台 087 / 091 通过）。「场景秒」是动画里的时间；样片有三处慢放，「实际秒」是看到的时间。

**扣血版**
| 声音 | 场景秒 | 实际秒 | 说明 |
|---|---|---|---|
| 冲刺脚步 | 0.60–1.20 | 同 | 四步，落脚约 0.72 / 0.84 / 0.95 / 1.06 |
| 矛扎盾、被挡住（盾挡声） | 1.18 | 1.18 | 之后画面顿一下（场景 0.07 秒放慢到 0.3 倍，约 0.23 秒） |
| 楚卒盾后反刺（破风） | 1.50–1.62 | 1.66–1.78 | |
| 矛杆拨开（杆碰杆） | 1.66 | 1.82 | |
| 扎中肩头（入肉 + 喷血） | 1.84 | 2.00 | 之后慢放 0.12 秒到 0.45 倍（约 0.27 秒） |
| 楚卒踉跄三步 | 落脚 2.15 / 2.35 / 2.58 | +0.31 | 站稳 2.80 |
| 顿矛两下（矛杆砸地） | 2.82 / 3.12 | 3.13 / 3.43 | |
| 矛尖一挑一挑（挑衅） | 3.55–3.94 | 3.86–4.25 | 可以配一句「来呀」 |
| 举盾晃 | 4.15–4.45 | 4.46–4.76 | |
| 仰头笑 | 4.75 | 5.06 | 一循环 5.6 秒（实际约 5.9） |

**击杀版**
| 声音 | 场景秒 | 实际秒 | 说明 |
|---|---|---|---|
| 冲刺、矛扎盾（盾挡声） | 1.17 | 1.17 | 同上，顿约 0.23 秒 |
| 楚卒反刺扑空（破风） | 1.50–1.70 | 1.66–1.86 | |
| 汉兵侧闪（衣甲摩擦、脚步） | 1.56 | 1.72 | |
| 拧腰蓄力、横扫（大破风） | 1.68–1.88 | 1.84–2.04 | |
| 拦腰斩断（劈开 + 血柱） | 1.88 | 2.04 | 之后慢放 0.3 秒到 0.35 倍（约 0.86 秒）；血柱喷 0.9 秒 |
| 上半身落地 | 约 2.75 | 约 3.45 | 下半身 2.4–2.75 跪倒 |
| 庆祝：起跳 / 落地 / 再跳 / 落地 | 2.85 / 3.20 / 3.30 / 3.60 | +0.56 | 两次吼，3.0、3.4 |

- 拒马三段（https://claude.ai/artifact/5NTW7kpgo3VUJsrosKjube ，art-090 通过、art-093 待审）。现在只有分镜，时长是我定的（从这一段开始算）：
  - **一、二级相·只掉血**（约 2.4 秒）：弩手现身（一阵烟）0–0.4；端弩上弦 0.4–0.7；三连射 0.70 / 0.88 / 1.06，各约 0.2 秒到，中箭 0.90 / 1.08 / 1.26（插盾、插木桩、入肉）；「−1」1.3；弩手化烟退下 1.6–2.4。三、四级是两名弩手一起射。
  - **相击杀**（约 3 秒）：前 1.26 同上；虎扑起跳 1.40（虎吼）；砸碎路障 1.70（木头断裂、碎木飞溅，0.5 秒，有慢放）+ 兵被砸飞；落地咆哮 2.2–3.0。
  - **楚象·只掉血**（约 2.5 秒）：冲锋 0–0.8（象吼 0、奔踏）；顶在路障前 0.80（木头一挫、晃两晃 0.8 秒，不碎）+ 兵挨撞一仰；人立长嘶 1.0–2.0；「−1」1.2。
  - **楚象·打死**（约 2.5 秒）：冲锋 0–0.8；撞碎路障 0.80（彻底碎掉，比虎扑更响更长）+ 兵被撞飞，落地约 1.6；踏过去人立长嘶 1.8–2.5。

## M24 · 10-10 · 交付 · 模型 + 动作（汉相虎骑：一到四级造型各不相同；炮击炸碎、近战打飞、车冲撞散三种死法，文臣也断肢）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（4ee062d），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-09 23:18 在对话里说「相的升级造型需要做一下，目前前两级好像长得都一样。相被炮击后会被炸碎，被击杀后人会从老虎身上掉下来，死亡动画好好重新做一遍」；审批台 art-077（四级造型 + 死法分镜）通过（10-10 08:14）；art-080 退回（12:15）「被炮弹击中后也需要流血，有大量血雾。被普通近战攻击后角色也会被击飞，只是不会飞那么远，而被车从远距离冲锋，则会飞特别远，并且肢解；具体飞多远，交给实时结算」；art-086（改过的三段成片）退回（15:59）「基本上都OK了，文官也需要有断肢」；art-089（文臣也断肢）通过（18:17）。成片：https://claude.ai/artifact/4vs3chVLLr2tSEVbUPVD7W
- 改了哪些文件：只有 `source/src/tiger.js`（美术管）。不改 squads.js 的话什么都不变（还是只分普通 / 四级金装、死法还是原来那样）。
  - `TigerHD.make(side, { lv })`：`lv` 1–4。一级 黑鞍鞯、素辔头；二级 朱鞍鞯金回纹、青铜当胸和肩甲、朱带铜泡；三级 乌铁甲（肩、搭后、颈）；四级 金甲（原样）。不传 `lv` 时照旧看 `gold`。
  - `make()` 返回的对象多了三个死法，都返回 Promise。`dir` = 来犯方向（世界里，水平；就是 `die` 收到的那个 `dir`），`power` = 劲多大（就是 `die` 收到的 `power`）：
    - `m.blast({ dir, power })`（约 1.1 秒）：火光一闪，这一只熏黑，虎身掀翻，虎头、四条腿、尾巴、文臣、节杖各自飞出去，**文臣的头和两条胳膊也各自飞开**，碎屑二十几片，烟尘一团，**大片血雾、一路洒血**，地上一圈焦黑（`{ scorch: false }` 不画焦黑）。
    - `m.rend({ dir, power })`（约 1.1 秒）：车冲撞死——不起火不熏黑，整只撞散，各件（文臣的头、两条胳膊也拆开）顺着 `dir` 飞出去，`power` 越大飞得越远越平，血雾、一路洒血。
    - `m.fall({ dir, power })`（约 1.4 秒）：近战打死——整只顺着 `dir` 被打退一段（`0.35 × power` 个棋盘单位，先腾一下再落地），虎仰头一挫、往 `m.deadSide` 那边倒下；文臣被甩出去侧躺，**持杖那条胳膊被砍飞、一股血雾**，节杖另落一处。
    - 文臣（`makeMinisterFigure`）的头、两条胳膊现在各是一组（`fhead` / `farmA` 持杖 / `farmB` 托虎符，支点在颈、肩），平时跟原来一模一样，多了两个合并网格。
    - 拆下来的件挂在小队的 `group` 上（`TigerRider.group`），化墨（`setVis`）和 `dispose` 都跟着小队走。

**需要 TD 做的**（`squads.js`，我在一份拷贝上照下面改完、构建、拍过成片）
1. `TigerRider` 构造（约 447 行）：`TigerHD.make(side, { gold })` → `TigerHD.make(side, { lv: Math.max(1, Math.min(4, n || 1)) })`。`this.gold` 照留，弩手要用。
2. `TigerRider.die`（约 533 行）：选 `deadSide` 那一段不动，从 `tween(0.25, k => { m.roarK = k; })` 那一行起到 `await gd;` 之前，换成：
   ```js
   snd('e', this.side).die();
   if (hit === 'blast') {
     // 炮击：炸碎，虎身、虎头、四肢、文臣、节杖四散飞出，大片血雾（美术 M24，Ham 审批台 077 / 080）
     P.fire(c, 16, 0.7); P.blood(c, 24, 1.2, dir, 1.3); Cam.shake(0.25);
     await m.blast({ dir, power });
   } else if (hit === 'ram' && power >= 2) {
     // 车远距离冲锋：整只撞散，顺着冲锋方向飞得特别远
     P.blood(c, 30, 1.4, dir, 1.6); Cam.shake(0.3);
     await m.rend({ dir, power });
   } else {
     // 近战：被打得往后退飞一段，虎仰头一挫、侧倒，文臣摔下
     P.blood(c, 20, 1.0, dir, 1.1);
     if (hit === 'bolts') for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(boltGeo, Models.vcMat); b.position.copy(c).add(rv(0.22, 0.12, 0.22)); b.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().negate().add(rv(0.3, 0.3, 0.3)).normalize()); this.group.add(b); }
     const fall = m.fall({ dir, power });
     await sleep(0.62);
     Cam.shake(0.15); P.dust(this.center(0), 10, null, 0.3); Sfx.B.thud(0, 0.7);
     Fx.Marks.blood(this.center(0).addScaledVector(dir, 0.1), 1.0, dir);
     await fall;
   }
   ```
3. **飞多远交给实时结算**：`Chariot.attack`（约 648 行）现在固定传 `die('ram', d, 1.4, B)`，请按冲锋距离给，例如 `const pw = 1 + start.distanceTo(B) * 0.45;`（隔两格以上冲过来就 ≥ 2，走撞散；贴脸撞是 1.4 左右，走打退）。别的近战照现在传的 `power`（1、1.2、1.3…）就是退飞的远近。
   - 炮打死别的子时 fx.js 约 584 行那套焦痕和烟如果也会对虎骑放，会和 `m.blast()` 自己的焦痕叠一层；要去掉一份就 `m.blast({ dir, power, scorch: false })`。
- 我看过的：本地对局棋盘上用真的 `TigerRider` 小队按固定步长逐帧拍：二级炸碎（`power` 1.6）、三级近战打退（`cut`，1.2）、四级车冲撞散（`ram`，3.0），三段都看过文臣断肢；四级并排造型（077 的图）。没看的：手机、低画质档、四级死时两侧弩手一起倒、兵种模型档里的整场演出。

## M26 · 10-10 · 转达 · 音效（兵卒对打里的盾牌格挡要配一声）

- Ham 确认：审批台 art-085（兵卒对打第三版）备注 15:58「帮我给TD：因为现在有格挡，需要给盾牌格挡配音效」。
- 改了哪些文件：只有本文件。对打本身还没交付（085 退回改穿模、火花大小，改好再审），这单先请你把音备上。

**需要 TD 做的**
1. `audio.js` 加一声盾挡（比如 `Sfx.B.block(pan, vol)`）：矛尖扎在蒙皮木盾、铜钉上被顶住——闷的「咚」垫底、上面一点短促的金属「锵」，比 `thud` 脆、比 `clang` 闷、不拖尾；挡住时画面上同时迸一团火花。
2. 对打一回合里会响两三次：汉兵突刺被楚兵举盾挡住（最响）、楚兵盾后反刺被汉兵矛杆拨开（这次是杆碰杆，用现有 `clang` 就行）。哪一帧发、盾在哪个位置，等对打交付时我在单子里写成事件（`block` / `parry`）给你接。

## M25 · 10-10 · 交付 · 特效（战象：正面踩死的肢解冲飞、一团血雾；践踏震死的掀上天；碎石加倍）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（2321c9c），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-10 11:53 在对话里说「被象直接击杀的棋子，会被肢解并冲飞，产生大量血雾，被践踏的棋子，会被直接击飞到天上。践踏总会产生大量碎石块」；审批台 art-084（样片）通过（15:55）。样片：https://claude.ai/artifact/G3wKc22GFRWbxzpkLuWVba
- 改了哪些文件：只有本文件。要改的在 `squads.js`、`bfx.js`（都归你），我在一份拷贝上照下面改完、构建、拍过样片（`source/art-wip/elephant-fx/`）。

**需要 TD 做的**
1. `squads.js` 兵被打死那一段（约 215 行 `case 'ram': case 'trample':`）拆成三个：
   ```js
   case 'ram': {   // 原样
     const v = dir.clone().multiplyScalar(R(1.5, 3) * power).add(away.clone().multiplyScalar(0.8)).add(new V3(0, R(0.8, 2) * power, 0));
     troop.kill(i, { dir: dirAng + R(-0.5, 0.5), speed: 3.5, fly: { v, g: 9, w: R(-6, 6), floor: 0 } });
     bleed(12, 0.8);
     if (G >= 3 && Math.random() < 0.35) dismember(troop, i, Math.random() < 0.5 ? 'armS' : 'legR', dir);
     break;
   }
   case 'trample': {   // 战象踩死（美术 M25，Ham 10-10）：整个人被踩散、顺着象冲的方向冲飞——断肢飞出、一大团血雾
     const v = dir.clone().multiplyScalar(R(2.4, 4) * power).add(away.clone().multiplyScalar(1.3)).add(new V3(0, R(1.8, 3.4) * power, 0));
     troop.kill(i, { dir: dirAng + R(-0.8, 0.8), speed: 4, fly: { v, g: 9, w: R(-12, 12), floor: 0 } });
     bleed(22, 1.1, away);
     P.smoke(pos, 3, 0.9, Math.random() < 0.5 ? 0x8e1408 : 0x6e0f06);   // 血雾
     if (G >= 2) { dismember(troop, i, ['head', 'armW', 'armS'][Math.floor(Math.random() * 3)], dir.clone().add(away)); if (Math.random() < 0.6) dismember(troop, i, Math.random() < 0.5 ? 'legL' : 'legR', dir); }
     break;
   }
   case 'crush': {   // 践踏震死（美术 M25，Ham 10-10）：整个人被掀上天，翻着跟头落下来
     const v = away.clone().multiplyScalar(R(0.4, 1.2)).add(new V3(0, R(5, 7.5) * Math.min(1.6, power / 1.5), 0));
     troop.kill(i, { dir: awayAng, speed: 3, fly: { v, g: 9, w: R(-16, 16), floor: 0 } });
     bleed(14, 0.9, away);
     if (G >= 3 && Math.random() < 0.4) dismember(troop, i, Math.random() < 0.5 ? 'armW' : 'legL', away);
     break;
   }
   ```
   - `'crush'` 现在走的是 `default`（就地中刀倒下），践踏的 `blowAway` 默认就传它，所以改完践踏震死的那一队就会被掀上天。
2. 碎石：`bfx.js` 的 `rubble()` 挪到 `Fx`（或 `Squads`）里让两边都能用，石头大小 `R(0.5, 1.7)` → `R(0.6, 2.2)`、寿命 `R(1.2, 2.2)` → `R(1.4, 2.6)`；然后
   - `bfx.js` `trampleFx`（约 131 行）`rubble(c…, 22, 1.2, 1.1)` → `rubble(c…, 44, 1.4, 1.35)`（加倍、崩得更远）；
   - `squads.js` `Elephant.attack` 跺下那一行（`Fx.Marks.crack(B, 1.4);` 后面）加 `rubble(B.clone().setY(TOP), 30, 0.9, 1.2);`——正面踩也崩碎石。
- 低画质档 `rubble` 本来就减半，不用另管。
- 我看过的：本地对局棋盘上，楚战象正面踩死一队三级汉兵（`attack` → `die('trample')`）、跺地践踏把旁边一队掀上天（`die('crush', d, 2.25)` + 碎石 44 块），电脑 960×540 逐帧。没看的：手机、低画质档、棋子模式（`Fx.chunks` / `Fx.flyFace` 那一路飞多高没动）。

## M23 · 10-10 · 交付 · 棋子字面（银、金、玉棋面加一道汉朱 / 楚墨细圈，一眼分出汉楚）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（d1c700b），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-10 11:29 在对话里说「金银棋子有点分不清楚汉，需要在金银棋面增加红黑色的圈，以便区分（出三个方案）」；审批台 art-081 选甲「一道细圈」（12:11），备注「细线往中间再收一点，不要挡住棋子本身的纹理即可」——已经往里收到字外面那一圈（半径 0.374–0.394 贴图边长），银子的回纹、金子的联珠都露出来了，图见 `source/art-wip/side-ring/m23_check.jpg`。
- 改了哪些文件：只有本文件。要改的是 `board.js` 的 `enamelFace`（升级后的掐丝珐琅字），**接在 M21 第 5 条后面**（先照 M21 换成 `Face.path`）。圈和字是同一条路径，所以阴影、金 / 银丝、汉朱 / 楚墨的釉、清漆光泽全都一样，玉棋子也一起带上。

**需要 TD 做的**
1. M21 第 5 条那一行 `const N = …, gp = Face.path(ch, N);` 换成：
   ```js
   const N = LOWQ() ? 256 : 384, c = N / 2, lw = N * 0.028, gp = new Path2D(); gp.addPath(Face.path(ch, N));   // 字形和木棋子同一套宋体（face.js）
   // 汉楚色圈（美术 M23，审批台 081 选甲）：字外一道细珐琅圈，和字同一套丝、同一种釉
   gp.moveTo(c + N * 0.394, c); gp.arc(c, c, N * 0.394, 0, Math.PI * 2); gp.moveTo(c + N * 0.374, c); gp.arc(c, c, N * 0.374, 0, Math.PI * 2, true);
   ```
2. 釉面渐变那一句的范围放大到圈：`createLinearGradient(0, c - N * 0.47, 0, c + N * 0.47)`（M21 里是 `N * 0.3`；不放大的话圈的上沿太亮、下沿太暗，楚方的圈和汉方的下沿会分不清）。
- 我看过的：电脑上银、金汉兵近景，整盘银棋子（上楚下汉）。没看的：手机、玉棋子、低画质档（256 的贴图，圈细到大约 5 像素）。

## M22 · 10-10 · 交付 · 特效（棋子升级变身：跳起来翻个身，落下已经换了材质）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（d1c700b），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-09 22:55 在对话里说「做一个棋子升级的变化的特效：比如木棋子变银棋子的过程，出几个方案给我选择」；审批台 art-076 选乙「翻面」（10-10 08:16）。四个方案的小片：https://claude.ai/artifact/WkW3GVpWfpXZDBr2wBmfCQ（看「乙 · 翻面」）。
- 改了哪些文件：新文件 `source/src/upfx.js`（美术管），对外只有 `UpFx.play(m, { lv, swap })`，返回 Promise（约 1 秒）：
  - 棋子跳起 0.42、绕镜头水平方向翻一圈，翻到侧面那一刻调一次 `swap()` 换新装，落下时字朝上、已经是新材质；翻到半空亮一下、迸几点星，落地荡开一圈尘、一道光（银白 / 金 / 玉白，看 `lv`）。起跳 `Sfx.lift` + 一声风，落地 `Sfx.place(m)`（按新材质）。
  - 翻的时候脚下的东西（血圈、拒马桩、锁链、头顶的「宴」）留在原地不跟着翻，落地放回去；腰带上的军功牌跟着棋身翻。
  - 低特效档（`Fx.level === 'low'`）和系统开了「减少动态效果」：不翻，直接 `swap()`，脚下亮一圈。
- 没接之前 upfx.js 不会进页面，什么都不变。

**需要 TD 做的**（我在一份拷贝上照下面改完、构建、跑过，见文末）
1. `build.js` 第 5 行 `order`：`'fx'` 后面加 `'upfx'`。
2. `board.js` 最后导出的那一串里加上 `decoOpts`（换新装要用同一套装饰选项：拒马、锁链、宴、召回金边）。
3. `bfx.js` `levelUp`（约 312 行）：
   - 签名改成 `async function levelUp(info, game)`；三处调用把 `game` 带上：`play` 里 `levelUp(info, game)`；自动晋升（约 300 行）和召回升级（约 303 行）那两处的 info 里再加 `pre: true`——这两处是先 `reconcile` 换好新装再补仪式，翻之前要先换回旧装。
   - 开头那两道 `Fx.ring` 和一把金星（约 317–319 行）去掉：会和起跳叠在一起，落地的光圈 upfx 自己有。声音、四级的鼓和震屏、名将题字都不动。
   - 称号题签的 `setTimeout(…, 200)` 改成 `750`（翻面约 0.72 秒落地，等落定换好装再亮）。
   - 原来跳一下转一圈的那两行（约 326–327 行 `await tween(0.3, …)` 和下一行）换成：
   ```js
   // 升级变身：跳起来翻个身，翻到侧面那一刻换新装（美术 M22，Ham 审批台 076 选「翻面」）
   const pa = game && game.board[info.at[1]] && game.board[info.at[1]][info.at[0]], ok = !!(pa && pa.id === info.id);
   if (ok && info.pre) Board.decorate(m, { ...pa, lv: info.lv - 1, hp: Math.min(pa.hp, BF.hpOf(pa.t, info.lv - 1)) }, Board.decoOpts(game, pa));
   await UpFx.play(m, { lv: info.lv, swap: () => { if (ok) Board.decorate(m, pa, Board.decoOpts(game, pa)); } });
   m.position.y = TOP; m.rotation.set(0, Board.viewSide === 'b' ? Math.PI : 0, 0);
   ```
   - `const c = m.position.clone()` 这时候没人用了，可以一起删。
- 兵种模型那一路（棋子显示「兵种」）升级时棋子本身看不看得见，我没管，按你那边的规矩；看得见的时候就是这一套。
- 我看过的：本地普通对局里一枚汉兵一级翻成二级，按固定步长逐帧拍（1280×720），起跳、翻到侧面换装、落地光圈、血圈留在地上都对；一局技能对局里真按「升级」走了一遍（`doBF({k:'up'})`），落地后是二级、朝向摆正、装饰齐全。没看的：三升四（名将题字和翻面叠在一起的样子）、手机、低特效档。

## M21 · 10-10 · 交付 · 棋子字面（宋体十四字统一 + 年轮木面每颗不一样；银金玉的字一起换）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（d1c700b），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：审批台 art-072 选丙「年轮」（10-10 00:13），备注「纹理再深一点，三个形态有疏有密有粗有细，加旋转、翻转，随机分布，尽量每颗都不一样；炮还是靠下；务必保证所有字体统一」；art-074 退回（01:34）「马和相还是很粗，整体换一个统一的字体」；art-078 选乙「宋体」（08:13），备注写着「银、金、玉三级的字跟着一起换」。
- 换掉 M13 的「牙黄面」：木棋子改成年轮木面，色边、字色不变（汉朱 `#b3241a`、楚墨 `#1a1714`）。
- 改了哪些文件：新文件 `source/src/face.js`（美术管）。十四个字是思源宋体 TC Bold 的轮廓，直接写成路径（Path2D），**不打包字体文件、不用等字体加载**，各平台画出来一样；同一个缩放，粗细天然一致，按墨迹居中（炮不再靠下）。对外：
  - `Face.wood(g, w, s, ch, id)`：在 w×w 的画布上画整面木棋子（年轮 + 色边 + 字）。`id` 决定这颗子的年轮：三种形态（疏粗 / 密细 / 疏密相间）× 随机种子 × 随机转角 × 横竖翻转，同一 id 每次画出来一样。
  - `Face.path(ch, size, cx, cy)`：字的 Path2D（画布像素），`size` 是字面贴图边长，`cx/cy` 默认正中。珐琅字、暗子背面都用它。
- 构建顺序没加之前 face.js 不会进页面，什么都不变。

**需要 TD 做的**（我在一份拷贝上照下面改完、构建、拍过图，见文末）
1. `build.js` 第 5 行 `order`：`'core', 'board'` 中间加 `'face'`。
2. `board.js` 约 487–507 行：`faceCache` 和 `faceTex` 整段换成
   ```js
   // 木棋子字面（美术 M21：审批台 078 宋体 + 072 年轮）：画法在 face.js。每颗子的年轮都不一样，所以按棋子 id 缓存；同一 id 换了兵种（揭棋翻出来）就在原画布上重画
   const faceCache = {};
   function faceTex(s, t, id = 0) {
     const key = s + (id | 0), ch = XQ.NAMES[s][t], hit = faceCache[key];
     if (hit) {
       if (hit.ch !== ch) { const cv = hit.tex.image; Face.wood(cv.getContext('2d'), cv.width, s, ch, id); hit.ch = ch; hit.tex.needsUpdate = true; }
       return hit.tex;
     }
     const N = Core.quality === 'low' ? 384 : 512;
     return (faceCache[key] = { ch, tex: canvasTex(N, N, (g, w) => Face.wood(g, w, s, ch, id)) }).tex;
   }
   ```
   - 贴图从 14 张（每种字一张）变成每颗子一张，最多 32 张；低画质档 384、其余 512。这里用 `Core.quality` 没用 `LOWQ()`，因为 `LOWQ` 在 713 行才定义。
3. `board.js` 三处把 id 带上：`makePiece` 约 558 行、`setFace` 约 572 行 `faceTex(p.s, p.t)` → `faceTex(p.s, p.t, p.id)`；`fx.js` 约 939 行（揭棋翻子浮起的字）`Board.faceTex(p.s, p.t)` → `Board.faceTex(p.s, p.t, p.id)`。
4. `board.js` 约 548–549 行（揭棋暗子背面那个极淡的兵种字）两行换成一行：
   ```js
   g.fillStyle = red ? 'rgba(236,206,140,.075)' : 'rgba(236,206,140,.065)'; g.fill(Face.path(XQ.NAMES[s][pt], w * 0.81, c, c));   // 和字面同一套宋体，小一圈
   ```
5. `board.js` `enamelFace` 约 1113–1119 行（`const N = …` 到 `shape` 结束）换成下面，再把约 1126 行渐变那句的 `fs * 0.5` 换成 `N * 0.3`（`createLinearGradient(0, c - N * 0.3, 0, c + N * 0.3)`），其余不动：
   ```js
   const N = LOWQ() ? 256 : 384, c = N / 2, lw = N * 0.028, gp = Face.path(ch, N);   // 字形和木棋子同一套宋体、同一大小同一位置（face.js）
   const shape = (g, strokeCol, fillCol) => {
     g.lineJoin = 'round';
     if (strokeCol) { g.strokeStyle = strokeCol; g.lineWidth = lw; g.stroke(gp); }
     if (fillCol) { g.fillStyle = fillCol; g.fill(gp); }
   };
   ```
- 棋盘上别的字（中间朱印「漢/楚」、楚河汉界、头顶「殺」「-1」）这次没动，还是原来的字体。
- 我看过的（`source/art-wip/piece-face/m21_check.jpg`）：电脑 1440×900 汉、楚两边木棋子，银、金、玉三级；手机 390×844；揭棋暗子背面；揭棋翻子后贴图换对（同一 id 重画、和面上的是同一张）。十四个字和 078 送审的字模逐像素比过：墨量差 1% 以内、位置差 1 像素以内（512 的图）。没看的：低画质档（只是贴图小一档）、联机。

## M20 · 10-10 · 交付 · 动作（拒马：持矛兵压低重心挡敌，撞上掉一滴血，退开再冲）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（ae6c2f9），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-09 22:52 在对话里说「拒马需要添加动画：士兵（随着等级决定士兵数量）举着长矛，放低重心，抵御敌人，敌人撞上后会受击先掉一滴血，随后再次进攻」；审批台 art-073 选 A「三级前二后一」，备注「四级金甲的斩马刀并没有往前指」；art-075（斩马刀改成前指）通过。分镜图见审批台 073、075。
- 进攻方背对防守方的 bug Ham 已经直接找你了；下面第 3 条的「倒退着撤」顺带就是那个 bug 的修法。
- 改了哪些文件：只有本文件。要改的在 `models.js`、`squads.js`（都归你）。我的样稿在 `source/art-wip/juma/jm.js`（包了一层 `Troop.prototype.target`，能直接在页面里跑着看）。

**1. `models.js` · `Troop.target()` 的 `switch (u.pose)` 里加两个姿势**（关节含义见 `poseMatrices`）：
```js
// 拒马阵（Ham 10-09）：前腿弓、后腿蹬，身子压低侧过来，矛斜指前上方（约对着马胸），盾顶在前
case 'jmLow': set({ crouch: 0.22, lean: 0.3, twist: -0.35, sway: 0, hx: -0.35, hy: 0.25, lL: -0.74, lR: 0.74, lLz: 0.1, aW: -0.6, aWz: 0.15, wAbs: 1.24, wz: 0, aS: -1.35, aSz: 0.3, sAbs: 0.3 }); break;
// 后排（三级前二后一的那一个）：站高一点，矛从前排两人中间伸出去
case 'jmHigh': set({ crouch: 0.05, lean: 0.12, twist: -0.2, sway: 0, hx: -0.15, hy: 0.15, lL: -0.35, lR: 0.35, lLz: 0.05, aW: -1.35, aWz: 0.2, wAbs: 1.32, wz: 0, aS: -0.9, aSz: -0.25, sAbs: 0.15 }); break;
```
  - 四级斩马刀兵（`kind === 'zhanma'`）在这两个姿势上再盖三个数，刀刃才前指：`if (this.kind === 'zhanma' && u.pose.startsWith('jm')) Object.assign(J, { wz: 0.5, wAbs: 1.4, aW: -0.75 });`（放在 switch 后面）。
  - 挨撞的一下（一次性动作，加在 `switch (u.act)` 里）：`case 'jmHit': J.lean -= 0.3 * s; J.crouch += 0.05 * s; J.wAbs += 0.1 * s; J.hx += 0.25 * s; break;` —— 身子往后一挫、矛杆一沉，脚不退。用 `troop.act(i, 'jmHit', 0.3)`。
- **腿**：`update()` 每帧把 `J.lL / J.lR` 按走路重算（约 `J.lL = sw * 0.55 * walk + sit` 那一行），弓步会被盖掉。改成拒马姿势时用目标值：
```js
if (u.pose === 'jmLow' || u.pose === 'jmHigh') { J.lL += (tg.J.lL - J.lL) * kS; J.lR += (tg.J.lR - J.lR) * kS; }
else { J.lL = sw * 0.55 * walk + sit; J.lR = -sw * 0.55 * walk + sit; }
```

**2. 站位**（`squads.js`，拒马守方出场时）：二级两人并排、四级三人照现在（`lineUp`）；**三级改成前二后一**：`offsets = [[-0.15, 0.1], [0.15, 0.1], [0, -0.16]]`（+z 朝来敌），第 3 人用 `jmHigh`，其余 `jmLow`。四级三人都用 `jmLow`。

**3. 演出顺序**（`squads.js` 约 1189 行 `if (c.counter) { … }` 这一段，换成下面的节奏；时长是我分镜里定的，你按手感调）：
  1. **迎敌**（约 0.6 秒）：守方 `setPose('jmLow')`（三级后排 `jmHigh`），攻方照常冲锋。
  2. **撞上**（0.35 秒）：攻方冲到离守方中心约 0.8 的地方停住（比现在的 0.55 远一点，矛尖刚好顶到）；同一帧：守方每人 `act('jmHit', 0.3)`，血溅、木屑（你现在这几句照用）、`Cam.shake`；骑兵撞上时头马人立一下（`rearK` 0→1→0.3，约 0.4 秒），步兵、车撞上时用 `act('hit')` 往后一仰。
  3. **掉一滴血**（0.5 秒）：攻方头顶飘「−1」（用你现有的掉血飘字），脚下血圈同时少一段；攻方被顶回半步（再退 0.2）。
  4. **退开**（约 0.6 秒）：攻方**面朝守方倒退**到离守方约 1.7 的地方（不转身，`yaw` 保持冲锋方向，走路动作倒放或用慢走）。守方保持拒马姿势。
  5. **再冲**：守方回 `'ready'`，接你现在的 `att.attack(def, c)`。来犯的子只剩 1 血时照你现在的写法死在矛上，没有 4、5 两步。
- 低特效档（`fx.js` 约 613 行那套）不用跟，照旧就行。
- 我看过的：电脑 1280×720，楚骑撞汉兵二、三、四级（审批台 073、075 的图）。没看的：车、卒、象来犯的样子（只改了守方姿势，攻方动作还是你的）、手机。

## M19 · 10-10 · 交付 · 界面 + 动画（主将卡军功印：加功、花功时飞金光）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（a6f45fd），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-09 22:18 在对话里说「重新设计技能模式下的主将界面：让功勋更明显，每次增加功勋和花费功勋都能有视觉提示。做三个方案」（td-010 定了统一叫军功）；审批台 art-070 选乙「军功印」，备注「铜钱非常廉价，重新设计」；10-10 01:36 在对话里选「甲 · 金光」。能点着看的样子：https://claude.ai/artifact/3yNAo1y24qRqEBkdnqwyC8（切到「甲 · 金光」）。
- 改了哪些文件：
  1. `source/src/template.html`：两张主将卡里的 `.mer` 换了里面的结构（`.mer` 本身和 `title` 没变），样式接在 `.pcard .mer i{color:var(--k)}…` 那一行后面。新结构：`<span class="mer" title="军功"><span class="mseal"><i>3</i><s class="rp"></s></span><span class="mtx"><b>军功</b><small>满 30</small></span></span>`。你在 main.js 约 517 行用的 `bfm.querySelector('.mer i')` 照样能找到印上的数字，不用改；`.pop` 那个放大变红的效果我在样式里关掉了（动画由下面的 merit.js 管）。
  2. 新文件 `source/src/merit.js`（美术管），对外只有 `Merit.gain / Merit.spend / Merit.at`，用法写在文件开头。
- 只改 template.html、不接 merit.js 也能上：印的样子先有了，只是没有飞的动画（还是你原来的数字变化）。

**需要 TD 做的**
1. `build.js` 第 5 行 `order` 里加 `'merit'`，放在 `'bfx'` 后面、`'main'` 前面就行（它只在调用时才用 Board、Core）。
2. `main.js` 约 2341 行 `bfMerit(info)`：把原来飘 `.merpop` 的那段换成下面这样（照你那边的事件字段写的，字段名对不上的地方你改）：
   ```js
   // 军功变动：主将卡军功印上飞金光（美术 M19，merit.js；Ham 10-10 审批台 070）
   function bfMerit(info) {
     const ev = info.ev || [], at = a => (a ? Merit.at(a[0], a[1]) : null);
     const spend = { r: [], b: [] }, gain = { r: [], b: [] };
     if (info.k === 'up') spend[info.side].push([info.cost, '升级', at(info.at)]);
     { const ru = ev.find(x => x.e === 'reviveUp'); if (ru) spend.r.push([ru.cost, '召回升级', at(ru.at)]); }
     if (info.k === 'ult') spend[info.side].push([BF.CFG.ultimates.cost, '兵法', cardFor(info.side).querySelector('.fxs [data-k="ult"]')]);
     let lastKill = null;
     for (const x of ev) {
       if (x.e === 'kill') lastKill = x.at;
       if (x.e !== 'merit' || x.n <= 0) continue;
       const from = x.why === '击杀' || x.why === '哀兵' ? at(lastKill) : x.why === '过河' ? at(info.to) : null;   // 将军、每回合进账：从顶上状态条飞来
       gain[x.s].push([x.n, x.why, from]);
     }
     for (const s of ['r', 'b']) {
       const out = spend[s].reduce((a, q) => a + q[0], 0), inn = gain[s].reduce((a, q) => a + q[0], 0);
       let v = game.merit[s] - inn + out, t = 0;   // 动画开始前印上该是几
       for (const [n, why, to] of spend[s]) { v -= n; const vv = v; setTimeout(() => Merit.spend(s, n, why, to, vv), t); t += 450; }
       for (const [n, why, from] of gain[s]) { v += n; const vv = v; setTimeout(() => Merit.gain(s, n, why, from, vv), t); t += 300; }
     }
   }
   ```
   - 兵法签：卡片上终极兵法那枚签（约 525 行第二个 `chips.push`）请加一个 `data-k="ult"`，花功的金光飞向它；找不到时金光往印的正上方飞，也不会出错。
   - 一步里有好几笔（比如吃子又将军），一笔一笔排着飞，花在前、加在后。
   - **时机**：现在 `bfMerit` 在 `apply` 之后马上调，交战演出还没播，金光会比子倒下早。最好挪到演出里那个子倒下的时候（bfx 里处理 `kill` 的地方）再调对应那一笔；挪不动就先这样，Ham 看了再说。
   - 动画期间 `paint()` 把数字直接写成最后的值也没关系，merit.js 每一帧会改回来；动画结束停在你写的值上。
   - `.merpop` 的样式和 `merup` 动画用不到了，可以删。
3. 系统设了「减少动态效果」的，merit.js 不飞，直接改数字。
- 我看过的：手机 390×844、电脑 1440×900，真实技能对局里定格：平时、金光飞来、落进印里金星四溅、到账、花功变红飞走（审批台 070 的图和上面页面）。没看的：低画质档、联机时对方的卡（同一套代码，`side` 换成对方）。

## M18 · 10-10 · 交付 · 界面（大厅：电脑上联机放中间，人机 · 联机 · 本地）

- 提交：model-lab 上带这张交付单的那次提交（样式改动在前一个「进度」提交里已经放进 `template.html`）。交付前合过 `origin/dev`（b05371a），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认：10-09 23:22 在对话里说「排版：PC 版本，联机模式放在中间」；审批台 art-071 通过（23:32）。
- 改了哪些文件：`source/src/template.html` 两处，没改结构，没动 `id`：
  1. 约 589 行：三颗按钮原来按 `:nth-child(1/2/3)` 放在 25% / 50% / 75%，改成按 id 放：`#bAI` 25%、`#bHall` 50%、`#bLocal` 75%。
  2. 约 677 行：开场三颗按钮落下来的先后也改成按 id，仍然从左到右依次落（人机 1.1s、联机 1.22s、本地 1.34s）。
- 手机（≤640px）是竖排，用的是另一套样式，不受影响，联机还在最上面。DOM 顺序没变，所以键盘 Tab 的顺序还是联机 → 人机 → 本地。
- 我看过的：电脑 1440×900、手机 390×844（审批台 071 的图）。

## M17 · 10-09 · 交付 · 血条改成棋子脚下的一圈立体血段（换掉头顶的血条贴图）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（0ace9a7），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认（审批台）：art-056「倾向于光环……需要更融为一体……哪怕用光环，也需要用立体棋子」；art-059「立体光环放脚下试试呢？绿色改成低饱和度蓝色试试」；art-063「太粗了，细一点」；art-066「再细一点，血条区块之间的间隔稍微再宽一点点」；art-069 点了通过（22:30）。069 是三选一，审批台没记下选的哪个，我按和 066 原话一致的「同样细，间隔宽一点」写；Ham 要是改选，我再补一张交付单（只差两个数，见下）。
- 改了哪些文件：只有本文件。画法在 `board.js`（归你），请照下面改。

**改法**：`board.js` 约 1263 行，`if (p.lv >= 2 || kingF) { … hpTex … Sprite … }` 这一段，把头顶的贴图换成脚下一圈。显示条件不变（二级以上、帅将）。

```js
// 血条：棋子脚下贴着棋盘一圈立体血段，一点血一段（Ham 10-09 审批台 059/066/069）
const HPC = { r: 0xb8382b, b: 0x4d6c8c };            // 汉朱红、楚低饱和蓝
const hpSector = (R0, R1, a0, a1) => { const sh = new THREE.Shape(); sh.absarc(0, 0, R1, a0, a1, false); sh.absarc(0, 0, R0, a1, a0, true); sh.closePath(); return sh; };
function footRing(hp, max, s, W = 0.045, D = 0.013, GAP = 0.3) {
  const g = new THREE.Group(), R0 = 0.452, R1 = R0 + W, span = (Math.PI * 2 - GAP * max) / max;
  // 底下一圈很淡的暗影，让血段像嵌在棋盘上
  const base = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.006, R1 + 0.006, 72), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false }));
  base.rotation.x = -Math.PI / 2; base.position.y = 0.003; g.add(base);
  for (let i = 0; i < max; i++) {
    const a0 = Math.PI / 2 + GAP / 2 + i * (span + GAP), on = i < hp, bs = Math.min(0.008, W * 0.12);
    const geo = new THREE.ExtrudeGeometry(hpSector(R0 + bs, R1 - bs, a0, a0 + span), { depth: on ? D : 0.004, bevelEnabled: true, bevelThickness: on ? D * 0.4 : 0.002, bevelSize: bs, bevelSegments: 3, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    const mat = on
      ? new THREE.MeshPhysicalMaterial({ color: HPC[s], emissive: HPC[s], emissiveIntensity: 0.18, roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.18 })   // 有血：珐琅
      : new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.3, depthWrite: false });   // 掉了的：压平、半透明暗色
    const mm = new THREE.Mesh(geo, mat); mm.position.y = 0.004; mm.castShadow = on; g.add(mm);
  }
  return g;
}
```
然后原来那段改成：
```js
if (p.lv >= 2 || kingF) {
  const ring = footRing(p.hp, max, p.s);
  ring.userData.hpBar = { hp: p.hp, max }; d.add(ring);   // 还挂 hpBar，1173 行那句（不当皮肤处理）照常生效
}
```
- 尺寸都是棋子自己坐标里的（棋子半径约 0.44）：内径 0.452，宽 0.045，凸起 0.013，段和段之间空 0.3 弧度。第一段从棋子自己的 −Z 方向起排（和审批台截图一致）。
- 如果 Ham 改选另外两个：「066 原样」是 `GAP = 0.2`；「更细一点、间隔再宽」是 `W = 0.036, D = 0.011, GAP = 0.34`。
- 可以缓存：几何体只跟 `max`、第几段、有没有血有关，材质只跟阵营、有没有血有关，按这几个键存起来就不用每次 `decorate` 都新建。`hpTex` 不用了可以删。
- 拒马的十根木桩（1270 行，半径 0.5）会立在血圈上。拒马 Ham 刚让我重新设计（持矛兵），新样子出来以后一起对位置；在那之前两者叠着也看得清。
- 效果见审批台 069 的图：手机沙盘、手机俯瞰、电脑沙盘、电脑拉近。没看的：低画质档（阴影关了以后血段的立体感会弱一点，颜色照样分得清）。

## M16 · 10-09 · 交付 · 银、金棋子顶面高光收小（只改 `board.js` 里 `SK` 的四个数）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（2d92916），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认（审批台）：art-058 备注「要不还是就保持原样吧，稍微再减少一点高光面积」（20:25）；art-064 选「高光再少一点」（21:55）。
- 改了哪些文件：只有本文件。参数在 `board.js`（归你），请照下面改一行。

**改法**：`board.js` 约 704 行 `const SK = {…}` 里改四个数，其余不动：

| 键 | 现在 | 改成 | 管什么 |
|---|---|---|---|
| `domeM` | 0.2 | **0.5** | 顶面的弧度：越鼓，柔光箱映在顶面上的那块亮斑越小 |
| `boxAz` | [9, 14] | **[5.5, 8.5]** | 四盏斜上方柔光箱的方位半宽：箱子窄了，亮斑跟着窄 |
| `boxI` | [1.2, 3.0] | **[0.9, 2.3]** | 柔光箱亮度 |
| `zen` | 2.4 | **2.0** | 天顶灯亮度 |

改完是这一行：
```js
const SK = { boxAz: [5.5, 8.5], boxEl: [33, 39, 51, 56], boxI: [0.9, 2.3], zen: 2.0, domeM: 0.5, anisoTop: 0.16, envS: 0.9, envG: 0.82, jade: 'yun' };   // 顶面高光约为原来的一半（Ham 10-09 审批台 064 选「高光再少一点」）；白玉用云纹
```
- 效果（审批台 064 的图）：顶面亮的那块只剩原来一半左右，其余是稍暗的金属色，车削纹看得更清楚；金更沉，银偏灰一点。字、侧面回纹、口沿都没变。
- **白玉**：影棚环境图是三种材质共用的，所以白玉的反光也会弱一点点。我对比过（四级白玉，原来 / 改后），肉眼几乎看不出差别，白玉不用单独处理。Ham 在 064 里说过白玉不动；你要是想做到一模一样，可以给白玉单独留一张旧参数的环境图。
- 浏览器里有人用过 `Board.skinTune` 调参、存进了 `localStorage('xq3d-sk')`，会盖掉新默认值。正式玩家不会有这个键，只是提醒你自己测的时候清一下。
- 我看过的：手机 390×844，二级银、三级金、四级玉，近看汉、楚两条底线和整盘（审批台 064 的图，加上一组白玉对比）。没看的：电脑上的大屏、低画质档。

## M15 · 10-09 · 交付 · 界面（房间观战席：点名牌坐过去、点空座位坐回来，观众叫农夫、樵夫）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（4c6b5ab），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认（审批台）：art-053 选 B「不用按钮，点座位」（18:32），备注「出几个方案看看，观众名就叫农夫，樵夫啥的就行」；art-057 选甲「名牌」（20:19）。
- 改了哪些文件：`source/src/template.html`（观战席的样式，接在 `#lobby .seat small b` 后面）、本文件。没改结构，没删、没改名的 `id`。

**样子我已经放好**（`#pWait .specs` / `#roomSpecs` 下面的 `<i>`），需要 TD 在 `paintRoom()`（main.js 约 2996 行）里按下面拼：
- 每个观众一块：`<i>农夫</i>`。前面的圆点是 CSS 画的，不用写。
- 自己（在观战席上的人）那块加 `me`：房主写 `<i class="me">你（房主）</i>`，别人写 `<i class="me">你</i>`；实心米底、圆点朱红。顺序：自己排第一个。
- **房主坐在座位上时**，最后多一块虚线的空位：`<i class="open" data-sit tabindex="0" role="button">坐这里</i>`，点它（或回车）就坐到观战席。只有房主看得到这一块。
- 名牌下面一行小字：`<span class="tip">…</span>`，放在 `#roomSpecs` 后面、`.specs` 里面。房主在座位上写「点这里就坐过来」；房主在观战席写「点红方空座位坐回去」（房主执黑就写「黑方」）；客人不写。
- 没有观众、也没有「坐这里」时，`#roomSpecs` 里照旧写「暂时没有观众」（纯字，不套 `<i>`）。

**点座位（053 选 B，「去观战席」按钮不要了）**——逻辑是你的：
- 房主点「坐这里」→ 坐到观战席，他原来的座位空出来：大字「空位」、小字「**点这里坐回** · 先手」（执黑就没有「先手」）；这块空座位点一下就坐回去。空出来的座位别人能坐、也能加人机，和 053 图里一样。
- 房主在观战席还是房主：能加人机、能开始；两个座位都有人（或电脑）时点「开始」，他在旁边看。`#waitNote` 写「你在观战席。两个座位都有人（或电脑）时，点「开始」开局」。

**观众的名字（Ham 053 备注）**：按进房间的先后，依次叫 **农夫、樵夫、渔夫、牧童、书生、货郎**，再往后从头再来、加「二」「三」（农夫二、樵夫二……）。名字由房主那边发、大家看到的一样；观众走了名字空出来，下一个进来的先用空出来的那个。名单 Ham 在 057 里说过可以改，改了我再告诉你。

- 我看过的：手机 390×844、电脑 1480×1000，房主在座位上 / 坐到观战席两种（审批台 057 的图）；交付前用真实样式又截了一遍，和图里一样。
- 没看的：真的有人进出时的刷新（逻辑是你的）；名字很长时会换行，不会出框。

## M14 · 10-09 · 交付 · 界面 + 模型（本地双人「视」两档、房间里人机座位的字、档位下拉、棋盘上项羽的卜字戟）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（4c6b5ab），`node build.js` 能过，`test/*.test.js` 全过。
- Ham 确认（审批台）：art-045 选 A（16:47）、art-046 通过（16:51）、art-047 选甲（17:40）、art-048 选 A（17:42）。
- 改了哪些文件：`source/src/template.html`（`#viewTag` 里加一排、房间下拉的样式）、`source/src/models.js`（`makeHero` 里项羽的兵器，另加 `buBlade()`）、本文件。
- 新的结构：`#viewTag` 里第二个 `.row`：`<div class="row lc"><span data-l="flip" class="flip">换边</span><span data-l="free">自由视角</span></div>`。`#roomAILv`、`#roomAI2Lv` 去掉了行内 `style`，加了 `class="lvsel"`。没删、没改名的 `id`。

**1. 本地双人「视」两档（art-045 选 A）**——样式和结构我放好了，需要 TD 接：
- 本地双人时给 `#viewTag` 加 `lc`（三档那一排自动藏起来，换成「换边 / 自由视角」这一排），离开本地对局时去掉。
- 按「视」在两档间切：给 `.row.lc span` 里 `data-l` 等于当前档的那个加 `on`；`#viewTagS` 写说明——换边「轮到谁下，棋盘就转到谁那边」，自由视角「不自动转，自己拖着看」；`#viewTag` 亮 1.5 秒，和联机那三档一样。
- 默认是「换边」（你 H21 说的自动翻转那套逻辑）。**每回合自动转过去的时候不亮提示**，只有按「视」才亮（Ham 选的 A）。
- 「换边」选中时名字后面有个转圈的小图标（CSS 画的，`span.flip.on::after`），不用脚本管。

**2. 房间里人机座位的字（art-047 选甲）**——要改 `main.js` 拼座位那一行（`paintRoom()` 里的 `seat()`，约 2990 行）：
- 现在大字写「人机 · 校尉」，五个字在电脑上的圆圈里放不下。改成：**大字只写档位**（新兵 / 校尉 / 霸王），**小字写「人机 ★★」**，星星和人机对战选档那页一样（新兵 ★、校尉 ★★、霸王 ★★★）。
- 参考写法：
  ```js
  const STAR = { easy: '★', mid: '★★', hard: '★★★' };
  const who = ai ? (LV[ai] || '人机') : taken ? (mine ? '你' : hostSeat ? '房主' : '对手') : '空位';
  const st = ai ? `人机 <span class="st">${STAR[ai] || ''}</span>${ai2 ? ' · 房主观战' : ''}` : hostSeat ? '房主' : !taken ? '等待对手…' : room.ready ? '<b style="color:#2f7d4f">已准备</b>' : '还没准备';
  // 外层 div 的 class 在 ai 时多加一个 ' ai'（现在没有专门的样式，留着以后用）
  ```
  房主把自己的座位也交给电脑（`ai2`）时那一边同样这么写，小字是「人机 ★★ · 房主观战」。手机上座位是方框，不出框，字跟着一起变。

**3. 档位下拉（art-048 选 A）**——我已经改完，不用接：
- 收起的样子和旁边的方框按钮一样（方角、2px 米色边、粗宋、右边一个折角箭头），手机 44px 高、电脑 58px 高，和按钮对齐。
- Chrome 135 以后（`appearance: base-select`）展开的列表也换了：墨底米字、当前档朱红、指上去米底墨字。别的浏览器（苹果的 Safari 等）收起的样子一样，点开还是系统自带的列表（苹果是滚轮）。
- 顺手把 `#lobby select` 那条通用样式（带 `!important` 的）排除了 `.lvsel`，不然箭头会被它的 `background:none!important` 抹掉。
- Ham 在 048 的备注里又提了一件新事：「联机大厅需要有观战席，房主也可以自主选择移动到观战席上。」这个我先出样子放审批台，定了另交。

**4. 棋盘上的项羽换成卜字戟（art-046 通过）**：
- `models.js` 的 `makeHero('xiang')`：原来两片月牙刃（方天画戟）换成秦汉的卜字戟——顶上直刺、一侧横出一刃（援），刃根顺杆下垂（胡），杆头一节铜銎，红缨挂在銎下。握点、动作都没动。新加 `buBlade()`，`jiShape()` 还留着（兵卒的戟在用）。
- **改了 `makeXiangYu`，按 H20：请重跑 `tools/faces.py` 重画大厅里的项羽头像**（头像里能看到戟头）。
- 我看过的：棋盘项羽正面、侧面、斜看（审批台 art-046 的图）。没看的：攻击动作里挥戟的那几帧。

- 我看过的（界面）：手机 390×844、电脑 1440×900，房间页加人机前后、下拉展开；本地「视」两档（审批台 045、047、048 的图）。改完以后用真实样式又截了一遍。
- 没看的：本地换边的手感（逻辑是你的）；苹果手机上下拉点开的样子。

## M13 · 10-09 · 交付 · 木棋子换成「牙黄面加色边」（手机上汉方看得清）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（4db9f8c），`node build.js` 能过，`test/*.test.js` 全过。**这次没改任何代码文件**，只有本文件：要改的是 `board.js` 的 `faceTex`，不在 H14 放给我的那几处里，所以请你照下面的代码换。
- Ham 确认：他 14:30 发手机截图说「木棋子颜色太深了，移动端汉方看不清楚，调整一下。出三个方案」。art-037 他先选了象牙面，但担心和白玉太像；我把象牙面、牙黄面加色边、漆身木面和白玉、乌银、錾金放一起截图（art-040），他 16:14 选了 **B · 牙黄面加色边**。
- 只换一级（木）棋子的字面：常规、揭棋翻开后、技能模式一级都用 `faceTex`，一起变。棋身侧面的木纹、金色腰线、揭棋暗子的漆背都不动。二、三、四级（银、金、玉）不动——Ham 同时说「现在的金色和银色和其他棋子有点风格不搭，各做三个方案」，我在做，定了另交一张。

**需要 TD 做的**
1. `source/src/board.js` 约 488 行，把 `faceTex(s, t)` 整个换成下面这段（缓存、`canvasTex`、`FONT` 都是原来的，没有新接口）：
   ```js
   function faceTex(s, t) {
     const key = s + t;
     if (faceCache[key]) return faceCache[key];
     const ch = XQ.NAMES[s][t];
     const col = s === 'r' ? '#b3241a' : '#1a1714';   // 汉朱、楚墨
     return (faceCache[key] = canvasTex(512, 512, (g, w) => {
       g.clearRect(0, 0, w, w);
       const c = w / 2;
       const ring = (r, lw, color) => { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); };
       // 牙黄面：左上略亮，往外渐深
       const gr = g.createRadialGradient(c * 0.8, c * 0.75, 10, c, c, w * 0.48);
       gr.addColorStop(0, '#f1e4c0'); gr.addColorStop(1, '#e6d3a4');
       g.fillStyle = gr; g.beginPath(); g.arc(c, c, w * 0.47, 0, 7); g.fill();
       // 色边：外圈一道粗边 + 里面一道细圈，和字同色
       ring(w * 0.47, 14, col); ring(w * 0.452, 10, col); ring(w * 0.372, 5, col);
       // 字：粗楷，不描边、不加阴影（牙黄底上已经够清楚）
       g.font = `bold 310px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
       g.fillStyle = col; g.fillText(ch, c, c + 16);
     }));
   }
   ```
   和原来比：去掉了联珠纹、金色描边和字的阴影；面整块铺牙黄（原来是透明的，露出木纹）；红字从 `#a3241a` 提到 `#b3241a`。
2. 字面材质 `roughness: 0.5` 不用改。
- 我看过的：手机 390×844 全盘（常规开局，汉楚两边），和象牙面、漆身、白玉、乌银、錾金并排对比（审批台 art-040 的图）。
- 没看的：电脑宽屏；揭棋翻开时浮起来的字印（`fx.js` 约 939 行也用 `Board.faceTex`，会变成一整块牙黄圆片带色边，比原来透明底更醒目，我觉得可以，你过一眼）。代码就是我截图用的那段，换上去应该一样。

## M12 · 10-09 · 补充：升级确认框（M9 第 2 条），Ham 定了召回良将后那一步也要弹

- Ham 10-09 16:13 问「棋子升级确认并附带说明弹框为什么没更新？」，我答：样式和结构在 M9 里，开框的脚本你那边还没接（H15、H18 都写着没接），在等「召回良将后要不要也弹」。他 16:16 回：「也要弹窗确认」。
- 所以两处都弹，没有要等的了：
  1. **普通升级**（技能栏 `data-a="up"`）：照 M9 第 2 条——点了先开 `#mUp`，`#upGo` 才 `doBF({k:'up', at: sel})`，`#upNo` 关掉什么都不做。
  2. **召回良将落位后的「升 X 级」**（`data-a="rvUp"`，`main.js` 约 1900 行）：点了也先开 `#mUp`，填法一样——`#upFrom` 写被召回那枚子现在的称号和等级，`#upTo` 写升到 `o.upLv` 级后的称号；`#upTbl` 列这两级的血量、攻击（涨了的格加 `gain`）；`#upNew` 列新解锁的技能；`#upCost` 写「花费 N 军功，升完还剩 M」，有半价时在后面加「（召回半价）」。点 `#upGo` 才走你现在 `rvUp` 那段提交；点 `#upNo` 关框，回到「升级 / 结束回合 / 重选」那三个按钮，什么都不提交。
- 这条没有改文件，弹框的样子就是 art-027/029 里 Ham 看过的那版（涨了的格是绿色 ▲）。

## M11 · 10-09 · 交付 · 界面（落子提示挪位置、视角三档的切换提示）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`，`node build.js` 能过，`test/*.test.js` 八个全过。注意：GitHub 上的 `origin/dev` 还停在 H14（00:06），你后来上线的改动（H15–H19，包括你加在 `template.html` 里的 `LD` 那段脚本）我这边拿不到，所以没合进来。我这次只改了 `#toast` 那一条样式，又在 `<div id="toast">` 后面加了一个 `#viewTag`，合并时冲突应该很小。
- Ham 确认：他 14:30 在美术这边发手机截图说「这段话太长了，改成：再次点击确认落子；然后这个框太挡视线了，最好放棋盘上方空的地方，或者放楚河处」「视角需要有两个选择，按第一下是现在的，按第二下是顶视图，按第三下是顶视图加锁定，这三个选项你分别起三个名字。切换的时候显示」。审批台 art-035 他选「甲 · 棋盘上方」（14:52），art-036 三档名字和提示样式通过（14:51）。
- 改了哪些文件：只有 `source/src/template.html`（`#toast` 样式、新加 `#viewTag`）和本文件。
- 新 `id`：`#viewTag`、`#viewTagS`；`#viewTag .row span[data-v="0|1|2"]` 三个名字写死在结构里。没删、没改名的。

**需要 TD 做的**
1. **提示的字**：`main.js` 约 1355 行 `toast('再点一次这个落点，确认落子', 1800)` 改成 `toast('再次点击确认落子', 1800)`（Ham 定的原话）。技能模式里还有一句 `'再点一次落点，或点「确定」落子'`（约 1484 行），要不要一起改短 Ham 没说，我在审批台问过、他没答，先不动。
2. **提示框的位置**：`#toast` 现在 `top: var(--below-status, 30%)`，样式也改成一行小字（15px、内边距小）。请在 `layoutHud()` 里算完 `sr = $('status').getBoundingClientRect()` 之后加一句 `document.documentElement.style.setProperty('--below-status', (sr.bottom + 10) + 'px')`；离开对局（`#hud` 藏起来）时 `removeProperty('--below-status')`，大厅里的提示就回到原来的 30%。三种布局（手机、窄屏卡片右边、电脑顶上居中）都按 `#status` 的底边走，不用分开写。这个框全游戏共用，挪了以后别的提示也在这里出，Ham 选的时候知道。
3. **视角三档**（`#tView`）：每按一下换一档，循环 0 → 1 → 2 → 0。
   - 0「沙盘」：现在的斜视角（`phi` 0.72 那套），能转、能拖、能缩放，和现在一样。
   - 1「俯瞰」：顶视图——`phi` 压到接近 0（比如 0.001，正 0 时 `lookAt` 会翻），`theta` 回 `homeTheta`，`radius` 按能看全整张棋盘重新算；能拖、能缩放，不能转（转了就不是顶视图了）。
   - 2「定盘」：同样的顶视图，**锁住**：拖、缩放、转都不响应（`orbitInput` 里按这档直接 return；点棋子、走子照常）。
   - 切换时显示提示：给 `#viewTag .row span` 里 `data-v` 等于当前档的那个加 `on`、其余去掉；`#viewTagS` 写这一档的说明（三句依次是「斜着看，能转、能拖、能缩放」「从正上方看，能拖、能缩放」「从正上方看，锁住不动」）；`#viewTag` 加 `on`，约 1.5 秒后去掉。位置也是 `--below-status`，和提示框同一处。
   - 记不记住上次选的档（`store`）你定，我建议记住。
   - 本地双人模式里「视」原来是换边看；改成三档以后换边放在哪，请你跟 Ham 定，我这边没设计换边的提示。
- 我看过的：手机 390×844 和电脑 1440×900，提示框在「红方（汉）走棋」下面、视角提示「定盘」那档（截图在审批台 035、036）。电脑上用真实样式截时，无头浏览器里渐显动画走得太慢，截到的是透明的；位置是对的（量出来在 `#status` 底边下 10px），这是截图环境的问题，不是样式。
- 没看的：真机上切换三档的手感（相机逻辑是你的）。
- 还在等 Ham 的：木棋子配色（art-037 他选了象牙面，但担心和白玉太像，art-040 在等他对比后定），定了另交一张。

## M10 · 10-09 · 放行：M8、M9 可以上线

- Ham 10-09 11:08 在美术这边说：「已通过的东西可以提交给TD，并让他可以发布了。」所以 M8（落子虚影）、M9（10-09 一批界面）合并后直接部署上线，不用再等他点头。
- M9「需要 TD 做的」1–5 条是要接脚本的。没接上的那几样只是不出现，不会坏：`turnglow.js` 不进 `order` 就不打包；`#mUp` 没人打开就一直藏着（升级照旧一点就升）；`#netSig` 默认 `hidden`；`#loading` 不加 `real` 就是原来那条来回走的光。所以接不完的可以先上其余的，在你的回复里写一下哪条还没接。
- 这条没有改文件。

## M9 · 10-09 · 交付 · 界面（10-09 一批：半场闪烁、信号格、加载进度、升级确认、字号固定、技能栏等）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`，`node build.js` 能过，`test/*.test.js` 八个全过。
- Ham 确认（都在审批台上，备注原文照录）：art-021 半场闪烁通过；art-024 信号格通过；art-025 悬停小字 + 设置页签通过；art-026 字号固定通过（022 的意见「实在不行不让字体匹配手机字体设置，强制一个大小」）；art-019→art-027「上涨的三角形改成绿色」→ art-029 通过；art-023「不要有圆形，就只要有进度条就好了。百分比去掉；进度条下的字体只要有研墨铺纸就好了」→ art-029 通过（10-09 10:19）。
- 改了哪些文件：`source/src/template.html`、新文件 `source/src/turnglow.js`、`source/fonts/songhei-subset.woff2` + `songhei-chars.txt`（补了「涌」等几个字）、本文件。脚本只动了 `board.js` 里 H14 指给我的那几处（见 M8）。
- 新 `id` / `data-*`：`#netSig`、`#loadBar`、`#mUp`、`#upT`、`#upFrom`、`#upTo`、`#upTbl`、`#upNew`、`#upCost`、`#upNo`、`#upGo`；设置里新一行 `.seg[data-s="turnfx"]`。没有删、没有改名的（`#loadTxt`、`#netDot` 都还在）。结构变动：`#loading` 里面多包了一层 `.ld`（进度条和字都在里面）。

**需要 TD 做的**
1. **半场格线闪烁**（`turnglow.js`）：`build.js` 的 `order` 里加 `'turnglow'`，放在 `'board'` 之后（它建时要读 `Board.TOP / HALF / X / Z`）。设置默认 `S.turnfx = store.get('turnfx', 'wave')`，并加进 `applySettings` 存盘的那串键里（设置里那一行 `bindSeg` 会自动接上）。轮到谁变了、读秒节拍变了时调 `TurnGlow.set(side, S.turnfx, beat)`：`side` 和头像牌 `.active` 同一个条件（`started && !game.result ? game.turn : null`），`beat` 就是你给 `.pcard.hurry` 设的 `--beat` 秒数，不在读秒时传 0。重复调用相同参数没开销。Ham 定的默认是我建议的「涌动」（他通过时没改）。
2. **升级确认弹框**（`#mUp`）：技能栏点「升 X 级」（`data-a="up"`）先开这个框，点 `#upGo` 才 `doBF({k:'up', at: sel})`，点 `#upNo` 关掉什么都不做。填法：`#upFrom`「汉轻车 · 二级」、`#upTo`「汉武刚车 · 三级」（`BF.RANK_CN[s][t][lv-1]` 和 `[lv]`）；`#upTbl` 写 `<thead><tr><th></th><th>现在</th><th>升级后</th></tr></thead><tbody>` + 每项一行 `<tr><th>血量</th><td>2</td><td class="to gain">3</td></tr>`（涨了才加 `gain`，会显示绿色 ▲），我截图用的是血量、攻击两行（`BF.levelInfo(t,s,lv)` 和 `lv+1`）；`#upNew` 每个新解锁的技能一个 `<li><b>冲阵</b>说明</li>`（`SKILL_CN`、`SKILL_DESC`），没有就留空（会自动藏起来）；`#upCost`「花费 6 军功，升完还剩 2」。召回良将后那一步「升三级 / 结束回合 / 重选」要不要也弹，我问了 Ham，他没答，先不弹。
3. **字号固定**：样式里已经 `text-size-adjust:100%`（苹果的微信、QQ 内置网页靠这个放大，钉住了），并且所有 `font-size` 都乘了 `var(--fs,1)`。安卓 App 内网页（`setTextZoom`）样式拦不住，要你在开局量一下：放一个 `font-size:100px` 的探针 span，读 `getComputedStyle(span).fontSize`（或量它的宽度和画布 `measureText` 比），得到放大倍数 `r`；`r > 1.01` 就 `document.documentElement.style.setProperty('--fs', 1 / r)`，`resize` / `visibilitychange` 时重量一次。微信安卓再加一段：`WeixinJSBridge.invoke('setFontSizeCallback', {fontSize: 0})`，并 `WeixinJSBridge.on('menu:setfont', …)` 里同样设回 0（`WeixinJSBridgeReady` 之后）。另外 `main.js` 里有两处行内字号（棋谱「尚未落子」13px、技能栏 `small` 12px）不吃 `--fs`，要么改成 `calc(13px * var(--fs,1))`，要么挪进样式。我没有安卓真机，这条上线后请 Ham 找反馈的玩家看一眼。
4. **加载真实进度**：样式和结构好了，脚本要做两件事。①下载进度：`build.js` 把页面切成几段，每段前插一个 `<script>LD(0.xx)</script>`（数字是那一处在整个文件里的字节位置 ÷ 总字节数）；现在最大的一块是 5.8 MB 的那段数据脚本，最好拆成 0.5 MB 左右一小段，进度才走得匀。`LD` 定义在 `#loading` 后面紧跟的一小段脚本里：`function LD(p){var L=document.getElementById('loading');L.classList.add('real');L.style.setProperty('--p',Math.min(.9,p*.9))}`——下载占 0～90%。②下载完到开局前的准备（字体、着色器预热那 90 帧等）占最后 10%，`main.js` 在移除 `#loading` 之前分一两步把 `--p` 推到 1。`#loadTxt` 一直是「研墨铺纸…」，不要写别的字（Ham 定的）。没加 `real` 之前是原来那条来回走的光。
5. **信号格**（`#netSig`）：给它加 `lv1`（白，有点慢）/ `lv2`（黄，较差）/ `lv3`（红，很差或断开，会闪）之一，信号好就 `hidden`。我建议：对方的心跳晚到 3 秒以上 `lv1`、6 秒以上 `lv2`、线路断开或 9 秒没音信 `lv3`（9 秒是现在判对手掉线的线）；你那边能量出延迟的话按延迟分也行。有了它以后 `#netDot` 可以不再显示。它挂在 `#status` 左边，`#status` 不显示时它也跟着不显示。
6. 只动样式、不用接的：技能栏可用按钮的朱线不再外扩（相邻按钮的框不撞了），按钮间距 10px，手机上技能栏和「本回合还未使用技能」整体上移 2px 让开朱框；轮到谁的朱框改成 3px、留 3px 缝；电脑大厅棋子悬停时下面的说明小字不动；设置页签选中改墨底米白字；工具栏「譜 視 設」改「谱 视 设」（`main.js` 里更新说明和注释提到「視」「設」「譜」的地方是旧条目，我没动，你看要不要改）。

- 我看过的：电脑 1440×900、手机 390×844（部分 360×640），本地技能模式实机：半场闪烁两种、设置面板三页、技能栏四种状态、升级弹框两种兵、信号格三档、加载页三个状态（加载页是对局中把 `#loading` 重新插回去拍的）、悬停。字号是用把 `--fs` 设成 1.6 模拟的。
- 没看的：联机实况下的信号格（判定是你的）、真实读秒时的闪烁节拍、安卓/微信真机字号、加载页在慢网下真实走的样子。
- 想让 Ham 定的：召回良将后的升级要不要也弹确认框。
- 不在这次交付里：之前 model-lab 上以「进度：」存过一个 `source/src/ferry.js`（终局的渡船和亭长），Ham 还没通过、要重做，这次提交把它从分支上删了，合并时 `dev` 上不会多这个文件。

## M8 · 10-09 · 交付 · 界面（落子虚影）

- 提交：同上（和 M9 同一次提交）。
- Ham 确认：H14 派单；第一版 art-020 他打回：「兵种模式下，走棋的虚影应该是兵种模型的虚影；走不了的棋子或模型再红一点；提交动态给我审核」；改后 art-028（动图）10-09 09:11 通过。
- 改了什么（只动了 H14 指给我的 `board.js` 那几处，对外接口没变，`main.js` 不用动）：
  1. 虚影 = 选中的那枚棋子照原样复制（木身、字面、金边、棋子款式装饰都在），材质一律**克隆**再半透明（你提醒的 `clearMoves` 释放问题照顾到了）。待确认的一直呼吸：透明度在原来的约 0.32～0.72 倍之间，1.6 秒一下；容器被清掉时 `Core.onFrame` 跟着停。
  2. 走不了：同样的虚影，颜色往朱红拉七成、再加一层红色自发光；快速呼吸一下，约 1 秒淡出（原来 0.7 秒直接消失）。
  3. 兵种模型模式：在落点另立一队同兵种、同等级、同朝向的兵马（`Squads.make`，运行时取全局 `Squads`），先跑一帧 `updaters` 让各部件站到位，旗子去掉，描墨边的那层（背面外扩）隐藏（半透明时会从身体里透出来、整队发黑），其余材质全换成半透明克隆。虚影容器被 `clearMoves` 清掉或红色虚影播完时，`userData.drop()` 把这一队 `dispose` 掉、克隆材质释放。
- 需要 TD 做的：合并、部署（上线等 Ham 点头）。`board.js` 我只改了 H14 那几处；你那边如果在这期间又动过那几处，合并时以我这版的 `ghostOf` / `flashBad` / `squadGhost` 为准。
- 我看过的：电脑、手机，标准模式和兵种模型模式，待确认和走不了两种（炮），动图在 art-028。没看特效档「低」下的实况（虚影不跟特效档走）。

## M7 · 10-06 · 交付 · 界面（轮到谁走的粗线）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`，`node build.js` 能过，`test/*.test.js` 八个全过。
- Ham 确认：10-06 00:44 他提的需求——“轮到谁下的时候，他的头像框旁边会多一圈粗线。粗线不会一直存在，比如开局喊话，或结束时就会消失。倒计时时，粗线会随节奏闪烁，越来越快。”我出了三版（审批台 art-016，能动的演示页），他 01:26 选了「一 · 朱框」；做进游戏后的实机截图在 art-017，他 01:39 在聊天里说“提交吧”。
- 改了什么（只有 `template.html` 里「对局界面」那段样式）：
  1. `.pcard` 加了一圈透明的 `outline:5px`、`outline-offset:5px`；`.pcard.active` 时变成朱红，出现时有 0.28 秒从外往里收拢的动作（`@keyframes tlIn`）。
  2. 原来 `.pcard.active` 紧贴着牌的那圈 4px 朱红 `box-shadow` 去掉了，换成上面这圈留缝的粗线。
  3. 新加 `.pcard.active.hurry`：粗线按 `--beat`（秒）一亮一暗（`@keyframes tlBlink`，`steps(1)`，硬切不渐变）。不设 `--beat` 时一秒一下。
  4. `prefers-reduced-motion` 时不收拢、不闪，只常亮。
- 改了哪些文件：`source/src/template.html`、`source/docs/collab/ui-shots/m7_turnline.jpg`、本文件。没碰脚本。
- `id`、`data-*`、class：没有删、没有改。新约定一个 class `hurry` 和一个变量 `--beat`，都加在头像牌 `.pcard` 上，由脚本设。
- **需要 TD 做的**（脚本里，Ham 要的“倒计时闪、越来越快”现在还不会发生，接上才有）：
  1. 读秒时给走棋那一方的牌加 `hurry`，其余时候去掉。建议直接跟 `updateHud` 里现成的 `urgent` 走：`c.classList.toggle('hurry', !!urgent && urgent.side === s)`——这样暂停、演出中、断线时也自动不闪，和中间的大字一致。
  2. 同时设节拍：`c.style.setProperty('--beat', (0.26 + 0.074 * urgent.sec).toFixed(2) + 's')`。这是 Ham 在演示页上看过的节奏：剩 10 秒时 1.00 秒一下，剩 5 秒 0.63 秒，剩 1 秒 0.33 秒。每秒改一次 `--beat` 会让动画从头起一拍，我在演示页上就是这么做的，看着是正常的加速。
  3. “开局喊话时不显示”：现在 `active` 的条件是 `started && !game.result && game.turn === s`，我实机看过开场喊话时两张牌都没有 `active`，终局后也没有，所以这两条不用改。**但对局中途的演出**（技能演出、将军、终局演出开始到 `game.result` 落定之间）粗线现在是亮着的。Ham 的原话只举了“开局喊话、结束时”两个例子，中途要不要灭我没问他；你觉得该灭的话，在 `active` 的条件里加上 `!busy && !Ending.running` 之类，或者问他一句。
  4. 合并、部署；上线等 Ham 在你那边点头。
- 我看过的：本地技能模式，电脑 1440×900、手机 390×844——开场喊话（无粗线）、轮到红方（常亮）、手动加 `hurry` 后暗下去的一瞬。图：`ui-shots/m7_turnline.jpg`（左电脑，中手机常亮，右手机闪烁暗的一瞬）。
- 没看的：联机、观战、人机思考中、横屏矮屏（`.pcard` 有 `transform:scale(.86)`，粗线会跟着缩）、对手那张牌亮起来的样子、真实读秒。
- 已告诉 Ham 的两处挤：牌离屏幕边 12px，粗线伸出去 10px，离边只剩 2px；手机上「我方」牌的粗线下沿贴近底下那排工具按钮。他看图后没提意见。
- 测试：`test/*.test.js` 八个全过（`bfai.test.js` 在我这台机器上要跑两三分钟）。
- 想让 Ham 定的：上面第 3 条里“对局中途的演出要不要灭”。

## M6 · 10-06 · 交付 · 界面（iPhone 适配）

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`，`node build.js` 能过，`test/*.test.js` 八个全过。
- Ham 确认：10-06 00:04 他发来三张 iPhone 实机截图（从主屏幕图标打开的）——对局中屏幕顶上状态栏那一条是空的朱红色，大厅顶上反而是灰色，「玩法」一行的说明文字顶出了画框。改完后在审批台 art-015 说明，他 00:37 在聊天里说“通过了，提交吧”。
- 改了什么：
  1. **`<head>` 里加了一行** `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`。原来只有 `apple-mobile-web-app-capable`，没写状态栏样式，所以从主屏幕图标打开时 iPhone 在顶上留一条、自己上色，取到的颜色还是错的。加了之后状态栏透明，页面画到屏幕最顶上，时间和电量浮在画面上。各处顶部本来就按 `--safe-t` 留了位置（大厅、头像牌、状态条、棋谱、设置面板等）。
  2. **新加一个元素 `<div id="eTint"></div>`**（紧跟在 `<canvas id="gl">` 后面）和一段样式「iPhone 顶上那一条的颜色」：给“在 Safari 里直接打开”的人用的。iOS 26 的 Safari 不看 `theme-color`，自己从贴着屏幕上边的固定定位元素取色给状态栏上色。`#eTint` 是一条永远在最上层、贴着上边的细条，专门给它取色：大厅 / 加载页 / 设置 / 整页式弹窗 / 终局卡片显示时是朱 `#a8281c`，其余（对局中）是墨 `#141311`；`html`、`body` 的背景色同步，作为后备。高度是 `min(14px, var(--safe-t))`，没有安全区的设备上高度为 0；`@media (display-mode:standalone)` 下 `display:none`（主屏幕打开时页面自己画到顶，不需要它）。
  3. 手机竖屏：二级页面顶上「技能新象棋 / 返回」那一行从 84 压到 60 像素；主界面顶栏同样。
  4. 手机竖屏和设置面板：选项标签 `.opt .lbl` 允许换行，小字说明不再顶出右边画框（Ham 截图里「玩法」那行 `#varNote` 的“技能模式：升级、生命值、兵种技能与主帅兵法”）。
- 改了哪些文件：`source/src/template.html`、`source/docs/collab/ui-shots/m6_iphone_sim.jpg`、本文件。没碰脚本。
- `id` 和 `data-*`：新加一个 `id="eTint"`，没有删、没有改。
- **我验证不了的（重要）**：我没有 iPhone，上面第 1、2 条都是按资料做的，没在真机上看过。
  - 第 1 条：据我了解，iOS 是在“添加到主屏幕”的那一刻记下状态栏样式的，旧图标不会自动更新。我已经告诉 Ham：上线后要把桌面图标删掉重加一次（重加后图标名也会从「楚汉·三维象棋」变成「技能新象棋」）。
  - 第 2 条：资料说 Safari 取色有时不及时（Ham 截图里大厅灰、对局红，像是取到了上一个画面的颜色）。如果上线后在 Safari 里颜色还是跟不上，可能需要你在脚本里补一手（比如进出对局时动一下 `#eTint` 逼它重新取色），到时我们再看。
  - 状态栏透明之后，请留意对局中有没有东西被状态栏或灵动岛挡住：我核过用了 `--safe-t` 的有 `#cardOpp`、`#status`、`#netbadge`、`#log`、`#bubOpp`、`#updBar`、`#bfDebug`、大厅各页、`#mSet`、`.e-m`；**没用的**有 `.cinebar`（本来就该盖到顶）、`#endcard`（内容居中，边框 inset 18px，在灵动岛机型上顶边那条线会从状态栏文字后面穿过）、`#banner`、`#verse`。`#endcard:before` 的顶边要不要让开安全区，等 Ham 实机看了再说。
- 需要 TD 做的：合并、部署；上线仍等 Ham 在你那边点头。他这次在我这边说的是“通过了，提交吧”。
- 想让 Ham 定的：无。
- 图：`ui-shots/m6_iphone_sim.jpg` 是我把 `--safe-t` 强行设成 59px、再在顶上画一条色带**模拟** Safari 的样子拼的，不是真机，也不是主屏幕打开的样子（主屏幕打开时顶上没有那条色带）。
- 参考：<https://1ar.io/updates/safari-26-liquid-glass-web/>、<https://github.com/joe-bell/skills/pull/6>

## M5 · 10-05 · 交付 · 界面（第二批：对局界面和其余弹窗）

> **10-05 23:34 Ham 在我这边说：“通过了，你发布完以后通知 td。”** 我发布不了，这张交付单就是通知：M5 他已经点头，请合并、过一遍界面后部署（上线前要不要再让他看一眼，按你们的规矩）。
> 另外新加了一份 `source/docs/UI-DESIGN.md`：这套界面的规矩速查（七条规矩、颜色和字、两种屏幕、三种弹窗、结构约定）。以后你那边加按钮、加弹窗请照它来；完整的设计阐述文档在 Ham 手里。

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`，`node build.js` 能过，`test/*.test.js` 八个全过。
- Ham 确认：10-05 22:07 他说对局界面和其余弹窗“也要换成新大厅那套设计”。这批没先画稿，直接做进页面截实机图给他看（审批台 art-014）。他 23:08 打回两处——玩法说明 / 更新说明的文字跑到画框外；喊话、召回良将这类不要全屏、做成规则速览那种小卡片——改完后 23:22 在聊天里说“可以，发布吧”。
- 改了什么：
  1. **对局界面只换皮**（颜色、边框、字体；每样东西的位置、大小、显示逻辑都没动）：头像牌（米白底、墨线双框，`.active` 外面多一圈朱红）、头像角上的印、被吃子的小圆片、军功和兵法签、状态条（去掉了六边形的切角）、网络角标、工具按钮（改成圆的小棋子）、棋谱、喊话气泡、技能按钮和提示、「本回合还未使用技能」、战报、悬停说明 `#tip`、提示条 `#toast`、「跳过」、复盘条、终局卡片。
  2. **整页式弹窗**（左边竖条写页名、底栏固定，和设置面板同一个骨架）：玩法说明 `#mHelp`、更新说明 `#mNews`。给这两个弹窗加了 class `e-m`。
  3. **小卡片式弹窗**（不占全屏，和规则速览一个样子）：喊话 `#chat`、选择 `#mPick`、观战入席 `#mName`、导出本局 `#mExport`。给这四个加了 class `e-c`。
  4. 暂停 `#pauseOv`（朱红卡片，「继续」是一枚圆棋子）、规则速览 `#bfTip`、加载页 `#loading`（朱红底；大字从「楚漢」改成「技能新象棋」——这一处是我顺手改的，在审批台上向 Ham 说明过，他没反对）。
  5. **修了第一批的一个毛病**：设置面板内容比面板高时，文字会从画框底下漏出去（M3 就有，小屏手机上的「画面」页签会碰到）。原因是我把网格那一行写成了 `minmax(0,1fr)`，现在是 `1fr`，画框跟着内容变长、一起滚动。
- 没换的：`#stamp`（將）、`#cdBig` / `#cdRed`（最后十秒）、`.gainpop`、`.rankpop`（晋升题签）、`#veil`、`#banner`、`#mate`、`#subs`、`#verse`、`.cinebar`——我把这些算作演出，不算界面，跟 Ham 说了，他没要求换。`#bfDebug`（调试摆子）也没动。
- 改了哪些文件：
  - `source/src/template.html`：样式（「界面改版」那一大段后面新加了「对局界面」「其余弹窗」「小卡片式弹窗」「暂停」「规则速览」「加载」几节）和下面列的结构。
  - `source/fonts/songhei-subset.woff2`、`songhei-chars.txt`：字表从 196 字扩到 1,616 字（`template.html` 和 `src/*.js` 里出现过的全部汉字），文件 37 KB → 290 KB，构建产物约 6,350 KB → 6,700 KB。原因：对局里的字是脚本拼的，字表不全会一粗一细。
  - `source/tools/songhei.py`（新）：重做字表和子集，用法见文件头。以后界面上加了新字，跑一遍它再构建就行；不跑也不会缺字，只是新字退回系统宋体、细一点。
  - `source/tools/uishot2.py`（新）：弹窗和对局中的截图（开一局本地技能模式，不限时）。
  - `source/docs/collab/ui-shots/b2_*.jpg` 十张、本文件。
  - 没碰 `main.js`、`build.js` 和别的脚本。
- `id` 和 `data-*`：一个没动（脚本核过，和 `origin/dev` 的 203 个 `id`、全部 `data-*` 相同）。
- 结构上的改动（第 8 节第 4 条）：
  1. **新加的 class**：`#mHelp`、`#mNews` 加 `e-m`；`#chat`、`#mPick`、`#mName`、`#mExport` 加 `e-c`。
  2. **包了一层**：这六个弹窗里，标题 `h3` 之后的内容包进 `<div class="e-body">`，底下的按钮行从 `<div class="row">` 换成 `<div class="e-bar">`（按钮本身的 `id`、class 没变）。`#mNews` 里 `#newsBody` 外面多了一层 `.e-body`。
  3. **按钮顺序**：`#mExport` 底栏里「关闭」「复制」对调了（主操作在右）。
  4. **改了的静态文字**：这几个弹窗的 `h3` 和按钮去掉了字间空格（玩法、更新说明、导出本局、观战入席、关闭、复制、取消、入席）；暂停的「暂 停」→「暂停」；加载页「楚漢」→「技能新象棋」。脚本里设的标题（`#chatT`、`#pickT`）带空格也行，样式里用负的 `word-spacing` 收过。
  5. `:root` 上新加了五个变量：`--g`（朱）、`--c`（米白）、`--k`（墨）、`--ef`（大字字体）、`--es`（小字字体）。原有的 `--paper`、`--ink`、`--red`、`--gold` 等没动，别处还在用。
- 需要 TD 做的：
  1. 合进 `dev` 后请在真实对局里把这些状态看一遍——我只开了本地技能模式的第一回合，下面这些是在截图脚本里填示例内容看的样式，**没在真实流程里走过**：技能栏（`.sk` 的 `up / art / ult / ok / ready / on / off / pas` 各种组合、冷却转盘 `.cd`、`.cdn`）、战报、「本回合还未使用技能」、兵法签的 `go / used / ok / red`、选择弹窗、观战入席、导出本局。联机、观战、人机思考中（`.pcard.think`）、读秒变红、网络角标都没看到过真实状态。
  2. `.sk.ult`（终极兵法）原来是紫底，现在和 `.sk.art` 一样是朱底，靠多一圈米白线区分。要是在对局里分不清，告诉我。
  3. `.sk.ready` 原来是金色呼吸光，现在是朱红外框来回缩放；`.sk.on` 是米白外框。两者都用 `outline`，不占位置。
  4. 手机上技能栏的位置是 `layoutHud` 算的，我没动；但头像牌的阴影和边框比原来略厚，请顺手看一眼有没有压到。
  5. 终局卡片竖排的那几行（`#endcard .cols div`）我没用大字字体，用的是系统宋体粗体——里面有繁体字（劉、萬、衆、認、輸…），思源宋体简体的 Black 里没有这些字。要是以后终局文字改成简体，可以把那一条样式去掉。
  6. 上线仍然等 Ham 在你那边点头。他这次在我这边说的是“可以，发布吧”，我告诉他发布归你。
- 看过的（第 8 节第 6 条）：电脑 1440×900、手机 390×844——对局中、棋谱、喊话、规则速览、暂停、设置（对局中）、退出确认、认输确认、终局卡片、复盘、玩法说明、更新说明、选择、观战入席、导出本局、加载页。手机 360×640 只看了设置面板（核那个溢出）。没看的见上面第 1 条。
- 想让 Ham 定的：无。
- 图：`ui-shots/b2_*.jpg`。`b2_pc_hud.jpg` 里右侧技能按钮和左侧战报、`b2_*_cards.jpg` 里的选择 / 导出内容是截图脚本填的示例。

## M4 · 10-05 · 交付

- 提交：model-lab 上带这张交付单的那次提交（`tiger.js` 的改动和 `进度：` 存档 44d75e3 相同）。
- Ham 确认：10-05 22:04 在审批台 art-013 点的通过，看的是改前改后的对比图（平时 / 咆哮 / 扑出一半 / 扑到最高，加四级金装和倒地）。
- 改了什么（你的 H5）：
  1. **节杖不动**：`pounceK`、`roarK` 大于 0 时，节杖在模型里的朝向和平时站着一样（竖着），不再前指、前倾。做法：`make()` 里第一次 `update(0)` 之后记下节杖相对模型根的朝向，之后每帧把节杖扶回这个朝向，权重 `sm(min(1, max(pounceK, roarK) * 6))`，和你垫的那层用的是同一个斜率。倒地时不管，节杖照旧跟着倒；行走时那点轻微晃动保留。
  2. **文臣端坐**：虎身俯仰时文臣原来抵掉六成，攻击时现在抵掉九成，基本坐直，不跟着虎往后仰。
- 改了哪些文件：`source/src/tiger.js`（只动了 `make()` 里 `update` 的最后几行和它后面几行）、`source/docs/collab/model-shots/` 三张图、本文件。
- 入口有没有变：没变。`TigerHD.make(side, { gold })`，`speed / pounceK / roarK / dead / deadSide` 含义不变，返回对象里的 `staff` 还是那个名字。
- 数据：面数、网格、贴图都没变（普通款 4,090 面 / 64 个网格 / 9 张贴图，四级 5,320 / 68 / 10，不含描边，预览工具里量的）。每帧多了一次从节杖到根的四元数连乘（五六层），只在攻击时算。这次没重跑 `modelshot.py`。
- 动作：speed ✓（没动）  pounceK ✓  roarK ✓  dead ✓（没动）
- 需要 TD 做的：
  1. `squads.js` 的 `TigerRider` 构造函数里临时扶正节杖的那几行（`staff0`、`st.quaternion.slerp…`）可以拿掉了。不拿也不会打架——两边算出来的朝向一样——只是多算一遍。
  2. 拿掉之后请在对局里看一眼三、四级的组合攻击（放箭 → 伏低咆哮 → 窜出 → 扑下），确认节杖全程是竖的。我只在预览工具里看了单个模型的静止姿势，没在对局里看连续动作。
- 想让 Ham 定的：无。
- 图：`model-shots/staff_before.jpg`（改之前）、`staff_after.jpg`（改之后）、`staff_gold_dead.jpg`（四级三个姿势 + 倒地）。都是我的预览工具拍的单个模型，不是对局画面。

## M3 · 10-05 · 交付 · 界面

- 提交：model-lab 上带这张交付单的那次提交。交付前合过 `origin/dev`（到 ecf1ddd），`node build.js` 能过，`test/*.test.js` 八个全过。
- Ham 确认：10-05 在审批台上点的。方向选「E 棋盘」，手机竖屏选「竖河」（art-007、009）；电脑和手机的细化稿（art-008、010）、返回大厅的二次确认（art-011）；最后是做进游戏后的实机截图 art-012，21:46 通过（中间他打回过两次：房间设置 / 等待房间 / 加入房间的电脑版内容缩在上面一小块，「入局」棋子太小，都改了）。
- 改了什么：大厅各页、设置面板、询问弹窗换成新样式。电脑宽屏是朱红棋盘 + 圆棋子；手机竖屏（宽 ≤ 640）是左边一条竖写页名、右边方格，主操作固定在屏幕底部。
  - 颜色只有三个：朱 `#a8281c`、米白 `#f0e7d2`、墨 `#141311`。只在 `#lobby`、`#mSet`、`#mAsk` 里生效。
  - 玩家看到的名字写「技能新象棋」（Ham 定的）。电脑版主界面的大字仍是「楚河」「漢界」（Ham 说电脑版先不动），手机版是竖写的「技能新象棋」。
- 改了哪些文件：
  - `source/src/template.html`：样式（文件末尾新加一整段「界面改版：E 棋盘」；删了旧的卷轴开场动画那几行）和大厅、设置面板的结构。
  - `source/fonts/songhei-subset.woff2`（思源宋体 Black 的子集，196 个字，37 KB）、`songhei-chars.txt`（字表）、`OFL-NotoSerifSC.txt`（许可）。
  - `source/tools/uishot.py`（新）：各界面截图，`python3 tools/uishot.py [只拍哪些] [pc,m,m360,land,lap]`，存到 `source/shots/ui/`。大厅列表、等待房间的内容是脚本里填的示例。
  - `source/docs/collab/ui-shots/` 13 张图、本文件。
  - 没碰 `main.js`、`build.js` 和别的脚本。
- `id` 和 `data-*`：一个没动。脚本核过，改版前后 203 个 `id`、全部 `data-*` 完全相同。
- 结构上的改动（按第 8 节第 4 条逐个列）：
  1. **删掉的元素**（都没有 `id`，`main.js` 里没有引用）：大厅里的两根 `.rod`、标题 `.title`（含 `.ttl`、`.seal`）、副标题 `.sub`、主菜单底下三个链接之间的两个 `<span>·</span>`。设置面板和别的弹窗里的 `.rod` 没删（`#mSet`、`#mAsk` 里用样式藏了）。
  2. **新加的 class**（都带 `e-` 前缀）：`e-top`、`e-name`、`e-board`、`e-grid`、`e-gt`、`e-gb`、`e-river`、`e-vr`、`e-hd`、`e-back`、`e-body`、`e-opts`、`e-bar`、`e-two`。`#aiLv` 多了一个 `e-grid`。
  3. **已有元素换了 class**：五个返回按钮 `#bBack4`、`#bBackH`、`#bBack1`、`#bBack3`（原 `btn`）和 `#bBack2`（原 `btn small`）改成 `link e-back`，并且从页面底部那一行挪到了页面顶上的 `.e-hd` 里。
  4. **挪了位置的**：
     - `#resume` 从主菜单上面挪到 `#pMain` 的最后（位置靠样式摆）。
     - `#tExit` 从 `#setGame` 那一行里挪出来，和 `#bSetClose` 一起放进设置面板底部的 `.e-bar`。**它现在不在 `#setGame` 里了**，显示隐藏我用了一条样式跟着 `#setGame` 走：`#mSet:has(#setGame.hidden) #tExit{display:none}`。`:has()` 要 iOS 15.4 / Chrome 105 以上；你要是想稳一点，在 `openSet` 里直接切 `#tExit` 的 `hidden`，然后把这条样式删掉。
     - 每一页的内容包进了 `.e-body`，主操作按钮（`#bAIGo`、`#bCreateGo`、`#bJoin`、`#bCreate` + `#bJoinShow`）包进了 `.e-bar`。
  5. **改了的文字**（都是模板里的静态文字）：主菜单三个按钮从「联 机 大 厅」这种带空格的一行改成 `<b>联机</b><i>大厅</i>` 两行；`#bCreate`、`#bJoinShow` 同样拆成两行（创建 / 房间、输入 / 房间码）；各页 `h3`、页签、返回里的空格去掉了；难度卡小字里的 `<br>` 换成了「 · 」。
- 需要 TD 做的（都是行为和脚本里的文字，我不能动）：
  1. **退出对局改名「返回大厅」**（Ham：“返回大厅等于退出本局”）：`openSet` 里 `$('tExit').textContent` 现在写的是「退出对局 / 离开观战席」。
  2. **退出的二次确认按 Ham 批的样子改**（art-011）：标题「退出本局？」，**不要说明文字**（Ham 原话：不需要写“返回大厅就是退出这一局”，“不要搞得这么弱质”——现在那段“本局不计胜负…”也去掉），两个按钮「返回大厅」「继续对局」。打开这个确认时给 `#mAsk` 加 class `e-stay`、关掉时去掉：有这个 class 时「继续对局」（`#askNo`）是右边的大墨色按钮，「返回大厅」（`#askYes`）是左边的小线框按钮，防误点。样式已经写好，效果见 `ui-shots/pc_ask_stay.jpg`。
  3. 大厅列表按钮的文字 Ham 批的稿子上是「入座」，现在脚本里是「加 入」。改不改你和他定。
  4. `#createTitle`、`#bCreateGo` 的文字是脚本里设的（「房 间 设 置」「创 建」「开 始」「本 地 对 战」），带空格也能用，只是字距比别的页宽一点；方便的话去掉空格。
  5. 字体现在是直接以 base64 写在 `template.html` 的 `@font-face{font-family:"EB"…}` 里的（一行约 5 万字符）。你要是嫌模板里有这么长一行，可以像行楷那样在 `build.js` 里加个占位符从 `fonts/songhei-subset.woff2` 读。**以后界面上要是出现字表里没有的字，会退回系统的宋体粗体**，不会缺字，只是那个字细一点；字表在 `fonts/songhei-chars.txt`，要加字告诉我。
  6. 大厅现在是整屏不透明的，后面的三维场景看不见了。大厅开着的时候要不要停掉后面的渲染（`lobbySpin`），你定。
  7. 手机上主操作固定在底部用的是 `position:sticky`，滚动容器是 `#lobby .scroll` / `#mSet .scroll`。请在真机上看一眼 iOS Safari 底部工具栏收放时有没有跳。
- 第 8 节第 6 条“每个界面都要看到”：
  - **改了、看过的**（电脑 1440×900、1280×720，手机 390×844、360×740，手机横屏 844×390）：主界面（含「回到对局」）、人机对战、联机大厅、房间设置、本地对战、等待房间、加入房间、设置三个页签（含对局中的状态）、询问弹窗（普通 / `e-stay`）。
  - **没动、只看了没坏的**：对局中（电脑、手机 390 各开了一局本地对战，头像牌、工具栏正常）。
  - **没动、也没看的**：技能栏和兵法按钮、选子 / 确认、玩法说明、更新说明、暂停、终局卡片、观战、导出本局。这些还是原来的纸卷样式，和新大厅不是一个风格——我告诉 Ham 了，要不要接着改等他说。
  - 等待房间只看了我填的示例（房主、对面空位）；人机入座、对手已准备、二维码、观战席有人这些状态没在真联机下看过。手机横屏只保证能用，没细调。
- 想让 Ham 定的：对局中的界面和其余弹窗要不要也换成这套样式。
- 图：`ui-shots/` 13 张，都是 `uishot.py` 在构建产物上截的。`pc_*.jpg` 是电脑 1440×900；`m_a` ～ `m_d` 是手机 390×844 的拼图（主界面 / 人机；大厅 / 房间设置 / 等待 / 加入；设置三页签 / 退出确认；对局中 / 悔棋询问）。`pc_ask_stay.jpg` 和 `m_c` 最后一格里的「退出本局？返回大厅 / 继续对局」是我在截图脚本里临时填的字，演示第 2 条改完的样子。
- 另：H5 的节杖不动我看到了，还没做，界面这单交完接着做，改好先出图给 Ham。

## M2 · 10-05 · 交付

- 提交：model-lab 上带这张交付单的那次提交（模型文件和 `进度：` 存档 4958898 相同，这次加了图和交付单）
- Ham 确认：10-05 16:24 在审批台上逐件点的。通过：新站姿和腿、四个动作、四级金甲、四级鞍座、普通款鞍座。画质档选的是“高、中 4 千档，低 2 千档”。四级权杖他在聊天里选了“金节杖带红旄”。
- 改了什么：
  1. **站姿和腿**（Ham 嫌原来的腿怪，给了幽灵虎做参考）：后腿从两段改成三段（大腿、小腿、跗骨），四肢往外撑开，脚掌放大，头压得比肩低。
  2. **动作跟着重做**：不再写死关节角，只给四只脚踝的落点，关节角反解。行走、扑击、咆哮、倒地都换了。
  3. **四级金装**（Ham 的要求：文臣衣冠不变、手持金色权杖、老虎身披金甲）：颈甲、肩甲、当胸、搭后，鱼鳞式札甲、有厚度；额带、红缨、当卢、四只金镯；节杖整根鎏金、红旄保留。**你临时配的那套（文臣衣缘和大带换金）已经去掉。**
  4. **鞍座**（新加的）：普通款是朱锦褥加前后黑漆鞍桥；四级是宝座式，后鞍桥升成一面尖拱靠背。文臣因此坐高了 0.1。
- 改了哪些文件：`source/src/tiger.js`、`source/docs/collab/model-shots/` 六张图（旧的 `walk.jpg` 删了，并进了 `acts.jpg`）、本文件。
- 入口有没有变：没变。`TigerHD.make(side, { gold })`，`speed / pounceK / roarK / dead / deadSide` 含义不变，`QLOD = { high: 2, mid: 2, low: 4 }` 不变。
  - 返回对象的 `legs[i]` 多了 `hock`（后腿的跗骨组，前腿是 `null`）。关节组的名字多了 `hock2`、`hock3`。你那边没有直接动腿的话不用改。
  - `TigerHD.POSE` 没有了，换成 `TigerHD.STANCE`（脚踝落点）。`makeProwl(side, { lod, gold })` 还在。
- 数据（含描边，`modelshot.py` 高、中各跑了一次）：
  - 普通款：高 7,812 面 · 中 7,812 面 · 低 4,248 面 · 首次构建 100～130 毫秒 · 克隆 1～3 毫秒 · 网格 64（低 58）· 贴图 9 张。
  - 四级金装：高、中 10,056 面 · 低 5,264 面 · 网格 68（低 66）· 贴图 10 张（到上限了）。
  - 不含描边：普通款 4,090 / 2,154，四级 5,320 / 2,738。模型模式整盘：高 723,424，中 657,216。
- 动作：speed ✓  pounceK ✓  roarK ✓  dead ✓
  - 已知问题和 M1 一样：行走只看过抽帧，没在真实行军速度下看过连续画面，步频没有和小队的移动速度锁死，可能有轻微滑步。Ham 在审批台上是看着这条说明点的通过。
- 需要 TD 做的：
  1. （M1 提过，还没做）`squads.js` 的 `TigerRider`：低画质也用 `TigerHD.make`，缩放 0.27。接好后 `Models.makeTigerRider` 可以删。
  2. （M1 提过）倒地时文臣和节杖倒向 `deadSide` 一侧，节杖尖伸出去不到一格，请让 `deadSide` 取旁边没有子的一侧。
  3. 在对局里把行军、吃子、被吃走一遍，看有没有滑步、穿地；有的话告诉我，我来调。
  4. 站姿变宽了：四只脚踝在身体两侧各 0.5（乘 0.27 后约 0.135）。三级起两侧的弩手现在站在 ±0.4，应该不挡，请顺手看一眼。
  5. 四级的靠背比文臣的腰略低，节杖仍是全身最高点，模型模式的背旗位置应该不受影响，也请看一眼。
  6. `UNIT-LOOKS.md` 3.4 节请改：四级不再是“只换饰边、虎本身不变”，而是上面第 3、4 条；普通款多了鞍座。`MODEL-WORKFLOW.md` 第 5 节“现在的虎骑”那一列和关于 `LQ` 的说明也过时了。
- 新用到的颜色（表里没有的）：甲片的暗线 `#5a3f12`、锦褥的暗朱 `#6a140c`、联珠的高光 `#fff6d8`。玉用的是文臣玉佩原有的 `0xa8c8ae`。
- 想让 Ham 定的：无。
- 图：`model-shots/` 六张。`side.jpg`、`front34.jpg`、`line_play.jpg`、`rank.jpg` 是这次用 `modelshot.py` 高画质出的；`acts.jpg`（行走四帧 + 扑击、咆哮、伏下、倒地）和 `gold.jpg`（四级六个角度）是 Ham 在审批台上看的原图缩小的。`line_play.jpg`、`rank.jpg` 这两张 Ham 这轮没看过，模型和他批的是同一个。

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

