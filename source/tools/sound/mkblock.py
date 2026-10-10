# 盾挡声候选（试听台第三十二批 b35）：Kenney impact sounds（CC0）叠层。用法：python3 mkblock.py <工作目录>，素材放 <工作目录>/raw/，下载地址见 sfx/fetch.py 的 LAV + kenney_impactsounds
import subprocess, sys, os
S=sys.argv[1]; R=S+'/raw/'; O=S+'/block/'
def hit(name, layers, dur=0.32):
    # layers: (file, filters, delay_ms, gain_db)
    ins=[]; fl=[]; 
    for i,(f,flt,d,g) in enumerate(layers):
        ins+=['-i',R+f+'.ogg']
        fl.append(f'[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,silenceremove=start_periods=1:start_threshold=-45dB,{flt},volume={g}dB,adelay={d}[l{i}]')
    n=len(layers)
    fl.append(''.join(f'[l{i}]' for i in range(n))+f'amix=inputs={n}:normalize=0,atrim=0:{dur},afade=t=out:st={dur-0.08}:d=0.08,alimiter=limit=0.9[o]')
    out=O+name+'.wav'
    subprocess.run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',';'.join(fl),'-map','[o]',out],check=True); return out
def seq(name, hits, gap=0.55):
    # 三下连放，听随机感
    ins=[]; fl=[]
    for i,h in enumerate(hits): ins+=['-i',h]; fl.append(f'[{i}:a]apad=whole_dur={gap}[s{i}]')
    fl.append(''.join(f'[s{i}]' for i in range(len(hits)))+f'concat=n={len(hits)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=7[o]')
    subprocess.run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',';'.join(fl),'-map','[o]','-ar','22050','-ac','1','-b:a','64k',O+name+'.mp3'],check=True)
LP='lowpass=f=2200'; HP='highpass=f=2500'
v={}
# 甲：木盾闷咚 + 轻锵（铜钉）
v['a']=[hit(f'a{k}',[(f'impactWood_heavy_00{k}',LP+',bass=g=4:f=120',0,2),(f'impactMetal_light_00{k}',HP+',atrim=0:0.12',10,-9)]) for k in (0,1,2)]
# 乙：蒙皮鼓感更重（皮面 + 木）+ 锡片轻锵
v['b']=[hit(f'b{k}',[(f'impactPunch_heavy_00{k}','lowpass=f=1800',0,0),(f'impactWood_medium_00{k}',LP,5,-3),(f'impactMetal_light_00{k+2}',HP+',atrim=0:0.1',12,-6)]) for k in (0,1,2)]
# 丙：锵更亮（板 + 铜钉明显），仍短
v['c']=[hit(f'c{k}',[(f'impactPlank_medium_00{k}',LP+',bass=g=3:f=150',0,1),(f'impactPlate_light_00{k}','highpass=f=1800,atrim=0:0.15',6,-5)],dur=0.28) for k in (0,1,2)]
# 丁：最闷最沉（重木 + 软击 + 极轻金属）
v['d']=[hit(f'd{k}',[(f'impactWood_heavy_00{k}','lowpass=f=1500,bass=g=6:f=100',0,1),(f'impactSoft_heavy_00{k}','lowpass=f=1200',0,-2),(f'impactPlate_medium_00{k}',HP+',atrim=0:0.1',8,-9)],dur=0.3) for k in (0,1,2)]
for k,h in v.items(): seq('block_'+k,h)
