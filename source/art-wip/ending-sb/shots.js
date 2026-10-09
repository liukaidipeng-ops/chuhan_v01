// 终局分镜关键帧
window.SHOTS = {};
const DAWN = { top: 0x4f6784, hor: 0xeac39a, bot: 0x7d766a, sun: [0.15, 0.16, -1], sunCol: 0xffc489, sunI: 2.6, hemi: 0.9, skyL: 0x9fb2c8, gndL: 0x5b5246, fogCol: 0xdcc19c, fogD: 0.012, glow: 1.4, sunSize: 0.0009 };
// G09 · 「天之亡我」：仰拍特写，日头在盔边
SHOTS.G09 = () => {
  SB.reseed(9);
  const ctx = SB.stage(Object.assign({}, DAWN, { sun: [-0.35, 0.42, -1], fogD: 0.02, hemi: 0.65, sunI: 3.2 }));
  SB.fill(ctx, [0.9, 0.35, 0.7], 0xffcf9e, 1.5); SB.fill(ctx, [-0.8, 0.2, 0.6], 0x8fa6c6, 0.45);
  SB.ground(ctx, { col: '#8c7a5e' });
  SB.ridges(ctx, { dist: 220, h: 26, col: 0x6e6a66, seed: 2, layers: 3 });
  const X = XY3.make({ stage: 2 }); X.group.rotation.y = 0.35; ctx.add(SB.shadows(X.group));
  X.POSES.look = { arms: X.POSES.stand.arms, head: [-0.38, 0.1, 0.03], neck: [-0.12, 0.05, 0], chest: [-0.04, 0, 0] };
  X.setPose('look', 0.01); X.update(0.1);
  ctx.shadowAt([0, 1, 0], 4);
  SB.dust(ctx, { n: 40, c: [0, 0.5, -6], r: 14, h: 4, s: [3, 7], op: [0.05, 0.12], col: 0xffd9a8, zs: 0.6 });
  const cam = SB.cam([1.55, 1.62, 0.55], [-0.2, 2.02, -0.35], 30);
  return { ctx, cam, post: { focus: 1.75, ap: 1.2, maxR: 16, exp: 1.0, gain: [1.03, 0.98, 0.92], sat: 0.95, vign: 0.45 } };
};
// G06 · 乌江黎明大全景：渡船泊在岸边，项王一行沿岸奔来
SHOTS.G06 = () => {
  SB.reseed(6);
  const ctx = SB.stage(Object.assign({}, DAWN, { sun: [-0.25, 0.07, -1], fogD: 0.016 }));
  SB.fill(ctx, [0.5, 0.4, 1], 0xa8b8cc, 0.5);
  SB.ground(ctx, { col: '#8a7a60', cx: 20, cz: 0, flat: 60, shore: { x: -1.5, wob: 2.5 } });
  SB.water(ctx, { x: 0, y: 0.0, size: 1200 });
  SB.ridges(ctx, { dist: 260, h: 22, col: 0x5d6068, seed: 4, layers: 3, yaw: 0.25 });
  // 岸线芦苇
  const rp = []; for (let i = 0; i < 70; i++) rp.push([-2 + SB.rr(-2.5, 1.5), 0, 20 - i * 2.4 + SB.rr(-1, 1)]);
  for (let i = 0; i < 30; i++) rp.push([SB.rr(-9, -4), 0, SB.rr(-30, 18)]);
  SB.reeds(ctx, rp, { per: 26, r: 1.4, h: [1.2, 2.6] });
  // 渡船和亭长
  const F = Ferry.makeFerry(); F.group.position.set(-4.6, 0, 6); F.group.rotation.y = -1.35; ctx.add(SB.shadows(F.group)); F.setPose && F.setPose('pole', 0.01); F.update && F.update(0.3);
  SB.glow(ctx, [F.lantern ? 0 : -4.6, 2.2, 6], 0xffb060, 1.2, 0.8);
  // 远处：项王骑乌骓带二十几骑沿岸奔来
  const riders = [];
  for (let i = 0; i < 26; i++) { const c = Models.makeCavalry('b', true, 'ji'); c.group.position.set(6 + SB.rr(-3, 3) + (i === 0 ? -1.5 : 0), 0, -40 - i * 0.9 + SB.rr(-2, 2)); c.group.rotation.y = -Math.PI / 2 + 0.2; c.group.scale.setScalar(1.0); c.speed = 1; for (let k = 0; k < 6; k++) c.update(0.07 + i * 0.01); ctx.add(SB.shadows(c.group)); riders.push(c); }
  SB.dust(ctx, { n: 70, box: [2, 14, 0, 4, -70, -38], s: [3, 8], op: [0.08, 0.2], col: 0xe9c79c });
  // 江面晨雾
  SB.dust(ctx, { n: 90, box: [-120, -6, 0, 3, -120, 20], s: [10, 26], op: [0.06, 0.14], col: 0xf1dcc0 });
  SB.rays(ctx, { n: 7, c: [-40, 45, -160], len: 120, w: [6, 16], op: [0.05, 0.11], col: 0xffd2a0, spread: 30, tilt: -0.3 });
  ctx.shadowAt([0, 0, -10], 40);
  const cam = SB.cam([3.5, 3.2, 22], [-2, 1.4, -14], 34);
  return { ctx, cam, post: { focus: 26, ap: 0.25, maxR: 10, exp: 1.0, gain: [1.04, 0.98, 0.9], sat: 0.9, vign: 0.4 } };
};

