cd "$(dirname "$0")"
for s in F1 F2 F3 F4 F6; do python3 film.py $s 24 1280 > log_$s.txt 2>&1; done
echo done > log_all.txt
