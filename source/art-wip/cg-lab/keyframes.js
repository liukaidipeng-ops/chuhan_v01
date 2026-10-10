// 关键镜头样帧：跑到镜头里的某一秒，出一张定格
window.STILL = {};
for (const [id, t] of [['W2', 2.9], ['W8', 3.2], ['W12c', 2.0]]) {
  STILL[id] = () => { const S = FILM[id](); const dt = 1 / 24; for (let x = 0; x <= t; x += dt) S.update(x, dt); return { ctx: S.ctx, cam: S.cam, post: S.post }; };
}
