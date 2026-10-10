#!/bin/bash
# 把逐帧图拼成循环播放的小视频：前后各停一会儿，24 帧/秒
cd "$(dirname "$0")"
for k in melt flip shell beam; do
  n=$(ls frames/${k}2_a_*.png 2>/dev/null | wc -l); [ "$n" -lt 2 ] && continue
  rm -rf tmp_$k && mkdir tmp_$k; i=0
  for r in 1 2 3 4 5 6 7 8 9 10 11 12; do cp frames/${k}2_a_000.png tmp_$k/$(printf %04d $i).png; i=$((i+1)); done
  for f in frames/${k}2_a_*.png; do cp "$f" tmp_$k/$(printf %04d $i).png; i=$((i+1)); done
  last=$(ls frames/${k}2_a_*.png | tail -1)
  for r in $(seq 1 24); do cp "$last" tmp_$k/$(printf %04d $i).png; i=$((i+1)); done
  ffmpeg -loglevel error -y -framerate 20 -i tmp_$k/%04d.png -vf "scale=640:-2" -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart page/$k.mp4
  cp frames/${k}2_a_$(printf %03d $((n/2))).png page/${k}_poster.png
  rm -rf tmp_$k
done
ls -la page
