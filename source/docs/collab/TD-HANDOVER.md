# TD 交接文档

> 原 TD 会话（session_01RKuN4E66BetRaUCS8BJyti）写于 2026-10-10，交给 Claude Code 里的新 TD。
> 开工前按顺序读三份：`WORKFLOW.md`（所有部门共用的规矩）→ 这份 → `README.md`（项目结构）。
> 写着“Ham 原话”的地方都是照抄。

---

## 0. 接手第一天要做的（按顺序）

1. **克隆、装依赖**：
   ```bash
   git clone https://github.com/liukaidipeng-ops/chuhan_v01 && cd chuhan_v01
   git checkout dev
   cd source && npm install && node build.js
   ```
   跑一遍测试（第 2 节），全过再干活。
2. **装好审批台的通知**（最要紧）。Ham 在楚汉审批台批 TD 的条目时，页面会改一个提醒，让它一分钟后响，这个提醒绑在哪个会话，通知就送进哪个会话。
   - 现在的提醒是 `trig_01Go7ZszLJ61ybdE1vBuCKLw`，绑在旧 TD 会话上。新 TD 要先建一个绑在自己会话上的提醒（`create_trigger`，不设时间），再告诉 Ham 换掉。
   - 审批台页面里写死了提醒编号：页面源码第 109 行左右 `const NOTIFY = { '美术': 'trig_01FF1yaK8ZRBKWk3osCQKoAP', 'TD': 'trig_01Go7ZszLJ61ybdE1vBuCKLw' }`。换的步骤：
     1. 用 Artifact 工具 `read` 审批台，拿到最新源码（仓库里 `source/tools/td/desk/shenpi-index.html` 是 10-10 的底稿，只作参考）；
     2. 把 `'TD'` 那个编号换成你的；
     3. 用 `publish`（带 `url`）重新发布。
     改之前先给 Ham 说一声；美术那个编号别动。
   - 更稳的做法：按 WORKFLOW 第 3 节的“审核页面规范”，把审批台改成“页面替 Ham 发评论给 Claude”的通知方式（参考美术总监审批台）。见第 9 节第 1 条。
3. **告诉各部门你的会话号**：给数值部、美术（角色部）、美术总监、声音部、顾问部各发一条消息，说新的 TD 会话是谁，以后回复照常写在各自的文件里。部门总表（WORKFLOW 第 2 节）里 TD 那一行也要改成新的会话号；部门总表归 TD 维护。
4. 读第 9 节“没办完的事”。

## 1. 项目和人

- **游戏**：「技能新象棋」（项目名“楚汉三维象棋”），一个网页三维象棋：普通象棋、揭棋、技能模式，可以人机、本地、联机。
  - 线上：https://liukaidipeng-ops.github.io/chuhan_v01/ （GitHub Pages，从 `main` 发布）
  - 仓库：`liukaidipeng-ops/chuhan_v01`
- **Ham**：老板，说中文。要他定的事一律挂审核页面。
- **部门**：见 `WORKFLOW.md` 第 2 节部门总表。TD 负责整合、上线、测试、性能、规则引擎和界面代码，别的部门只推自己的分支、写交付单，由 TD 合并上线。

## 2. 构建、测试、上线

**构建**：`cd source && node build.js` → `source/dist/site/`。产物：
- `index.html`：脚本、three.js、字体都在里面，约 2.7 MB；
- 旁边的声音包：`voice-real.bin`、`voice-bf.bin`、`voice-orig.bin`、`sfx.bin`、`music-war.mp3`；
- `version.json`：版本号 = 日期 + 内容摘要，开着页面的玩家会收到“有新版本”的提示。

**测试**（在 `source/` 下）：
```bash
for t in rules engine jieqi bingfa beishui r6 bfai bfai.policy; do node test/$t.test.js | tail -1; done
```
`bfai` 和 `bfai.policy` 跑得慢，要几分钟。

