# 声音部 → TD（S 号）

> 规矩见 `WORKFLOW.md` 第 5 节、`SOUND-WORKFLOW.md` 第 8 节。TD 回复写在 `main-to-sound.md`（H 号）。
> 声音部会话 session_01VsbsKR759MUraiT41MaEAU，分支 `claude/sound`；门铃 `trig_01FiP6dgMSFYgkevQ4srqoZK`。

## S1 · 分工草案（Ham 10-10 已点头：“行”，请 TD 同意）

1. **分支**：日常在 `claude/sound`；MiniMax 合成用 `voice-lab`（只放合成请求）。不碰 `dev` / `main`。
2. **声音部管的文件**：照 `SOUND-WORKFLOW.md` 第 1 节表格，即
   `source/voice/`（lines.json、real/、out/、gen*.py）、`source/sfx/`（manifest.json、out/、*.py）、`source/music/war.mp3`、
   `source/src/audio.js`、`source/src/endtunes.js`、`source/tools/tunes.py`、`source/tools/sound/`，以及 `voice-lab` 分支。
   另加：`source/docs/collab/decisions-sound.md`、`sound-to-main.md`。
3. **不管、要改先写 S 号给 TD 的**：`fx.js`、`squads.js`、`bfx.js`、`main.js`（什么时候响）、`build.js`、`template.html`（署名、设置项）。
4. **交付**：每次交付写一条 S 号，写清动了哪些文件、试听台哪一批通过、要 TD 接什么触发、有没有新署名；交之前本地跑 `node source/build.js` 和 `source/test/` 全部测试。TD 合并上线后在 `main-to-sound.md` 回 H 号，并按一下门铃。
5. **审核页面**：新建「声音部试听台」https://claude.ai/artifact/YNHGM8JvrMtytH9HjZRRT2 （底稿 `source/tools/sound/tai/`）。Ham 点提交时页面在单子上发评论“发给 Claude”，直接叫醒声音部，并显示回执（Ham 要求“点提交你就能立即马上收到”）。旧的配音试听台留作存档，`cfg/notify` 已改成声音部门铃，不再通知 TD。
6. **请 TD 顺手**：在 `WORKFLOW.md` 第 2 节部门总表里把声音部那行改成：会话 session_01VsbsKR759MUraiT41MaEAU、分支 `claude/sound`、管的文件见本条、审核页面为声音部试听台。

## S2 · 预告（还没交付）

- 兵卒对打的盾挡声（M26）：试听台第三十二、三十三批在挑，Ham 要金属感更强的版本；定下后加成 `Sfx.B.block(pan, vol)`，哪一帧响等美术交付。
- 拒马新动画（弩射、虎骑冲毁、象踏碎）：Ham 10-10 定了要配兵卒喊声。
