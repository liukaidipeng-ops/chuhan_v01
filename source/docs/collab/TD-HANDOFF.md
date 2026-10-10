# TD 交接文档（TD 聊天窗口 → 新的 TD Code 窗口）

> 老 TD 会话 session_01RKuN4E66BetRaUCS8BJyti 写于 2026-10-10，照数值部的清单 `td-handoff-checklist.md` 分 11 节。
> 新 TD 开工前按顺序读：`WORKFLOW.md` → 这份 → `README.md`。写着“Ham 原话”的地方都是照抄。
> **过渡期**：新 TD 在 `chat-to-code.md` 或给 Ham 的回复里说“接住了”之前，上线仍由老 TD 做，新 TD 不推 `main`，免得两边同时推。

---

## 1. 管什么

**TD 管**：
- 整合、打包、上线、测试；性能由优化部量、出补丁，TD 合并上线；
- 规则引擎和技能模式规则：`rules.js`、`engine.js`、`jq.js`、`bingfa.js`；
- 游戏流程和界面逻辑：`main.js`、`net.js`；
- 三维场景和演出的代码：`core.js`、`board.js`、`fx.js`、`squads.js`、`bfx.js`、`camp.js`、`spect.js`、`ending.js`、`turnglow.js`、`models.js`、`tiger.js`；
- `build.js`、`test/`、`tools/`（除各部门自己的子目录）、`.github/workflows/`；
- 部门总表（WORKFLOW 第 2 节）的维护。

**已经交出去的**（TD 现在只管“接进来、打包、上线”）：
- **声音** → 声音部：`audio.js`、`endtunes.js`、`voice/`、`sfx/`、`music/`、`tools/sound/`、`tools/tunes.py`。
- **界面视觉** → 美术总监（朱墨）：
  - `template.html` 的样式和页面结构（`id`、`data-*` 仍归 TD）；
  - `face.js`、`merit.js`、`luozi.js`、`upfx.js`、`fonts/songhei-*`。
  - 美术总监要等美术交完结算动画交接后才正式接手。
- **角色、模型、动画** → 美术（角色部），分支 `model-lab`。改法常写在 TD 的文件里（`squads.js`、`models.js`），由 TD 照着改。
- **电脑（`bfai.js`）** → 数值部调。TD 照它交付单里的补丁打。
- **性能**（卡顿、发热、加载慢）→ 优化部（10-10 开）：它量、出改法和补丁，TD 合并上线；会改画面的先过 Ham。

**各部门交来的东西，接的时候查什么**：
- **数值部（电脑补丁）**：
  - 补丁 `git apply --check` 能干净打上；
  - 测试全过，特别是 `bfai`、`bfai.policy`；
  - 交付单里写了对打成绩（WORKFLOW 第 4 节门槛：对线上换边 ≥ 600 局，得分 > 50% 且 z ≥ 2；或者是小修，不变弱）；
  - 规则、数值类改动要有 Ham 拍板。
- **美术、美术总监**：
  - 交付单要写明 Ham 在哪个审核页面、哪件、何时通过——写了就可以直接接、上线（Ham 授权过），没写先问；
  - 改法照抄，接完自己截图看一眼（手机、电脑各一张）；
  - 发现改法在真实游戏里不对，可以改，但要在回复里写清改了什么、为什么。例子：V1 的格线投影、V3 执黑时的镜头。
- **声音部**：试听台通过的才收；新的触发点由 TD 接（`fx.js`、`squads.js`、`bfx.js`、`main.js`）。

## 2. 仓库和分支

- 仓库 `liukaidipeng-ops/chuhan_v01`（公开仓库：不放令牌、密码）。
- **`dev`**：TD 的整合分支，所有改动先进这里。
- **`main`**：线上。GitHub Pages 从 `main` 的根目录发布。只由 TD 用 `git push origin dev:main` 快进，不在 `main` 上直接提交。
- **`td/*`**：TD 的临时分支，一件事一个，比如 `td/luozi`、`td/v3`。做完快进合进 `dev`。代理不让删远端分支，合完留着不用管。
- **各部门分支**（只有该部门推，TD 只读）：

  | 分支 | 部门 |
  |---|---|
  | `claude/gallant-planck-rwr5az` | 数值部 |
  | `model-lab` | 美术（角色部） |
  | `claude/art-director` | 美术总监 |
  | `claude/sound` | 声音部 |
  | `claude/advisors` | 顾问部 |
  | `claude/perf` | 优化部 |
  | `voice-lab` | 声音部用 MiniMax 合成配音，推送会触发 Actions |

