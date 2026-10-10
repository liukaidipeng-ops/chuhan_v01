"""重做界面大字用的字体子集（思源宋体 Black），构建时 build.js 从 fonts/songhei-subset.woff2 读进 template.html 的 /*EBFONT*/。
用法：python3 tools/songhei.py <@fontsource/noto-serif-sc 的 files 目录> [<@fontsource/noto-serif-tc 的 files 目录>]
（npm pack @fontsource/noto-serif-sc @fontsource/noto-serif-tc 解开即得；需要 pip install fonttools brotli）
字表 = template.html、src/*.js、台词表（voice/lines.json、voice/real/real.json）里出现过的全部汉字，写到 fonts/songhei-chars.txt。
简体主文件里没有的字（俥傌歿騅 这类繁体、台词里的生僻字）先去简体分片里找，再去繁体版里找，合并成一个文件（美术总监 10-10 加，审批台 ad-012）。"""
import sys, os, glob
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.merge import Merger
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cs = set()
for f in [D + '/src/template.html', D + '/voice/lines.json', D + '/voice/real/real.json'] + glob.glob(D + '/src/*.js'):   # 台词表也算上（TD 10-05 加）：主帅的话是从台词表里取出来显示在气泡里的
    s = open(f, encoding='utf-8', errors='ignore').read()
    cs |= {c for c in s if '一' <= c <= '鿿'}
# 额外字表（美术总监 10-10 加，CG 组要的）：不在源码、台词表里但要用粗宋显示的字（比如过场片名「汉五年 · 冬」），写进 fonts/songhei-extra.txt
if os.path.exists(D + '/fonts/songhei-extra.txt'): cs |= {c for c in open(D + '/fonts/songhei-extra.txt', encoding='utf-8').read() if '一' <= c <= '鿿'}
# 数字、字母、标点也收进来（TD 10-06 加）：原来字表只有汉字，“第 30 回合”“鸿门宴·20”里的数字和标点退回各家系统自己的字体，同一行里粗细、字形都对不上
cs |= {chr(c) for c in range(0x20, 0x7f)} | set('·—…‘’“”、。「」『』（）《》〈〉！，：；？％＋－／～▸▶×°')
open(D + '/fonts/songhei-chars.txt', 'w', encoding='utf-8').write(''.join(sorted(cs)) + '\n')
tmp = D + '/fonts/.songhei-tmp'; os.makedirs(tmp, exist_ok=True)
def cut(path, text, name):
    f = TTFont(path); o = subset.Options(); o.desubroutinize = True; o.hinting = False
    s = subset.Subsetter(o); s.populate(text=text); s.subset(f); f.flavor = None
    out = f'{tmp}/{name}.otf'; f.save(out); return out
sc = sys.argv[1]; tc = sys.argv[2] if len(sys.argv) > 2 else None
base = sc + '/noto-serif-sc-chinese-simplified-900-normal.woff2'
parts = [cut(base, ''.join(cs), 'base')]
left = {c for c in cs if '一' <= c <= '鿿'} - {chr(u) for u in TTFont(base).getBestCmap()}
for d, pre in [(sc, 'noto-serif-sc'), (tc, 'noto-serif-tc')]:
    if not d or not left: continue
    for p in sorted(glob.glob(f'{d}/{pre}-[0-9]*-900-normal.woff2')):
        got = left & {chr(u) for u in TTFont(p).getBestCmap()}
        if got: parts.append(cut(p, ''.join(got), os.path.basename(p)[:-6])); left -= got
out = D + '/fonts/songhei-subset.woff2'
m = Merger().merge(parts); m.flavor = 'woff2'; m.save(out)
for p in parts: os.remove(p)
os.rmdir(tmp)
print(len(cs), '字', os.path.getsize(out), '字节', ('；还缺：' + ''.join(sorted(left))) if left else '')
