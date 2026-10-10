"""技能特效实机逐帧录（借 TD 的 steprec_juma.py 的做法：接管时钟，一帧一帧推，自己渲染）
python3 fxrec.py <站点目录> <输出目录> <场景 jianta|qishe|hujia|juma|jmswitch> <models 0|1> <vis std|low|cine> <秒数> [fps]
每帧另记一行数字（probe）到 probe.txt：特效物件的位置、透明度，用来逐帧自查。"""
import sys, time, subprocess, os, base64, json
from playwright.sync_api import sync_playwright
site, out, scene, models, vis, secs = sys.argv[1:7]
fps = float(sys.argv[7]) if len(sys.argv) > 7 else 20
W, H = [int(x) for x in os.environ.get('WH', '800x450').split('x')]
port = 8150 + (abs(hash(out)) % 40)
os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
http = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
# 摆局面：S 直接改，turn 改成出手的一方；返回出手动作
SCN = {
 # 楚象四级在 (2,9)，跳到 (4,7) 吃汉兵；(3,7)、(5,6) 各一个二级汉兵挨践踏（汉在 0 行那边）
 'jianta': """const e = S.board[9][2]; e.lv = 4; e.hp = BF.hpOf('e', 4);
   const mv = (a, b) => { S.board[b[1]][b[0]] = S.board[a[1]][a[0]]; S.board[a[1]][a[0]] = null; return S.board[b[1]][b[0]]; };
   mv([4, 3], [4, 7]); const p1 = mv([2, 3], [3, 7]); p1.lv = 2; p1.hp = BF.hpOf('p', 2); const p2 = mv([6, 3], [5, 6]); p2.lv = 2; p2.hp = BF.hpOf('p', 2);
   S.board[7][1] = null; S.turn = 'b'; return { k: 'mv', from: [2, 9], to: [4, 7] };""",
}
# 镜头：从汉方一侧斜看目标格（AT 环境变量 f,r；DIST 远近、CH 高度），每帧摆一次，不受游戏镜头影响
AT = [int(x) for x in os.environ.get('AT', '4,7').split(',')]
CAMJS = """{ const B = Board.pos(%d, %d), V = B.constructor, d = Board.pos(4, 0).sub(Board.pos(4, 9)).setY(0).normalize();
  Core.camera.position.copy(B).addScaledVector(d, %s).add(new V(%s, %s, 0)); Core.camera.lookAt(B.clone().add(new V(0, 0.3, 0))); Core.camera.updateMatrixWorld(); }""" % (AT[0], AT[1], os.environ.get('DIST', '5.5'), os.environ.get('SX', '0.8'), os.environ.get('CH', '4.8'))