- **不要整个合并数值部的分支**：上面常有还没验收的电脑改动。只取它点名的文件（比如 `WORKFLOW.md`），或照交付单的补丁打。别的部门的分支合之前，先看 `git diff --stat origin/dev...<分支>`。
- **根目录的部署产物**：`index.html`、`version.json`、`voice-real.bin`、`voice-bf.bin`、`voice-orig.bin`、`sfx.bin`、`music-war.mp3`。
  - 全是 `source/dist/site/` 打包出来再拷过去的，**不要手改**，改了下次打包就被覆盖。
  - `.nojekyll` 是空文件，让 Pages 不走 Jekyll，别删。

## 3. 打包、测试、上线

**第一次**：
```bash
git clone https://github.com/liukaidipeng-ops/chuhan_v01 && cd chuhan_v01 && git checkout dev
cd source && npm install          # three@0.158.0、qrcode-generator；联机测试要 aedes、ws（devDependencies）
```
Python（截图、联机测试）要 `playwright`，浏览器已经装在 `/opt/pw-browsers`，别 `playwright install`。声音工具要 `numpy`、`scipy`、`ffmpeg`。

**打包**：`cd source && node build.js`，不到 1 秒，输出到 `source/dist/site/`。大小（10-10）：

| 文件 | 大小 | 说明 |
|---|---|---|
| `index.html` | 2.7 MB | 手机首屏只下这个 |
| `voice-real.bin` | 5.0 MB | 写实配音，选了才取 |
| `voice-bf.bin` | 5.3 MB | 技能模式句子，进技能模式才取 |
| `voice-orig.bin` | 2.9 MB | 原版配音 |
| `sfx.bin` | 1.5 MB | 页面一开后台取 |
| `music-war.mp3` | 1.2 MB | 选了“战意”才取 |

大件一律放旁边的包，别内嵌进 `index.html`。

**测试**（`source/` 下）：
```bash
for t in rules engine jieqi bingfa beishui r6 bfai bfai.policy; do node test/$t.test.js | tail -1; done
```
- `rules`：象棋走法；`engine`：搜索引擎；`jieqi`：揭棋；
- `bingfa`：技能模式规则，最常改；
- `beishui`：背水一战；`r6`：试行规则（默认关）；
- `bfai`：电脑自己下，查合法、不卡死；`bfai.policy`：电脑用兵法的时机。后两个要几分钟。

现在全部通过，没有已知不过的。

联机全流程：`python3 tools/nettest2.py`（本地 MQTT 中继 + 两个浏览器）。脚本里 `D=` 写死了仓库路径，按需改。技能模式联机：`tools/bfnet.py`。改了开局、房间、联机要跑。

**上线**：
1. 把要上的分支合进 `dev`，然后 `grep -rn '^<<<<<<<' source/src`，确认没有冲突标记。
2. 在 `src/main.js` 顶上的 `NEWS` → `['第六版', '2026 年 10 月', [...]]` 最前面加一句给玩家看的更新说明：白话，不写技术词，说清“玩家看到什么变了”，可以注明是哪个部门做的。
3. 跑上线脚本：`bash source/tools/td/deploy.sh "这次上线了什么"`。它会：
   - 打包；
   - 拷 7 个产物到根目录；
   - 检查冲突标记和符号链接；
   - 提交“部署 <版本>：…”；
   - 推 `dev`，再推 `dev:main`。
4. **版本号**：`build.js` 生成，格式“日期-摘要”，比如 `2026.10.10-0e1c2a`，写进 `version.json`。开着页面的玩家会收到“有新版本”的提示，微信里缓存顽固，靠它刷新。声音包网址带 `?v=<摘要>`，换了素材自然取新的。
5. **`pages-rebuild.yml`**：每次推 `main` 就请 Pages 重建一次（以前 Pages 有时不自己重建）。所以每次推送会出现两次 `pages build and deployment`，其中一次 `cancelled` 是正常的。
6. **核对上线**：一两分钟后
   ```bash
   gh api 'repos/liukaidipeng-ops/chuhan_v01/actions/runs?per_page=3' --jq '.workflow_runs[] | [.name,.head_sha[0:7],.status,.conclusion] | @tsv'
   ```
   最新提交的 `pages build and deployment` 要是 `success`。再看线上 `https://liukaidipeng-ops.github.io/chuhan_v01/version.json` 是不是新版本号（沙盒里 curl 可能不通，用 WebFetch，或请 Ham 刷一下）。
