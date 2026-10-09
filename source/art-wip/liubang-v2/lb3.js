// 刘邦 · 版本二、三：MakeHuman 的身体和脸（写实比例、真骨架），冕服照 LB2 那一套按这副身体的关节生成
//   LB3.make({ look: 'toon' | 'pbr' }) → { group, body, costume }
//   需要先加载 cine.js（Cine.makeBody）、dress.js（Dress）、lb2.js（LB2）和 window.LIU_BODY（mhbuild 生成的 liu_body.json）
const LB3 = (() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const KEEP = /^(head|jaw|neck0\d|eye\.[LR]|wrist\.[LR]|finger\d-\d\.[LR])$/;
  // 只留头、脖子、手（其余都在袍子里，免得穿模）
  function keepVisible(body) {
    const g = body.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, names = body.skeleton.bones.map(b => b.name), n = si.count, ok = new Uint8Array(n);
    for (let i = 0; i < n; i++) { let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } } ok[i] = KEEP.test(names[best]) ? 1 : 0; }
    const I = g.index.array, out = [];
    for (let t = 0; t < I.length; t += 3) if (ok[I[t]] && ok[I[t + 1]] && ok[I[t + 2]]) out.push(I[t], I[t + 1], I[t + 2]);
    g.setIndex(out);
  }
  const BEARD = (x, y, z) => { const ax = Math.abs(x);
    const jaw = Dress.sstep(0.004, -0.01, y) * Dress.sstep(-0.12, -0.09, y) * Dress.sstep(-0.03, 0.02, z) * (z < 0.06 ? Dress.sstep(-0.09, -0.07, y) : 1);
    const lip = (ax < 0.028 && y < -0.014 && y > -0.044 && z > 0.1) ? 0 : 1;
    const must = Dress.sstep(0.034, 0.02, ax) * Dress.sstep(-0.003, -0.008, y) * Dress.sstep(-0.02, -0.013, y) * Dress.sstep(0.104, 0.112, z);
    const cheekCut = Dress.sstep(0.055, 0.04, ax) + Dress.sstep(-0.03, -0.05, y);
    return Math.max(jaw * lip * Dress.clamp(cheekCut), must); };
  const BEARD_LEN = (l) => { const ax = Math.abs(l.x); if (l.y > -0.02 && ax < 0.035) return 0.022; if (l.y < -0.05 && ax < 0.04) return 0.19 - ax * 2.6; if (l.y < -0.035) return 0.075; return 0.016; };
  const BEARD_FLOW = (l, n) => new THREE.Vector3(l.y > -0.02 && Math.abs(l.x) < 0.035 ? (l.x > 0 ? 0.9 : -0.9) : l.x * 2, -1, l.y > -0.02 && Math.abs(l.x) < 0.035 ? 0.1 : 0.25);
  // 半写实的头发：贴着头皮的一整块发壳（边缘干净，沿发际线收薄），发髻；眉、须是一绺一绺的
  function hairCap(body, BUN, o = {}) {
    const { H } = Dress.headFrame(body), c = V(0, 0.05, 0), rad0 = Dress.scalpTable(body, c);
    const dirAt = (az, pol) => V(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az));
    const rad = (az, pol) => { let s = 0, n = 0; for (const da of [-0.09, 0, 0.09]) for (const dp of [-0.07, 0, 0.07]) { s += rad0(dirAt(az + da, Math.max(0.01, pol + dp))); n++; } return s / n; };
    const hairTex = LB2.cv(512, 256, (g, w, h) => { g.fillStyle = o.base || '#15100d'; g.fillRect(0, 0, w, h); for (let i = 0; i < 520; i++) { g.strokeStyle = Math.random() < 0.15 ? 'rgba(120,100,88,.45)' : 'rgba(0,0,0,.5)'; g.lineWidth = 0.6 + Math.random() * 1.4; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (Math.random() - 0.5) * 10, h / 2, x + (Math.random() - 0.5) * 5, h); g.stroke(); } });
    hairTex.wrapS = THREE.RepeatWrapping; hairTex.repeat.set(5, 1);
    const hm = new THREE.MeshStandardMaterial({ map: hairTex, roughness: o.rough ?? 0.5, color: 0xffffff, envMapIntensity: 0.5 });
    const NA = 120, NP = 40, polB = [];
    for (let i = 0; i <= NA; i++) { const az = i / NA * Math.PI * 2; let pb = 0.2; for (let pol = 0.2; pol < 2.4; pol += 0.008) { const d = dirAt(az, pol), p = d.clone().multiplyScalar(rad(az, pol)).add(c); if (Dress.hairline(p.x, p.y, p.z) < 0.0) break; pb = pol; } polB.push(pb); }
    for (let k = 0; k < 3; k++) for (let i = 0; i <= NA; i++) polB[i] = (polB[(i + NA - 1) % NA] + 2 * polB[i] + polB[(i + 1) % NA]) / 4;   // 发际线顺一顺
    const th = o.thick ?? 0.0062;
    const cap = LB2.gridGeo(NA, NP, (u, v) => { const i = Math.round(u * NA), az = u * Math.PI * 2, pol = 0.02 + v * (polB[i] - 0.02), d = dirAt(az, pol), r = rad(az, pol) + 0.0012 + th * (1 - Math.pow(v, 2.5)); const p = d.multiplyScalar(r).add(c).add(H); return [p.x, p.y, p.z]; });
    const capM = new THREE.Mesh(cap, hm); capM.castShadow = capM.receiveShadow = true; body.add(capM);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.031, 32, 20), hm); bun.position.copy(H).add(BUN); bun.scale.set(1, 0.82, 1); body.add(bun);
    return { cap, bun, capM, H };
  }
  function clumps(body, BUN, TOON) {
    const { cap, bun, H } = hairCap(body, BUN);
    // 须、眉：一绺绺的锥管
    const B = [], smp = Dress.sampler(body, (x, y, z) => BEARD(x, y, z) > 0.3), r = Dress.rng(19);
    const clump = (p, n, len, flow, r0, droop, col) => { const t = flow.clone().sub(n.clone().multiplyScalar(flow.dot(n))).normalize(); const pts = []; for (let k = 0; k < 6; k++) { const s = k / 5; const q = p.clone().addScaledVector(n, 0.002 + len * 0.12 * s * (1 - 0.5 * s)).addScaledVector(t, len * s); q.y -= droop * len * s * s; pts.push(q); } B.push({ geo: LB2.taper(pts, r0, r0 * 0.12, 7, 12), color: col, m: new THREE.Matrix4() }); };
    for (let i = 0; i < 150; i++) { const sm = smp(r), l = sm.l, len = BEARD_LEN(l) * (0.75 + r() * 0.4); clump(sm.p, sm.n, len, BEARD_FLOW(l, sm.n), len > 0.05 ? 0.0075 + r() * 0.003 : 0.0045, len > 0.05 ? 0.45 : 0.2, r() < 0.12 ? 0x7a7068 : 0x1a1410); }
    const lm = body.userData.lm, E = V(...lm['eye.L:head']).sub(H);
    const sb = Dress.sampler(body, (x, y, z) => Math.abs(x) > 0.01 && Math.abs(x) < 0.064 && Math.abs(y - (E.y + 0.02 + (Math.abs(x) - 0.03) * 0.14 - 0.012 * ((Math.abs(x) - 0.035) / 0.03) ** 2)) < 0.005 && z > 0.06);
    for (let i = 0; i < 60; i++) { const sm = sb(r), sx = Math.sign(sm.l.x), inner = Dress.sstep(0.03, 0.012, Math.abs(sm.l.x)); clump(sm.p, sm.n, 0.012 + r() * 0.006, V(sx * (1 - inner * 0.6), 0.2 + inner * 0.7, 0), 0.0022, -0.05, 0x17120f); }
    const merged = Core.merge(B);
    const bm = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 })); body.add(bm);
    if (TOON || true) { for (const [g, th] of [[cap, 0.0018], [merged, 0.0012]]) body.add(new THREE.Mesh(g, Core.outlineMat(th))); const bo = new THREE.Mesh(bun.geometry, Core.outlineMat(0.0018)); bo.position.copy(bun.position); bo.scale.copy(bun.scale); body.add(bo); }
  }
  // 脸上的岁数：抬头纹、川字纹、鱼尾纹、眼袋、法令纹。画在一张「正面投影」的图上（颜色 + 高度），着色时按物体坐标取，并用高度做凹凸
  function faceDetail(mat, H, o = {}) {
    const W = 1024, X0 = -0.09, X1 = 0.09, Y0 = -0.1, Y1 = 0.14;
    const px = (x, y) => [(x - X0) / (X1 - X0) * W, (Y1 - y) / (Y1 - Y0) * W];
    const c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(0, 0, W, W);
    // 颜色 = rgb（乘到皮肤上），高度 = a（1 平，越小越凹）。先画到两张图上再合成
    const col = document.createElement('canvas'); col.width = col.height = W; const gc = col.getContext('2d'); gc.fillStyle = '#fff'; gc.fillRect(0, 0, W, W);
    const ht = document.createElement('canvas'); ht.width = ht.height = W; const gh = ht.getContext('2d'); gh.fillStyle = '#fff'; gh.fillRect(0, 0, W, W);
    const line = (pts, w, dark, depth) => {
      for (const [gg, colr, k] of [[gc, `rgba(120,70,55,${dark})`, 1], [gh, `rgba(0,0,0,${depth})`, 1]]) {
        gg.strokeStyle = colr; gg.lineWidth = w * k; gg.lineCap = 'round'; gg.lineJoin = 'round'; gg.filter = 'blur(1.5px)';
        gg.beginPath(); pts.forEach((p, i) => { const q = px(p[0], p[1]); i ? gg.lineTo(q[0], q[1]) : gg.moveTo(q[0], q[1]); }); gg.stroke(); gg.filter = 'none';
      }
    };
    const blob = (x, y, rx, ry, colr) => { const q = px(x, y); gc.save(); gc.translate(q[0], q[1]); gc.scale(1, ry / rx); const r = rx / (X1 - X0) * W; const gr = gc.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, colr); gr.addColorStop(1, 'rgba(255,255,255,0)'); gc.fillStyle = gr; gc.fillRect(-r, -r, 2 * r, 2 * r); gc.restore(); };
    const arc = (cx, cy, hw, sag, n = 12) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n * 2 - 1; o.push([cx + t * hw, cy - sag * (1 - t * t)]); } return o; };
    // 抬头纹三道（中间断开一点）、川字两道
    for (const [y, a] of [[0.084, 0.35], [0.096, 0.3], [0.108, 0.22]]) { line(arc(-0.024, y, 0.02, -0.002), 3, a * 0.5, a); line(arc(0.024, y, 0.02, -0.002), 3, a * 0.5, a); }
    for (const s of [-1, 1]) line([[s * 0.006, 0.072], [s * 0.005, 0.056]], 3.5, 0.25, 0.4);
    for (const s of [-1, 1]) {
      // 鱼尾纹
      for (let k = 0; k < 3; k++) line([[s * 0.049, 0.05 - k * 0.005], [s * 0.062, 0.054 - k * 0.009]], 2.5, 0.25, 0.35);
      // 眼袋、下眼睑的影
      line(arc(s * 0.03, 0.033, 0.016, 0.004), 4, 0.25, 0.4); blob(s * 0.03, 0.039, 0.02, 0.008, 'rgba(150,100,90,.35)');
      // 眼窝暗一点
      blob(s * 0.031, 0.05, 0.024, 0.016, 'rgba(160,115,100,.3)');
      // 法令纹：鼻翼旁往嘴角斜下
      line([[s * 0.017, 0.006], [s * 0.024, -0.012], [s * 0.029, -0.03], [s * 0.031, -0.042]], 5, 0.35, 0.55);
      // 颧骨下的凹影
      blob(s * 0.05, -0.02, 0.022, 0.03, 'rgba(170,120,105,.25)');
    }
    // 合成：rgb 用颜色图，a 用高度图的亮度
    const ci = gc.getImageData(0, 0, W, W).data, hi = gh.getImageData(0, 0, W, W).data, im = g.createImageData(W, W);
    for (let i = 0; i < W * W * 4; i += 4) { im.data[i] = ci[i]; im.data[i + 1] = ci[i + 1]; im.data[i + 2] = ci[i + 2]; im.data[i + 3] = hi[i]; }
    g.putImageData(im, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.premultiplyAlpha = false;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uFace = { value: tex }; sh.uniforms.uH = { value: H }; sh.uniforms.uBump = { value: o.bump ?? 0.9 };
      sh.vertexShader = 'uniform vec3 uH;\nvarying vec2 vFaceUv;\nvarying float vFaceW;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 rl = position - uH; vFaceUv = vec2((rl.x - (${X0.toFixed(3)})) / ${(X1 - X0).toFixed(3)}, (rl.y - (${Y0.toFixed(3)})) / ${(Y1 - Y0).toFixed(3)}); vFaceW = smoothstep(0.035, 0.075, rl.z) * (1.0 - smoothstep(0.125, 0.15, rl.y)) * (1.0 - smoothstep(-0.11, -0.13, rl.y)); }`);
      sh.fragmentShader = 'uniform sampler2D uFace;\nuniform float uBump;\nvarying vec2 vFaceUv;\nvarying float vFaceW;\n' +
        `vec3 pnArb2(vec3 sp, vec3 sn, vec2 dH, float fd) { vec3 sx = normalize(dFdx(sp)); vec3 sy = normalize(dFdy(sp)); vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx); float det = dot(sx, r1) * fd; vec3 gr = sign(det) * (dH.x * r1 + dH.y * r2); return normalize(abs(det) * sn - gr); }\n` +
        sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          vec4 fdt = texture2D(uFace, vFaceUv); diffuseColor.rgb *= mix(vec3(1.0), fdt.rgb, vFaceW);`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { float hh = texture2D(uFace, vFaceUv).a; vec2 dH = vec2(dFdx(hh), dFdy(hh)) * uBump * vFaceW; normal = pnArb2(-vViewPosition, normal, dH, faceDirection); }`);
    };
    mat.customProgramCacheKey = () => 'liuFace';
    return tex;
  }
  function make(o = {}) {
    const look = o.look || 'pbr', TOON = look === 'toon', J = window.LIU_BODY, root = new THREE.Group();
    const grad = Core.toon(0xffffff).gradientMap;
    const skinMat = TOON ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad })
      : new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.56, sheen: 0.35, sheenColor: new THREE.Color(0.62, 0.3, 0.24), sheenRoughness: 0.6, envMapIntensity: 0.55 });
    const body = Cine.makeBody(J, skinMat);
    const bb = new THREE.Box3().setFromBufferAttribute(body.geometry.attributes.position), Y0 = -bb.min.y; body.position.y = Y0;
    root.add(body);
    Dress.skin(body, { tone: '#bb917a', cheek: '#b8705e', lip: '#93574b', scalp: '#1d1612', stubble: 0.55, beard: '#4f4038' });
    keepVisible(body);
    if (!TOON && o.age !== false) faceDetail(skinMat, V(...J.lm['head:head']), { bump: o.bump });
    const eyes = Dress.eyes(body, { iris: '#3a2416', iris2: '#6a4428' });
    const BUN = V(0, 0.17, -0.02);
    if ((o.hair || 'strand') === 'strand') {
      // 眉、须、发：一根根的发丝
      const st = new Dress.Strands();
      Dress.brows(body, st, { n: 950, len: 0.0105, w: 0.00028, color: '#2b221c', thick: 0.0058, arch: 0.16 });
      Dress.beard(body, st, {
        n: 34000, w: 0.00036, color: '#15100d', tip: '#2e241e', region: BEARD,
        len: BEARD_LEN, flow: BEARD_FLOW, jawW: (l) => Dress.sstep(-0.03, -0.07, l.y) * 0.9, lift: 0.14, droop: 0.55, curl: 0.2,
      });
      Dress.hairStrands(body, st, { n: 12000, w: 0.00048, bun: BUN, thick: 0.0022, edge: 0.006, color: '#0e0a08', tip: '#2a1e15' });
      Dress.hairBun(body, st, { n: 1600, bun: BUN, r: 0.03 });
      st.mesh(body, Dress.hairMat({ roughness: 0.42 }));
      hairCap(body, BUN, { thick: 0.0045, base: '#1a130f' });
    } else clumps(body, BUN, TOON);
    if (o.outline) { const ol = new THREE.SkinnedMesh(body.geometry, Core.outlineMat(o.outline)); ol.frustumCulled = false; body.add(ol); ol.bind(body.skeleton, body.bindMatrix); }
    // —— 关节位置（静止姿势、落地后）——
    const bone = n => J.bones.find(b => b.name === n), hw = n => V(...bone(n).head).add(V(0, Y0, 0));
    const SL = hw('upperarm01.L'), EL = hw('lowerarm01.L'), WL = hw('wrist.L'), N0 = hw('neck01'), HD = hw('head');
    const CH = 1.26;
    const rig = { hipsY: 0.95, chest: CH - 0.95, shX: SL.x, shY: SL.y - CH, shZ: SL.z, neck: N0.y - CH, head: HD.y - N0.y, headZ: HD.z - N0.z, L1: SL.distanceTo(EL), L2: EL.distanceTo(WL) };
    const headTop = bb.max.y + Y0 - HD.y;
    const costume = LB2.make({ stage: 1, look, rig, ink: o.ink, inkScale: o.inkScale ?? 0.6, noHands: true, noNeck: true, headBuild: () => { }, crownY: headTop + (o.crownLift ?? 0.012), crownS: o.crownS ?? 0.95 });
    root.add(costume.group);
    // —— MakeHuman 的胳膊对准 LB2 解出来的肘、腕 ——
    root.updateMatrixWorld(true);
    const B = body.userData.bones;
    const aim = (b, tip, target) => {
      const bw = V(); b.getWorldPosition(bw);
      const qd = new THREE.Quaternion().setFromUnitVectors(tip.clone().sub(bw).normalize(), target.clone().sub(bw).normalize());
      const qb = new THREE.Quaternion(); b.getWorldQuaternion(qb); const qp = new THREE.Quaternion(); b.parent.getWorldQuaternion(qp);
      b.quaternion.copy(qp.invert().multiply(qd.multiply(qb))); b.updateMatrixWorld(true);
    };
    for (const [s, S] of [[1, 'L'], [-1, 'R']]) {
      const eT = V(), wT = V(); costume.J['el' + s].getWorldPosition(eT); costume.J['wr' + s].getWorldPosition(wT);
      const e = V(); B['lowerarm01.' + S].getWorldPosition(e); aim(B['upperarm01.' + S], e, eT);
      const w = V(); B['wrist.' + S].getWorldPosition(w); aim(B['lowerarm01.' + S], w, wT);
      // 手：掌心朝里、手指半握（捧着玉圭）
      const hp = o.hand || [0, 0, 0];
      B['wrist.' + S].rotateY(s * (hp[1] ?? 0)); B['wrist.' + S].rotateX(hp[0] ?? 0); B['wrist.' + S].rotateZ(s * (hp[2] ?? 0));
      for (const f of ['finger3-1', 'finger3-2']) if (B[f + '.' + S]) B[f + '.' + S].rotateX(o.curl ?? 0.6);
      if (B['finger1-2.' + S]) B['finger1-2.' + S].rotateX(0.3);
    }
    root.updateMatrixWorld(true);
    // 玉圭放到两手之间
    if (costume.J.gui) { const a = V(), b = V(); B['wrist.L'].getWorldPosition(a); B['wrist.R'].getWorldPosition(b); const m = a.add(b).multiplyScalar(0.5); costume.J.gui.position.set(m.x, m.y - 0.14, m.z + 0.06); }
    root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return { group: root, body, costume, update: () => { }, setPose: () => { } };
  }
  return { make };
})();
