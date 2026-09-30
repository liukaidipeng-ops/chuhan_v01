"""下载并处理 CC0 真实录音素材 → sfx/out/<id>_<n>.mp3（单声道 22.05kHz）
来源（均为 CC0 1.0 公共领域）：
  - github.com/lavenderdotpet/CC0-Public-Domain-Sounds （Kenney、OpenGameArt rubberduck 系列、Warfork CC0 等）
  - github.com/Mcamento8/open-game-sfx-index （Kenney、OpenGameArt）
"""
import os, subprocess, urllib.parse, json, sys
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, 'out'); RAW = os.path.join(D, 'raw')
os.makedirs(OUT, exist_ok=True); os.makedirs(RAW, exist_ok=True)
LAV = 'https://raw.githubusercontent.com/lavenderdotpet/CC0-Public-Domain-Sounds/main/'
IDX = 'https://raw.githubusercontent.com/Mcamento8/open-game-sfx-index/main/audio/'
K = 'kenney_impactsounds/Audio/'; KR = 'kenney_rpgaudio/Audio/'
RPG = '80-CC0-RPG-SFX/'; BANG = '25-CC0-bang-sfx/'; BFH = '75-cc0-breaking-falling-hit-sfx/bfh1_'
WOOSH = 'Micro Pack - Organic Wooshes/'; WF = 'warfork-cc0/sounds/'; CR = '80-CC0-creature-SFX/'
OGA = IDX + 'oga-rpg-pack/RPG Sound Pack/'
# id: ([来源...], 最长秒数)
S = {
  'blade':     ([LAV + RPG + f'blade_0{i}.ogg' for i in (1, 2, 3)], 1.6),
  'metal':     ([LAV + RPG + f'metal_0{i}.ogg' for i in (1, 2, 3)] + [LAV + K + f'impactMetal_heavy_00{i}.ogg' for i in (0, 1, 2)], 1.4),
  'plate':     ([LAV + K + f'impactPlate_heavy_00{i}.ogg' for i in (0, 1, 2)], 1.0),
  'punch':     ([LAV + K + f'impactPunch_heavy_00{i}.ogg' for i in (0, 1, 2, 3)], 0.8),
  'soft':      ([LAV + K + f'impactSoft_heavy_00{i}.ogg' for i in (0, 1, 2)], 0.8),
  'wood':      ([LAV + K + f'impactWood_heavy_00{i}.ogg' for i in (0, 1, 2, 3)], 0.8),
  'plank':     ([LAV + K + f'impactPlank_medium_00{i}.ogg' for i in (0, 1, 2)], 0.8),
  'step':      ([LAV + K + f'footstep_grass_00{i}.ogg' for i in (0, 1, 2, 3, 4)] + [LAV + K + f'footstep_concrete_00{i}.ogg' for i in (0, 1, 2)], 0.5),
  'chain':     ([LAV + RPG + 'chain_01.ogg', LAV + RPG + 'chain_02.ogg', OGA + 'inventory/chainmail1.wav', OGA + 'inventory/chainmail2.wav', OGA + 'inventory/armor-light.wav'], 1.0),
  'unsheathe': ([OGA + f'battle/sword-unsheathe{s}.wav' for s in ('', '2', '3', '4', '5')] + [LAV + KR + f'drawKnife{i}.ogg' for i in (1, 2, 3)], 1.0),
  'swing':     ([OGA + f'battle/swing{s}.wav' for s in ('', '2', '3')] + [LAV + WOOSH + f'Swish {i}.wav' for i in (1, 2, 3)] + [IDX + f'oga-battle/battle_sound_effects/swish_{i}.wav' for i in (2, 3, 4)], 0.8),
  'slash':     ([LAV + WOOSH + 'Slash.wav', LAV + WOOSH + 'Classic Swish 1.wav'], 0.9),
  'twirl':     ([LAV + WOOSH + 'Twirl 1.wav', LAV + WOOSH + 'Twirl 2.wav'], 1.5),
  'thunk':     ([LAV + WOOSH + 'Thunk 1.wav', LAV + WOOSH + 'Thunk 2.wav'], 0.6),
  'bow':       ([IDX + 'oga-battle/battle_sound_effects/Bow.wav'], 0.8),
  'chop':      ([LAV + KR + 'chop.ogg', LAV + KR + 'knifeSlice.ogg', LAV + KR + 'knifeSlice2.ogg'], 0.8),
  'creak':     ([LAV + KR + f'creak{i}.ogg' for i in (1, 2, 3)], 1.5),
  'cloth':     ([LAV + KR + f'cloth{i}.ogg' for i in (1, 2, 3)] + [OGA + 'inventory/cloth-heavy.wav'], 0.8),
  'cannon':    ([LAV + BANG + f'cannon_0{i}.ogg' for i in (1, 2, 3, 4, 5)], 3.0),
  'boom':      ([LAV + BANG + f'bang_0{i}.ogg' for i in (1, 2, 3, 4, 5)], 3.0),
  'woodbreak': ([LAV + BFH + f'wood_breaking_0{i}.ogg' for i in (1, 2, 3, 4)], 2.0),
  'metalfall': ([LAV + BFH + f'metal_falling_0{i}.ogg' for i in (1, 2, 3)], 1.5),
  'rockfall':  ([LAV + BFH + f'rock_falling_0{i}.ogg' for i in (1, 2)], 2.0),
  'hit':       ([LAV + BFH + f'hit_0{i}.ogg' for i in (1, 2, 3)], 1.0),
  'splash':    ([LAV + f'40-cc0-water-splash-slime-sfx/splash_0{i}.ogg' for i in (1, 2, 3, 4, 5)], 1.5),
  'water':     ([LAV + '40-cc0-water-splash-slime-sfx/loop_water_01.ogg', LAV + '30-cc0-sfx-loops/water_flowing.ogg'], 7.0),
  'rolling':   ([LAV + '30-cc0-sfx-loops/rolling.ogg'], 5.0),
  'pain':      ([LAV + WF + f'players/male/pain{i}.ogg' for i in (25, 50, 75, 100)], 1.2),
  'death':     ([LAV + WF + 'players/male/death.ogg', LAV + WF + 'players/male/falldeath.ogg'], 1.8),
  'gasp':      ([LAV + WF + 'players/male/gasp.ogg'], 1.0),
  'gibs':      ([LAV + WF + 'misc/gibs_explosion.wav'], 1.5),
  'roar':      ([LAV + CR + f'roar_0{i}.ogg' for i in (1, 2, 3)], 2.5),
  'grunt':     ([LAV + CR + f'grunt_0{i}.ogg' for i in (1, 2, 3)], 1.0),
  'breath':    ([LAV + CR + 'breath.ogg'], 1.5),
  'stones':    ([LAV + RPG + 'stones_01.ogg', LAV + RPG + 'stones_02.ogg'], 1.5),
}
LOOPS = {'water', 'rolling'}
only = set(sys.argv[1:])
man = {}
for sid, (srcs, maxd) in S.items():
    if only and sid not in only: continue
    man[sid] = []
    for n, url in enumerate(srcs):
        q = urllib.parse.quote(url[len('https://raw.githubusercontent.com/'):])
        u = 'https://raw.githubusercontent.com/' + q
        ext = os.path.splitext(url)[1]
        raw = os.path.join(RAW, f'{sid}_{n}{ext}')
        if not os.path.exists(raw) or os.path.getsize(raw) < 200:
            r = subprocess.run(['curl', '-sSLf', '-m', '60', '-o', raw, u])
            if r.returncode != 0: print('FAIL', sid, url); continue
        out = os.path.join(OUT, f'{sid}_{n}.mp3')
        af = [] if sid in LOOPS else ['silenceremove=start_periods=1:start_threshold=-50dB']
        af += [f'atrim=0:{maxd}', f'afade=t=out:st={max(0.05, maxd - 0.12)}:d=0.12', 'dynaudnorm=f=150:g=5:p=0.9' if sid in LOOPS else 'volume=0dB']
        # 峰值归一化
        vd = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', ','.join(af + ['volumedetect']), '-f', 'null', '-'], capture_output=True, text=True).stderr
        peak = 0.0
        for line in vd.splitlines():
            if 'max_volume' in line: peak = float(line.split('max_volume:')[1].split('dB')[0])
        af.append(f'volume={-1.0 - peak:.1f}dB')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', ','.join(af), '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '48k', out], check=True)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout or 0)
        man[sid].append({'f': f'{sid}_{n}.mp3', 'dur': round(dur, 2), 'src': url.split('/main/')[-1]})
    print(sid, len(man[sid]), flush=True)
json.dump(man, open(os.path.join(D, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
tot = sum(os.path.getsize(os.path.join(OUT, x['f'])) for v in man.values() for x in v)
print('TOTAL', sum(len(v) for v in man.values()), 'files', tot // 1024, 'KB')
