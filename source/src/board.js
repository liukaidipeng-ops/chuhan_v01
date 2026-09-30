// ===== 棋盘、棋子、楚河汉界流水、水墨山水 =====
const Board = (() => {
  const { scene, toon, inked, canvasTex, rnd, inkBlot, Tex } = Core;
  const TOP = 0.25, PH = 0.2, HALF = 0.24, RZ = 0.62, BX = 4.75, BZ = RZ + 4 + 0.75;
  const X = f => f - 4;
  const Z = r => (r <= 4 ? RZ + (4 - r) : -(RZ + (r - 5)));
  const pos = (f, r, y = TOP) => new THREE.Vector3(X(f), y, Z(r));
  const root = new THREE.Group();
  scene.add(root);

  // ---------- 棋盘面（木纹 + 墨线） ----------
  const PPU = 170;
  const FONT = '"KaiTi","STKaiti","Kaiti SC","楷体","BiauKai","Noto Serif CJK SC","Songti SC",serif';
  function drawHalf(isRed) {
    const zmin = isRed ? HALF : -BZ, zmax = isRed ? BZ : -HALF;
    const W = Math.round(2 * BX * PPU), H = Math.round((zmax - zmin) * PPU);
    return canvasTex(W, H, (g) => {
      // 木底
      const grd = g.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, '#d9b47c'); grd.addColorStop(1, '#c99d62');
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
      // 边角题字印章
      g.save();
      g.translate(isRed ? W - 90 : 90, isRed ? H - 34 : 34);
      if (!isRed) g.rotate(Math.PI);
      g.fillStyle = 'rgba(170,40,26,.85)'; g.fillRect(-26, -26, 52, 52);
      g.fillStyle = '#f3e6cc'; g.font = `bold 38px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(isRed ? '漢' : '楚', 0, 2);
      g.restore();
    });
  }
  const woodSide = new THREE.MeshStandardMaterial({ map: Tex.wood, color: 0x8a5a30, roughness: 0.7 });
  function makeHalf(isRed) {
    const depth = BZ - HALF;
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(2 * BX, 0.55, depth), woodSide);
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
        float h = sin(p.x*2.1 - uTime*2.4)*0.012 + sin(p.x*3.7 + p.y*5.0 - uTime*3.1)*0.008;
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
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
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
            float ring = sin(d*26.0 - uTime*9.0) * exp(-d*2.2) * w.w;
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
  Core.onFrame(dt => { waterMat.uniforms.uTime.value += dt; });
  // 结算场景用的河（无字、自定义河岸）
  function makeRiver(len, width, centerZ, deep, light) {
    const m = waterMat.clone();
    m.uniforms.uRiver.value.set(centerZ, width / 2, 0, 0);
    if (deep) m.uniforms.uDeep.value.set(deep);
    if (light) m.uniforms.uLight.value.set(light);
    Core.onFrame(dt => { m.uniforms.uTime.value += dt; });
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
    Core.onFrame(dt => { s.position.x += s.userData.v * dt; if (s.position.x > 40) s.position.x = -40; });
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
    return (faceCache[key] = canvasTex(256, 256, (g, w) => {
      g.clearRect(0, 0, w, w);
      // 刻痕圈
      g.strokeStyle = 'rgba(60,30,10,.55)'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2 + 2, w / 2 + 2, w * 0.42, 0, 7); g.stroke();
      g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w * 0.42, 0, 7); g.stroke();
      g.font = `bold 158px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(70,35,10,.55)'; g.fillText(ch, w / 2 + 3, w / 2 + 11);
      g.fillStyle = col; g.fillText(ch, w / 2, w / 2 + 8);
      g.fillStyle = 'rgba(255,240,210,.18)'; g.fillText(ch, w / 2 - 2, w / 2 + 6);
    }));
  }
  const faceGeo = new THREE.CircleGeometry(0.4, 40); faceGeo.rotateX(-Math.PI / 2); faceGeo.userData.keep = true;
  function makePiece(p) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(pieceGeo, pieceWood);
    body.castShadow = true; body.receiveShadow = true;
    const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: faceTex(p.s, p.t), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.position.y = PH + 0.001;
    g.add(body, face);
    g.userData = { id: p.id, s: p.s, t: p.t };
    // 面向本方：黑方棋子旋转180°
    g.rotation.y = p.s === 'b' ? Math.PI : 0;
    return g;
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
  // 选中：灰绿圈 + 棋子悬浮；可吃目标：底部朱圈 + 头顶呼吸闪烁的"殺"
  const killTex = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    const gr = g.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,220,190,.55)'); gr.addColorStop(0.55, 'rgba(200,60,30,.18)'); gr.addColorStop(1, 'rgba(200,60,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.font = `bold 170px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = 'rgba(30,12,8,.85)'; g.strokeText('殺', w / 2, w / 2 + 10);
    g.fillStyle = '#c8321e'; g.fillText('殺', w / 2, w / 2 + 10);
    g.fillStyle = 'rgba(255,200,160,.35)'; g.fillText('殺', w / 2 - 3, w / 2 + 6);
  });
  const glowTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const SEL_COL = 0x7f927c;
  let selRing = null, selGlow = null, hovered = null, kills = [], hoverT = 0;
  const dropping = new Set();
  function showMoves(sel, moves, hints = true) {
    clearMoves(false);
    if (sel) {
      selGlow = decal(glowTex, SEL_COL, 1.35, X(sel[0]), Z(sel[1]), TOP + 0.005, 0.55);
      selRing = decal(ringTex, SEL_COL, 1.18, X(sel[0]), Z(sel[1]), TOP + 0.007, 0.95);
      markRoot.add(selGlow, selRing);
      hovered = meshAt(sel[0], sel[1]);
      if (hovered) dropping.delete(hovered);
      hoverT = 0;
    }
    for (const m of moves) {
      const [f, r] = m.to;
      const occupied = !!meshAt(f, r);
      if (occupied) {
        if (!hints) continue;
        const d = decal(ringTex, 0xb0301f, 1.12, X(f), Z(r), TOP + 0.006, 0.95);
        markRoot.add(d);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: killTex, transparent: true, depthWrite: false, depthTest: false }));
        sp.position.set(X(f), TOP + PH + 0.62, Z(r));
        sp.renderOrder = 20;
        sp.userData.ph = Math.random() * 6;
        markRoot.add(sp); kills.push(sp);
      } else {
        markRoot.add(decal(dotTex, 0x2c332b, 0.3, X(f), Z(r), TOP + 0.005, 0.72));
      }
    }
  }
  // immediate=true：立即落回棋盘（走子时用）
  function clearMoves(immediate = true) {
    if (hovered) {
      if (immediate) { hovered.position.y = TOP; hovered.rotation.x = hovered.rotation.z = 0; }
      else dropping.add(hovered);
      hovered = null;
    }
    if (immediate) { for (const m of dropping) { m.position.y = TOP; m.rotation.x = m.rotation.z = 0; } dropping.clear(); }
    markRoot.clear(); selRing = selGlow = null; kills = [];
  }
  Core.onFrame(dt => {
    hoverT += dt;
    if (selRing) { selRing.rotation.y += dt * 0.8; selGlow.material.opacity = 0.4 + 0.15 * Math.sin(hoverT * 3); }
    if (hovered) {
      const ty = TOP + 0.5 + Math.sin(hoverT * 2.4) * 0.04;
      hovered.position.y += (ty - hovered.position.y) * (1 - Math.exp(-dt * 12));
      hovered.rotation.x = Math.sin(hoverT * 1.7) * 0.04; hovered.rotation.z = Math.cos(hoverT * 1.3) * 0.04;
    }
    for (const m of dropping) {
      m.position.y += (TOP - m.position.y) * (1 - Math.exp(-dt * 16));
      m.rotation.x *= 0.8; m.rotation.z *= 0.8;
      if (Math.abs(m.position.y - TOP) < 0.003) { m.position.y = TOP; m.rotation.x = m.rotation.z = 0; dropping.delete(m); }
    }
    for (const k of kills) {
      const b = 0.5 + 0.5 * Math.sin(hoverT * 3.4 + k.userData.ph);
      k.material.opacity = 0.22 + 0.78 * b * b;
      const s = 0.78 + 0.2 * b; k.scale.set(s, s, 1);
      k.position.y = TOP + PH + 0.72 + b * 0.1;
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

  return {
    root, TOP, PH, HALF, X, Z, pos, setPosition, pieces, piecesRoot, makePiece, faceViewer,
    showMoves, clearMoves, showLast, pick, meshAt, get hovered() { return hovered; }, ringTex, glowTex, wakes, water, waterMat, decal, flatGeo, pine, deco, FONT,
    viewSide: 'r', pieceWood, RZ, faceTex, makeRiver, mtTex,
  };
})();
