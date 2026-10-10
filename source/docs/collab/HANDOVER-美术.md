# 美术 → 角色部 交接单（10-10 晚）

美术这个窗口（session_01NcqhjTJxdTrUxQtViN2iri，分支 `model-lab`）要搬进 Code，改名「角色部」：管角色设计、建模、绑定、动画。界面、棋盘、棋子交给美术总监朱墨（session_01U1d5RrViuCEaT74h7UkG2M，分支 `claude/art-director`）。新窗口不记得聊天，只能看这份。

## 1. 规矩（Ham 定的，照做）
- 涉及视觉的改动，先出图 / 出视频挂审批台给 Ham 看，他点头才交付、才上线。没审的东西只推 `model-lab`，提交说明以「进度：」开头；**不推 dev / main**。
- 审批台：https://claude.ai/artifact/79HGpeuQGk3jehJmHsJsfn ，数据库集合 `items`，条目 `art-NNN`（最新 art-093）。Ham 每次提交后，在每件上写 `ack`（时间 + 一句话）。说「还有几件等你批」之前先读一遍数据库。
- 交付：先合 `origin/dev`（`git fetch origin +dev:refs/remotes/origin/dev +main:refs/remotes/origin/main` → `git merge --no-edit origin/dev`），`node build.js` 能过，`test/*.test.js` 全过，再在 `model-to-main.md` 最上面写交付单（M 编号，带「Ham 确认」一行，引原话和审批台编号）。
- TD 的文件（`main.js`、`board.js`、`squads.js`、`models.js`、`fx.js`、`bfx.js`、`build.js` 等）不直接改，在一份拷贝上改完、构建、拍样片，把改法写进交付单。
- 回复 Ham：先认错再解释；只答问的；不要用「接下来我去做 X」收尾，最后单起一段「正在做」（手上在做什么、在等谁）。
- Ham 找错部门时（比如让我做界面、配音），先指出该找哪个部门，不自己接。

## 2. 归角色部管的文件
- `source/src/tiger.js`：汉相虎骑（TigerHD），一到四级造型、三种死法、文臣分头和两臂（M24）。
- `source/src/juma.js`：拒马路障（`JumaWall.make(side, n)` → `shake` / `shatter` / `reset` / `dispose`），**还没进构建**，等 art-093 通过后写交付单。
- `source/src/upfx.js`（棋子升级翻面，M22）、`source/src/face.js`（棋子字形，M21）、`source/src/merit.js`（军功印）：这三个和棋子 / 界面有关，**交给美术总监**（TD 的 T1 里写了 face.js、merit.js 归它）。
- `source/art-wip/`：所有样稿、拍片脚本。重要的：`duel2/`（兵卒对打）、`infantry-design/`（楚汉兵卒造型）、`juma/`、`juma-wall/`（拒马）、`tiger-lv/`（虎骑）、`elephant-fx/`（战象）、`ending-film/`（终局影片）。
- `source/docs/collab/model-to-main.md`：交付单。

## 3. 状态
**已交、TD 已接 / 上线**：M17–M23、M25（战象踩死 / 震死、碎石）。M26（盾挡音效）转给了声音部。
**已交、等 TD 接**：M24 汉相虎骑（审批台 077、089 通过）。

**审完了、还没交的（局内）**
1. **兵卒对打**：扣血版（art-087「挺好的」）、击杀版（art-091 通过，「先这样，结束这个任务，收尾，准备交接」）、造型选乙「盔胄对巾帻」（art-092）。
   - 能实时看：https://claude.ai/artifact/9XEAdPkfaXvZUzraWJVr8c ；源文件 `art-wip/duel2/page.html`。
   - 造型：https://claude.ai/artifact/NbP8Pau6TpU5r4j3k4Moxm ；源文件 `art-wip/infantry-design/designs.js` 里 `DESIGNS.b`（汉：铁盔红缨、红长袍到膝、宽黑腰带、长方红盾、矛；楚：黑巾裹头两条巾尾、无袖皮背心露臂、裹腿、黑圆盾红黑圈纹、戟）。四级金甲斩马刀手还没照乙重画（要上审批台）。
   - 还要做的：把乙造型套进对打；接进游戏（见第 4 节）。
2. **拒马路障 + 相 / 象打拒马**（TD H29）：art-090 基本通过，备注「被冲散时（棋子被吃掉时），路障需要彻底碎掉，扣血时不碎」→ 已改，挂 art-093 **等 Ham 看**。分镜页 https://claude.ai/artifact/5NTW7kpgo3VUJsrosKjube 。通过后写交付单：`juma.js` 进构建（排在 `'models'` 后面）、路障跟着拒马兵小队摆（`group.position = 锚点`、`rotation.y = 小队 yaw`，用 `Squads.jmForm` 的阵形）、掉血 `shake(dir)`、打死 `shatter(dir, power)`，三段的姿势和时长照分镜页；一、二级相身边加一名弩手（`new Squads.TroopSquad('e', side, 锚点, yaw, 'xbow', [[-0.4, 0.06]], 0.2)`），三、四级用自带的两名。

**Ham 已叫停**：其余兵种的全局动画优化（马、车、炮、士、将、象），10-10 18:33「这个任务你先停掉，跳过，我后续会给专门的角色部门来处理」。

**过场 CG（终局影片）**：乌江第二版通过（art-088），后面是垓下、最后一战、拔剑、彭城。Ham 10-10 19:08：「先把所有局内动画工作都结束了再去弄乌江」。以后可能另开 CG 组。

## 4. 对打的骨架和动画约定（接进游戏要照这个）
- 骨架：上身 / 胯分开（胯支点 0.9、上身支点 0.98），头（支点 1.5），腿两节（大腿 0.40、小腿 0.43），胳膊两节（上臂 0.25、前臂 0.24），矛、盾。单位是兵的模型单位（人高约 1.9；游戏里乘 `SC * bigFor(n)` 摆进棋盘）。
- 姿势量 `S`：`px` 沿交锋线往前、`side` 往盾那边为负、`py` 起跳；`crouch`、`lean`、`twist`（往盾那边为正）、`sway`；`fL / fR` 两脚位置、`liftL / liftR` 抬脚；`wp` 握矛的手（相对身子）、`wd` 矛的朝向 [左右, 俯仰]、`g` 握矛位置（实际离矛根 `0.5 + 0.62 * g`）；`sp` 盾心（相对身子）、`sd` 盾面朝向；`hx` 低头、`hy` 转头；`fall` 下半身倒地。腿、胳膊都用两节反解（`ik2`）去够脚和手的目标，膝朝前、肘朝外下。
- 关键帧：每个量一条轨，按时间算切线的 Catmull-Rom（`tracks` / `sample`）。
- 防穿模：矛尖碰到对方盾面就停（先收胳膊，收不完再让矛杆在手里滑），矛尖不进对方身子（扎中那一下除外，`stab`），矛根要扎进自己肚子时手往矛根滑；两人站位比原来拉开 0.9。
- 事件：`block`（真碰上那一帧，火星出在接触点 + 亮光 + 顿 0.07 秒）、`parry`、`hit`、`thud`、`cut`（拦腰斩断，上半身整组飞出）。
- 游戏里现在的兵（`models.js` 的 `Troop`、`poseMatrices`）没有膝、肘这两节，接进去要 TD 在 `Troop` 里加两节反解，或者把对打这一套做成单独的演出模块（推荐后者：只在兵卒对打时换成高精度对打小人，打完换回）。这一步要和 TD 商量好再写交付单。

## 5. 给声音部的时间点
见 `model-to-main.md` 的 M27。
