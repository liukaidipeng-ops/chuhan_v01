"""兵种台词与人群呐喊：Kokoro 多说话人合成 → 变调/齐喊叠层/混响 → MP3
  python3 voice/gen_units.py            生成全部
  python3 voice/gen_units.py u_r_p_m1   只生成指定条目
台词写进 voice/lines.json（spk=unit），音频进 voice/out；人群呐喊写进 sfx/out 并登记到 sfx/manifest.json。"""
import json, os, subprocess, sys, tempfile, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
import sherpa_onnx

SP = '/tmp/claude-0/-home-claude/b11a9c4e-e8a9-556b-a316-4b79381abfb8/scratchpad/'
D = SP + 'kokoro-multi-lang-v1_0/'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOUT = ROOT + '/voice/out'; SOUT = ROOT + '/sfx/out'
TMP = tempfile.mkdtemp(prefix='units_', dir=SP)
only = set(sys.argv[1:])
cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
    model=D + 'model.onnx', voices=D + 'voices.bin', tokens=D + 'tokens.txt', data_dir=D + 'espeak-ng-data', dict_dir=D + 'dict',
    lexicon=D + 'lexicon-us-en.txt,' + D + 'lexicon-zh.txt'), num_threads=6),
    rule_fsts=D + 'date-zh.fst,' + D + 'phone-zh.fst,' + D + 'number-zh.fst', max_num_sentences=1)
tts = sherpa_onnx.OfflineTts(cfg)
SR = 24000
rng = np.random.default_rng(11)
ZH_M = [49, 50, 51, 52]  # zm_yunjian, zm_yunxi, zm_yunxia, zm_yunyang

def say(text, sid, speed=1.0, pitch=1.0):
    a = tts.generate(text, sid=sid, speed=speed)
    raw = f'{TMP}/r.wav'; out = f'{TMP}/p.wav'
    sf.write(raw, np.array(a.samples), a.sample_rate)
    af = f'rubberband=pitch={pitch}:formant=preserved,' if abs(pitch - 1) > 1e-3 else ''
    af += 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', af, '-ar', str(SR), '-ac', '1', out], check=True)
    x, _ = sf.read(out)
    return x

def ir(rt):
    n = int(SR * rt); t = np.arange(n) / SR
    x = rng.standard_normal(n) * np.exp(-6.9 * t / rt); x[:int(0.015 * SR)] = 0
    return sosfilt(butter(2, 5000, 'low', fs=SR, output='sos'), x)

def finish(x, verb=0.12, rt=1.2, warm=1.0, drive=0.0, hp=80):
    x = sosfilt(butter(2, hp, 'high', fs=SR, output='sos'), x)
    if warm: x = x + sosfilt(butter(2, 240, 'low', fs=SR, output='sos'), x) * (10 ** (warm / 20) - 1)
    if drive: x = np.tanh(x / (np.max(np.abs(x)) + 1e-9) * drive) / np.tanh(drive)
    wet = fftconvolve(x, ir(rt))[:len(x) + int(SR * rt * 0.5)]
    wet = wet / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(x))
    y = np.zeros(len(wet)); y[:len(x)] += x
    y = y * (1 - verb * 0.5) + wet * verb
    return y / (np.max(np.abs(y)) + 1e-9) * 0.9

def mix(layers):
    n = max(int(d * SR) + len(x) for x, d, g in layers)
    y = np.zeros(n)
    for x, d, g in layers:
        o = int(d * SR); y[o:o + len(x)] += x * g
    return y

