#!/bin/bash
# 一次只考一个电脑（机器忙）；校尉档 6 万节点 3 次；--verbose 顺便记下前几名的分差
SP=/tmp/claude-0/-home-user-chuhan-v01/3feb1416-b151-5e3e-8678-5fbc17175485/scratchpad
cd /home/user/chuhan_v01/source
for f in fable/bfai_b18c278.js fable/bfai_25eb911.js bfai_9ff.js bfai_bee5741.js; do
  n=$(basename $f .js)
  echo "== $n start $(date +%T)" >> $SP/fable/exam_chain.log
  nice -n 4 node tools/bfai_exam.js $SP/$f --level mid --runs 3 --nodes mid=60000,hard=200000 --verbose > $SP/fable/exam_mid_$n.txt 2>&1
  echo "== $n done $(date +%T) rc=$?" >> $SP/fable/exam_chain.log
done
# 省节点档：1.5 万节点，看区分度随搜索量的变化
for f in fable/bfai_b18c278.js fable/bfai_25eb911.js bfai_9ff.js bfai_bee5741.js; do
  n=$(basename $f .js)
  echo "== $n lownodes start $(date +%T)" >> $SP/fable/exam_chain.log
  nice -n 4 node tools/bfai_exam.js $SP/$f --level mid --runs 3 --nodes mid=15000,hard=200000 --verbose > $SP/fable/exam_low_$n.txt 2>&1
  echo "== $n lownodes done $(date +%T) rc=$?" >> $SP/fable/exam_chain.log
done
echo "ALL DONE $(date +%T)" >> $SP/fable/exam_chain.log
