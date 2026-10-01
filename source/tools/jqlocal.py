"""揭棋同屏随机对局测试：python3 tools/jqlocal.py [画面档 cine|std|low] [步数]
每步检查：无报错、动画结束、棋盘模型与规则引擎一致（暗子是漆背、明子是字面）、棋谱条数正确；最后悔棋若干步再核对。"""
import sys, time, pathlib, os, json
from playwright.sync_api import sync_playwright
lv = sys.argv[1] if len(sys.argv) > 1 else 'low'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 30
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
url = pathlib.Path(D + '/dist/site/index.html').resolve().as_uri() + '#jq'
CHECK = """(()=>{const x=window.__xq, g=x.game, B=x.Board; const bad=[];
 let n=0; for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=g.board[r][f]; if(!p) continue; n++; const m=B.pieces.get(p.id);
  if(!m){bad.push('nomesh '+p.id);continue;} const P=B.pos(f,r); if(Math.abs(m.position.x-P.x)>0.05||Math.abs(m.position.z-P.z)>0.05) bad.push('pos '+p.id);
  if(!!m.userData.h!==!!p.h) bad.push('face '+p.id+' '+p.h+' '+m.userData.h); if(!p.h && m.userData.t!==p.t) bad.push('type '+p.id);}
 if(B.pieces.size!==n) bad.push('meshcount '+B.pieces.size+'/'+n);
 if(x.notes.length!==g.history.length) bad.push('notes '+x.notes.length+'/'+g.history.length);
 return JSON.stringify({bad, ply:g.history.length, res:g.result, last:x.notes[x.notes.length-1]||''});})()"""
PICK = """(()=>{const g=window.__xq.game; const ms=[]; for(let r=0;r<10;r++)for(let f=0;f<9;f++) ms.push(...g.legalFrom(f,r));
 if(!ms.length) return null; const caps=ms.filter(m=>g.at(...m.to)); const hid=ms.filter(m=>g.at(...m.from).h);
 const pool = Math.random()<0.45&&caps.length?caps: Math.random()<0.5&&hid.length?hid:ms; const m=pool[Math.floor(Math.random()*pool.length)]; return JSON.stringify(m);})()"""
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 400}); pg.set_default_timeout(120000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('low'));")
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='domcontentloaded'); time.sleep(4)
    pg.evaluate(f"(()=>{{const x=window.__xq; x.Core.Time.boost=8; x.Fx.level='{lv}'; x.Fx.gore=3;}})()")
    def settle(t=150):
        t0 = time.time()
        while time.time() - t0 < t:
            time.sleep(0.4)
            if pg.evaluate('window.__xq.busy') == 0: return True
        return False
    for i in range(N):
        mv = pg.evaluate(PICK)
        if not mv: print('no moves'); break
        m = json.loads(mv)
        t0 = time.time()
        r = pg.evaluate(f"window.__xq.doMove({json.dumps({'from': m['from'], 'to': m['to']})})")
        done = settle()
        c = json.loads(pg.evaluate(CHECK))
        print(f"{i+1:3d} {m['from']}->{m['to']} ok={r} {time.time()-t0:4.1f}s {c['last']} bad={c['bad']}", flush=True)
        if c['bad'] or not r or not done: ok = False
        while logs: l = logs.pop(0); print('   ', l[:300], flush=True); ok = ok and 'PAGEERROR' not in l and 'error' not in l[:6]
        if c['res']: print('result', c['res']); break
    # 悔棋
    if not json.loads(pg.evaluate(CHECK))['res']:
        for k in range(4):
            pg.evaluate("window.__xq.opts.undo=99; window.__xq.requestUndo(); 1")
            time.sleep(0.5)
            if pg.evaluate("!document.getElementById('mAsk').classList.contains('hidden')"): pg.evaluate("document.getElementById('askYes').click()")
            settle()
        c = json.loads(pg.evaluate(CHECK))
        print('after undo', c, flush=True)
        if c['bad']: ok = False
    caps = pg.evaluate("document.getElementById('cardMe').querySelector('.caps').innerHTML + ' | ' + document.getElementById('cardOpp').querySelector('.caps').innerHTML")
    print('caps:', caps[:400])
    pg.screenshot(path=D + '/shots/jqlocal.png')
    while logs: print('   ', logs.pop(0)[:300])
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
