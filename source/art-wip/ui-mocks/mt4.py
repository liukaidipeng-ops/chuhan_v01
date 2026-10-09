# 金银第四轮：原版 / 原版+粗楷 / 牙面镶边 / 漆地金字 / 原版+色圈 / 缎面+粗楷
import time, os, sys
sys.argv = [sys.argv[0], 'm', 'none'] + sys.argv[1:]
exec(open('mock.py').read().split('with sync_playwright() as p:')[0])
from playwright.sync_api import sync_playwright
VS = sys.argv[3].split(',') if len(sys.argv) > 3 else ['orig', 'bold', 'ivory', 'enamel', 'ring', 'satin']
JS4 = open('mt4.js', encoding='utf-8').read()
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'm'); pg.add_script_tag(content=JS4)
    for lv in (2, 3):
        for v in VS:
            pg.evaluate("([lv,v])=>{Mock.piece('cur');Board.setSkin(lv);Board.setPosition(Board.lastGame);if(v!=='orig')MT4.apply(v,lv)}", [lv, v])
            pg.evaluate("()=>Mock.close(false)"); time.sleep(1.2); pg.screenshot(path=f'{OUT}/v4_{lv}_{v}_full.png')
            pg.evaluate("()=>Mock.close(true,'r')"); time.sleep(1.2); pg.screenshot(path=f'{OUT}/v4_{lv}_{v}_r.png')
            pg.evaluate("()=>Mock.close(true,'b')"); time.sleep(1.2); pg.screenshot(path=f'{OUT}/v4_{lv}_{v}_b.png')
    b.close()
