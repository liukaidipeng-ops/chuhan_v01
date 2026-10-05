"""行书字体子集：从 ZhiMangXing 里抽出要用行书显示的字，生成 fonts/xingkai-subset.woff2（build.js 内嵌）。
用行书的地方：晋升题签（称号、名将名）、屏幕正中的大字横幅（兵法名、技能名、杀法名）、最后十秒的大字、兵法遮幕。
字表 = fonts/xk-chars.txt（手写的那一份）+ 下面几个脚本里所有字符串常量里的汉字（称号、名将、技能名都在这里面）。
  以前只靠手写的字表，加了新称号（驭虎长史、持节护军……）忘了补，题签里就一半行书、一半系统字体。
用法：python3 tools/mkfont.py，然后 node build.js"""
import subprocess, pathlib, sys, re
D = pathlib.Path(__file__).resolve().parent.parent
F = D / 'fonts'
han = lambda s: {c for c in s if '一' <= c <= '鿿'}
def strings(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return ''.join(re.findall(r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`(?:[^`\\]|\\.)*`", src))
cs = han((F / 'xk-chars.txt').read_text(encoding='utf8'))
for f in ('bingfa', 'bfx', 'rules', 'fx', 'squads', 'jieqi'):
    p = D / 'src' / (f + '.js')
    if p.exists(): cs |= han(strings(p.read_text(encoding='utf8')))
# main.js 太大（提示、说明一大堆），只取送进横幅的那些字
cs |= han(''.join(re.findall(r"banner\(\s*(['`\"][^'`\"]*['`\"])", (D / 'src/main.js').read_text(encoding='utf8'))))
chars = ''.join(sorted(cs))
from fontTools.ttLib import TTFont
cm = TTFont(str(F / 'ZhiMangXing-Regular.ttf')).getBestCmap()
miss = [c for c in chars if ord(c) not in cm]
if miss: print('字体里没有这些字（会退回系统字体）：', ''.join(miss))
subprocess.run([sys.executable, '-m', 'fontTools.subset', str(F / 'ZhiMangXing-Regular.ttf'), '--text=' + chars, '--flavor=woff2', '--output-file=' + str(F / 'xingkai-subset.woff2'), '--no-hinting', '--desubroutinize'], check=True)
print(len(chars), '字 →', (F / 'xingkai-subset.woff2').stat().st_size, 'bytes')
