import pathlib
from playwright.sync_api import sync_playwright
import wz
from fine import Fig
side1 = wz.side_view(1, Fig(760, 470, (250, 100, 600, 440))).svg()
side2 = wz.side_view(2, Fig(560, 347, (250, 100, 600, 440))).svg()
front = wz.front_view(1).svg().replace('width="300" height="600"', 'width="250" height="500"')
head = wz.head_view(1).svg().replace('width="420" height="360"', 'width="460" height="394"')
css = """body{margin:0;background:#efe6d0;font-family:'Noto Serif CJK SC',serif;color:#141311}
.pg{padding:22px 26px;display:grid;grid-template-columns:auto auto;gap:14px 22px;width:max-content}
h1{grid-column:1/-1;margin:0;font-size:30px;letter-spacing:.16em}
h1 small{font-size:16px;letter-spacing:.04em;font-weight:500;margin-left:14px;color:#5a5048}
.c{display:flex;flex-direction:column;gap:4px}
.t{font-size:18px;font-weight:900;letter-spacing:.1em;background:#141311;color:#f0e7d2;padding:2px 12px;width:max-content}
ul{margin:4px 0 0;padding-left:1.2em;font-size:15px;line-height:1.7;font-family:'Noto Sans CJK SC',sans-serif;max-width:470px}
.row{display:flex;gap:16px;align-items:flex-end}"""
html = f"""<!doctype html><meta charset="utf-8"><style>{css}</style><div class="pg">
<h1>乌骓 · 踏雪乌骓<small>通身乌黑、四蹄白；秦汉战马的样子：剪鬃、结尾、没有马镫</small></h1>
<div class="c"><div class="t">一 · 垓下（完好）· 侧面</div>{side1}</div>
<div class="c"><div class="t">正面</div>{front}</div>
<div class="c"><div class="t">二 · 乌江（腿上泥、肚皮溅泥、鞍鞯旧了）</div>{side2}</div>
<div class="c"><div class="t">头部</div>{head}
<ul><li>额前一块铜<b>当卢</b>，中间嵌一点朱红</li><li>额鬃扎成一撮，系红绳；鬃毛剪成一排短立鬃（秦俑马那样）</li><li>嘴边一对 <b>S 形铜镳</b>，鼻革、颊带是深褐皮带</li><li>颈下挂一大束<b>红缨</b></li></ul></div>
<div class="c" style="grid-column:1/-1"><ul style="max-width:none;columns:2;column-gap:40px">
<li>身材：比对局里的马更壮、更短身，脖子粗、头小；肩高约 1.55 米（项王 1.9 米），站在一起马背到他胸口</li>
<li>毛色：乌黑带一点青蓝的反光，四个蹄子以上一截白（踏雪）</li>
<li>鞍：朱红毡鞍鞯，下沿一道墨底金回纹；低鞍桥，<b>不挂马镫</b>（秦汉还没有马镫）</li>
<li>攀胸（胸带）和后鞧（屁股上的带）各挂三束红缨，铜扣</li>
<li>尾巴挽成一个结、扎红绳（秦汉战马的做法），结下垂一截</li>
<li>二 · 乌江：腿上到膝、肚皮下沿溅泥，鞍鞯和铜饰暗一点；赠给亭长那一镜也用这一套</li>
<li>建模和刘邦、项羽一路：卡通描墨、面数比对局里的马高；带骨架，能走、跑、站、低头、蹭人、喷鼻刨蹄</li>
<li>项王骑马、下马、抚鬃、递缰的动作，和马一起做</li>
</ul></div></div>"""
p0 = pathlib.Path('/tmp/claude-0/-home-claude-chuhan-v01/1d3f8c4c-8951-5403-8453-50756fb3a46d/scratchpad/design/_ws.html'); p0.write_text(html)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 800}, device_scale_factor=1.5); pg.goto(p0.as_uri()); pg.wait_for_timeout(400)
    pg.locator('.pg').screenshot(path='ui_wz.png'); b.close()
from PIL import Image
Image.open('ui_wz.png').convert('RGB').save('ui_wz.jpg', quality=88); print(Image.open('ui_wz.png').size)