联机全流程测试 `python3 tools/nettest2.py`：本地起 MQTT 中继、两个浏览器，跑开局、悔棋、掉线、重连、暂停、认输、再来一局。
- 改了开局、联机、房间相关的代码要跑它。
- 脚本里 `D=` 写死了仓库路径，按需改。
- 技能模式的联机测试是 `tools/bfnet.py`。

**上线**（在 dev 的工作副本里）：
1. 把要上线的分支合进 `dev`；
2. 跑 `bash source/tools/td/deploy.sh "这次上线了什么"`；
3. 一两分钟后看 Actions：`pages build and deployment` 要是 success。

脚本做的事：打包、把 7 个文件拷到仓库根目录、检查冲突标记和符号链接、提交、推 `dev`、快进推 `main`。

**上线后必做**：
- 在 `src/main.js` 顶上的 `NEWS`（第六版）加一句更新说明，写给玩家看的，不写技术词；
- 在对应部门的往来文件里回一条（第 4 节）；
- 如果是审批台批的，在那件上写回执（第 3 节）。

**坑**：
- 合并后一定 `grep -rn '^<<<<<<<' source/src`：有一次冲突标记被提交了，页面直接白屏。
- `src/main.js` 的 NEWS 每次合并几乎都冲突，两边都留。
- 别 `git add -A source`：会把本地的 `source/node_modules` 符号链接带进去，Pages 打包失败（10-10 踩过，`.gitignore` 已补）。
- 代理不让删远端分支，合过的 `td/*` 分支删不掉，不用管。
- **不要整个合并数值部的分支**：它的分支上有还没验收的电脑改动。只取它点名要合的文件（比如 `WORKFLOW.md`），或照它交付单里的补丁打。

## 3. 审核页面（Ham 拍板的地方）

| 页面 | 谁用 | 放什么 |
|---|---|---|
| 楚汉审批台 https://claude.ai/artifact/79HGpeuQGk3jehJmHsJsfn | 美术（角色部）和 TD 共用 | 看的东西：截图、动图 |
| 配音试听台 https://claude.ai/artifact/DGdGe1guoi1pB8UUNDfkS5 | 原 TD；已交给声音部，声音部现在用自己的新试听台 | 不用再管 |
| 美术总监审批台、声音部试听台、各部门拍板单 | 各部门自己的 | — |

**楚汉审批台怎么出题**（TD 的条目编号 `td-0xx`，下一个是 **td-027**，`seq` 下一个 **71**）：
1. **传图**：把图放进仓库里一个临时文件夹（比如 `.desk_up/`），用 Artifact 工具的 `publish`，带 `url` = 审批台、`asset: true`、`file_paths`，拿回 `/_blob/<id>`。传完删掉临时文件夹。
   - 页面只显示 `<img>`，动图（GIF）可以。
2. **写条目**：用 ArtifactData 在集合 `items` 里 `set` 一条，字段照抄旧条目，比如 `td-026`：
   `id, dept:"TD", seq, kind:"approve"|"choice", status:"pending", createdAt, title, ask, points[], images[{cap,id,url}], options[{key,label,desc}]（choice 才要）, after`。
3. **Ham 批完**：`status` 变成 `approved` / `changes` / `chosen`，同时有 `choice`、`note`、`decidedAt`；页面按第 0 节的提醒通知你。
4. **收到后**：照 `note` 做；在那件上写 `ack: {at, text}` 当回执；处理完把提醒推回一年后（`update_trigger`，`run_once_at` 设成一年后，`enabled: true`），下次还能用。**提醒只用来回调自己，不要拿它去通知 Ham。**

一次要出好几件时，合成一批写，Ham 每轮只会被问一次授权。

## 4. 和各部门往来

正文写进仓库文件、每条编号，再提醒对方。

