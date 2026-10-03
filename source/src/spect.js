// ===== 观战席：观众以士兵形象出场（默认站在楚河木桥上），可站队、喊话、大笑；
//   还可以四处走动：点地面 / 棋盘就走过去。过楚河只能走桥，上棋盘要走两侧的小楼梯；
//   站在棋盘上的观众，棋手点一下就弹飞，之后 30 秒不能再上棋盘 =====
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
  // ---------- 走动：地形与寻路 ----------
  //   L = 0 地面（含木桥）、L = 1 棋盘面。地面：棋盘（连台基）占着的那一块、楚河都走不了，河上只有两座桥能过；
  //   棋盘面：汉、楚两半各是一块，中间隔着河；上下棋盘只能走四个小楼梯。
  const BX = Board.BX, BZ = Board.BZ, TOPY = Board.TOP, HALF = Board.HALF, BRX = Board.BRIDGE_X;
  const STAIR_Z = 2.21, SPEED = 1.3, BAN_MS = 30000;
  const bridgeY = (x, z) => { if (Math.abs(Math.abs(x) - BRX) > 0.72) return 0; const a = Math.abs(z); return a <= 1.2 ? 0.185 + 0.1 * Math.cos(a / 1.2 * Math.PI / 2) : a < 1.5 ? 0.185 * (1 - (a - 1.2) / 0.3) : 0; };
  const okGround = (x, z) => {
    if (Math.abs(x) > 11 || Math.abs(z) > 9.8) return false;
    if (Math.abs(z) < 1.05) return Math.abs(Math.abs(x) - BRX) <= 0.6;          // 河：只有桥上能走
    return !(Math.abs(x) < BX + 0.45 && Math.abs(z) < BZ + 0.45);                // 棋盘和台基挡着
  };
  const okTop = (x, z) => Math.abs(x) <= BX - 0.1 && Math.abs(z) >= HALF + 0.1 && Math.abs(z) <= BZ - 0.1;
  const yAt = n => (n.L ? TOPY : bridgeY(n.x, n.z));
  const NODES = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    NODES.push({ x: sx * (BX - 0.22), z: sz * STAIR_Z, L: 1, stair: sx + ',' + sz });   // 楼梯上口
    NODES.push({ x: sx * (BX + 0.9), z: sz * STAIR_Z, L: 0, stair: sx + ',' + sz });    // 楼梯下口
    NODES.push({ x: sx * BRX, z: sz * 1.6, L: 0 });                                     // 桥头
    NODES.push({ x: sx * (BX + 0.95), z: sz * (BZ + 0.95), L: 0 });                     // 棋盘后角（绕到另一侧要从后面走）
  }
  function edgeOk(a, b) {
    if (a.L !== b.L) return !!a.stair && a.stair === b.stair;
    if (a.L) return a.z * b.z > 0 && okTop(a.x, a.z) && okTop(b.x, b.z);
    const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.12));
    for (let i = 0; i <= n; i++) { const t = i / n; if (!okGround(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false; }
    return true;
  }
  // 把点到的位置收进能站的地方
  function clampTarget(t, from) {
    const o = { x: t.x, z: t.z, L: t.L ? 1 : 0 };
    if (o.L) {
      o.x = Math.max(-(BX - 0.15), Math.min(BX - 0.15, o.x));
      const s = o.z >= 0 ? 1 : -1; o.z = s * Math.max(HALF + 0.15, Math.min(BZ - 0.15, Math.abs(o.z)));
      return o;
    }
    o.x = Math.max(-10.8, Math.min(10.8, o.x)); o.z = Math.max(-9.6, Math.min(9.6, o.z));
    if (Math.abs(o.z) < 1.1 && Math.abs(Math.abs(o.x) - BRX) > 0.55) o.z = (Math.abs(o.z) > 0.02 ? Math.sign(o.z) : from && from.z < 0 ? -1 : 1) * 1.12;   // 点在河里：站到岸边
    if (Math.abs(o.x) < BX + 0.5 && Math.abs(o.z) < BZ + 0.5) {                                                                                           // 点在台基边上：挪到外面
      if (BX + 0.5 - Math.abs(o.x) < BZ + 0.5 - Math.abs(o.z)) o.x = (o.x >= 0 ? 1 : -1) * (BX + 0.55); else o.z = (o.z >= 0 ? 1 : -1) * (BZ + 0.55);
    }
    return o;
  }
  // 从 a 走到 b 的最短路线（经过楼梯、桥头、后角这些固定路口）；走不到返回 null
  function route(a, b) {
    const ns = [a, b, ...NODES], N = ns.length, dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
    dist[0] = 0;
    for (;;) {
      let u = -1; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === 1) break;
      done[u] = true;
      for (let v = 0; v < N; v++) {
        if (done[v] || v === u || !edgeOk(ns[u], ns[v])) continue;
        const w = dist[u] + Math.hypot(ns[v].x - ns[u].x, ns[v].z - ns[u].z) + (ns[u].L !== ns[v].L ? 0.3 : 0);
        if (w < dist[v]) { dist[v] = w; prev[v] = u; }
      }
    }
    if (dist[1] === Infinity) return null;
    const out = []; for (let i = 1; i >= 0; i = prev[i]) { out.unshift({ x: ns[i].x, z: ns[i].z, L: ns[i].L }); if (i === 0) break; }
    return out;
  }
  // 屏幕上点的那一下落在哪儿：先看是不是点在棋盘面上，不是就落到地面
  const ray = new THREE.Raycaster(), planeTop = new THREE.Plane(new V3(0, 1, 0), -Board.TOP), planeGnd = new THREE.Plane(new V3(0, 1, 0), 0);
  function rayTarget(cx, cy) {
    ray.setFromCamera(new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1), camera);
    const h = new V3();
    if (ray.ray.intersectPlane(planeTop, h) && Math.abs(h.x) <= BX && Math.abs(h.z) >= HALF && Math.abs(h.z) <= BZ) return { x: h.x, z: h.z, L: 1 };
    if (ray.ray.intersectPlane(planeGnd, h)) return { x: h.x, z: h.z, L: 0 };
    return null;
  }
  const people = new Map(); // id -> { id, name, a, self, unit, troop, el, pos: {x,z,L} 现在站哪儿, path: 还要走的路口, ban: 几点之前不能上棋盘 }
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
    u.taken = true; u.pose = 'idle'; u.act = null; u.fall = 0; u._q = false;
    // 已经自己走开过的人：换队只换衣服，人还在原地；没走动过的站到桥上的默认位置
    let pos;
    if (p.pos && p.moved) pos = new V3(p.pos.x, yAt(p.pos), p.pos.z);
    else { pos = slotPos(p.a, i); p.pos = { x: pos.x, z: pos.z, L: 0 }; p.path = null; }
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
  // 让某位观众沿路线走（wp[0] 是出发点；离得太远就直接挪过去再走）
  function walk(id, wp) {
    const p = people.get(id); if (!p || !Array.isArray(wp) || wp.length < 2 || p.flying) return false;
    const pts = [];
    for (const w of wp.slice(0, 12)) { const x = +w[0], z = +w[1], L = w[2] ? 1 : 0; if (!isFinite(x) || !isFinite(z)) return false; if (!(L ? okTop(x, z) : okGround(x, z))) return false; pts.push({ x, z, L }); }
    if (pts.some(n => n.L) && p.ban && Date.now() < p.ban) return false;         // 被弹飞的 30 秒内不许上棋盘
    for (let i = 1; i < pts.length; i++) if (!edgeOk(pts[i - 1], pts[i])) return false;
    const u = unitOf(p);
    if (!p.pos || Math.hypot(p.pos.x - pts[0].x, p.pos.z - pts[0].z) > 0.8 || p.pos.L !== pts[0].L) { p.pos = { ...pts[0] }; u.p.set(pts[0].x, yAt(pts[0]), pts[0].z); }
    p.path = pts.slice(1); p.from = { ...p.pos }; p.moved = true;
    return true;
  }
  // 自己这位观众要去 t：算路线；去不了返回 { err }
  function plan(id, t) {
    const p = people.get(id); if (!p || !p.pos || p.flying) return { err: '' };
    const left = p.ban ? Math.ceil((p.ban - Date.now()) / 1000) : 0;
    if (t.L && left > 0) return { err: `刚被弹下来，${left} 秒后才能再上棋盘` };
    const b = clampTarget(t, p.pos), r = route({ ...p.pos }, b);
    if (!r || r.length < 2) return { err: '那儿走不过去' };
    return { wp: r.map(n => [+n.x.toFixed(2), +n.z.toFixed(2), n.L]) };
  }
  // 别人报告的位置（刚入席的人靠这个知道大家站在哪）
  function setPos(id, q) {
    const p = people.get(id); if (!p || !Array.isArray(q) || p.path || p.flying) return;
    const x = +q[0], z = +q[1], L = q[2] ? 1 : 0;
    if (!isFinite(x) || !isFinite(z) || !(L ? okTop(x, z) : okGround(x, z))) return;
    if (p.pos && p.pos.L === L && Math.hypot(p.pos.x - x, p.pos.z - z) < 0.3) return;
    p.pos = { x, z, L }; p.moved = true; unitOf(p).p.set(x, yAt(p.pos), z);
  }
  const posOf = id => { const p = people.get(id); if (!p || !p.pos) return null; const d = p.path && p.path.length ? p.path[p.path.length - 1] : p.pos; return [+d.x.toFixed(2), +d.z.toFixed(2), d.L]; };
  // 棋手点了站在棋盘上的观众：弹飞到棋盘外，摔一跤，30 秒内不能再上来
  function flick(id) {
    const p = people.get(id); if (!p || !p.pos || p.flying) return false;
    const onTop = p.pos.L === 1 || (p.path && p.path.some(n => n.L));
    if (!onTop) return false;
    const u = unitOf(p), from = u.p.clone();
    const sx = Math.abs(from.x) > 0.3 ? Math.sign(from.x) : (Math.random() < 0.5 ? -1 : 1), sz = from.z >= 0 ? 1 : -1;
    const to = new V3(sx * (BX + 1.5 + Math.random() * 0.5), 0, sz * Math.max(1.5, Math.min(BZ, Math.abs(from.z) + (Math.random() - 0.5))));
    p.path = null; p.flying = true; p.ban = Date.now() + BAN_MS; p.moved = true;
    p.pos = { x: to.x, z: to.z, L: 0 };
    u.pose = 'idle'; u.fallDir = Math.atan2(to.x - from.x, to.z - from.z);
    try { Sfx.B.whoosh(0, 0.5, 0.6); Sfx.B.thud(0.6, 0.6); } catch (e) { }
    if (Fx.P) Fx.P.ink(from.clone().add(new V3(0, 0.1, 0)), 6, 0.3, 0.25, 0.6);
    Core.tween(0.62, k => { u.p.lerpVectors(from, to, k); u.p.y = from.y * (1 - k) + Math.sin(k * Math.PI) * 1.5; u.yaw += 0.5; u.fall = Math.min(0.97, k * 1.3); })
      .then(() => { u.p.copy(to); if (Fx.P) Fx.P.dust(to.clone(), 8, null, 0.3); return Core.sleep(1.3); })
      .then(() => Core.tween(0.5, k => { u.fall = 0.97 * (1 - k); }))
      .then(() => { u.fall = 0; p.flying = false; });
    bubble(p, '哎哟！', 2200);
    return true;
  }
  // 点的是不是哪位站在棋盘上的观众（棋手用）：返回他的 id
  function pickOnBoard(cx, cy) {
    let best = null, bd = 30;
    for (const p of people.values()) {
      if (!p.pos || p.flying || !(p.pos.L === 1 || (p.path && p.path.some(n => n.L)))) continue;
      const u = unitOf(p);
      v.set(u.p.x, u.p.y + 0.22, u.p.z).project(camera); if (v.z > 1) continue;
      const d = Math.hypot((v.x * 0.5 + 0.5) * innerWidth - cx, (-v.y * 0.5 + 0.5) * innerHeight - cy);
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }
  // 地动山摇：观战席上的人也被震倒
  function quake(center) {
    for (const p of people.values()) {
      const u = unitOf(p); if (!u || u._q) continue;
      u._q = true; u.fallDir = Math.atan2(u.p.x - center.x, u.p.z - center.z);
      setTimeout(() => Core.tween(0.3, k => { u.fall = k * 0.97; }, Core.ease.in).then(() => Core.sleep(1 + Math.random() * 0.6)).then(() => Core.tween(0.5, k => { u.fall = 0.97 * (1 - k); })).then(() => { u.fall = 0; u._q = false; }), 200 + Math.random() * 200);
    }
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
    // 走动：沿路线一段一段走；上下楼梯时高度跟着变，过桥时跟着桥面拱起来
    for (const p of people.values()) {
      if (!p.path || !p.path.length || p.flying) continue;
      const u = unitOf(p); let left = SPEED * dt;
      while (left > 0 && p.path.length) {
        const n = p.path[0], dx = n.x - p.pos.x, dz = n.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d <= left) { left -= d; p.pos = { x: n.x, z: n.z, L: n.L }; p.from = { ...p.pos }; p.path.shift(); continue; }
        p.pos.x += dx / d * left; p.pos.z += dz / d * left; left = 0;
        u.yaw = Math.atan2(dx, dz);
        if (p.from.L !== n.L) { const tot = Math.hypot(n.x - p.from.x, n.z - p.from.z) || 1, k = 1 - d / tot; u.p.set(p.pos.x, yAt(p.from) + (yAt(n) - yAt(p.from)) * Math.max(0, Math.min(1, k)), p.pos.z); p.pos.L = k > 0.5 ? n.L : p.from.L; }
        else u.p.set(p.pos.x, yAt(p.pos), p.pos.z);
      }
      if (!p.path.length) { p.path = null; u.p.set(p.pos.x, yAt(p.pos), p.pos.z); if (u.pose === 'march') u.pose = 'idle'; }
      else if (u.pose === 'idle') u.pose = 'march';
    }
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
    quake, upsert, remove, clear, say, laugh, react, randomName, MAX, SIDE_CN,
    walk, plan, setPos, posOf, flick, pickOnBoard, rayTarget, route, STAIR_Z, BAN_MS,
    get count() { return people.size; }, get people() { return people; },
    has: id => people.has(id), get: id => people.get(id),
  };
})();
