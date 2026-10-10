import sys, time, os, json
EH = os.path.dirname(os.path.abspath(__file__))
src = open(EH + '/el.py').read().split("plans = sys.argv")[0]
exec(src)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = start(b, 'wide')
    pg.add_script_tag(content=open(os.environ.get('SRCF', EH + '/../../src/elephantlv.js'), encoding='utf-8').read())
    print(pg.evaluate("""()=>{const R=new THREE.WebGLRenderer({canvas:document.createElement('canvas')});R.setSize(64,64);R.shadowMap.enabled=true;
      return JSON.stringify([1,2,3,4].map(lv=>{const e=ElephantLV.make('b',{lv,plan:'b'});const S=new THREE.Scene();const L=new THREE.DirectionalLight(0xffffff,1);L.castShadow=true;S.add(L,e.group);
      const cam=new THREE.PerspectiveCamera(50,1,0.1,100);cam.position.set(8,6,8);cam.lookAt(0,2,0);R.info.autoReset=false;R.info.reset();R.render(S,cam);const calls=R.info.render.calls,tri=R.info.render.triangles;
      let vis=0,sh=0;e.group.traverseVisible(o=>{if(o.isMesh&&o.layers.test(cam.layers)){vis++;if(o.castShadow)sh++}});return {lv,calls,tri,vis,sh}}))}"""))
    b.close()