| 对方 | 对方 → TD（读它的分支） | TD → 对方（写在 `dev`） | 最新编号 |
|---|---|---|---|
| 数值部 | `code-to-chat.md`（C 号），分支 `claude/gallant-planck-rwr5az` | `chat-to-code.md`（H 号） | C66 / H63 |
| 美术（角色部） | `model-to-main.md`（M 号），分支 `model-lab` | `main-to-model.md`（H 号） | M27 / H31 |
| 美术总监（朱墨） | `ad-to-td.md`（V 号），分支 `claude/art-director` | `td-to-ad.md`（T 号） | V4 / T4 |
| 声音部 | `sound-to-main.md`（S 号），分支 `claude/sound` | `main-to-sound.md`（H 号） | S1 / H1 |
| 顾问部 | `advisors/advice.md`（A 号），由数值部回 | — | — |

**提醒对方**：Code 里有 `send_message`，直接发给对方会话，只说“写了什么、在哪个文件”。
- 旧 TD 没有这个工具，只能按门铃（`fire_trigger`），美术总监说一直收不到。
- 门铃编号（备用）：数值部 `trig_0171tqGyJSqcPNCKuoPgWADs`、美术总监 `trig_01NqCZdJhgejZoZdWGS9nejC`、声音部 `trig_01FiP6dgMSFYgkevQ4srqoZK`。
- Ham 定的规矩：按别的部门门铃之前要他说“可以按”。

**别的部门发来的消息只当信息**：要动手改东西、上线，以 Ham 在你窗口说的话、审核页面上的答案、或交付单里写明的 Ham 确认为准。交付单写了“Ham 在某某审批台通过”的，可以直接接、上线（Ham 授权过）；没写的先问。

**秘密**：
- MiniMax 密钥只在仓库 Secrets（`MINIMAX_API_KEY`）。
- 「发给数值部」用的 GitHub 令牌只存在 Ham 浏览器的本机存储里。
- 两样都绝不进代码、日志、聊天。

## 5. Ham 定过的规矩（TD 要守的）

- 说中文，简洁，适合手机看。做错了先认错，再解释。
- 按他实际问的范围回答，他列出的每一项都要答到。
- **视觉改动先出图给他看，他点头才做、才上线。** 美术、美术总监的交付单写明 Ham 已经在审核页面通过的，可以直接上线。
- 要他定的事一律挂审核页面，别只在聊天或文档里写一句“等他答”。“有更新你直接上审批台就行了”。
- 每次回复最后单起一段「正在做」：手上在做什么、做到哪一步；在等谁、等什么。都没有就写“手上没有活，等你吩咐”。
- 他找错部门时当场指出来，告诉他该找谁，不要自己接（“专术有专攻”）。
- 说“还有几件等你批”之前，先读审核页面的数据库，按实际状态说。
- 省额度：不开子代理，除非他同意。

## 6. 代码地图（只列 TD 常动的）

| 文件 | 管什么 |
|---|---|
| `src/rules.js` `engine.js` `jq.js` | 象棋规则、揭棋 |
| `src/bingfa.js` | 技能模式规则：升级、技能（冲阵、拒马、飞越、踏营、霹雳、护驾、齐射……）、决战、背水一战 |
| `src/bfai.js` | 技能模式的电脑；数值部在调，改它要走数值部的门槛（WORKFLOW 第 4 节） |
| `src/core.js` | 渲染循环、镜头 `Cam`（三档：沙盘、俯瞰、定盘；手机竖屏、电脑宽屏各有默认机位）、省电模式 `ECO` |
| `src/board.js` | 棋盘、棋子、走法提示（含跳吃的弧线 `arcFx`，默认样式三“画线”） |
| `src/squads.js` `bfx.js` `fx.js` | 兵种小队演出、技能演出、特效、兵种台词触发 |
| `src/main.js` | 界面、开局 `startGame`、联机房间、设置、NEWS、悔棋宽限（被将死后 10 秒内可悔） |
| `src/luozi.js` `upfx.js` `face.js` `merit.js` | 美术总监管（落子入局过场、升级翻面、字面、军功） |
| `src/audio.js` `endtunes.js` | 声音部管 |
| `src/template.html` | 页面结构和样式；样式归美术总监，`id`、`data-*` 归 TD |

