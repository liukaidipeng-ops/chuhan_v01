"""Ham 在试听台上通过的成品音效 → sfx/out（单声道 22.05 kHz），登记进 sfx/manifest.json。
这些是拿几样素材叠出来的成品（巨炮 = 实录炮响 + 爆炸 + 火药爆炸；炸开 = 爆炸 + 投石命中；虎啸 = 真狮吼 + 山岭回声……），
所以直接收成品，不在游戏里现叠——保证游戏里听到的就是他点头的那一条。
  python3 sfx/add_approved.py <试听台 audio 目录> <OpenClonk 音效目录> <后期工具目录（vproc.py）>
素材来源：0 A.D.（Wildfire Games，CC BY-SA 3.0）、OpenClonk（CC BY 3.0）、Minetest Game（CC0）、CC0 兽吼。署名在游戏「玩法说明」末尾。"""
import sys, os, json, glob, subprocess, tempfile
DESK, CLONK, TOOLS = sys.argv[1], sys.argv[2], sys.argv[3]; sys.path.insert(0, TOOLS)
import vproc as V
D = os.path.dirname(os.path.abspath(__file__)); OUT = D + '/out/'
man = json.load(open(D + '/manifest.json', encoding='utf8'))
def put(id, items, br='48k', tailpad=0.25):
    for f in glob.glob(OUT + id + '_*.mp3'): os.remove(f)
    man[id] = []
    for i, (path, src) in enumerate(items):
        x = V.norm(V.trim(V.load(path), lead=0.01, tailpad=tailpad, db=-50), 0.9); name = '%s_%d.mp3' % (id, i)
        with tempfile.NamedTemporaryFile(suffix='.wav') as t:
            V.save(x, t.name); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-ar', '22050', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', br, OUT + name], check=True)
        man[id].append({'f': name, 'dur': round(len(x) / V.SR, 2), 'src': src})
def drop(id):
    for f in glob.glob(OUT + id + '_*.mp3'): os.remove(f)
    man.pop(id, None)
d = lambda b, n: '%s/%s/%s.mp3' % (DESK, b, n)
put('bigcannon', [(d('b14', 'big_%d' % k), '试听台 b14 巨炮%s：OpenClonk 炮响/爆炸 (CC BY 3.0) + Minetest 火药爆炸 (CC0)' % c) for k, c in ((1, '一'), (3, '三'), (5, '五'))])
put('cannon1', [(d('b14', 'lv1'), '试听台 b14 初级炮：OpenClonk GunShoot3 (CC BY 3.0)')])
put('blast', [(d('b14', 'hit_%d' % k), '试听台 b14 炸开%s：爆炸 (OpenClonk CC BY 3.0 / Minetest CC0) + 0 A.D. 投石命中 (CC BY-SA 3.0)' % c) for k, c in ((1, '一'), (3, '三'), (4, '四'))])
put('fuse', [(CLONK + '/FuseShort.ogg', 'OpenClonk Fuse (CC0)')], tailpad=0.05)
put('tiger', [(d('b16', 'r%d' % k), '试听台 b16 虎啸%d：0 A.D. 狮吼 (CC BY-SA 3.0) + 山岭回声' % k) for k in (1, 2, 4, 5)])
put('tigeratk', [(d('b16', 'r6'), '试听台 b16 虎啸 6（进攻）：0 A.D. 狮吼 (CC BY-SA 3.0) + CC0 兽吼 + 山岭回声')])
put('paws', [(d('b16', 'tiger_paws'), '试听台 b16 虎的脚步（放慢）')])
put('troop', [(d('b15', 'troop_dirt_dry'), '试听台 b15 一队人行军（原声）：0 A.D. 脚步 (CC BY-SA 3.0)')])
put('trooprun', [(d('b16', 'inf_run_a'), '试听台 b16 冲锋：6 个人跑步的原声，0 A.D. 脚步 (CC BY-SA 3.0)')])
for k in (1, 2, 3): put('foot%d' % k, [(d('b16', 'inf_x%d' % k), '试听台 b16 %d 个人的脚步：0 A.D. 脚步 (CC BY-SA 3.0)' % k)])
drop('foot')   # 单人脚步的原始素材：成品（foot1/2/3、troop）已经收进来，不再单独带
json.dump(man, open(D + '/manifest.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print({k: [(x['f'], x['dur']) for x in man[k]] for k in ('bigcannon', 'cannon1', 'blast', 'fuse', 'tiger', 'tigeratk', 'paws', 'troop', 'trooprun', 'foot1', 'foot2', 'foot3')})
