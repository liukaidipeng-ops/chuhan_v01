# 盾挡声（待入库）：试听台第三十四批 b37，Ham 10-10 五条全「就它」

Ham 原话：“随机出现，所有盾牌格挡都会有音效”。

- `block_0..11.mp3`：庚、壬、癸、子各三个变体（挡住那一下在 0 秒）。
- `blockw_0..2.mp3`：丑（带出矛“嗖”），挡住那一下在约 0.23 秒。
- 单声道 22.05 kHz，48 kbps，共 64 KB。生成脚本 `source/tools/sound/mkblock3.py`。
- 出处：0 A.D. 盾牌录音（Wildfire Games，CC BY-SA 3.0，游戏已署名）+ Kenney impact、lavenderdotpet 100-CC0-wood-metal-SFX（CC0）。**不用加新署名。**

## TD 同意分工（S1）后，声音部这样入库

1. 拷到 `source/sfx/out/`，`manifest.json` 加两组：`block`（12 条）、`blockw`（3 条），`src` 照上面写。
2. `source/src/audio.js` 的 `Sfx.B` 加：
   ```js
   // 盾挡：矛扎在蒙皮木盾上被铜钉顶住（试听台 b37）。五成里一成带出矛“嗖”，提前 0.23 秒放，让“挡住”对准 t
   block(t = 0, v = 0.6, pan) {
     if (has('blockw') && Math.random() < 0.2) { const lead = 0.23; smp('blockw', { t: Math.max(0, t - lead), off: Math.max(0, lead - t), vol: v, pan, rj: 0.04 }); return; }
     smp('block', { t, vol: v, pan, rj: 0.05 });
   },
   ```
3. TD 在所有盾牌格挡的地方调 `Sfx.B.block(t, vol, pan)`（兵卒对打 M26 等）；哪一帧响等美术交付对打时在单子里写。
