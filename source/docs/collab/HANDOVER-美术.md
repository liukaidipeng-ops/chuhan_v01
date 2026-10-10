# 美术 → 角色部 交接单（10-10 晚）

Ham 10-10 19:27：「你开始准备局内动画（角色设计，建模，绑定，动画等）的工作交接，我希望把局内动画的工作转移到code里，这样你和大家沟通起来更方便」。

美术这个聊天窗口（session_01NcqhjTJxdTrUxQtViN2iri，分支 `model-lab`）把**局内动画**交给 Code 里新开的「角色部」：角色设计、建模、绑定、动画、局内特效。界面、棋盘、棋子归美术总监朱墨（session_01U1d5RrViuCEaT74h7UkG2M，分支 `claude/art-director`）。新窗口不记得聊天记录，只看这份文件和下面列的几份。

**开工先读**：本文件 → `WORKFLOW.md`（分支 `claude/gallant-planck-rwr5az`，各部门的共同规矩）→ `MODEL-WORKFLOW.md`（美术和 TD 怎么交接）→ `decisions-美术.md`（Ham 在审批台上的每一条批复原话）→ `main-to-model.md` 最新几条（TD 给美术的话）→ `model-to-main.md` 最新几条（交付单 M17～M28）。

---

## 1. Ham 定的规矩（照做）
- **视觉的东西先出图 / 出视频挂审批台**，他点头才交付、才上线。没审的只推 `model-lab`，提交说明以「进度：」开头。**不推 `dev` / `main`**。
- 审批台：https://claude.ai/artifact/79HGpeuQGk3jehJmHsJsfn ，数据库集合 `items`，美术条目 `art-NNN`（最新 art-093），TD 条目 `td-NNN` 也在这里。一件一张卡：`title`、`ask`（要他定什么）、`points`、`images`（先用 Artifact 工具 `asset: true` 传到这个审批台，引用 `/_blob/<id>`）、`kind`（`approve` 或 `choice` + `options`）、`after`（通过以后做什么）、`seq`、`status: "pending"`。
- Ham 提交后会收到「审批台通知」（这个审批台的通知能送到）。**每件都写回执** `ack`（时间 + 一句话）。说「还有几件等你批」之前先读数据库。
- 每次回复 Ham：先认错再解释；只答问的；最后单起一段「**正在做**」（手上在做什么、在等谁；没有就写「手上没有活，等你吩咐」）。不要用「接下来我去做 X」收尾。
- Ham 找错部门（比如让角色部做界面、配音），当场指出该找谁，不自己接。
- 只说中文，适合手机看。

## 2. 交付流程（和 TD）
1. 先合 dev：`git fetch origin +dev:refs/remotes/origin/dev +main:refs/remotes/origin/main` → `git merge --no-edit origin/dev`。
2. `node build.js` 能过，`test/*.test.js` 全过（`bfai.test.js` 很慢，机器忙时单独跑）。
3. 在 `source/docs/collab/model-to-main.md` **最上面**写交付单：`## M编号 · 日期 · 交付 · 类别（一句话）`，下面写「提交」「Ham 确认」（引原话、审批台编号和时间）「改了哪些文件」「需要 TD 做的」「我看过的 / 没看的」。下一个编号 **M29**。
4. TD 的文件（`main.js`、`board.js`、`squads.js`、`models.js`、`fx.js`、`bfx.js`、`build.js` 等）不直接改：在一份拷贝上改完、构建、拍样片，把改法写进交付单。
5. 声音：动画交付时把每个声音在第几秒响、多长写进交付单，声音部（session_01VsbsKR759MUraiT41MaEAU）照着配。M27 是样板。
6. 提交说明结尾要带本会话的 `Claude-Session:` 一行。注意 `WORKFLOW.md` 第 7 节写着「提交信息里不写模型名称」，这条要和 Ham 确认（美术窗口一直带着 `Co-Authored-By` 那行）。