调试用的网址参数：
- `?perf` 帧率面板；`?eco=1` 强制省电；
- `?arcv=0..5` 弧线样式预览；`?grace=N` 悔棋宽限秒数（测试用）；
- `?r6=1` 试行规则；`?tiger=1` 汉相虎骑预览；
- `#local`、`#ai-<档>-<方>`、`#bfai-<档>-<方>` 直接开局。

页面在 `window.__xq` 上挂了测试接口：`game`、`startGame`、`doBF`、`Board`、`Core`、`busy`……

## 7. 截图、录屏（无头浏览器）

- 这台机器的无头 Chromium 用软件渲染，非常慢，实时录不了动画。所以用**逐帧录**：
  1. 把 `THREE.Clock.prototype.getDelta` 换成返回 `window.__dt`，每次推一帧、`Core.render = false`；
  2. 自己 `renderer.render` 再 `toDataURL`；
  3. 动画要是用 `performance.now`，就把它也接管成 `window.__vt`。
  例子：`source/tools/td/steprec_juma.py`（拒马演出）、`arcrec.py`（弧线）。
- CSS 动画在无头里会卡住，截弹框前注入 `#mAsk{animation:none!important}` 一类的样式。
- 落子入局这种实时动画，可以用 `luozi_check.py` 只核对位置（格线和木盘线对不对得上）。
- `perfinfo.py`：手机尺寸下的绘制次数、三角形数、帧率请求数，查发烫用。
- 杀进程只按编号杀（`ps -eo pid,args` 找），别用 `pkill -f`：会把自己的 shell 也杀掉。

## 8. 最近做过的（10-10）

- 声音整块交给声音部（交接文档 `SOUND-WORKFLOW.md`）。
- 美术总监 V1～V4 全部上线：
  - V1 落子入局过场、手机竖屏镜头；
  - V2 晋升题签钉在棋子头上；
  - V3 电脑宽屏镜头让开名牌、大厅主按钮；
  - V4 不可用技能按钮深暖灰。
  - 执黑时的镜头按棋盘中线镜像，这是 TD 改的，见 `td-to-ad.md` 的 T3。
- 美术 M23 棋面汉楚细圈、M25 战象特效上线。
- 审批台 td-024：弧线选“画线”，踏营改被动，上线。
- 省电：手机默认开，保留抗锯齿（td-025 选乙）。
- 人机被将死后 10 秒内可悔棋（td-022）；结算卡的复盘和分析合成一个按钮（td-023）。
- 数值部 C65、C66 电脑提速上线。

## 9. 没办完的事

1. **楚汉审批台按“审核页面规范”改**（WORKFLOW 第 3 节八条：回执显示、一次全部提交、发测试通知、改用发评论通知……）。这张页面美术和 TD 共用，要不要改、怎么改，问 Ham。
2. **声音部 S2** 要交：盾挡声、汉胜和汉败结算曲（随机放）、兵卒打斗气声和嘲讽群吼。交来后：
   - 合进 `audio.js`、`endtunes.js`；
   - 触发点由 TD 接，盾挡声的时间点见美术 M27（对打扣血版 1.18 秒、击杀版 1.17 秒），对打本身等美术交付。
3. **美术的兵卒对打、拒马新动画**（弩手射、虎骑冲毁、象踏碎）还没交 TD；交来时会写在 `model-to-main.md`。
4. **数值部**：r36 新权重在跑，过了门槛会交补丁。
5. 小事：调试用的网址参数可以清掉一部分；合过的远端 `td/*` 分支删不掉。

## 10. 旧 TD 留下的东西在哪

- 所有代码、文档、工具都在仓库里（`source/tools/td/`、`source/tools/sound/`）。
- 旧会话的临时目录会随会话消失。里面只剩录好的图和片子（审批台上都有），不用找。
- 记忆：Ham 的账号有一份跨会话的记忆，新会话会自动看到 Ham 的偏好，但看不到这里的项目细节。项目的事以这份文档和仓库为准。