def save(y, path, lufs=-16):
    w = f'{TMP}/w.wav'; sf.write(w, y, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11', '-ar', str(SR), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '40k', path], check=True)
    return len(y) / SR

# 声线：汉兵（云夏，略低）、楚兵（云扬，更低更粗）；主帅沿用原声线
SIDE = {
    'r': dict(sid=51, pitch=0.93, drive=0.0, warm=1.0),
    'b': dict(sid=52, pitch=0.85, drive=1.3, warm=2.0),
}
HERO = {'r': dict(sid=50, pitch=0.9, warm=1.0, drive=0.0), 'b': dict(sid=49, pitch=0.9, warm=3.0, drive=1.6)}

def move_line(side, unit, text):
    v = HERO[side] if unit == 'k' else SIDE[side]
    x = say(text, v['sid'], 0.95, v['pitch'])
    return finish(x, verb=0.08, rt=1.0, warm=v['warm'], drive=v['drive'])

def kill_line(side, unit, text):
    if unit == 'k':
        v = HERO[side]
        x = say(text, v['sid'], 1.02, v['pitch'] * 1.03)
        return finish(x, verb=0.18, rt=1.6, warm=v['warm'], drive=max(1.4, v['drive']))
    v = SIDE[side]
    lead = say(text, v['sid'], 1.08, v['pitch'] * 1.04)
    layers = [(lead, 0.0, 1.0)]
    # 齐喊：其余声线变调叠层，前后错开
    for k, sid in enumerate([s for s in ZH_M if s != v['sid']] + [v['sid']]):
        for pr in ([0.84, 1.0] if k % 2 else [0.9, 1.06]):
            x = say(text, sid, float(rng.uniform(1.0, 1.16)), float(pr * v['pitch'] / 0.9))
            layers.append((x, float(rng.uniform(0.01, 0.09)), float(rng.uniform(0.32, 0.5))))
    return finish(mix(layers), verb=0.22, rt=1.7, warm=v['warm'] + 1, drive=1.5)

UNITS = {
    'r': {
        'p': (['稳住阵型，向前！', '跟紧了，别掉队。'], ['汉军威武！', '拿下此阵！']),
        'r': (['战车出阵。', '驾！稳着点。'], ['碾过去！', '冲垮他们！']),
        'n': (['骑兵，跟上！', '灌将军有令，出发。'], ['斩将夺旗！', '踏破敌营！']),
        'c': (['炮车推上去。', '炮位转移。'], ['点火，放！', '开炮！']),
        'e': (['弩手列阵。', '上弦，备战。'], ['万箭齐发！', '放箭！']),
        'a': (['护住汉王。', '近卫随行。'], ['犯我汉王者，死！', '樊哙在此！']),
        'k': (['随我来。', '稳扎稳打。', '老子换个地方坐坐。', '传令，移驾！', '此地不宜久留。'], ['拿下！', '天命在汉！', '斩白蛇的剑，还没钝！', '老子亲自动手！']),   # 第三句起是 2026-10-05 加的（写实版 b20）
    },
    'b': {
        'p': (['勇往直前！', '江东子弟，随我来。'], ['为了江东！', '楚军必胜！']),
        'r': (['车马就位。', '驾——向前推进。'], ['撞开敌阵！', '碾碎他们！']),
        'n': (['马不停蹄。', '快马加鞭！'], ['踏平汉营！', '楚骑天下无敌！']),
        'c': (['火炮就位。', '炮车慢点推。'], ['给我轰！', '炸开他们的阵！']),
        'e': (['象阵前行。', '稳住，别惊了大象。'], ['踏碎他们！', '象阵冲锋！']),
        'a': (['誓死护卫霸王。', '守住大营。'], ['霸王面前，休得放肆！', '护驾！斩！']),
        'k': (['哼，不过如此。', '江东子弟，随我前行。', '霸王在此，谁敢近前！', '吾自有分寸。'], ['力拔山兮！', '挡我者，死！', '吾一人，可敌万人！', '霸王亲至，尔等授首！']),
    },
}
TTS_FIX = {'驾——向前推进。': '驾，向前推进。', '哼，不过如此。': '哼。不过如此。'}

lines_path = ROOT + '/voice/lines.json'
lines = json.load(open(lines_path, encoding='utf8'))
lines = [l for l in lines if l.get('spk') != 'unit']
for side, us in UNITS.items():
    for unit, (mv, kl) in us.items():
        for kind, arr in (('m', mv), ('k', kl)):
            for i, text in enumerate(arr):
                lid = f'u_{side}_{unit}_{kind}{i + 1}'
                lines.append({'id': lid, 'spk': 'unit', 'text': text})
                if only and lid not in only: continue
                y = (move_line if kind == 'm' else kill_line)(side, unit, TTS_FIX.get(text, text))
                dur = save(y, f'{VOUT}/{lid}.mp3', -16 if kind == 'm' else -14)
                print(lid, text, f'{dur:.2f}s', flush=True)
json.dump(lines, open(lines_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)

# ---------- 人群：欢呼、喊杀、叫阵、叹气 ----------
def crowd(texts, n, spread, gain=(0.35, 0.7), speed=(0.95, 1.2), pitch=(0.8, 1.05), verb=0.28, rt=2.0, drive=1.2):
    layers = []
    for k in range(n):
        sid = ZH_M[k % 4]
        t = texts[k % len(texts)]
        x = say(t, sid, float(rng.uniform(*speed)), float(rng.uniform(*pitch)))
        layers.append((x, float(rng.uniform(0, spread)), float(rng.uniform(*gain))))
    return finish(mix(layers), verb=verb, rt=rt, warm=2.0, drive=drive, hp=110)

CROWD = {
    'cheer': [lambda: crowd(['好！', '威武！', '哈哈哈！', '哦！', '好啊！', '威武！'], 14, 0.9), lambda: crowd(['威武！', '好！', '哦！', '哈哈！'], 14, 0.8), lambda: crowd(['好！', '哈哈哈！', '威武！', '赢了！'], 12, 0.7)],
    'warcry': [lambda: crowd(['杀！'], 12, 0.25, speed=(0.8, 1.0), drive=1.6), lambda: crowd(['杀！', '冲啊！'], 12, 0.35, speed=(0.85, 1.05), drive=1.6)],
    'jeer_r': [lambda: crowd(['楚军，不过如此！', '哈哈哈！', '哈哈！'], 9, 0.5, pitch=(0.85, 1.0))],
    'jeer_b': [lambda: crowd(['汉军，不堪一击！', '哈哈哈！', '哈哈！'], 9, 0.5, pitch=(0.8, 0.95))],
    'groan': [lambda: crowd(['唉！', '哎呀！', '唉。'], 10, 0.6, speed=(0.75, 0.95), pitch=(0.78, 0.92), drive=0), lambda: crowd(['唉。', '完了。', '哎！'], 10, 0.6, speed=(0.75, 0.9), pitch=(0.78, 0.9), drive=0)],
}
man_path = ROOT + '/sfx/manifest.json'
man = json.load(open(man_path, encoding='utf8'))
for cid, gens in CROWD.items():
    if only and cid not in only: continue
    man[cid] = []
    for i, g in enumerate(gens):
        y = g()
        f = f'{cid}_{i}.mp3'
        dur = save(y, f'{SOUT}/{f}', -18)
        man[cid].append({'f': f, 'dur': round(dur, 2), 'src': 'Kokoro TTS 多声线齐喊（本项目生成）'})
        print(cid, i, f'{dur:.2f}s', flush=True)
json.dump(man, open(man_path, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('UNITS DONE')
