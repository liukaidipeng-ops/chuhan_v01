# 粗宋字库重做（审批台 ad-012）
- 线上 `fonts/songhei-subset.woff2` 是 10-09（f2bc54f）生成的，之后源码、台词新加的文字里有 205 个字不在字库里（喜、怒、悲、秦、阳、魏……），这些字现在退回系统字体，粗细字形对不上。
- 另有 17 个字简体主文件里本来就没有（俥傌歿騅檥 等）。
- 本目录 `songhei-subset.woff2` 用新的 `tools/songhei.py`（同目录上一级 `tools/songhei.py`）按 dev 54ba8bc 的源码重做：2043 字，358,816 字节（原 321,412）。只缺「鄛」一字（只在一句台词里，思源宋体简繁都没有，退回系统字体）。
- 字源：@fontsource/noto-serif-sc 与 noto-serif-tc 5.3.0 的 900 字重。
