# 量火象一到四级：面数、网格数、贴图数（含描边）
import sys, time, os, json
EH = os.path.dirname(os.path.abspath(__file__))
src = open(EH + '/el.py').read().split("plans = sys.argv")[0]
exec(src)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide')
    pg.add_script_tag(content=open(EH + '/../../src/elephantlv.js', encoding='utf-8').read())
    print(pg.evaluate("""()=>JSON.stringify([1,2,3,4].map(lv=>{const t0=performance.now();const e=ElephantLV.make('b',{lv,plan:'b'});const ms=performance.now()-t0;let tri=0,mesh=0;const tex=new Set();
      e.group.traverse(o=>{if(o.isMesh){mesh++;const g=o.geometry;tri+=(g.index?g.index.count:g.attributes.position.count)/3;const ms=[].concat(o.material);for(const m of ms)if(m&&m.map)tex.add(m.map.uuid)}});
      return {lv,topY:+e.topY.toFixed(2),lvScale:e.lvScale,top:+(e.topY*e.lvScale).toFixed(2)}}))"""))
    b.close()
