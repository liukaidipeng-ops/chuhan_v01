"""重做界面大字用的字体子集（思源宋体 Black），构建时 build.js 从 fonts/songhei-subset.woff2 读进 template.html 的 /*EBFONT*/。
用法：python3 tools/songhei.py <noto-serif-sc-chinese-simplified-900-normal.woff2>
（那个文件来自 npm 包 @fontsource/noto-serif-sc 的 files/ 目录；需要 pip install fonttools brotli）
字表 = template.html、src/*.js、台词表（voice/lines.json、voice/real/real.json）里出现过的全部汉字，写到 fonts/songhei-chars.txt。"""
import sys, os, re, glob, base64, subprocess
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cs = set()
for f in [D + '/src/template.html', D + '/voice/lines.json', D + '/voice/real/real.json'] + glob.glob(D + '/src/*.js'):   # 台词表也算上（TD 10-05 加）：主帅的话是从台词表里取出来显示在气泡里的
    s = open(f, encoding='utf-8', errors='ignore').read()
    cs |= {c for c in s if '一' <= c <= '鿿'}
# 数字、字母、标点也收进来（TD 10-06 加）：原来字表只有汉字，“第 30 回合”“鸿门宴·20”里的数字和标点退回各家系统自己的字体，同一行里粗细、字形都对不上
cs |= {chr(c) for c in range(0x20, 0x7f)} | set('·—…‘’“”、。「」『』（）《》〈〉！，：；？％＋－／～▸▶×°')
open(D + '/fonts/songhei-chars.txt', 'w', encoding='utf-8').write(''.join(sorted(cs)) + '\n')
out = D + '/fonts/songhei-subset.woff2'
subprocess.check_call(['pyftsubset', sys.argv[1], '--text-file=' + D + '/fonts/songhei-chars.txt', '--flavor=woff2', '--output-file=' + out, '--no-hinting', '--desubroutinize'])
print(len(cs), '字', os.path.getsize(out), '字节')
