#!/bin/sh
# 乌江 v2 逐镜渲染（cg-008）：一次一个镜头，跑完拼片。用法：nohup sh render_v2.sh > render_v2.log 2>&1 &
cd "$(dirname "$0")"
export PW_CHROME=${PW_CHROME:-/opt/pw-browsers/chromium-1194/chrome-linux/chrome}
for s in W1 W2 W3 W4 W5 W6 W7 W8 W9 W10 W11 W12a W12b W12c W12d W12e W13; do
  n=$(ls frames/$s 2>/dev/null | wc -l)
  echo "== $s (已有 $n 帧) $(date +%T)"
  python3 film.py $s 24 1280 2>&1 | grep -v "^frame\|CORS\|ERR_FAILED" | tail -3
done
echo "== 拼片 $(date +%T)"
python3 assemble2.py 2>&1 | tail -3