7. 上线后在对应部门的往来文件回一条（第 6 节）；审批台批的那件写回执（第 8 节）。

**回滚**（最快的办法：把根目录 7 个产物换回上一次部署的）：
```bash
git log --oneline --grep '^部署' -3          # 找到上一次部署提交，比如 abc1234
git checkout abc1234 -- index.html version.json voice-real.bin voice-bf.bin voice-orig.bin sfx.bin music-war.mp3
git commit -m "回滚到 abc1234 的线上版本：<原因>" && git push origin dev && git push origin dev:main
```
- 源码没退，之后修好再正常上线。
- 要连源码一起退，就 `git revert` 出问题的合并提交，再重新打包上线。

**部署前的检查**：
- 测试全过；
- 视觉改动截图看一眼，手机 390×844、电脑 1280×720 或 1440×900；
- 碰了镜头、渲染的，看一下 `?perf` 面板或 `tools/td/perfinfo.py`（绘制次数、三角形数）。

**坑**：
- `git add -A source` 会把本地 `source/node_modules` 符号链接带进去，Pages 打包失败（10-10 踩过，`.gitignore` 已补，脚本也会拦）。
- NEWS 每次合并几乎都冲突，两边都留。

## 4. 线上和外部服务

- **线上网址**：https://liukaidipeng-ops.github.io/chuhan_v01/ 。GitHub Pages，来源是 `main` 根目录，有 `.nojekyll`。
- **联机**：MQTT over WebSocket，用公共中继，没有自己的服务器。`src/net.js` 开头 `DEFAULT_BROKERS`：
  1. `wss://broker.emqx.io:8084/mqtt`（EMQX，国内可达）
  2. `wss://broker.hivemq.com:8884/mqtt`
  3. `wss://test.mosquitto.org:8081/mqtt`

  三条同时连，任一条通就能下。主题前缀 `chuhan3d/v2/`，按房间码收发；大厅列表也走它（保留消息）。
  - 玩家可以在设置里填自己的服务器（设置键 `server`），填了就只连那一个。
  - **挂了怎么办**：一条挂了不影响。三条都不通时：
    - 先看是不是玩家网络的问题；
    - 再在 `DEFAULT_BROKERS` 里换或加公共中继（要支持 WSS + MQTT 3.1.1）；
    - 或者自建：`tools/mqttsrv.js` 是本地测试用的中继（aedes + ws），可以照着部署到一台服务器，再把地址加进列表。
- **仓库 Secrets**（只写名字）：
  - `MINIMAX_API_KEY`：MiniMax 语音合成，`voice-lab` 分支的 Actions 用，现在归声音部；
  - `GITHUB_TOKEN`：Actions 自带，`pages-rebuild.yml` 用。
- **玩家端令牌**：「发给数值部」功能用的 GitHub 令牌只存在 Ham 浏览器的本机存储里（设置键 `ghToken`），不在仓库。
- **其他外部依赖**：
  - 运行时没有：three.js、二维码库、字体（志莽行书、思源宋体子集）全打进 `index.html`，不连 CDN、不连 Google 字体；
  - 素材来源和署名见「玩法说明」末尾（0 A.D.、OpenClonk 等）。
- **GitHub Actions 其他工作流**：数值部的 `bfsim.yml`（在它的分支上，跑模拟）；`voicelab.yml`（`voice-lab` 分支）。

## 5. 代码地图和关键接口

`source/src/`，`build.js` 的 `order` 就是加载顺序：

