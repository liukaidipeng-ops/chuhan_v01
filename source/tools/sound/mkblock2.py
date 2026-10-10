# 盾挡声第二轮（试听台 b36）：0 A.D. 真实盾牌录音（Wildfire Games，CC BY-SA 3.0，游戏已署名）。
# 用法：python3 mkblock2.py <0ad 的 audio/attack 目录> <输出目录> <b35 甲的三个 wav 所在目录> <Kenney impact 原始素材目录（CC0）>
import subprocess, sys
A, O, PREV, K = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
KW = lambda n: f'{K}/impactWood_heavy_00{n}.ogg'
DOWN = 'asetrate=37485,aresample=44100'   # 降约 2.8 个半音：盾更大更厚
LOW = 'lowpass=f=350,bass=g=4:f=90'        # 底下的闷“咚”
W = lambda n: f'{A}/impact/shield_wood_{n:02d}.ogg'; M = lambda n: f'{A}/impact/shield_metal_{n:02d}.ogg'
SP = lambda n: f'{A}/weapon/spear_attack_{n:02d}.ogg'
def hit(name, layers, dur):
    ins, fl = [], []
    for i, (f, flt, d, g) in enumerate(layers):
        ins += ['-i', f]
        fl.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-45dB,{flt},volume={g}dB,adelay={d}[l{i}]')
    n = len(layers)
    fl.append(''.join(f'[l{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0,atrim=0:{dur},afade=t=out:st={dur-0.06}:d=0.06,alimiter=limit=0.9[o]')
    out = f'{O}/{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', '[o]', out], check=True); return out
def seq(name, hits, gap=0.6):
    ins, fl = [], []
    for i, h in enumerate(hits): ins += ['-i', h]; fl.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,apad=whole_dur={gap}[s{i}]')
    fl.append(''.join(f'[s{i}]' for i in range(len(hits))) + f'concat=n={len(hits)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7[o]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', '[o]', '-ar', '22050', '-ac', '1', '-b:a', '64k', f'{O}/{name}.mp3'], check=True)
X = 'anull'
# 戊：原声木盾，不加工
seq('block_e', [hit(f'e{k}', [(W(n), X, 0, 0)], 0.3) for k, n in enumerate((3, 5, 16))])
# 己：原声木盾降一点调 + 底下叠闷的木头低音（Kenney，CC0）
seq('block_f', [hit(f'f{k}', [(W(n), DOWN, 0, 0), (KW(k), LOW, 0, -1)], 0.3) for k, n in enumerate((3, 5, 16))])
# 庚：己的底+ 一点真铜盾的“锵”（只取开头 0.08 秒，压低）
seq('block_g', [hit(f'g{k}', [(W(w), DOWN, 0, 0), (KW(k), LOW, 0, -1), (M(m), 'atrim=0:0.08,afade=t=out:st=0.03:d=0.05', 4, -13)], 0.3) for k, (w, m) in enumerate(((3, 13), (5, 4), (16, 7)))])
# 辛：出矛“嗖”+ 己的底+ 轻锵：整套动作
seq('block_h', [hit(f'h{k}', [(SP(s), 'highpass=f=300,atrim=0:0.25,afade=t=out:st=0.18:d=0.07', 0, -6), (W(w), DOWN, 230, 0), (KW(k), LOW, 230, -1), (M(m), 'atrim=0:0.08,afade=t=out:st=0.03:d=0.05', 234, -14)], 0.6) for k, (s, w, m) in enumerate(((1, 3, 13), (3, 5, 4), (5, 16, 7)))], gap=0.85)
# 对照：上一批定下的甲
seq('block_a', [f'{PREV}/a{k}.wav' for k in (0, 1, 2)])
