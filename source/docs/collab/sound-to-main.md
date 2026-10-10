# 声音部 → TD（S 号）

> 规矩见 `WORKFLOW.md` 第 5 节、`SOUND-WORKFLOW.md` 第 8 节。TD 回复写在 `main-to-sound.md`（H 号）。
> 声音部会话 session_01VsbsKR759MUraiT41MaEAU，分支 `claude/sound`；门铃 `trig_01FiP6dgMSFYgkevQ4srqoZK`。
> TD 会话：session_01LeSA918yjPExad28VrQqob（新 TD，10-10 起；老 TD session_01RKuN4E66BetRaUCS8BJyti 已交接完，不再发给它）。

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

## S3 · 10-10 · 交付：拒马三段的声音（Ham 试听台 b44～b48 全部通过）

**动了哪些文件**
- `source/sfx/out/` 新增 23 个文件（204 KB），`manifest.json` 新增十组：`xbow` `arrowzip` `arrowhit` `arrowwood` `arrowflesh` `tigerpounce` `tigerland` `jumashake` `jumabrk` `jumabrkbig`。原有的组没动。
- `source/src/audio.js` 的 `Sfx.B` 加：
  - `xbow(t, v, pan)`：放箭。Ham：“都还可以，随机轮着用”，三种箭声已在函数里随机。
  - `arrowHit(t, kind, v, pan)`：中箭，`kind` = `'shield'` 插盾 / `'wood'` 插木桩 / `'flesh'` 入肉。
  - `tigerPounce(t, v)`：虎扑起跳的短促咆哮；`tigerLand(t, v)`：落地咆哮。Ham：老的虎啸“太慢了，不像攻击”，这里别再用 `tiger` / `tigeratk`。
  - `jumaShake(t, v, pan)`：象顶上路障、不碎（撞击 + 盾 + 甲片 + 路障吱呀两下）。
  - `jumaBreak(t, big, v, pan)`：路障碎。`big = false` 虎扑砸碎，`true` 象撞碎（更响更长）；各两版随机（Ham：“都可以，随机轮着用”）。
  - 所有 t 都对准“那一刻”（放箭、中箭、起跳、撞上），函数里已经把声音自己的提前量算好了。

**要 TD 接的触发**（时间是角色部 M27 / M30 分镜里的，你接完照实际帧放）
1. **相只掉血**：每支箭射出 `xbow`（一、二级 0.70、0.95；三、四级左弩手 0.70、右弩手 0.95，两箭两声）；第一箭到 `arrowHit(t,'shield')`，第二箭到 `arrowHit(t,'flesh')` + `Sfx.smp('pain')`。**弩手现身、化烟不要配“呼呼”声**（Ham 说像回旋镖）。
2. **相击杀**：同上两箭；起跳 1.40 `tigerPounce`；砸上 1.70 `jumaBreak(t, false)` + `Sfx.smp('death')`；落地 2.2 `tigerLand`。
3. **象只掉血**：冲锋 0 照旧象吼 + 奔踏；顶上 0.80 `jumaShake` + `Sfx.smp('pain')`；1.0 人立长嘶照旧。
4. **象打死**：冲锋同上；撞上 0.80 `jumaBreak(t, true)` + `Sfx.smp('death')`；1.8 长嘶照旧。

**署名**：用到的 0 A.D.、CC0 素材都已署过，不用加新的。

**交之前查过**：合了最新 main；`node source/build.js` 不报错，`sfx.bin` 1649 → 1814 KB，首屏不变；`source/test/` 八个测试全过；页面里把新函数都调过一遍，没报错。

## S4 · 10-10 · 交付：兵的行军按等级、残血换声音（Ham 试听台 b49～b51）

**动了哪些文件**
- `source/sfx/out/` 新增 5 个文件，`manifest.json` 新增五组：`march1` `march2` `march3` `march4` `marchhurt`。响度都对齐到原来的 `troop` 附近（约 −20 LUFS）。`sfx.bin` 1814 → 1962 KB。
- `source/src/audio.js`：兵的 `U.inf.move(dur, n, lv, hurt)` 多了两个参数，不传就和原来一模一样（照人数）。
  - Ham 原话按等级定：初级兵 = 原来的行军声 / 三个人（各一半随机）；二级 = 整齐行军；三级 = 行军 + 鼓；四级 = 重甲大队（“算了 不要鼓了”）；残血的非初级兵 = 散着走。
  - 这些都是真实单步脚步录音一步步叠的，带甲片、锁链声。

**要 TD 接的**：兵（`'p'`）走的时候把等级和残血传进来：
- `fx.js` 的 `lowMove`（约 648 行）：现在是 `su.move(0.6, Math.min(3, lv))`，改成 `su.move(0.6, Math.min(3, lv), lv, hurt)`。
- `squads.js` 兵小队行军调 `snd(t, s).move(real(dur), n)` 的地方，同样多传 `lv, hurt`。
- `hurt` = 这枚棋子当前血量低于这一级的满血（`bingfa.js` 的 `hpOf(t, lv)`）。普通模式没有等级，传 `lv = 0` 就照旧。

**交之前查过**：合了最新 main；打包不报错；八个测试全过；页面里把五种（0、1、2、3、4 级，以及二级残血、一级残血）各调了一遍，没报错。


## S5 · 10-10 · 交付：战局开场音乐（Ham 试听台 b52、b53 通过）

**动了哪些文件**
- `source/src/endtunes.js`：加 `T.r.open`（汉丙、汉丁）、`T.b.open`（楚丙），`PICK.r.open = [0, 1]`（Ham：“这俩都行，随机播放”）、`PICK.b.open = 0`；加 `EndTunes.open(side)`：放开场曲，**不停背景音乐**（结算曲的 `play` 会先停，开场不能停），没有就返回 false。
- 乐器只用真大鼓（决战鼓那套录音）、真锣、编钟、古筝、古琴；每首约 3 秒，2.3 秒起整体淡出。没有新素材、没有新署名。

**要 TD 接的**：`main.js` 开局（约 1113 行）现在是
```js
Sfx.B.gong(0, 0.9); Sfx.B.taiko(0.5, 0.8); Sfx.B.taiko(0.8, 0.8); Sfx.B.taiko(1.05, 0.9);
```
改成按玩家所执一方放（本地双人放汉的），没有就照旧：
```js
const openSide = mode === 'local' ? 'r' : mySide;
if (!(window.EndTunes && EndTunes.open(openSide))) { Sfx.B.gong(0, 0.9); Sfx.B.taiko(0.5, 0.8); Sfx.B.taiko(0.8, 0.8); Sfx.B.taiko(1.05, 0.9); }
```
观战（`watch`）建议也按 `mySide` 或直接放汉的，你定。

**交之前查过**：合了最新 main；`node source/build.js` 不报错；用原版渲染脚本把游戏里的三首各出一遍，和试听台上的一致；`source/test/` 全过。
