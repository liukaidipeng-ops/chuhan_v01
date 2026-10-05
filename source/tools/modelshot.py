"""模型自测：在真实游戏页面里给一个兵种模型量数据、出一套标准截图。
先 `cd source && node build.js`，再：
    python3 tools/modelshot.py                 # 默认：汉相虎骑，高画质
    python3 tools/modelshot.py mid             # 中画质（手机默认档）
    python3 tools/modelshot.py high "TigerHD.make('r',{gold:true})" gold_
输出到 source/shots/model/（不进仓库）：
  stats.json     首次构建耗时、克隆耗时、三角面（含描边）、网格数、贴图
  side / front34 / back34 / top      近景四张
  line_side / line_play              和汉车、汉马、楚象并排：侧面、对局视角
  board / rank                       模型模式的整盘、汉方底线拉近
  walk0..3 / pounce / roar / dead    动作抽帧（模型对象上有 speed / pounceK / roarK / dead 才会出）
需要 playwright（pip install playwright；Chromium 用系统里现成的）。无显卡的机器用软件渲染，出图慢是正常的。"""
import sys, os, time, json, subprocess
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = sys.argv[1] if len(sys.argv) > 1 else 'high'
MAKE = sys.argv[2] if len(sys.argv) > 2 else "TigerHD.make('r')"
PRE = sys.argv[3] if len(sys.argv) > 3 else ''
OUT = os.path.join(D, 'shots', 'model'); os.makedirs(OUT, exist_ok=True)
PORT = 8047
STATS = """(() => { const T = f => { const t = performance.now(); const x = f(); return [Math.round(performance.now() - t), x]; };
  const [first, a] = T(() => %s), [clone] = T(() => %s); let tri = 0, mesh = 0; const tex = new Set();
  a.group.traverse(o => { if (o.geometry) { mesh++; const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; } if (o.material && o.material.map) tex.add(o.material.map.image.width + 'x' + o.material.map.image.height + '#' + o.material.map.id); });
  return { firstMs: first, cloneMs: clone, triangles: Math.round(tri), meshes: mesh, textures: [...tex].map(s => s.split('#')[0]), keys: ['speed', 'pounceK', 'roarK', 'dead'].filter(k => k in a) }; })()""" % (MAKE, MAKE)
LINE = """(O => { const X = window.__xq, { Board, Core, Squads } = X, V = THREE.Vector3;
  Squads.Stand.set(false); for (const m of Board.pieces.values()) m.visible = false;
  if (window.__lin) for (const q of window.__lin) q.dispose(); window.__lin = [];
  [['e', 'r'], ['r', 'r'], ['n', 'r'], ['e', 'b']].forEach(([t, s], i) => { const sq = Squads.make(t, s, new V((i - 1.5) * 1.7, Board.TOP, O.z), O.play ? (s === 'r' ? Math.PI : 0) : Math.PI / 2); sq.setVis(1); if (sq.setPose && sq.troop) sq.setPose('idle'); window.__lin.push(sq); });
  window.__cam = (px, py, pz, lx, ly, lz, fov) => { Core.Cam.cine = true; Core.Cam.moveId = (Core.Cam.moveId || 0) + 1; Core.Cam.pos.set(px, py, pz); Core.Cam.look.set(lx, ly, lz); if (fov) { Core.camera.fov = fov; Core.camera.updateProjectionMatrix(); } };
  if (!document.getElementById('hidehud')) { const st = document.createElement('style'); st.id = 'hidehud'; st.textContent = 'body > *:not(canvas){visibility:hidden !important}'; document.head.appendChild(st); }
})(%s)"""
def run(hash_, size, fn):
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': size[0], 'height': size[1]})
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s'));" % Q)
        pg = c.new_page(); pg.set_default_timeout(120000); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:%d/%s' % (PORT, hash_), wait_until='domcontentloaded')
        t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate('!!window.__xq && window.__xq.started'): time.sleep(0.5)
        fn(pg, lambda name: pg.screenshot(path=os.path.join(OUT, PRE + name + '.png')))
        if errs: print('页面报错:', errs[:5])
        b.close()
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=os.path.join(D, 'dist', 'site'), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
try:
    X, Z = -2.55, -1.55
    def close(pg, shot):
        st = pg.evaluate(STATS); st['quality'] = Q; st['make'] = MAKE
        json.dump(st, open(os.path.join(OUT, PRE + 'stats.json'), 'w'), ensure_ascii=False, indent=1); print(json.dumps(st, ensure_ascii=False))
        pg.evaluate(LINE % json.dumps({'z': Z})); time.sleep(1.2)
        for name, cam in (('side', (X + 0.1, 0.8, Z + 2.3, X + 0.1, 0.62, Z, 34)), ('front34', (X + 1.9, 1.25, Z + 1.5, X + 0.05, 0.5, Z, 34)), ('back34', (X - 1.7, 1.5, Z + 1.6, X, 0.5, Z, 34)), ('top', (X - 0.1, 2.9, Z + 1.5, X, 0.4, Z, 34))):
            pg.evaluate('window.__cam(%s)' % ','.join(map(str, cam))); time.sleep(0.6); shot(name)
        # 动作抽帧：直接拨左边第一队（汉相）的模型状态
        if st['keys']:
            pg.evaluate('window.__cam(%s)' % ','.join(map(str, (X + 0.1, 0.8, Z + 2.3, X + 0.1, 0.62, Z, 34))))
            M = 'window.__lin[0].m'
            for i in range(4):
                pg.evaluate("(()=>{const m=%s; m.speed=1; m.t=%f; m.update(0);})()" % (M, i * 0.29)); time.sleep(0.4); shot('walk%d' % i)
            for name, js in (('pounce', 'm.speed=0; m.pounceK=1; m.roarK=1;'), ('roar', 'm.pounceK=0; m.roarK=1;'), ('dead', 'm.roarK=0; m.dead=1;')):
                pg.evaluate("(()=>{const m=%s; %s m.update(0);})()" % (M, js)); time.sleep(0.4); shot(name)
    run('?tiger=1#local', (1500, 900), close)
    def lines(pg, shot):
        pg.evaluate(LINE % json.dumps({'z': Z})); time.sleep(1.2); pg.evaluate('window.__cam(0, 1.25, 4.5, 0, 0.5, %f, 31)' % Z); time.sleep(0.6); shot('line_side')
        pg.evaluate(LINE % json.dumps({'z': 2.62, 'play': 1})); time.sleep(1.2); pg.evaluate('window.__cam(0, 7.2, 9.22, 0, 0.3, 2.62, 21)'); time.sleep(0.6); shot('line_play')
    run('?tiger=1#local', (1800, 800), lines)
    def board(pg, shot):
        pg.evaluate('window.__xq.Squads.Stand.set(true)'); time.sleep(3); shot('board')
        tri = pg.evaluate('window.__xq.Core.renderer.info.render.triangles'); print('模型模式整盘三角面:', tri)
        pg.evaluate("(()=>{const C=window.__xq.Core; C.Cam.cine=true; C.Cam.moveId=(C.Cam.moveId||0)+1; C.Cam.pos.set(0,5.2,9.6); C.Cam.look.set(0,0.2,3.6); const st=document.createElement('style'); st.textContent='body > *:not(canvas){visibility:hidden !important}'; document.head.appendChild(st);})()"); time.sleep(1); shot('rank')
    run('?tiger=1#local', (1600, 1000), board)
    print('截图在', OUT)
finally:
    http.kill()
