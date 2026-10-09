"""联机房间提示音（Ham 10-09 在试听台第二十七批挑的，备注「都行随机」）→ sfx/out，登记进 sfx/manifest.json。
  有人进房 roomjoin：铜锣一声、战鼓两声、掀帘入帐，三条随机放
  有人准备 roomready：擂鼓一声、古琴一拨、梆子两响，三条随机放
  python3 sfx/add_room.py <试听台 audio 目录> <后期工具目录（vproc.py）>
素材：铜锣、帐帘、脚步、鼓边是 CC0 录音（lavenderdotpet/CC0-Public-Domain-Sounds）；战鼓、古琴、梆子是代码合成的。"""
import sys, os, json, glob, subprocess, tempfile
DESK, TOOLS = sys.argv[1], sys.argv[2]; sys.path.insert(0, TOOLS)
import vproc as V
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/out/'
man = json.load(open(D + '/manifest.json', encoding='utf8'))
def put(id, items, br='64k'):
    for f in glob.glob(OUT + id + '_*.mp3'): os.remove(f)
    man[id] = []
    for i, (path, src) in enumerate(items):
        x = V.load(path); name = '%s_%d.mp3' % (id, i)
        with tempfile.NamedTemporaryFile(suffix='.wav') as t:
            V.save(x, t.name); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', br, OUT + name], check=True)
        man[id].append({'f': name, 'dur': round(len(x) / V.SR, 2), 'src': src})
d = lambda n: '%s/b30/%s.mp3' % (DESK, n)
put('roomjoin', [(d('join_1'), '试听台 b30 铜锣一声：CC0 gong_01'), (d('join_2'), '试听台 b30 战鼓两声：合成'), (d('join_3'), '试听台 b30 掀帘入帐：CC0 帐帘 + 脚步')])
put('roomready', [(d('ready_3'), '试听台 b30 擂鼓一声：合成战鼓 + CC0 鼓边'), (d('ready_4'), '试听台 b30 古琴一拨：合成'), (d('ready_5'), '试听台 b30 梆子两响：合成')])
json.dump(man, open(D + '/manifest.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print({k: [(x['f'], x['dur']) for x in man[k]] for k in ('roomjoin', 'roomready')})
