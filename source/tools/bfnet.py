"""兵法联机全流程测试：房主 A（红）+ 加入方 B（黑）+ 观众 C（本地 MQTT 中继 + 本地 HTTP）
核对：房间设置选兵法、升级/走子/击杀攒甲/拒马不占行动/主帅兵法逐条同步、三方规则状态完全一致（军功、等级、生命、冷却、状态）、
悔棋按行动序列回退、加入方刷新续局、观众中途进场拿到完整局面。"""
import time, subprocess, json, os, sys
from playwright.sync_api import sync_playwright

D = os.path.dirname(os.path.abspath(__file__)) + '/..'
mq = subprocess.Popen(['node', 'tools/mqttsrv.js'], cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8000', '--bind', '127.0.0.1'], cwd=D + '/dist/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
BASE = 'http://127.0.0.1:8000/'
args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
ok = True
def check(cond, msg):
    global ok
    print(('PASS ' if cond else 'FAIL ') + msg, flush=True)
    ok = ok and bool(cond)
    return cond
def wait(fn, secs=30, step=0.5):
    t = time.time()
    while time.time() - t < secs:
        try:
            if fn(): return True
        except Exception: pass
        time.sleep(step)
    return False
INIT = "localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-norender','1'); localStorage.setItem('xq3d-server', JSON.stringify('ws://127.0.0.1:8883')); localStorage.setItem('xq3d-quality', JSON.stringify('low'));"
IDLE = "window.__xq.busy===0 && window.__xq.started"
STATE = "JSON.stringify(window.__xq.game.S)"
ENT = "JSON.stringify(window.__xq.game.entries)"
# 棋盘模型与规则状态一致（位置、甲片 = 生命、金星 = 等级 - 1）
MESH = """(()=>{const x=window.__xq, g=x.game, B=x.Board; const bad=[]; let n=0;
 for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=g.board[r][f]; if(!p) continue; n++; const m=B.pieces.get(p.id);
  if(!m){bad.push('nomesh '+p.id);continue;} const P=B.pos(f,r); if(Math.abs(m.position.x-P.x)>0.05||Math.abs(m.position.z-P.z)>0.05) bad.push('pos '+p.id);
  const d=m.userData.deco; const plates=d?d.children.filter(c=>c.userData.plate!=null):[]; const on=plates.filter(c=>c.material===B.plateOn).length;
  if(on!==Math.min(8,p.xp||0)) bad.push('plates '+p.id);
  const bar=d?d.children.find(c=>c.userData.hpBar):null; if(p.lv>=2 && (!bar || bar.userData.hpBar.hp!==p.hp)) bad.push('hpbar '+p.id);
  const wood=m.children[0].material===B.pieceWood; if(p.t!=='k' && wood!==(p.lv<2)) bad.push('body '+p.id);}
 if(B.pieces.size!==n) bad.push('meshcount '+B.pieces.size+'/'+n);
 return bad.join(',');})()"""
try:
    with sync_playwright() as p:
        brs = {k: p.chromium.launch(args=args) for k in 'ABCD'}
        logs = {}
        def page(name, url, ctx=None):
            c = ctx or brs[name[0]].new_context(viewport={'width': 480, 'height': 360})
            if not ctx: c.add_init_script(INIT)
            pg = c.new_page(); pg.set_default_timeout(90000)
            logs.setdefault(name, [])
            pg.on('console', lambda m: logs[name].append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: logs[name].append('PAGEERROR ' + str(e)))
            pg.goto(url, wait_until='domcontentloaded')
            wait(lambda: pg.evaluate('!!window.__xq'), 30)
            return pg, c
        ev = lambda pg, js: pg.evaluate(js)
        fast = lambda pg: ev(pg, "window.__xq.Fx.level='low'; window.__xq.Core.Time.boost=8")
        A, ctxA = page('A', BASE)
        A.evaluate("document.querySelector('#bCreate').click()")
        A.evaluate("""['[data-k=v] [data-v=\"bf\"]','[data-k=undo] [data-v=\"99\"]','[data-k=side] [data-v=\"r\"]','[data-k=total] [data-v=\"0\"]','[data-k=step] [data-v=\"0\"]'].forEach(q=>document.querySelector(q).click())""")
        check('兵法' in A.inner_text('#varNote'), '房间设置选“兵法”，说明随之切换：' + A.inner_text('#varNote'))
        A.evaluate("document.querySelector('#bCreateGo').click()")
        check(wait(lambda: '·' not in A.inner_text('#roomCode'), 20), '房主拿到房间码')
        code = A.inner_text('#roomCode').strip()
        check('技能模式' in A.inner_text('#waitChips'), '等待页标签显示技能模式')
        B, ctxB = page('B', BASE + '?room=' + code)
        if not check(wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(A, "window.__xq.mode") == 'host', 40), '两位棋手入局'):
            print('   A mode', ev(A, "window.__xq.mode"), 'B mode', ev(B, "window.__xq.mode"), 'B note', ev(B, "document.getElementById('joinNote').innerText"))
            for k, v in logs.items(): print('  ', k, v[:6])
        fast(A); fast(B)
        check(ev(B, "!!window.__xq.game.bf") and ev(A, "!!window.__xq.game.bf"), '双方都是兵法局')
        check(ev(A, "window.__xq.game.merit.r") == 3 and ev(B, "window.__xq.game.merit.b") == 3, '开局各 3 军功')
        C, ctxC = page('C', BASE + '?room=' + code)
        wait(lambda: ev(C, "!document.getElementById('mName').classList.contains('hidden')"), 40)
        C.evaluate("document.getElementById('nameIn').value='看客'; document.getElementById('nameGo').click()")
        check(wait(lambda: ev(C, "window.__xq.mode") == 'watch', 30), '观众入席')
        fast(C)
        check(ev(C, "!!window.__xq.game.bf"), '观众看到的也是兵法局')
        wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        n = 0
        def same(label, pages=None):
            pages = pages or [A, B, C]
            def eq():
                s = [ev(pg, STATE) for pg in pages]
                return all(x == s[0] for x in s) and all(ev(pg, IDLE) for pg in pages)
            r = wait(eq, 60)
            check(r, label + ' → 各方规则状态一致')
            if r:
                bad = [ev(pg, MESH) for pg in pages]
                check(not any(bad), label + ' → 各方棋盘模型与状态相符' + (' ' + str(bad) if any(bad) else ''))
                nt = [ev(pg, "window.__xq.notes.join(' ')") for pg in pages]
                check(all(x == nt[0] for x in nt), label + ' → 棋谱一致：' + nt[0][-60:])
            return r
        def act(pg, e, label):
            wait(lambda: ev(pg, IDLE), 60)
            r = ev(pg, f"window.__xq.doBF({json.dumps(e)})")
            check(r, label + ' 发出')
            return same(label)
        def undo(req, ans, label):
            wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
            ev(req, "window.__xq.requestUndo()")
            check(wait(lambda: ev(ans, "!document.getElementById('mAsk').classList.contains('hidden')"), 15), label + '：对方收到悔棋请求')
            ans.evaluate("document.querySelector('#askYes').click()")
            wait(lambda: ev(A, IDLE) and ev(B, IDLE), 60)
        G = lambda pg, js: ev(pg, "(()=>{const g=window.__xq.game; return " + js + ";})()")
        # 1. 红方升级中兵（二级只长血）→ 炮打马：炮攒一片甲
        act(A, {'k': 'up', 'at': [4, 3]}, '红：升级中兵')
        check(G(B, "g.at(4,3).lv") == 2 and G(B, "g.at(4,3).hp") == 2 and G(B, "g.merit.r") == 0, '黑方看到红兵二级 2 血、红方军功扣到 0')
        check(not G(A, "g.skillTargets(4,3).length"), '二级兵没有技能')
        act(A, {'k': 'mv', 'from': [1, 2], 'to': [1, 9]}, '红：炮打马')
        check(G(B, "g.at(1,9).xp") == 1 and G(C, "g.at(1,9).xp") == 1 and G(B, "g.upgradeCost(g.at(1,9))") == 4, '各方看到红炮攒一片甲、升级价 5→4')
        # 2. 黑炮打马
        act(B, {'k': 'mv', 'from': [7, 7], 'to': [7, 0]}, '黑：炮打马')
        act(A, {'k': 'mv', 'from': [4, 3], 'to': [4, 4]}, '红：兵五进一')
        act(B, {'k': 'mv', 'from': [0, 9], 'to': [0, 8]}, '黑：车1进1')
        act(A, {'k': 'mv', 'from': [4, 4], 'to': [4, 5]}, '红：兵过河')
        act(B, {'k': 'mv', 'from': [7, 0], 'to': [7, 1]}, '黑：炮让出马位')
        # 3. 兵升三级解锁拒马
        check(G(A, "g.merit.r") == 5, '红方军功 5（吃马 3 + 被吃补偿 1 + 过河 1）')
        act(A, {'k': 'up', 'at': [4, 5]}, '红：兵升三级')
        check(G(B, "g.at(4,5).lv") == 3 and G(B, "g.at(4,5).hp") == 3, '黑方看到红兵三级 3 血')
        act(A, {'k': 'mv', 'from': [8, 3], 'to': [8, 4]}, '红：边兵进一')
        act(B, {'k': 'mv', 'from': [0, 8], 'to': [0, 9]}, '黑：车退回')
        # 4. 拒马不占行动：架完还轮到红方，再走一步才换手
        tg = json.loads(ev(A, "JSON.stringify(window.__xq.game.skillTargets(4,5))"))
        check(len(tg) == 1, '三级兵可用拒马')
        act(A, tg[0], '红：拒马')
        check(all(G(pg, "g.turn") == 'r' and G(pg, "g.freeUsed") for pg in [A, B, C]), '三方：拒马后仍是红方行动、要再走一步')
        check(G(B, "g.at(4,5).jm") > 0, '黑方看到拒马状态')
        check(not G(A, "g.legalFrom(4,5).length"), '架拒马的兵本回合不能动')
        act(A, {'k': 'mv', 'from': [8, 4], 'to': [8, 5]}, '红：拒马后再走一步')
        check(all(G(pg, "g.turn") == 'b' for pg in [A, B, C]), '再走一步后换黑方')
        # 5. 悔一步（黑方回合红方请求）：拒马和后面那步一起退回
        undo(A, B, '悔一步')
        check(wait(lambda: all(G(pg, "g.turn") == 'r' and not G(pg, "g.freeUsed") and G(pg, "g.at(4,5).jm") == 0 for pg in [A, B]), 30), '悔棋：拒马和那一步一起退回，又轮到红方')
        same('悔一步后')
        act(A, tg[0], '红：再次拒马')
        act(A, {'k': 'mv', 'from': [8, 4], 'to': [8, 5]}, '红：再走一步')
        # 6. 黑卒撞拒马：一级卒直接阵亡，记为红兵击杀（攒甲）
        act(B, {'k': 'mv', 'from': [4, 6], 'to': [4, 5]}, '黑：卒撞拒马')
        check(not G(A, "g.at(4,6)") and G(A, "g.at(4,5).s") == 'r' and G(B, "g.at(4,5).xp") == 1, '黑卒阵亡、红兵攒一片甲')
        # 7. 萧何追韩信 → 悔两步（红方回合请求）
        opts = json.loads(ev(A, "JSON.stringify(window.__xq.game.reviveOptions())"))
        check(len(opts) > 0, '红方可以复活阵亡的马')
        if opts: act(A, {'k': 'art', 'id': opts[0]['id']}, '红：萧何追韩信')
        act(B, {'k': 'mv', 'from': [8, 9], 'to': [8, 8]}, '黑：车9进1')
        undo(A, B, '悔两步')
        check(wait(lambda: not G(A, "g.used.art.r") and not G(B, "g.used.art.r"), 30), '悔到复活之前：萧何追韩信重新可用')
        same('悔两步后')
        opts = json.loads(ev(A, "JSON.stringify(window.__xq.game.reviveOptions())"))
        if opts: act(A, {'k': 'art', 'id': opts[0]['id']}, '红：再次萧何追韩信')
        # 8. 黑方刷新页面（同一设备）→ 恢复完整兵法局面
        wait(lambda: ev(B, IDLE), 60)
        sB = ev(A, STATE)
        B.reload(wait_until='domcontentloaded'); wait(lambda: B.evaluate('!!window.__xq'), 30)
        t0 = time.time(); r = wait(lambda: ev(B, "window.__xq.mode") == 'guest' and ev(B, STATE) == sB, 40)
        print('   刷新恢复用时 %.1fs' % (time.time() - t0), flush=True)
        if not r:
            try:
                a, b = json.loads(sB), json.loads(ev(B, STATE))
                for k in a:
                    if json.dumps(a[k]) != json.dumps(b.get(k)): print('   diff', k, json.dumps(a[k])[:300], '|', json.dumps(b.get(k))[:300])
            except Exception as e: print('   diff err', e)
        check(r, '黑方刷新后恢复完整兵法局面（军功/等级/甲片/冷却/兵法使用）')
        fast(B)
        wait(lambda: ev(B, IDLE), 60)
        act(B, {'k': 'mv', 'from': [8, 9], 'to': [8, 8]}, '刷新后黑：车9进1')
        # 9. 观众中途离开再进场
        ctxC.close()
        C, ctxC = page('C2', BASE + '?room=' + code)
        if wait(lambda: ev(C, "!document.getElementById('mName').classList.contains('hidden')"), 20):
            C.evaluate("document.getElementById('nameIn').value='看客2'; document.getElementById('nameGo').click()")
        check(wait(lambda: ev(C, "window.__xq.mode") == 'watch' and ev(C, STATE) == ev(A, STATE), 40), '观众中途进场拿到完整局面')
        fast(C)
        act(A, {'k': 'mv', 'from': [8, 0], 'to': [8, 2]}, '红：车进二')
        same('终局前')
        for k, v in logs.items():
            errs = [l for l in v if 'PAGEERROR' in l or 'rror' in l]
            if errs: print(k, 'errors:', errs[:6]); ok = False
        for b in brs.values(): b.close()
finally:
    mq.terminate(); http.terminate()
print('ALL PASS' if ok else 'SOME FAILED')
