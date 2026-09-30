"""离线生成配音：Kokoro 多说话人 → 变调/混响/响度处理 → MP3（24kHz 单声道）"""
import json, os, subprocess, sys, numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt
import sherpa_onnx

D = '/tmp/claude-0/kokoro-multi-lang-v1_0/'
OUT = '/home/claude/xq/voice/out'
os.makedirs(OUT, exist_ok=True)
lines = json.load(open('/home/claude/xq/voice/lines.json', encoding='utf8'))
only = set(sys.argv[1:])

cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
    model=D + 'model.onnx', voices=D + 'voices.bin', tokens=D + 'tokens.txt', data_dir=D + 'espeak-ng-data', dict_dir=D + 'dict',
    lexicon=D + 'lexicon-us-en.txt,' + D + 'lexicon-zh.txt'), num_threads=4),
    rule_fsts=D + 'date-zh.fst,' + D + 'phone-zh.fst,' + D + 'number-zh.fst', max_num_sentences=1)
tts = sherpa_onnx.OfflineTts(cfg)

# 说话人：Kokoro 声线 + 语速 + 处理链
SPK = {
    'narr':  dict(sid=52, speed=0.86, ff='rubberband=pitch=0.95:formant=preserved', verb=0.10, rt=1.2, warm=1.5),
    'xiang': dict(sid=49, speed=0.84, ff='asetrate=24000*0.9,aresample=24000,atempo=1.1111', verb=0.18, rt=1.8, warm=3.0, drive=1.6),
    'liu':   dict(sid=50, speed=0.94, ff='rubberband=pitch=0.9:formant=preserved', verb=0.08, rt=1.0, warm=1.0),
    'elder': dict(sid=50, speed=0.8, ff='asetrate=24000*0.8,aresample=24000,atempo=1.25,tremolo=f=5.5:d=0.1,highpass=f=100', verb=0.08, rt=0.9, warm=0.5),
}

rng = np.random.default_rng(7)
def ir(sr, rt):
    n = int(sr * rt)
    t = np.arange(n) / sr
    x = rng.standard_normal(n) * np.exp(-6.9 * t / rt)
    x[:int(0.012 * sr)] = 0  # 预延迟
    sos = butter(2, 5500, 'low', fs=sr, output='sos')
    return sosfilt(sos, x)

def process(x, sr, sp):
    # 低频温暖感
    if sp.get('warm'):
        sos = butter(2, 220, 'low', fs=sr, output='sos')
        x = x + sosfilt(sos, x) * (10 ** (sp['warm'] / 20) - 1)
    if sp.get('drive'):
        x = np.tanh(x * sp['drive']) / np.tanh(sp['drive'])
    wet = fftconvolve(x, ir(sr, sp['rt']))[:len(x) + int(sr * sp['rt'] * 0.6)]
    wet = wet / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(x))
    y = np.zeros(len(wet)); y[:len(x)] += x
    y = y * (1 - sp['verb'] * 0.5) + wet * sp['verb']
    return y

for L in lines:
    if only and L['id'] not in only: continue
    sp = SPK[L['spk']]
    text = L.get('tts', L['text'])
    a = tts.generate(text, sid=sp['sid'], speed=L.get('speed', sp['speed']))
    raw = f'/tmp/claude-0/v_{L["id"]}_raw.wav'
    sf.write(raw, np.array(a.samples), a.sample_rate)
    shifted = f'/tmp/claude-0/v_{L["id"]}_sh.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af',
                    sp['ff'] + ',silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
                    '-ar', '24000', '-ac', '1', shifted], check=True)
    x, sr = sf.read(shifted)
    y = process(x, sr, sp)
    wet = f'/tmp/claude-0/v_{L["id"]}_fx.wav'
    sf.write(wet, y / (np.max(np.abs(y)) + 1e-9) * 0.9, sr)
    mp3 = f'{OUT}/{L["id"]}.mp3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wet, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '40k', mp3], check=True)
    dur = len(y) / sr
    print(L['id'], L['spk'], f'{dur:.2f}s', os.path.getsize(mp3), flush=True)
print('VOICE DONE')
