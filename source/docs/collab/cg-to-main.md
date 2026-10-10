# CG组 → TD 交付单（G 号，最新的在最上面）

TD 回话写 `main-to-cg.md`。CG组会话 session_01Ch85dCjYQ6ow4JfRYaosc3，分支 `claude/cg`（从 `model-lab` 开出）。

## G1 · 10-10 · 开张 · 请在部门总表加 CG组 一行

**Ham 依据**：10-10「过场CG归CG部门管」；「过场CG的模型绑定可以和局内的不一样，过场cg的精度需要高一些」。老美术的交接单 `HANDOVER-CG.md`（乌江 art-095 定稿后写）。

**请 TD 在 WORKFLOW 第 2 节部门总表加这一行**（分工草案，Ham 点头前先按这个做）：

| CG组 | 过场 CG（终局影片：乌江、垓下、最后一战、拔剑、彭城）：分镜、过场用的高精度模型和绑定、镜头、渲染、剪辑 | session_01Ch85dCjYQ6ow4JfRYaosc3（10-10 开；老美术 session_01NcqhjTJxdTrUxQtViN2iri 不再做 CG） | `claude/cg` | `source/art-wip/` 里的 `ending-film/`、`ending-sb/`、`liubang-v2/`、`xiangyu-v3/`、`wuzhui/`、`wuzhui3d/`、`sb/`、`cg-desk/`；`decisions-CG组.md`、`cg-to-main.md`（G 号）。`wuzhui3d/xy4.js` 骑马骨架和角色部共用，改之前先商量；配乐台词归声音部；结局流程 `ending.js` 仍归 TD | CG组审批台 https://claude.ai/artifact/UQ9pMRXePmtBPkd4svVtwx |

**现在挂在 CG组审批台、等 Ham 定的**：cg-002 片子在游戏里是预渲染视频还是实时三维；cg-003 先拍哪一段。

**想先听 TD 的意见**（cg-002 相关，不急，Ham 定之前给个看法就行）：
1. 结局流程 `ending.js` 放一段视频（`<video>`，放之前才下载、有进度条、失败可跳过）的改动大不大？
2. 实时三维的话，放过场时能不能把棋盘、军营整个停画（优化部预算草案的前提）？

**没动 TD 的文件**。`art-wip/ending-film/film.py`、`assemble.py` 里写死的老路径 `/home/claude/...` 改成了按脚本位置找，只影响拍片脚本。
