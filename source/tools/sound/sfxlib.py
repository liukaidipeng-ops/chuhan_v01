"""音效后期：马蹄叠层、台词 + 马蹄 + 马嘶的拼法、巨炮（试听台和最终成品共用）"""
import vproc as V, numpy as np, subprocess, tempfile
SR=V.SR; E='/tmp/ele/'
def L(p, tailpad=0.2, db=-45): return V.norm(V.trim(V.load(p),lead=0.02,tailpad=tailpad,db=db),0.9)
def ff(x, af):
    with tempfile.TemporaryDirectory() as d:
        a,b=d+'/a.wav',d+'/b.wav'; V.save(x,a); subprocess.run(['ffmpeg','-v','error','-y','-i',a,'-af',af,b],check=True); return V.load(b)
def rate(x, r): return ff(x,'asetrate=%d,aresample=%d'%(int(SR*r),SR))
def mix(items):
    n=max(int(max(0,t)*SR)+len(x) for x,t,g in items); y=np.zeros(n)
    for x,t,g in items: i=int(max(0,t)*SR); y[i:i+len(x)]+=x*10**(g/20)
    return y
def fade(x, a=0.0, b=0.0):
    x=x.copy()
    if a: n=int(a*SR); x[:n]*=np.linspace(0,1,n)
    if b: n=int(b*SR); x[-n:]*=np.linspace(1,0,n)
    return x
# 马蹄“踏在土上”：削掉脆的高频、垫厚低频，再加一层野外行军的回响
EARTH={'a':('highshelf=g=-8:f=2200,bass=g=5:f=120:w=0.7,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=90:makeup=2',0.16,0.8),
       'b':('lowpass=f=1800,highshelf=g=-10:f=1500,bass=g=8:f=100:w=0.7,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=3',0.26,1.2)}
def earth(x, k='a'):
    af,wet,rt=EARTH[k]; return V.reverb(V.norm(ff(x,af),0.9),wet=wet,rt=rt,pre=0.02,seed=3)
_h={}
def hoof(k):
    if k not in _h: _h[k]=L(E+'oad/mstep%d.ogg'%k)
    return _h[k]
def layer(n, seed, kind='a'):
    """叠 n 层：每层换一段录音，明显错开（不踩在同一拍上）、快慢略有不同"""
    r=np.random.default_rng(seed); ks=list(r.permutation([113,114,115,111,112]))[:n]
    offs=[0,float(r.uniform(0.17,0.3)),float(r.uniform(0.38,0.55))]; rates=[1.0,float(r.uniform(0.9,0.95)),float(r.uniform(1.06,1.12))]; gains=[0,-2,-3.5]
    y=mix([(fade(hoof(k) if i==0 else rate(hoof(k),rates[i]),0.01,0.15),offs[i],gains[i]) for i,k in enumerate(ks)])
    return earth(y,kind) if kind else y
def seq_move(voice, hoofs, neigh, tight=0.45):
    """乙·衔接：马蹄压着台词尾音起，马嘶压在马蹄后三分之一"""
    lv=len(voice)/SR; lh=len(hoofs)/SR; th=max(0.2,lv-tight); tn=th+lh*0.62
    return mix([(voice,0,0),(fade(hoofs,0.2),th,-5),(neigh,tn,-3)])
def seq_attack(voice, war, neigh):
    """丙·紧凑：战争马蹄垫在台词下面一起跑，台词一完马嘶就起"""
    lv=len(voice)/SR; lh=len(war)/SR; h=fade(war,0.05,0.4); tn=max(lv+0.02,lh*0.5)
    return mix([(voice,0,0),(h,0.1,-9),(neigh,tn,-3)])
