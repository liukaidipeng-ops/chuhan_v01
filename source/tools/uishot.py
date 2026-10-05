"""界面改版截图：python3 tools/uishot.py [只拍哪些，逗号分隔] [视口：pc,m,m360,land,lap]
每个界面在电脑 1440×900 和手机 390×844 各拍一张，存到 source/shots/ui/。"""
import sys, time, pathlib, os
from playwright.sync_api import sync_playwright
SRC = os.path.dirname(os.path.abspath(__file__)) + "/.."; ONLY = set(sys.argv[1].split(",")) if len(sys.argv) > 1 and sys.argv[1] else None
OUT = SRC + '/shots/ui'; os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
VP = {'pc': (1440, 900, 1), 'm': (390, 844, 2), 'm360': (360, 740, 2), 'land': (844, 390, 2), 'lap': (1280, 720, 1)}
SHOW = "(id)=>{for(const p of ['pMain','pAI','pHall','pCreate','pWait','pJoin'])document.getElementById(p).classList.toggle('hidden',p!==id)}"
HALL = """()=>{document.getElementById('hallNote').textContent='2 个房间在等对手';
const row=(o,g,n,c,lock,s,t)=>`<li class="${o?'open':'play'}"><span class="hv ${g}">${n[0]}</span><span class="hi"><b>${n}</b> · 房间 ${c}${lock?' 🔒':''}<small>${s} · ${t}</small></span><button class="btn small ${o?'red solid':''}" data-code="${c}">${o?'加 入':'观 战'}</button></li>`;
document.getElementById('hallList').innerHTML=row(1,'bf','技能模式','KXQ7M',0,'房主执红（汉），你执黑（楚）','不限时')+row(1,'','象棋','B3TRA',1,'房主执黑（楚），你执红（汉）','每方 15 分 · 每步 1 分')+row(0,'jq','揭棋','HN52P',0,'对局中','每方 10 分')+row(0,'bf','技能模式','W8DLC',0,'对局中','不限时')+row(1,'','象棋','Q6FZE',0,'房主执红（汉），你执黑（楚）','每方 30 分')}"""
WAIT = """()=>{document.getElementById('roomCode').textContent='KXQ7M';
document.getElementById('roomSeats').innerHTML='<div class="seat r me"><span class="sd">红·汉</span><div class="who">你（房主）</div><small>已就座</small></div><div class="seat b empty"><span class="sd">黑·楚</span><div class="who">等待对手</div><small>空位</small></div>';
document.getElementById('waitChips').innerHTML='<span class="chip">技能模式</span><span class="chip">公开</span><span class="chip">悔棋 3 次</span><span class="chip">不限时</span>';
document.getElementById('waitNote').textContent='把房间码发给朋友，或等大厅里的人加入';
document.getElementById('roomHostRow').classList.remove('hidden')}"""
STEPS = [
    ('main', None),
    ('main_resume', "()=>{document.getElementById('resume').classList.remove('hidden');document.getElementById('resumeInfo').textContent='人机 · 校尉 · 第 12 回合'}"),
    ('ai', "()=>{document.getElementById('resume').classList.add('hidden');document.getElementById('bAI').click()}"),
    ('ai_bottom', "()=>{const s=document.querySelector('#lobby .scroll');s.scrollTop=s.scrollHeight}"),
    ('hall', "()=>{document.querySelector('#lobby .scroll').scrollTop=0;(%s)('pHall');(%s)()}" % (SHOW, HALL)),
    ('create', "()=>{(%s)('pMain');document.getElementById('bHall').click();document.getElementById('bCreate').click()}" % SHOW),
    ('local', "()=>{(%s)('pMain');document.getElementById('bLocal').click()}" % SHOW),
    ('wait', "()=>{(%s)('pWait');(%s)()}" % (SHOW, WAIT)),
    ('join', "()=>{(%s)('pJoin')}" % SHOW),
    ('set', "()=>{(%s)('pMain');document.getElementById('bSetL').click()}" % SHOW),
    ('set_game', "()=>{document.getElementById('setGame').classList.remove('hidden')}"),
    ('set_snd', "()=>{document.querySelector('#setTabs [data-t=snd]').click()}"),
    ('set_etc', "()=>{document.querySelector('#setTabs [data-t=etc]').click()}"),
    ('game', "()=>{document.getElementById('bSetClose').click();document.getElementById('bLocal').click();document.getElementById('bCreateGo').click()}"),
    ('game_set', "()=>{document.getElementById('tSet')&&document.getElementById('tSet').click()}"),
    ('ask', "()=>{document.getElementById('bSetClose').click();document.getElementById('askT').textContent='对方请求悔棋';document.getElementById('askP').textContent='同意后退回到你上一步之前。';document.getElementById('mAsk').classList.remove('hidden')}"),
    ('ask_stay', "()=>{const m=document.getElementById('mAsk');m.classList.add('e-stay');document.getElementById('askT').textContent='退出本局？';document.getElementById('askP').textContent='';document.getElementById('askYes').textContent='返回大厅';document.getElementById('askNo').textContent='继续对局'}"),
]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp in (sys.argv[2].split(",") if len(sys.argv) > 2 else ['pc', 'm']):
        w, h, dpr = VP[vp]
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
        pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('low'))")
        logs = []
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        pg.goto(url, wait_until='domcontentloaded')
        pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}")
        time.sleep(3.2)
        for name, js in STEPS:
            if js:
                try: pg.evaluate(js)
                except Exception as e: print('EVAL ERR', name, str(e)[:200])
                time.sleep(9 if name=='game' else 1.6 if name in ('ai','set','create','local','ask','ask_stay','game') else .7)
            if ONLY and name not in ONLY: continue
            pg.screenshot(path=f'{OUT}/{vp}_{name}.png')
        for l in logs: print(vp, l[:300])
        pg.close()
    b.close()
print('saved')
