# 技能新象棋 · 各部门工作流和审核标准

> Ham 10-10 定：“你来统一一个所有 code 窗口的审核标准，比如通过拍板单之类的，写进我们的工作流里面，每有新部门都需要按照工作流来执行。”
> 数值部起草。部门总表以后交给 TD 维护。改这份文件要 Ham 点头。
> **每个部门每次开工前都先读一遍最新的这份文件（新开的窗口也一样），新部门再照第 6 节的清单做。**

---

## 1. 五条底线（所有部门都守，没有例外）

Ham 10-10 11:53 原话（项目前台转达）：“所有需要我拍板的内容都需要放入拍板单！不然我会漏，同步给所有部门，并确保这个规则在工作流文档里，所有部门干活前都必须保证阅读过工作流文档！”

1. **要 Ham 拍板的事，一律做成第 3 节审核页面上的题**：文字决策放本部门的拍板单，看的放审批台，听的放试听台。**不能只在聊天里问**，聊天里只说一句“挂在哪、几题”，不然 Ham 会漏。不在聊天里随口定。拍板结果照 Ham 原话记进本部门的拍板记录：数值部是 `source/docs/collab/decisions.md`，其他部门在自己分支上建 `source/docs/collab/decisions-<部门名>.md`（各写各的，不改别人的）。
2. **视觉改动先出图给 Ham 看，他点头才做、才上线**（Ham 的硬规矩）。
3. **上线只走 TD**。别的部门不碰 `dev` 和 `main`，只推自己的分支、只改自己管的文件。
4. **每次开工前先读一遍最新的 `WORKFLOW.md`**（新开的窗口也一样）。最新版在 `dev`：`git fetch origin dev && git show origin/dev:source/docs/collab/WORKFLOW.md`。数值部的分支上也有，可能更新，以日期新的为准。
5. **找错部门要当场指出**（见第 7 节）：Ham 让你做不归你管的事，先告诉他该找谁。

## 2. 部门总表