// ---------- 公用 ----------
const NIGHT = { top: 0x070b16, hor: 0x1d2333, bot: 0x0b0a0a, sun: [0.5, 0.55, -1], sunCol: 0x7f96c4, sunI: 0.55, hemi: 0.22, skyL: 0x30405a, gndL: 0x15120f, fogCol: 0x151a26, fogD: 0.0065, glow: 0.5, sunSize: 0.00035 };
function tentGeo(w, h, len) { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(0, h); sh.lineTo(w / 2, 0); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2); return g; }
function soldiers(ctx, side, kind, pts, pose, o = {}) {
  const T = new Models.Troop(side, kind, pts.length, o.scale ?? 1, { outline: o.outline ?? false });
  pts.forEach((p, i) => { const u = T.units[i]; u.p.set(p[0], p[1] ?? 0, p[2]); u.yaw = p[3] ?? (o.yaw ?? 0); u.pose = pose; u.phase = SB.rnd() * 6; });
  for (let k = 0; k < (o.steps ?? 8); k++) T.update(0.05);
  T.group.traverse(m => { if (m.isMesh) { m.castShadow = o.shadow ?? true; } });
  return ctx.add(T.group);
}
function cavalry(ctx, side, pts, o = {}) {
  const geo = Models.cavalryStaticGeo(side), m = new THREE.InstancedMesh(geo, Models.vcMat, pts.length), M = new THREE.Matrix4(), q = new THREE.Quaternion();
  pts.forEach((p, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p[3] ?? 0); M.compose(new THREE.Vector3(p[0], p[1] ?? 0, p[2]), q, new THREE.Vector3(1, 1, 1).multiplyScalar(o.scale ?? 1)); m.setMatrixAt(i, M); m.setColorAt(i, new THREE.Color(1, 1, 1)); });
  m.castShadow = true; return ctx.add(m);
}
function flagPole(ctx, p, col, h = 6, w = 1.6, ht = 2.4, yaw = 0) {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = yaw;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 6), new THREE.MeshStandardMaterial({ color: 0x2a2018 })); pole.position.y = h / 2; g.add(pole);
  const geo = new THREE.PlaneGeometry(w, ht, 12, 4); const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i) + w / 2; P.setZ(i, Math.sin(x * 2.2 + SB.rnd()) * 0.12 * x); } geo.computeVertexNormals();
  const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.9 })); f.position.set(w / 2, h - ht / 2 - 0.1, 0); g.add(f);
  return ctx.add(SB.shadows(g));
}

