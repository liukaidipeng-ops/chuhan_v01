# 交付前自查：真实对局里，军功印的静态样子 + merit.js 的加功 / 花功
import sys, time, os, json
sys.argv = ['x']
exec(open('../ui5/hp.py').read().split("if __name__")[0])
H2 = os.path.dirname(os.path.abspath(__file__)); OUT2 = H2 + '/mtest'; os.makedirs(OUT2, exist_ok=True)
MJ = open('/home/claude/chuhan_v01/source/src/merit.js', encoding='utf-8').read()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp in os.environ.get('VPS', 'm,pc').split(','):
        pg = start(b, vp)
        pg.add_script_tag(content=MJ + "\nwindow.Merit = Merit; window.__T = null; const __pn = performance.now.bind(performance); performance.now = () => window.__T ?? __pn();")
        time.sleep(0.5); pg.screenshot(path=f'{OUT2}/{vp}_0.png')
        red_low = pg.evaluate("()=>{const G=Board.lastGame;for(let r=0;r<10;r++)for(let f=0;f<9;f++){const q=G.board[r][f];if(q&&q.t==='k'&&q.s==='r')return r<5}}")
        cap = [4, 6] if red_low else [4, 3]; upg = [2, 5] if red_low else [6, 4]
        for kind, ms in (('g', 200), ('g', 520), ('g', 900), ('s', 250), ('s', 600)):
            pg.evaluate("([kind,cap,upg])=>{document.querySelectorAll('.mfly').forEach(e=>e.remove());window.__T=1e6;const v=+document.querySelector('.pcard.r .mer i').textContent;if(kind==='g')Merit.gain('r',1,'斩敌 · 卒',Merit.at(...cap),v+1);else Merit.spend('r',2,'升级 · 车',Merit.at(...upg),Math.max(0,v-2));}", [kind, cap, upg])
            for st in range(40, ms + 1, 40):
                pg.evaluate("(ms)=>{window.__T=1e6+ms}", st); time.sleep(0.12)
            pg.evaluate("(ms)=>{window.__T=1e6+ms}", ms); time.sleep(2.0)
            pg.screenshot(path=f'{OUT2}/{vp}_{kind}{ms}.png'); print('shot', vp, kind, ms, flush=True)
            pg.evaluate("()=>{window.__T=1e6+5000}"); time.sleep(6.0)
        pg.close()
    b.close()
