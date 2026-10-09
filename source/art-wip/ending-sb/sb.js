// 终局分镜拍摄台：在游戏页面里另搭场景，用游戏的渲染器拍定格；后期做景深、调色、暗角、颗粒（2.39:1）
window.SB = (() => {
  const R = Core.renderer, V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const rr = (a, b) => a + rnd() * (b - a);
  const reseed = s => { seed = s; };
  function cvTex(w, h, fn, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  // 软云团（尘土、雾）
  let cloudT = null;
  function cloudTex() {
    if (cloudT) return cloudT;
    return (cloudT = cvTex(256, 256, (g, w) => {
      for (let i = 0; i < 70; i++) {
        const a = rnd() * 6.28, r = Math.pow(rnd(), 0.7) * 70, x = w / 2 + Math.cos(a) * r, y = w / 2 + Math.sin(a) * r * 0.8, s = rr(18, 60);
        const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, w);
      }
      const m = g.createRadialGradient(w / 2, w / 2, 40, w / 2, w / 2, 128); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = m; g.fillRect(0, 0, w, w);
    }));
  }
  let glowT = null;
  const glowTex = () => glowT || (glowT = cvTex(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }));

  // ---------- 场景 ----------
  function stage(o) {
    const S = new THREE.Scene();
    const sunDir = V(...o.sun).normalize();
    S.fog = new THREE.FogExp2(new THREE.Color(o.fogCol ?? o.hor), o.fogD ?? 0.01);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(o.top) }, hor: { value: new THREE.Color(o.hor) }, bot: { value: new THREE.Color(o.bot ?? o.hor) }, sunDir: { value: sunDir }, sunCol: { value: new THREE.Color(o.sunCol) }, sunSize: { value: o.sunSize ?? 0.0006 }, glow: { value: o.glow ?? 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }',
      fragmentShader: `varying vec3 vD; uniform vec3 top, hor, bot, sunDir, sunCol; uniform float sunSize, glow;
        void main(){ vec3 d = normalize(vD); float h = d.y; vec3 c = h > 0. ? mix(hor, top, pow(clamp(h,0.,1.), .5)) : mix(hor, bot, pow(clamp(-h*4.,0.,1.), .6));
          float s = max(dot(d, sunDir), 0.); c += sunCol * glow * (pow(s, 6.) * .25 + pow(s, 40.) * .6 + pow(s, 400.) * 1.5) + sunCol * smoothstep(1. - sunSize, 1. - sunSize * .5, s) * 30.;
          gl_FragColor = vec4(c, 1.); }`,
    }));
    sky.renderOrder = -10; sky.frustumCulled = false; S.add(sky);
    const hemi = new THREE.HemisphereLight(o.skyL ?? o.top, o.gndL ?? 0x6a5a48, o.hemi ?? 0.8); S.add(hemi);
    const sun = new THREE.DirectionalLight(o.sunCol, o.sunI ?? 2.2); sun.position.copy(sunDir).multiplyScalar(60); S.add(sun); S.add(sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    const ctx = { S, sky, sun, hemi, sunDir, o, add(m) { S.add(m); return m; }, anim: [] };
    ctx.shadowAt = (c, r) => { sun.target.position.set(...c); sun.position.copy(sun.target.position).addScaledVector(sunDir, 60); const sc = sun.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 1; sc.far = 160; sc.updateProjectionMatrix(); };
    ctx.shadowAt([0, 0, 0], 12);
    return ctx;
  }
  // 地面：大平面 + 泥土噪声贴图 + 微起伏 + 大块深浅（顶点色）；o.shore = { x, wob }：x 以西沉到水下（岸线弯曲）
  function ground(ctx, o = {}) {
    const N = 512, t = cvTex(N, N, (g, w) => {
      g.fillStyle = '#c8c0b0'; g.fillRect(0, 0, w, w);
      for (let i = 0; i < 1400; i++) { const x = rnd() * w, y = rnd() * w, s = rr(4, 26), gr = g.createRadialGradient(x, y, 0, x, y, s); const k = rnd() < 0.5; gr.addColorStop(0, k ? 'rgba(70,55,40,.10)' : 'rgba(255,250,235,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); }
      for (let i = 0; i < 5000; i++) { const x = rnd() * w, y = rnd() * w, s = rr(1, 3); g.fillStyle = rnd() < 0.5 ? `rgba(50,40,30,${rr(0.05, 0.15)})` : `rgba(255,245,225,${rr(0.04, 0.1)})`; g.fillRect(x, y, s, s); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.rep ?? 160, o.rep ?? 160);
    const geo = new THREE.PlaneGeometry(o.size ?? 1600, o.size ?? 1600, 320, 320); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, col = new Float32Array(P.count * 3), base = new THREE.Color(o.col || '#a08a68'), mud = new THREE.Color(o.mud || '#5e5240');
    const n2 = (x, z) => Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) * 0.5 + Math.sin(z * 0.13 + Math.sin(x * 0.05) * 3) * 0.5;
    const H0 = (x, z) => { const d = Math.hypot(x - (o.cx || 0), z - (o.cz || 0)); const k = Math.min(1, Math.max(0, (d - (o.flat ?? 30)) / 120));
      let y = k * (Math.sin(x * 0.013) * 3 + Math.sin(z * 0.021 + 1) * 2.5 + Math.sin((x + z) * 0.05) * 0.8) * (o.hills ?? 1);
      if (o.ridge) { const R = o.ridge; y += R.h * (z < R.z ? 1 : Math.exp(-Math.pow((z - R.z) / R.w, 2))) * (1 + 0.08 * Math.sin(x * 0.07)); }
      return y; };
    ctx.hAt = H0;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      let y = H0(x, z) + (o.bump ?? 0.06) * n2(x * 3, z * 3);
      let wet = 0;
      if (o.shore) { const sx = o.shore.x + Math.sin(z * 0.09) * (o.shore.wob ?? 2) + Math.sin(z * 0.23 + 1) * (o.shore.wob ?? 2) * 0.4; const u = x - sx; y += Math.max(-1.2, Math.min(0.5, u * 0.09)) - 0.05; wet = Math.max(0, 1 - Math.abs(u) / 3.5); }
      P.setY(i, y);
      const v = 0.82 + 0.28 * (0.5 + 0.5 * n2(x * 0.6, z * 0.6)) * (0.7 + 0.3 * n2(x * 2.1 + 5, z * 1.7));
      const c = base.clone().multiplyScalar(v).lerp(mud, wet * 0.8); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 1, vertexColors: true }));
    m.receiveShadow = true; return ctx.add(m);
  }
  // 远山：几层山脊剪影，越远越淡（靠雾）
  function ridges(ctx, o) {
    const g = new THREE.Group();
    for (let L = 0; L < (o.layers ?? 3); L++) {
      const dist = o.dist * (1 + L * 0.55), h = o.h * (1 + L * 0.35), W = dist * 3, sh = new THREE.Shape(); sh.moveTo(-W, -20);
      let y = 0; const n = 90;
      for (let i = 0; i <= n; i++) { const x = -W + (2 * W) * i / n; y = h * (0.45 + 0.35 * Math.sin(i * 0.31 + L * 2 + o.seed) + 0.2 * Math.sin(i * 0.93 + L) + 0.12 * Math.sin(i * 2.7 + L * 3)); sh.lineTo(x, Math.max(0, y)); }
      sh.lineTo(W, -20); sh.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: new THREE.Color(o.col).lerp(new THREE.Color(ctx.o.hor), L * 0.22), fog: true }));
      m.position.set(0, o.y ?? 0, -dist); m.lookAt(0, o.y ?? 0, 0); m.rotation.y += o.yaw ?? 0;
      const piv = new THREE.Group(); piv.rotation.y = o.yaw ?? 0; piv.add(m); g.add(piv);
    }
    return ctx.add(g);
  }
  // 尘土 / 雾团：一堆软云片（朝向镜头）
  function dust(ctx, o) {
    const g = new THREE.Group(), T = cloudTex();
    for (let i = 0; i < o.n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T, color: new THREE.Color(o.col).multiplyScalar(rr(0.8, 1.15)), transparent: true, opacity: rr(o.op[0], o.op[1]), depthWrite: false, fog: o.fog ?? true, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      const a = rnd() * 6.28, r = Math.sqrt(rnd());
      const p = o.box ? V(rr(o.box[0], o.box[1]), rr(o.box[2], o.box[3]), rr(o.box[4], o.box[5])) : V(o.c[0] + Math.cos(a) * r * o.r, o.c[1] + Math.pow(rnd(), 1.6) * o.h, o.c[2] + Math.sin(a) * r * o.r * (o.zs ?? 1));
      sp.position.copy(p); const s = rr(o.s[0], o.s[1]); sp.scale.set(s * rr(1, 1.8), s, 1); sp.material.rotation = rnd() * 6.28; g.add(sp);
    }
    g.renderOrder = o.order ?? 5; return ctx.add(g);
  }
  // 光柱：几片竖长的渐变片，加色混合，朝镜头
  function rays(ctx, o) {
    const T = cvTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h); });
    const g = new THREE.Group();
    for (let i = 0; i < o.n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rr(o.w[0], o.w[1]), o.len), new THREE.MeshBasicMaterial({ map: T, color: o.col, transparent: true, opacity: rr(o.op[0], o.op[1]), depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      m.geometry.translate(0, -o.len / 2, 0); m.position.set(o.c[0] + rr(-o.spread, o.spread), o.c[1], o.c[2] + rr(-o.spread, o.spread) * 0.3);
      m.rotation.z = o.tilt + rr(-0.06, 0.06); g.add(m);
    }
    g.renderOrder = 8; return ctx.add(g);
  }
  // 火光：一团加色光晕（火把、烛火）
  function glow(ctx, p, col, s, op = 1) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.position.set(...p); sp.scale.set(s, s, 1); sp.renderOrder = 9; return ctx.add(sp); }
  // 成片的火把点（远处的营火、火把阵）
  function torchField(ctx, pts, col, size) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    const m = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex(), color: col, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.renderOrder = 9; return ctx.add(m);
  }


  // 补光：从镜头一侧打一盏弱光（逆光时脸不至于全黑）
  function fill(ctx, dir, col, I) { const L = new THREE.DirectionalLight(col, I); L.position.set(...dir).multiplyScalar(40); ctx.S.add(L); return L; }
  // 水面：反射天空（用天空做一张环境图）
  function water(ctx, o = {}) {
    const tmp = new THREE.Scene(); tmp.add(ctx.sky.clone());
    const pm = new THREE.PMREMGenerator(R), env = pm.fromScene(tmp, 0.02).texture; pm.dispose();
    const N = 512, nt = cvTex(N, N, (g, w) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, w); for (let i = 0; i < 2600; i++) { const x = rnd() * w, y = rnd() * w, l = rr(8, 40); g.strokeStyle = `rgba(${rnd() < 0.5 ? 100 : 156},128,255,${rr(0.15, 0.4)})`; g.lineWidth = rr(1, 3); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + rr(-1, 1)); g.stroke(); } }, false);
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(o.rep ?? 60, o.rep ?? 60);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(o.size ?? 1600, o.size ?? 1600), new THREE.MeshStandardMaterial({ color: o.col ?? 0x55636a, roughness: o.rough ?? 0.08, metalness: 0.0, envMap: env, envMapIntensity: o.env ?? 1.2, normalMap: nt, normalScale: new THREE.Vector2(0.35, 0.35) }));
    m.rotation.x = -Math.PI / 2; m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0); m.receiveShadow = true; return ctx.add(m);
  }
  // 芦苇：一丛丛细长的弯锥
  function reeds(ctx, pts, o = {}) {
    const geo = new THREE.ConeGeometry(0.018, 1, 3, 4); geo.translate(0, 0.5, 0);
    const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + y * y * 0.18); } geo.computeVertexNormals();
    const n = pts.length * (o.per ?? 30), m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: o.col ?? 0x6b6448, roughness: 0.9 }), n);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
    for (const c of pts) for (let i = 0; i < (o.per ?? 30); i++) {
      const a = rnd() * 6.28, r = Math.sqrt(rnd()) * (o.r ?? 1.2), h = rr(o.h?.[0] ?? 1.0, o.h?.[1] ?? 2.2);
      e.set(rr(-0.15, 0.15), rnd() * 6.28, rr(-0.15, 0.15)); q.setFromEuler(e); M.compose(V(c[0] + Math.cos(a) * r, c[1] ?? 0, c[2] + Math.sin(a) * r), q, V(1 + rnd(), h, 1 + rnd())); m.setMatrixAt(k++, M);
      const cc = new THREE.Color(o.col ?? 0x6b6448).multiplyScalar(rr(0.7, 1.25)); m.setColorAt(k - 1, cc);
    }
    m.castShadow = true; return ctx.add(m);
  }
  function shadows(g) { g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g; }
  // ---------- 后期 ----------
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), qS = new THREE.Scene(); qS.add(quad);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const dofMat = new THREE.ShaderMaterial({ uniforms: { tC: { value: null }, tD: { value: null }, res: { value: new THREE.Vector2() }, near: { value: 0.1 }, far: { value: 1000 }, focus: { value: 5 }, ap: { value: 1 }, maxR: { value: 20 } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tC, tD; uniform vec2 res; uniform float near, far, focus, ap, maxR;
      float vz(float d){ return (near * far) / ((far - near) * d - far); }
      float cocZ(float z){ return clamp(ap * abs(z - focus) / max(z, .001), 0., 1.) * maxR; }
      void main(){
        float z0 = -vz(texture2D(tD, vUv).x), c0 = cocZ(z0);
        vec3 acc = texture2D(tC, vUv).rgb; float ws = 1.;
        for (int i = 0; i < 96; i++) {
          float r = sqrt((float(i) + .5) / 96.), a = float(i) * 2.39996;
          vec2 off = vec2(cos(a), sin(a)) * r * maxR; vec2 suv = vUv + off / res;
          float zs = -vz(texture2D(tD, suv).x), cs = cocZ(zs);
          if (zs > z0) cs = min(cs, c0);
          float w = smoothstep(r * maxR - 1.5, r * maxR + 1.5, cs);
          acc += texture2D(tC, suv).rgb * w; ws += w;
        }
        gl_FragColor = vec4(acc / ws, 1.);
      }` });
  const finMat = new THREE.ShaderMaterial({ uniforms: { tC: { value: null }, res: { value: new THREE.Vector2() }, exp: { value: 1 }, lift: { value: new THREE.Color(0, 0, 0) }, gain: { value: new THREE.Color(1, 1, 1) }, gam: { value: 1 }, sat: { value: 1 }, vign: { value: 0.35 }, grain: { value: 0.025 }, bars: { value: 0 } }, vertexShader: VS, depthTest: false, depthWrite: false, toneMapped: true,
    fragmentShader: `varying vec2 vUv; uniform sampler2D tC; uniform vec2 res; uniform float exp, gam, sat, vign, grain, bars; uniform vec3 lift, gain;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tC, vUv).rgb * exp;
        c = c * gain + lift; c = pow(max(c, 0.), vec3(1. / gam));
        float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, sat);
        vec2 q = (vUv - .5) * vec2(1., .55); c *= 1. - vign * smoothstep(.1, .7, dot(q, q) * 2.6);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        vec2 gp = floor(vUv * res / 1.6); float n = hash(gp) + hash(gp + 17.3) - 1.; float lum = dot(gl_FragColor.rgb, vec3(.3, .59, .11)); gl_FragColor.rgb += n * grain * (1.2 - lum) * vec3(1., .97, .94);   // 胶片颗粒：暗部多、亮部少，颗粒略大
      }` });
  function pass(mat, target) { quad.material = mat; R.setRenderTarget(target); R.render(qS, quadCam); }
  // 拍一张：o = { W, H, ss, focus, ap, maxR, exp, lift, gain, gam, sat, vign, grain }
  function shoot(ctx, cam, o = {}) {
    const W = o.W || 1920, H = o.H || 804, ss = o.ss || 2, w = W * ss, h = H * ss;
    R.setPixelRatio(1); R.setSize(w, h, false); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    cam.aspect = W / H; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const f of ctx.anim) f(cam);
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: dt }), rt2 = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    R.setRenderTarget(rt); R.setClearColor(0x000000, 1); R.clear(); R.render(ctx.S, cam);
    const U = dofMat.uniforms; U.tC.value = rt.texture; U.tD.value = dt; U.res.value.set(w, h); U.near.value = cam.near; U.far.value = cam.far; U.focus.value = o.focus ?? 10; U.ap.value = o.ap ?? 0.5; U.maxR.value = (o.maxR ?? 14) * ss;
    let src = rt;
    if ((o.ap ?? 0.5) > 0) { pass(dofMat, rt2); src = rt2; }
    const F = finMat.uniforms; F.tC.value = src.texture; F.res.value.set(w, h); F.exp.value = o.exp ?? 1; F.lift.value.set(o.lift ?? 0); if (Array.isArray(o.lift)) F.lift.value.setRGB(...o.lift); F.gain.value.setRGB(...(o.gain || [1, 1, 1])); F.gam.value = o.gam ?? 1; F.sat.value = o.sat ?? 1; F.vign.value = o.vign ?? 0.35; F.grain.value = o.grain ?? 0.05;
    R.toneMappingExposure = 1;
    pass(finMat, null);
    const url = R.domElement.toDataURL('image/png');
    rt.dispose(); rt2.dispose(); dt.dispose();
    return url;
  }
  function cam(pos, look, fov, near = 0.1, far = 2500) { const c = new THREE.PerspectiveCamera(fov, 2.39, near, far); c.position.set(...pos); c.lookAt(...look); return c; }
  return { fill, water, reeds, shadows, stage, ground, ridges, dust, rays, glow, torchField, shoot, cam, cvTex, cloudTex, glowTex, rnd, rr, reseed, V };
})();
