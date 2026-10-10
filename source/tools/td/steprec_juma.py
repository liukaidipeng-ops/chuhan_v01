"""M20 拒马演出逐帧录（时间一步一步推，渲染自己来）：
python3 rec3.py <站点> <输出目录> <守方等级> <攻方 n|r|p> <models 0|1> <攻方等级> <phase hit|pose> <cam game|side> <秒数> [fps]"""
import sys, time, subprocess, os, base64, json
from playwright.sync_api import sync_playwright
site, out, lv, att, models, alv, phase, cam, secs = sys.argv[1:10]
fps = float(sys.argv[10]) if len(sys.argv) > 10 else 20
Q = os.environ.get('Q', 'mid'); W, H = [int(x) for x in os.environ.get('WH', '800x450').split('x')]
port = 8100 + (abs(hash(out)) % 50)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
FROM = {'n': [3, 5], 'r': [4, 6], 'p': [4, 4], 'k': [4, 4]}[att]
SIDE = float(os.environ.get('SIDE', '-1'))
CAM = """{ const X = __xq, B = X.Board.pos(4, 3), A = X.Board.pos(%d, %d), V = B.constructor; const d = B.clone().sub(A).setY(0).normalize(); const mid = A.clone().lerp(B, %s), side = new V(-d.z, 0, d.x).multiplyScalar(%s);
  const pos = mid.clone().addScaledVector(side, %s).addScaledVector(d, %s).add(new V(0, %s, 0)); const look = mid.clone().lerp(B, %s).add(new V(0, 0.22, 0)); X.Core.Cam.cine = true; X.Core.Cam.to(pos, look, 0.01, undefined, true); }""" % (FROM[0], FROM[1], os.environ.get('F', '0.55'), os.environ.get('SIDE', '1'), os.environ.get('DIST', '2.2'), os.environ.get('BACK', '-0.6'), os.environ.get('CH', '0.9'), os.environ.get('LF', '0.3'))
