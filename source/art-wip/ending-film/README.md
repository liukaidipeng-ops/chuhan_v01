# 终局影片 · 乌江（定稿，审批台 art-095 通过）

Ham 10-10 01:24：乌骓不送审，直接拍；要电影质感、胶片颗粒、两军对峙做大场面。审批台 079 看路子。

样片（43 秒）：https://claude.ai/artifact/LxgHctJYd4cPxE31xynkLS

- `sb2.js`：拍摄台。地面、江水、芦苇、尘、光束；景深、调色、每帧换颗粒。
- `film.js`：镜头。`FILM[id]()` 返回 `{ctx, cam, post, dur, update(t,dt)}`，有 F0 亭长回头、F1 江边、F2 策马、F3 天之亡我、F3b 下马、F4 赠马、F6 汉军压岭。
- `film.py`：逐帧渲染（`python3 film.py F4 24 1280`），用到 `../wuzhui3d/horse.js`、`xy4.js` 和游戏里的三维模型。
- `assemble.py`：拼片，加 2.39:1 黑边、字幕、配音、音效、底噪。
- `page.html`：样片页面。`contact.jpg`：五个镜头的截帧。

乌江定稿（审批台 094 选乙：补了下马、汉骑高精度会跑）。还没做：垓下、最后一战、拔剑、彭城；正式音乐（声音部）；接 TD 的结局流程。见 `docs/collab/HANDOVER-CG.md`。
