// ===== 观战席：观众以士兵形象站在楚河木桥上，可站队、喊话、大笑 =====
const Spect = (() => {
  const { scene, onFrame, camera } = Core;
  const V3 = THREE.Vector3;
  const SC = 0.26, MAX = 8;
  const NAMES = ['樵夫', '渔父', '书生', '游侠', '老卒', '说客', '屠户', '酒保', '更夫', '货郎', '山人', '剑客', '马夫', '琴师', '铁匠', '药童'];
  const SIDE_CN = { n: '中立', r: '汉', b: '楚' };
  // 三队士兵：中立（本色布衣、刀盾）、汉、楚（持矛）
  const troops = {
    n: new Models.Troop('n', 'sword', MAX, SC),
    r: new Models.Troop('r', 'spear', MAX, SC),
    b: new Models.Troop('b', 'spear', MAX, SC),
  };
  for (const k in troops) { const t = troops[k]; t.units.forEach(u => { u.vis = 0; u.pose = 'idle'; }); scene.add(t.group); }
  // 位置：每座桥上 2×2，中立站桥中间，站汉者站桥的汉岸一端，站楚者站楚岸一端
  function slotPos(a, i) {
    const bx = Board.BRIDGE_X, bridge = i % 2 ? -1 : 1, k = Math.floor(i / 2);
    const ox = (k % 2 ? -1 : 1) * 0.32, row = Math.floor(k / 2);
    const z = a === 'n' ? (row ? -0.2 : 0.2) : (a === 'r' ? 1 : -1) * (row ? 0.92 : 0.6);
    const x = bridge * bx + ox;
    const y = 0.16 + 0.1 * Math.cos(Math.min(1.2, Math.abs(z)) / 1.2 * Math.PI / 2) + 0.02;
    return new V3(x, y, z);
  }
  const people = new Map(); // id -> { id, name, a, self, unit, troop, slot, el, bb, bbT }
  const layer = document.createElement('div');
  layer.id = 'specTags';
  document.getElementById('hud').appendChild(layer);
  function tagEl(p) {
    const el = document.createElement('div'); el.className = 'stag' + (p.self ? ' me' : '');
    el.innerHTML = '<div class="bb"></div><div class="nm"></div>';
    layer.appendChild(el);
    return el;
  }
  function paintTag(p) {
    p.el.querySelector('.nm').textContent = (p.self ? '你 · ' : '') + p.name;
    p.el.classList.remove('r', 'b', 'n'); p.el.classList.add(p.a);
  }
  function place(p) {
    // 释放旧位置
    if (p.troop) { const u = p.troop.units[p.unit]; u.vis = 0; u.taken = false; }
    const tr = troops[p.a];
    let i = tr.units.findIndex(u => !u.taken);
    if (i < 0) i = 0;
    const u = tr.units[i];
    u.taken = true; u.pose = 'idle'; u.act = null;
    const pos = slotPos(p.a, i);
    u.p.copy(pos);
    u.yaw = Math.atan2(-pos.x, -pos.z * 0.6);
    p.troop = tr; p.unit = i;
    // 墨晕出场
    u.vis = 0.01;
    Core.tween(0.45, k => { u.vis = Math.max(0.01, k); }, Core.ease.outBack);
    if (Fx.P) Fx.P.ink(pos.clone().add(new V3(0, 0.05, 0)), 6, 0.3, 0.2, 0.5);
  }
  function upsert(id, name, a, self) {
    a = a === 'r' || a === 'b' ? a : 'n';
    name = String(name || '').replace(/[<>]/g, '').slice(0, 8) || '看客';
    let p = people.get(id);
    if (!p) {
      if (people.size >= MAX && !self) return null;
      p = { id, name, a, self: !!self, seen: Date.now() };
      p.el = tagEl(p);
      people.set(id, p);
      place(p); paintTag(p);
      return p;
    }
    p.seen = Date.now();
    if (p.name !== name) { p.name = name; paintTag(p); }
    if (p.a !== a) { p.a = a; place(p); paintTag(p); }
    return p;
  }
  function remove(id) {
    const p = people.get(id); if (!p) return;
    const u = p.troop.units[p.unit];
    Core.tween(0.35, k => { u.vis = Math.max(0, 1 - k); }).then(() => { u.vis = 0; u.taken = false; });
    p.el.remove(); people.delete(id);
  }
  function clear() { for (const id of [...people.keys()]) remove(id); }
  function unitOf(p) { return p.troop.units[p.unit]; }
  function bubble(p, text, ms = 4200) {
    const bb = p.el.querySelector('.bb');
    bb.textContent = text;
    p.el.classList.add('talk');
    clearTimeout(p.bbT); p.bbT = setTimeout(() => p.el.classList.remove('talk'), ms);
  }
  function say(id, text) {
    const p = people.get(id); if (!p) return;
    bubble(p, text);
    const u = unitOf(p); u.pose = 'wave';
    clearTimeout(p.pT); p.pT = setTimeout(() => { if (u.pose === 'wave') u.pose = 'idle'; }, 1800);
  }
  function laugh(id) {
    const p = people.get(id); if (!p) return;
    bubble(p, '哈哈哈哈哈！', 3000);
    const u = unitOf(p); u.pose = 'laugh';
    clearTimeout(p.pT); p.pT = setTimeout(() => { if (u.pose === 'laugh') u.pose = 'idle'; }, 2800);
  }
  // 吃子时，站这一方的观众跟着欢呼（中立的看客也起哄）
  function react(side) {
    for (const p of people.values()) {
      if (p.a !== side && p.a !== 'n') continue;
      const u = unitOf(p); if (u.pose !== 'idle') continue;
      setTimeout(() => { u.pose = 'wave'; setTimeout(() => { if (u.pose === 'wave') u.pose = 'idle'; }, 1600); }, Math.random() * 400);
    }
  }
  // 头顶名牌：每帧投影到屏幕；不在屏幕内时，说话的气泡贴到屏幕边缘
  const v = new V3();
  onFrame(dt => {
    for (const t of Object.values(troops)) t.update(dt);
    if (!people.size) return;
    const W = innerWidth, H = innerHeight;
    const vis = [];
    for (const p of people.values()) {
      const u = unitOf(p);
      v.set(u.p.x, u.p.y + 0.6, u.p.z).project(camera);
      let x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const behind = v.z > 1;
      const off = behind || x < 0 || x > W || y < 0 || y > H;
      const talk = p.el.classList.contains('talk');
      if (off && !talk) { p.el.style.display = 'none'; continue; }
      p.el.style.display = '';
      if (behind) { x = W - x; y = H * 0.4; }
      const m = 70;
      const cx = Math.max(m, Math.min(W - m, x)), cy = Math.max(110, Math.min(H - 150, y));
      p.el.classList.toggle('edge', off);
      vis.push({ p, x: cx, y: cy });
    }
    // 名牌互相避让：靠得太近的往上错开
    vis.sort((a, b) => b.y - a.y);
    for (let i = 0; i < vis.length; i++) for (let j = 0; j < i; j++) {
      const a = vis[j], b = vis[i];
      if (Math.abs(a.x - b.x) < 76 && Math.abs(a.y - b.y) < 22) b.y = a.y - 22;
    }
    for (const t of vis) t.p.el.style.transform = `translate(${t.x.toFixed(1)}px,${t.y.toFixed(1)}px)`;
  });
  const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)];
  return {
    upsert, remove, clear, say, laugh, react, randomName, MAX, SIDE_CN,
    get count() { return people.size; }, get people() { return people; },
    has: id => people.has(id), get: id => people.get(id),
  };
})();
