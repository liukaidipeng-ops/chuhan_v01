"""界面改版截图（弹窗和对局中）：python3 tools/uishot2.py [只拍哪些，逗号分隔] [视口：pc,m]
先 node build.js。存到 source/shots/ui/，文件名 <视口>_g_<名字>.png。开的是一局本地技能模式。"""
import sys, time, pathlib, os
from playwright.sync_api import sync_playwright
SRC = os.path.dirname(os.path.abspath(__file__)) + "/.."; ONLY = set(sys.argv[1].split(",")) if len(sys.argv) > 1 and sys.argv[1] else None
OUT = SRC + '/shots/ui'; os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
VP = {'pc': (1440, 900, 1), 'm': (390, 844, 2)}
G = "const $=id=>document.getElementById(id);const hideAll=()=>document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));"
STEPS = [
    ('help', "$('bHelpL').click()", 1.2),
    ('news', "hideAll();$('bNewsL').click()", 1.2),
    ('name', "hideAll();$('mName').classList.remove('hidden')", 1.0),
    ('pick', "hideAll();$('pickT').textContent='召 回 良 将';$('pickP').textContent='选一个兵种，回来的是其中等级最高的那枚。';$('pickList').innerHTML='<button class=\"btn small\">车 · 二级</button><button class=\"btn small\">马 · 一级</button><button class=\"btn small\" disabled style=\"opacity:.45\">炮 · 位置被占</button>';$('mPick').classList.remove('hidden')", 1.0),
    ('export', "hideAll();$('exportNote').textContent='把下面这段文字复制出去，可以贴给别人或贴给 Claude 分析。';$('exportText').value='# 技能新象棋 · 本地对战\\n1. 炮二平五 马8进7\\n2. 马二进三 车9平8\\n3. 车一平二 …';$('mExport').classList.remove('hidden')", 1.0),
    ('start', "hideAll();$('bLocal').click();document.querySelector('#pCreate .seg[data-k=v] [data-v=bf]').click();document.querySelector('#pCreate .seg[data-k=total] [data-v=\"0\"]').click();document.querySelector('#pCreate .seg[data-k=step] [data-v=\"0\"]').click();$('bCreateGo').click()", 10),
    ('skip', "", 0.2),
    ('hud', "const k=$('skip');if(k&&!k.classList.contains('hidden'))k.click();const o=$('bfTipOk');if(o&&!$('bfTip').classList.contains('hidden'))o.click()", 6),
    ('sel', "const c=$('gl'),r=c.getBoundingClientRect();const ev=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{bubbles:true,clientX:x,clientY:y,pointerId:1,pointerType:'mouse',button:0,buttons:t==='pointerup'?0:1}));window.__clk=(fx,fy)=>{const x=r.left+r.width*fx,y=r.top+r.height*fy;ev('pointerdown',x,y);ev('pointerup',x,y);c.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y}))}", 0.5),
    ('hud2', "const o=$('bfTipOk');if(!$('bfTip').classList.contains('hidden'))o.click()", 1.2),
    ('sk', "const bar=$('bfBar');bar.classList.remove('hidden');$('bfHint').textContent='汉军兵 · 一级 · 军功 3';$('bfRow').innerHTML='<button class=\"sk up ready\">升二级<small>3 功</small></button><button class=\"sk\">拒马<small>三级解锁</small></button><button class=\"sk art\">召回良将<small>主帅兵法</small></button><button class=\"sk ult off\">四面楚歌<small>20 功</small></button><button class=\"sk ready ok\">确 定<small>发动</small></button><button class=\"sk\">取消<small>换一着</small></button>';$('bfReport').classList.remove('hidden');$('bfReport').innerHTML='<li class=\"r\">汉军兵 升为 汉伍长</li><li>楚军卒 击杀 汉军兵，军功 +1</li>'", 1.0),
    ('log', "$('bfBar').classList.add('hidden');$('bfReport').innerHTML='';$('tLog').click()", 1.2),
    ('chat', "$('tLog').click();$('tChat').click()", 3.5),
    ('rule', "hideAll();$('tRule').click()", 1.2),
    ('toast', "$('bfTipOk').click();const t=$('toast');t.textContent='轮到红方（汉）走棋';t.classList.add('on');const b=$('bubOpp');b.querySelector('b').textContent='项羽';b.querySelector('span').textContent='竖子，不足与谋！';b.classList.add('on');const m=$('bubMe');m.querySelector('b').textContent='刘邦';m.querySelector('span').textContent='且慢，容我三思。';m.classList.add('on')", 1.0),
    ('pause', "$('toast').classList.remove('on');$('bubOpp').classList.remove('on');$('bubMe').classList.remove('on');$('tPause').click()", 1.5),
    ('set', "$('pzSet').click()", 1.5),
    ('exit', "$('tExit').click()", 1.2),
    ('resign', "$('askNo').click();$('tSet').click();$('tResign').click()", 1.2),
    ('endcine', "$('askYes').click()", 5),
    ('end', "hideAll();const k=$('skip');if(k&&!k.classList.contains('hidden'))k.click()", 9),
    ('replay', "const b=[...document.querySelectorAll('#endcard .btn')].find(x=>x.textContent.includes('复'));if(b)b.click()", 3),
]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp in (sys.argv[2].split(",") if len(sys.argv) > 2 else ['pc', 'm']):
        w, h, dpr = VP[vp]
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
        pg.set_default_timeout(240000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1'); localStorage.setItem('xq3d-quality', JSON.stringify('low'))")
        pg.on('pageerror', lambda e: print(vp, 'PAGEERROR', str(e)[:300]))
        pg.goto(url, wait_until='domcontentloaded')
        time.sleep(0.4); pg.screenshot(path=f'{OUT}/{vp}_g_loading.png')
        pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')}")
        time.sleep(3.2)
        for name, js, wait in STEPS:
            try: pg.evaluate("()=>{" + G + js + "}")
            except Exception as e: print('EVAL ERR', vp, name, str(e)[:200])
            time.sleep(wait)
            if ONLY and name not in ONLY: continue
            pg.screenshot(path=f'{OUT}/{vp}_g_{name}.png')
        pg.close()
    b.close()
print('saved')