STEP = """(dt) => new Promise(res => { window.__dt = dt; requestAnimationFrame(() => { window.__dt = 0; res(); }); })"""
SHOT = """(side) => {
  if (side) %s
  Core.Cam.update && 0;
  const r = Core.renderer, cv = r.domElement; r.render(Core.scene, Core.camera);
  const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const g = c2.getContext('2d');
  g.drawImage(cv, 0, 0); const k = cv.width / cv.clientWidth, rc = cv.getBoundingClientRect();
  for (const el of document.querySelectorAll('.jmMinus')) {
    const t = Core.Time.t - (+el.dataset.t0); el.style.animationDelay = (-t) + 's';
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el), op = +cs.opacity; if (!(op > 0.01)) continue;
    g.save(); g.globalAlpha = op; const x = (b.left - rc.left) * k, y = (b.top - rc.top) * k, w = b.width * k, h = b.height * k;
    g.fillStyle = '#a8281c'; g.fillRect(x, y, w, h); g.strokeStyle = '#fff2da'; g.lineWidth = 1.5 * k * (w / el.offsetWidth / k); g.strokeRect(x + 2.7 * w / el.offsetWidth, y + 2.7 * w / el.offsetWidth, w - 5.4 * w / el.offsetWidth, h - 5.4 * w / el.offsetWidth);
    g.fillStyle = '#fff2da'; g.font = `900 ${Math.round(30 * w / el.offsetWidth)}px "Noto Serif SC","Noto Serif CJK SC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(el.textContent, x + w / 2, y + h / 2 + 1);
    g.restore();
  }
  return c2.toDataURL('image/jpeg', 0.88);
}""" % CAM
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s')); localStorage.setItem('xq3d-confirm','0'); localStorage.setItem('xq3d-models','%s'); localStorage.setItem('xq3d-vis', JSON.stringify('cine'));" % (Q, models))
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(f'http://127.0.0.1:{port}/?nopaper&nobd', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        pg.evaluate("window.__xq.startGame('local','r',{undo:99,total:0,step:0,hints:1,bf:1},{intro:false})"); time.sleep(5)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()")
        setup = """(() => { const X = __xq, g = X.game, S = g.S, BF = X.BF; const pw = S.board[3][4]; pw.lv = %s; pw.hp = BF.hpOf('p', %s);
          const fx = %d, fy = %d, t = '%s', alv = %s;
          if (t === 'r') { const rk = S.board[9][0]; S.board[9][0] = null; S.board[6][4] = rk; rk.lv = alv; rk.hp = BF.hpOf('r', alv); }
          else if (t === 'n') { const n = S.board[9][1]; S.board[9][1] = null; S.board[fy][fx] = n; n.lv = alv; n.hp = BF.hpOf('n', alv); }
          else { const q = S.board[6][4]; S.board[6][4] = null; S.board[fy][fx] = q; q.lv = alv; q.hp = BF.hpOf('p', alv); }
          X.Board.reconcile(g); return JSON.stringify({ pw: S.board[3][4], a: S.board[fy][fx] }); })()""" % (lv, lv, FROM[0], FROM[1], att, alv)
        print('setup', pg.evaluate(setup), flush=True)
        def wait():
            t1 = time.time()
            while time.time() - t1 < 90 and pg.evaluate("__xq.busy"): time.sleep(0.4)
        if phase == 'hit':
            print('juma', pg.evaluate("__xq.doBF({ k: 'sk', at: [4, 3] })"), flush=True); wait(); time.sleep(1)
            print('red', pg.evaluate("__xq.doBF({ k: 'mv', from: [0, 3], to: [0, 4] })"), flush=True); wait(); time.sleep(1.5)
            print('jm', pg.evaluate("__xq.game.jmActive(__xq.game.at(4,3))"), flush=True)
        # 接管时钟：之后每一帧推进多少游戏时间由这里说了算；三维自己画
        pg.evaluate("""(() => { THREE.Clock.prototype.getDelta = function () { return window.__dt || 0; }; window.__dt = 0; Core.render = false;
          new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('jmMinus')) { n.dataset.t0 = Core.Time.t; n.style.animationPlayState = 'paused'; const rm = n.remove.bind(n); n.remove = () => { const f = () => Core.Time.t - n.dataset.t0 > 1.5 ? rm() : setTimeout(f, 200); f(); }; } }).observe(document.body, { childList: true }); })()""")
        time.sleep(0.5)
        side = 'true' if cam == 'side' else 'false'
        if phase == 'pose': pg.evaluate("__xq.doBF({ k: 'sk', at: [4, 3] })")
        else: print('attack', pg.evaluate("__xq.doBF({ k: 'mv', from: [%d, %d], to: [4, 3] })" % tuple(FROM)), flush=True)
        N = int(float(secs) * fps); t1 = time.time()
        for i in range(N):
            pg.evaluate(f"({STEP})({1 / fps})")
            d = pg.evaluate(f"({SHOT})({side})")
            open(f"{out}/f{i:04d}.jpg", 'wb').write(base64.b64decode(d.split(',')[1]))
            if i % 10 == 0:
                bz = pg.evaluate('__xq.busy'); print('frame', i, round(time.time() - t1, 1), 'busy', bz, flush=True)
                if not bz and i > 30:
                    for j in range(12):
                        pg.evaluate(f"({STEP})({1 / fps})"); d = pg.evaluate(f"({SHOT})({side})"); open(f"{out}/f{i + 1 + j:04d}.jpg", 'wb').write(base64.b64decode(d.split(',')[1]))
                    break
        print('after', pg.evaluate("JSON.stringify({p: __xq.game.at(4,3), a: __xq.game.at(%d,%d)})" % tuple(FROM)))
        print('frames', N, 'errors', errs[:4], flush=True)
        b.close()
finally: http.terminate()
