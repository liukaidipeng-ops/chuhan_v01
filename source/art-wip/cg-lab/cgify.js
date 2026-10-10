// 过场 CG 的材质：把游戏里的卡通材质（toon 色阶 + 黑描边）换成按光照算的材质，人物和写实的雾、光放在一起不再像两部片子（cg-004）。
// 不改模型文件：CG.cgify(root) 在拍片前对整棵节点树做一遍。局内照旧用卡通，两边互不影响。
window.CG = (() => {
  const isOutline = m => m && m.isMeshBasicMaterial && m.side === THREE.BackSide && m.userData && m.userData.thick;
  const memo = new Map();
  // 金、铜一类（偏黄、饱和）当金属；其余按布、皮、毛算粗糙
  function metalish(c) { const h = {}; c.getHSL(h); return h.h > 0.08 && h.h < 0.16 && h.s > 0.35 && h.l > 0.3 && h.l < 0.72; }   // 太亮的（白袜、米色）不算金属
  function conv(m, o) {
    if (!m || memo.has(m)) return memo.get(m) || m;
    let n = m;
    if (m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || (m.isMeshStandardMaterial && o.force)) {
      const c = m.color ? m.color.clone() : new THREE.Color(1, 1, 1), met = !m.map && !m.vertexColors && metalish(c);
      n = new THREE.MeshStandardMaterial({ color: c, map: m.map || null, vertexColors: !!m.vertexColors, side: m.side, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest || 0, depthWrite: m.depthWrite,
        roughness: met ? 0.38 : (o.rough ?? 0.78), metalness: met ? 0.65 : 0, envMapIntensity: 1 });
      if (m.emissive) n.emissive = m.emissive.clone(); if (m.emissiveMap) n.emissiveMap = m.emissiveMap;
      n.name = (m.name || '') + ':cg'; n.userData = Object.assign({}, m.userData);
    }
    memo.set(m, n); return n;
  }
  function cgify(root, o = {}) {
    const kill = [];
    root.traverse(x => {
      if (!x.isMesh) return;
      if (Array.isArray(x.material) ? x.material.some(isOutline) : isOutline(x.material)) { kill.push(x); return; }
      x.material = Array.isArray(x.material) ? x.material.map(m => conv(m, o)) : conv(x.material, o);
      x.castShadow = true; x.receiveShadow = true;
    });
    for (const k of kill) k.visible = false;   // 描边不删，只是不画（动画代码里可能还拿着它）
    return root;
  }
  // 风吹披风：在顶点着色器里按高度摆（越往下摆得越大），蒙皮之前做，跟着身子走。CG.wind(root, { k, dir }) 之后每帧 CG.tick(t)
  const U = { uT: { value: 0 } };
  function wind(root, o = {}) {
    const k = o.k ?? 1, dir = o.dir || [0.3, 0, -1];
    root.traverse(x => { if (!x.isMesh || !x.material || !x.material.userData || !x.material.userData.cape || x.material.userData.windOn) return;
      const m = x.material; m.userData.windOn = true;
      m.onBeforeCompile = sh => { sh.uniforms.uT = U.uT;
        sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          { float h = clamp((1.45 - position.y) / 1.4, 0.0, 1.0), a = h * h * ${(0.13 * k).toFixed(3)};
            float w = sin(uT * 2.3 + position.y * 5.0 + position.x * 7.0) + 0.55 * sin(uT * 4.1 + position.y * 11.0 - position.x * 5.0) + 0.3 * sin(uT * 7.3 + position.x * 17.0);
            transformed += vec3(${dir[0].toFixed(2)}, 0.0, ${dir[2].toFixed(2)}) * a * (0.9 + 0.45 * w) + vec3(0.0, a * 0.25 * w, 0.0);
            transformed.z -= (0.5 + 0.5 * sin(position.x * 46.0 + h * 3.0 + 0.4 * sin(uT * 1.7 + position.x * 9.0))) * (0.006 + 0.022 * h); }`); };   // 竖褶：越往下越深
      m.needsUpdate = true; });
    return root;
  }
  const tick = t => { U.uT.value = t; };
  return { cgify, wind, tick };
})();
