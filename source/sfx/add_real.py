"""真实动物 / 脚步录音 → sfx/out（单声道 22.05 kHz），登记进 sfx/manifest.json。
来源：0 A.D.（Wildfire Games）的音效，CC BY-SA 3.0——用了就要署名，游戏的「玩法说明」末尾有一段。
  python3 sfx/add_real.py <0ad 音效目录> <后期工具目录（vproc.py、sfxlib.py）>
马蹄做了“踏在土上”的处理（削高频、垫低频、加行军回响）；象的脚步是现成的重踏录音（CC0）压低后同样处理；人的脚步、马嘶、象鸣是原声。"""
import sys, os, json, glob, subprocess, tempfile, numpy as np
SRC, TOOLS = sys.argv[1], sys.argv[2]; sys.path.insert(0, TOOLS)
import vproc as V, sfxlib as X
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/out/'
man = json.load(open(D + '/manifest.json', encoding='utf8'))
def put(id, items):
    for f in glob.glob(OUT + id + '_*.mp3'): os.remove(f)
    man[id] = []
    for i, (x, src) in enumerate(items):
        x = V.norm(x, 0.9); name = '%s_%d.mp3' % (id, i)
        with tempfile.NamedTemporaryFile(suffix='.wav') as t:
            V.save(x, t.name); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', OUT + name], check=True)
        man[id].append({'f': name, 'dur': round(len(x) / V.SR, 2), 'src': src})
L = lambda n, **k: X.L(SRC + '/' + n + '.ogg', **k); A = '0ad (CC BY-SA 3.0): '
r = np.random.default_rng(21)
put('hoofr', [(X.earth(X.fade(X.hoof(k), 0.01, 0.15), 'b'), A + 'mstep%d' % k) for k in (113, 114, 115, 111, 112)])
put('hoofwar', [(L('alarmcreatecavalry_1', tailpad=0.3), A + 'alarmcreatecavalry_1')])
put('neigha', [(L('horse_attack%d' % i), A + 'horse_attack%d' % i) for i in (1, 2, 3)])
put('neighm', [(L(n), A + n) for n in ('horse_idle1', 'horse_idle3', 'horse_select1')])
put('neighd', [(L(n), A + n) for n in ('death_horse_10', 'death_horse_11', 'horse_death1')])
put('elecry', [(L('elephant_' + n, tailpad=0.3), A + 'elephant_' + n) for n in ('order1', 'attack1', 'death1')])
stomp = X.L(OUT + 'stomp_0.mp3'); soft = [X.L(f) for f in sorted(glob.glob(OUT + 'soft_*.mp3'))]
def heavy(n, gap):
    items = []
    for i in range(n):
        t = i * gap + float(r.uniform(0, 0.04)); items += [(X.rate(stomp, float(r.uniform(0.62, 0.72))), t, 0), (X.rate(soft[i % 3], 0.5), t + 0.01, -2)]
    return X.earth(X.mix(items), 'b')
put('elestep', [(heavy(4, 0.55), 'CC0 stomp/soft，压低 + 处理')]); put('elerun', [(X.fade(heavy(6, 0.3), 0.05, 0.3), 'CC0 stomp/soft，压低 + 处理')])
put('foot', [(X.L(SRC + '/' + f + '.ogg', tailpad=0.15)[:int(2.8 * V.SR)], A + f) for f in ('hstep_dirt_MN_11', 'hstep_dirt_MN_13', 'Footstep_Gravel_Walking', 'Footstep_Grass_Walking')])
json.dump(man, open(D + '/manifest.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print({k: [(x['f'], x['dur']) for x in man[k]] for k in ('hoofr', 'hoofwar', 'neigha', 'neighm', 'neighd', 'elecry', 'elestep', 'elerun', 'foot')})