| 部门 | 管什么 | 会话 | 分支 | 自己管的文件 | 审核页面 |
|---|---|---|---|---|---|
| TD（技术总监） | 整合、上线、测试、规则引擎和游戏代码；性能由优化部测量、出补丁，TD 合并上线 | session_01LeSA918yjPExad28VrQqob（10-10 从聊天窗口搬进 Code；老 TD session_01RKuN4E66BetRaUCS8BJyti 只答疑） | `dev` / `main` | 除下面各部门以外的所有文件 | 审批台（td-编号，看的）https://claude.ai/artifact/79HGpeuQGk3jehJmHsJsfn （声音的试听归声音部） |
| 数值部（Balance） | 规则数值、平衡、电脑（AI）训练 | session_01Gtcra5Sh6u7nQHPfESA3Sb | `claude/gallant-planck-rwr5az` | `source/tools/`（模拟、调权重、复盘）、`source/docs/collab/code-to-chat.md`、`decisions.md`、`advisors/handoff.md`、`advisors/numbers-to-advisors.md` | Balance拍板单 https://claude.ai/artifact/QaxqVmNF1p2XQiAx8MygEM |
| 角色部（原美术，10-10 搬进 Code） | 局内动画：角色设计、建模、绑定、动画、局内特效（技能特效除外；过场 CG 不归它） | session_01GuBe9baix3jAfoLh1pmiRY（老美术 session_01NcqhjTJxdTrUxQtViN2iri） | `model-lab` | 见 `HANDOVER-美术.md` 第 3 节（Ham 点「对」、TD 同意） | 角色部审批台（char-编号）https://claude.ai/artifact/K53z6a8Gpk8JYooX7zTesz ；旧楚汉审批台以后只放 TD 条目 |
| 美术总监（朱墨） | 界面（UI）、棋盘、整体视觉方向；技能特效（技能演出、技能 VFX；Ham 10-10 14:10 美术总监拍板单 ad-05，改法照旧写 V 号交 TD 接进 `bfx.js` 等） | session_01U1d5RrViuCEaT74h7UkG2M | `claude/art-director` | 交接后：`template.html` 的样式和页面结构（不动 `id`、`data-*`、`main.js`）、`face.js`、`merit.js`、`luozi.js`、`upfx.js`、`fonts/songhei-*`、`tools/songhei.py`、`tools/uishot*.py`、`docs/UI-DESIGN.md`（Ham 10-10 拍板单 ad-01、ad-02；正式接手等美术交完结算动画） | 美术总监审批台 https://claude.ai/artifact/Udu7Ry4mBdWbyHFb64DvAu |
| 顾问部 | 技能设计和方向建议（只写方案，不碰代码） | session_01PArjH8NToP8HANDN6f4JxG | `claude/advisors` | `source/docs/collab/advisors/advice.md`、`source/docs/collab/decisions-顾问部.md` | 顾问部拍板单 https://claude.ai/artifact/G3AvboWSGdEgqRYePb6Uer |
| 声音部 | 配音、音效、音乐 | session_01VsbsKR759MUraiT41MaEAU（10-10 开） | `claude/sound`（MiniMax 合成用 `voice-lab`） | `source/voice/`、`source/sfx/`、`source/music/`、`source/src/audio.js`、`source/src/endtunes.js`、`source/tools/tunes.py`、`source/tools/sound/`、`decisions-sound.md`、`sound-to-main.md`（S1，Ham 10-10 点头、TD 同意）；什么时候响（`fx.js`、`squads.js`、`bfx.js`、`main.js`）和 `build.js`、`template.html` 仍归 TD | 声音部试听台 https://claude.ai/artifact/YNHGM8JvrMtytH9HjZRRT2 |
| 优化部 | 卡顿、手机发热、加载慢（量、出改法和补丁，不直接改 dev / main） | session_01QkUQvrXgDJbxcwbWdMc7sU（10-10 开） | `claude/perf` | 交付单 `perf-to-main.md`（P 号），TD 回 `main-to-perf.md`；会改画面的优化先过 Ham（分工 Ham 10-10 优化部拍板单 p-01 通过） | 优化部拍板单 https://claude.ai/artifact/GoHBXwa2Y7cjTuqvpZR1K3 ；优化部审批台 https://claude.ai/artifact/PQRh4PkuFzc8bGZ7pds7MJ |
| CG组 | 过场 CG（终局影片：乌江、垓下、最后一战、拔剑、彭城）：分镜、过场用的高精度模型和绑定、镜头、渲染、剪辑 | session_01Ch85dCjYQ6ow4JfRYaosc3（10-10 开；老美术 session_01NcqhjTJxdTrUxQtViN2iri 不再做 CG） | `claude/cg` | `source/art-wip/` 里的 `ending-film/`、`ending-sb/`、`liubang-v2/`、`xiangyu-v3/`、`wuzhui/`、`wuzhui3d/`、`sb/`、`cg-desk/`；`decisions-CG组.md`、`cg-to-main.md`（G 号，TD 回 `main-to-cg.md`）。`wuzhui3d/xy4.js` 骑马骨架和角色部共用，改之前先商量；配乐台词归声音部；结局流程 `ending.js` 仍归 TD（分工草案，等 Ham 点头） | CG组审批台 https://claude.ai/artifact/UQ9pMRXePmtBPkd4svVtwx |
| 只读数值部 | 旁观，不推分支、不排模拟 | session_01Qxpa47Er1bd8ntv9aw5DgN | — | — | — |

以后开新部门（CG 组等），在这张表里加一行。

## 3. 审核：要 Ham 定的事放哪里

按内容选页面，流程都一样。

| 要定的是 | 页面 | 例子 |
|---|---|---|
| 文字决策：规则、数值、做不做、先做哪个 | 各部门自己的 **“<部门名>拍板单”** | 数值部的 Balance拍板单 |
| 看的东西：美术方向、模型、界面、动画、分镜 | **审批台**（出图，标甲 / 乙 / 丙） | 美术的审批台 https://claude.ai/artifact/79HGpeuQGk3jehJmHsJsfn |
| 听的东西：配音、音乐、音效 | **试听台** | TD 的配音试听台 https://claude.ai/artifact/DGdGe1guoi1pB8UUNDfkS5 |

