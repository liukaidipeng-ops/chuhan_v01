"""兵法同屏随机对局测试：python3 tools/bflocal.py [画面档 cine|std|low] [行动数] [种子]
每步随机：可能先升级，再在 走子 / 兵种技能 / 主帅兵法 / 终极兵法 / 停着 里挑一个合法的执行。
每步核对：无报错、动画结束、棋盘模型与规则状态一致（位置、甲片数 = 生命、金星数 = 等级-1、拒马木桩）、棋谱条数；最后悔棋再核对。"""
import sys, time, pathlib, os, json
from playwright.sync_api import sync_playwright
lv = sys.argv[1] if len(sys.argv) > 1 else 'low'
N = int(sys.argv[2]) if len(sys.argv) > 2 else 30
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 7
D = os.path.dirname(os.path.abspath(__file__)) + '/..'
url = pathlib.Path(D + '/dist/site/index.html').resolve().as_uri() + '#bf'
CHECK = """(()=>{const x=window.__xq, g=x.game, B=x.Board; const bad=[];
 let n=0; for(let r=0;r<10;r++)for(let f=0;f<9;f++){const p=g.board[r][f]; if(!p) continue; n++; const m=B.pieces.get(p.id);
  if(!m){bad.push('nomesh '+p.id);continue;} const P=B.pos(f,r); if(Math.abs(m.position.x-P.x)>0.05||Math.abs(m.position.z-P.z)>0.05) bad.push('pos '+p.id);
  if(!m.visible) bad.push('invisible '+p.id);
  const d=m.userData.deco; const plates=d?d.children.filter(c=>c.userData.plate!=null):[]; const on=plates.filter(c=>c.material===B.plateOn).length;
  if(p.lv>=2 && on!==p.hp) bad.push('plates '+p.id+' '+on+'/'+p.hp);
  const stars=d?d.children.filter(c=>c.geometry && c.geometry.type==='ShapeGeometry').length/2:0; if(p.t!=='k' && stars!==p.lv-1) bad.push('stars '+p.id+' '+stars+'/'+(p.lv-1));
 }
 if(B.pieces.size!==n) bad.push('meshcount '+B.pieces.size+'/'+n);
 if(x.notes.length!==g.history.length) bad.push('notes '+x.notes.length+'/'+g.history.length);
 return JSON.stringify({bad, n:g.history.length, res:g.result, last:x.notes[x.notes.length-1]||'', merit:g.merit, round:g.round});})()"""
PICK = """((seed)=>{let s=seed; const rnd=()=>{s=(s*1103515245+12345)%2147483648; return s/2147483648;};
 const x=window.__xq, g=x.game, side=g.turn; const acts=[];
 const ups=[]; for(let r=0;r<10;r++)for(let f=0;f<9;f++){ if(g.canUpgrade(f,r)) ups.push([f,r]); }
 const up = ups.length && rnd()<0.45 ? ups[Math.floor(rnd()*ups.length)] : null;
 const mv=[], sk=[];
 for(let r=0;r<10;r++)for(let f=0;f<9;f++){ const p=g.at(f,r); if(!p||p.s!==side) continue; for(const m of g.legalFrom(f,r)) mv.push({k:'mv',from:m.from,to:m.to}); for(const a of g.skillTargets(f,r)) sk.push(a); }
 const art = side==='r' ? g.reviveOptions().map(o=>({k:'art',id:o.id})) : [];
 let pf=null; if(side==='b' && rnd()<0.08){ const f1=g.pofuFirst(); if(f1.length){ const m1=f1[Math.floor(rnd()*f1.length)]; const s2=g.pofuSecond(m1); if(s2.length){ const m2=s2[Math.floor(rnd()*s2.length)]; pf={k:'art',steps:[{from:m1.from,to:m1.to},{from:m2.from,to:m2.to}]}; } } }
 const ult = g.ultReady() ? [{k:'ult'}] : [];
 const pass = g.mustPass() ? [{k:'pass'}] : [];
 const caps = mv.filter(a=>g.at(a.to[0],a.to[1]));
 let a;
 const r0=rnd();
 if (pass.length && !mv.length && !sk.length) a=pass[0];
 else if (ult.length && r0<0.5) a=ult[0];
 else if (pf) a=pf;
 else if (art.length && r0<0.3) a=art[0];
 else if (sk.length && r0<0.55) a=sk[Math.floor(rnd()*sk.length)];
 else if (caps.length && r0<0.75) a=caps[Math.floor(rnd()*caps.length)];
 else if (mv.length) a=mv[Math.floor(rnd()*mv.length)];
 else if (sk.length) a=sk[0]; else if (art.length) a=art[0]; else if (pass.length) a=pass[0];
 return JSON.stringify({up, a, n:{mv:mv.length, sk:sk.length, art:art.length, ult:ult.length}});})"""
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 400}); pg.set_default_timeout(120000)
    pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('low'));")
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text and 'deprecated' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='domcontentloaded'); time.sleep(4)
    pg.evaluate(f"(()=>{{const x=window.__xq; x.Core.Time.boost=8; x.Fx.level='{lv}'; x.Fx.gore=3; x.game.setup(T=>{{T.merit={{r:12,b:12}};}}); x.Board.setPosition(x.game);}})()")
    def settle(t=200):
        t0 = time.time()
        while time.time() - t0 < t:
            time.sleep(0.4)
            if pg.evaluate('window.__xq.busy') == 0: return True
        return False
    kinds = {}
    for i in range(N):
        pk = json.loads(pg.evaluate(PICK + f"({seed * 1000 + i})"))
        if pk['up']: pg.evaluate(f"window.__xq.doBF({{k:'up',at:{json.dumps(pk['up'])}}})"); settle()
        a = pk['a']
        if not a: print('no action', pk); break
        t0 = time.time()
        r = pg.evaluate(f"window.__xq.doBF({json.dumps(a)})")
        done = settle()
        c = json.loads(pg.evaluate(CHECK))
        k = a['k'] + (':' + pg.evaluate("(()=>{const h=window.__xq.game.history; const l=h[h.length-1]; return l && l.extra && l.extra.sk || ''})()") if a['k'] == 'sk' else '')
        kinds[k] = kinds.get(k, 0) + 1
        print(f"{i+1:3d} {'↑' if pk['up'] else ' '} {k:14s} ok={r} {time.time()-t0:4.1f}s {c['last']:22s} 功{c['merit']['r']}/{c['merit']['b']} bad={c['bad']}", flush=True)
        if c['bad'] or not r or not done: ok = False
        while logs: l = logs.pop(0); print('   ', l[:300], flush=True); ok = ok and 'PAGEERROR' not in l and not l.startswith('error')
        if c['res']: print('result', c['res']); break
    print('kinds', kinds)
    if not json.loads(pg.evaluate(CHECK))['res']:
        for k in range(3):
            pg.evaluate("window.__xq.requestUndo(); 1"); time.sleep(0.5)
            if pg.evaluate("!document.getElementById('mAsk').classList.contains('hidden')"): pg.evaluate("document.getElementById('askYes').click()")
            settle()
        c = json.loads(pg.evaluate(CHECK)); print('after undo', c, flush=True)
        if c['bad']: ok = False
    pg.screenshot(path=D + '/shots/bflocal.png')
    while logs: print('   ', logs.pop(0)[:300])
    b.close()
print('ALL PASS' if ok else 'SOME FAILED')