SK = lambda f, r, sk, to=None: """const acts = g.skillTargets(%d, %d, '%s'); const a = %s; if (!a) throw new Error('没有可用的技能动作 ' + JSON.stringify(acts)); return a;""" % (f, r, sk, 'acts.find(x => x.to && x.to[0] === %d && x.to[1] === %d)' % tuple(to) if to else 'acts[0]')
SCN.update({
 # 汉相四级在 (2,0)，射斜线两格 (4,2) 的二级楚卒（挨 1 点不死）
 'qishe': """const e = S.board[0][2]; e.lv = 4; e.hp = BF.hpOf('e', 4);
   const q = S.board[6][4]; S.board[6][4] = null; S.board[2][4] = q; q.lv = 2; q.hp = BF.hpOf('p', 2); S.turn = 'r';""" + SK(2, 0, 'qishe', (4, 2)),
 # 汉仕 (3,0) 与帅 (4,0) 互换；楚车在 (4,5) 将军
 'hujia': """const sh = S.board[0][3]; sh.lv = 3; sh.hp = BF.hpOf('a', 3); const rk = S.board[9][0]; S.board[9][0] = null; S.board[5][4] = rk; S.board[3][4] = null; S.turn = 'r';""" + SK(3, 0, 'hujia'),
 # 汉兵二级 (4,3) 架拒马
 'juma': """const q = S.board[3][4]; q.lv = 2; q.hp = BF.hpOf('p', 2); S.turn = 'r';""" + SK(4, 3, 'juma'),
})
SHOT = """() => { """ + CAMJS + """ const r = Core.renderer; r.render(Core.scene, Core.camera); return r.domElement.toDataURL('image/jpeg', 0.85); }"""
STEP = """(dt) => new Promise(res => { window.__dt = dt; requestAnimationFrame(() => { window.__dt = 0; res(); }); })"""
PROBE = """() => { const o = []; Core.scene.traverse(n => { if (n.isGroup && n.userData.jmGhost) o.push('矛影 k=' + n.userData.k.toFixed(2) + ' vis=' + n.visible + ' 透明=' + n.userData.pole.opacity.toFixed(2) + ' 大小=' + (n.children[0] ? n.children[0].scale.x.toFixed(2) : '-'));
  if (n.name === 'jumaWall') o.push('木拒马 大小=' + n.scale.x.toFixed(2) + ' 段=' + n.children.filter(c => c.visible).map(c => c.scale.x.toFixed(2)).join('/'));
  if (n.isMesh && n.userData.sky && n.visible && n.parent) o.push('箭 y=' + n.position.y.toFixed(2));
  if (n.isGroup && n.renderOrder === 6) { let op = 0; n.traverse(q => q.material && (op = Math.max(op, q.material.opacity))); o.push('腿或盾 y=' + n.position.y.toFixed(2) + ' op=' + op.toFixed(2)); } });
  return o.join(' | ') + ' | shake=' + (Core.Cam.shakeK != null ? Core.Cam.shakeK.toFixed(2) : '?'); }"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=__import__('glob').glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0], args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        c = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        c.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid')); localStorage.setItem('xq3d-confirm','0'); localStorage.setItem('xq3d-models','%s'); localStorage.setItem('xq3d-vis', JSON.stringify('%s'));" % (models, vis))
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(f'http://127.0.0.1:{port}/?nopaper&nobd', wait_until='commit'); t0 = time.time()
        while time.time() - t0 < 120 and not pg.evaluate("!!window.__xq && !document.getElementById('loading')"): time.sleep(0.3)
        pg.evaluate("window.__xq.startGame('local','r',{undo:99,total:0,step:0,hints:1,bf:1},{intro:false})"); time.sleep(5)
        pg.evaluate("(() => { const o = document.getElementById('bfTipOk'); if (o && !document.getElementById('bfTip').classList.contains('hidden')) o.click(); })()")
        act = pg.evaluate("(() => { const X = __xq, g = X.game, S = g.S, BF = X.BF; const a = (() => { %s })(); X.Board.reconcile(g); return JSON.stringify(a); })()" % SCN[scene])
        print('vis', pg.evaluate("__xq.Fx.level"), 'models', models, 'act', act, flush=True)
        pg.evaluate("""(() => { THREE.Clock.prototype.getDelta = function () { return window.__dt || 0; }; window.__dt = 0; Core.render = false; })()"""); time.sleep(0.5)
        print('doBF', pg.evaluate("__xq.doBF(%s)" % act), flush=True)
        N = int(float(secs) * fps); pr = open(f'{out}/probe.txt', 'w')
        for i in range(N):
            pg.evaluate(f"({STEP})({1 / fps})")
            if i < float(os.environ.get('SKIP', '0')) * fps: continue   # 前面没看头的几秒只推时间不截图
            d = pg.evaluate(f"({SHOT})()"); open(f"{out}/f{i:04d}.jpg", 'wb').write(base64.b64decode(d.split(',')[1]))
            pr.write(f"{i / fps:.2f}s {pg.evaluate(f'({PROBE})()')}\n")
            for sw in os.environ.get('SWITCH', '').split(','):
                if sw and int(sw.split(':')[0]) == i: pg.evaluate("Squads.Stand.set(%s)" % ('true' if sw.split(':')[1] == '1' else 'false')); pr.write(f"--- 切到 {'模型' if sw.split(':')[1] == '1' else '棋子'}\n")
        print('busy after', pg.evaluate('__xq.busy'), 'errors', errs[:4], flush=True)
        b.close()
finally: http.terminate()
