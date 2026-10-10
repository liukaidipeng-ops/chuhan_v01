#!/bin/sh
# 只重拍给定的镜头，再拼片：sh rerender.sh W1 W5 ...
cd "$(dirname "$0")"; export PW_CHROME=${PW_CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
for s in "$@"; do echo "== $s $(date +%T)"; python3 film.py $s 24 1280 2>&1 | grep -v "^frame\|CORS\|ERR_FAILED" | tail -2; done
echo "== 拼片 $(date +%T)"; python3 assemble2.py 2>&1 | tail -2
