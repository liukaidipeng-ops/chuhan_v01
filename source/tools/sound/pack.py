"""把试听台通过的句子放进写实配音：voice/real/<游戏编号>.mp3（去头尾静音、响度 −17.4 dB、32 kHz 单声道 56 kbps），字幕写进 real.json 的 text。
用法：python3 source/tools/sound/pack.py <映射.json> <voice-lab 分支的 voicelab/out 目录>
映射：[[游戏编号, 批次, 生成时的编号(不带 real_), 字幕], ...]，例子见 pack-maps/。
游戏编号以 up_ / h_ / sk_ 开头的会被 build.js 自动放进技能模式专用包 voice-bf.bin。"""
import json, os, sys, subprocess
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H); import vproc as V
D = os.path.join(H, '..', '..', 'voice', 'real'); OUT = sys.argv[2]
M = json.load(open(sys.argv[1], encoding='utf8'))
meta = json.load(open(os.path.join(D, 'real.json'), encoding='utf8'))
for gid, b, sid, text in M:
    src = os.path.join(OUT, b, 'real_' + sid + '.mp3'); dst = os.path.join(D, gid + '.mp3')
    x = V.trim(V.load(src)); x = x * 10 ** ((-17.4 - V.rms_db(x)) / 20)
    tmp = dst + '.wav'; V.save(x, tmp)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', 'alimiter=limit=0.95:level=disabled', '-ar', '32000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '56k', dst], check=True); os.remove(tmp)
    meta['text'][gid] = text
json.dump(meta, open(os.path.join(D, 'real.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('packed', len(M))
