import json, sys, collections
d = json.load(open(sys.argv[1])); g = collections.OrderedDict()
for r in d: g.setdefault(r['tag'], []).append(r)
print('场景 秒数 rAF/秒 重画/秒 绘制次数/帧 三角形万/帧 主线程%/秒 脚本%/秒 长任务数 最长ms 堆MB')
for k, rs in g.items():
    n = len(rs); dr = sum(r['draws'] for r in rs)
    lt = [x for r in rs for x in r['lt']]
    print(k, n, round(sum(r['raf'] for r in rs)/n), round(dr/n,1), round(sum(r['calls'] for r in rs)/max(dr,1)), round(sum(r['tris'] for r in rs)/max(dr,1)/1e4,1),
          round(sum(r['task'] for r in rs)/n*100), round(sum(r['script'] for r in rs)/n*100), len(lt), round(max(lt) if lt else 0), round(rs[-1]['heap'],1))
