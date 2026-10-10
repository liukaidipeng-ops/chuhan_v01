until grep -q ZDONE ../duel-zm/vid.log 2>/dev/null; do sleep 5; done
for sd in 3 11 29; do Q="?kill=1&seed=$sd" SHEET=80,160,4 python3 vid.py 3v3 5.4 > /dev/null 2>&1; mv v_3v3.mp4 kill_3v3_s$sd.mp4; mv sheet_3v3.jpg ksheet_3v3_s$sd.jpg; echo 3v3 $sd; done; echo K3DONE
