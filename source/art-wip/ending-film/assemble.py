# 把乌江样片的镜头、片名、字幕、配音、音效、配乐合成一条视频（1280×720，2.39:1 黑边，24 帧）
import os, sys, json, subprocess, glob
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/../sb')
import style as S
H = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.abspath(H + '/../..'); AUD = H + '/../sb/audio'
OUT = H + '/out'; os.makedirs(OUT + '/f', exist_ok=True)
FPS = 24; W, HH, BAR = 1280, 720, 92
L = json.load(open(SRC + '/voice/lines.json', encoding='utf-8')); TXT = {x['id']: x['text'] for x in L}
VO = lambda i: f'{SRC}/voice/real/{i}.mp3'
def SFX(n, k=0):
    while k > 0 and not os.path.exists(f'{SRC}/sfx/out/{n}_{k}.mp3'): k -= 1
    return f'{SRC}/sfx/out/{n}_{k}.mp3'
def dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
# 时间线：(类型, 内容, 秒数, 配音[(编号, 相对开始)], 音效[(文件, 相对开始, 音量)])
TL = [
    ('title', ('乌江', '汉五年 · 冬'), 2.6, [], [(AUD + '/qin_low.wav', 0.2, 0.8)]),
    ('shot', 'F0', 4.5, [], [(SFX('hoofr', 2), 1.1, 0.22), (SFX('hoofr'), 2.4, 0.3)]),   # 亭长听见身后马蹄声（079 加的开头）
    ('shot', 'F1', 7.0, [('w5', 0.3)], [(SFX('hoofr'), 2.0, 0.25)]),
    ('shot', 'F2', 5.0, [], [(SFX('hoofr', 1), 0.0, 0.5), (SFX('neighm'), 3.6, 0.45)]),
    ('shot', 'F3', 5.5, [('w8', 0.8)], []),
    ('shot', 'F3b', 3.6, [], [(SFX('neighm', 1), 2.9, 0.25), (SFX('hoofr', 1), 1.95, 0.18)]),   # 下马（审批台 094 选乙）
    ('shot', 'F4', 16.0, [('w12', 0.6)], [(SFX('neighm', 1), 14.2, 0.3)]),
    ('shot', 'F6', 5.0, [], [(SFX('hoofwar'), 0.0, 0.75), (SFX('drum'), 0.3, 0.7), (SFX('drum', 1), 1.3, 0.7), (SFX('drum'), 2.3, 0.7), (SFX('rumble'), 0.0, 0.5)]),
    ('black', None, 2.4, [], [(SFX('gong'), 0.05, 0.6)]),
]
frames = []; audio = []; subs = []; t = 0.0
for kind, what, d, vos, sfx in TL:
    n = int(round(d * FPS))
    for vid, at in vos:
        audio.append((VO(vid), t + at, 1.0)); a0, D = t + at, dur(VO(vid)) + 0.2
        import re
        parts = [p for p in re.split(r'(?<=[。！？])', TXT[vid]) if p.strip()]   # 长句按句号分几屏，时长按字数分
        tot = sum(len(p) for p in parts); acc = 0
        for p in parts: subs.append((a0 + D * acc / tot, a0 + D * (acc + len(p)) / tot, p)); acc += len(p)
    for f, at, g in sfx: audio.append((f, t + at, g))
    for i in range(n):
        frames.append((kind, what, i, n, t + i / FPS))
    t += d
total = t
def sub_at(tt):
    for a, b, txt in subs:
        if a <= tt < b: return txt
    return ''
# 画每一帧
for k, (kind, what, i, n, tt) in enumerate(frames):
    if kind == 'title': im = S.titleA(*what)
    elif kind == 'black': im = Image.new('RGB', (W, HH), (0, 0, 0))
    else:
        src = f'{H}/frames/{what}/{i:04d}.jpg'
        if not os.path.exists(src): src = sorted(glob.glob(f'{H}/frames/{what}/*.jpg'))[-1]
        im = Image.new('RGB', (W, HH), (0, 0, 0)); fr = Image.open(src).convert('RGB').resize((W, 536)); im.paste(fr, (0, BAR))
        if what == 'F6' and i > n - 12: im = Image.blend(im, Image.new('RGB', im.size, (0, 0, 0)), (i - (n - 12)) / 12)   # 最后半秒压黑
    im = S.subA(im, '', sub_at(tt))
    im.save(f'{OUT}/f/{k:05d}.jpg', quality=92)
print('frames', len(frames), 'seconds', round(total, 2))
# 混音：配乐垫底 + 配音 + 音效
ins = ['-f', 'lavfi', '-t', str(total), '-i', 'anullsrc=r=48000:cl=stereo']
flt = []; mix = ['[0:a]']
bed = [(AUD + '/drone_d.wav', 2.6, 0.45), (AUD + '/wind.wav', 0.0, 0.28)]
for j, (f, at, g) in enumerate(bed + audio):
    ins += ['-i', f]; idx = j + 1
    flt.append(f'[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume={g},adelay={int(at * 1000)}|{int(at * 1000)},atrim=0:{total}[a{idx}]'); mix.append(f'[a{idx}]')
flt.append(''.join(mix) + f'amix=inputs={len(mix)}:normalize=0,afade=t=out:st={total - 1.6}:d=1.6,alimiter=limit=0.95[aout]')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *ins, '-filter_complex', ';'.join(flt), '-map', '[aout]', '-c:a', 'pcm_s16le', OUT + '/mix.wav'], check=True)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', str(FPS), '-i', OUT + '/f/%05d.jpg', '-i', OUT + '/mix.wav', '-c:v', 'libx264', '-preset', 'slow', '-b:v', '2300k', '-maxrate', '2800k', '-bufsize', '5600k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT + '/wujiang.mp4'], check=True)
print('ok', OUT + '/wujiang.mp4')