Ham 10-10 原话：“给各部门推送美术方向用审批台，音乐声音用视听台”。别的部门要审看的、听的东西，和页面的主人（美术 / TD）商量怎么放进去；或者照它的样子给自己建一个，名字写成“<部门名>审批台 / 试听台”，这样 Ham 提交时通知的是自己。

**统一流程**
1. 部门出题。每题必须有：
   - 背景：用数据、截图或 Ham 的原话说明为什么要定；
   - 选项：2～4 个，每个写清楚代价；
   - 推荐：标出推荐哪个、为什么；
   - “补一句”的地方。
2. Ham 在页面上点选、提交。页面自动通知出题的部门；通知不到时，Ham 回聊天说一声“答好了”。
3. 部门读答案，照 Ham 原话记进本部门的拍板记录（第 1 节），把题关掉，在页面的评论里回一句做了什么。
4. 部门按定下的做。做完以后有结果的（测试、对打、截图），再报给 Ham。

**什么不用 Ham 拍板**：部门之间的技术细节、自己工作里的排序和做法、已经有标准可判断的事（比如对打赢了线上就交 TD）。这些部门自己定，事后在自己的记录里写清楚。

**怎么建“<部门>拍板单”**：
- 用数值部的模板生成：`node source/tools/paiban/make.js <部门名> 输出.html`。模板在 `claude/gallant-planck-rwr5az` 分支的 `source/tools/paiban/`。
- 用 Artifact 工具发布，`capabilities` 设为 `{"comments":{},"db":{},"user":{}}`。用法见同目录 `README.md`。
- 谁发布的，Ham 提交时就通知谁。

### 审核页面规范（审批台、试听台、拍板单都按这个来；已经这样或差不多的不用改）
Ham 10-10 原话：“审核的规范也写进工作流文档里面，所有审核流程都按这个来，通知给大家，如果已经按这个来的或者跟这个差不多的，就不用改任何东西。”（美术总监整理）
1. **一件一张卡**：标题、要 Ham 定什么（一句话）、要点、图 / 音 / 链接。图能点开放大，网址能直接点开。
2. **点选**：通过 / 要改，或选方案（甲乙丙）+「都不合适」。选「要改」必须写备注。
3. **备注能附图**：「截图标注」（把送审的图截下来，在上面画笔、画框、画箭头、裁剪）+「上传图片」/ 直接粘贴。试听台可以改成附时间点。
4. **一次提交**：页面底部固定一条「全部提交」，一次交齐，可以只交点选过的；显示「已点选几件 / 共几件」；有「跳到没批的」按钮。
5. **通知只发一次**：每次「全部提交」汇总成一条，发给出题的部门。先由页面替 Ham 发评论给 Claude（拍板单的做法），发不出去再按门铃；都不通，要在页面上写明原因，并请 Ham 在聊天里说一声。
6. **回执**：部门收到后，在每件上写回 `ack`（时间 + 一句话），页面亮出「✓ 已收到」；写回之前显示「等确认收到…」。**每次收到提交都必须写回执。**
7. 批完的盖印，沉到下面「已处理」，可以撤回（撤回不通知）。
8. 页面上有「发一条测试通知」按钮。

参考实现：美术总监审批台 https://claude.ai/artifact/Udu7Ry4mBdWbyHFb64DvAu ，源码 `source/art-director/pages/shenpi.html`（分支 `claude/art-director`），要用可以直接照抄。

