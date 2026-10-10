# 粗宋字库补字（审批台 ad-012）
`songhei-subset.woff2`：在 dev 的字库基础上补了 17 个思源宋体简体子集里没有的字（俥傌歿騅檥 取自 Noto Serif TC 900，其余 12 个取自 Noto Serif SC 900 的分片）。
做法：@fontsource/noto-serif-sc 与 noto-serif-tc 5.3.0 的 900 字重，各自 pyftsubset 后用 fontTools.merge 合并。tools/songhei.py 的改法待 ad-012 通过后写进交付单。
