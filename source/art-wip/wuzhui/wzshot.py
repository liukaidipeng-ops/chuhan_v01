import sys, pathlib
from playwright.sync_api import sync_playwright
import wz
out = sys.argv[1]; html = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f0e7d2">' + eval(sys.argv[2]) + '</body>'
p0 = pathlib.Path('/tmp/claude-0/-home-claude-chuhan-v01/1d3f8c4c-8951-5403-8453-50756fb3a46d/scratchpad/design/_w.html'); p0.write_text(html)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 940, 'height': 600}); pg.goto(p0.as_uri()); pg.wait_for_timeout(200); pg.screenshot(path=out, full_page=True); b.close()