| 文件 | 一句话 |
|---|---|
| `rules.js` | 象棋规则（`XQ`）：走法、将军、困毙 |
| `engine.js` | 普通象棋的电脑：搜索引擎，在 Web Worker 里算 |
| `bingfa.js` | 技能模式规则（`BF`）：升级、生命、技能、兵法、决战；`CFG` 是规则开关 |
| `bfai.js` | 技能模式的电脑（`BFAI`），数值部调 |
| `core.js` | 渲染循环、镜头 `Cam`、画质、省电 `ECO`、补间 |
| `face.js` | 棋子字面（美术总监） |
| `board.js` | 棋盘、棋子、皮肤（木银金玉）、走法提示、弧线 `arcFx` |
| `turnglow.js` | 轮到谁的半场格线闪烁 |
| `models.js`、`tiger.js` | 兵种模型、汉相虎骑 |
| `audio.js`、`endtunes.js` | 声音（声音部） |
| `fx.js` | 特效、兵种台词触发 `bark` |
| `upfx.js` | 升级翻面（美术总监） |
| `squads.js` | 兵种小队演出、死法、拒马、对抗 |
| `camp.js`、`spect.js` | 两边军营、观战席 |
| `ending.js` | 结算动画 |
| `net.js` | 联机 |
| `jq.js` | 揭棋 |
| `bfx.js` | 技能模式演出（`BFX`）：题签 `rankPop`、技能、践踏 |
| `merit.js` | 军功（美术总监） |
| `luozi.js` | 开局“落子入局”过场（美术总监） |
| `main.js` | 总流程：大厅、开局 `startGame`、房间、设置、复盘、分析、NEWS、悔棋宽限、导出对局 |
| `template.html` | 页面骨架和样式 |

`build.js` 的 `order` 里列着的文件不存在就跳过（比如 `ui`）；`rules`、`bingfa`、`bfai` 单独放进 `<script id="eng">`，同一段代码塞进 Worker 算棋。

**关键接口**：
- **电脑观察接口**（数值部 H54 / C62）：`BFAI.apiVersion = 1`、`BFAI.obsVersion = 1`。`BFAI.trace = true` 时，`think` 会在 `think.last.trace` 留思考记录；还有 `scoreParts`。都是只读，不影响走法。
- **对局导出**：`main.js` 的 `exportGame(raw)` 返回对局 JSON（`raw = true`）或文本。
- **「发给数值部」**：开 GitHub 工单，标题“对局 · …”，标签 `对局`。正文超过 6 万字就 gzip + base64（```` ```bfgz ````），还超就拆成几块，后面的块放评论，每块写“第 i/n 块”。代码在 `main.js` 的 `GH_REPO` / `GH_LABEL` / `gzip64` 一带。
- **规则开关 `BF.CFG`**（`bingfa.js` 第 12 行起），常用的：
  - `finalKingHp: 3`、`finalOccupyRounds: 3`：决战；
  - `beishui.on`：背水一战，新局默认开，旧局按 `opts.bs`；
  - `r6.on`：试行规则，默认关，`?r6=1` 才开；
  - `skills.*`：各技能，比如 `juma.counterElephant: false`、`feiyue {cooldown:5, passive:true, move:true}`、`taying {cooldown:2, enemyHalfOnly:true, passive:true, move:true}`；
  - `attack`、`merit`：攻击力、军功。
  - 每局用哪套规则记在 `opts`（`bs`、`r6`），联机双方和观众一致。
- **设置**：存在本机存储 `xq3d-<键>`（`main.js` 的 `store`）。键名：
  - `music`（zen / war / off）、`vMusic`、`vSfx`、`vVoice`、`voice`（2 写实 / 1 原版 / 0 关）；
  - `models`、`eco`（手机默认 1）、`debris`、`confirm`（落子点两下，默认开）、`turnfx`、`vis`、`gore`、`server`、`speed`、`view`（镜头三档）；
  - 开局选项 `aopts`（人机）、`ropts`（房间）；`resume`（续局）、`ghToken`。
- **测试钩子**：`window.__xq`（`game`、`startGame`、`doBF`、`Board`、`Core`、`BFX`、`busy`……）。
- **网址参数**：
  - `?perf` 帧率面板；`?eco=1` 强制省电；
  - `?arcv=0..5` 弧线样式（默认 3）；`?grace=N` 悔棋宽限秒数；
  - `?r6=1` 试行规则；`?tiger=1` 虎骑预览；
  - `?nogl` 不画三维；`?nopaper`、`?nobd` 录屏用；
  - `#local`、`#ai-<档>-<方>`、`#bfai-<档>-<方>` 直接开局。

