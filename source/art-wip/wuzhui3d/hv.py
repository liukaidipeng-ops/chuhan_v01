# 乌骓看模：用游戏的 THREE / Core / Models / TigerHD，在自己的画布里打光出图（不开对局）
import sys, time, os, json, pathlib
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); OUT = H + '/shots'; os.makedirs(OUT, exist_ok=True)
url = pathlib.Path('/home/claude/chuhan_v01/source/dist/site/index.html').resolve().as_uri()
STUDIO = r"""
window.HV = (() => {
  const W = 1200, Hh = 800;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:1200px;height:800px'; document.body.appendChild(cv);
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(W, Hh, false); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0xe9e2d0);
  sc.add(new THREE.HemisphereLight(0xfff6e6, 0x8a7a66, 1.1));
  const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(3, 6, 4); d.castShadow = true; d.shadow.mapSize.set(2048, 2048); Object.assign(d.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); sc.add(d);
  const rim = new THREE.DirectionalLight(0x9fb2d8, 1.2); rim.position.set(-4, 3, -3); sc.add(rim);
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshToonMaterial({ color: 0xd8ccb2 })); gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; sc.add(gnd);
  const cam = new THREE.PerspectiveCamera(30, W / Hh, 0.05, 100);
  let horse = null;
  function load(o) { if (horse) sc.remove(horse.group); horse = WuZhui.make(o || {}); horse.group.traverse(x => { if (x.isMesh) x.castShadow = true; }); sc.add(horse.group); return true; }
  const DEF = { speed: 0, headK: 0, rearK: 0, pawK: 0, snortK: 0, earK: 0.6, tailK: 0, lookY: 0, dead: 0 };
  function pose(p) { Object.assign(horse, DEF, p || {}); horse.update(p && p.dt || 0); }
  function shot(v) { const [az, el, dist, ty] = v; cam.position.set(0.3 + Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist); cam.lookAt(0.3, ty, 0); r.render(sc, cam); return true; }
  return { load, pose, shot, get horse() { return horse; } };
})();
"""
VIEWS = {'side': [0, 0.05, 7.5, 1.05], 'front34': [0.75, 0.18, 7.2, 1.05], 'back34': [2.4, 0.2, 7.2, 1.05], 'front': [1.5708, 0.08, 7.0, 1.05], 'top': [0, 1.45, 7.0, 0.8], 'head': [0.6, 0.12, 2.6, 1.85]}
if __name__ == '__main__':
    tag = sys.argv[1]; views = sys.argv[2].split(','); poses = json.loads(sys.argv[3]) if len(sys.argv) > 3 else [{}]
    opt = json.loads(os.environ.get('OPT', '{}'))
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 1200, 'height': 800}); pg.set_default_timeout(300000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1')")
        pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:400]))
        pg.goto(url, wait_until='domcontentloaded')
        pg.wait_for_function("()=>typeof TigerHD!=='undefined'&&typeof Core!=='undefined'", timeout=300000); time.sleep(2)
        pg.add_script_tag(content=open(H + '/horse.js', encoding='utf-8').read() + "\nwindow.WuZhui = WuZhui;")
        pg.add_script_tag(content=STUDIO)
        if os.environ.get('RIDER'):
            A = '/home/claude/chuhan_v01/source/art-wip/'
            for f in (A + 'liubang-v2/lb2.js', A + 'xiangyu-v3/xy3.js', H + '/xy4.js'):
                nm = os.path.basename(f).split('.')[0].upper()
                pg.add_script_tag(content=open(f, encoding='utf-8').read() + f"\nwindow.{nm} = {nm};")
        pg.evaluate("(o)=>HV.load(o)", opt)
        if os.environ.get('RIDER'):
            print('rider', pg.evaluate("()=>{const x=XY4.make({stage:1});window.RIDER=x;x.mountOn(HV.horse);x.group.traverse(m=>{if(m.isMesh)m.castShadow=true});return x.skeleton.bones.length}"))
        for i, po in enumerate(poses):
            pg.evaluate("(p)=>HV.pose(p)", po)
            for v in views:
                pg.evaluate("(v)=>HV.shot(v)", VIEWS[v]); time.sleep(0.3)
                pg.locator('canvas').last.screenshot(path=f'{OUT}/{tag}_{i}_{v}.png'); print('shot', i, v, flush=True)
        b.close()