## 3. 文件归属（建议的分工草案，等 Ham 点头、TD 同意）
**交给角色部**
- `source/src/tiger.js`：汉相虎骑 TigerHD（一到四级造型、扑击 / 咆哮 / 倒地、炸碎 / 撞散 / 打飞三种死法、文臣分头和两臂）。
- `source/src/juma.js`：拒马路障 JumaWall（M28 交付，等 TD 加进构建）。
- 以后新增的角色 / 动画模型文件 `source/src/<名字>.js`（比如兵卒对打小人）。
- `source/tools/modelshot.py`、`source/docs/collab/model-to-main.md`、`model-shots/`。
- `source/art-wip/` 里局内的样稿：`duel/`、`duel2/`（兵卒对打）、`infantry-design/`（楚汉兵卒造型）、`juma/`、`juma-wall/`（拒马）、`tiger-lv/`（虎骑）、`elephant-fx/`（战象）。

**交给美术总监**（TD 的 T1 里已经这样分了）
- `source/src/face.js`（棋子字形）、`source/src/merit.js`（军功印）、`source/src/upfx.js`（棋子升级翻面，和棋子材质绑在一起）、`template.html` 的样式段。
- `source/art-wip/` 里：`piece-face/`、`piece-font/`、`wood-face/`、`side-ring/`、`merit/`、`ui-mocks/`、`upgrade-fx/`。

**过场 CG（终局影片）**：`source/art-wip/` 里的 `ending-film/`、`ending-sb/`、`liubang-v2/`、`xiangyu-v3/`、`wuzhui/`、`wuzhui3d/`。Ham 说以后可能另开 CG 组；在那之前由谁接，要问 Ham（见第 7 节）。

## 4. 现在的状态
**已交、已上线**：M17～M23、M25（战象踩死肢解冲飞、践踏震死掀上天、碎石加倍）。
**已交、等 TD 接**：
- **M24 汉相虎骑**（审批台 077、089）：四级造型；炮击炸碎、近战打飞、车冲撞散；文臣也断肢；车冲飞多远按冲锋距离算（`power = 1 + 冲锋距离 × 0.45`）。
- **M28 拒马路障 + 相 / 象打拒马三段**（审批台 090、093）：掉血 `shake` 不碎，打死 `shatter` 彻底碎掉。TD 接完以后要拍一段连续动画给 Ham 看。
- M26（盾挡声）、M27（对打、拒马的时间点）已转给声音部。

**审完了、还没交：兵卒对打**（下一件正事）
- 扣血版 art-087「挺好的」；击杀版 art-091 通过，备注「先这样，结束这个任务，收尾，准备交接」；造型选乙「盔胄对巾帻」（art-092）。
- 能实时看：https://claude.ai/artifact/9XEAdPkfaXvZUzraWJVr8c （切「扣血 / 击杀」，可慢放、暂停）；源文件 `art-wip/duel2/page.html`。
- 造型：https://claude.ai/artifact/NbP8Pau6TpU5r4j3k4Moxm ；源文件 `art-wip/infantry-design/designs.js` 的 `DESIGNS.b`。汉：铁盔红缨、红长袍到膝、宽黑腰带、长方红盾、矛。楚：黑巾裹头拖两条巾尾、无袖皮背心露臂、裹腿、黑圆盾红黑圈纹、戟。
- 要做：① 把乙造型套进对打；② 四级金甲斩马刀手照乙的路子重画（先上审批台）；③ 接进游戏（第 5 节最后一条），先和 TD 商量做法再写交付单。

**Ham 叫停的**：其余兵种（马、车、炮、士、将、象）的全局动画优化。10-10 18:33「这个任务你先停掉，跳过，我后续会给专门的角色部门来处理」，等他再开口。

