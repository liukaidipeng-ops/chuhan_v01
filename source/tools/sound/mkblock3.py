# 盾挡声第三轮（试听台 b37）：庚 / 辛为底，金属感加重。
# 素材：0 A.D. 盾牌录音（CC BY-SA 3.0，已署名）；Kenney impact、lavenderdotpet 100-CC0-wood-metal-SFX（CC0）。
# 用法：python3 mkblock3.py <0ad audio/attack 目录> <Kenney 原始素材目录> <cc0 仓库目录> <输出目录>
import subprocess, sys
A, K, C, O = sys.argv[1:5]
W = lambda n: f'{A}/impact/shield_wood_{n:02d}.ogg'; M = lambda n: f'{A}/impact/shield_metal_{n:02d}.ogg'
SP = lambda n: f'{A}/weapon/spear_attack_{n:02d}.ogg'; KW = lambda n: f'{K}/impactWood_heavy_00{n}.ogg'
MH = lambda n: f'{C}/100-CC0-wood-metal-SFX/metal_hit_{n:02d}.ogg'; SH = lambda n: f'{C}/100-CC0-wood-metal-SFX/metal_sheet_{n:02d}.ogg'
DOWN = 'asetrate=37485,aresample=44100'; LOW = 'lowpass=f=350,bass=g=4:f=90'
def ring(t): return f'atrim=0:{t},afade=t=out:st={t*0.4:.3f}:d={t*0.6:.3f}'
def hit(name, layers, dur):
    ins, fl = [], []
    for i, (f, flt, d, g) in enumerate(layers):
        ins += ['-i', f]
        fl.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-45dB,{flt},volume={g}dB,adelay={d}[l{i}]')
    n = len(layers)
    fl.append(''.join(f'[l{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0,atrim=0:{dur},afade=t=out:st={dur-0.08}:d=0.08,alimiter=limit=0.9[o]')
    out = f'{O}/{name}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', '[o]', out], check=True); return out
def seq(name, hits, gap=0.65):
    ins, fl = [], []
    for i, h in enumerate(hits): ins += ['-i', h]; fl.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,apad=whole_dur={gap}[s{i}]')
    fl.append(''.join(f'[s{i}]' for i in range(len(hits))) + f'concat=n={len(hits)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7[o]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', '[o]', '-ar', '22050', '-ac', '1', '-b:a', '64k', f'{O}/{name}.mp3'], check=True)
base = lambda w, k, d=0: [(W(w), DOWN, d, 0), (KW(k), LOW, d, -1)]
SET = ((3, 13, 3, 2, 1), (5, 4, 4, 1, 3), (16, 7, 1, 3, 5))   # 木盾, 铜盾, 铁击, 甲片, 矛
# 对照：上一批的庚（锵很轻）
seq('block_g', [hit(f'g{k}', base(w, k) + [(M(m), ring(0.08), 4, -13)], 0.3) for k, (w, m, h, s, p) in enumerate(SET)])
# 壬（中）：锵加重、拖一点点
seq('block_i', [hit(f'i{k}', base(w, k) + [(M(m), ring(0.14), 4, -6)], 0.35) for k, (w, m, h, s, p) in enumerate(SET)])
# 癸（重）：铜盾锵 + 一记铁击，金属为主
seq('block_j', [hit(f'j{k}', base(w, k) + [(M(m), ring(0.2), 3, -3), (MH(h), 'highpass=f=600,' + ring(0.18), 6, -5)], 0.4) for k, (w, m, h, s, p) in enumerate(SET)])
# 子（披甲）：壬 + 甲片哗啦（盾后的人身上甲片被震响）
seq('block_k', [hit(f'k{k}', base(w, k) + [(M(m), ring(0.14), 4, -6), (SH(s), 'highpass=f=800,' + ring(0.3), 40, -9)], 0.45) for k, (w, m, h, s, p) in enumerate(SET)])
# 丑（整套重版）：出矛嗖 → 癸 + 甲片
seq('block_l', [hit(f'l{k}', [(SP(p), 'highpass=f=300,atrim=0:0.25,afade=t=out:st=0.18:d=0.07', 0, -6)] + base(w, k, 230) + [(M(m), ring(0.2), 233, -3), (MH(h), 'highpass=f=600,' + ring(0.18), 236, -5), (SH(s), 'highpass=f=800,' + ring(0.3), 270, -9)], 0.75) for k, (w, m, h, s, p) in enumerate(SET)], gap=0.95)
