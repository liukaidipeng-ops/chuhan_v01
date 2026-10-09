# 金银：原版，顶面高光面积减少两档
import time, os, sys
sys.argv = [sys.argv[0], 'm', 'none']
exec(open('mock.py').read().split('with sync_playwright() as p:')[0])
from playwright.sync_api import sync_playwright
ORIG = {'boxAz': [9, 14], 'boxEl': [33, 39, 51, 56], 'boxI': [1.2, 3.0], 'zen': 2.4, 'domeM': 0.2}
VS = {'o': ORIG, 'a': dict(ORIG, domeM=0.34, boxAz=[7, 11], boxI=[1.0, 2.6]), 'b': dict(ORIG, domeM=0.5, boxAz=[5.5, 8.5], boxI=[0.9, 2.3], zen=2.0)}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'm')
    for lv in (2, 3):
        for k, sk in VS.items():
            pg.evaluate("([lv,sk])=>{Mock.piece('cur');Board.skinTune(sk);Board.setSkin(lv);Board.setPosition(Board.lastGame)}", [lv, sk])
            pg.evaluate("()=>Mock.close(false)"); time.sleep(1.2); pg.screenshot(path=f'{OUT}/v5_{lv}_{k}_full.png')
            pg.evaluate("()=>Mock.close(true,'r')"); time.sleep(1.2); pg.screenshot(path=f'{OUT}/v5_{lv}_{k}_r.png')
            pg.evaluate("()=>Mock.close(true,'b')"); time.sleep(1.2); pg.screenshot(path=f'{OUT}/v5_{lv}_{k}_b.png')
    b.close()
