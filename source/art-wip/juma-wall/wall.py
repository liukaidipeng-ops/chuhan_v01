# 拒马路障出图：真实对局里摆持矛兵（拒马阵）+ 路障。python3 wall.py <shots.json>
import sys, time, os, json
sys.path.insert(0, '/home/claude/chuhan_v01/source/art-wip/juma')
import jm
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
JS = open('/home/claude/chuhan_v01/source/src/juma.js', encoding='utf-8').read()
ADD = """(o)=>{ if (window.__W) { window.__W.dispose(); window.__W = null; }
  const def = JM.def; if (!def || o.none) return; const W = JumaWall.make(o.side || 'r', o.lv); const c = def.anchor.clone(); c.y = Board.TOP;
  W.group.position.copy(c); W.group.rotation.y = def.yaw; Core.scene.add(W.group); window.__W = W;
  if (!window.__WT) { window.__WT = 1; Core.onFrame(dt => { if (window.__W) window.__W.update(dt); }); } }"""
shots = json.load(open(sys.argv[1]))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = jm.start(b, 'wide')
    pg.add_script_tag(content=JS)
    pg.evaluate("()=>document.body.classList.add('jmclean')")
    for s in shots:
        pg.evaluate("async (s)=>{ if (s.setup) await JM.setup(s.setup); if (s.pose) JM.pose(s.pose, s.po||{}); if (s.att) JM.attack(s.att); }", s)
        if s.get('setup') or s.get('wall'): pg.evaluate(ADD, s.get('wall', {'lv': s['setup']['lv']}))
        pg.evaluate("async (s)=>{ await JM.cam(s.cam||{}); }", s)
        time.sleep(s.get('wait', 2.5))
        if s.get('scatter'): pg.evaluate("(k)=>{const d=JM.def; const dir=new THREE.Vector3(Math.sin(d.yaw+Math.PI),0,Math.cos(d.yaw+Math.PI)); window.__W.scatter(dir,k)}", s['scatter']); time.sleep(s.get('sWait', 0.4))
        pg.screenshot(path=f"{HERE}/shots/{s['name']}.png"); print('shot', s['name'], flush=True)
    b.close()
