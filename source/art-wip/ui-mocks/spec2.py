# 观战席四个样子 × 房主在座位上 / 房主在观战席，手机、电脑
import sys, time, os, pathlib
from playwright.sync_api import sync_playwright
SRC = '/home/claude/chuhan_v01/source'; HERE = os.path.dirname(os.path.abspath(__file__)); OUT = HERE + '/shots'
url = pathlib.Path(SRC + '/dist/site/index.html').resolve().as_uri()
CSS = open(HERE + '/spec2.css').read()
def seat(side, who, st, cls=''):
    return f'<div class="seat {side}{cls}"><span class="sd">{"红·汉" if side == "r" else "黑·楚"}</span><div class="who">{who}</div><small>{st}{" · 先手" if side == "r" else ""}</small></div>'
# 小人剪影：农夫斗笠、樵夫头巾背柴、渔夫斗笠、房主戴冠、空凳虚线
def fig(kind, dashed=False):
    st = 'fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"' if dashed else 'fill="currentColor"'
    body = f'<circle cx="20" cy="17" r="7" {st}/><path d="M7 44 Q8 27 20 26 Q32 27 33 44 Z" {st}/>'
    hat = {'农': '<path d="M5 13 L20 3 L35 13 Z" fill="currentColor"/>',
           '樵': '<path d="M12 12 Q20 6 28 12 L28 14 L12 14 Z" fill="currentColor"/><path d="M30 8 L36 1 M33 10 L39 4 M31 13 L38 9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
           '渔': '<path d="M6 13 L20 4 L34 13 Z" fill="currentColor"/><path d="M33 44 L39 6" stroke="currentColor" stroke-width="1.6"/>',
           '冠': '<rect x="14" y="4" width="12" height="6" fill="currentColor"/><rect x="11" y="9" width="18" height="3" fill="currentColor"/>', '': ''}[kind]
    return f'<svg viewBox="0 0 40 46">{hat}{body}</svg>'
def specs(v, away):
    ppl = ([('你', '房主', 'me', '冠')] if away else []) + [('农夫', '', '', '农'), ('樵夫', '', '', '樵')]
    tip = '点这里就坐过来' if not away else '点红方空座位坐回去'
    if v == 1:
        it = ''.join(f'<i class="{c}">{n}{"（房主）" if s else ""}</i>' for n, s, c, _ in ppl) + ('' if away else '<i class="open" data-sit>坐这里</i>')
        return f'<b>观战席</b><span class="list">{it}</span><span class="tip">{tip}</span>'
    if v == 2:
        it = ''.join(f'<i class="{c}">{n}{f"<small>{s}</small>" if s else ""}</i>' for n, s, c, _ in ppl) + ('' if away else '<i class="open" data-sit>坐这里</i>')
        return f'<b>观战席</b><span class="list">{it}</span><span class="tip">{tip}</span>'
    if v == 3:
        it = ''.join(f'<i class="{c}">{fig(k)}<span>{n}{"（房主）" if s else ""}</span></i>' for n, s, c, k in ppl) + ('' if away else f'<i class="open" data-sit>{fig("", True)}<span>坐这里</span></i>')
        return f'<b>观战席<small style="font:500 12px var(--es);letter-spacing:.1em;margin-left:8px;opacity:.8">观棋不语</small></b><div class="bench">{it}</div><span class="tip">{tip}</span>'
    if v == 4:
        it = ''.join(f'<i class="{c}">{n}{"（房主）" if s else ""}</i>' for n, s, c, _ in ppl) + ('' if away else '<i class="open" data-sit>坐到这里</i>')
        return f'<div class="box"><b>观战席<em>{len(ppl)}</em></b>{it}</div><span class="tip">{tip}</span>'
JS = """([seats, css, away, v, html]) => {
  const $ = id => document.getElementById(id);
  let s = $('mockCss'); if (!s) { s = document.createElement('style'); s.id = 'mockCss'; document.head.appendChild(s); } s.textContent = css;
  document.querySelectorAll('#lobby .pane').forEach(p => p.classList.add('hidden')); $('pWait').classList.remove('hidden');
  $('roomCode').textContent = '9X11V'; { const o = document.querySelector('#roomSeats .specs'); if (o) $('roomSeats').after(o); } $('roomSeats').innerHTML = seats;
  let sp = document.querySelector('#pWait .specs'); sp.className = 'specs v' + v; sp.innerHTML = html;
  // 丁：电脑上把名单放进棋盘格右边那一格
  if (v === 4 && innerWidth > 640) $('roomSeats').appendChild(sp); else if (sp.parentNode === $('roomSeats')) $('roomSeats').after(sp);
  $('waitChips').innerHTML = ['技能模式','房主执红·汉','悔棋不限','每方 15 分钟','每步 1 分','显示可杀'].map(t => `<span class="chip">${t}</span>`).join('');
  $('roomHostRow').classList.remove('hidden'); $('roomGuestRow').classList.add('hidden'); $('roomInvite').classList.remove('hidden');
  $('waitLine').textContent = '线路已连接 3/3';
  $('waitNote').innerHTML = away ? '你在观战席。两个座位都有人（或电脑）时，点「开始」开局' : '<span class="spin"></span>等待对手入座…（也可以添加人机）';
  $('bRoomStart').classList.add('off'); $('bRoomAI').textContent = '添加人机'; $('roomAILv').classList.remove('hidden'); $('bRoomAI2').classList.add('hidden'); $('roomAI2Lv').classList.add('hidden');
  const b = $('bRoomSpec'); if (b) b.remove();
  $('toast').style.display = 'none'; document.querySelector('#pWait').scrollIntoView();
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for vp in sys.argv[1].split(','):
        w, h, d = {'pc': (1480, 1000, 1), 'm': (390, 844, 2)}[vp]
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=d); pg.set_default_timeout(300000)
        pg.add_init_script("localStorage.setItem('xq3d-noaudio','1')")
        pg.goto(url, wait_until='domcontentloaded')
        pg.wait_for_function("()=>{const l=document.getElementById('lobby');return l&&!l.classList.contains('hidden')&&!document.getElementById('loading')}"); time.sleep(1.5)
        for v in (1, 2, 3, 4):
            for away in (False, True):
                seats = (seat('r', '空位', '点这里坐回', ' empty') if away else seat('r', '你', '房主', ' me')) + seat('b', '空位', '等待对手…', ' empty')
                args = [seats, CSS, away, v, specs(v, away)]
                pg.evaluate(JS, args); time.sleep(1.2); pg.evaluate(JS, args); time.sleep(0.6)
                pg.screenshot(path=f'{OUT}/{vp}_v{v}_{"away" if away else "seat"}.png')
        pg.close()
    b.close()
