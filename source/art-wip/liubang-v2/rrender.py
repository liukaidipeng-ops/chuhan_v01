# 写实拍法：环境光（PMREM）、主光带软影、补光、轮廓光、地面接影；在游戏页面里跑（用它的 three 和 Core/Models）
# python3 rrender.py out.png 'JS 表达式' views [toon]
import sys, time, pathlib, base64, io, os
from playwright.sync_api import sync_playwright
from PIL import Image
SRC = '/home/claude/chuhan_v01/source'; HERE = os.path.dirname(os.path.abspath(__file__)); CINE = HERE + '/../cine/'
out, mk = sys.argv[1], sys.argv[2]; views = sys.argv[3] if len(sys.argv) > 3 else 'front,side,q34,hf,hq'; mode = sys.argv[4] if len(sys.argv) > 4 else 'real'; lookToon = mode == 'toon'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 600, 'height': 900}); pg.set_default_timeout(600000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:400])); pg.on('console', lambda m: print('LOG', m.text[:300]) if m.type == 'error' else None)
    pg.goto(pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri(), wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(2)
    pg.evaluate("()=>{Core.render=false}")
    pg.add_script_tag(content='window.LIU_BODY=' + open(CINE + 'assets/liu_body.json').read() + ';')
    for f in (CINE + 'cine.js', CINE + 'dress.js', HERE + '/lb2.js', HERE + '/lb3.js'): pg.add_script_tag(content=open(f, encoding='utf-8').read())
    d = pg.evaluate("""([mk, views, toon, mode]) => {
      const R = Core.renderer, S = new THREE.Scene();
      // 环境：上面暖白、下面暗褐，右前方一块柔光、左后方一块冷光
      const pm = new THREE.PMREMGenerator(R), es = new THREE.Scene(), g = new THREE.SphereGeometry(10, 32, 16), cols = [], P = g.attributes.position, a = new THREE.Color(0xd9cdb8), bt = new THREE.Color(0x2a2018), c = new THREE.Color();
      for (let i = 0; i < P.count; i++) { const t = THREE.MathUtils.smoothstep(P.getY(i) / 10, -0.3, 0.6); c.copy(bt).lerp(a, t); cols.push(c.r, c.g, c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ color: 0xfff0d8 })); s1.position.set(5, 6, 6); s1.lookAt(0, 0, 0); es.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: 0x5a6a88 })); s2.position.set(-6, 3, -4); s2.lookAt(0, 0, 0); es.add(s2);
      S.environment = pm.fromScene(es, 0.03).texture; S.background = new THREE.Color(toon || mode === 'ink' ? 0xf0e7d2 : 0x2b2622);
      const m = (new Function('return ' + mk))(); S.add(m.group);
      if (toon) { S.environment = null; S.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1)); const L = new THREE.DirectionalLight(0xffffff, 1.6); L.position.set(3, 6, 5); S.add(L); }
      else {
        S.add(new THREE.HemisphereLight(0xf2e6d6, 0x3a2e24, 0.35));
        const L = new THREE.DirectionalLight(0xffe2c0, 2.6); L.position.set(2.2, 4.2, 3.2); L.castShadow = true; L.shadow.mapSize.set(2048, 2048);
        Object.assign(L.shadow.camera, { left: -1.2, right: 1.2, top: 2.4, bottom: -0.2, near: 0.5, far: 12 }); L.shadow.bias = -0.0004; L.shadow.normalBias = 0.01; L.shadow.radius = 4; S.add(L);
        const F = new THREE.DirectionalLight(0x9fb2d8, 0.7); F.position.set(-3, 2, 2); S.add(F);
        const Rm = new THREE.DirectionalLight(0xfff2e0, 1.6); Rm.position.set(-1.5, 3, -4); S.add(Rm);
        if (mode === 'ink') { L.intensity = 1.9; F.intensity = 0.9; Rm.intensity = 0.8; S.children.forEach(c => { if (c.isHemisphereLight) c.intensity = 0.9; }); }
        else { const gr = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: 0x5a4e44, roughness: 0.95 })); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; S.add(gr); }
      }
      R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.shadowMap.needsUpdate = true;
      const W = R.domElement.width, H = R.domElement.height, cam = new THREE.PerspectiveCamera(20, W / H, 0.05, 100), out = {};
      const shot = (pos, look, fov) => { cam.fov = fov; cam.updateProjectionMatrix(); cam.position.set(...pos); cam.lookAt(...look); R.render(S, cam); return R.domElement.toDataURL('image/png'); };
      const V = { front: [[0, 1.1, 7.2], [0, 1.05, 0], 20], side: [[7.2, 1.1, 0], [0, 1.05, 0], 20], back: [[0, 1.1, -7.2], [0, 1.05, 0], 20], q34: [[4.6, 1.5, 5.6], [0, 1.05, 0], 20],
                  hf: [[0, 1.72, 1.35], [0, 1.69, 0], 22], hs: [[1.35, 1.72, 0.05], [0, 1.69, 0], 22], hq: [[0.9, 1.74, 1.0], [0, 1.69, 0], 22], hb: [[0, 1.75, -1.35], [0, 1.7, 0], 22],
                  fc: [[0.25, 1.7, 0.75], [0, 1.68, 0.04], 22], bust: [[1.2, 1.55, 2.6], [0, 1.45, 0], 24] };
      for (const v of views.split(',')) out[v] = shot(...V[v]);
      return out; }""", [mk, views, lookToon, mode])
    ims = [Image.open(io.BytesIO(base64.b64decode(d[v].split(',')[1]))).convert('RGB') for v in views.split(',')]
    W = sum(i.width for i in ims); o = Image.new('RGB', (W, ims[0].height)); x = 0
    for i in ims: o.paste(i, (x, 0)); x += i.width
    o.save(out); print(out, o.size)
    b.close()
