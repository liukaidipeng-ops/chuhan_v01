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

## S2 · 10-10 · 交付：盾挡声、兵卒人声、汉胜汉败结算曲（Ham 试听台全部点过「就它」）

声音部会话已换新 TD：发 session_01LeSA918yjPExad28VrQqob。

**动了哪些文件**（都在声音部管的范围里）
- `source/sfx/out/`：新增 37 个文件，共 264 KB；`source/sfx/manifest.json` 新增五组：`block`（12）、`blockw`（3）、`sgrunt`（15）、`taunt`（3）、`victory`（4）。原有的组一条没动（注意：原来已有 `grunt` 组是怪物低吼，新的气声叫 `sgrunt`，别混）。
- `source/src/audio.js`：`Sfx.B` 加四个函数：
  - `block(t, v, pan)`：盾挡。五分之一放带出矛“嗖”的，它会自己提前 0.23 秒，“挡住”那一下始终对准 t。
  - `sgrunt(t, v, pan)`：出手时的气声。
  - `taunt(t, v, pan)`：嘲讽（一群人吼）。
  - `victory(t, v, pan)`：打倒对方后的得胜齐吼。
- `source/src/endtunes.js`：汉胜加「未央」（T.r.win[3]），汉败加「荥阳」（T.r.lose[3]）；`PICK.r.win = [2, 3]`（礼乐、未央随机），`PICK.r.lose = [null, 3]`（选到 null 就照旧放原曲）。

**试听台**（声音部试听台）：盾挡声 b37 五条全「就它」，Ham：“随机出现，所有盾牌格挡都会有音效”；气声、嘲讽 b40；得胜齐吼 b42；结算曲 b39，Ham：“这俩随机放”。

**要 TD 接的触发**（`squads.js`，兵卒对打）
1. 凡是盾牌挡住一下：`Sfx.B.block(t, 0.6, pan)`，t = 挡住那一帧。帧号等角色部交对打时在 M 单里写，你转我也行，直接接也行。
2. 出手（矛刺出去）那一下：`Sfx.B.sgrunt(t, 0.5, pan)`；不用每次都喊，建议三成概率。
3. 对上之前（双方站定、准备打）：`Sfx.B.taunt(t, 0.5)`，一局里别太频繁，建议同一兵种每 20 秒最多一次。
4. 打倒对方后：`Sfx.B.victory(t, 0.55)`。
结算曲不用接，`EndTunes.play` 已经按 PICK 挑。

**新署名**（请加进 `template.html`「玩法说明」末尾）：MegaGlest（MegaGlest Team，CC BY-SA 3.0）：兵卒吆喝、嘲讽。0 A.D. 已署过，不用加。

**交之前查过**：合了最新 main；`node source/build.js` 不报错，`sfx.bin` 1461 → 1649 KB，首屏 `index.html` 不变；`source/test/` 八个测试全过；在页面里把四个新函数各调 20 次，没报错；两首结算曲用原版渲染脚本出过一遍，和试听台上的一致。

## S3 · 预告（还没交付）

- 拒马新动画（弩射、虎骑冲毁、象踏碎）：Ham 定了要配兵卒喊声。等角色部交动画和时间点。
