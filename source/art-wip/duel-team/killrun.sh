for sc in 2v2:5.2 3v3:5.4; do n=${sc%%:*}; T=${sc##*:}; for sd in 3 11 29; do
  Q="?kill=1&seed=$sd" SHEET=45,120,5 python3 vid.py $n $T > /dev/null 2>&1; mv v_$n.mp4 kill_${n}_s$sd.mp4; mv sheet_$n.jpg ksheet_${n}_s$sd.jpg; echo $n $sd; done; done; echo KDONE
