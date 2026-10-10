"""M28 相 / 象打拒马逐帧录（照 steprec_juma.py）：
python3 steprec_jmxiang.py <站点> <输出目录> <守方等级> <攻方 x 汉相|y 楚象> <models 0|1> <攻方等级> <秒数> [fps]"""
import sys, time, subprocess, os, base64, json
from playwright.sync_api import sync_playwright
site, out, lv, att, models, alv, secs = sys.argv[1:8]
fps = float(sys.argv[8]) if len(sys.argv) > 8 else 20
phase, cam = 'hit', 'side'
Q = os.environ.get('Q', 'mid'); W, H = [int(x) for x in os.environ.get('WH', '800x450').split('x')]
port = 8100 + (abs(hash(out)) % 50)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
FROM = {'x': [2, 2], 'y': [2, 7]}[att]; TO = {'x': [4, 4], 'y': [4, 5]}[att]   # 汉在下（0～4 行），楚在上
SIDE = float(os.environ.get('SIDE', '-1'))
CAM = """{ const X = __xq, B = X.Board.pos(%d, %d), A = X.Board.pos(%d, %d), V = B.constructor; const d = B.clone().sub(A).setY(0).normalize(); const mid = A.clone().lerp(B, %s), side = new V(-d.z, 0, d.x).multiplyScalar(%s);
  const pos = mid.clone().addScaledVector(side, %s).addScaledVector(d, %s).add(new V(0, %s, 0)); const look = mid.clone().lerp(B, %s).add(new V(0, 0.22, 0)); X.Core.Cam.cine = true; X.Core.Cam.to(pos, look, 0.01, undefined, true); }""" % (TO[0], TO[1], FROM[0], FROM[1], os.environ.get('F', '0.55'), os.environ.get('SIDE', '1'), os.environ.get('DIST', '2.2'), os.environ.get('BACK', '-0.6'), os.environ.get('CH', '0.9'), os.environ.get('LF', '0.3'))
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
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('%s')); localStorage.setItem('xq3d-confirm','0'); localStorage.setItem('xq3d-models','%s'); localStorage.setItem('xq3d-vis', JSON.stringify('cine'));" % (Q, models))
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(f'http://127.0.0.1:{port}/?nopaper&nobd', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        pg.evaluate("window.__xq.startGame('local','r',{undo:99,total:0,step:0,hints:1,bf:1},{intro:false})"); time.sleep(5)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()")
        setup = """(() => { const X = __xq, g = X.game, S = g.S, BF = X.BF, lv = %s, alv = %s, att = '%s';
          if (att === 'x') {   // 楚卒过河站在 (4,4)，汉相在 (2,2)
            const pw = S.board[6][4]; S.board[6][4] = null; S.board[4][4] = pw; pw.lv = lv; pw.hp = BF.hpOf('p', lv);
            const e = S.board[0][2]; S.board[0][2] = null; S.board[2][2] = e; e.lv = alv; e.hp = BF.hpOf('e', alv);
          } else {             // 汉兵过河站在 (4,5)，楚象在 (2,7)
            const pw = S.board[3][4]; S.board[3][4] = null; S.board[5][4] = pw; pw.lv = lv; pw.hp = BF.hpOf('p', lv);
            const e = S.board[9][2]; S.board[9][2] = null; S.board[7][2] = e; e.lv = alv; e.hp = BF.hpOf('e', alv);
          }
          X.Board.reconcile(g); return JSON.stringify({ turn: S.turn }); })()""" % (lv, alv, att)
        print('setup', pg.evaluate(setup), flush=True)
        def wait():
            t1 = time.time()
            while time.time() - t1 < 90 and pg.evaluate("__xq.busy"): time.sleep(0.4)
        if att == 'x': print('red', pg.evaluate("__xq.doBF({ k: 'mv', from: [0, 3], to: [0, 4] })"), flush=True); wait(); time.sleep(1)
        print('juma', pg.evaluate("__xq.doBF({ k: 'sk', at: [%d, %d] })" % tuple(TO)), flush=True); wait(); time.sleep(1)
        other = "{ k: 'mv', from: [0, 6], to: [0, 5] }" if att == 'x' else "{ k: 'mv', from: [0, 3], to: [0, 4] }"
        print('other', pg.evaluate("__xq.doBF(%s)" % other), flush=True); wait(); time.sleep(1.5)
        print('jm', pg.evaluate("__xq.game.jmActive(__xq.game.at(%d,%d))" % tuple(TO)), flush=True)
        # 接管时钟：之后每一帧推进多少游戏时间由这里说了算；三维自己画
        pg.evaluate("""(() => { THREE.Clock.prototype.getDelta = function () { return window.__dt || 0; }; window.__dt = 0; Core.render = false;
          new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('jmMinus')) { n.dataset.t0 = Core.Time.t; n.style.animationPlayState = 'paused'; const rm = n.remove.bind(n); n.remove = () => { const f = () => Core.Time.t - n.dataset.t0 > 1.5 ? rm() : setTimeout(f, 200); f(); }; } }).observe(document.body, { childList: true }); })()""")
        time.sleep(0.5)
        side = 'true' if cam == 'side' else 'false'
        print('attack', pg.evaluate("__xq.doBF({ k: 'mv', from: [%d, %d], to: [%d, %d] })" % (tuple(FROM) + tuple(TO))), flush=True)
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
        print('after', pg.evaluate("JSON.stringify({p: __xq.game.at(%d,%d), a: __xq.game.at(%d,%d)})" % (tuple(TO) + tuple(FROM))))
        print('frames', N, 'errors', errs[:4], flush=True)
        b.close()
finally: http.terminate()
