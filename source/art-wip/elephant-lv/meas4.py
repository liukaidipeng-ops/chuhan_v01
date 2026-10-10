import sys, time, os, json
EH = os.path.dirname(os.path.abspath(__file__))
src = open(EH + '/el.py').read().split("plans = sys.argv")[0]
exec(src)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide')
    pg.add_script_tag(content=open(os.environ.get('SRCF', EH + '/../../src/elephantlv.js'), encoding='utf-8').read())
    print(pg.evaluate("""()=>{const R=new THREE.WebGLRenderer({canvas:document.createElement('canvas')});R.setSize(64,64);R.shadowMap.enabled=true;
      return JSON.stringify([4].map(lv=>{const e=ElephantLV.make('b',{lv,plan:'b'});const S=new THREE.Scene();const L=new THREE.DirectionalLight(0xffffff,1);L.castShadow=true;S.add(L,e.group);
      const cam=new THREE.PerspectiveCamera(50,1,0.1,100);cam.position.set(8,6,8);cam.lookAt(0,2,0);R.info.autoReset=false;R.info.reset();R.render(S,cam);const calls=R.info.render.calls,tri=R.info.render.triangles;
      let vis=0,sh=0;e.group.traverseVisible(o=>{if(o.isMesh&&o.layers.test(cam.layers)){vis++;if(o.castShadow)sh++}});const L2={};e.group.traverseVisible(o=>{if(o.isMesh&&o.layers.test(cam.layers)){const m=o.material;const k=(o.isSkinnedMesh?"SK ":"")+m.type+(m.map?" map":"")+(m.transparent?" tr":"")+(m.side===2?" ds":m.side===1?" bs":"")+(m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile?" obc":"")+(m.emissive&&m.emissive.getHex()?" em":"")+(o.parent===e.banner.group||e.banner.group.getObjectById(o.id)?" BANNER":"");L2[k]=(L2[k]||0)+1}});return {lv,calls,L2}}))}"""))
    b.close()
