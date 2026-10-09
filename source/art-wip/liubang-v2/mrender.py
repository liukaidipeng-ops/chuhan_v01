# 在游戏页面里搭一个干净的场景，用游戏自己的材质和光拍新模型：python3 mrender.py out.png model.js 'JS 表达式返回 {group, update}' [views]
import sys, time, pathlib, base64, json
from playwright.sync_api import sync_playwright
SRC = '/home/claude/chuhan_v01/source'
out, jsf, mk = sys.argv[1], sys.argv[2], sys.argv[3]
views = sys.argv[4] if len(sys.argv) > 4 else 'front,side,back,q34,face,faceside'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 600, 'height': 900}); pg.set_default_timeout(300000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('high'))")
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:400])); pg.on('console', lambda m: print('LOG', m.text[:200]) if m.type == 'error' else None)
    pg.goto(pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri(), wait_until='domcontentloaded')
    pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}"); time.sleep(2)
    pg.add_script_tag(content=open(jsf, encoding='utf-8').read() + '\n;window.__M = true;')
    d = pg.evaluate("""([mk, views]) => {
      const R = Core.renderer, S = new THREE.Scene(); S.background = new THREE.Color(0xf0e7d2);
      S.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.1)); const L = new THREE.DirectionalLight(0xffffff, 1.6); L.position.set(3, 6, 5); S.add(L);
      const m = (new Function('return ' + mk))(); S.add(m.group); for (let i = 0; i < 4; i++) m.update(0.2);
      const W = R.domElement.width, H = R.domElement.height, cam = new THREE.PerspectiveCamera(20, W / H, 0.05, 100), out = {};
      const shot = (pos, look, fov) => { cam.fov = fov; cam.updateProjectionMatrix(); cam.position.set(...pos); cam.lookAt(...look); R.render(S, cam); return R.domElement.toDataURL('image/png'); };
      const V = { front: [[0, 1.1, 7.2], [0, 1.05, 0], 20], side: [[7.2, 1.1, 0], [0, 1.05, 0], 20], back: [[0, 1.1, -7.2], [0, 1.05, 0], 20], q34: [[4.6, 1.5, 5.6], [0, 1.05, 0], 20],
                  face: [[0, 1.8, 2.2], [0, 1.78, 0], 14], faceside: [[2.2, 1.8, 0.1], [0, 1.78, 0], 14], q34c: [[2.3, 1.6, 2.8], [0, 1.4, 0], 24],
                  full: [[0, 1.7, 11], [0, 1.55, 0], 22], hf: [[0, 1.72, 1.35], [0, 1.69, 0], 22], hs: [[1.35, 1.72, 0.05], [0, 1.69, 0], 22], hq: [[0.9, 1.74, 1.0], [0, 1.69, 0], 22], hb: [[0, 1.75, -1.35], [0, 1.7, 0], 22], bust: [[1.4, 1.55, 3.0], [0, 1.3, 0], 26], hands: [[0.5, 1.35, 1.3], [0, 1.22, 0.25], 24], bustf: [[0, 1.45, 3.2], [0, 1.3, 0], 26], fullside: [[11, 1.7, 0], [0, 1.55, 0], 22], fullq: [[7, 2.0, 8.5], [0, 1.55, 0], 22] };
      for (const v of views.split(',')) out[v] = shot(...V[v]);
      return out; }""", [mk, views])
    from PIL import Image; import io
    ims = [Image.open(io.BytesIO(base64.b64decode(d[v].split(',')[1]))).convert('RGB') for v in views.split(',')]
    W = sum(i.width for i in ims); o = Image.new('RGB', (W, ims[0].height), (240, 231, 210)); x = 0
    for i in ims: o.paste(i, (x, 0)); x += i.width
    o.save(out); print(out, o.size)
    b.close()
