"""重做界面大字用的字体子集（思源宋体 Black），并写回 template.html 里的 @font-face "EB"。
用法：python3 tools/songhei.py <noto-serif-sc-chinese-simplified-900-normal.woff2>
（那个文件来自 npm 包 @fontsource/noto-serif-sc 的 files/ 目录；需要 pip install fonttools brotli）
字表 = template.html 和 src/*.js 里出现过的全部汉字，写到 fonts/songhei-chars.txt。"""
import sys, os, re, glob, base64, subprocess
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cs = set()
for f in [D + '/src/template.html'] + glob.glob(D + '/src/*.js'):
    s = open(f, encoding='utf-8', errors='ignore').read()
    if f.endswith('template.html'): s = re.sub(r'url\(data:font/woff2;base64,[^)]*\)', '', s)
    cs |= {c for c in s if '一' <= c <= '鿿'}
open(D + '/fonts/songhei-chars.txt', 'w', encoding='utf-8').write(''.join(sorted(cs)) + '\n')
out = D + '/fonts/songhei-subset.woff2'
subprocess.check_call(['pyftsubset', sys.argv[1], '--text-file=' + D + '/fonts/songhei-chars.txt', '--flavor=woff2', '--output-file=' + out, '--no-hinting', '--desubroutinize'])
t = D + '/src/template.html'; s = open(t, encoding='utf-8').read()
pat = re.compile(r'(@font-face\{font-family:"EB";src:url\()data:font/woff2;base64,[^)]*(\))')
assert len(pat.findall(s)) == 1
s = pat.sub(lambda m: m.group(1) + 'data:font/woff2;base64,' + base64.b64encode(open(out, 'rb').read()).decode() + m.group(2), s)
open(t, 'w', encoding='utf-8').write(s)
print(len(cs), '字', os.path.getsize(out), '字节')