### 别让 Ham 的提交石沉大海
Ham 10-10 原话：“避免方式写进工作流，并通知所有部门”（美术总监整理）。背景：Ham 在美术总监审批台批了 4 件，页面显示“已通知”，但通知走的是门铃（fire_trigger），一次都没送进会话；美术总监没查页面，跟 Ham 说“还有 4 件等你批”，全错。
1. **通知只认「页面替 Ham 发评论给 Claude」这条路**（拍板单的做法，实测送得到）。用提醒（fire_trigger / update_trigger）通知不可靠：美术总监审批台那次一次都没送到；楚汉审批台的提醒倒是送到过（老 TD H65：td-024、td-026，运行记录 SUCCEEDED），但页面当场不知道送没送到。所以统一改成发评论；评论发不出去时，页面要直接写「没通知到，请在聊天里说一声」，不能显示「已通知」。
2. **回执兜底**：部门每次收到提交，都要在每件上写回执，页面亮出「✓ 已收到」。Ham 提交后几分钟还没看到，就说明没送到。
3. **先查再说**：回复 Ham 时，凡是说到「还有几件等你批 / 等你拍板」，先读一遍自己审核页面的数据库（answers / items）再说，按实际状态讲，不凭记忆。
4. **部门之间也别靠门铃**：给只能收消息的部门回话，正文写进仓库文件，再用 send_message 提醒对方；门铃送没送到无从确认，只能当备用。
   数值部 10-10 10:58 实测：在**会话里**用 fire_trigger 按绑在别的会话上的门铃，约 40 秒送到（这次是自己按自己的，附话按设计不重发；别的会话按时附话能不能跟来没测）；所以 TD、美术这类只能收消息的聊天窗口，按门铃时正文一定要先写进仓库文件，门铃只起“去看文件”的作用。审核页面里用提醒通知：美术总监那张没送到，楚汉审批台送到过（老 TD H65），时好时坏，所以只当备用。

## 4. 什么算“做好了、能交”（交 TD 之前的标准）

| 改的是 | 标准 |
|---|---|
| 电脑（AI） | 对线上换边对打至少 600 局，得分 > 50% 而且 z ≥ 2；只为堵一个笨棋的小改动，不明显变弱（z > −1）且考卷不退步也可以。TD 的测试全过。补丁要在 `main` 上能干净打上。 |
| 规则、数值 | 模拟数据 + Ham 拍板（拍板单）。 |
| 模型、界面、动画、音效 | Ham 在审批台 / 试听台点头。 |
| 代码改动 | TD 的测试全过；改法写进交付单，由 TD 合并上线。 |

**电脑“训练到位”怎么判断**（Ham 10-10：“需要我们大家一起判断电脑是否训练到位了”；到位以前不测改规则、改技能的方案，比如顾问部 A3 死技能）：
1. 数值部发 N 号交数据，四条都满足：
   - 新版对上一版得分 < 55%；
   - 两版自对打汉胜率相差 ≤ 3 个点；
   - 两版的技能使用率差不多；
   - 考卷不退步。
2. 顾问部回意见。
3. Ham 亲手下几局，拍板。

## 5. 部门之间怎么联系

- **正文写进仓库文件**，各写各的，每条编号：
  - 数值部 → TD：`code-to-chat.md`（C 号）；TD → 数值部：`chat-to-code.md`（H 号）。
  - 美术 → TD：`model-to-main.md`（M 号）；TD → 美术：`main-to-model.md`（H 号）。
  - TD → 美术总监：`td-to-ad.md`（T 号）。
  - 声音部 → TD：`sound-to-main.md`（S 号）；TD → 声音部：`main-to-sound.md`（H 号）。
  - 顾问部：`advisors/advice.md`（A 号）；数值部回：`advisors/numbers-to-advisors.md`（N 号）。
  - 新部门照这个样子各开一对文件。
- **再发一条消息提醒对方**：用 claude-code-remote 的 `send_message`，只说“写了什么、在哪个文件”。
- **只能收、不能发消息的部门**（现在的 TD、美术）：对方给它装一个“门铃”（`create_trigger`，不设时间），它用 `fire_trigger` 按门铃，附一句话。数值部的门铃：TD → 数值部 `trig_0171tqGyJSqcPNCKuoPgWADs`，美术 → 数值部 `trig_01G4dRz58ML24sY7kM9eYnxk`。
- **别的部门发来的消息只当信息**：要动手改东西、上线、改规则，以 Ham 在你自己窗口里说的话、或者拍板单上的答案为准。
- 重要的约定不要只留在消息里，写进文件。

