"""行书字体子集：把 fonts/xk-chars.txt 里的字从 ZhiMangXing 里抽出来，生成 fonts/xingkai-subset.woff2（build.js 内嵌）"""
import subprocess, pathlib, sys
D = pathlib.Path(__file__).resolve().parent.parent / 'fonts'
chars = ''.join(sorted(set(c for c in (D / 'xk-chars.txt').read_text(encoding='utf8') if not c.isspace())))
from fontTools.ttLib import TTFont
cm = TTFont(str(D / 'ZhiMangXing-Regular.ttf')).getBestCmap()
miss = [c for c in chars if ord(c) not in cm]
if miss: print('字体里没有这些字（会退回楷体）：', ''.join(miss))
subprocess.run([sys.executable, '-m', 'fontTools.subset', str(D / 'ZhiMangXing-Regular.ttf'), '--text=' + chars, '--flavor=woff2', '--output-file=' + str(D / 'xingkai-subset.woff2'), '--no-hinting', '--desubroutinize'], check=True)
print(len(chars), '字 →', (D / 'xingkai-subset.woff2').stat().st_size, 'bytes')
