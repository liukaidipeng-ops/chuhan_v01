"""声音部版：同 tools/tunes.py，另可用环境变量 INJECT=<草稿 js> 把新方案注入页面再渲染；CHROME=<chromium 路径>。
终局小曲出试听样：把 src/endtunes.js 里汉、楚的胜、败各三个方案（再加原来的两首作对照）离线渲染成 mp3。
用法：python3 tools/tunes.py <站点目录 dist/site> <输出目录>（环境变量 JOBS=b:win:3,b:win:4 只出这几首）
输出：<输出目录>/{r,b}_{win,lose}_{0,1,2}.mp3、old_{win,lose}.mp3，并打印每首实际有声的时长（尾巴低于 -50dB 的部分不算）"""
import sys, time, subprocess, base64, os, struct, math
from playwright.sync_api import sync_playwright
site, outd = sys.argv[1], sys.argv[2]
os.makedirs(outd, exist_ok=True)
http = subprocess.Popen([sys.executable, '-m', 'http.server', '8078', '--bind', '127.0.0.1'], cwd=site, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)


def audible(wav):
    """从尾巴往前找最后一个超过 -50dB（20ms 窗）的位置"""
    data = wav[44:]; n = len(data) // 4; sr = 44100; win = sr // 50
    vals = struct.unpack('<%dh' % (n * 2), data[:n * 4])
    last = 0
    for w in range(0, n, win):
        seg = vals[w * 2:(w + win) * 2]
        if seg and math.sqrt(sum(v * v for v in seg) / len(seg)) / 32768 > 10 ** (-50 / 20): last = w + win
    return last / sr


try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:8078/?nogl', wait_until='commit')
        t0 = time.time()
        while time.time() - t0 < 60 and not pg.evaluate("typeof Sfx !== 'undefined' && typeof EndTunes !== 'undefined'"): time.sleep(0.2)
        pg.add_script_tag(path=os.environ['INJECT']) if os.environ.get('INJECT') else None; pg.evaluate("Sfx.init()")
        last = -1
        while time.time() - t0 < 60:   # 等素材（鼓、锣、呐喊）解码完
            n = pg.evaluate("Sfx.nSamples")
            if n and n == last: break
            last = n; time.sleep(1.5)
        print('samples', last)
        jobs = [('old', k, 0) for k in ('win', 'lose')] + [(s, k, i) for s in ('r', 'b') for k in ('win', 'lose') for i in range(3)]
        if os.environ.get('JOBS'): jobs = [(a, b, int(c)) for a, b, c in (x.split(':') for x in os.environ['JOBS'].split(','))]   # 只出几首：JOBS=b:win:3,b:win:4
        for s, k, i in jobs:
            b64 = pg.evaluate("([s,k,i]) => EndTunes.renderWav(s,k,i,24)", [s, k, i])
            wav = base64.b64decode(b64); name = f'old_{k}' if s == 'old' else f'{s}_{k}_{i}'
            dur = audible(wav)
            wp = os.path.join(outd, name + '.wav'); open(wp, 'wb').write(wav)
            # 去掉尾巴的静音（留 0.3 秒），转 mp3
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wp, '-t', f'{dur + 0.3:.2f}', '-af', f'afade=t=out:st={max(0, dur - 0.2):.2f}:d=0.5', '-codec:a', 'libmp3lame', '-b:a', '128k', os.path.join(outd, name + '.mp3')], check=True)
            r = subprocess.run(['ffmpeg', '-hide_banner', '-i', wp, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
            lufs = r.rsplit('I:', 1)[1].split('LUFS')[0].strip(); peak = r.rsplit('Peak:', 1)[1].split('dBFS')[0].strip()
            os.remove(wp)
            print(name, f'{dur:.1f}s', f'响度 {lufs} LUFS', f'峰值 {peak} dBFS')
        print('errors', errs[:5])
        b.close()
finally:
    http.terminate()