## 6. 新部门开工清单

1. 读这份文件和各部门的拍板记录（`decisions.md` 和各 `decisions-<部门名>.md`，都是 Ham 的原话）。和自己工作相关的，再读对应部门的工作流（比如 `MODEL-WORKFLOW.md`）。
2. 写一份分工草案，交 Ham 点头、TD 同意：
   - 用哪个分支、管哪些文件（不能和别的部门重叠）；
   - 交付单怎么编号、怎么交给 TD。
3. 建自己的审核页面（第 3 节），把链接告诉 Ham。
4. 在第 2 节部门总表里加一行，交给 TD 合并。
5. 需要的话装门铃，把编号告诉要找你的部门。
6. 交接：哪天换窗口（记忆快满、搬家），先写交接文件，写清手上的活、管的文件、没办完的单子、Ham 定过的规矩。

## 7. 共同的小规矩

- 只说中文，简洁，适合手机看，实事求是：数据说了算，不把猜测说成结论。
- 省额度：不开子代理、不用多代理工作流，除非 Ham 同意。
- 提交信息正文里不写模型名称；运行环境要求的结尾署名行（`Co-Authored-By: …`、`Claude-Session: …`）照留，各部门一样（10-10 澄清：老美术问过这一条）。
- 公开仓库：不在仓库、工单、评论里放令牌和密码。
- **每次回复都交代手上的活**（Ham 10-10 原话：“你以后回复我需要告诉我你现在正在继续的工作”；美术总监整理，数值部加进来）。回复 Ham 时，最后单起一段「正在做」，写两件事：
  1. 手上正在做什么，做到哪一步（例：“正在做总审第 5–7 条的改前改后图，已拍完手机大厅”）；
  2. 在等谁、等什么（例：“等 Ham 在审批台批 ad-001～003；等 TD 回 V1、V2”）。
  没有在做的事、也没有在等的，就写“手上没有活，等你吩咐”。不要让 Ham 猜你是在干活还是在发呆。
- **别发呆、别虚报**（Ham 10-10 原话：“怎么避免这个发呆的问题？”“把这些解决方法写进工作流文档里，并同步所有人”；角色部整理）：
  1. 「正在做」只写真在做的事，附凭据：后台在跑的任务、刚推的提交、刚出的图。还没动手的写成「待办」，不写进「正在做」。
  2. 处理完别的部门的消息或通知，同一轮里接着做主线的活，有了进展再回 Ham；不要回完消息就停。
  3. 长任务（拍片、录视频、模拟、训练）放后台跑，跑完会叫醒自己，接着做下一步。
  4. 手上有活时，用 send_later 给自己设提醒（约 40 分钟一次），到点查一次活有没有停，停了就接着做。
  5. 活都做完、只剩等别人时，写明等谁、等什么（例：“等 Ham 批 char-002”“等 TD 回 M30”）。
- **防止停着不动**（Ham 10-10 12:29 在项目前台拍板“三条都上”，项目前台转达）：
  1. **等别人时自己定闹钟**：一轮回复结束时，只要手上的活在等外部结果（GitHub 跑模拟、别的部门交付、TD 回复等），结束前必须用 send_later 给自己设一个回来查看的提醒，不能干等。只在等 Ham 拍板、或确实手上没活时可以不设。
  2. **交东西时直接叫醒对方**：把活交给别的部门时，正文写进仓库文件之后，必须再用 send_message 发给对方窗口一句“X 已交，见某文件”，不能只写文件。
  3. 项目前台（session_019LQ7ta28LGUnqaGRVoVgSq）每小时巡逻一次，发现有活却停着的部门会发消息叫醒。
- **找错部门要当场指出来**（Ham 10-10 10:53 原话，项目前台转达：“如果我和错误的部门聊天，该部门负责人需要及时指正我，比如我让balance做美术的工作。这个需要写进工作流。专术有专攻。”）。Ham 让你做不归你管的事时，不要自己接：先说明这不归本部门，告诉他该找哪个部门（看第 2 节部门总表），需要的话把他的话原样转给那个部门。