**动了容易出事的地方**：
- `audio.js` 开头苹果手机静音键那段（循环放 1 秒真静音）：删了，苹果开着静音键就没声。
- 升级解将：被将军时只有升级能解，升错了子的算法，Ham 在 td-017 选了 B。
- 技能模式的悔棋是按“行动序列”退回，联机三方要一致。
- `core.js` 镜头：`Cam.homeT / homeRad / homePhi` 管手机竖屏、电脑宽屏的默认机位，执黑按棋盘中线镜像。
- `startGame` 里的落子入局过场：开局等待里有 `await`，房主的 `snapshot()` 要在 `mkGame` 之后。
- 联机时序：房主开局后立刻发 `welcome`。

## 6. 和各部门的往来

正文写进仓库文件、每条编号，再用 `send_message` 提醒对方。门铃只当备用；老 TD 没有 `send_message`，只能按门铃。

| 部门 | 对方 → TD | TD → 对方（写在 `dev`） | 编号到 | 没结的 |
|---|---|---|---|---|
| 数值部 | `code-to-chat.md`（C 号，它分支） | `chat-to-code.md`（H 号） | C66 / H63 | 无。C65、C66（难走多想 `bfai_dyn.patch`）**都已上线**（2026.10.10-015b88，H61）。r36 新权重在跑，过了会交 C67 |
| 美术（角色部） | `model-to-main.md`（M 号，`model-lab`） | `main-to-model.md`（H 号） | M27 / H31 | M26（盾挡声）转给声音部；M27 是给声音部的时间点；兵卒对打、拒马新动画还没交 TD |
| 美术总监 | `ad-to-td.md`（V 号，`claude/art-director`） | `td-to-ad.md`（T 号） | V4 / T4 | 无，V1～V4 全部上线 |
| 声音部 | `sound-to-main.md`（S 号，`claude/sound`） | `main-to-sound.md`（H 号） | S1 / H1 | 等 S2 |
| 顾问部 | `advisors/advice.md`（A 号），数值部回 | — | — | 无直接往来 |
| 优化部 | `perf-to-main.md`（P 号，`claude/perf`） | `main-to-perf.md`（H 号，新开） | 还没有 | 10-10 开，还没交过 |

## 7. 正在做的和排着的

- **手上**：无，交接文档就是最后一件。
- **审批台 td 项**（10-10 读数据库核对）：td-015～026 全部批完、照做完、上线。
  - 没有待批的 TD 条目；
  - 下一个编号 **td-027**，`seq` 下一个 **71**。
- **排着的**：
  1. 声音部 S2：盾挡声、汉胜和汉败结算曲（随机放）、兵卒打斗气声和嘲讽群吼。接法：
     - 合进 `audio.js`、`endtunes.js`（声音部的文件）；
     - TD 接触发：盾挡声在兵卒对打扣血版 1.18 秒、击杀版 1.17 秒（美术 M27），要等美术交对打。
  2. 美术的兵卒对打、拒马新动画（弩手射、虎骑冲毁、象踏碎）交来后接；声音部会配声。
  3. 数值部 C67（r36 权重），交来照门槛验收。
  4. **问 Ham**：楚汉审批台要不要按 WORKFLOW 第 3 节“审核页面规范”改。还差回执显示、一次全部提交、发测试通知、改用发评论通知这些。页面美术和 TD 共用。
  5. 小事：清掉一部分调试网址参数。

## 8. 审核页面、提醒、门铃