// G01 · 垓下夜：楚营一圈篝火，被汉营的火把一层层围住
SHOTS.G01 = () => {
  SB.reseed(1);
  const ctx = SB.stage(Object.assign({}, NIGHT, { sun: [0.35, 0.32, -1], sunI: 0.9, sunCol: 0x9fb4dc, hemi: 0.4, fogD: 0.0055, glow: 1.2, sunSize: 0.0005 }));
  SB.ground(ctx, { col: '#4a4540', flat: 150, hills: 2.5 });
  SB.ridges(ctx, { dist: 420, h: 46, col: 0x111522, seed: 1, layers: 3 });
  const tentM = new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 1 });
  for (let i = 0; i < 70; i++) { const a = SB.rr(0, 6.28), r = SB.rr(7, 25); const t = new THREE.Mesh(tentGeo(2.6, 2.0, 3.6), tentM); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); t.rotation.y = -a + SB.rr(-0.3, 0.3); t.castShadow = true; ctx.add(t); }
  const big = new THREE.Mesh(new THREE.ConeGeometry(4, 4.5, 12), new THREE.MeshStandardMaterial({ color: 0x6a3020, roughness: 1 })); big.position.set(0, 2.25, 0); ctx.add(big);
  flagPole(ctx, [0, 4.4, 0], 0x1a1a1c, 5, 1.6, 2.2, 0.6);
  for (let i = 0; i < 26; i++) { const a = SB.rr(0, 6.28), r = SB.rr(4, 26), p = [Math.cos(a) * r, 0.7, Math.sin(a) * r]; SB.glow(ctx, p, 0xff8a3a, SB.rr(3.5, 6), 1); SB.glow(ctx, p, 0xffc070, 0.9, 1); if (i < 14) { const L = new THREE.PointLight(0xff8a3a, 30, 20, 2); L.position.set(p[0], 1.5, p[2]); ctx.add(L); } }
  const post = new THREE.CylinderGeometry(0.14, 0.16, 2.8, 5), pm = new THREE.MeshStandardMaterial({ color: 0x3a3028 }), N = 520, I = new THREE.InstancedMesh(post, pm, N), M = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { const a = i / N * 6.28; M.makeTranslation(Math.cos(a) * 30, 1.3, Math.sin(a) * 30); I.setMatrixAt(i, M); } ctx.add(I);
  // 汉军：三重火把，火把后面是汉营的帐篷剪影
  const pts = [], hm = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 });
  for (const [R0, n] of [[58, 700], [80, 900], [106, 1100]]) {
    for (let i = 0; i < n; i++) { const a = i / n * 6.28 + SB.rr(-0.003, 0.003), r = R0 + SB.rr(-2.5, 2.5); const x = Math.cos(a) * r, z = Math.sin(a) * r; pts.push([x, ctx.hAt(x, z) + SB.rr(1.6, 2.4), z]); }
    for (let i = 0; i < n / 14; i++) { const a = SB.rr(0, 6.28), r = R0 + SB.rr(5, 12), x = Math.cos(a) * r, z = Math.sin(a) * r; const t = new THREE.Mesh(tentGeo(2.6, 2.0, 3.6), hm); t.position.set(x, ctx.hAt(x, z), z); t.rotation.y = -a; ctx.add(t); }
  }
  SB.torchField(ctx, pts, 0xffa04a, 3.0);
  for (let i = 0; i < 70; i++) { const a = SB.rr(0, 6.28), r = SB.rr(55, 112), x = Math.cos(a) * r, z = Math.sin(a) * r; SB.glow(ctx, [x, ctx.hAt(x, z) + 2, z], 0xff8c3c, SB.rr(7, 12), 0.3); }
  SB.dust(ctx, { n: 70, box: [-30, 30, 3, 22, -30, 30], s: [8, 20], op: [0.05, 0.12], col: 0x7a7280 });
  SB.dust(ctx, { n: 90, box: [-160, 160, 0, 4, -160, 60], s: [14, 30], op: [0.04, 0.09], col: 0x6a7a96 });
  ctx.shadowAt([0, 0, 0], 40);
  const cam = SB.cam([14, 30, 78], [0, 0, -6], 36, 0.5, 2500);
  return { ctx, cam, post: { focus: 80, ap: 0.2, maxR: 8, exp: 1.7, gain: [0.95, 0.98, 1.1], sat: 0.85, vign: 0.5, grain: 0.035 } };
};
// G04 · 帐中：项王猛地站起，转向帐门（前景烛火虚焦）
SHOTS.G04 = () => {
  SB.reseed(4);
  const ctx = SB.stage(Object.assign({}, NIGHT, { hemi: 0.12, sunI: 0.0, fogD: 0.0 }));
  ctx.S.fog = null;
  const cloth = SB.cvTex(512, 512, (g, w) => { g.fillStyle = '#5a3a2a'; g.fillRect(0, 0, w, w); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 0, 3, w); } for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${SB.rnd() < 0.5 ? '0,0,0' : '255,230,200'},${SB.rr(0.02, 0.06)})`; g.fillRect(SB.rnd() * w, SB.rnd() * w, 2, 6); } });
  cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping; cloth.repeat.set(6, 2);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 3.4, 48, 1, true), new THREE.MeshStandardMaterial({ map: cloth, side: THREE.BackSide, roughness: 1 })); wall.position.y = 1.7; ctx.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.2, 48, 1, true), new THREE.MeshStandardMaterial({ map: cloth, side: THREE.BackSide, roughness: 1 })); roof.position.y = 3.4 + 1.1; ctx.add(roof);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; ctx.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.2, 6), new THREE.MeshStandardMaterial({ color: 0x5a1a14, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; rug.receiveShadow = true; ctx.add(rug);
  // 几案、酒具、烛台
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a1610, roughness: 0.5 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.7), wood); table.position.set(0.25, 0.42, 0.95); ctx.add(SB.shadows(table));
  for (const x of [-0.45, 0.95]) for (const z of [0.7, 1.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), wood); l.position.set(x, 0.2, z); ctx.add(l); }
  const cupM = new THREE.MeshStandardMaterial({ color: 0x7a1a12, roughness: 0.3 });
  for (const [x, z] of [[0.6, 0.9], [-0.1, 1.05]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.06, 16), cupM); c.position.set(x, 0.49, z); ctx.add(c); }
  const candle = (x, y, z, s = 1) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.22 * s, 10), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0x3a2a10 })); c.position.set(x, y, z); ctx.add(c); SB.glow(ctx, [x, y + 0.16 * s, z], 0xffb060, 0.18 * s, 1); SB.glow(ctx, [x, y + 0.16 * s, z], 0xff8a30, 1.4 * s, 0.35); const L = new THREE.PointLight(0xffa050, 4 * s, 9, 1.6); L.position.set(x, y + 0.25, z); L.castShadow = s > 0.9; L.shadow.mapSize.set(1024, 1024); ctx.add(L); };
  candle(0.85, 0.57, 1.1, 1); candle(-1.9, 1.15, -1.5, 0.8); candle(0.8, 1.45, 0.9, 1.1);
  // 前景的烛台（虚焦）
  const X = XY3.make({ stage: 1 }); X.group.position.set(-0.2, 0, 0); X.group.rotation.y = 0.15; ctx.add(SB.shadows(X.group));
  X.POSES.turn = { arms: X.POSES.stand.arms, head: [0.03, -0.5, -0.02], neck: [0, -0.22, 0], chest: [0.02, -0.1, 0] };
  X.setPose('turn', 0.01); X.update(0.1);
  // 冷色门缝光（帐门在右边）
  const door = new THREE.DirectionalLight(0x8aa6d8, 1.1); door.position.set(-6, 2.5, 2.5); ctx.add(door);
  SB.dust(ctx, { n: 16, box: [-3, 3, 1.8, 3.2, -3, -0.5], s: [1.5, 3], op: [0.03, 0.05], col: 0xffc890 });
  const cam = SB.cam([-0.55, 1.62, 2.1], [-0.05, 1.72, 0.0], 30);
  return { ctx, cam, post: { focus: 2.2, ap: 1.0, maxR: 20, exp: 1.1, gain: [1.08, 0.96, 0.85], sat: 0.95, vign: 0.55, grain: 0.03 } };
};
// G14 · 汉骑逼近：山脊上一排排骑兵冒出来，逆光扬尘
SHOTS.G14 = () => {
  SB.reseed(14);
  const ctx = SB.stage(Object.assign({}, DAWN, { sun: [0.08, 0.1, -1], sunI: 2.8, hemi: 0.85, fogD: 0.008 }));
  SB.fill(ctx, [0.2, 0.6, 1], 0xd8c0a0, 1.1);
  SB.ground(ctx, { col: '#8a7a60', flat: 6, hills: 0, ridge: { z: -48, h: 9, w: 26 } });
  SB.ridges(ctx, { dist: 300, h: 30, col: 0x6d6a6a, seed: 6, layers: 2 });
  const pts = [];
  for (let row = 0; row < 12; row++) for (let i = 0; i < 44; i++) { const x = -58 + i * 2.7 + SB.rr(-0.9, 0.9) + (row % 2) * 1.35, z = -54 + row * 2.9 + SB.rr(-0.8, 0.8); if (row > 7 && Math.abs(x) > 40 - row * 2) continue; pts.push([x, ctx.hAt(x, z) - 0.05, z, Math.PI / 2 + SB.rr(-0.12, 0.12)]); }
  cavalry(ctx, 'r', pts);
  for (let i = 0; i < 16; i++) { const x = -52 + i * 7 + SB.rr(-2, 2), z = -50 + SB.rr(0, 8); flagPole(ctx, [x, ctx.hAt(x, z) - 0.3, z], 0xa8321f, 7.5, 1.8, 2.6, -Math.PI / 2 + 0.3); }
  SB.dust(ctx, { n: 260, box: [-70, 70, 6, 18, -64, -16], s: [6, 16], op: [0.07, 0.18], col: 0xf0c890 });
  SB.dust(ctx, { n: 180, box: [-60, 60, 0, 6, -40, -14], s: [3, 9], op: [0.06, 0.15], col: 0xe8c49a });
  SB.dust(ctx, { n: 40, box: [-10, 10, 0, 1.2, -16, -9], s: [2, 5], op: [0.08, 0.16], col: 0xf0d0a8 });
  SB.rays(ctx, { n: 9, c: [0, 60, -150], len: 140, w: [8, 20], op: [0.04, 0.09], col: 0xffd2a0, spread: 60, tilt: 0 });
  SB.reeds(ctx, [[-2.2, 0, -9.0], [2.4, 0, -8.8]], { per: 8, r: 0.4, h: [0.6, 1.1], col: 0x5a5440 });
  ctx.shadowAt([0, 6, -36], 60);
  const cam = SB.cam([0.5, 1.6, -2], [0, 7.6, -40], 30);
  return { ctx, cam, post: { focus: 31, ap: 0.5, maxR: 14, exp: 1.05, gain: [1.06, 0.97, 0.88], sat: 0.88, vign: 0.45 } };
};
// G17 · 江边落日：项王的剪影拔出长剑
SHOTS.G17 = () => {
  SB.reseed(17);
  const ctx = SB.stage({ top: 0x3a3a52, hor: 0xf08a4a, bot: 0x3a2a22, sun: [0.075, 0.055, -1], sunCol: 0xff8a40, sunI: 2.2, hemi: 0.3, skyL: 0x5a4a5a, gndL: 0x2a1a14, fogCol: 0xc8784a, fogD: 0.01, glow: 2.2, sunSize: 0.0016 });
  SB.ground(ctx, { col: '#3a2c22', flat: 30, shore: { x: -6, wob: 1.5 } });
  SB.water(ctx, { size: 1200, col: 0x3a3438 });
  SB.ridges(ctx, { dist: 300, h: 18, col: 0x3a2a30, seed: 8, layers: 2 });
  const X = XY3.make({ stage: 3 }); X.group.position.set(0, 0, 0); X.group.rotation.y = -1.35; ctx.add(SB.shadows(X.group));
  X.POSES.draw = { arms: { '-1': X.POSES.stand.arms['-1'], '1': [[0.28, 0.42, 0.32], [0.7, -0.1, -0.2]] }, head: [-0.12, 0, 0], chest: [-0.05, 0, 0] };
  X.update(0.1); const keep = X.J.sword.position.clone();
  X.setPose('draw', 0.01); X.update(0.1); X.J.sword.position.copy(keep);   // 剑鞘留在腰间
  // 拔出来的剑：剑身朝天
  const J = X.J, lp = new THREE.Vector3(); J.hand1.getWorldPosition(lp); X.group.worldToLocal(lp);
  const blade = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, metalness: 1, roughness: 0.25 }), gold = new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.3 });
  const bl = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.9, 0.012), steel); bl.position.y = 0.5; blade.add(bl);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.08, 4), steel); tip.position.y = 0.99; tip.scale.z = 0.3; blade.add(tip);
  const gd = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.05), gold); gd.position.y = 0.04; blade.add(gd);
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x3a2016 })); hl.position.y = -0.06; blade.add(hl);
  blade.position.copy(lp); blade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.12, 1, 0.1).normalize()); X.group.add(blade);
  const rp = []; for (let i = 0; i < 20; i++) rp.push([SB.rr(-9, -4), 0, SB.rr(-12, 8)]);
  SB.reeds(ctx, rp, { per: 22, r: 1.4, h: [1.0, 2.2], col: 0x2a2018 });
  SB.dust(ctx, { n: 50, box: [-60, 20, 0, 4, -80, -5], s: [6, 16], op: [0.06, 0.14], col: 0xffa060 });
  const cam = SB.cam([-1.0, 0.85, 10.5], [0.35, 1.55, 0], 30);
  return { ctx, cam, post: { focus: 10.6, ap: 0.4, maxR: 10, exp: 1.0, gain: [1.1, 0.92, 0.8], sat: 1.05, vign: 0.55 } };
};
// P02 · 彭城宫中宴饮：刘邦（造型一）站在宴席后，前景金玉宝箱虚焦
SHOTS.P02 = () => {
  SB.reseed(22);
  const ctx = SB.stage(Object.assign({}, NIGHT, { hemi: 0.25, sunI: 0, fogD: 0.0 })); ctx.S.fog = null;
  const red = new THREE.MeshStandardMaterial({ color: 0x8e1c14, roughness: 0.5 }), dark = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.35, metalness: 0.1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; ctx.add(floor);
  for (const x of [-4.5, 4.5]) for (const z of [-6, -2, 2]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 6, 20), red); c.position.set(x, 3, z); ctx.add(SB.shadows(c)); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshStandardMaterial({ color: 0x3a1410, roughness: 0.9 })); back.position.set(0, 4, -8); ctx.add(back);
  // 帷幕
  for (let i = 0; i < 9; i++) { const g = new THREE.PlaneGeometry(1.4, 6, 10, 1), P = g.attributes.position; for (let k = 0; k < P.count; k++) P.setZ(k, Math.sin(P.getX(k) * 4.5) * 0.12); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: i % 2 ? 0x7a1a14 : 0x9a6a2a, side: THREE.DoubleSide, roughness: 0.9 })); m.position.set(-6 + i * 1.5, 4, -7.6); ctx.add(m); }
  // 宴席几案与灯
  const wood = new THREE.MeshStandardMaterial({ color: 0x2a120c, roughness: 0.4 });
  for (const [x, z] of [[-2.6, -3], [2.6, -3], [-2.6, -0.6], [2.6, -0.6]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.7), wood); t.position.set(x, 0.42, z); ctx.add(SB.shadows(t)); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.06, 14), new THREE.MeshStandardMaterial({ color: 0x8e1c14, roughness: 0.25 })); c.position.set(x - 0.6 + k * 0.4, 0.5, z); ctx.add(c); } }
  const lamp = (x, y, z, I = 5) => { SB.glow(ctx, [x, y, z], 0xffb060, 0.25, 1); SB.glow(ctx, [x, y, z], 0xff9040, 2.2, 0.35); const L = new THREE.PointLight(0xffa050, I, 14, 1.6); L.position.set(x, y + 0.2, z); ctx.add(L); };
  for (const [x, z] of [[-3.8, -5], [3.8, -5], [-3.8, -1], [3.8, -1], [-1.5, -6.5], [1.5, -6.5]]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35 })); s.position.set(x, 0.7, z); ctx.add(s); lamp(x, 1.5, z); }
  // 刘邦
  const L5 = LB2.make({ stage: 1 }); L5.group.position.set(0, 0, -3.6); L5.group.rotation.y = 0.42; ctx.add(SB.shadows(L5.group));
  const key = new THREE.SpotLight(0xffc488, 30, 14, 0.5, 0.6, 1.5); key.position.set(2.5, 4.5, 0.5); key.target.position.set(0, 1.5, -3.6); key.castShadow = true; ctx.add(key); ctx.add(key.target);
  // 前景：宝箱、金饼、玉璧（虚焦）
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 1, roughness: 0.25 }), jade = new THREE.MeshStandardMaterial({ color: 0x9ac0a0, roughness: 0.2 });
  // 前景几案：酒樽、耳杯、金饼、玉璧
  const ft = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.8), wood); ft.position.set(0.3, 1.02, -1.55); ctx.add(ft);
  for (const [x, z] of [[-0.2, -1.8], [0.15, -2.1], [0.95, -2.0]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x8e1c14, roughness: 0.2 })); c.position.set(x + 0.35, 1.09, z + 0.35); ctx.add(c); }
  for (let i = 0; i < 22; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 16), gold); c.position.set(-0.35 + SB.rr(-0.3, 0.3), 1.08 + SB.rr(0, 0.1), -1.5 + SB.rr(-0.2, 0.2)); c.rotation.set(SB.rr(-0.5, 0.5), 0, SB.rr(-0.5, 0.5)); ctx.add(c); }
  for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 10, 24), jade); b.position.set(1.15 + i * 0.22, 1.1, -1.45); b.rotation.x = 1.4; ctx.add(b); }
  lamp(-1.6, 1.7, -2.2, 3); lamp(1.8, 1.6, -5.6, 3);
  SB.dust(ctx, { n: 30, box: [-5, 5, 1.5, 5, -7, 0], s: [2, 5], op: [0.03, 0.07], col: 0xffc890 });
  const cam = SB.cam([1.25, 1.38, -0.75], [-0.1, 1.66, -3.6], 30);
  return { ctx, cam, post: { focus: 3.15, ap: 1.0, maxR: 16, exp: 1.2, gain: [1.08, 0.96, 0.85], sat: 1.0, vign: 0.5 } };
};
// P06 · 大风扬沙里，刘邦（造型五）回头
SHOTS.P06 = () => {
  SB.reseed(26);
  const ctx = SB.stage({ top: 0x4a4038, hor: 0x9a8064, bot: 0x5a4a3a, sun: [-0.6, 0.5, -0.4], sunCol: 0xd8b088, sunI: 1.2, hemi: 0.7, skyL: 0x8a7a68, gndL: 0x4a3a2a, fogCol: 0x8e7658, fogD: 0.05, glow: 0.4 });
  SB.ground(ctx, { col: '#7a6448', flat: 10 });
  const L5 = LB2.make({ stage: 5 }); L5.group.position.set(0, 0, 0); L5.group.rotation.y = -0.6; ctx.add(SB.shadows(L5.group));
  // 回头：头往回扭
  L5.POSES.back = Object.assign({}, L5.POSES.flee, { head: [0.0, 0.7, 0.05], neck: [0, 0.3, 0], chest: [0.05, 0.3, 0] });
  L5.setPose('back', 0.01); L5.update(0.1);
  // 风沙里追来的楚军（剪影）
  const pts = []; for (let i = 0; i < 60; i++) pts.push([SB.rr(-14, 10), 0, SB.rr(-30, -9), Math.PI * 0.1 + SB.rr(-0.3, 0.3)]);
  soldiers(ctx, 'b', 'spear', pts, 'charge', { outline: false });
  // 斜着刮的沙：一层层横拉的尘片
  SB.dust(ctx, { n: 200, box: [-25, 25, 0, 8, -35, 4], s: [3, 9], op: [0.08, 0.2], col: 0xa88a64 });
  SB.dust(ctx, { n: 40, box: [-4, 4, 0.5, 3, 1.2, 3.5], s: [1, 2.5], op: [0.06, 0.14], col: 0xb89a70 });
  ctx.shadowAt([0, 0, 0], 8);
  const cam = SB.cam([-1.5, 1.45, 3.0], [0.1, 1.95, 0], 34);
  return { ctx, cam, post: { focus: 3.3, ap: 1.0, maxR: 16, exp: 1.05, gain: [1.04, 0.98, 0.9], sat: 0.8, vign: 0.5, grain: 0.04 } };
};
