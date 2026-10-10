// ===== 棋盘、棋子、楚河汉界流水、水墨山水 =====
const Board = (() => {
  const { scene, toon, inked, canvasTex, rnd, inkBlot, Tex } = Core;
  const TOP = 0.25, PH = 0.2, HALF = 0.24, RZ = 0.62, BX = 4.75, BZ = RZ + 4 + 1.2, BRIDGE_X = 6.97;
  const X = f => f - 4;
  const Z = r => (r <= 4 ? RZ + (4 - r) : -(RZ + (r - 5)));
  const pos = (f, r, y = TOP) => new THREE.Vector3(X(f), y, Z(r));
  const root = new THREE.Group();
  scene.add(root);

  // ---------- 棋盘面（木纹 + 墨线） ----------
  const PPU = 170;
  const FONT = '"KaiTi","STKaiti","Kaiti SC","楷体","BiauKai","Noto Serif CJK SC","Songti SC",serif';
  // —— 纹样：回纹带、四合如意角花、海水纹 ——
  function fretBand(g, x0, y0, x1, y1, w, col, hi) {
    const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    g.save(); g.translate(x0, y0); g.rotate(a);
    const n = Math.max(1, Math.round(L / (w * 0.95))), u = L / n, h = w * 0.6, t = -h / 2 + w * 0.04, b = h / 2 + w * 0.04, q = h * 0.25;
    const draw = (off, color, lw) => {
      g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'miter'; g.lineCap = 'butt';
      g.beginPath();
      g.moveTo(0, -w / 2 + off); g.lineTo(L, -w / 2 + off);
      g.moveTo(0, w / 2 + off); g.lineTo(L, w / 2 + off);
      g.moveTo(0, b + off); g.lineTo(L, b + off);
      for (let i = 0; i < n; i++) {
        const l = i * u + u * 0.12, r = (i + 1) * u - u * 0.12, m = (t + b) / 2;
        g.moveTo(l, b + off); g.lineTo(l, t + off); g.lineTo(r, t + off); g.lineTo(r, b - q + off); g.lineTo(l + q, b - q + off); g.lineTo(l + q, t + q + off); g.lineTo(r - q, t + q + off); g.lineTo(r - q, m + off);
      }
      g.stroke();
    };
    draw(w * 0.04, 'rgba(50,28,8,.3)', w * 0.075);
    draw(0, col, w * 0.062);
    if (hi) draw(-w * 0.02, hi, w * 0.022);
    g.restore();
  }
  function rosette(g, x, y, s, col, hi, rot = 0) {
    g.save(); g.translate(x, y); g.rotate(rot);
    const one = (color, lw, off) => {
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = lw;
      g.strokeRect(-s / 2 + off, -s / 2 + off, s, s);
      g.strokeRect(-s * 0.4 + off, -s * 0.4 + off, s * 0.8, s * 0.8);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.arc(Math.cos(a) * s * 0.15 + off, Math.sin(a) * s * 0.15 + off, s * 0.15, 0, Math.PI * 2); g.stroke(); }
      g.beginPath(); g.arc(off, off, s * 0.06, 0, 7); g.fill();
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, r = s * 0.3; g.beginPath(); g.arc(Math.cos(a) * r + off, Math.sin(a) * r + off, s * 0.055, a + 0.6, a + 0.6 + Math.PI * 1.5); g.stroke(); }
    };
    one('rgba(50,28,8,.3)', s * 0.05, s * 0.02);
    one(col, s * 0.045, 0);
    if (hi) one(hi, s * 0.016, -s * 0.01);
    g.restore();
  }
  function waveBand(g, x0, x1, y, r, col, up) {
    const d = up ? -1 : 1;
    g.lineCap = 'round';
    for (let row = 0; row < 2; row++) {
      const yy = y + row * r * 0.95 * d, off = row ? r : 0;
      for (let x = x0 + off; x < x1 - r * 0.5; x += r * 2) {
        for (const [rr, lw, a] of [[r, r * 0.2, 0.55], [r * 0.6, r * 0.14, 0.45], [r * 0.25, r * 0.12, 0.4]]) {
          g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = lw;
          g.beginPath(); g.arc(x, yy, rr, up ? Math.PI : 0, up ? Math.PI * 2 : Math.PI, false); g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
  }
  const GOLD = '#94692a', GOLD_HI = 'rgba(250,222,150,.55)';
  function drawHalf(isRed) {
    const zmin = isRed ? HALF : -BZ, zmax = isRed ? BZ : -HALF;
    const W = Math.round(2 * BX * PPU), H = Math.round((zmax - zmin) * PPU);
    return canvasTex(W, H, (g) => {
      // 木底
      const grd = g.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, '#e2bf85'); grd.addColorStop(0.5, '#d6ad70'); grd.addColorStop(1, '#c79a5c');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.55;
      g.drawImage(Tex.wood.image, 0, 0, W, H);
      g.globalAlpha = 1;
      const cx = x => (x + BX) * PPU, cy = z => (z - zmin) * PPU;
      const ranks = isRed ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
      const ink = 'rgba(28,24,20,0.88)';
      const line = (x1, z1, x2, z2, w = 5) => {
        g.strokeStyle = ink; g.lineCap = 'round';
        for (let k = 0; k < 2; k++) {
          g.lineWidth = w * (k ? 0.55 : 1); g.globalAlpha = k ? 0.5 : 0.85;
          g.beginPath(); g.moveTo(cx(x1) + (rnd() - 0.5), cy(z1) + (rnd() - 0.5)); g.lineTo(cx(x2) + (rnd() - 0.5), cy(z2) + (rnd() - 0.5)); g.stroke();
        }
        g.globalAlpha = 1;
      };
      for (const r of ranks) line(X(0), Z(r), X(8), Z(r));
      for (let f = 0; f < 9; f++) line(X(f), Z(ranks[0]), X(f), Z(ranks[4]));
      // 外框双线
      const edgeZ = isRed ? Z(0) : Z(9), innerZ = isRed ? Z(4) : Z(5);
      const pad = 0.17;
      const zOut = isRed ? edgeZ + pad : edgeZ - pad;
      line(X(0) - pad, zOut, X(8) + pad, zOut, 9);
      line(X(0) - pad, zOut, X(0) - pad, innerZ, 9);
      line(X(8) + pad, zOut, X(8) + pad, innerZ, 9);
      // 九宫
      const pr = isRed ? [0, 2] : [9, 7];
      line(X(3), Z(pr[0]), X(5), Z(pr[1])); line(X(5), Z(pr[0]), X(3), Z(pr[1]));
      // 炮位兵位标记
      const marks = isRed ? [[1, 2], [7, 2], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3]] : [[1, 7], [7, 7], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]];
      for (const [f, r] of marks) {
        const x = cx(X(f)), y = cy(Z(r)), d = 12, L = 26;
        g.strokeStyle = ink; g.lineWidth = 4;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          if ((f === 0 && sx < 0) || (f === 8 && sx > 0)) continue;
          g.beginPath(); g.moveTo(x + sx * d, y + sy * (d + L)); g.lineTo(x + sx * d, y + sy * d); g.lineTo(x + sx * (d + L), y + sy * d); g.stroke();
        }
      }
      // —— 外缘装饰：回纹带、四角如意、河岸海水纹、正中印章 ——
      const sg = isRed ? 1 : -1, bw = 0.27 * PPU;
      const sx = 4.46, zf = sg * 5.52, zn = sg * 0.4;
      g.strokeStyle = 'rgba(148,105,42,.8)'; g.lineWidth = 3;
      g.strokeRect(cx(-BX + 0.06), Math.min(cy(sg * (BZ - 0.06)), cy(sg * (HALF + 0.04))), (2 * BX - 0.12) * PPU, Math.abs(cy(sg * (BZ - 0.06)) - cy(sg * (HALF + 0.04))));
      for (const x of [-sx, sx]) fretBand(g, cx(x), cy(zf) - sg * 0.2 * PPU * 0, cx(x), cy(zn), bw, GOLD, GOLD_HI);
      fretBand(g, cx(-sx), cy(zf), cx(-0.36), cy(zf), bw, GOLD, GOLD_HI);
      fretBand(g, cx(0.36), cy(zf), cx(sx), cy(zf), bw, GOLD, GOLD_HI);
      for (const x of [-sx, sx]) { rosette(g, cx(x), cy(zf), 0.4 * PPU, GOLD, GOLD_HI); rosette(g, cx(x), cy(zn), 0.3 * PPU, GOLD, GOLD_HI, Math.PI / 4); }
      waveBand(g, cx(-4.15), cx(4.15), cy(sg * 0.36), 0.075 * PPU, '#7a5424', isRed);
      // 九宫角花
      const pz = isRed ? [Z(0), Z(2)] : [Z(9), Z(7)];
      for (const x of [X(3), X(5)]) for (const z of pz) { g.fillStyle = 'rgba(148,105,42,.5)'; g.beginPath(); g.arc(cx(x), cy(z), 9, 0, 7); g.fill(); }
      // 正中朱印
      g.save();
      g.translate(cx(0), cy(zf));
      if (!isRed) g.rotate(Math.PI);
      const ss = 0.46 * PPU;
      g.fillStyle = isRed ? 'rgba(160,36,22,.92)' : 'rgba(30,26,24,.94)'; g.fillRect(-ss / 2, -ss / 2, ss, ss);   // 汉朱印、楚墨印
      g.strokeStyle = 'rgba(247,232,205,.85)'; g.lineWidth = 4; g.strokeRect(-ss / 2 + 7, -ss / 2 + 7, ss - 14, ss - 14);
      g.fillStyle = '#f5e6c8'; g.font = `bold ${Math.round(ss * 0.66)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(isRed ? '漢' : '楚', 0, ss * 0.04);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 40; i++) { g.globalAlpha = rnd() * 0.5; g.beginPath(); g.arc((rnd() - 0.5) * ss, (rnd() - 0.5) * ss, 1 + rnd() * 3, 0, 7); g.fill(); }
      g.restore();
      // 四周渐暗（包浆）
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(80,45,15,0)'); vg.addColorStop(1, 'rgba(80,45,15,.22)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    });
  }
  const lacquerTex = canvasTex(512, 282, (g, w, h) => {
    const k = h / 0.55;
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#8e2618'); grd.addColorStop(0.3, '#711d11'); grd.addColorStop(1, '#3a0e08');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 40, 1); }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,200,160,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h * 0.4, 2 + rnd() * 30, 1); }
    g.fillStyle = '#c9a045'; g.fillRect(0, 0.006 * k, w, 0.014 * k); g.fillRect(0, 0.178 * k, w, 0.01 * k);
    fretBand(g, 0, 0.1 * k, w, 0.1 * k, 0.11 * k, '#c9a045', 'rgba(255,236,170,.55)');
  }, { repeat: true });
  const lacquerTop = new THREE.MeshStandardMaterial({ color: 0x5a160c, roughness: 0.4 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9a045, metalness: 0.45, roughness: 0.36 });
  const bronzeM = new THREE.MeshStandardMaterial({ color: 0x8a6a34, metalness: 0.55, roughness: 0.42 });
  const sideMat = len => { const t = lacquerTex.clone(); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(len, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.32, metalness: 0.04 }); };
  // 手机上棋盘面用最朴素的材质（不加清漆层、木纹法线和环境反光），稳妥第一
  const MOBILE = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
  const boardTops = [];
  function makeHalf(isRed) {
    const depth = BZ - HALF;
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2 * BX, 0.55, depth), [sideMat(depth), sideMat(depth), lacquerTop, lacquerTop, sideMat(2 * BX), sideMat(2 * BX)]);
    box.position.y = TOP - 0.275 - 0.02;   // 盒子顶面比棋盘面低 2 厘米：两个面贴得太近时，深度精度低的手机上会来回闪
    box.receiveShadow = true; box.castShadow = true;
    // 棋盘面：打磨过的缎面木器——底子偏哑，上面一层薄薄的清漆带柔和的反光（木纹起伏和环境反光在文件末尾 polishBoard 里补上）
    const topM = MOBILE ? new THREE.MeshStandardMaterial({ map: drawHalf(isRed), roughness: 0.6 }) : new THREE.MeshPhysicalMaterial({ map: drawHalf(isRed), roughness: 0.56, clearcoat: 0.42, clearcoatRoughness: 0.4 });
    boardTops.push(topM);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2 * BX, depth), topM);
    top.rotation.x = -Math.PI / 2; top.position.y = TOP;
    top.receiveShadow = true;
    g.add(box, top);
    g.position.z = isRed ? HALF + depth / 2 : -(HALF + depth / 2);
    // 墨色描边
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: INK.ink, transparent: true, opacity: 0.6 }));
    edges.position.copy(box.position);
    g.add(edges);
    // 描金边框
    const sg = isRed ? 1 : -1, zFar = sg * depth / 2, zRiv = -sg * depth / 2;
    const bar = (w, d, x, z, y = TOP + 0.004, h = 0.03) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), goldM); m.position.set(x, y, z); g.add(m); return m; };
    bar(0.05, depth, BX - 0.025, 0); bar(0.05, depth, -BX + 0.025, 0);
    // 横边只铺到两条竖边之间，四个角上不再两条金边叠在一起
    bar(2 * BX - 0.1, 0.05, 0, zFar - sg * 0.025); bar(2 * BX - 0.1, 0.05, 0, zRiv + sg * 0.025);
    // 铜包角
    for (const sx of [-1, 1]) {
      const cxp = sx * (BX - 0.2);
      // 铜条比金边宽一圈、高一截，把金边整个包在里面；角柱再比铜条大一圈。
      // 三层的外侧面、顶面都错开至少 1 厘米——之前它们和金边共面，两个面抢着显示，角上就一直闪
      for (const [w, d, x, z] of [[0.42, 0.085, cxp, zFar - sg * 0.0305], [0.085, 0.32, sx * (BX - 0.0305), zFar - sg * 0.25]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.036, d), bronzeM); m.position.set(x, TOP + 0.01, z); g.add(m);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), bronzeM); cap.position.set(sx * (BX - 0.04), TOP - 0.112, zFar - sg * 0.04); g.add(cap);
      for (const [x, z] of [[sx * (BX - 0.3), zFar - sg * 0.035], [sx * (BX - 0.035), zFar - sg * 0.3]]) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), goldM); r.position.set(x, TOP + 0.032, z); g.add(r); }
    }
    // 两侧各一架小木梯：观战的人从这里上棋盘（四级，从地面到棋盘面）
    for (const sx of [-1, 1]) {
      const zc = sg * 2.21 - sg * (HALF + depth / 2), N = 4, run = 0.17, W = 0.5, wood = 0x7a5634, dk = 0x553a22;
      for (let i = 0; i < N; i++) {
        const h = TOP * (N - i) / N;
        const st = inked(new THREE.BoxGeometry(run, h, W), toon(i % 2 ? wood : 0x86603a), 0.01);
        st.position.set(sx * (BX + run * (i + 0.5)), h / 2, zc); g.add(st);
      }
      for (const e of [-1, 1]) {
        const rail = inked(new THREE.BoxGeometry(run * N + 0.04, 0.03, 0.03), toon(dk), 0.008);
        rail.position.set(sx * (BX + run * N / 2), TOP * 0.5 + 0.2, zc + e * (W / 2)); rail.rotation.z = -sx * Math.atan2(TOP, run * N); g.add(rail);
        for (const k of [0.04, run * N - 0.02]) { const hh = 0.2 + TOP * (1 - k / (run * N)); const post = inked(new THREE.BoxGeometry(0.035, hh + 0.02, 0.035), toon(k < 0.1 ? 0x8e2a1a : dk), 0.008); post.position.set(sx * (BX + k), hh / 2, zc + e * (W / 2)); g.add(post); }
      }
    }
    // 须弥座：两级台基（河一侧不设）
    const step1 = inked(new THREE.BoxGeometry(2 * BX + 0.36, 0.085, depth + 0.18), toon(0x3a2418));
    step1.position.set(0, 0.0425, sg * 0.09); g.add(step1);
    const step2 = inked(new THREE.BoxGeometry(2 * BX + 0.72, 0.04, depth + 0.36), toon(0x958d7f));
    step2.position.set(0, 0.02, sg * 0.18); g.add(step2);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(2 * BX + 0.37, 0.012, depth + 0.19), goldM); gl.position.set(0, 0.08, sg * 0.09); g.add(gl);
    return g;
  }
  root.add(makeHalf(true), makeHalf(false));

  // ---------- 楚河汉界：流动的河水 ----------
  const riverText = canvasTex(2048, 104, (g, w, h) => {
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h);
    g.font = `900 92px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    // 红方视角：左"楚河"右"漢界"
    g.save(); g.translate(w * 0.27, h / 2); g.fillText('楚　　河', 0, 5); g.restore();
    g.save(); g.translate(w * 0.73, h / 2); g.fillText('漢　　界', 0, 5); g.restore();
  }, { color: false });
  const waterMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uText: { value: riverText },
      uDeep: { value: new THREE.Color(0x3c4a4c) }, uLight: { value: new THREE.Color(0xb9c2b4) }, uInk: { value: new THREE.Color(0x141312) },
      uBoard: { value: new THREE.Vector4(BX, HALF, 0, 0) }, uRiver: { value: new THREE.Vector4(0, 0.8, 1, 0) },
      uWakes: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
    }]),
    fog: true, transparent: false,
    vertexShader: `
      uniform float uTime; varying vec3 vW; varying float vH;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position;
        float h = sin(p.x*2.1 - mod(uTime*2.4, 6.2831853))*0.012 + sin(p.x*3.7 + p.y*5.0 - mod(uTime*3.1, 6.2831853))*0.008;
        p.z += h; vH = h;
        vec4 wp = modelMatrix * vec4(p,1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform float uTime; uniform sampler2D uText; uniform vec3 uDeep, uLight, uInk; uniform vec4 uBoard; uniform vec4 uRiver; uniform vec4 uWakes[4];
      varying vec3 vW; varying float vH;
      #include <fog_pars_fragment>
      // 不用 sin 的哈希：手机显卡对大数取 sin 精度很差，时间一长河面会糊成一片白
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec2 q = vec2(vW.x, vW.z);
        vec2 flow = vec2(q.x*0.9 - uTime*0.55, q.y*2.2);
        float n = fbm(flow + fbm(flow*0.7 + uTime*0.12)*1.2);
        // 流线（顺水方向的细纹）
        float streak = smoothstep(0.62, 0.78, fbm(vec2(q.x*0.35 - uTime*0.8, q.y*9.0)));
        float bankDist = (uRiver.z > 0.5 && abs(q.x) < uBoard.x) ? (uBoard.y - abs(q.y)) : (uRiver.y - abs(q.y - uRiver.x));
        float foam = smoothstep(0.14, 0.0, bankDist) * (0.6 + 0.4*noise(q*14.0 - vec2(uTime*3.0,0.0)));
        vec3 col = mix(uDeep, uLight, n*0.85 + vH*6.0);
        col = mix(col, uLight*1.05, streak*0.45);
        // 船行波纹
        for(int i=0;i<4;i++){
          vec4 w = uWakes[i];
          if(w.w > 0.0){
            float d = length(q - w.xy);
            float ring = sin(d*26.0 - mod(uTime*9.0, 6.2831853)) * exp(-d*2.2) * w.w;
            col += vec3(ring*0.22);
          }
        }
        col = mix(col, vec3(0.93,0.9,0.82), foam*0.7);
        // 楚河汉界 字（随水波轻微扭动）
        if(uRiver.z > 0.5 && abs(q.x) < uBoard.x && abs(q.y) < uBoard.y){
          vec2 tuv = vec2((q.x + uBoard.x)/(2.0*uBoard.x), 0.5 - q.y/(2.0*uBoard.y));
          if (uBoard.z > 0.5) tuv = 1.0 - tuv;
          tuv += vec2(noise(q*6.0+uTime*0.8)-0.5, noise(q*6.0-uTime*0.7)-0.5)*0.012;
          float t = texture2D(uText, tuv).a;
          float hl = 0.0;
          for (int k = 0; k < 8; k++) { float an = float(k) * 0.785; hl = max(hl, texture2D(uText, tuv + vec2(cos(an) * 0.0045, sin(an) * 0.075)).a); }
          col = mix(col, vec3(0.9, 0.87, 0.8), hl * 0.62);
          col = mix(col, uInk, t);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 1.8, 480, 10), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = 0.02;
  scene.add(water);
  // 时间每小时回绕一次，避免数值越来越大导致精度下降
  Core.onFrame(dt => { const u = waterMat.uniforms.uTime; u.value = (u.value + dt) % 3600; });
  // 结算场景用的河（无字、自定义河岸）
  function makeRiver(len, width, centerZ, deep, light) {
    const m = waterMat.clone();
    m.uniforms.uRiver.value.set(centerZ, width / 2, 0, 0);
    if (deep) m.uniforms.uDeep.value.set(deep);
    if (light) m.uniforms.uLight.value.set(light);
    Core.onFrame(dt => { const u = m.uniforms.uTime; u.value = (u.value + dt) % 3600; });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(len, width, Math.round(len * 2), 12), m);
    w.rotation.x = -Math.PI / 2;
    return w;
  }
  const wakes = waterMat.uniforms.uWakes.value;

  // ---------- 大地与山水 ----------
  const groundTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#e4d9c1'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(90,80,65,${0.03 + rnd() * 0.05})`;
      inkBlot(g, rnd() * w, rnd() * h, 30 + rnd() * 120, 0.6, 0.6);
    }
  }, { repeat: true });
  groundTex.repeat.set(6, 3);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 });
  for (const s of [1, -1]) {
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 90), groundMat);
    gnd.rotation.x = -Math.PI / 2; gnd.position.set(0, 0.0, s * (0.8 + 45));
    gnd.receiveShadow = true;
    scene.add(gnd);
    // 河岸
    const bank = new THREE.Mesh(new THREE.BoxGeometry(200, 0.3, 0.4), toon(0x8d8474));
    bank.position.set(0, -0.08, s * 0.85); bank.rotation.x = s * 0.5;
    scene.add(bank);
  }

  // 河岸石栏（棋盘两侧）
  (() => {
    const parts = [], stone = 0xa8a193, dark = 0x847d70;
    const box = (w, h, d, c, x, y, z) => parts.push({ geo: new THREE.BoxGeometry(w, h, d), color: c, m: Core.M4(x, y, z) });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const z = sz * 0.9;
      box(0.16, 0.42, 0.16, dark, sx * 5.05, 0.21, z);
      parts.push({ geo: new THREE.SphereGeometry(0.085, 8, 6), color: stone, m: Core.M4(sx * 5.05, 0.47, z) });
      for (let x = 5.05; x < 11.0; x += 0.55) {
        if (x > 6.1 && x < 7.8) continue; // 观战木桥处断开
        const px = sx * (x + 0.55);
        box(0.075, 0.27, 0.075, stone, px, 0.135, z);
        box(0.1, 0.04, 0.1, dark, px, 0.29, z);
        box(0.55, 0.035, 0.045, stone, sx * (x + 0.275), 0.22, z);
        box(0.55, 0.03, 0.04, dark, sx * (x + 0.275), 0.07, z);
        box(0.02, 0.1, 0.03, dark, sx * (x + 0.275), 0.14, z);
      }
    }
    // 观战木桥：横跨楚河，左右各一座（观众默认站在桥上）
    const wood = 0x7a5634, dk = 0x553a22, red = 0x8e2a1a;
    for (const sx of [-1, 1]) {
      const cx = sx * BRIDGE_X, L = 1.2, W = 1.5;
      const arch = z => 0.16 + 0.1 * Math.cos(z / L * Math.PI / 2);
      for (let i = 0; i < 9; i++) {
        const z0 = -L + i * (2 * L / 9), z1 = z0 + 2 * L / 9, zm = (z0 + z1) / 2;
        const slope = Math.atan2(arch(z1) - arch(z0), z1 - z0);
        parts.push({ geo: new THREE.BoxGeometry(W, 0.05, 2 * L / 9 + 0.01), color: i % 2 ? wood : 0x86603a, m: Core.M4(cx, arch(zm), zm, -slope, 0, 0) });
        for (const e of [-1, 1]) {
          parts.push({ geo: new THREE.BoxGeometry(0.06, 0.26, 0.06), color: i === 0 || i === 8 ? red : dk, m: Core.M4(cx + e * (W / 2 - 0.03), arch(z0) + 0.13, z0) });
          parts.push({ geo: new THREE.BoxGeometry(0.05, 0.04, 2 * L / 9 + 0.02), color: dk, m: Core.M4(cx + e * (W / 2 - 0.03), arch(zm) + 0.25, zm, -slope, 0, 0) });
        }
      }
      for (const e of [-1, 1]) {
        parts.push({ geo: new THREE.BoxGeometry(0.08, 0.36, 0.08), color: red, m: Core.M4(cx + e * (W / 2 - 0.03), 0.2, L) });
        parts.push({ geo: new THREE.SphereGeometry(0.05, 8, 6), color: 0xc9a045, m: Core.M4(cx + e * (W / 2 - 0.03), 0.4, L) });
        parts.push({ geo: new THREE.SphereGeometry(0.05, 8, 6), color: 0xc9a045, m: Core.M4(cx + e * (W / 2 - 0.03), 0.31, -L) });
      }
      for (const z of [-0.45, 0.45]) parts.push({ geo: new THREE.BoxGeometry(W * 0.8, 0.32, 0.16), color: 0x7f786c, m: Core.M4(cx, 0.0, z) });
    }
    const rails = inked(Core.merge(parts), toon(0xffffff, { vertexColors: true }));
    scene.add(rails);
  })();

  function mountainTex(layer) {
    return canvasTex(1024, 512, (g, w, h) => {
      const peaks = [];
      let x = -50;
      while (x < w + 50) { peaks.push([x, h * (0.18 + rnd() * 0.45)]); x += 80 + rnd() * 160; }
      const shade = [70, 105, 140][layer];
      // 皴法：多层淡墨
      for (let k = 0; k < 6; k++) {
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, `rgba(${shade - 30},${shade - 30},${shade - 25},${0.55 - k * 0.06})`);
        grd.addColorStop(0.7, `rgba(${shade},${shade},${shade},${0.25 - k * 0.03})`);
        grd.addColorStop(1, 'rgba(230,220,200,0)');
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(0, h);
        for (let i = 0; i < peaks.length; i++) {
          const [px, py] = peaks[i];
          const pyk = py + k * 18 + (rnd() - 0.5) * 12;
          if (i === 0) g.lineTo(px, pyk);
          else { const [qx, qy] = peaks[i - 1]; g.quadraticCurveTo((px + qx) / 2 + (rnd() - 0.5) * 40, Math.min(py, qy) - 30 + k * 18, px, pyk); }
        }
        g.lineTo(w, h); g.closePath(); g.fill();
      }
      // 山脊墨线
      g.strokeStyle = `rgba(20,20,20,${0.35 - layer * 0.08})`; g.lineWidth = 3;
      g.beginPath();
      for (let i = 0; i < peaks.length; i++) { const [px, py] = peaks[i]; i ? g.lineTo(px, py + (rnd() - 0.5) * 6) : g.moveTo(px, py); }
      g.stroke();
      // 苔点
      g.fillStyle = 'rgba(25,25,25,.35)';
      for (let i = 0; i < 120; i++) { const p = peaks[Math.floor(rnd() * peaks.length)]; inkBlot(g, p[0] + (rnd() - 0.5) * 90, p[1] + rnd() * 60, 2 + rnd() * 3, 0.6); }
    });
  }
  const mtTex = [mountainTex(0), mountainTex(1), mountainTex(2)];
  const mtGroup = new THREE.Group();
  scene.add(mtGroup);
  for (let layer = 0; layer < 3; layer++) {
    const R = 38 + layer * 16, n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer * 0.35 + rnd() * 0.2;
      const wdt = 2 * Math.PI * R / n * 1.35, hgt = wdt * 0.45 * (0.8 + rnd() * 0.5);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, hgt), new THREE.MeshBasicMaterial({ map: mtTex[2 - layer], transparent: true, depthWrite: false, fog: true }));
      m.position.set(Math.sin(a) * R, hgt / 2 - 1.5, Math.cos(a) * R);
      m.lookAt(0, hgt / 2 - 1.5, 0);
      m.renderOrder = -10 - layer;
      mtGroup.add(m);
    }
  }
  // 朱砂落日
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshBasicMaterial({ color: 0xc0412c, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
  sunDisk.position.set(-30, 22, -88); sunDisk.lookAt(0, 0, 0); sunDisk.renderOrder = -20;
  scene.add(sunDisk);
  const sunDisk2 = sunDisk.clone(); sunDisk2.position.set(30, 20, 88); sunDisk2.lookAt(0, 0, 0); scene.add(sunDisk2);

  // 松树与礁石
  function pine(h = 3) {
    const g = new THREE.Group();
    const trunk = inked(new THREE.CylinderGeometry(0.08 * h / 3, 0.14 * h / 3, h, 6), toon(0x4a3c30));
    trunk.position.y = h / 2; trunk.rotation.z = (rnd() - 0.5) * 0.25;
    g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const r = (1.3 - i * 0.22) * h / 3;
      const c = inked(new THREE.ConeGeometry(r, 0.45 * h / 3, 7), toon(0x2e3430));
      c.position.set((rnd() - 0.5) * 0.3, h * (0.5 + i * 0.15), (rnd() - 0.5) * 0.3);
      c.scale.y = 0.6;
      g.add(c);
    }
    return g;
  }
  const deco = new THREE.Group(); scene.add(deco);
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const s = rnd() < 0.5 ? 1 : -1;
    let x, z;
    do { x = (rnd() - 0.5) * 90; z = s * (3 + rnd() * 34); } while (Math.abs(x) < 26 && Math.abs(z) < 24);
    spots.push([x, z]);
  }
  spots.forEach(([x, z], i) => {
    if (i % 3 === 0) {
      const rock = inked(new THREE.DodecahedronGeometry(0.5 + rnd() * 1.2, 0), toon(0x7d776c));
      rock.position.set(x, 0.1, z); rock.scale.y = 0.6; rock.rotation.y = rnd() * 6;
      deco.add(rock);
    } else {
      const p = pine(2.5 + rnd() * 3); p.position.set(x, 0, z); p.rotation.y = rnd() * 6; deco.add(p);
    }
  });
  // 薄雾
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.puff, color: 0xf4efe4, transparent: true, opacity: 0.45, depthWrite: false }));
    const a = rnd() * Math.PI * 2, R = 14 + rnd() * 26;
    s.position.set(Math.sin(a) * R, 1 + rnd() * 3, Math.cos(a) * R);
    s.scale.set(14 + rnd() * 10, 4 + rnd() * 3, 1);
    s.userData.v = 0.2 + rnd() * 0.3;
    deco.add(s);
    Core.onFrame(dt => {
      s.position.x += s.userData.v * dt; if (s.position.x > 40) s.position.x = -40;
      const cam = Core.camera.position, dB = cam.length(), d = s.position.distanceTo(cam);
      s.material.opacity = 0.45 * Math.max(0, Math.min(1, (d - (dB - 3)) / 6));
      s.visible = s.material.opacity > 0.01;
    });
  }

  // ---------- 棋子 ----------
  const pieceGeo = (() => {
    const pts = [];
    const R = 0.42, H = PH;
    pts.push(new THREE.Vector2(0, 0));
    pts.push(new THREE.Vector2(R - 0.03, 0));
    for (let i = 0; i <= 3; i++) { const a = -Math.PI / 2 + (i / 3) * Math.PI / 2; pts.push(new THREE.Vector2(R - 0.03 + Math.cos(a) * 0.03, 0.03 + Math.sin(a) * 0.03)); }
    for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI / 2; pts.push(new THREE.Vector2(R - 0.03 + Math.cos(a) * 0.03, H - 0.03 + Math.sin(a) * 0.03)); }
    pts.push(new THREE.Vector2(0, H));
    const g = new THREE.LatheGeometry(pts, Core.quality === 'high' ? 40 : 28);
    g.userData.keep = true;
    return g;
  })();
  const pieceWood = new THREE.MeshStandardMaterial({ map: Tex.wood, color: 0xf4dcbc, roughness: 0.45, metalness: 0.0 });
  // 木棋子字面（美术 M21：审批台 078 宋体 + 072 年轮）：画法在 face.js。每颗子的年轮都不一样，所以按棋子 id 缓存；同一 id 换了兵种（揭棋翻出来）就在原画布上重画
  const faceCache = {};
  function faceTex(s, t, id = 0) {
    const key = s + (id | 0), ch = XQ.NAMES[s][t], hit = faceCache[key];
    if (hit) {
      if (hit.ch !== ch) { const cv = hit.tex.image; Face.wood(cv.getContext('2d'), cv.width, s, ch, id); hit.ch = ch; hit.tex.needsUpdate = true; }
      return hit.tex;
    }
    const N = Core.quality === 'low' ? 384 : 512;
    return (faceCache[key] = { ch, tex: canvasTex(N, N, (g, w) => Face.wood(g, w, s, ch, id)) }).tex;
  }
  // 揭棋暗子：漆面背（汉为朱漆、楚为黑漆），金边祥云，中间极淡地印着所在位置的兵种
  const backCache = {};
  function backTex(s, pt) {
    const key = s + pt;
    if (backCache[key]) return backCache[key];
    const red = s === 'r';
    return (backCache[key] = canvasTex(512, 512, (g, w) => {
      g.clearRect(0, 0, w, w);
      const c = w / 2;
      const gr = g.createRadialGradient(c * 0.78, c * 0.7, w * 0.04, c, c, w * 0.48);
      if (red) { gr.addColorStop(0, '#8a2b1e'); gr.addColorStop(0.55, '#601a11'); gr.addColorStop(1, '#3a0e09'); }
      else { gr.addColorStop(0, '#4a433d'); gr.addColorStop(0.55, '#2a2522'); gr.addColorStop(1, '#161312'); }
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, w * 0.468, 0, 7); g.fill();
      // 漆面刷痕
      g.save(); g.beginPath(); g.arc(c, c, w * 0.468, 0, 7); g.clip();
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(255,${red ? 210 : 235},${red ? 180 : 215},${0.012 + rnd() * 0.03})`; g.lineWidth = 1 + rnd() * 3;
        const r0 = w * (0.05 + rnd() * 0.42), a0 = rnd() * 6.28;
        g.beginPath(); g.arc(c, c, r0, a0, a0 + 0.4 + rnd() * 1.6); g.stroke();
      }
      // 左上高光
      const hl = g.createRadialGradient(c * 0.62, c * 0.55, 4, c * 0.62, c * 0.55, w * 0.32);
      hl.addColorStop(0, 'rgba(255,240,220,.16)'); hl.addColorStop(1, 'rgba(255,240,220,0)');
      g.fillStyle = hl; g.fillRect(0, 0, w, w);
      g.restore();
      const gold = 'rgba(201,160,69,', ring = (r, lw, a) => { g.strokeStyle = gold + a + ')'; g.lineWidth = lw; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); };
      ring(w * 0.452, 10, 0.95); ring(w * 0.428, 2.5, 0.55); ring(w * 0.35, 2, 0.32);
      // 四角如意云纹
      g.strokeStyle = gold + '0.42)'; g.lineWidth = 5; g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * Math.PI / 2, x = c + Math.cos(a) * w * 0.39, y = c + Math.sin(a) * w * 0.39, sz = w * 0.04;
        g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
        g.beginPath();
        for (let t = 0; t <= 3 * Math.PI; t += 0.15) { const r = sz * (1 - t / (3 * Math.PI) * 0.8); const px = -sz * 0.9 + Math.cos(t) * r, py = Math.sin(t) * r; t ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke(); g.beginPath();
        for (let t = 0; t <= 3 * Math.PI; t += 0.15) { const r = sz * (1 - t / (3 * Math.PI) * 0.8); const px = sz * 0.9 - Math.cos(t) * r, py = Math.sin(t) * r; t ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
        g.restore();
      }
      // 位置兵种：非常淡
      g.fillStyle = red ? 'rgba(236,206,140,.075)' : 'rgba(236,206,140,.065)'; g.fill(Face.path(XQ.NAMES[s][pt], w * 0.81, c, c));   // 和字面同一套宋体，小一圈
    }));
  }
  const faceGeo = new THREE.CircleGeometry(0.4, 40); faceGeo.rotateX(-Math.PI / 2); faceGeo.userData.keep = true;
  const bandGeo = new THREE.CylinderGeometry(0.4222, 0.4222, 0.026, Core.quality === 'high' ? 40 : 28, 1, true); bandGeo.userData.keep = true;
  function makePiece(p) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(pieceGeo, pieceWood);
    body.castShadow = true; body.receiveShadow = true;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: p.h ? backTex(p.s, p.pt) : faceTex(p.s, p.t, p.id), transparent: true, roughness: p.h ? 0.32 : 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.position.y = PH + 0.001;
    const band = new THREE.Mesh(bandGeo, goldM); band.position.y = PH * 0.6;
    g.add(body, face, band);
    g.userData = { id: p.id, s: p.s, t: p.h ? 'h' : p.t, h: !!p.h };
    // 面向本方：黑方棋子旋转180°
    g.rotation.y = p.s === 'b' ? Math.PI : 0;
    return g;
  }

  // 翻面：p 为暗子时扣上（显示漆背），否则显示字面
  function setFace(m, p) {
    const face = m.children[1]; if (!face) return;
    const std = m.userData.faceStd || face.material;
    std.map = p.h ? backTex(p.s, p.pt) : faceTex(p.s, p.t, p.id);
    std.roughness = p.h ? 0.32 : 0.5;
    std.needsUpdate = true;
    m.userData.t = p.h ? 'h' : p.t; m.userData.h = !!p.h;
    if (pieceSkin && lastGame && !lastGame.bf) skinFace(m, p, pieceSkin);
  }
  // 常规 / 揭棋的棋子款式：0 木、2 乌银、3 錾金、4 白玉（和兵法升级用的是同一套材质）
  let pieceSkin = 0;
  function setSkin(v) { pieceSkin = [2, 3, 4].includes(+v) ? +v : 0; }
  function dress(m, p) {
    if (m.userData.deco) { m.remove(m.userData.deco); m.userData.deco = null; }
    if (!pieceSkin) { m.userData.skinned = false; m.userData.mat = 1; return; }
    const d = new THREE.Group(); m.add(d); m.userData.deco = d;
    applySkin(m, d, pieceSkin, p);
  }

  const pieces = new Map(); // id -> mesh
  const piecesRoot = new THREE.Group(); root.add(piecesRoot);
  function setPosition(game) {
    lastGame = game;
    for (const m of pieces.values()) piecesRoot.remove(m);
    pieces.clear();
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = game.board[r][f];
      if (!p) continue;
      const m = makePiece(p);
      m.position.copy(pos(f, r));
      piecesRoot.add(m);
      pieces.set(p.id, m);
    }
    if (game.bf) decorateAll(game);
    else if (pieceSkin) for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = game.board[r][f], m = p && pieces.get(p.id); if (m) dress(m, p); }
  }

  // 只改有变化的子（调试摆子用）：没动的棋子原样留着，不整盘重建，也就不会闪
  function syncPosition(game) {
    lastGame = game;
    const keep = new Set();
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = game.board[r][f]; if (!p) continue;
      keep.add(p.id);
      let m = pieces.get(p.id);
      if (m && (m.userData.s !== p.s || m.userData.t !== p.t || !m.parent)) { piecesRoot.remove(m); pieces.delete(p.id); m = null; }
      if (!m) { m = makePiece(p); piecesRoot.add(m); pieces.set(p.id, m); }
      m.position.copy(pos(f, r)); m.visible = true; m.scale.setScalar(1); m.rotation.x = 0; m.rotation.z = 0;
    }
    for (const [id, m] of [...pieces]) if (!keep.has(id)) { piecesRoot.remove(m); pieces.delete(id); }
    if (game.bf) decorateAll(game);
  }
  // ---------- 兵法：甲片（一片 = 1 点生命）、金星（每升一级一颗）、拒马木桩、鸿门宴、涣散 ----------
  const plateGeo = new THREE.BoxGeometry(0.082, 0.052, 0.012); plateGeo.userData.keep = true;
  // 甲片：乌铁鳞甲（在木、银、金、玉各种棋身上都看得清）
  const plateOn = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.6, roughness: 0.3, emissive: 0x07090c });
  const plateFrameGeo = new THREE.BoxGeometry(0.1, 0.07, 0.01); plateFrameGeo.userData.keep = true;
  const rivetGeo = new THREE.SphereGeometry(0.009, 8, 6); rivetGeo.userData.keep = true;
  const plateFrame = new THREE.MeshStandardMaterial({ color: 0xd8a945, metalness: 0.8, roughness: 0.3, emissive: 0x2a1a04 });
  const plateOff = new THREE.MeshStandardMaterial({ color: 0x3b3633, metalness: 0.1, roughness: 0.9 });
  // 记功牌（Ham 10-09：「甲片」去掉，一律叫「军功」（td-010）；审批台 td-007：汉方用金边朱心圆牌 + 朱红绶带，楚方仍是乌铁甲片）
  const medalGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.012, 24); medalGeo.rotateX(Math.PI / 2); medalGeo.userData.keep = true;
  const medalCoreGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.006, 20); medalCoreGeo.rotateX(Math.PI / 2); medalCoreGeo.userData.keep = true;
  const medalRibGeo = new THREE.BoxGeometry(0.03, 0.026, 0.006); medalRibGeo.userData.keep = true;
  const medalRed = new THREE.MeshStandardMaterial({ color: 0xc8321e, metalness: 0.2, roughness: 0.45, emissive: 0x2a0602 });
  const starGeo = (() => {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.026 : 0.06; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.userData.keep = true; return g;
  })();
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, polygonOffset: true, polygonOffsetFactor: -4 });
  const starRim = new THREE.MeshBasicMaterial({ color: 0x5a3a10, polygonOffset: true, polygonOffsetFactor: -3 });
  const stakeGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.36, 5); stakeGeo.translate(0, 0.18, 0); stakeGeo.userData.keep = true;
  const stakeMat = toon(0x6e4a2c);
  const ropeGeo = new THREE.TorusGeometry(0.5, 0.012, 4, 32); ropeGeo.rotateX(Math.PI / 2); ropeGeo.userData.keep = true;
  const ropeMat = toon(0x8e2a1a);
  const sealTex = (ch, col) => canvasTex(128, 128, (g, w) => {
    g.fillStyle = col; rrect(g, 8, 8, w - 16, w - 16, 14); g.fill();
    g.strokeStyle = '#f7ead0'; g.lineWidth = 5; rrect(g, 18, 18, w - 36, w - 36, 8); g.stroke();
    g.font = `bold 72px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f7ead0'; g.fillText(ch, w / 2, w / 2 + 4);
  });
  let feastTex = null;
  // 头顶血条：细长胶囊，左端金色菱形饰；汉军朱红、楚军暗绿；亮格 = 剩余生命，暗格 = 已掉的血（朝向镜头）
  // 脚下血圈（美术 M17）：汉朱红、楚低饱和蓝；有血的段是凸起的珐琅，掉了的压平、半透明暗色。几何体、材质按键缓存（不随棋子释放）
  const HPC = { r: 0xb8382b, b: 0x4d6c8c };
  const hpSector = (R0, R1, a0, a1) => { const sh = new THREE.Shape(); sh.absarc(0, 0, R1, a0, a1, false); sh.absarc(0, 0, R0, a1, a0, true); sh.closePath(); return sh; };
  const ringCache = new Map();
  const ringGet = (k, mk) => { let v = ringCache.get(k); if (!v) { v = mk(); if (v.isBufferGeometry) v.userData.keep = true; ringCache.set(k, v); } return v; };
  function footRing(hp, max, s, W = 0.045, D = 0.013, GAP = 0.3) {
    const g = new THREE.Group(), R0 = 0.452, R1 = R0 + W, span = (Math.PI * 2 - GAP * max) / max;
    const baseGeo = ringGet('bg', () => { const q = new THREE.RingGeometry(R0 - 0.006, R1 + 0.006, 72); q.rotateX(-Math.PI / 2); return q; });
    const dim = ringGet('mOff', () => new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false }));
    const base = new THREE.Mesh(baseGeo, dim); base.position.y = 0.003; g.add(base);
    for (let i = 0; i < max; i++) {
      const a0 = Math.PI / 2 + GAP / 2 + i * (span + GAP), on = i < hp, bs = Math.min(0.008, W * 0.12);
      const geo = ringGet(`g${max}_${i}_${on ? 1 : 0}`, () => { const q = new THREE.ExtrudeGeometry(hpSector(R0 + bs, R1 - bs, a0, a0 + span), { depth: on ? D : 0.004, bevelEnabled: true, bevelThickness: on ? D * 0.4 : 0.002, bevelSize: bs, bevelSegments: 3, curveSegments: 32 }); q.rotateX(-Math.PI / 2); return q; });
      const mat = on ? ringGet('mOn' + s, () => new THREE.MeshPhysicalMaterial({ color: HPC[s], emissive: HPC[s], emissiveIntensity: 0.18, roughness: 0.38, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.18 }))
        : ringGet('mLost', () => new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.9, transparent: true, opacity: 0.3, depthWrite: false }));
      const mm = new THREE.Mesh(geo, mat); mm.position.y = 0.004; mm.castShadow = on; g.add(mm);
    }
    return g;
  }
  const hpTexCache = new Map();
  const HP_COL = { r: ['#ff8a66', '#e2462c', '#9c1f12'], b: ['#7fc79a', '#3f8a5e', '#1b4a31'] };
  function hpTex(hp, max, side) {
    const key = side + hp + '/' + max;
    if (hpTexCache.has(key)) return hpTexCache.get(key);
    const S = 2, seg = 44 * S, gap = 5 * S, cap = 22 * S, pad = 6 * S, H = 26 * S;
    const W = cap + pad + max * seg + (max - 1) * gap + pad;
    const t = canvasTex(W, H, (g) => {
      g.clearRect(0, 0, W, H);
      const y0 = 5 * S, h0 = H - 10 * S, x0 = cap * 0.55;
      // 底槽
      const bg = g.createLinearGradient(0, y0, 0, y0 + h0); bg.addColorStop(0, 'rgba(14,11,9,.82)'); bg.addColorStop(1, 'rgba(36,28,22,.82)');
      g.fillStyle = bg; rrect(g, x0, y0, W - x0 - 2 * S, h0, h0 / 2); g.fill();
      g.strokeStyle = 'rgba(232,200,128,.9)'; g.lineWidth = 1.6 * S; rrect(g, x0, y0, W - x0 - 2 * S, h0, h0 / 2); g.stroke();
      // 血格
      const [hi, mid, lo] = HP_COL[side] || HP_COL.r, sy = y0 + 3.2 * S, sh = h0 - 6.4 * S;
      for (let i = 0; i < max; i++) {
        const x = cap + pad + i * (seg + gap), last = i === max - 1, r = last ? sh / 2 : 2.5 * S;
        g.save(); g.beginPath();
        if (last) { g.moveTo(x, sy); g.lineTo(x + seg - sh / 2, sy); g.arc(x + seg - sh / 2, sy + sh / 2, sh / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(x, sy + sh); g.closePath(); }
        else rrect(g, x, sy, seg, sh, r);
        if (i < hp) {
          const gr = g.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, hi); gr.addColorStop(0.45, mid); gr.addColorStop(1, lo);
          g.fillStyle = gr; g.fill();
          g.clip(); g.fillStyle = 'rgba(255,255,255,.38)'; g.fillRect(x, sy + 1.2 * S, seg, 2.2 * S);
        } else { g.fillStyle = 'rgba(255,240,210,.09)'; g.fill(); g.strokeStyle = 'rgba(255,240,210,.18)'; g.lineWidth = 1 * S; g.stroke(); }
        g.restore();
      }
      // 左端金菱
      const cx = cap * 0.55, cy = H / 2, rr = 9 * S;
      const gd = g.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr); gd.addColorStop(0, '#fff1c4'); gd.addColorStop(0.5, '#e0b04e'); gd.addColorStop(1, '#8a5f18');
      g.beginPath(); g.moveTo(cx, cy - rr); g.lineTo(cx + rr * 0.8, cy); g.lineTo(cx, cy + rr); g.lineTo(cx - rr * 0.8, cy); g.closePath();
      g.fillStyle = gd; g.fill(); g.strokeStyle = 'rgba(40,24,8,.9)'; g.lineWidth = 1.2 * S; g.stroke();
      g.beginPath(); g.arc(cx, cy, 2.6 * S, 0, 7); g.fillStyle = HP_COL[side] ? HP_COL[side][1] : '#c33'; g.fill();
    });
    t.userData = { w: W / S, h: H / S }; hpTexCache.set(key, t);
    return t;
  }
  // ---------- 棋身按等级换装：一级木 · 二级「乌银错花」· 三级「錾金」· 四级「羊脂白玉 · 金丝嵌」 ----------
  // 金属与玉要有真实反光：先做一张 HDR 影棚环境光（四面对称，换边、转视角都一样好看）
  //   天顶大柔光箱；四盏斜上方柔光箱（顶面映出大片渐变高光）；一圈竖条灯（侧壁上的竖向高光）；暗暖底（金属有深浅对比）
  let envTex = null, skins = null, lastGame = null;
  const LOWQ = () => Core.quality === 'low';
  // 质感参数（Board.skinTune(补丁) 可以现场改了重建）：
  //   boxAz / boxEl / boxI / zen = 斜上方柔光箱的方位半宽、仰角范围、亮度，天顶灯亮度（决定金属顶面那块高光有多大、多亮）
  //   domeM = 金属顶面的弧度（略微隆起，高光才是一块有形状的光斑，而不是整面发白）
  //   jade = 玉面纹理：gu 谷纹 / pu 蒲纹 / yun 云纹 / su 素面
  const SK = { boxAz: [5.5, 8.5], boxEl: [33, 39, 51, 56], boxI: [0.9, 2.3], zen: 2.0, domeM: 0.5, anisoTop: 0.16, envS: 0.9, envG: 0.82, jade: 'yun' };   // 顶面高光占比：银约 35%、金约 25%；白玉用云纹
  try { const o = JSON.parse(localStorage.getItem('xq3d-sk') || 'null'); if (o) Object.assign(SK, o); } catch (e) { }
  function studioEnv() {
    const W = 512, H = 256, lin = new Float32Array(W * H * 3);
    const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let j = 0; j < H; j++) {
      const de = ((j + 0.5) / H - 0.5) * 180; // 仰角（度）；j = 0 是正下方（与 three 的 equirect 取样一致）
      for (let x = 0; x < W; x++) {
        const ph = ((x + 0.5) / W - 0.5) * 360; // 方位（度）：红方视角顶面映 -90°，黑方 +90°
        let r, g, b;
        if (de >= 0) { const k = de / 90; r = 0.13 + 0.12 * k; g = 0.12 + 0.11 * k; b = 0.11 + 0.1 * k; }
        else { const k = Math.min(1, -de / 45); r = 0.19 - 0.15 * k; g = 0.145 - 0.115 * k; b = 0.1 - 0.078 * k; }
        const z = sm(66, 74, de) * SK.zen / 3; r += 3.0 * z; g += 2.95 * z; b += 2.8 * z;
        // 斜上方四盏柔光箱（每 90° 一盏），上亮下暗
        const pm = ((ph % 90) + 90) % 90, dAz = Math.min(pm, 90 - pm);
        const box = (1 - sm(SK.boxAz[0], SK.boxAz[1], dAz)) * sm(SK.boxEl[0], SK.boxEl[1], de) * (1 - sm(SK.boxEl[2], SK.boxEl[3], de));
        if (box > 0) { const k = box * (SK.boxI[0] + SK.boxI[1] * sm(SK.boxEl[0], SK.boxEl[3], de)); r += k; g += k * 0.975; b += k * 0.93; }
        // 侧壁竖条灯（方位 45° + 90°·n），冷暖相间
        const qm = (((ph - 45) % 90) + 90) % 90, dq = Math.min(qm, 90 - qm);
        const strip = (1 - sm(3.5, 7, dq)) * sm(-80, -72, de) * (1 - sm(-14, -7, de));
        if (strip > 0) { const warm = ((Math.round((ph - 45) / 90) % 2) + 2) % 2 === 0, k = strip * 5.2; r += k * (warm ? 1 : 0.84); g += k * 0.93; b += k * (warm ? 0.8 : 1); }
        const i = (j * W + x) * 3; lin[i] = r; lin[i + 1] = g; lin[i + 2] = b;
      }
    }
    const pmrem = tex => { const pm = new THREE.PMREMGenerator(Core.renderer); const t = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose(); return t; };
    try {
      const toH = THREE.DataUtils.toHalfFloat, data = new Uint16Array(W * H * 4);
      for (let i = 0; i < W * H; i++) { data[i * 4] = toH(lin[i * 3]); data[i * 4 + 1] = toH(lin[i * 3 + 1]); data[i * 4 + 2] = toH(lin[i * 3 + 2]); data[i * 4 + 3] = toH(1); }
      const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
      tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
      return pmrem(tex);
    } catch (e) {
      // 设备不支持半浮点贴图：退回普通贴图（高光弱一些）
      try {
        const c = mkCanvas(W, H, g => {
          const im = g.createImageData(W, H), d = im.data;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((H - 1 - y) * W + x) * 3, o = (y * W + x) * 4; for (let k = 0; k < 3; k++) { const v = lin[s + k]; d[o + k] = 255 * Math.min(1, Math.pow(Math.min(1, v / (1 + v) * 1.6), 1 / 2.2)); } d[o + 3] = 255; }
          g.putImageData(im, 0, 0);
        });
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.mapping = THREE.EquirectangularReflectionMapping;
        return pmrem(tex);
      } catch (e2) { console.warn('studioEnv', e2); return null; }
    }
  }
  // ---- 贴图工具：数据贴图（法线、粗糙度/金属度）不做颜色空间转换；环绕侧壁的纹样带横向平铺 ----
  function dataTex(c, wrap) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
    if (wrap) t.wrapS = THREE.RepeatWrapping;
    return t;
  }
  function sTex(c, wrap) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (wrap) t.wrapS = THREE.RepeatWrapping; return t; }
  const mkCanvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); return c; };
  // 高度图 → 法线贴图（横向环绕；k = 起伏强度）
  //   dome > 0：整面再叠一个微微隆起的弧面（中心平、越往边越斜）
  function normalFrom(hc, k, wrapX, dome = 0) {
    const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
    return mkCanvas(w, h, g => {
      const im = g.createImageData(w, h), d = im.data;
      // 左右上下邻居的下标先算好（原来每个像素调四次取样函数，大贴图开页面时要多花半秒多）
      const xl = new Int32Array(w), xr = new Int32Array(w), kk = k / 255;
      for (let x = 0; x < w; x++) { xl[x] = wrapX ? (x - 1 + w) % w : Math.max(0, x - 1); xr[x] = wrapX ? (x + 1) % w : Math.min(w - 1, x + 1); }
      for (let y = 0; y < h; y++) {
        const r0 = y * w, ru = Math.min(h - 1, y + 1) * w, rd = Math.max(0, y - 1) * w;
        for (let x = 0; x < w; x++) {
        let nx = -(src[(r0 + xr[x]) * 4] - src[(r0 + xl[x]) * 4]) * kk, ny = (src[(ru + x) * 4] - src[(rd + x) * 4]) * kk, nz = 1;
        if (dome) { nx += ((x + 0.5) / w * 2 - 1) * dome; ny -= ((y + 0.5) / h * 2 - 1) * dome; }
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz), i = (r0 + x) * 4;
        d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (nz / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
        }
      }
      g.putImageData(im, 0, 0);
    });
  }
  const blurred = (c, px) => mkCanvas(c.width, c.height, g => { g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); g.filter = 'none'; });
  // 旋压（车床）拉丝的各向异性方向：沿同心圆切向
  function spunAniso(n) {
    return mkCanvas(n, n, g => {
      const im = g.createImageData(n, n), d = im.data, c = n / 2;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const du = x + 0.5 - c, dv = -(y + 0.5 - c), l = Math.hypot(du, dv) || 1, i = (y * n + x) * 4, q = Math.min(1, Math.max(0, (l / c - 0.04) / 0.22));
        d[i] = (-dv / l * 0.5 + 0.5) * 255; d[i + 1] = (du / l * 0.5 + 0.5) * 255; d[i + 2] = 255 * (0.06 + 0.94 * q * q * (3 - 2 * q)); d[i + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    });
  }
  // ---- 侧壁纹样（u 绕一圈，v 自下而上；画布上方 = 棋身上方） ----
  const BW = 2048, BH = 128;
  // 回纹（乌银错花用）：路径画在 g 上
  function meanderPath(g, top, bot, n) {
    const cw = BW / n, hh = bot - top;
    for (let i = 0; i < n; i++) {
      const x = i * cw + cw * 0.08, s = cw * 0.84;
      g.beginPath();
      g.moveTo(x, bot); g.lineTo(x, top); g.lineTo(x + s, top); g.lineTo(x + s, bot - hh * 0.26); g.lineTo(x + s * 0.3, bot - hh * 0.26);
      g.lineTo(x + s * 0.3, top + hh * 0.3); g.lineTo(x + s * 0.68, top + hh * 0.3); g.lineTo(x + s * 0.68, top + hh * 0.55);
      g.stroke();
      g.beginPath(); g.moveTo(x, bot); g.lineTo(x + cw, bot); g.stroke();
    }
  }
  // 云雷纹 + 卷云（錾金用）：画成填充图形（高度图的凸起）
  function cloudThunder(g, cy, n, lw) {
    const cw = BW / n;
    g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const x = i * cw + cw / 2;
      if (i % 2) {
        let r = 25; g.beginPath(); g.moveTo(x - r, cy - r);
        for (let k = 0; k < 3; k++) { g.lineTo(x + r, cy - r); g.lineTo(x + r, cy + r); g.lineTo(x - r + 8, cy + r); g.lineTo(x - r + 8, cy - r + 8); r -= 8; }
        g.stroke();
      } else {
        for (const sgn of [-1, 1]) { g.beginPath(); for (let a = 0; a < Math.PI * 3.1; a += 0.1) { const rr = 3 + a * 4.4; g.lineTo(x + sgn * 13 + Math.cos(a * sgn) * rr * 0.92, cy + Math.sin(a) * rr * 0.78); } g.stroke(); }
      }
    }
  }
  // 卷草（金丝嵌玉用）：一条波状主蔓，上下交替卷须与叶
  function scrollPath(g, n, lw) {
    const cw = BW / n, cy = BH / 2, amp = BH * 0.16;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = lw; g.beginPath();
    for (let x = 0; x <= BW; x += 4) g.lineTo(x, cy + Math.sin(x / cw * Math.PI * 2) * amp);
    g.stroke();
    g.lineWidth = lw * 0.75;
    for (let i = 0; i < n * 2; i++) {
      const up = i % 2 === 0, x0 = (i + 0.5) * cw / 2, y0 = cy + Math.sin(x0 / cw * Math.PI * 2) * amp, s = up ? -1 : 1;
      // 卷须：从主蔓甩出、向内盘一圈半
      g.beginPath(); g.moveTo(x0, y0);
      const cx = x0 + cw * 0.17, ccy = y0 + s * BH * 0.2;
      for (let a = 0; a < Math.PI * 2.6; a += 0.12) { const rr = BH * 0.15 * (1 - a / (Math.PI * 3.1)); g.lineTo(cx + Math.cos(Math.PI + a) * rr, ccy + s * Math.sin(Math.PI + a) * rr * 0.92); }
      g.stroke();
      // 小叶
      const lx = x0 - cw * 0.1, ly = y0 + s * BH * 0.04;
      g.beginPath(); g.ellipse(lx, ly + s * BH * 0.1, BH * 0.05, BH * 0.11, s * 0.5, 0, 7); g.fill();
    }
  }
  function silverBand() {
    const col = sTex(mkCanvas(BW, BH, g => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, BW, BH);
      g.fillStyle = '#1b1c21'; g.strokeStyle = '#1b1c21';
      g.fillRect(0, 12, BW, 6); g.fillRect(0, BH - 18, BW, 6);
      g.lineWidth = 8; g.lineCap = 'square'; g.lineJoin = 'miter'; meanderPath(g, 34, BH - 34, 28);
    }), true);
    const orm = dataTex(mkCanvas(BW, BH, g => {
      g.fillStyle = 'rgb(255,32,255)'; g.fillRect(0, 0, BW, BH);
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,${20 + rnd() * 34},255,.5)`; g.fillRect(0, rnd() * BH, BW, 1); }
      g.fillStyle = g.strokeStyle = 'rgb(255,110,90)';
      g.fillRect(0, 12, BW, 6); g.fillRect(0, BH - 18, BW, 6);
      g.lineWidth = 8; g.lineCap = 'square'; g.lineJoin = 'miter'; meanderPath(g, 34, BH - 34, 28);
    }), true);
    const hc = mkCanvas(BW, BH, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, BW, BH); g.fillStyle = g.strokeStyle = '#8a8a8a'; g.fillRect(0, 12, BW, 6); g.fillRect(0, BH - 18, BW, 6); g.lineWidth = 8; g.lineCap = 'square'; meanderPath(g, 34, BH - 34, 28); });
    return { map: col, orm, normal: dataTex(normalFrom(blurred(hc, 1.2), 2.2, true), true) };
  }
  function goldBand() {
    // 鱼子地（细密圆点錾出的哑光底）上起凸云雷纹，纹样抛光、底子哑光
    const hc = mkCanvas(BW, BH, g => {
      g.fillStyle = '#4a4a4a'; g.fillRect(0, 0, BW, BH);
      for (let i = 0; i < 5200; i++) { const x = rnd() * BW, y = 20 + rnd() * (BH - 40); g.fillStyle = 'rgba(20,20,20,.9)'; g.beginPath(); g.arc(x, y, 2.1, 0, 7); g.fill(); g.fillStyle = 'rgba(120,120,120,.6)'; g.beginPath(); g.arc(x - 0.6, y - 0.6, 0.9, 0, 7); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, BW, 16); g.fillRect(0, BH - 16, BW, 16);
      g.fillStyle = '#4a4a4a'; g.fillRect(0, 16, BW, 3); g.fillRect(0, BH - 19, BW, 3);
      g.strokeStyle = '#ffffff'; cloudThunder(g, BH / 2, 22, 8);
    });
    const mask = mkCanvas(BW, BH, g => { g.fillStyle = '#000'; g.fillRect(0, 0, BW, BH); g.fillStyle = '#fff'; g.fillRect(0, 0, BW, 16); g.fillRect(0, BH - 16, BW, 16); g.strokeStyle = '#fff'; cloudThunder(g, BH / 2, 22, 8); });
    const mk = mask.getContext('2d').getImageData(0, 0, BW, BH).data;
    const col = sTex(mkCanvas(BW, BH, g => {
      const im = g.createImageData(BW, BH), d = im.data;
      for (let i = 0; i < BW * BH; i++) { const m = mk[i * 4] / 255, v = 255 * (0.74 + 0.26 * m); d[i * 4] = v; d[i * 4 + 1] = v * (0.96 + 0.04 * m); d[i * 4 + 2] = v * (0.9 + 0.1 * m); d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    }), true);
    const orm = dataTex(mkCanvas(BW, BH, g => {
      const im = g.createImageData(BW, BH), d = im.data;
      for (let i = 0; i < BW * BH; i++) { const m = mk[i * 4] / 255; d[i * 4] = 255; d[i * 4 + 1] = 255 * (0.52 - 0.4 * m); d[i * 4 + 2] = 255; d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    }), true);
    return { map: col, orm, normal: dataTex(normalFrom(blurred(hc, 1.4), 3.2, true), true) };
  }
  function jadeBand() {
    // 金丝嵌玉：上下两道金线 + 卷草；alpha 为金丝，其余透出玉身
    const draw = (g, c) => { g.fillStyle = g.strokeStyle = c; g.fillRect(0, 8, BW, 7); g.fillRect(0, BH - 15, BW, 7); scrollPath(g, 9, 9); };
    const alpha = dataTex(mkCanvas(BW, BH, g => { g.fillStyle = '#000'; g.fillRect(0, 0, BW, BH); draw(g, '#fff'); }), true);
    const hc = mkCanvas(BW, BH, g => { g.fillStyle = '#000'; g.fillRect(0, 0, BW, BH); draw(g, '#fff'); });
    return { alpha, normal: dataTex(normalFrom(blurred(hc, 2.2), 4.5, true), true) };
  }
  // ---- 顶面（叠在棋身顶盖与字之间） ----
  const TN = 512;
  function topSet(kind) {
    const c = TN / 2, R0 = c * 0.9, R1 = c * 0.985;
    const silver = kind === 'silver';
    // 高度：外圈錾刻（乌银：凹槽里嵌乌银；金：一圈联珠凸起）
    const hc = mkCanvas(TN, TN, g => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, TN, TN);
      for (let r = 3; r < R0 - 6; r += 1.7) { const v = 118 + rnd() * 20; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, R0 - 3, 0, 7); g.stroke();
      if (silver) { g.lineWidth = 5; g.strokeStyle = '#5a5a5a'; meanderRing(g, c, R0 + 2, R1 - 3, 40); }
      else for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r = (R0 + R1) / 2; const gr = g.createRadialGradient(c + Math.cos(a) * r - 1.5, c + Math.sin(a) * r - 1.5, 0, c + Math.cos(a) * r, c + Math.sin(a) * r, 6.5); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#808080'); g.fillStyle = gr; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 6.5, 0, 7); g.fill(); }
    });
    const map = sTex(mkCanvas(TN, TN, g => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, TN, TN);
      const vg = g.createRadialGradient(c * 0.85, c * 0.82, c * 0.2, c, c, c); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(0.75, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.18)');
      g.fillStyle = vg; g.fillRect(0, 0, TN, TN);
      if (silver) { g.strokeStyle = '#1b1c21'; g.lineWidth = 5; meanderRing(g, c, R0 + 2, R1 - 3, 40); g.lineWidth = 3; g.beginPath(); g.arc(c, c, R0 - 3, 0, 7); g.stroke(); }
      else { g.strokeStyle = 'rgba(120,80,20,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, R0 - 3, 0, 7); g.stroke(); }
    }));
    const orm = dataTex(mkCanvas(TN, TN, g => {
      g.fillStyle = silver ? 'rgb(255,40,255)' : 'rgb(255,36,255)'; g.fillRect(0, 0, TN, TN);
      for (let r = 3; r < R0; r += 2.3) { g.strokeStyle = `rgba(255,${24 + rnd() * 34},255,.7)`; g.lineWidth = 1.2; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
      if (silver) { g.strokeStyle = 'rgb(255,110,90)'; g.lineWidth = 5; meanderRing(g, c, R0 + 2, R1 - 3, 40); }
      else { g.fillStyle = 'rgb(255,120,255)'; g.beginPath(); g.arc(c, c, R1, 0, 7); g.arc(c, c, R0, 0, 7, true); g.fill(); for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r = (R0 + R1) / 2; g.fillStyle = 'rgb(255,22,255)'; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 6, 0, 7); g.fill(); } }
    }));
    const aniso = dataTex(spunAniso(256)); aniso.minFilter = aniso.magFilter = THREE.NearestFilter; aniso.generateMipmaps = false;
    return { map, orm, normal: dataTex(normalFrom(blurred(hc, 0.8), silver ? 1.6 : 3, false, (silver ? SK.domeS : SK.domeG) ?? SK.domeM)), aniso };
  }
  function meanderRing(g, c, r0, r1, n) {
    g.lineJoin = 'miter'; g.lineCap = 'square';
    const P = (a, r) => [c + Math.cos(a) * r, c + Math.sin(a) * r];
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 0.8) / n * Math.PI * 2, am = (a0 + a1) / 2, rm = (r0 + r1) / 2;
      g.beginPath(); g.moveTo(...P(a0, r0)); g.lineTo(...P(a0, r1)); g.lineTo(...P(a1, r1)); g.lineTo(...P(a1, rm)); g.lineTo(...P(am, rm)); g.stroke();
    }
  }
  // ---- 白玉 ----
  // 玉面浮雕（高度图：128 = 平，亮 = 凸，暗 = 凹）：汉代玉器上最典型的三种地纹，或素面
  //   gu 谷纹：密排的小乳丁，各带一道旋尾；pu 蒲纹：三组斜线交出的六角席纹；yun 云纹：外圈一带如意卷云，中间素面
  function jadeRelief(style) {
    if (style === 'su') return null;
    const c = TN / 2, RO = c * 0.9;
    return mkCanvas(TN, TN, g => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, TN, TN);
      const ringCut = r => { g.strokeStyle = '#2c2c2c'; g.lineWidth = 3.5; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); };
      g.save(); g.beginPath(); g.arc(c, c, RO - 8, 0, 7); g.clip();
      if (style === 'gu') {
        const sp = 37, rowH = sp * 0.866;
        for (let j = -8; j <= 8; j++) for (let i = -8; i <= 8; i++) {
          const x = c + (i + (j & 1 ? 0.5 : 0)) * sp, y = c + j * rowH;
          if (Math.hypot(x - c, y - c) > RO - 20) continue;
          // 谷粒：一颗凸起的乳丁，带一道越收越细的旋尾（凸），外侧一圈浅刻线衬出立体
          const a0 = 0.9 + ((i * 7 + j * 13) % 5) * 0.05;
          g.strokeStyle = '#3a3a3a'; g.lineWidth = 2.6; g.lineCap = 'round';
          g.beginPath(); g.arc(x, y, 14.5, a0 - 0.2, a0 + Math.PI * 1.25); g.stroke();
          for (let q = 0; q < 12; q++) { const t0 = a0 + q * 0.2, w = 6.5 - q * 0.42; g.strokeStyle = '#c4c4c4'; g.lineWidth = w; g.beginPath(); g.arc(x, y, 9.5, t0, t0 + 0.24); g.stroke(); }
          const gr = g.createRadialGradient(x - 1.5, y - 1.5, 0, x, y, 8.5); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.65, '#e2e2e2'); gr.addColorStop(1, '#9a9a9a');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, 8.5, 0, 7); g.fill();
        }
      } else if (style === 'pu') {
        g.strokeStyle = '#303030'; g.lineWidth = 5;
        for (const ang of [0, Math.PI / 3, -Math.PI / 3]) {
          g.save(); g.translate(c, c); g.rotate(ang);
          for (let y = -TN; y <= TN; y += 34) { g.beginPath(); g.moveTo(-TN, y); g.lineTo(TN, y); g.stroke(); }
          g.restore();
        }
      } else if (style === 'yun') {
        const r1 = c * 0.6, r2 = c * 0.86, rm = (r1 + r2) / 2, n = 8;
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), tx = -sa, ty = ca;
          const P = (lx, ly) => [c + ca * (rm + ly) + tx * lx, c + sa * (rm + ly) + ty * lx]; // 局部：沿切向 lx、沿径向（向外）ly
          // 如意云头：左右两个向内卷的涡，中间相接，下面拖一条小尾
          const path = () => {
            for (const sgn of [-1, 1]) {
              g.beginPath();
              for (let t = 0; t <= Math.PI * 2.5; t += 0.1) { const rr = 15 * (1 - t / (Math.PI * 3.4)); g.lineTo(...P(sgn * (16 - Math.cos(t) * rr), 5 + Math.sin(t) * rr)); }
              g.stroke();
            }
            g.beginPath(); g.moveTo(...P(0, 5)); g.quadraticCurveTo(...P(4, -8), ...P(-7, -17)); g.stroke();
          };
          g.strokeStyle = '#f2f2f2'; g.lineWidth = 12; path();
          g.strokeStyle = '#2a2a2a'; g.lineWidth = 4.5; path();
          // 两朵卷云之间的小珠
          const am = a + Math.PI / n; g.fillStyle = '#eeeeee'; g.beginPath(); g.arc(c + Math.cos(am) * rm, c + Math.sin(am) * rm, 6, 0, 7); g.fill();
        }
        g.restore(); g.save();
        ringCut(r1 - 9); ringCut(r2 + 9);
      }
      g.restore();
      ringCut(RO - 4); ringCut(RO - 12);
    });
  }
  // 玉色：比先前压暗一档的暖白（不发灰、不偏绿），中心略亮；顺着同一走向的几团“棉絮”；细密的毡状结构（每枚子走向不同）
  //   素面另加几缕流云状的青灰水线
  const JADE_TONE = [['#e2dccb', '#d6ceb9', '#c8bea4', '#b4a784'], ['#e4dfd0', '#d9d2be', '#cbc2a9', '#b7ab8a'], ['#dfd8c4', '#d3cab2', '#c4b99c', '#b0a27d']];
  function jadeTopSet(v, style) {
    const c = TN / 2, relief = jadeRelief(style), hc = relief && blurred(relief, 1.2);
    const col = mkCanvas(TN, TN, g => {
      const gr = g.createRadialGradient(c * (0.78 + 0.08 * v), c * 0.8, 10, c, c, c), W3 = JADE_TONE[v];
      gr.addColorStop(0, W3[0]); gr.addColorStop(0.5, W3[1]); gr.addColorStop(0.86, W3[2]); gr.addColorStop(1, W3[3]);
      g.fillStyle = gr; g.fillRect(0, 0, TN, TN);
      const ang = rnd() * Math.PI;
      for (let k = 0; k < 5; k++) {
        const cx = c + (rnd() - 0.5) * TN * 0.7, cy = c + (rnd() - 0.5) * TN * 0.7;
        for (let i = 0; i < 24; i++) { g.globalAlpha = 0.03 + rnd() * 0.07; g.fillStyle = '#fbf8ef'; g.beginPath(); g.ellipse(cx + (rnd() - 0.5) * 130, cy + (rnd() - 0.5) * 60, 10 + rnd() * 50, 3 + rnd() * 12, ang + (rnd() - 0.5) * 0.7, 0, 7); g.fill(); }
      }
      {
        // 天然玉理：几缕宽而淡的青灰 / 蜜黄流云带，两三道细白筋（素面明显些，有雕纹的只留一点）
        const K = style === 'su' ? 1 : 0.45;
        g.lineCap = 'round';
        for (let k = 0; k < 7; k++) {
          g.globalAlpha = (0.1 + rnd() * 0.1) * K; g.strokeStyle = k % 3 === 0 ? '#c2a160' : k % 3 === 1 ? '#8f9a82' : '#a39c84'; g.lineWidth = 8 + rnd() * 30;
          let x = -40, y = rnd() * TN; g.beginPath(); g.moveTo(x, y);
          for (let i = 0; i < 6; i++) { const nx = x + 90 + rnd() * 50, ny = y + (rnd() - 0.5) * 120; g.bezierCurveTo(x + 40, y + (rnd() - 0.5) * 80, nx - 40, ny + (rnd() - 0.5) * 80, nx, ny); x = nx; y = ny; }
          g.save(); g.translate(c, c); g.rotate(ang); g.translate(-c, -c); g.filter = 'blur(5px)'; g.stroke(); g.filter = 'none'; g.restore();
        }
        for (let k = 0; k < 4; k++) {
          g.globalAlpha = (0.3 + rnd() * 0.25) * K; g.strokeStyle = '#fffdf6'; g.lineWidth = 1 + rnd() * 1.6;
          let x = rnd() * TN, y = rnd() * TN; g.beginPath(); g.moveTo(x, y);
          for (let i = 0; i < 7; i++) { x += (rnd() - 0.5) * 110; y += (rnd() - 0.5) * 110; g.lineTo(x + (rnd() - 0.5) * 12, y + (rnd() - 0.5) * 12); }
          g.filter = 'blur(0.6px)'; g.stroke(); g.filter = 'none';
        }
      }
      for (let i = 0; i < 3000; i++) { g.globalAlpha = 0.025 + rnd() * 0.04; g.fillStyle = rnd() < 0.5 ? '#ffffff' : '#c9b78e'; g.fillRect(rnd() * TN, rnd() * TN, 1 + rnd() * 2, 1); }
      g.globalAlpha = 1;
      if (hc) {
        // 刻线里积色略深、略暖；凸起处磨得发亮
        const im = g.getImageData(0, 0, TN, TN), d = im.data, hd = hc.getContext('2d').getImageData(0, 0, TN, TN).data;
        for (let i = 0; i < TN * TN; i++) {
          const dh = (hd[i * 4] - 128) / 127, k = dh < 0 ? 1 + dh * 0.62 : 1 + dh * 0.1;
          d[i * 4] = Math.min(255, d[i * 4] * k); d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] * (dh < 0 ? k * (1 + dh * 0.08) : k)); d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] * (dh < 0 ? k * (1 + dh * 0.26) : k));
        }
        g.putImageData(im, 0, 0);
      }
    });
    const rough = hc && dataTex(mkCanvas(TN, TN, g => {
      const im = g.createImageData(TN, TN), d = im.data, hd = hc.getContext('2d').getImageData(0, 0, TN, TN).data;
      for (let i = 0; i < TN * TN; i++) { const dh = (hd[i * 4] - 128) / 127, r = 255 * (dh < 0 ? 1 - dh * 0.45 : 1 - dh * 0.3); d[i * 4] = 255; d[i * 4 + 1] = Math.min(255, r); d[i * 4 + 2] = 0; d[i * 4 + 3] = 255; }
      g.putImageData(im, 0, 0);
    }));
    // 法线：浮雕 + 玉面微微隆起（像抛光的弧面）
    const flat = mkCanvas(128, 128, g => { g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128); });
    const normal = dataTex(hc ? normalFrom(hc, style === 'pu' ? 4 : 5, false, 0.4) : normalFrom(flat, 0, false, 0.42));
    return { map: sTex(col), rough, normal };
  }
  function jadeBodyTex(v) {
    return sTex(mkCanvas(1024, 256, (g, w, h) => {
      // 车削体 UV：侧壁只占 v 0.5~0.6（画布 0.4h~0.5h 两行之间）
      g.fillStyle = '#d6cdb7'; g.fillRect(0, 0, w, h);
      const y0 = h * 0.39, y1 = h * 0.51;
      const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#d0c5aa'); gr.addColorStop(0.45, '#dfd8c6'); gr.addColorStop(1, '#c4b693');
      g.fillStyle = gr; g.fillRect(0, y0, w, y1 - y0);
      for (let i = 0; i < 90; i++) { g.globalAlpha = 0.04 + rnd() * 0.08; g.fillStyle = rnd() < 0.75 ? '#faf6ec' : '#cdb98a'; g.beginPath(); g.ellipse(rnd() * w, y0 + rnd() * (y1 - y0), 14 + rnd() * 70, 2 + rnd() * 6, (rnd() - 0.5) * 0.3, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }), true);
  }
  // 玉：次表面散射的近似——边缘透出暖光（光线在玉里走得远），正面柔和
  function jadeGlow(m, col, k0, k1) {
    m.onBeforeCompile = sh => {
      sh.uniforms.sssCol = { value: new THREE.Color(col) };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 sssCol;')
        .replace('#include <opaque_fragment>', `{ float nv = saturate(dot(normalize(normal), normalize(vViewPosition))); outgoingLight += sssCol * diffuseColor.rgb * (${k0.toFixed(3)} + ${k1.toFixed(3)} * pow(1.0 - nv, 2.2)); }\n#include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'jadeGlow' + k0 + k1;
    return m;
  }
  // 低画质：去掉清漆、各向异性等开销大的项
  function phys(o) {
    if (!LOWQ()) return new THREE.MeshPhysicalMaterial(o);
    const s = { ...o }; for (const k of ['clearcoat', 'clearcoatRoughness', 'sheen', 'sheenColor', 'sheenRoughness', 'anisotropy', 'anisotropyMap', 'anisotropyRotation', 'iridescence']) delete s[k];
    return new THREE.MeshStandardMaterial(s);
  }
  const SILVER = 0xe4e8ef, GOLDC = 0xffcb6e, GOLD_RIM = 0xffd27e;
  function levelSkins() {
    if (skins) return skins;
    envTex = studioEnv();
    const E = envTex ? { envMap: envTex } : {};
    const sb = silverBand(), gb = goldBand(), jb = jadeBand(), st = topSet('silver'), gt = topSet('gold');
    const MET = envTex ? 1 : 0.55;
    const metal = (color, rough, extra = {}) => phys({ color, metalness: MET, roughness: rough, envMapIntensity: 1, ...E, ...extra });
    const top = o => { const m = metal(o.color, 1, { map: o.t.map, roughnessMap: o.t.orm, metalnessMap: o.t.orm, normalMap: o.t.normal, normalScale: new THREE.Vector2(1, 1), anisotropy: SK.anisoTop, anisotropyMap: o.t.aniso, envMapIntensity: o.env, polygonOffset: true, polygonOffsetFactor: -1 }); return m; };
    const gold = metal(GOLD_RIM, 0.13);
    const jadeBody = v => jadeGlow(phys({ map: jadeBodyTex(v), color: 0xffffff, metalness: 0, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.16, sheen: 0.3, sheenColor: new THREE.Color(0xfff0d8), sheenRoughness: 0.5, emissive: 0x2a2012, emissiveIntensity: 0.25, envMapIntensity: 0.45, ...E }), 0xffcf8e, 0.04, 0.42);
    const jadeTop = v => { const t = jadeTopSet(v, SK.jade); return jadeGlow(phys({ map: t.map, normalMap: t.normal, ...(t.rough ? { roughnessMap: t.rough, roughness: 0.4 } : { roughness: 0.36 }), color: 0xffffff, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.18, sheen: 0.3, sheenColor: new THREE.Color(0xfff2de), emissive: 0x2a2012, emissiveIntensity: 0.22, envMapIntensity: 0.4, polygonOffset: true, polygonOffsetFactor: -1, ...E }), 0xffd49a, 0.03, 0.24); };
    skins = {
      2: {
        body: metal(SILVER, 0.13),
        top: top({ color: SILVER, t: st, env: SK.envS ?? 1 }),
        band: metal(SILVER, 1, { map: sb.map, roughnessMap: sb.orm, metalnessMap: sb.orm, normalMap: sb.normal, normalScale: new THREE.Vector2(0.5, 0.5) }),
        wire: 'silver',
      },
      3: {
        body: metal(GOLDC, 0.13),
        top: top({ color: GOLDC, t: gt, env: SK.envG ?? 1 }),
        band: metal(GOLDC, 1, { map: gb.map, roughnessMap: gb.orm, metalnessMap: gb.orm, normalMap: gb.normal, normalScale: new THREE.Vector2(0.9, 0.9) }),
        wire: 'gold',
      },
      4: {
        bodies: [0, 1, 2].map(jadeBody), tops: [0, 1, 2].map(jadeTop),
        band: metal(GOLD_RIM, 0.16, { alphaMap: jb.alpha, transparent: true, depthWrite: false, normalMap: jb.normal, normalScale: new THREE.Vector2(0.8, 0.8) }),
        gold, wire: 'gold',
      },
    };
    plateOn.envMap = envTex; plateOn.needsUpdate = true;
    return skins;
  }
  // ---- 升级后的字：掐丝珐琅（汉朱红、楚乌黑的釉面，金/银丝勾边，釉面有清漆般的光泽） ----
  const enamelCache = new Map();
  function enamelFace(s, t, wire) {
    const ch = XQ.NAMES[s][t], key = s + ch + wire;
    if (enamelCache.has(key)) return enamelCache.get(key);
    const N = LOWQ() ? 256 : 384, c = N / 2, lw = N * 0.028, gp = new Path2D(); gp.addPath(Face.path(ch, N));   // 字形和木棋子同一套宋体、同一大小同一位置（face.js，美术 M21）
    // 汉楚色圈（美术 M23，审批台 081 选甲）：字外一道细珐琅圈，和字同一套丝、同一种釉
    gp.moveTo(c + N * 0.394, c); gp.arc(c, c, N * 0.394, 0, Math.PI * 2); gp.moveTo(c + N * 0.374, c); gp.arc(c, c, N * 0.374, 0, Math.PI * 2, true);
    const shape = (g, strokeCol, fillCol) => {
      g.lineJoin = 'round';
      if (strokeCol) { g.strokeStyle = strokeCol; g.lineWidth = lw; g.stroke(gp); }
      if (fillCol) { g.fillStyle = fillCol; g.fill(gp); }
    };
    const map = sTex(mkCanvas(N, N, g => {
      g.clearRect(0, 0, N, N);
      // 嵌槽的阴影
      g.save(); g.translate(N * 0.006, N * 0.01); shape(g, 'rgba(30,18,8,.55)', 'rgba(30,18,8,.55)'); g.restore();
      shape(g, wire === 'silver' ? '#e9ebf0' : '#ffd987', null);
      // 釉面：上亮下深的渐变（像微微下凹的釉）
      const gr = g.createLinearGradient(0, c - N * 0.47, 0, c + N * 0.47);   // 范围放大到圈（M23）
      if (s === 'r') { gr.addColorStop(0, '#c42a17'); gr.addColorStop(0.5, '#951709'); gr.addColorStop(1, '#640c04'); }
      else { gr.addColorStop(0, '#2c2826'); gr.addColorStop(0.5, '#121010'); gr.addColorStop(1, '#060505'); }
      shape(g, null, gr);
    }));
    const orm = dataTex(mkCanvas(N, N, g => {
      g.fillStyle = 'rgb(255,80,0)'; g.fillRect(0, 0, N, N);
      // R = 环境光遮蔽（釉面只留三成环境反光，颜色才沉得住），G = 粗糙度，B = 金属度
      shape(g, 'rgb(255,40,255)', null); shape(g, null, 'rgb(80,64,0)');
    }));
    const r = { map, orm }; enamelCache.set(key, r);
    return r;
  }
  function skinFace(m, p, lv) {
    const face = m.children[1]; if (!face) return;
    if (!m.userData.faceStd) m.userData.faceStd = face.material;
    if (!p || lv < 2 || p.h) { if (face.material !== m.userData.faceStd) face.material = m.userData.faceStd; return; }
    const S = levelSkins()[Math.min(4, lv)], e = enamelFace(p.s, p.t, S.wire);
    let mat = m.userData.faceSkin;
    if (!mat) {
      mat = m.userData.faceSkin = phys({ transparent: true, metalness: 1, roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1, polygonOffset: true, polygonOffsetFactor: -2, ...(envTex ? { envMap: envTex } : {}) });
    }
    if (mat.map !== e.map) { mat.map = e.map; mat.roughnessMap = mat.metalnessMap = mat.aoMap = e.orm; mat.needsUpdate = true; }
    face.material = mat;
  }
  // 侧壁纹样圈、顶面贴片、金口沿
  const skinBandGeo = (() => { const g = new THREE.CylinderGeometry(0.4232, 0.4232, 0.118, 96, 1, true); g.translate(0, 0.1, 0); g.userData.keep = true; return g; })();
  const skinTopGeo = (() => { const g = new THREE.CircleGeometry(0.392, 72); g.rotateX(-Math.PI / 2); g.translate(0, PH + 0.0006, 0); g.userData.keep = true; return g; })();
  const rimGeo = (() => { const g = new THREE.TorusGeometry(0.405, 0.0165, 10, 96); g.rotateX(Math.PI / 2); g.userData.keep = true; return g; })();
  const topRingGeo = (() => { const g = new THREE.RingGeometry(0.372, 0.392, 96); g.rotateX(-Math.PI / 2); g.translate(0, PH + 0.0015, 0); g.userData.keep = true; return g; })();
  // 金、玉棋子偶尔在口沿闪过一点星芒
  const glintTex = canvasTex(128, 128, (g, w) => {
    const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c * 0.5); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,240,200,.6)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.fillStyle = '#fff';
    for (const [rx, ry] of [[c * 0.9, 3], [3, c * 0.9]]) { const lg = g.createRadialGradient(c, c, 0, c, c, Math.max(rx, ry)); lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.beginPath(); g.ellipse(c, c, rx, ry, 0, 0, 7); g.fill(); }
  });
  const glints = new Set();
  Core.onFrame(dt => {
    for (const sp of glints) {
      if (!sp.parent || !sp.parent.parent) { glints.delete(sp); continue; }
      const u = sp.userData; u.t += dt;
      if (u.t > u.next) { u.t = 0; u.next = 3 + Math.random() * 5; const a = Math.random() * Math.PI * 2; sp.position.set(Math.cos(a) * 0.39, PH + 0.01, Math.sin(a) * 0.39); }
      const k = u.t < 0.55 ? Math.sin(u.t / 0.55 * Math.PI) : 0;
      sp.material.opacity = k * 0.95; sp.scale.setScalar(0.04 + k * 0.16); sp.material.rotation = u.t * 1.5;
    }
  });
  function applySkin(m, d, lv, p) {
    const body = m.children[0], band = m.children[2];
    m.userData.mat = lv >= 2 && lv <= 4 ? lv : 1;   // 落子声按材质：1 木、2 银、3 金、4 玉
    m.userData.skinned = lv >= 2;
    if (lv < 2) { if (body) body.material = pieceWood; if (band) band.visible = true; skinFace(m, p, lv); return; }
    const S = levelSkins()[Math.min(4, lv)], vi = p && p.id != null ? Math.abs(p.id | 0) % 3 : 0; // 玉：每枚子的纹理、皮色各不相同
    if (body) body.material = S.bodies ? S.bodies[vi] : S.body;
    if (band) band.visible = false;
    const bm = new THREE.Mesh(skinBandGeo, S.band); if (lv >= 4) bm.renderOrder = 1; d.add(bm);
    d.add(new THREE.Mesh(skinTopGeo, S.tops ? S.tops[vi] : S.top));
    if (lv >= 4) {
      for (const y of [PH - 0.011, 0.028]) { const ri = new THREE.Mesh(rimGeo, S.gold); ri.position.y = y; d.add(ri); }
      d.add(new THREE.Mesh(topRingGeo, S.gold));
    }
    skinFace(m, p, lv);
    for (const c of d.children) if (!c.userData.plate && !c.userData.hpBar) c.userData.skin = true;
    if (lv >= 3 && !LOWQ()) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: lv >= 4 ? 0xfff6e0 : 0xffe6a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      sp.userData = { t: 0, next: 1 + Math.random() * 5, skin: true }; sp.renderOrder = 7; d.add(sp); glints.add(sp);
    }
  }
  // ---- 锁链（鸿门宴困住汉帅、四面楚歌困住楚军）：一圈环环相扣的铁环，平放在棋子脚下，缓缓转动 ----
  function mergeGeos(list) {
    const pos = [], nor = [], idx = []; let base = 0;
    for (const g of list) {
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); }
      const I = g.index; for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + base);
      base += P.count; g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx);
    return out;
  }
  let chainGeo = null;
  function chainRing() {
    if (chainGeo) return chainGeo;
    const N = 22, R = 0.585, list = [], M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, flat = i % 2 === 0;
      const g = new THREE.TorusGeometry(0.058, 0.0175, 6, 12); g.scale(1.5, 1, 1); // 椭圆环，长轴沿切线
      e.set(flat ? Math.PI / 2 : 0, -a - Math.PI / 2, 0, 'YXZ'); q.setFromEuler(e);
      M.compose(new THREE.Vector3(Math.cos(a) * R, flat ? 0.02 : 0.06, Math.sin(a) * R), q, new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(M); list.push(g);
    }
    chainGeo = mergeGeos(list); chainGeo.userData.keep = true;
    return chainGeo;
  }
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x565b63, metalness: 0.75, roughness: 0.4, emissive: 0x08090b });
  const chains = new Set(), chainBorn = new Map();
  // 召回的金光：两道细金环交错着转，金星绕着飞
  const auras = new Set();
  const auraGeo = (() => { const g = new THREE.TorusGeometry(0.56, 0.012, 6, 72); g.rotateX(Math.PI / 2); g.userData.keep = true; return g; })();
  Core.onFrame(() => {
    if (!auras.size) return;
    const t = performance.now() / 1000;
    for (const g of auras) {
      if (!g.parent || !g.parent.parent || !g.parent.parent.parent) { auras.delete(g); continue; }
      const ph = g.userData.ph;
      for (const c of g.children) {
        if (c.userData.halo) { c.material.opacity = 0.4 + 0.2 * Math.sin(t * 2.4 + ph); continue; }
        if (c.isSprite) { const a = t * 1.7 + ph + c.userData.k * 1.047, r = 0.6 + 0.05 * Math.sin(t * 3 + c.userData.k); c.position.set(Math.cos(a) * r, PH * 0.5 + 0.22 * Math.sin(t * 2.2 + c.userData.k * 2.1) + 0.12, Math.sin(a) * r); c.material.opacity = 0.55 + 0.4 * Math.sin(t * 5 + c.userData.k * 1.3); continue; }
        const i = c.userData.i, dir = i ? -1 : 1;
        c.rotation.set(0.5 * Math.sin(t * 1.3 * dir + ph + i * 1.6), t * 1.1 * dir, 0.5 * Math.cos(t * 1.3 * dir + ph + i * 1.6));
        c.material.opacity = 0.6 + 0.3 * Math.sin(t * 3.1 + i * 2);
      }
    }
  });
  Core.onFrame(() => {
    if (!chains.size) return;
    const t = performance.now() / 1000;
    for (const c of chains) {
      if (!c.parent || !c.parent.parent || !c.parent.parent.parent) { chains.delete(c); continue; }
      const u = c.userData, k = Math.min(1, (t - u.born) / 0.55), e = 1 - Math.pow(1 - k, 3);
      c.rotation.y = t * 0.32 * u.dir + u.ph;
      c.scale.setScalar(1.7 - 0.7 * e); c.position.y = 0.004 + (1 - e) * 0.5;
    }
  });
  function decorate(m, p, o = {}) {
    if (m.userData.deco) { m.remove(m.userData.deco); m.userData.deco = null; }
    const face = m.children[1];
    const body = m.children[0];
    if (!p || (!p.lv && !(p.t === 'k' && p.w))) { m.userData.skinned = false; m.userData.mat = 1; if (body) body.material = pieceWood; if (m.children[2]) m.children[2].visible = true; skinFace(m, p, 0); if (face && face.material) face.material.color.set(o.dim ? 0x8f8a84 : 0xffffff); return; }
    const d = new THREE.Group(); m.add(d); m.userData.deco = d;
    const kingF = p.t === 'k' && p.w, max = kingF ? BF.CFG.finalKingHp : BF.hpOf(p.t, p.lv);   // 决战里的帅将：3 点生命，也挂血条
    // 棋身：一级木、二级乌银错花、三级錾金、四级羊脂白玉金丝嵌；升级后的字换成掐丝珐琅
    applySkin(m, d, p.lv, p);
    if (face && face.material) face.material.color.set(o.dim ? 0x8f8a84 : 0xffffff);
    // 腰带上的牌 = 这枚子自己记的军功（击杀数，每点抵下次升级 1 功，攒满自动升级，升级时用掉）
    const nx = Math.min(8, p.xp || 0);
    for (let i = 0; i < nx; i++) {
      const a = (i - (nx - 1) / 2) * 0.26;
      let pl;
      if (p.s === 'r') {   // 汉：金边朱心圆牌，上面一截朱红绶带
        pl = new THREE.Mesh(medalGeo, plateFrame); pl.position.set(Math.sin(a) * 0.437, PH * 0.6, Math.cos(a) * 0.437); pl.rotation.y = a;
        const cr = new THREE.Mesh(medalCoreGeo, medalRed); cr.position.z = 0.006; pl.add(cr);
        const rb = new THREE.Mesh(medalRibGeo, medalRed); rb.position.set(0, 0.045, -0.002); pl.add(rb);
      } else {
        pl = new THREE.Mesh(plateGeo, plateOn);
        pl.position.set(Math.sin(a) * 0.4305, PH * 0.6, Math.cos(a) * 0.4305); pl.rotation.y = a;
        const fr = new THREE.Mesh(plateFrameGeo, plateFrame); fr.position.z = -0.003; pl.add(fr);
        const rv = new THREE.Mesh(rivetGeo, plateFrame); rv.position.z = 0.007; rv.scale.z = 0.5; pl.add(rv);
      }
      pl.userData.plate = i; d.add(pl);
    }
    if (p.lv >= 2 || kingF) {
      // 血条：棋子脚下贴着棋盘一圈立体血段，一点血一段（美术 M17，Ham 审批台 059 / 063 / 066 / 069）
      const ring = footRing(p.hp, max, p.s);
      ring.userData.hpBar = { hp: p.hp, max }; d.add(ring);
    }
    if (o.jm) {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, sk = new THREE.Mesh(stakeGeo, stakeMat);
        sk.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); sk.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
        d.add(sk);
      }
      const rope = new THREE.Mesh(ropeGeo, ropeMat); rope.position.y = 0.14; d.add(rope);
    }
    if (o.hm) {
      if (!feastTex) feastTex = sealTex('宴', '#8e2418');
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: feastTex, transparent: true, depthWrite: false }));
      sp.scale.set(0.42, 0.42, 1); sp.position.y = PH + 0.55; d.add(sp);
    }
    if (o.chain) {
      // 锁链第一次套上时从上方收紧落下（之后重新装扮不再重播）
      const t = performance.now() / 1000;
      if (!chainBorn.has(p.id)) chainBorn.set(p.id, t);
      const c = new THREE.Mesh(chainRing(), chainMat);
      c.userData = { born: chainBorn.get(p.id), ph: (p.id * 1.7) % 6.28, dir: p.id % 2 ? 1 : -1 };
      c.castShadow = !LOWQ(); d.add(c); chains.add(c);
    } else chainBorn.delete(p.id);
    if (o.gold) {
      // 刚被召回的子：身边绕两圈金光、几点金星，脚下一圈金晕（这一回合它还不能动）
      const g = new THREE.Group(); g.userData.ph = (p.id * 0.9) % 6.28;
      for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(auraGeo, new THREE.MeshBasicMaterial({ color: i ? 0xffe9a6 : 0xffc23a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        ring.userData.i = i; ring.position.y = PH * 0.55; g.add(ring);
      }
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd76a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        sp.scale.set(0.16, 0.16, 1); sp.userData.k = i; g.add(sp);
      }
      const halo = new THREE.Mesh(flatGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc640, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.set(1.9, 1, 1.9); halo.position.y = 0.006; halo.userData.halo = true; g.add(halo);
      d.add(g); auras.add(g);
    }
  }
  function decoOpts(game, p) {
    const fx = game.fx, hm = p.s === 'r' && p.t === 'k' && fx.hm > 0, sm = p.s === 'b' && p.t !== 'k' && fx.sm > 0;
    const bz = !!(game.frozen && game.frozen(p));   // 背水一战用过的子：下回合不能动，同样套上锁链
    return { jm: game.jmActive(p), hm, dim: sm || bz, chain: hm || sm || bz, gold: !!(game.revived && game.revived(p)) };
  }
  // 改质感参数后重建全部升级材质，并把棋盘上的子重新装扮一遍
  function skinTune(patch) {
    Object.assign(SK, patch || {});
    if (skins) {
      const seen = new Set();
      for (const k of Object.values(skins)) for (const m of [k.body, k.band, k.top, k.gold, ...(k.bodies || []), ...(k.tops || [])]) {
        if (!m || seen.has(m)) continue; seen.add(m);
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'anisotropyMap']) if (m[key] && !seen.has(m[key])) { seen.add(m[key]); m[key].dispose(); }
        m.dispose();
      }
      if (envTex) envTex.dispose();
      skins = null; envTex = null;
    }
    if (lastGame) setPosition(lastGame);
    return SK;
  }
  // 预先生成升级材质并编译着色器：第一次升级时不卡顿
  function prewarmSkins() {
    try {
      const S = levelSkins(), tmp = new THREE.Group();
      for (const lv of [2, 3, 4]) { const k = S[lv]; for (const mat of [k.body, k.band, k.top, k.gold, ...(k.bodies || []), ...(k.tops || [])]) if (mat) tmp.add(new THREE.Mesh(skinTopGeo, mat)); }
      const e = enamelFace('r', 'p', 'gold'), fm = phys({ transparent: true, metalness: 1, roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.08, map: e.map, roughnessMap: e.orm, metalnessMap: e.orm, aoMap: e.orm, polygonOffset: true, polygonOffsetFactor: -2, ...(envTex ? { envMap: envTex } : {}) });
      tmp.add(new THREE.Mesh(faceGeo, fm));
      tmp.position.set(0, -50, 0); scene.add(tmp);
      Core.compileBg(tmp, Core.camera, 300, scene);   // 只编这几种升级材质（用场景的灯光），放后台编；原来是同步把整个场景编一遍，有的电脑上整个浏览器会卡住
      scene.remove(tmp); prewarmSkins.keep = fm; // 留着这份材质：一释放，刚编好的着色器也会被删掉
    } catch (e) { console.warn('prewarmSkins', e); }
  }
  function decorateAll(game) {
    // 兵法局开始后，空闲时先把升级用的材质、贴图做好（第一次升级时不卡顿）
    if (!skins && !decorateAll.warm) { decorateAll.warm = true; setTimeout(prewarmSkins, 1500); }
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) {
      const p = game.board[r][f]; if (!p) continue;
      const m = pieces.get(p.id); if (m) decorate(m, p, decoOpts(game, p));
    }
  }
  // 兵法：动画之后把棋盘模型对齐到规则状态（补缺、删多、归位、换装饰）
  function reconcile(game) {
    const want = new Map();
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = game.board[r][f]; if (p) want.set(p.id, [p, f, r]); }
    for (const [id, m] of [...pieces]) if (!want.has(id)) { if (m.parent) m.parent.remove(m); pieces.delete(id); }
    for (const [id, [p, f, r]] of want) {
      let m = pieces.get(id);
      if (!m) { m = makePiece(p); piecesRoot.add(m); pieces.set(id, m); }
      if (m.parent !== piecesRoot) piecesRoot.add(m);
      m.visible = true; m.scale.set(1, 1, 1);
      m.position.copy(pos(f, r));
      m.rotation.set(0, Board.viewSide === 'b' ? Math.PI : 0, 0);
      if (m.userData.t !== p.t) setFace(m, p);
      if (game.bf) decorate(m, p, decoOpts(game, p)); else if (pieceSkin && !m.userData.deco) dress(m, p);
    }
  }
  // 棋子朝向：让字朝向当前观看方
  // follow = true：镜头正在转过来（Core.Cam.spinning），棋子跟着镜头一起转，转完摆正
  let faceHook = null;
  function faceViewer(side, follow) {
    const to = side === 'b' ? Math.PI : 0;
    if (faceHook) { faceHook(); faceHook = null; }
    Board.viewSide = side;
    waterMat.uniforms.uBoard.value.z = side === 'b' ? 1 : 0;
    if (follow && Core.Cam.spinning) {
      faceHook = Core.onFrame(() => {
        if (Core.Cam.spinning) { for (const m of pieces.values()) m.rotation.y = Core.Cam.theta; return; }
        for (const m of pieces.values()) m.rotation.y = to;
        if (faceHook) { faceHook(); faceHook = null; }
      });
      return;
    }
    for (const m of pieces.values()) m.rotation.y = to;
  }

  // ---------- 标记 ----------
  const markRoot = new THREE.Group(); root.add(markRoot);
  const dotTex = canvasTex(128, 128, (g, w) => { g.fillStyle = '#fff'; inkBlot(g, w / 2, w / 2, 26, 1, 0.3); });
  const ringTex = canvasTex(256, 256, (g, w) => {
    g.strokeStyle = '#fff';
    for (let k = 0; k < 5; k++) { g.globalAlpha = 0.35 + rnd() * 0.5; g.lineWidth = 8 + rnd() * 8; g.beginPath(); g.arc(w / 2, w / 2, w * 0.4 + (rnd() - 0.5) * 8, rnd(), rnd() + 5.4); g.stroke(); }
  });
  const flatGeo = new THREE.PlaneGeometry(1, 1); flatGeo.rotateX(-Math.PI / 2);
  function decal(tex, color, size, x, z, y = TOP + 0.004, opacity = 0.85) {
    const m = new THREE.Mesh(flatGeo, new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false }));
    m.scale.set(size, 1, size); m.position.set(x, y, z);
    return m;
  }
  // 选中：灰绿罗盘圈 + 光柱 + 棋子悬浮；可吃目标：底部朱圈 + 头顶呼吸闪烁的"殺"朱印
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); };
  const killTex = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    const gr = g.createRadialGradient(w / 2, w / 2, 20, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,190,150,.55)'); gr.addColorStop(0.6, 'rgba(210,70,40,.16)'); gr.addColorStop(1, 'rgba(210,70,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.save(); g.translate(w / 2, w / 2); g.rotate(-0.07);
    const s = w * 0.6;
    g.fillStyle = 'rgba(40,10,5,.4)'; rrect(g, -s / 2 + 5, -s / 2 + 7, s, s, 16); g.fill();
    g.fillStyle = '#b52d1b'; rrect(g, -s / 2, -s / 2, s, s, 16); g.fill();
    g.strokeStyle = '#f7ead0'; g.lineWidth = 6; rrect(g, -s / 2 + 10, -s / 2 + 10, s - 20, s - 20, 9); g.stroke();
    g.font = `bold ${Math.round(s * 0.72)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f7ead0';
    g.fillText('殺', 0, s * 0.05);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 80; i++) { g.globalAlpha = rnd() * 0.55; g.beginPath(); g.arc((rnd() - 0.5) * s, (rnd() - 0.5) * s, 1 + rnd() * 4, 0, 7); g.fill(); }
    g.restore();
  });
  // 兵法：打不死的目标头顶标「-1」「-2」（这一下会扣多少血），只有能一击杀死的才标「殺」
  const dmgTexCache = {};
  const dmgTex = n => dmgTexCache[n] || (dmgTexCache[n] = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.save(); g.translate(w / 2, w / 2); g.rotate(-0.05);
    const s = w * 0.56;
    g.fillStyle = 'rgba(30,20,10,.4)'; rrect(g, -s / 2 + 5, -s / 2 + 7, s, s, 16); g.fill();
    g.fillStyle = '#2a2622'; rrect(g, -s / 2, -s / 2, s, s, 16); g.fill();
    g.strokeStyle = '#e9c77a'; g.lineWidth = 6; rrect(g, -s / 2 + 10, -s / 2 + 10, s - 20, s - 20, 9); g.stroke();
    g.font = `bold ${Math.round(s * 0.62)}px Georgia, ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3d9a0';
    g.fillText('-' + n, 0, s * 0.03);
    g.restore();
  }));
  const compassTex = canvasTex(512, 512, (g, w) => {
    const c = w / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
    g.lineWidth = 12; g.beginPath(); g.arc(c, c, w * 0.44, 0, 7); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.arc(c, c, w * 0.38, 0, 7); g.stroke();
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r0 = w * 0.39, r1 = w * (i % 4 === 0 ? 0.432 : 0.412); g.lineWidth = i % 4 === 0 ? 6 : 3; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.save(); g.translate(c + Math.cos(a) * w * 0.475, c + Math.sin(a) * w * 0.475); g.rotate(a); g.beginPath(); g.moveTo(-18, 0); g.lineTo(0, -11); g.lineTo(18, 0); g.lineTo(0, 11); g.closePath(); g.fill(); g.restore(); }
  });
  const colTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(0.5, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const colGeo = new THREE.CylinderGeometry(0.4, 0.46, 0.7, 36, 1, true); colGeo.translate(0, 0.35, 0);
  const haloGeo = new THREE.TorusGeometry(0.475, 0.016, 6, 56); haloGeo.rotateX(Math.PI / 2);
  const glowTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const SEL_COL = 0x7f927c;
  // ---- 可走提示：低饱和的绿、带呼吸；落点是一团墨点（深绿墨边 + 浅绿心），从棋子到落点有一条顺着走向流动的墨带（干笔飞白）----
  //   被动技能的走法（兵法：神速营 / 回防 / 铁甲禁卫）用金色
  const HINT = { edge: 0x2f4d3a, core: 0xc4dfbb, belt: 0x4f7c5f, edgeV: 0x6e4f12, coreV: 0xf4d892, beltV: 0xb88a2c, edgeB: 0x7a1a10, coreB: 0xf2a08c, beltB: 0xb0301f };
  // 禁止符号（走了会送将的落点 / 目标头顶）：朱红圆圈加一道斜杠
  // 技能的落点：四角金框（“这里可以放技能”）；选定的目标：转着的瞄准圈
  const bracketTex = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w); g.lineCap = 'square';
    const draw = (lw, col) => { g.strokeStyle = col; g.lineWidth = lw; const a = 30, L = 62; for (const [x, y, sx, sy] of [[a, a, 1, 1], [w - a, a, -1, 1], [a, w - a, 1, -1], [w - a, w - a, -1, -1]]) { g.beginPath(); g.moveTo(x + sx * L, y); g.lineTo(x, y); g.lineTo(x, y + sy * L); g.stroke(); } };
    draw(26, 'rgba(30,18,6,.55)'); draw(15, '#fff');
  });
  const aimTex = canvasTex(512, 512, (g, w) => {
    g.clearRect(0, 0, w, w); const c = w / 2; g.lineCap = 'butt';
    const pass = (k, col) => {
      g.strokeStyle = col;
      g.lineWidth = 20 * k; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.26; g.beginPath(); g.arc(c, c, 206, a, a + Math.PI / 2 - 0.52); g.stroke(); }   // 外圈四段弧
      g.lineWidth = 8 * k; g.beginPath(); g.arc(c, c, 168, 0, 7); g.stroke();                                                                                      // 内圈细线
      g.lineWidth = 22 * k; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 150, c + Math.sin(a) * 150); g.lineTo(c + Math.cos(a) * 246, c + Math.sin(a) * 246); g.stroke(); }   // 十字准星的四个短杠
    };
    pass(1.6, 'rgba(30,14,4,.55)'); pass(1, '#fff');
  });
  const banTex = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    const c = w / 2, R = w * 0.3;
    const gr = g.createRadialGradient(c, c, R * 0.4, c, c, w / 2);
    gr.addColorStop(0, 'rgba(255,200,180,.35)'); gr.addColorStop(0.7, 'rgba(200,50,30,.12)'); gr.addColorStop(1, 'rgba(200,50,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(40,10,5,.45)'; g.lineWidth = 30; g.beginPath(); g.arc(c + 3, c + 5, R, 0, 7); g.stroke();
    g.fillStyle = 'rgba(247,234,208,.82)'; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
    g.strokeStyle = '#b52d1b'; g.lineWidth = 26; g.beginPath(); g.arc(c, c, R, 0, 7); g.stroke();
    const d = R * Math.SQRT1_2; g.beginPath(); g.moveTo(c - d, c - d); g.lineTo(c + d, c + d); g.stroke();
  });
  // 一块贴图里两笔：尾宽头尖、朝 +u 方向，一根根笔毛往笔尖收拢；滚动起来就像墨在往前走
  const flowTex = canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // 底：一道淡淡的连笔（让带子连成一条），上面每块两笔浓墨
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${0.1 + rnd() * 0.16})`; g.lineWidth = 1 + rnd() * 3; const y = h * 0.3 + rnd() * h * 0.4; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let k = 0; k < 2; k++) {
      const x0 = k * w / 2 + 6, L = w / 2 - 22;
      // 笔肚：实心的一笔，尾宽头尖
      const gr = g.createLinearGradient(x0, 0, x0 + L, 0); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,.95)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0 + 8, h * 0.2); g.quadraticCurveTo(x0 + L * 0.6, h * 0.22, x0 + L, h * 0.5); g.quadraticCurveTo(x0 + L * 0.6, h * 0.78, x0 + 8, h * 0.8); g.quadraticCurveTo(x0 + 26, h * 0.5, x0 + 8, h * 0.2); g.fill();
      // 飞白：笔尾擦掉几道
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 16; i++) { g.strokeStyle = `rgba(0,0,0,${0.35 + rnd() * 0.5})`; g.lineWidth = 1 + rnd() * 2.6; const y = h * 0.22 + rnd() * h * 0.56, st = x0 + rnd() * 30; g.beginPath(); g.moveTo(st, y); g.lineTo(st + 30 + rnd() * L * 0.5, y + (h / 2 - y) * 0.3); g.stroke(); }
      g.globalCompositeOperation = 'source-over';
      // 笔毛：散开的细丝往笔尖收
      for (let i = 0; i < 26; i++) {
        const y = h * 0.08 + rnd() * h * 0.84, t = Math.abs(y - h / 2) / (h * 0.42);
        const len = L * (1 - 0.5 * t * t) * (0.7 + rnd() * 0.3), st = x0 + rnd() * 16 + t * 20;
        g.strokeStyle = `rgba(255,255,255,${0.2 + rnd() * 0.5})`; g.lineWidth = 1 + rnd() * 2.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(st, y); g.quadraticCurveTo(st + len * 0.55, y + (h / 2 - y) * 0.3, st + len, y + (h / 2 - y) * 0.86); g.stroke();
      }
    }
  }, { repeat: true });
  // 沿折线铺一条带子：u = 沿线长度（贴图顺着流），两端用顶点透明度淡出
  function ribbonGeo(pts, width, y, tile = 1.5) {
    const n = pts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), col = new Float32Array(n * 8), idx = [];
    const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[n - 1] || 1, sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const nx = -tz * width / 2, nz = tx * width / 2, al = sm(L[i] / 0.32) * sm((tot - L[i]) / 0.3);
      pos.set([pts[i][0] + nx, y, pts[i][1] + nz, pts[i][0] - nx, y, pts[i][1] - nz], i * 6);
      uv.set([L[i] / tile, 0, L[i] / tile, 1], i * 4);
      col.set([1, 1, 1, al, 1, 1, 1, al], i * 8);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
    return g;
  }
  // 一组走法 → 若干条墨带的路径：直线走法按方向合并（只铺到最远的落点），马走“日”拐个弯
  function beltPaths(sel, moves, occ) {
    const out = [], straight = new Map(), [sf, sr] = sel, A = [X(sf), Z(sr)];
    for (const m of moves) {
      const df = m.to[0] - sf, dr = m.to[1] - sr, af = Math.abs(df), ar = Math.abs(dr), B = [X(m.to[0]), Z(m.to[1])];
      const endGap = occ(m.to[0], m.to[1]) ? 0.5 : 0.17;
      if ((af === 1 && ar === 2) || (af === 2 && ar === 1)) {
        // 马：先直走一格（马腿），再斜出去
        const leg = af === 2 ? [X(sf + Math.sign(df)), Z(sr)] : [X(sf), Z(sr + Math.sign(dr))], pts = [];
        for (let i = 0; i <= 14; i++) { const t = i / 14, u = 1 - t; pts.push([u * u * A[0] + 2 * u * t * leg[0] + t * t * B[0], u * u * A[1] + 2 * u * t * leg[1] + t * t * B[1]]); }
        out.push({ pts: trimPath(pts, 0.5, endGap), via: m.via });
        continue;
      }
      if (df && dr && af !== ar) { out.push({ pts: trimPath([A, B], 0.5, endGap), via: m.via }); continue; }
      const key = Math.sign(df) + ',' + Math.sign(dr) + (m.via ? 'v' : ''), d = Math.max(af, ar), cur = straight.get(key);
      if (!cur || d > cur.d) straight.set(key, { d, B, endGap, via: m.via });
    }
    for (const v of straight.values()) {
      const n = Math.max(2, Math.ceil(Math.hypot(v.B[0] - A[0], v.B[1] - A[1]) / 0.25)), pts = [];
      for (let i = 0; i <= n; i++) pts.push([A[0] + (v.B[0] - A[0]) * i / n, A[1] + (v.B[1] - A[1]) * i / n]);
      out.push({ pts: trimPath(pts, 0.5, v.endGap), via: v.via });
    }
    return out.filter(p => p.pts.length >= 2);
  }
  // 把路径两头各裁掉一段（起点让开选中的棋子，终点让开落点的墨点 / 朱圈）
  function trimPath(pts, a, b) {
    const cut = (list, d) => {
      let acc = 0;
      for (let i = 1; i < list.length; i++) {
        const seg = Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1]);
        if (acc + seg >= d) { const t = (d - acc) / (seg || 1); return [[list[i - 1][0] + (list[i][0] - list[i - 1][0]) * t, list[i - 1][1] + (list[i][1] - list[i - 1][1]) * t], ...list.slice(i)]; }
        acc += seg;
      }
      return [];
    };
    const p1 = cut(pts, a); if (p1.length < 2) return [];
    return cut(p1.slice().reverse(), b).reverse();
  }
  let moveDots = [], belts = [];
  const DOT_E = 0.92, DOT_C = 0.56;
  let selRing = null, selGlow = null, selShade = null, selCol = null, selHalo = null, selDrop = null, hovered = null, kills = [], killRings = [], hoverT = 0, brackets = [], aimMark = null, aimGlow = null;
  const dropping = new Set();
  function showMoves(sel, moves, hints = true) {
    clearMoves(false);
    if (sel) {
      const x = X(sel[0]), z = Z(sel[1]);
      selGlow = decal(glowTex, SEL_COL, 1.6, x, z, TOP + 0.005, 0.5);
      selShade = decal(compassTex, 0x1b1a19, 1.3, x, z, TOP + 0.006, 0.28);
      selRing = decal(compassTex, SEL_COL, 1.24, x, z, TOP + 0.008, 0.98);
      selDrop = decal(glowTex, 0x1b1a19, 0.9, x, z, TOP + 0.007, 0.35);
      selCol = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ map: colTex, color: 0x9db39a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      selCol.position.set(x, TOP, z);
      selHalo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0xa8bca4, transparent: true, opacity: 0.95 }));
      selHalo.position.set(x, TOP + PH * 0.6, z);
      markRoot.add(selGlow, selShade, selRing, selDrop, selCol, selHalo);
      hovered = meshAt(sel[0], sel[1]);
      if (hovered) dropping.delete(hovered);
      hoverT = 0;
    }
    for (const m of moves) {
      const [f, r] = m.to;
      const occupied = !!meshAt(f, r);
      if (m.bad) {
        // 走了会送将：落点 / 目标标红；目标是棋子时头顶悬一个禁止符号
        if (occupied) {
          const d = decal(ringTex, HINT.beltB, 1.14, X(f), Z(r), TOP + 0.006, 0.7);
          markRoot.add(d); killRings.push(d);
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: banTex, transparent: true, depthWrite: false, depthTest: false }));
          sp.position.set(X(f), TOP + PH + 0.75, Z(r)); sp.renderOrder = 20; sp.userData.ph = Math.random() * 6; sp.userData.ban = true;
          markRoot.add(sp); kills.push(sp);
        } else {
          const e = decal(dotTex, HINT.edgeB, DOT_E, X(f), Z(r), TOP + 0.005, 0.9), c = decal(dotTex, HINT.coreB, DOT_C, X(f), Z(r), TOP + 0.0056, 0.95);
          e.rotation.y = rnd() * 6; c.rotation.y = rnd() * 6; e.userData.ph = c.userData.ph = (f * 0.7 + r * 0.4) % 1;
          markRoot.add(e, c); moveDots.push(e, c);
        }
        continue;
      }
      if (m.skill) { const bk = decal(bracketTex, 0xf0c04a, 1.02, X(f), Z(r), TOP + 0.0062, 0.95); bk.userData.ph = (f * 0.7 + r * 0.4) % 1; markRoot.add(bk); brackets.push(bk); }
      if (occupied) {
        if (!hints) continue;
        const d = decal(ringTex, m.dmg ? 0x8a6a2a : 0xb0301f, 1.14, X(f), Z(r), TOP + 0.006, 0.95);
        markRoot.add(d); killRings.push(d);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: m.dmg ? dmgTex(m.dmg) : killTex, transparent: true, depthWrite: false, depthTest: false }));
        sp.position.set(X(f), TOP + PH + 0.75, Z(r));
        sp.renderOrder = 20;
        sp.userData.ph = Math.random() * 6;
        markRoot.add(sp); kills.push(sp);
      } else {
        const e = decal(dotTex, m.via ? HINT.edgeV : HINT.edge, DOT_E, X(f), Z(r), TOP + 0.005, 0.9), c = decal(dotTex, m.via ? HINT.coreV : HINT.core, DOT_C, X(f), Z(r), TOP + 0.0056, 0.95);
        e.rotation.y = rnd() * 6; c.rotation.y = rnd() * 6; e.userData.ph = c.userData.ph = (f * 0.7 + r * 0.4) % 1;
        markRoot.add(e, c); moveDots.push(e, c);
      }
    }
    // 落子确认：选中的那枚棋子在落点上留一个蓝色虚影，再点一次才走（Ham 10-09）
    if (moves.ghost && sel) {
      // 落点标记（Ham 10-09 11:37）：虚影底下一个小标记，点明落在哪
      markRoot.add(pointMark(moves.ghost[0], moves.ghost[1], 1));
      const g = ghostOf(sel, moves.ghost, false);
      if (g) {
        markRoot.add(g);
        // 呼吸：透明度在 0.22～0.46 之间一明一暗，约 1.6 秒一下（Ham 10-09：虚影再淡一点，原来 0.32～0.72）；虚影被清掉（确认、取消、换子）时跟着停
        let t = 0; const mats = g.userData.mats;
        const off = Core.onFrame(dt => { if (!g.parent) { off(); if (g.userData.drop) g.userData.drop(); return; } t += dt; const k = GHOST_A + 0.12 * Math.sin(t * Math.PI * 2 / 1.6); for (const m of mats) m.opacity = m.userData.o0 * k; });
      }
    }
    // 选定的技能目标：一个转着的瞄准圈把它框住
    if (moves.aim) {
      const [f, r] = moves.aim;
      aimMark = decal(aimTex, 0xffd257, 1.95, X(f), Z(r), TOP + 0.0095, 1); aimMark.renderOrder = 4; aimMark.userData.t0 = performance.now() / 1000;
      aimGlow = decal(glowTex, 0xffb42a, 2.4, X(f), Z(r), TOP + 0.0052, 0.5);
      markRoot.add(aimGlow, aimMark);
    }
    // 流动的墨带：顺着能走的方向指过去
    if (sel && moves.length && !moves.noBelt) {
      const occ = (f, r) => !!meshAt(f, r), good = moves.filter(m => !m.bad), bad = moves.filter(m => m.bad);
      // 送将的方向也画出来，只是标红（画在下面，能走的那一段照常盖在上面）
      for (const [list, isBad] of [[bad, true], [good, false]]) for (const b of beltPaths(sel, list, occ)) {
        const mesh = new THREE.Mesh(ribbonGeo(b.pts, 0.4, TOP + (isBad ? 0.0040 : 0.0042)), new THREE.MeshBasicMaterial({ map: flowTex, color: isBad ? HINT.beltB : b.via ? HINT.beltV : HINT.belt, transparent: true, opacity: 0.5, depthWrite: false, vertexColors: true, side: THREE.DoubleSide }));
        mesh.userData.own = true; mesh.renderOrder = 3; markRoot.add(mesh); belts.push(mesh);
      }
    }
  }
  // 兵法：本回合技能可用的子，脚下金圈呼吸闪烁
  const glowRoot = new THREE.Group(); root.add(glowRoot);
  let glowKey = '';
  function setGlow(cells) {
    const key = cells.map(c => c.join(',')).join(';');
    if (key === glowKey) return;
    glowKey = key;
    glowRoot.traverse(o => { if (o.material) o.material.dispose(); }); glowRoot.clear();
    for (const [f, r] of cells) {
      const a = decal(glowTex, 0xffc95a, 1.5, X(f), Z(r), TOP + 0.003, 0.5), b = decal(ringTex, 0xffd27a, 1.18, X(f), Z(r), TOP + 0.005, 0.9);
      glowRoot.add(a, b);
    }
  }
  Core.onFrame(() => {
    if (!glowRoot.children.length) return;
    const k = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 3.2);
    glowRoot.children.forEach((m, i) => { m.material.opacity = (i % 2 ? 0.35 + 0.6 * k : 0.15 + 0.45 * k); });
  });
  // 背水一战走完不合法：把惹祸的子标红（脚下朱圈 + 红晕，一下一下闪），将军的那条线也用红带连起来。传空数组清掉
  const badRoot = new THREE.Group(); root.add(badRoot);
  function showBad(cells, links = []) {
    badRoot.traverse(o => { if (o.material) o.material.dispose(); if (o.userData.own && o.geometry) o.geometry.dispose(); }); badRoot.clear();
    for (const [f, r] of cells) {
      const a = decal(glowTex, 0xe2331f, 2.0, X(f), Z(r), TOP + 0.0034, 0.6), b = decal(ringTex, 0xd2281a, 1.24, X(f), Z(r), TOP + 0.0072, 1);
      a.userData.k = 'glow'; b.userData.k = 'ring'; badRoot.add(a, b);
    }
    for (const [A, B] of links) {
      const a = [X(A[0]), Z(A[1])], b = [X(B[0]), Z(B[1])], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25)), pts = [];
      for (let i = 0; i <= n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
      const tp = trimPath(pts, 0.5, 0.5); if (tp.length < 2) continue;
      const mesh = new THREE.Mesh(ribbonGeo(tp, 0.34, TOP + 0.0046), new THREE.MeshBasicMaterial({ map: flowTex, color: 0xd2281a, transparent: true, opacity: 0.8, depthWrite: false, vertexColors: true, side: THREE.DoubleSide }));
      mesh.userData.own = true; mesh.userData.k = 'belt'; mesh.renderOrder = 3; badRoot.add(mesh);
    }
  }
  Core.onFrame(() => {
    if (!badRoot.children.length) return;
    const t = performance.now() / 1000, k = 0.5 + 0.5 * Math.sin(t * 5.2);
    flowTex.offset.x = -(t * 0.55) % 1;
    for (const m of badRoot.children) {
      const kind = m.userData.k;
      if (kind === 'glow') m.material.opacity = 0.3 + 0.45 * k;
      else if (kind === 'ring') { m.material.opacity = 0.6 + 0.4 * k; const s = 1.24 * (1 + 0.06 * k); m.scale.set(s, 1, s); }
      else m.material.opacity = 0.55 + 0.35 * k;
    }
  });
  // 背水一战走完的第一步：落点留一个虚影、头顶悬一个「一」，从出发点到落点留一条墨绿的路——提醒玩家第一步是哪枚子、怎么走的。传 null 清掉
  const stepRoot = new THREE.Group(); root.add(stepRoot);
  const STEP_COL = 0x3f8f6e;
  let stepNumTex = null, stepGhost = null; const stepSealTex = {};
  function showStep(o) {
    stepRoot.traverse(m => { if (m.material && !m.userData.shared) m.material.dispose(); if (m.userData.own && m.geometry) m.geometry.dispose(); }); stepRoot.clear(); stepGhost = null;
    if (!o) return;
    const [ff, fr] = o.from, [tf, tr] = o.to;
    // 路：出发点一个淡圈，沿走法铺一条流动的带子（马走日会拐弯）
    const ring0 = decal(ringTex, STEP_COL, 0.98, X(ff), Z(fr), TOP + 0.0036, 0.75); ring0.userData.k = 'from'; stepRoot.add(ring0);
    for (const b of beltPaths([ff, fr], [{ to: [tf, tr] }], () => false)) {
      const mesh = new THREE.Mesh(ribbonGeo(b.pts, 0.46, TOP + 0.0044, 0.9), new THREE.MeshBasicMaterial({ map: flowTex, color: STEP_COL, transparent: true, opacity: 0.95, depthWrite: false, vertexColors: true, side: THREE.DoubleSide }));
      mesh.userData.own = true; mesh.userData.k = 'belt'; mesh.renderOrder = 3; stepRoot.add(mesh);
    }
    // 虚影：照着那枚子的样子做一个半透明的壳，留在落点（子再走开，它还在）
    const src = o.id != null ? pieces.get(o.id) : meshAt(tf, tr);
    const gm = new THREE.MeshBasicMaterial({ color: 0x8fe0bd, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending });
    const g = new THREE.Mesh(pieceGeo, gm); g.position.copy(pos(tf, tr)); g.scale.set(1.12, 1.25, 1.12); g.renderOrder = 5; g.userData.k = 'ghost';
    if (src) g.rotation.y = src.rotation.y;
    stepRoot.add(g); stepGhost = g;
    const glow = decal(glowTex, STEP_COL, 1.9, X(tf), Z(tr), TOP + 0.0034, 0.55); glow.userData.k = 'glow'; stepRoot.add(glow);
    // 头顶的「一」（对局分析里标「佳」：o.seal）
    if (!stepNumTex) stepNumTex = sealTex('一', '#2f7d5f');
    const sealT = o.seal ? (stepSealTex[o.seal] || (stepSealTex[o.seal] = sealTex(o.seal, '#2f7d5f'))) : stepNumTex;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sealT, transparent: true, depthWrite: false, depthTest: false }));
    sp.material.userData = {}; sp.userData.shared = false; sp.userData.k = 'num'; sp.scale.set(0.5, 0.5, 1); sp.position.set(X(tf), TOP + PH + 0.72, Z(tr)); sp.renderOrder = 21; stepRoot.add(sp);
  }
  Core.onFrame(() => {
    if (!stepRoot.children.length) return;
    const t = performance.now() / 1000, k = 0.5 + 0.5 * Math.sin(t * 2.6);
    flowTex.offset.x = -(t * 0.55) % 1;
    for (const m of stepRoot.children) {
      const kind = m.userData.k;
      if (kind === 'ghost') m.material.opacity = 0.3 + 0.22 * k;
      else if (kind === 'glow') m.material.opacity = 0.35 + 0.25 * k;
      else if (kind === 'num') { m.position.y = TOP + PH + 0.7 + 0.05 * Math.sin(t * 2.1); }
      else if (kind === 'belt') m.material.opacity = 0.75 + 0.25 * k;
    }
  });
  // 范围提示（四面楚歌：楚将周围 5×5）：淡朱底 + 虚线框，范围内的己方棋子套金圈；几秒后自动淡去
  let zoneG = null;
  function showZone(a, b, hits = []) {
    clearMoves(false);
    const g = new THREE.Group(); zoneG = g;
    const x0 = X(a[0]) - 0.5, x1 = X(b[0]) + 0.5, zs = [Z(a[1]), Z(b[1])], z0 = Math.min(...zs) - 0.5, z1 = Math.max(...zs) + 0.5;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, h = z1 - z0;
    const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
    const fill = new THREE.Mesh(flatGeo, mat(0xb0301f, 0.16)); fill.scale.set(w, 1, h); fill.position.set(cx, TOP + 0.004, cz); g.add(fill);
    const edge = (ex, ez, ew, eh) => { for (let i = 0; i < Math.max(ew, eh) / 0.3; i += 1) { const m = new THREE.Mesh(flatGeo, mat(0xb0301f, 0.85)); const t = (i * 0.3 + 0.1); if (ew > eh) { if (t + 0.18 > ew) break; m.scale.set(0.18, 1, eh); m.position.set(ex - ew / 2 + t + 0.09, TOP + 0.006, ez); } else { if (t + 0.18 > eh) break; m.scale.set(ew, 1, 0.18); m.position.set(ex, TOP + 0.006, ez - eh / 2 + t + 0.09); } g.add(m); } };
    edge(cx, z0, w, 0.05); edge(cx, z1, w, 0.05); edge(x0, cz, 0.05, h); edge(x1, cz, 0.05, h);
    for (const [f, r] of hits) g.add(decal(ringTex, 0xe0b04a, 1.16, X(f), Z(r), TOP + 0.007, 0.95));
    markRoot.add(g);
    const t0 = performance.now();
    const fade = () => { if (zoneG !== g || !g.parent) return; const k = (performance.now() - t0) / 1000; if (k > 5) { const o = Math.max(0, 1 - (k - 5) / 0.8); g.traverse(m => { if (m.material) { if (m.material.userData.o0 == null) m.material.userData.o0 = m.material.opacity; m.material.opacity = m.material.userData.o0 * o; } }); if (o <= 0) { markRoot.remove(g); g.traverse(m => m.material && m.material.dispose()); return; } } requestAnimationFrame(fade); };
    requestAnimationFrame(fade);
  }
  // immediate=true：立即落回棋盘（走子时用）
  // 虚影：把选中的那枚棋子照原样复制一份——木身、字面、金边、棋子款式的装饰都在，只是半透明（Ham 10-09：不要单色）。
  // 材质一律克隆：clearMoves 会把 markRoot 里的材质全 dispose 掉，挂原材质会把原棋子连带释放。贴图是共用的，dispose 材质不碰贴图。
  // 模型显示模式下棋盘上的圆棋子是藏起来的（squads.showDisc），虚影照样画圆棋子：落点上要的是「这枚子」的样子。
  // bad=true：点到走不了的地方，同样的虚影带一点红。
  const GHOST_RED = new THREE.Color(0xd8341f);
  const GHOST_A = 0.34;   // 虚影平均的透明度（乘在原材质上）
  // 落点标记（Ham 10-09 选了第三案「朱红折角」）：四个直角，和棋盘上炮位、兵位的折角记号一个样子；比棋子大一圈，虚影盖不住
  let markT = null;
  function markTex() {
    if (markT) return markT;
    markT = canvasTex(256, 256, (g, w) => {
      g.clearRect(0, 0, w, w); const c = w / 2, d = w * 0.36, l = w * 0.11;
      g.strokeStyle = '#c8321f'; g.globalAlpha = 0.92; g.lineWidth = w * 0.026; g.lineCap = 'square';
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.moveTo(c + sx * d, c + sy * (d - l)); g.lineTo(c + sx * d, c + sy * d); g.lineTo(c + sx * (d - l), c + sy * d); g.stroke(); }
    });
    markT.colorSpace = THREE.SRGBColorSpace;
    return markT;
  }
  function pointMark(f, r, op = 1) {
    const m = decal(markTex(), 0xffffff, 1.25, X(f), Z(r), TOP + 0.0062, op);
    m.renderOrder = 5; return m;
  }
  // 电脑上鼠标移到能走的点：那里显示同样的标记（淡一点）。main.js 的 pointermove 调 hoverMark([f, r]) / hoverMark(null)
  let hoverMk = null, hoverAt = '';
  function hoverMark(at) {
    const key = at ? at[0] + ',' + at[1] : '';
    if (key === hoverAt) return; hoverAt = key;
    if (hoverMk) { scene.remove(hoverMk); hoverMk.material.dispose(); hoverMk = null; }
    if (at) { hoverMk = pointMark(at[0], at[1], 0.6); scene.add(hoverMk); }
  }
  // 走不了的虚影染红（10-09 Ham：再红一点）：颜色往朱红拉七成，再加一层红色自发光
  const ghostMat = (m, bad, mats) => {
    const c = m.clone(); c.transparent = true; c.depthWrite = false; c.userData = Object.assign({}, m.userData, { o0: m.opacity == null ? 1 : m.opacity });
    if (bad) { if (c.color) c.color.lerp(GHOST_RED, 0.7); if (c.emissive) { c.emissive.setHex(0xa0180a); c.emissiveIntensity = 0.9; } }
    mats.push(c); return c;
  };
  // 兵种模型模式（10-09 Ham：虚影要是兵种模型的虚影）：在落点另立一队同样的兵马（同兵种、同等级、同朝向），材质全换成半透明的克隆。
  // 返回一个空的容器 Group 放进 markRoot；容器被清掉（clearMoves）或 flashBad 播完时，userData.drop() 把这一队收掉、克隆的材质释放。
  function squadGhost(src, at, bad) {
    const SQ = typeof Squads !== 'undefined' ? Squads : null;
    if (!SQ || !SQ.Stand || !SQ.Stand.on || !SQ.Stand.sq(src)) return null;
    const u = src.userData; if (!u.t || u.h) return null;
    let lv = 0;
    if (lastGame && lastGame.bf) for (const row of lastGame.board) for (const p of row) if (p && p.id === u.id) lv = p.lv || 1;
    let sq;
    try { sq = SQ.make(u.t, u.s, new THREE.Vector3(X(at[0]), TOP, Z(at[1])), SQ.yawOf(new THREE.Vector3(0, 0, u.s === 'r' ? -1 : 1)), 'move', lv || 1, lv); } catch (e) { return null; }
    if (sq.setPose && sq.troop) sq.setPose('idle'); if (sq.crew) sq.crew.setPose('idle'); if (sq.horse && !sq.mounted) sq.horse.speed = 0;
    if (sq.flags) for (const f of sq.flags) scene.remove(f.group);   // 旗子不要：落点上看清人马就够了
    const parts = [sq, sq.guard, sq.crew].filter(Boolean);
    for (const q of parts) { if (q.setVis) q.setVis(1); if (q.updaters) for (const f of q.updaters) try { f(0); } catch (e) { } }   // 先跑一帧，各个兵马站到位（不然有的部件还停在世界原点）
    const mats = [], roots = parts.map(q => q.group).filter(Boolean);
    // 描墨边的那层（背面外扩）不进虚影：半透明时它会从身体里透出来，整队发黑
    for (const r of roots) r.traverse(o => { if (o.material && !Array.isArray(o.material) && o.material.side === THREE.BackSide) { o.visible = false; return; } if (o.material) { o.material = Array.isArray(o.material) ? o.material.map(m => ghostMat(m, bad, mats)) : ghostMat(o.material, bad, mats); o.castShadow = false; o.renderOrder = 6; } });
    const g = new THREE.Group(); g.userData.mats = mats;
    let gone = false;
    g.userData.drop = () => { if (gone) return; gone = true; try { if (sq.guard) sq.guard.dispose(); sq.dispose(); } catch (e) { } for (const m of mats) m.dispose(); };   // 炮的炮手由 Cannon.dispose 一起收
    for (const m of mats) m.opacity = m.userData.o0 * GHOST_A;
    return g;
  }
  function ghostOf(sel, at, bad) {
    const src = meshAt(sel[0], sel[1]); if (!src) return null;
    const sg = squadGhost(src, at, bad); if (sg) return sg;
    const mats = [];
    const cm = m => ghostMat(m, bad, mats);
    const skinned = !!src.userData.skinned;
    const copy = (o, depth, idx) => {
      const d = o.isMesh ? new THREE.Mesh(o.geometry, Array.isArray(o.material) ? o.material.map(cm) : cm(o.material)) : new THREE.Group();
      d.position.copy(o.position); d.quaternion.copy(o.quaternion); d.scale.copy(o.scale);
      // 照「圆棋子模式」该有的显隐：木身、字面总在；金边在没换款式时才有；款式装饰照它自己的
      d.visible = depth === 1 && idx <= 1 ? true : depth === 1 && idx === 2 ? !skinned : (o.userData && o.userData.skin) ? true : o.visible;
      o.children.forEach((c, k) => { if (c.isMesh || c.isGroup || c.type === 'Object3D') d.add(copy(c, depth + 1, k)); });
      return d;
    };
    const g = copy(src, 0, 0); g.visible = true;
    g.position.set(X(at[0]), TOP, Z(at[1])); g.rotation.set(0, src.rotation.y, 0); g.renderOrder = 6;
    for (const m of mats) m.opacity = m.userData.o0 * GHOST_A;
    g.userData.mats = mats;
    return g;
  }
  // 点到走不了的地方：那里出一个带红的虚影，呼吸一下就淡出（约 1 秒）
  function flashBad(sel, at) {
    const g = sel && ghostOf(sel, at, true); if (!g) return;
    scene.add(g); let t = 0; const mats = g.userData.mats, T = 1.0;
    const off = Core.onFrame(dt => {
      t += dt;
      const fade = t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / (T - 0.45)), k = (0.5 + 0.18 * Math.cos(t * Math.PI * 2 / 0.5)) * fade;
      for (const m of mats) m.opacity = m.userData.o0 * k;
      if (t >= T) { off(); scene.remove(g); if (g.userData.drop) g.userData.drop(); else for (const m of mats) m.dispose(); }
    });
  }
  function clearMoves(immediate = true) {
    hoverMark(null);
    if (hovered) {
      if (immediate) { hovered.position.y = TOP; hovered.rotation.x = hovered.rotation.z = 0; }
      else dropping.add(hovered);
      hovered = null;
    }
    if (immediate) { for (const m of dropping) { m.position.y = TOP; m.rotation.x = m.rotation.z = 0; } dropping.clear(); }
    markRoot.traverse(o => { if (o.material && o.material !== goldM) o.material.dispose(); if (o.userData.own && o.geometry) o.geometry.dispose(); });
    markRoot.clear(); selRing = selGlow = selShade = selCol = selHalo = selDrop = null; kills = []; killRings = []; moveDots = []; belts = []; brackets = []; aimMark = aimGlow = null;
  }
  Core.onFrame(dt => {
    hoverT += dt;
    // 落点墨点呼吸；墨带顺着走向流动、明暗起伏
    if (moveDots.length || belts.length) {
      const t = performance.now() / 1000;
      flowTex.offset.x = -(t * 0.55) % 1;
      for (let i = 0; i < moveDots.length; i++) {
        const d = moveDots[i], core = i % 2 === 1, b = 0.5 + 0.5 * Math.sin(t * 2.6 - d.userData.ph * 2.2), s = (core ? DOT_C : DOT_E) * (0.9 + 0.2 * b);
        d.scale.set(s, 1, s); d.material.opacity = core ? 0.7 + 0.3 * b : 0.62 + 0.3 * b;
      }
      const bb = 0.5 + 0.5 * Math.sin(t * 2.6);
      for (const m of belts) m.material.opacity = 0.5 + 0.3 * bb;
    }
    if (selRing) {
      selRing.rotation.y += dt * 0.6; selShade.rotation.y = selRing.rotation.y;
      const b = 0.5 + 0.5 * Math.sin(hoverT * 3);
      selGlow.material.opacity = 0.32 + 0.25 * b;
      const k = Math.min(1, hoverT * 5);
      selRing.scale.set(1.24 * (0.7 + 0.3 * k), 1, 1.24 * (0.7 + 0.3 * k)); selShade.scale.copy(selRing.scale).multiplyScalar(1.05);
      selCol.material.opacity = (0.38 + 0.2 * b) * k; selCol.scale.y = k;
    }
    if (hovered) {
      const ty = TOP + 0.58 + Math.sin(hoverT * 2.4) * 0.045;
      hovered.position.y += (ty - hovered.position.y) * (1 - Math.exp(-dt * 12));
      hovered.rotation.x = Math.sin(hoverT * 1.7) * 0.045; hovered.rotation.z = Math.cos(hoverT * 1.3) * 0.045;
      if (selHalo) {
        selHalo.position.set(hovered.position.x, hovered.position.y + PH * 0.6, hovered.position.z);
        selHalo.rotation.x = hovered.rotation.x; selHalo.rotation.z = hovered.rotation.z;
        const s2 = 1 + 0.04 * Math.sin(hoverT * 4); selHalo.scale.set(s2, 1, s2);
        const hgt = hovered.position.y - TOP;
        selDrop.material.opacity = 0.42 - hgt * 0.25; selDrop.scale.set(0.8 + hgt * 0.4, 1, 0.8 + hgt * 0.4);
      }
    }
    for (const m of dropping) {
      m.position.y += (TOP - m.position.y) * (1 - Math.exp(-dt * 16));
      m.rotation.x *= 0.8; m.rotation.z *= 0.8;
      if (Math.abs(m.position.y - TOP) < 0.003) { m.position.y = TOP; m.rotation.x = m.rotation.z = 0; dropping.delete(m); }
    }
    for (const k of kills) {
      if (k.userData.ban) {   // 禁止符号一直亮着，轻轻浮动
        const w = 0.5 + 0.5 * Math.sin(hoverT * 3 + k.userData.ph);
        k.material.opacity = 0.82 + 0.18 * w; k.scale.set(0.6, 0.6, 1); k.position.y = TOP + PH + 0.45 + w * 0.06;
        continue;
      }
      // 呼吸：淡入—停留—淡出—隐去，周而复始
      const ph = ((hoverT * 0.62 + k.userData.ph / 6.28) % 1);
      const b = ph < 0.35 ? ph / 0.35 : ph < 0.6 ? 1 : ph < 0.85 ? 1 - (ph - 0.6) / 0.25 : 0;
      const e = b * b * (3 - 2 * b);
      k.material.opacity = e;
      const s = 0.66 + 0.12 * e; k.scale.set(s, s, 1);
      k.position.y = TOP + PH + 0.4 + e * 0.1;
    }
    for (const r of killRings) { const b = 0.5 + 0.5 * Math.sin(hoverT * 3.8); r.material.opacity = 0.55 + 0.45 * b; r.rotation.y -= dt * 0.5; }
    for (const bk of brackets) { const b = 0.5 + 0.5 * Math.sin(hoverT * 4 - bk.userData.ph * 6.28), s = 1.02 - 0.07 * b; bk.scale.set(s, 1, s); bk.material.opacity = 0.7 + 0.3 * b; }
    if (aimMark) {
      const k = Math.min(1, (performance.now() / 1000 - aimMark.userData.t0) / 0.22), e = 1 - (1 - k) * (1 - k), b = 0.5 + 0.5 * Math.sin(hoverT * 5);
      const s = 1.95 * (1.55 - 0.55 * e) * (1 + 0.03 * b); aimMark.scale.set(s, 1, s); aimMark.rotation.y += dt * 0.9; aimMark.material.opacity = 0.35 + 0.65 * e;
      aimGlow.material.opacity = (0.3 + 0.25 * b) * e;
    }
  });
  const lastRoot = new THREE.Group(); root.add(lastRoot);
  function showLast(from, to) {
    lastRoot.clear();
    if (!from) return;
    lastRoot.add(decal(ringTex, 0x3a3836, 0.9, X(from[0]), Z(from[1]), TOP + 0.003, 0.5));
    lastRoot.add(decal(ringTex, 0x3a3836, 1.0, X(to[0]), Z(to[1]), TOP + 0.003, 0.55));
  }

  // ---------- 点选 ----------
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP + 0.1));
  function pick(clientX, clientY) {
    const v = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(v, Core.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const f = Math.round(hit.x + 4);
    const r = hit.z > 0 ? Math.round(4 + RZ - hit.z) : Math.round(5 - RZ - hit.z);
    if (f < 0 || f > 8 || r < 0 || r > 9) return null;
    const p = pos(f, r);
    if (Math.hypot(p.x - hit.x, p.z - hit.z) > 0.5) return null;
    return [f, r];
  }

  function meshAt(f, r) {
    const p = pos(f, r);
    for (const m of pieces.values()) if (m.visible && Math.abs(m.position.x - p.x) < 0.1 && Math.abs(m.position.z - p.z) < 0.1) return m;
    return null;
  }

  // 棋盘面的质感：木纹做成细微起伏（顺纹的棕眼），再映一点柔光箱的环境反光——缎面 / 磨砂的光泽，不是镜面。低画质不做
  (function polishBoard() {
    if (LOWQ() || MOBILE) return;
    try {
      const hc = mkCanvas(1024, 1024, g => {
        g.drawImage(Core.Tex.wood.image, 0, 0, 1024, 1024);
        for (let i = 0; i < 1500; i++) { const x = rnd() * 1024, y = rnd() * 1024, L = 12 + rnd() * 60; g.strokeStyle = `rgba(30,18,8,${0.12 + rnd() * 0.25})`; g.lineWidth = 0.6 + rnd() * 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + (rnd() - 0.5) * 2); g.stroke(); }
      });
      const nm = dataTex(normalFrom(blurred(hc, 0.7), 1.5, false));
      const env = studioEnv();
      for (const m of boardTops) { m.normalMap = nm; m.normalScale = new THREE.Vector2(0.32, 0.32); if (env) { m.envMap = env; m.envMapIntensity = 0.3; } m.needsUpdate = true; }
    } catch (e) { console.warn('polishBoard', e); }
  })();
  return {
    root, TOP, PH, HALF, X, Z, pos, setPosition, syncPosition, pieces, piecesRoot, makePiece, faceViewer,
    showMoves, clearMoves, flashBad, hoverMark, showZone, showBad, showStep, setGlow, showLast, pick, meshAt, get hovered() { return hovered; }, ringTex, glowTex, wakes, water, waterMat, decal, flatGeo, pine, deco, FONT, footRing,
    viewSide: 'r', setSkin, dress, get lastGame() { return lastGame; }, skinTune, get SK() { return SK; }, pieceWood, RZ, BZ, BX, BRIDGE_X, faceTex, backTex, setFace, makeRiver, mtTex, decorate, decorateAll, decoOpts, reconcile, plateGeo, plateOn,
  };
})();
