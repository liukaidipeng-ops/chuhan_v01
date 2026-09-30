"""局面动画联系表：python3 tools/scene.py name "pieces" "from-to" [n] [dt] [d0] [level]
pieces 例: "rk40 bk39 rp45 br46"（方 子 f r），move 例: "45-46"。环境变量 W H Q GORE"""
import sys, os, subprocess
name, pcs, mv = sys.argv[1], sys.argv[2], sys.argv[3]
n = sys.argv[4] if len(sys.argv) > 4 else '12'
dt = sys.argv[5] if len(sys.argv) > 5 else '0.6'
d0 = sys.argv[6] if len(sys.argv) > 6 else '0.3'
level = sys.argv[7] if len(sys.argv) > 7 else 'cine'
gore = os.environ.get('GORE', '3')
puts = ';'.join(f"put({p[2]},{p[3]},'{p[0]}','{p[1]}')" for p in pcs.split())
a, b = mv.split('-')
js = f"""(()=>{{const x=window.__xq,g=x.game;const bd=[];for(let r=0;r<10;r++)bd.push(new Array(9).fill(null));let id=100;
const put=(f,r,s,t)=>{{bd[r][f]={{s,t,id:id++}}}};{puts};
g.board=bd;g.turn='{'r' if pcs.split()[[q[2:] for q in pcs.split()].index(a)][0]=='r' else 'b'}';g.history=[];x.Board.setPosition(g);x.Board.faceViewer('r');
x.Fx.level='{level}';x.Fx.gore={gore};
setTimeout(()=>{{const r=x.doMove({{from:[{a[0]},{a[1]}],to:[{b[0]},{b[1]}]}});console.log('move',r)}},300);return 'ok'}})()"""
D = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', D + '/anim.py', name, js, n, dt, d0])