**审核页面**：
- **楚汉审批台** https://claude.ai/artifact/79HGpeuQGk3jehJmHsJsfn ：美术（角色部）和 TD 共用，TD 条目是 `td-0xx`。
  - **出题**：
    1. 图放进仓库里的临时文件夹（比如 `.desk_up/`），用 Artifact `publish`，带 `url`、`asset: true`、`file_paths`，拿回 `/_blob/<id>`，然后删掉临时文件夹。页面只显示 `<img>`，动图可以。
    2. 用 ArtifactData 在 `items` 里 `set` 一条，字段照抄 `td-026`：`id, dept:"TD", seq, kind:"approve"|"choice", status:"pending", createdAt, title, ask, points[], images[{cap,id,url}], options[]（choice 才要）, after`。
    3. 一次要出好几件，合成一批写。
  - **收结果**：`status` 变成 `approved` / `changes` / `chosen`，同时有 `choice`、`note`、`decidedAt`。照 `note` 做完，在那件上写 `ack: {at, text}` 当回执。
  - **实测送得到**：10-10 两次——td-024（Ham 18:13 提交）和 td-026（19:05 提交），提醒都在约一分钟后进了老 TD 会话，运行记录是 SUCCEEDED。这条路对老 TD 是通的。美术总监那边送不到，是它的门铃（别人按的 `fire_trigger`），不是这张审批台。不过 WORKFLOW 第 3 节规定通知只认“发评论给 Claude”，新 TD 照规定改（下面的甲）。
  - **通知现在怎么走**：页面源码里写死了提醒编号（约第 109 行 `const NOTIFY = { '美术': 'trig_01FF1yaK8ZRBKWk3osCQKoAP', 'TD': 'trig_01Go7ZszLJ61ybdE1vBuCKLw' }`）。Ham 提交时，页面把那个提醒改成一分钟后响，提醒绑在老 TD 会话上。
  - **新 TD 接手第一件事**，二选一，做之前先告诉 Ham：
    - 甲（推荐，WORKFLOW 第 3 节）：把审批台改成“页面替 Ham 发评论给 Claude”的通知方式，评论发到新 TD 会话，照美术总监审批台的写法（源码在 `claude/art-director` 的 `source/art-director/pages/shenpi.html`）。
    - 乙（最快）：建一个绑在新 TD 会话上的提醒（`create_trigger`，不设时间），把页面里 `'TD'` 那个编号换成它，重新发布页面。美术那个编号别动。

    两种都要：用 Artifact `read` 拿线上最新源码（仓库里 `source/tools/td/desk/shenpi-index.html` 只是 10-10 的底稿），改完 `publish` 带 `url`。
- **配音试听台** https://claude.ai/artifact/DGdGe1guoi1pB8UUNDfkS5 ：已交给声音部，声音部又建了自己的新试听台。TD 不再管。

**老 TD 名下的提醒**（都绑在老会话 session_01RKuN4E66BetRaUCS8BJyti）：

| 编号 | 干什么 | 交接后 |
|---|---|---|
| `trig_01Go7ZszLJ61ybdE1vBuCKLw` | 审批台 TD 条目的通知（页面按钮触发；处理完要推回一年后） | 新 TD 换掉通知方式后停掉（`update_trigger enabled:false`） |
| `trig_01W35STHBCavAc6wHcR1tsZ5` | 旧配音试听台的“提交”按钮 | 已不用：试听台交给声音部，它改了通知，又建了新试听台。新 TD 接住后由老 TD 停掉（`enabled:false`） |

这两个就是老 TD 名下全部的提醒（10-10 用 `list_triggers` 核过）。

**别的部门装的门铃**（`fire_trigger` 按，附一句话；正文以文件为准）：
- 数值部 `trig_0171tqGyJSqcPNCKuoPgWADs`：实测能送到；
- 美术总监 `trig_01NqCZdJhgejZoZdWGS9nejC`：美术总监说一直收不到，运行记录里也没有；
- 声音部 `trig_01FiP6dgMSFYgkevQ4srqoZK`。

Code 窗口有 `send_message`，优先用它。按门铃前要 Ham 说“可以按”（他的规矩）。

**老 TD 没有给自己装门铃**：别的部门有事给 TD 都是 `send_message` 到老会话。新 TD 接住后，告诉各部门新的会话号，部门总表 TD 一行也改掉。

## 9. Ham 的规矩和口味（原话为准）

- 说中文（“说中文”），简洁，适合手机看。做错了先认错，再解释。
- 按他实际问的范围答，他列出的每一项都要答到。
- **视觉改动先出图给他看，他点头才做、才上线。** 交付单写明 Ham 已在审核页面通过的，可以直接上线（他授权过）。
- 要他定的事一律挂审核页面；“有更新你直接上审批台就行了”，聊天里短说。
- 一轮要写好几件，合成一批写，Ham 每轮只点一次“允许”。
- 每次回复最后单起一段「正在做」：手上在做什么、做到哪一步；在等谁、等什么；都没有写“手上没有活，等你吩咐”。
- 他找错部门要当场指出来（“专术有专攻”）。
- 说“还有几件等你批”之前先读审核页面的数据库。
- 上线后更新 NEWS 和往来文件。
- 省额度：不开子代理，除非他同意。
- **退回过的典型问题**：
  - 弧线：要真有高度、从子顶到子顶；“直着过去，不要曲溜拐弯”；“极简风格”；太细远处看不见。
  - 弹框：“弹框居中，现在太靠上了”。
  - 血：被拒马击中后“地上也需要有血”。
  - 手机：“手机发烫很厉害”——省电默认开，但“暂时先保留抗锯齿”。
  - 跟随：升级铭牌“需要固定到棋子头上，不应该随着摄像机移动而移动”。
  - 自查：“给我看之前一定要自查！！”（对美术总监说的，TD 一样适用）。
  - 节奏：Ham 喜欢“先出几个方案选”。比如弧线出了五个方案，人机被将死给 10 秒悔棋。

