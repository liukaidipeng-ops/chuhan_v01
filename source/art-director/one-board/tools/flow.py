import sys, time, glob, pathlib, os, json
from playwright.sync_api import sync_playwright
SRC = 'dev/source'; OUT = 'flow'; os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
exe = glob.glob('/opt/pw-browsers/chromium*/chrome-linux/chrome')[0]
SHOW = "(id)=>{for(const p of ['pMain','pAI','pHall','pCreate','pWait','pJoin'])document.getElementById(p).classList.toggle('hidden',p!==id)}"
HALL = open(SRC+'/tools/uishot.py').read().split('HALL = """')[1].split('"""')[0]
WAIT = """()=>{document.getElementById('roomCode').textContent='KXQ7M';
document.getElementById('roomSeats').innerHTML='<div class="seat r me"><span class="sd">红·汉</span><div class="who">你</div><small>房主 · 先手</small></div><div class="seat b"><span class="sd">黑·楚</span><div class="who">樵夫</div><small>已准备</small></div>';
document.getElementById('waitChips').innerHTML='<span class="chip">技能模式</span><span class="chip">公开</span><span class="chip">悔棋 3 次</span><span class="chip">不限时</span>';
document.getElementById('waitNote').textContent='对手已准备，可以开始';
document.getElementById('roomHostRow').classList.remove('hidden');
for(const id of ['bRoomAI','bRoomAI2']){const e=document.getElementById(id);if(e)e.style.display='none'}
document.querySelectorAll('#roomHostRow select').forEach(e=>e.style.display='none');
const qr=document.getElementById('qr');}"""
BB = """(sels)=>{const o={};for(const s of sels){const e=document.querySelector(s);if(!e){o[s]=null;continue}const r=e.getBoundingClientRect();o[s]=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}return o}"""
STEPS = [
 ('main', "()=>{}", ['#bHall','#bAI','#bLocal']),
 ('ai', "()=>{document.getElementById('bAI').click()}", ['#bAIGo','#aiLv','#bBack4']),
 ('local', "()=>{(%s)('pMain');document.getElementById('bLocal').click()}" % SHOW, ['#bCreateGo','#pCreate .e-hd','#bBack1']),
 ('hall', "()=>{(%s)('pHall');(%s)()}" % (SHOW, HALL), ['#bCreate','#bJoinShow','#bBackH']),
 ('wait', "()=>{(%s)('pWait');(%s)()}" % (SHOW, WAIT), ['#bRoomStart','#roomSeats .seat.r','#roomSeats .seat.b','#roomSeats','#bBack2']),
]
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=exe, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp,(w,h,d) in {'pc':(1440,900,1),'m':(390,844,2)}.items():
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=d)
        pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('mid'))")
        pg.goto(url, wait_until='domcontentloaded')
        pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}")
        time.sleep(6)
        for name, js, sels in STEPS:
            pg.evaluate(js); time.sleep(2)
            pg.screenshot(path=f'{OUT}/{vp}_{name}.png')
            res[f'{vp}_{name}'] = pg.evaluate(BB, sels)
        pg.close()
    b.close()
json.dump(res, open(f'{OUT}/bb.json','w'), ensure_ascii=False, indent=0)
print(json.dumps(res, ensure_ascii=False))
