// ===== 渲染核心：场景、时间轴、镜头、贴图、水墨材质 =====
const INK = {
  paper: 0xe9dfc9, paperDark: 0xd6c8aa, ink: 0x1b1a19, ink2: 0x3a3836, ink3: 0x6b6862,
  red: 0xb0301f, redDeep: 0x7e1e14, gold: 0xc9a045, skin: 0xdcc6a2, wood: 0x9a6a3c,
};

const Core = (() => {
  const canvas = document.getElementById('gl');
  // 画质档位：手机/低端设备自动降级
  const isMobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let quality = 'high', userQ = false;
  // 浏览器到底用没用显卡：硬件加速关了（或者显卡被浏览器拉黑）时，画图全靠 CPU 软算，再好的电脑也会非常卡。
  // 先用一个小画布问一下显卡名字；软算的话，没自己选过画质的人直接从「低」开始
  const GPU = (() => { try { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); if (!gl) return ''; const e = gl.getExtension('WEBGL_debug_renderer_info'), n = String(gl.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); const L = gl.getExtension('WEBGL_lose_context'); L && L.loseContext(); return n; } catch (e) { return ''; } })();
  const softGL = /swiftshader|llvmpipe|softpipe|basic render|software/i.test(GPU);
  try { const q = localStorage.getItem('xq3d-quality'); if (q) { quality = JSON.parse(q); userQ = true; } else if (isMobile) quality = 'mid'; } catch (e) { if (isMobile) quality = 'mid'; }
  if (softGL && !userQ) quality = 'low';
  // 排查用的开关（网址后面加，例如 ?noaa&lowp）：noaa 关多重采样抗锯齿，lowp 不点名要独立显卡。10-09 查 Ham 电脑上窗口卡死用
  const DIAG = new URLSearchParams(location.search);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low' && !DIAG.has('noaa'), powerPreference: DIAG.has('lowp') ? 'default' : 'high-performance' });
  // 像素比：按画质封顶，再按“整张画布最多多少像素”封顶。大屏、高分屏全屏时画布能有上千万像素（还带多重采样），
  //   显卡（尤其集成显卡）吃不消，会拖累整台电脑（10-09 Ham：高配电脑卡、拖成独立窗口时所有软件都卡住）
  const PX_BUDGET = { high: 3.7e6, mid: 2.4e6, low: 1.4e6 };
  const prFor = q => {
    const cap = q === 'high' ? 2 : q === 'mid' ? 1.5 : 1, area = Math.max(1, window.innerWidth * window.innerHeight);
    return Math.max(0.75, Math.min(window.devicePixelRatio || 1, cap, Math.sqrt((PX_BUDGET[q] || PX_BUDGET.mid) / area)));
  };
  renderer.localClippingEnabled = true;
  renderer.debug.checkShaderErrors = false;   // 线上不查着色器报错：查一次要同步等显卡编完，第一次画东西时会卡
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK.paper);
  scene.fog = new THREE.Fog(INK.paper, 26, 120);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 320);   // 近裁面别太近：手机（尤其安卓）深度精度低，太近会让贴着棋盘的各层互相打架、闪烁

  const hemi = new THREE.HemisphereLight(0xfff6e6, 0x8a7a66, 1.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
  sun.position.set(-6, 14, 7);
  sun.castShadow = quality !== 'low';
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // 窗口大小变了：重新分配画布（显卡上一整块内存）。拖动窗口、把标签拖成独立窗口时 resize 一秒几十次，
  //   每次都重新分配会把显卡拖垮（整台电脑卡住、窗口发白）。所以等窗口停下来 0.2 秒再一次性分配；这期间画面先拉伸着显示。
  //   尺寸和像素比都没变就不动（给 canvas.width 赋同样的值也会清空重分配）
  function resize() {
    const w = window.innerWidth, h = window.innerHeight, pr = prFor(quality);
    const c = renderer.domElement, size = renderer.getSize(new THREE.Vector2());
    if (c.width !== Math.floor(w * pr) || c.height !== Math.floor(h * pr) || size.x !== w || size.y !== h) renderer.setDrawingBufferSize(w, h, pr);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : 42;
    camera.updateProjectionMatrix();
    try { if (!Cam.cine) Cam.radius = Cam.view ? Cam.fitTop() : Cam.fitRadius(); } catch (e) { /* 初始化时 Cam 尚未定义 */ }
  }
  let resizeT = 0;
  const resizeSoon = () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 200); };
  window.addEventListener('resize', resizeSoon);
  // 拖到另一块屏幕（像素比变了）也要重算
  (function watchDpr() { try { const m = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); m.addEventListener('change', () => { resizeSoon(); watchDpr(); }, { once: true }); } catch (e) { } })();
  resize();

  // ---------- 时间与补间 ----------
  const Time = { scale: 1, t: 0, skip: false, boost: 1 };
  const updaters = new Set();
  const onFrame = fn => { updaters.add(fn); return () => updaters.delete(fn); };
  const ease = {
    linear: x => x,
    inOut: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    sine: x => (1 - Math.cos(Math.PI * x)) / 2,   // 比 inOut 更柔：起步、收尾都很缓
    out: x => 1 - Math.pow(1 - x, 3),
    in: x => x * x * x,
    outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };
  function tween(dur, fn, e = ease.inOut) {
    return new Promise(res => {
      let t = 0;
      if (dur <= 0) { fn(1, 1); res(); return; }
      const u = dt => {
        t += dt;
        const k = Math.min(1, t / dur);
        fn(e(k), k);
        if (k >= 1) { updaters.delete(u); res(); }
      };
      fn(0, 0);
      updaters.add(u);
    });
  }
  const sleep = d => tween(d, () => {}, ease.linear);

  // ---------- 镜头 ----------
  const Cam = {
    target: new THREE.Vector3(0, 0, 0.2),
    home0: new THREE.Vector3(0, 0, 0.2),
    theta: 0, phi: 0.72, radius: 14.5,
    homeTheta: 0,
    view: 0,   // 视角三档（美术 M11，Ham 定的名字）：0 沙盘（斜着看，能转能拖能缩放）/ 1 俯瞰（正上方，能拖能缩放、不能转）/ 2 定盘（正上方，锁住）
    cine: false,
    pos: new THREE.Vector3(), look: new THREE.Vector3(),
    shakeAmp: 0,
    orbitPos() {
      const p = new THREE.Vector3(
        Math.sin(this.theta) * Math.sin(this.phi),
        Math.cos(this.phi),
        Math.cos(this.theta) * Math.sin(this.phi)).multiplyScalar(this.radius).add(this.target);
      return p;
    },
    // snap = false：不跳过去，像转盘一样把棋盘转到这一边——慢慢加速、慢慢减速（Ham 10-10：本地双人换边转得太猛）
    //   转的时候 spinning = true，棋子的朝向跟着 theta 一起转（Board.faceViewer 第二个参数），字一直是正的
    setSide(side, snap = true, dur = 1.4) {
      this.homeTheta = side === 'b' ? Math.PI : 0;
      const th = this.homeTheta, phi = this.view ? 0.001 : 0.72;   // 正上方时 phi 不能是 0（lookAt 会翻）
      const rad = this.view ? this.fitTop() : this.fitRadius();
      const id = this.spinId = (this.spinId || 0) + 1;
      if (snap) { this.spinning = false; this.theta = th; this.phi = phi; this.target.copy(this.home0); this.radius = rad; this.pos.copy(this.orbitPos()); this.look.copy(this.target); this.upTh = this.theta; return Promise.resolve(); }
      const th0 = this.theta, ph0 = this.phi, r0 = this.radius, t0 = this.target.clone();
      let d = th - th0; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.spinning = Math.abs(d) > 0.01;
      return tween(this.spinning ? dur : 0.6, k => {
        if (this.spinId !== id) return;
        this.theta = th0 + d * k; this.upTh = this.theta;
        this.phi = ph0 + (phi - ph0) * k; this.radius = r0 + (rad - r0) * k; this.target.lerpVectors(t0, this.home0, k);
      }, ease.sine).then(() => { if (this.spinId === id) { this.theta = th; this.upTh = th; this.spinning = false; } });
    },
    setView(v, side) { this.view = v; this.setSide(side, false); },
    homeDir() { return new THREE.Vector3(Math.sin(this.homeTheta), 0, Math.cos(this.homeTheta)); },
    // 按屏幕宽高比算出能完整看到棋盘宽度的距离（竖屏手机会自动拉远）
    fitRadius() {
      const a = window.innerWidth / window.innerHeight;
      const hh = Math.atan(Math.tan(camera.fov * Math.PI / 360) * a);
      return Math.max(14.5, 5.4 / Math.tan(hh) + 3.5);
    },
    // 正上方看时，能看全整张棋盘（含边框，留一点边）的距离
    fitTop() {
      const v = Math.tan(camera.fov * Math.PI / 360), a = window.innerWidth / window.innerHeight;
      return Math.max(6.9 / v, 5.6 / (v * a));
    },
    // 平滑移动到某个机位
    async to(pos, look, dur = 1, e = ease.inOut, force = false) {
      // 俯瞰 / 定盘（正上方看）时不跟特写镜头跑：只等同样长的时间（演出节奏不变），镜头不动。终局的镜头（force）照走
      //   （10-09 Ham：顶视图吃子的时候非常晃）
      if (this.view && !force) return tween(dur, () => { }, e);
      this.cine = true;
      const id = this.moveId = (this.moveId || 0) + 1;
      const p0 = this.pos.clone(), l0 = this.look.clone();
      await tween(dur, k => { if (this.moveId !== id) return; this.pos.lerpVectors(p0, pos, k); this.look.lerpVectors(l0, look, k); }, e);
    },
    async home(dur = 1) {
      const p = this.orbitPos();
      await this.to(p, this.target.clone(), dur);
      this.cine = false;
    },
    shake(a) { this.shakeAmp = Math.max(this.shakeAmp, this.view ? a * 0.2 : a); },   // 正上方看时震屏只留两成
    // 平移：沿屏幕的左右 / 前后在地面上挪动注视点（dx、dy 是屏幕像素）
    panBy(dx, dy) {
      const k = this.radius * 0.0016, c = Math.cos(this.theta), s = Math.sin(this.theta);
      this.target.x += (-dx * c - dy * s) * k; this.target.z += (dx * s - dy * c) * k;
      this.target.x = Math.max(-9, Math.min(9, this.target.x)); this.target.z = Math.max(-10, Math.min(10.4, this.target.z));
    },
    get panned() { return Math.hypot(this.target.x - this.home0.x, this.target.z - this.home0.z) > 0.12; },
    update(dt) {
      if (!this.cine) {
        const p = this.orbitPos();
        this.pos.lerp(p, 1 - Math.exp(-dt * 10));
        this.look.lerp(this.target, 1 - Math.exp(-dt * 10));
      }
      camera.position.copy(this.pos);
      const lk = this.lk || (this.lk = new THREE.Vector3()); lk.copy(this.look);
      if (this.shakeAmp > 0.001) {
        const a = this.shakeAmp;
        const sx = (Math.random() - 0.5) * a, sy = (Math.random() - 0.5) * a, sz = (Math.random() - 0.5) * a;
        // 正上方看（俯瞰 / 定盘）：镜头和注视点一起挪 = 整个画面平移一下，不转、不歪
        //   （10-09 Ham：顶视图进攻时抖得剧烈又不自然——原来只挪镜头不挪注视点，正上方往下看时一点点偏移就让画面整个转几十度）
        if (this.view && !this.cine) { camera.position.x += sx; camera.position.z += sz; lk.x += sx; lk.z += sz; }
        else { camera.position.x += sx; camera.position.y += sy; camera.position.z += sz; }
        this.shakeAmp *= Math.exp(-dt * 7);
      }
      // 镜头的“上方”：正上方往下看时，竖直方向和视线平行，lookAt 定不出画面朝向，只能靠水平方向那一点点偏移去猜，
      // 稍一抖就整盘转。所以正上方看时用“我方在下、对方在上”的方向当上方（翻转时转过去而不是跳过去）；斜着看还是竖直向上
      let dth = this.theta - (this.upTh ?? this.theta); dth = Math.atan2(Math.sin(dth), Math.cos(dth));
      this.upTh = (this.upTh ?? this.theta) + dth * (1 - Math.exp(-dt * 8));
      if (this.view) {
        const dx = lk.x - camera.position.x, dy = lk.y - camera.position.y, dz = lk.z - camera.position.z;
        const h = Math.hypot(dx, dz) / (Math.hypot(dx, dy, dz) || 1), k = Math.min(1, Math.max(0, (h - 0.08) / 0.27)), w = k * k * (3 - 2 * k);
        camera.up.set(-Math.sin(this.upTh) * (1 - w), w, -Math.cos(this.upTh) * (1 - w)).normalize();
      } else camera.up.set(0, 1, 0);
      camera.lookAt(lk);
    },
  };

  // 鼠标/触屏 旋转缩放
  (function orbitInput() {
    let drag = null, pinch = null, mid = null, twoF = false;
    // 鼠标中键按住拖动 = 平移画面（挡掉浏览器自带的中键滚动）
    canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('pointerdown', e => {
      if (Cam.spinning) { Cam.spinId++; Cam.spinning = false; }   // 正在转的时候用户自己拖：别跟他抢
      if (e.pointerType === 'mouse' && e.button === 1) { drag = { x: e.clientX, y: e.clientY, moved: 99, id: e.pointerId, pan: true }; try { canvas.setPointerCapture(e.pointerId); } catch (err) { } return; }
      drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }; twoF = false;
    });
    window.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id || Cam.cine) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX; drag.y = e.clientY;
      if (Cam.view === 2) return;   // 定盘：锁住
      if (drag.pan) { Cam.panBy(dx, dy); return; }
      if (Cam.view === 1) { if (drag.moved > 6) Cam.panBy(dx, dy); return; }   // 俯瞰：拖 = 平移，不转
      if (drag.moved > 6) {
        Cam.theta -= dx * 0.005;
        Cam.phi = Math.min(1.35, Math.max(0.25, Cam.phi - dy * 0.004));
      }
    });
    window.addEventListener('pointerup', () => { Core.lastDragMoved = drag ? drag.moved : twoF ? 99 : 0; drag = null; });
    canvas.addEventListener('wheel', e => {
      if (Cam.cine || Cam.view === 2) { e.preventDefault(); return; }
      Cam.radius = Math.min(30, Math.max(7, Cam.radius * (1 + Math.sign(e.deltaY) * 0.08)));
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx = (a.clientX + b.clientX) / 2, cy = (a.clientY + b.clientY) / 2;
        if (pinch && !Cam.cine && Cam.view !== 2) Cam.radius = Math.min(30, Math.max(7, Cam.radius * pinch / d));
        if (mid && !Cam.cine && Cam.view !== 2) Cam.panBy(cx - mid.x, cy - mid.y);      // 双指一起拖 = 平移画面
        pinch = d; mid = { x: cx, y: cy }; drag = null; twoF = true;
      }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { pinch = null; mid = null; });
  })();

  // ---------- 主循环 ----------
  const clock = new THREE.Clock();
  let frameHooks = [];
  // 帧时间（真实的，不封顶）：自动降画质和 ?perf 面板用
  const ft = { n: 0, sum: 0, slow: 0, last: performance.now() };
  let nap = 0;
  function loop() {
    requestAnimationFrame(loop);
    { const t = performance.now(), d = t - ft.last; ft.last = t; if (Core.render && d < 1000) { ft.n++; ft.sum += d; if (d > 40) ft.slow++; } }
    let raw = Math.min(clock.getDelta(), 0.05);
    // 大厅整屏盖着、场景不画的时候（main.js 设 sleepy）：动画每 0.1 秒才推一次——兵营里的小兵、旗子照样在动，
    // 补间照样走完，只是省下九成的脚本时间（手机待在大厅时省电、不发热）
    if (Core.sleepy) { nap += raw; if (nap < 0.1) return; raw = Math.min(nap, 0.15); nap = 0; } else nap = 0;
    const dt = Time.hold ? 0 : raw * (Time.skip ? 14 : Time.scale) * Time.boost;   // hold：暂停，演出全部定住
    Time.t += dt;
    for (const u of Array.from(updaters)) u(dt);
    for (const h of frameHooks) h(dt, raw);
    Cam.update(raw);
    if (Core.render && !held) renderer.render(scene, camera);   // held：换影子开关后，新着色器还在后台编，先停画（不然当场同步编、卡住）
  }

  // ---------- 贴图工具 ----------
  function canvasTex(w, h, draw, opts = {}) {   // opts.read：以后要读它的像素（放在内存里，不放显卡上）
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', opts.read ? { willReadFrequently: true } : undefined);
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (opts.color !== false) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  // 墨团（边缘毛糙）
  function inkBlot(g, cx, cy, r, alpha = 1, jag = 0.35) {
    g.save();
    for (let layer = 0; layer < 3; layer++) {
      g.globalAlpha = alpha * (0.35 + layer * 0.25);
      g.beginPath();
      const n = 40;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (1 - layer * 0.18) * (1 - jag / 2 + rnd() * jag);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.fill();
    }
    g.restore();
  }
  const Tex = {};
  Tex.puff = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  Tex.inkPuff = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) inkBlot(g, w / 2 + (rnd() - 0.5) * 40, w / 2 + (rnd() - 0.5) * 40, 14 + rnd() * 22, 0.25, 0.5);
    const gr = g.createRadialGradient(w / 2, w / 2, 20, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  Tex.splat = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fff';
    inkBlot(g, w / 2, w / 2, 60, 1, 0.5);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, d = 60 + rnd() * 60, r = 3 + rnd() * 12;
      inkBlot(g, w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d, r, 0.9, 0.3);
      g.globalAlpha = 0.8; g.lineWidth = r * 0.6; g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 40, w / 2 + Math.sin(a) * 40); g.lineTo(w / 2 + Math.cos(a) * d, w / 2 + Math.sin(a) * d); g.stroke();
    }
  });
  Tex.spark = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  // 刀光（新月形笔触）
  Tex.slash = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#fff';
    // 细长新月形笔触：两端尖、中间略粗，带飞白
    for (let k = 0; k < 6; k++) {
      g.globalAlpha = 0.2 + k * 0.13;
      const t = 10 - k * 1.4;
      g.beginPath();
      g.moveTo(24, h * 0.86);
      g.quadraticCurveTo(w * 0.5, -h * 0.42, w - 24, h * 0.82);
      g.quadraticCurveTo(w * 0.5, -h * 0.42 + t * 9, 24, h * 0.86);
      g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) { g.globalAlpha = rnd() * 0.7; g.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 40, 1 + rnd() * 2); }
  });
  Tex.ring = canvasTex(256, 256, (g, w) => {
    g.strokeStyle = '#fff';
    for (let i = 0; i < 9; i++) {
      g.globalAlpha = 0.15 + rnd() * 0.3; g.lineWidth = 3 + rnd() * 10;
      g.beginPath(); g.arc(w / 2, w / 2, w * 0.4 + (rnd() - 0.5) * 12, rnd() * 6, rnd() * 6 + 4); g.stroke();
    }
  });
  Tex.wood = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b07a44'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      const y = rnd() * h;
      g.strokeStyle = `rgba(${70 + rnd() * 40},${40 + rnd() * 20},${15},${0.08 + rnd() * 0.18})`;
      g.lineWidth = 0.5 + rnd() * 3;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 6 + (rnd() - 0.5) * 2);
      g.stroke();
    }
    for (let i = 0; i < 5; i++) { // 木节
      const x = rnd() * w, y = rnd() * h;
      for (let r = 18; r > 2; r -= 3) { g.strokeStyle = 'rgba(70,40,15,.18)'; g.beginPath(); g.ellipse(x, y, r * 2.2, r, 0, 0, 7); g.stroke(); }
    }
  }, { repeat: true });
  Tex.paperNoise = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = 200 + rnd() * 55; d.data[i] = v; d.data[i + 1] = v * 0.97; d.data[i + 2] = v * 0.9; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
    g.strokeStyle = 'rgba(120,100,70,.12)';
    for (let i = 0; i < 90; i++) { g.lineWidth = 0.6; g.beginPath(); const x = rnd() * 256, y = rnd() * 256; g.moveTo(x, y); g.quadraticCurveTo(x + rnd() * 30, y + rnd() * 30, x + rnd() * 50 - 25, y + rnd() * 50 - 25); g.stroke(); }
    return c.toDataURL();
  })();

  // ---------- 水墨材质 ----------
  const gradMap = (() => {
    const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 235, 235, 235, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    return t;
  })();
  const matCache = new Map();
  function toon(color, opts = {}) {
    // unique 的材质不进缓存，也就不用算键——带贴图时 JSON.stringify 会把整张贴图编码一遍，一张 1024 的画布要好几秒
    const { unique, ...rest } = opts;
    const key = unique ? '' : color + JSON.stringify(opts);
    if (!unique && matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshToonMaterial({ color, gradientMap: gradMap, ...rest });
    if (!opts.unique) matCache.set(key, m);
    return m;
  }
  function outlineMat(thick = 0.02, color = INK.ink) {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    m.userData.thick = { value: thick };
    m.onBeforeCompile = sh => {
      sh.uniforms.uThick = m.userData.thick;
      sh.vertexShader = 'uniform float uThick;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = vec3(position) + normalize(normal) * uThick;');
    };
    return m;
  }
  const outlineShared = outlineMat(0.022);
  // 给网格加描边
  function inked(geo, mat, thick) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    const o = new THREE.Mesh(geo, thick ? outlineMat(thick) : outlineShared);
    g.add(m, o);
    g.userData.main = m;
    return g;
  }

  // 合并几何体（带顶点色），用于实例化小兵
  function merge(parts) {
    const geos = [];
    for (const p of parts) {
      let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      if (p.m) g.applyMatrix4(p.m);
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      const c = new THREE.Color(p.color);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
      geos.push(g);
    }
    let total = 0; for (const g of geos) total += g.attributes.position.count;
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const arr = new Float32Array(total * 3); let o = 0;
      for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    out.computeBoundingSphere();
    return out;
  }
  const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

  function disposeTree(o) {
    o.traverse(c => {
      if (c.geometry && !c.geometry.userData.keep) c.geometry.dispose();
    });
    if (o.parent) o.parent.remove(o);
  }

  // 在后台把一个场景要用的着色器编好，编好了再画（第一次画就不用当场等显卡编译，电脑上编一批能卡住好几秒）。
  //   浏览器支持「并行编译」就问它编好没有；不支持的，先把编译命令发出去，过一会儿（显卡那边在编）再画
  let held = 0;
  //   lit：用哪个场景的灯光编（只编一小撮物体时传整个场景，编出来的才是场景里真正要用的那一版）
  const parallelGL = (() => { try { return renderer.extensions.has('KHR_parallel_shader_compile'); } catch (e) { return false; } })();
  function compileBg(sc, cam, ms = 1200, lit = null) {
    try {
      if (parallelGL) return renderer.compileAsync(sc, cam, lit).catch(() => { });
      renderer.compile(sc, cam, lit); renderer.getContext().flush();
    } catch (e) { }
    return new Promise(r => setTimeout(r, ms));
  }

  return {
    get quality() { return quality; },
    setQuality(q, keep = true) { quality = q; if (keep) try { localStorage.setItem('xq3d-quality', JSON.stringify(q)); } catch (e) { } const sh = q !== 'low'; if (sh) renderer.shadowMap.enabled = true; if (sun.castShadow !== sh) { sun.castShadow = sh; held++; const un = () => { held--; }; compileBg(scene, camera, 600).then(un); } resize(); },   // keep=false：只这一次打开页面有效（自动降画质用）。
    // 影子用太阳的 castShadow 开关：三维库会发现灯光变了、自动重编着色器，当场生效（原来改 shadowMap.enabled 要下次打开才生效）
    gpu: GPU, softGL, DIAG, get parallelGL() { return parallelGL; }, get userQ() { return userQ; },
    isMobile,
    renderer, scene, camera, sun, hemi, Time, onFrame, tween, sleep, ease, Cam, canvasTex, Tex, rnd, inkBlot,
    toon, outlineMat, outlineShared, inked, merge, M4, disposeTree, compileBg,
    start() { clock.start(); loop(); },
    get nUpdaters() { return updaters.size + frameHooks.length; },   // 每帧要跑的回调有几个（查泄漏用）
    // 取走这段时间的帧统计：[帧数, 平均毫秒, 超过 40 毫秒的帧数]，取完清零
    takeFrames() { const r = [ft.n, ft.n ? ft.sum / ft.n : 0, ft.slow]; ft.n = ft.sum = ft.slow = 0; return r; },
    addHook(fn) { frameHooks.push(fn); },
    lastDragMoved: 0,
    render: (() => { try { return !localStorage.getItem('xq3d-norender'); } catch (e) { return true; } })(),
  };
})();
