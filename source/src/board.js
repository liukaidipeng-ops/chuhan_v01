// ===== 棋盘、棋子、楚河汉界流水、水墨山水 =====
const Board = (() => {
  const { scene, toon, inked, canvasTex, rnd, inkBlot, Tex } = Core;
  const TOP = 0.25, PH = 0.2, HALF = 0.24, RZ = 0.62, BX = 4.75, BZ = RZ + 4 + 0.75, BRIDGE_X = 6.97;
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
      const sx = 4.46, zf = sg * 5.08, zn = sg * 0.4;
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
      g.fillStyle = 'rgba(160,36,22,.92)'; g.fillRect(-ss / 2, -ss / 2, ss, ss);
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
  function makeHalf(isRed) {
    const depth = BZ - HALF;
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2 * BX, 0.55, depth), [sideMat(depth), sideMat(depth), lacquerTop, lacquerTop, sideMat(2 * BX), sideMat(2 * BX)]);
    box.position.y = TOP - 0.275 - 0.002;
    box.receiveShadow = true; box.castShadow = true;
    const topM = new THREE.MeshStandardMaterial({ map: drawHalf(isRed), roughness: 0.62 });
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
    bar(2 * BX, 0.05, 0, zFar - sg * 0.025); bar(2 * BX, 0.05, 0, zRiv + sg * 0.025);
    // 铜包角
    for (const sx of [-1, 1]) {
      const cxp = sx * (BX - 0.2), czp = zFar - sg * 0.2;
      for (const [w, d, x, z] of [[0.42, 0.07, cxp, zFar - sg * 0.035], [0.07, 0.42, sx * (BX - 0.035), czp]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.036, d), bronzeM); m.position.set(x, TOP + 0.008, z); g.add(m);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.1), bronzeM); cap.position.set(sx * (BX - 0.03), TOP - 0.12, zFar - sg * 0.03); g.add(cap);
      for (const [x, z] of [[sx * (BX - 0.3), zFar - sg * 0.035], [sx * (BX - 0.035), zFar - sg * 0.3]]) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), goldM); r.position.set(x, TOP + 0.03, z); g.add(r); }
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
  const faceCache = {};
  function faceTex(s, t) {
    const key = s + t;
    if (faceCache[key]) return faceCache[key];
    const ch = XQ.NAMES[s][t];
    const col = s === 'r' ? '#a3241a' : '#1c1a18';
    return (faceCache[key] = canvasTex(512, 512, (g, w) => {
      g.clearRect(0, 0, w, w);
      const c = w / 2;
      const ring = (r, lw, color, d = 0) => { g.strokeStyle = color; g.lineWidth = lw; g.beginPath(); g.arc(c + d, c + d, r, 0, 7); g.stroke(); };
      // 刻痕双圈 + 联珠纹
      ring(w * 0.452, 12, 'rgba(60,30,10,.45)', 3); ring(w * 0.452, 10, col);
      ring(w * 0.372, 6, 'rgba(60,30,10,.4)', 2); ring(w * 0.372, 5, col);
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2, x = c + Math.cos(a) * w * 0.412, y = c + Math.sin(a) * w * 0.412;
        g.fillStyle = 'rgba(60,30,10,.35)'; g.beginPath(); g.arc(x + 1.5, y + 1.5, 5.5, 0, 7); g.fill();
        g.fillStyle = '#b8914a'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
      }
      g.font = `bold 300px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.fillStyle = 'rgba(70,35,10,.5)'; g.fillText(ch, c + 6, c + 22);
      g.strokeStyle = '#c9a045'; g.lineWidth = 11; g.strokeText(ch, c, c + 16);
      g.strokeStyle = 'rgba(255,236,170,.6)'; g.lineWidth = 3; g.strokeText(ch, c - 1, c + 14);
      g.fillStyle = col; g.fillText(ch, c, c + 16);
      g.fillStyle = 'rgba(255,240,210,.14)'; g.fillText(ch, c - 3, c + 12);
    }));
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
      g.font = `bold 250px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = red ? 'rgba(236,206,140,.075)' : 'rgba(236,206,140,.065)'; g.fillText(XQ.NAMES[s][pt], c, c + 14);
    }));
  }
  const faceGeo = new THREE.CircleGeometry(0.4, 40); faceGeo.rotateX(-Math.PI / 2); faceGeo.userData.keep = true;
  const bandGeo = new THREE.CylinderGeometry(0.4222, 0.4222, 0.026, Core.quality === 'high' ? 40 : 28, 1, true); bandGeo.userData.keep = true;
  function makePiece(p) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(pieceGeo, pieceWood);
    body.castShadow = true; body.receiveShadow = true;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: p.h ? backTex(p.s, p.pt) : faceTex(p.s, p.t), transparent: true, roughness: p.h ? 0.32 : 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
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
    face.material.map = p.h ? backTex(p.s, p.pt) : faceTex(p.s, p.t);
    face.material.roughness = p.h ? 0.32 : 0.5;
    face.material.needsUpdate = true;
    m.userData.t = p.h ? 'h' : p.t; m.userData.h = !!p.h;
  }

  const pieces = new Map(); // id -> mesh
  const piecesRoot = new THREE.Group(); root.add(piecesRoot);
  function setPosition(game) {
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
  }

  // ---------- 兵法：甲片（一片 = 1 点生命）、金星（每升一级一颗）、拒马木桩、鸿门宴、涣散 ----------
  const plateGeo = new THREE.BoxGeometry(0.105, 0.07, 0.03); plateGeo.userData.keep = true;
  // 甲片：乌铁鳞甲（在木、银、金、玉各种棋身上都看得清）
  const plateOn = new THREE.MeshStandardMaterial({ color: 0x5d6a78, metalness: 0.75, roughness: 0.28, emissive: 0x10141a });
  const plateOff = new THREE.MeshStandardMaterial({ color: 0x3b3633, metalness: 0.1, roughness: 0.9 });
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
  // 棋身按等级换材质：一级木、二级白银、三级黄金、四级翡翠金镶玉（金属需要环境反光，临时做一张暖色天光图）
  let envTex = null, lvMats = null;
  function levelMats() {
    if (lvMats) return lvMats;
    try {
      const eq = canvasTex(256, 128, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#fff6e2'); gr.addColorStop(0.38, '#f3dfb6'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(0.56, '#a88d68'); gr.addColorStop(1, '#3b2c1e');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) { const x = (i + 0.3) * w / 5, y = h * 0.22; const rg = g.createRadialGradient(x, y, 0, x, y, 14); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x - 14, y - 14, 28, 28); }
      });
      eq.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(Core.renderer);
      envTex = pm.fromEquirectangular(eq).texture; pm.dispose();
    } catch (e) { envTex = null; }
    const jadeTex = canvasTex(256, 256, (g, w) => {
      const gr = g.createLinearGradient(0, 0, w, w); gr.addColorStop(0, '#3fa078'); gr.addColorStop(0.5, '#2f8a63'); gr.addColorStop(1, '#3a9c72');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 26; i++) { g.globalAlpha = 0.08 + rnd() * 0.16; g.fillStyle = rnd() < 0.6 ? '#bfeed4' : '#14533a'; g.beginPath(); g.ellipse(rnd() * w, rnd() * w, 10 + rnd() * 50, 4 + rnd() * 16, rnd() * 3, 0, 7); g.fill(); }
      g.globalAlpha = 0.25; g.strokeStyle = '#e8fff2'; g.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * w; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    });
    const e = envTex ? { envMap: envTex } : {};
    lvMats = {
      2: new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: envTex ? 0.9 : 0.35, roughness: 0.28, envMapIntensity: 1.05, ...e }),
      3: new THREE.MeshStandardMaterial({ color: 0xf2c25a, metalness: envTex ? 0.92 : 0.45, roughness: 0.24, envMapIntensity: 1.15, emissive: 0x2a1700, ...e }),
      4: new THREE.MeshStandardMaterial({ map: jadeTex, color: 0xffffff, metalness: 0.05, roughness: 0.16, envMapIntensity: 0.7, emissive: 0x06281a, emissiveIntensity: 0.6, ...e }),
    };
    lvMats.gold = new THREE.MeshStandardMaterial({ color: 0xf0c050, metalness: envTex ? 0.95 : 0.5, roughness: 0.22, envMapIntensity: 1.2, ...e });
    return lvMats;
  }
  const inlayGeo = new THREE.TorusGeometry(0.4, 0.017, 6, 48); inlayGeo.rotateX(Math.PI / 2); inlayGeo.userData.keep = true;
  function decorate(m, p, o = {}) {
    if (m.userData.deco) { m.remove(m.userData.deco); m.userData.deco = null; }
    const face = m.children[1];
    if (face && face.material) face.material.color.set(o.dim ? 0x8f8a84 : 0xffffff);
    const body = m.children[0];
    if (!p || !p.lv) { if (body) body.material = pieceWood; return; }
    const d = new THREE.Group(); m.add(d); m.userData.deco = d;
    const max = BF.hpOf(p.t, p.lv);
    // 棋身材质：一级木、二级白银、三级黄金、四级翡翠金镶玉
    if (body) body.material = p.lv >= 2 ? levelMats()[Math.min(4, p.lv)] : pieceWood;
    if (p.lv >= 4) { const L = levelMats(); for (const y of [PH - 0.012, 0.03]) { const ri = new THREE.Mesh(inlayGeo, L.gold); ri.position.y = y; d.add(ri); } }
    // 腰带甲片 = 攒下的击杀数（每片抵下次升级 1 功，升级时用掉）
    const nx = Math.min(8, p.xp || 0);
    for (let i = 0; i < nx; i++) {
      const a = (i - (nx - 1) / 2) * 0.36;
      const pl = new THREE.Mesh(plateGeo, plateOn);
      pl.position.set(Math.sin(a) * 0.432, PH * 0.6, Math.cos(a) * 0.432); pl.rotation.y = a;
      pl.userData.plate = i; d.add(pl);
    }
    if (p.lv >= 2) {
      const tx = hpTex(p.hp, max, p.s), sc = (window.innerWidth <= 760 ? 1.25 : 1) * 0.0028;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
      sp.scale.set(tx.userData.w * sc, tx.userData.h * sc, 1); sp.position.y = PH + 0.34; sp.renderOrder = 6;
      sp.userData.hpBar = { hp: p.hp, max }; d.add(sp);
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
      const rope = new THREE.Mesh(ropeGeo, ropeMat); rope.scale.setScalar(0.92); rope.position.y = PH * 0.5; d.add(rope);
    }
  }
  function decoOpts(game, p) {
    const fx = game.fx;
    return { jm: game.jmActive(p), hm: p.s === 'r' && p.t === 'k' && fx.hm > 0, dim: p.s === 'b' && p.t !== 'k' && fx.sm > 0 };
  }
  function decorateAll(game) {
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
      if (game.bf) decorate(m, p, decoOpts(game, p));
    }
  }
  // 棋子朝向：让字朝向当前观看方
  function faceViewer(side) {
    for (const m of pieces.values()) m.rotation.y = side === 'b' ? Math.PI : 0;
    Board.viewSide = side;
    waterMat.uniforms.uBoard.value.z = side === 'b' ? 1 : 0;
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
  let selRing = null, selGlow = null, selShade = null, selCol = null, selHalo = null, selDrop = null, hovered = null, kills = [], killRings = [], hoverT = 0;
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
      if (occupied) {
        if (!hints) continue;
        const d = decal(ringTex, 0xb0301f, 1.14, X(f), Z(r), TOP + 0.006, 0.95);
        markRoot.add(d); killRings.push(d);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: killTex, transparent: true, depthWrite: false, depthTest: false }));
        sp.position.set(X(f), TOP + PH + 0.75, Z(r));
        sp.renderOrder = 20;
        sp.userData.ph = Math.random() * 6;
        markRoot.add(sp); kills.push(sp);
      } else {
        markRoot.add(decal(dotTex, 0x2c332b, 0.3, X(f), Z(r), TOP + 0.005, 0.72));
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
  function clearMoves(immediate = true) {
    if (hovered) {
      if (immediate) { hovered.position.y = TOP; hovered.rotation.x = hovered.rotation.z = 0; }
      else dropping.add(hovered);
      hovered = null;
    }
    if (immediate) { for (const m of dropping) { m.position.y = TOP; m.rotation.x = m.rotation.z = 0; } dropping.clear(); }
    markRoot.traverse(o => { if (o.material && o.material !== goldM) o.material.dispose(); });
    markRoot.clear(); selRing = selGlow = selShade = selCol = selHalo = selDrop = null; kills = []; killRings = [];
  }
  Core.onFrame(dt => {
    hoverT += dt;
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
      // 呼吸：淡入—停留—淡出—隐去，周而复始
      const ph = ((hoverT * 0.62 + k.userData.ph / 6.28) % 1);
      const b = ph < 0.35 ? ph / 0.35 : ph < 0.6 ? 1 : ph < 0.85 ? 1 - (ph - 0.6) / 0.25 : 0;
      const e = b * b * (3 - 2 * b);
      k.material.opacity = e;
      const s = 0.66 + 0.12 * e; k.scale.set(s, s, 1);
      k.position.y = TOP + PH + 0.4 + e * 0.1;
    }
    for (const r of killRings) { const b = 0.5 + 0.5 * Math.sin(hoverT * 3.8); r.material.opacity = 0.55 + 0.45 * b; r.rotation.y -= dt * 0.5; }
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

  return {
    root, TOP, PH, HALF, X, Z, pos, setPosition, pieces, piecesRoot, makePiece, faceViewer,
    showMoves, clearMoves, showZone, setGlow, showLast, pick, meshAt, get hovered() { return hovered; }, ringTex, glowTex, wakes, water, waterMat, decal, flatGeo, pine, deco, FONT,
    viewSide: 'r', pieceWood, RZ, BZ, BX, BRIDGE_X, faceTex, backTex, setFace, makeRiver, mtTex, decorate, decorateAll, reconcile, plateGeo, plateOn,
  };
})();
