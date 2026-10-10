#!/bin/bash
# TD 部署：在 dev 的工作副本（仓库根目录）里跑。先把要上线的分支合进 dev，再跑这个。
#   bash source/tools/td/deploy.sh "这次上线了什么（一句话）"
# 做的事：打包 → 把 7 个文件拷到仓库根目录 → 提交 → 推 dev → 快进推到 main（GitHub Pages 从 main 发布）
set -e
MSG="$1"; [ -n "$MSG" ] || { echo '要写一句这次上线了什么'; exit 1; }
cd "$(git rev-parse --show-toplevel)"
[ "$(git rev-parse --abbrev-ref HEAD)" = dev ] || { echo '先切到 dev'; exit 1; }
grep -rln '^<<<<<<<' source/src source/docs 2>/dev/null && { echo '有没解决的合并冲突标记'; exit 1; }
(cd source && node build.js | tail -2)
for f in index.html version.json music-war.mp3 voice-real.bin voice-orig.bin voice-bf.bin sfx.bin; do cp "source/dist/site/$f" "./$f"; done
git add index.html version.json music-war.mp3 voice-real.bin voice-orig.bin voice-bf.bin sfx.bin
# 符号链接（比如 source/node_modules 指到别处）进了仓库，Pages 打包会失败（10-10 踩过）
if git ls-files -s | awk '$1=="120000"' | grep -q .; then echo '仓库里有符号链接：'; git ls-files -s | awk '$1=="120000"'; exit 1; fi
V=$(python3 -c "import json;print(json.load(open('version.json'))['v'])")
git commit -qm "部署 $V：$MSG

${COAUTHOR:-}"
git push -q origin dev && git push -q origin dev:main
echo "已推送 $V；一两分钟后看：gh api 'repos/liukaidipeng-ops/chuhan_v01/actions/runs?per_page=2' --jq '.workflow_runs[] | [.name,.head_sha[0:7],.status,.conclusion] | @tsv'"