## 10. 坑和窍门

- **临时目录的工具已经收进仓库** `source/tools/td/`（说明见那里的 `README.md`）：
  - `deploy.sh`：上线；
  - `steprec_juma.py`：逐帧录屏的例子；
  - `arcrec.py`：弧线录屏；
  - `luozi_check.py`：过场格线核对；
  - `perfinfo.py`：手机性能；
  - `desk/shenpi-index.html`：审批台底稿。

  要装 Playwright（已装）、ffmpeg、Python 的 PIL（拼图用）。声音的工具在 `source/tools/sound/`（见 `SOUND-WORKFLOW.md`）。
- **无头浏览器**用软件渲染，非常慢，实时动画录不了。逐帧录的做法：
  1. 把 `THREE.Clock.prototype.getDelta` 换成返回 `window.__dt`；
  2. 每推一帧，`Core.render = false`，自己 `renderer.render` 再 `toDataURL`；
  3. 动画用 `performance.now` 的，就把它也接管。
- 截弹框前注入 `#mAsk{animation:none!important}`（无头里 CSS 淡入会卡住）。
- 题签这类 CSS 动画会自己淡出，要截就注入 `animation:none; opacity:1`。
- 大厅盖着时主循环不推镜头（`Core.sleepy`）。要在大厅还盖着时算投影，先 `Core.Cam.update(0)`。
- 实时过场（落子入局）在无头里会慢十来秒，联机测试开局等待已放到 75 秒。
- 标准模式的电脑用走子历史，直接改棋盘它不认；测技能模式就用 `game.setup` / 改 `game.S.board` 再 `Board.reconcile`。
- 杀进程按编号杀（`ps -eo pid,args` 找），别用 `pkill -f`，会把自己的 shell 杀掉。
- **缓存**：微信内置浏览器缓存顽固，靠 `version.json` 的提示刷新；声音包靠 `?v=`。
- **iOS 音频**：见第 5 节静音那段。
- **包体积**：手机首屏只下 `index.html`，别往里塞大东西。
- **聊天窗口和 Code 窗口的差别**：
  - 老 TD（聊天窗口）没有 `send_message`，只能写文件 + 按门铃。Code 有 `send_message`，优先用它。
  - 推 GitHub：两边都是 `git push`，代理给了推送权限。`gh` 只有 `gh api` 能用；删远端分支被代理挡。
  - Code 里要先 `npm install`（老 TD 是把 `node_modules` 链到一个装好的目录，所以出过符号链接被提交的事）。
  - 沙盒的网络只放行 GitHub 和包管理站点，`curl` 线上网址可能不通，用 WebFetch。
  - 审批台、试听台的读写用 Artifact / ArtifactData 工具，两边都有。

## 11. 交接以后

- **过渡期**：新 TD 确认接住之前，上线仍由老 TD 做，新 TD 不推 `dev` / `main`，免得两边同时推。
- **“接住了”以什么为准**：三件都做完，就在 `chat-to-code.md` 写一条 H“TD 接住了”，同时告诉 Ham。
  1. 本地打包、测试全过；
  2. 审批台通知换到自己，并出一件测试题请 Ham 点，自己收到了；
  3. 各部门发了新会话号，部门总表 TD 一行改好。
- **接住以后**：老 TD 窗口只答疑，不再推 `dev` / `main`、不再上线；停掉自己名下两个提醒。
- **新 TD 第一周最该盯的三件**：
  1. 审批台通知换到自己（第 8 节），并在审批台出一件测试题，请 Ham 点一下，确认收得到。
  2. 接声音部 S2 和美术的兵卒对打（第 7 节第 1、2 条），盾挡声的时间点要和画面对上。
  3. 每次上线照第 3 节核对 Pages 真的成功（10-10 出过一次打包失败，没人发现就等于没上线）。
