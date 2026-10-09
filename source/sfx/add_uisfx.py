"""界面音效（悬停、点击）和四种材质的落子声（Ham 10-09 在试听台第二十九批挑的）→ sfx/out，登记进 sfx/manifest.json。
  用法：python3 sfx/add_uisfx.py <试听台 audio 目录> <后期工具目录（vproc.py）> hover=hover_2 click=click_2 wood=wood_3 silver=silver_2 gold=gold_1 jade=jade_1,jade_3
  每组可以挑几条（逗号隔开），游戏里随机放。木头挑「wood_0」（现在的声音）或不写 = 不登记 pw，游戏照旧用原来的木头声。
  登记的名字：uihover、uiclick、pw（木）、ps（银）、pg（金）、pj（玉），audio.js 的 Sfx.ui / Sfx.place 按这些名字取。
素材都是 CC0 录音（lavenderdotpet/CC0-Public-Domain-Sounds 里的 Kenney、BB 等素材包），出处见 b32 试听台每条的说明。"""
import sys, os, json, glob, subprocess, tempfile
import numpy as np
DESK, TOOLS = sys.argv[1], sys.argv[2]; sys.path.insert(0, TOOLS)
import vproc as V
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/out/'
man = json.load(open(D + '/manifest.json', encoding='utf8'))
picks = dict(a.split('=', 1) for a in sys.argv[3:])
KEY = {'hover': 'uihover', 'click': 'uiclick', 'wood': 'pw', 'silver': 'ps', 'gold': 'pg', 'jade': 'pj'}


def one(path, first_only):
    """试听台的那一条去掉开头的空白；悬停那条是连着三下，只取第一下"""
    x = V.load(path); e = V.env(x, 0.002); pk = e.max()
    on = int(np.argmax(e > pk * 0.05)); a = max(0, on - int(0.002 * V.SR))
    if first_only:
        b = a + int(0.3 * V.SR)   # 三下之间隔 0.37 秒
        x = x[a:b]
    else:
        x = x[a:]
    t0, t1 = V.voiced(x, -50); x = x[: int(t1 * V.SR) + int(0.01 * V.SR)]
    f = min(len(x) // 4, int(0.02 * V.SR)); x[-f:] *= np.linspace(1, 0, f) ** 2
    return x


def put(id, names, first_only, br='64k'):
    for f in glob.glob(OUT + id + '_*.mp3'): os.remove(f)
    man[id] = []
    for i, n in enumerate(names):
        x = one('%s/b32/%s.mp3' % (DESK, n), first_only); name = '%s_%d.mp3' % (id, i)
        with tempfile.NamedTemporaryFile(suffix='.wav') as t:
            V.save(x, t.name); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', br, OUT + name], check=True)
        man[id].append({'f': name, 'dur': round(len(x) / V.SR, 3), 'src': '试听台 b32 ' + n + '：CC0 录音'})


for grp, id in KEY.items():
    names = [n for n in picks.get(grp, '').split(',') if n]
    if grp == 'wood' and (not names or names == ['wood_0']):
        man.pop(id, None); [os.remove(f) for f in glob.glob(OUT + id + '_*.mp3')]; continue
    names = [n for n in names if n != 'wood_0']
    if names: put(id, names, grp == 'hover')
json.dump(man, open(D + '/manifest.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print({k: [(x['f'], x['dur']) for x in man[k]] for k in KEY.values() if k in man})
