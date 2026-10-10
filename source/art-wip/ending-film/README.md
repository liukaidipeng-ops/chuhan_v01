# 终局影片 · 乌江样片（进度，未审）

Ham 10-10 01:24：乌骓不送审，直接拍；要电影质感、胶片颗粒、两军对峙做大场面。审批台 079 看路子。

样片（43 秒）：https://claude.ai/artifact/LxgHctJYd4cPxE31xynkLS

- `sb2.js`：拍摄台。地面、江水、芦苇、尘、光束；景深、调色、每帧换颗粒。
- `film.js`：镜头。`FILM[id]()` 返回 `{ctx, cam, post, dur, update(t,dt)}`，有 F1 江边、F2 策马、F3 天之亡我、F4 赠马、F6 汉军压岭。
- `film.py`：逐帧渲染（`python3 film.py F4 24 1280`），用到 `../wuzhui3d/horse.js`、`xy4.js` 和游戏里的三维模型。
- `assemble.py`：拼片，加 2.39:1 黑边、字幕、配音、音效、底噪。
- `page.html`：样片页面。`contact.jpg`：五个镜头的截帧。

还没做：上马下马；亭长的脸和手；汉军骑兵的细模（会跑的腿）；垓下、最后一战、拔剑、彭城；正式音乐；接 TD 的结局流程。
