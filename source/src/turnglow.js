// ===== 轮到谁走：自家半场的格线闪（美术 M9，Ham 10-09 定了两种，放进设置）=====
// 「河岸」：只有靠河那一条横线闪。「涌动」：整个半场的格线常亮一层淡光，一道亮光从底线推到河边，一遍一遍。
// 平时 1.5 秒一下（亮得快、暗得慢）；读秒时跟头像牌的朱框同一个节拍硬闪（beat 秒一下）。
//
// 用法（TD 接）：
//   TurnGlow.set(side, mode, beat)
//     side：'r' / 'b' / null —— 轮到谁；null 不亮（开局喊话、终局之后、没在对局里）
//     mode：'bank' / 'wave' / 'off' —— 设置里选的
//     beat：读秒时这一拍的秒数（和头像牌 --beat 同一个数），平时传 0 或不传
//   每次状态变了调一次就行，重复调用同样的参数没有开销。动画自己跑在 Core.onFrame 里。
const TurnGlow = (() => {
  const { scene } = Core;
  const TOP = Board.TOP, HALF = Board.HALF, X = Board.X, Z = Board.Z;
  // 下面几个数和 board.js 的 drawHalf 一致（棋盘半场的范围、外框离格线的距离）
  const BX = 4.75, BZ = 0.62 + 4 + 1.2, PAD = 0.17, DEPTH = BZ - HALF, PPU = 110;

  // 一张只有发光线的贴图：外晕、线身、线芯三遍
  function lineTex(isRed, kind) {
    const zmin = isRed ? HALF : -BZ, W = Math.round(2 * BX * PPU), H = Math.round(DEPTH * PPU);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const cx = x => (x + BX) * PPU, cy = z => (z - zmin) * PPU;
    const ranks = isRed ? [0, 1, 2, 3, 4] : [5, 6, 7, 8, 9];
    const edgeZ = isRed ? Z(0) : Z(9), innerZ = isRed ? Z(4) : Z(5), zOut = isRed ? edgeZ + PAD : edgeZ - PAD;
    const S = []; const L = (x1, z1, x2, z2, w = 1) => S.push([cx(x1), cy(z1), cx(x2), cy(z2), w]);
    if (kind === 'bank') L(X(0) - PAD, innerZ, X(8) + PAD, innerZ, 1.8);
    else {
      for (const r of ranks) L(X(0), Z(r), X(8), Z(r));
      for (let f = 0; f < 9; f++) L(X(f), Z(ranks[0]), X(f), Z(ranks[4]));
      const pr = isRed ? [0, 2] : [9, 7];
      L(X(3), Z(pr[0]), X(5), Z(pr[1])); L(X(5), Z(pr[0]), X(3), Z(pr[1]));
      L(X(0) - PAD, zOut, X(8) + PAD, zOut, 1.6); L(X(0) - PAD, zOut, X(0) - PAD, innerZ, 1.6); L(X(8) + PAD, zOut, X(8) + PAD, innerZ, 1.6);
      // 炮位兵位的折角
      const marks = isRed ? [[1, 2], [7, 2], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3]] : [[1, 7], [7, 7], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]];
      const d = 12 * PPU / 170, l = 26 * PPU / 170;
      for (const [f, r] of marks) { const x = cx(X(f)), y = cy(Z(r));
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) { if ((f === 0 && sx < 0) || (f === 8 && sx > 0)) continue;
          S.push([x + sx * d, y + sy * (d + l), x + sx * d, y + sy * d, 0.8]); S.push([x + sx * d, y + sy * d, x + sx * (d + l), y + sy * d, 0.8]); } }
    }
    g.lineCap = 'round'; g.lineJoin = 'round';
    const k = PPU / 120;
    const pass = (col, lw, blur) => { g.strokeStyle = col; g.shadowColor = blur ? col : 'transparent'; g.shadowBlur = blur * k;
      for (const [a, b, c, e, w] of S) { g.lineWidth = lw * w * k; g.beginPath(); g.moveTo(a, b); g.lineTo(c, e); g.stroke(); } };
    pass('rgba(214,52,30,.45)', 14, 22);   // 外晕
    pass('rgba(226,64,36,.95)', 6, 6);     // 线身（界面的朱红，提亮一点，木色上才跳得出来）
    pass('rgba(255,196,150,.9)', 1.6, 0);  // 线芯
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 8;
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
    // 贴图上下方向里，底线和河边各在哪（给「涌动」算亮光的位置）
    const v = z => 1 - (z - zmin) / DEPTH;
    return { tex: t, vBase: v(zOut), vRiver: v(innerZ) };
  }

  // 材质：贴图 × 亮度；「涌动」再乘一道沿着半场纵向移动的亮带
  function makeMat(T) {
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: T.tex }, uA: { value: 0 }, uBase: { value: 0.22 }, uPos: { value: 0 }, uW: { value: 0.16 }, uWave: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D map; uniform float uA, uBase, uPos, uW, uWave; varying vec2 vUv;',
        'void main(){',
        '  vec4 c = texture2D(map, vUv);',
        '  float band = 1.0 - smoothstep(0.0, uW, abs(vUv.y - uPos));',
        '  float k = mix(uA, uA * (uBase + (1.0 - uBase) * band), uWave);',
        '  gl_FragColor = vec4(c.rgb, c.a * k);',
        '  #include <colorspace_fragment>',
        '}'].join('\n'),
      transparent: true, depthWrite: false, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
  }

  const layers = {};   // 'r_bank'、'r_grid'、'b_bank'、'b_grid'，用到才建
  function layer(side, kind) {
    const key = side + '_' + kind; if (layers[key]) return layers[key];
    const T = lineTex(side === 'r', kind), mat = makeMat(T);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * BX, DEPTH), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(0, TOP + 0.0045, side === 'r' ? HALF + DEPTH / 2 : -(HALF + DEPTH / 2));
    m.renderOrder = 2; m.visible = false; m.frustumCulled = false;
    scene.add(m);
    return (layers[key] = { mesh: m, mat, T });
  }

  let side = null, mode = 'off', beat = 0, phase = 0, cur = null;
  function set(s, md, b) {
    s = s === 'r' || s === 'b' ? s : null; md = md === 'bank' || md === 'wave' ? md : 'off'; b = +b > 0 ? +b : 0;
    const want = s && md !== 'off' ? layer(s, md === 'bank' ? 'bank' : 'grid') : null;
    if (want !== cur) { if (cur) cur.mesh.visible = false; cur = want; phase = 0; if (cur) { cur.mesh.visible = true; cur.mat.uniforms.uA.value = 0; } }
    if ((b > 0) !== (beat > 0)) phase = 0;   // 进出读秒时从一拍的开头起
    side = s; mode = md; beat = b;
  }
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  Core.onFrame(dt => {
    if (!cur) return;
    const hard = beat > 0, T = hard ? beat : 1.5;
    phase = (phase + Math.min(dt, 0.1) / T) % 1;
    const u = cur.mat.uniforms, p = phase, lo = 0.1;
    if (mode === 'wave') {
      const t = cur.T;
      u.uWave.value = 1; u.uW.value = Math.abs(t.vRiver - t.vBase) * 0.22;
      u.uPos.value = reduce ? (t.vBase + t.vRiver) / 2 : t.vBase + (t.vRiver - t.vBase) * p;
      u.uBase.value = hard ? (p < 0.5 ? 0.55 : 0.15) : 0.22;
      u.uA.value = reduce ? 0.6 : 1;
    } else {
      u.uWave.value = 0;
      u.uA.value = reduce ? 0.85 : hard ? (p < 0.5 ? 1 : 0.08) : p < 0.14 ? lo + (1 - lo) * (p / 0.14) : lo + (1 - lo) * Math.pow(1 - (p - 0.14) / 0.86, 2.2);
    }
  });
  return { set, get side() { return side; }, get mode() { return mode; } };
})();