## 5. 骨架和动画约定
**兵卒对打小人**（`art-wip/duel2/page.html`）
- 骨架：胯（支点 0.9）、上身（0.98）、头（1.5）；腿两节（大腿 0.40、小腿 0.43），胳膊两节（上臂 0.25、前臂 0.24）；矛（长 2.76）、盾。单位是兵的模型单位（人高约 1.9），游戏里乘 `SC * bigFor(n)` 放进棋盘。
- 姿势量 `S`：`px` 沿交锋线往前、`side` 往盾那边为负、`py` 起跳；`crouch`、`lean`、`twist`（往盾那边为正）、`sway`；`fL / fR` 两脚、`liftL / liftR` 抬脚；`wp` 握矛的手（相对身子）、`wd` 矛的朝向 [左右, 俯仰]、`g` 握矛位置（离矛根 `0.5 + 0.62 * g`）；`sp` 盾心、`sd` 盾面朝向；`hx` 低头、`hy` 转头；`fall` 下半身倒地。腿、胳膊用两节反解 `ik2` 去够脚和手，膝朝前、肘朝外下。
- 关键帧：每个量一条轨，按时间算切线的 Catmull-Rom（`tracks` / `sample`）。
- 防穿模（Ham 085 提过）：矛尖碰到对方盾面就停（先收胳膊，收不完再让矛杆在手里滑），矛尖不进对方身子（真扎中那一下除外），矛根要扎进自己肚子时手往矛根滑。两人站位比原来拉开 0.9。`geo.py` 能逐帧量穿没穿。
- 事件：`block`（真碰上那一帧，火星出在接触点 + 亮光 + 顿 0.07 秒）、`parry`、`hit`、`thud`、`cut`（拦腰斩断，上半身整组飞出）。
- 游戏里现在的兵（`models.js` 的 `Troop`、`poseMatrices`）没有膝、肘，接进去两条路：TD 在 `Troop` 里加两节反解；或者把对打做成单独的演出模块，只在兵卒对打时换成高精度小人，打完换回。我推荐后者。

**虎骑**（`tiger.js`）：`make(side, { lv })` 返回的对象有状态量 `speed`、`pounceK`、`roarK`、`dead`、`deadSide`，方法 `blast / rend / fall({ dir, power })`（都返回 Promise）。拆下来的件挂在小队 `group` 上。文臣的头 / 两臂是 `fhead`、`farmA`（持杖）、`farmB`。

**拒马路障**（`juma.js`）：`JumaWall.make(side, n)` → `{ group, pieces, update, shake, shatter, reset, dispose }`，坐标 +z 朝来敌，单位是棋盘单位。

## 6. 工具：怎么出图、拍片
- 三维页面都在无显卡的容器里用 swiftshader 跑：`chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])`。很慢，两核机器上**一次只跑一个**，长任务写成 `nohup` 脚本（命令行 10 分钟超时）。
- 固定步长逐帧拍：初始化时把 `THREE.Clock.prototype.getDelta` 换成读 `window.__fdt`，每帧设 `__fdt = 1/30` 再等一个 `requestAnimationFrame`；镜头用 `Core.addHook` 钉住（在各更新之后跑）；`.cinebar{height:0}` 去掉黑边。第 0 帧常常是加载画面，编码从第 1 帧起。
- 现成脚本：`art-wip/tiger-lv/tfx.py`（真实对局里拍虎骑死法）、`art-wip/elephant-fx/tel.py`（战象）、`art-wip/juma/jm.py` + `art-wip/juma-wall/sb.py`（在真实对局里摆兵出分镜定格）、`art-wip/duel2/vid.py` / `chk2.py` / `geo.py`（对打录视频、按时间截图、量穿模）。对打页面用 `window.__step(dt)`、`__reset()`、`__scen('hurt'|'kill')` 控制。
- 改 TD 文件做样片：把 `source` 拷一份到草稿目录（`node_modules`、`music`、`voice` 用软链接），在拷贝里改、`node build.js`，用拷贝的 `dist/site/index.html` 拍。

## 7. 要问 Ham 的
- 分工草案（第 3 节）对不对；过场 CG 在 CG 组开张以前归谁。乌江第二版已通过（art-088），后面是垓下、最后一战、拔剑、彭城。Ham 19:08：「先把所有局内动画工作都结束了再去弄乌江」。
- 提交说明里的模型名称那一行（第 2 节第 6 条）。

## 8. 联系人
| 部门 | 会话 | 正文写哪里 |
|---|---|---|
| TD | session_01RKuN4E66BetRaUCS8BJyti | 角色部 → TD：`model-to-main.md`（M 号）；TD → 角色部：`main-to-model.md`（H 号） |
| 美术总监朱墨 | session_01U1d5RrViuCEaT74h7UkG2M | 它的分支 `claude/art-director` |
| 声音部 | session_01VsbsKR759MUraiT41MaEAU | 交付单里写时间点（M27 那样） |
| 数值部 | session_01Gtcra5Sh6u7nQHPfESA3Sb | — |
