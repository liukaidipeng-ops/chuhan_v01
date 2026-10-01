// ===== 主流程：大厅、人机、开房选项、对局、计时、悔棋、喊话、棋谱、联机同步 =====
(() => {
  const $ = id => document.getElementById(id);
  const other = XQ.other;
  document.getElementById('paper').style.backgroundImage = `url(${Core.Tex.paperNoise})`;
  const NAME = { r: '刘邦', b: '项羽' }, SEAL = { r: '漢', b: '楚' }, SIDE_CN = { r: '汉', b: '楚' };
  const PHRASES = ['好棋！', '快些落子，莫要拖延！', '竖子，不足与谋！', '尔等已是瓮中之鳖。', '胜败乃兵家常事。', '此局，天命在我。', '且慢，容我三思。', '再来一局，决一雌雄！'];
  const REASON = { checkmate: '将死', stalemate: '困毙', resign: '认输', timeout: '超时', draw: '四十回合无吃子' };
  const LV = { easy: '新兵', mid: '校尉', hard: '霸王' };
  const VIS = ['cine', 'std', 'low'], VISNAME = { cine: '完整电影镜头', std: '精简特效', low: '低特效' }, VISBADGE = { cine: '影', std: '简', low: '低' };

  // ---------- 本地存储与设置 ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('xq3d-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('xq3d-' + k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem('xq3d-' + k); } catch (e) { } },
  };
  const S = {
    music: store.get('music', 'zen'), vMusic: store.get('vMusic', 55), vSfx: store.get('vSfx', 90), voice: store.get('voice', 1),
    vis: store.get('vis', store.get('fx', 1) === 0 ? 'low' : 'cine'), gore: store.get('gore', 3), server: store.get('server', ''),
  };
  if (!VIS.includes(S.vis)) S.vis = 'cine';
  let ropts = Object.assign({ side: 'r', undo: 3, total: 15, step: 60, hints: 1, jq: 0 }, store.get('ropts', {}));
  if (!ropts.v) ropts.v = ropts.jq ? 'jq' : 'std';
  let aopts = Object.assign({ level: 'mid', side: 'r', undo: 3, total: 0, hints: 1 }, store.get('aopts', {}));

  function applySettings() {
    Fx.level = S.vis; Fx.gore = +S.gore; Voice.enabled = !!+S.voice;
    Sfx.setVol('music', S.vMusic / 100 * 0.9); Sfx.setVol('sfx', S.vSfx / 100);
    Net.custom = S.server || '';
    for (const k of ['music', 'vMusic', 'vSfx', 'voice', 'vis', 'gore', 'server']) store.set(k, S[k]);
    $('visLv').textContent = VISBADGE[S.vis];
  }
  Net.custom = S.server || '';
  function bindSeg(root, attr, get, set) {
    root.querySelectorAll(`.seg[${attr}]`).forEach(seg => {
      const k = seg.getAttribute(attr);
      const paint = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(get(k)) === b.dataset.v));
      seg.querySelectorAll('button').forEach(b => b.onclick = () => { set(k, b.dataset.v); paint(); Sfx.select && Sfx.select(); });
      seg._paint = paint;
      paint();
    });
  }
  const repaintSegs = root => root.querySelectorAll('.seg').forEach(s => s._paint && s._paint());

  // ---------- 场景 ----------
  let game = new XQ.Game();
  Board.setPosition(game);
  Core.Cam.setSide('r');
  Board.faceViewer('r');
  Camp.init();
  Core.start();
  let lobbySpin = true;
  Core.onFrame(dt => { if (lobbySpin && !Core.Cam.cine) Core.Cam.theta += dt * 0.04; });
  setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 900); }, 500);
  // 首次触碰时解锁音频（iOS 必需）
  const unlock = () => { Sfx.init(); applySettings(); setTimeout(() => Voice.preload(['r_start', 'b_start', 'r_check', 'b_check', 'r_mate', 'b_mate']), 300); setTimeout(() => Voice.preload(Object.keys(Voice.LINES).filter(k => /_t\d|^ai_/.test(k))), 2500); setTimeout(() => Voice.preload(Object.keys(Voice.LINES).filter(k => /^u_/.test(k))), 4500); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // ---------- 主帅画像（用三维模型离屏渲染） ----------
  const faces = {};
  function portrait(kind) {
    const W = 256;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfff4e0, 0x6a5a48, 1.4));
    const dl = new THREE.DirectionalLight(0xfff2dc, 2.4); dl.position.set(1.6, 2.6, 3.2); sc.add(dl);
    const h = kind === 'xiang' ? Models.makeXiangYu() : Models.makeLiuBang();
    h.setPose(kind === 'xiang' ? Models.POSES.xStand : Models.POSES.lStand);
    for (let i = 0; i < 3; i++) h.update(0.016);
    sc.add(h.group);
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    const hy = kind === 'xiang' ? 1.8 : 1.7;
    cam.position.set(0.32, hy + 0.04, 1.5); cam.lookAt(0, hy - 0.05, 0);
    let rt;
    try { rt = new THREE.WebGLRenderTarget(W, W, { samples: 4 }); } catch (e) { rt = new THREE.WebGLRenderTarget(W, W); }
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const R = Core.renderer, prev = R.getRenderTarget(), cc = R.getClearColor(new THREE.Color()), ca = R.getClearAlpha();
    const px = new Uint8Array(W * W * 4);
    try {
      R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(sc, cam);
      R.readRenderTargetPixels(rt, 0, 0, W, W, px);
    } finally { R.setRenderTarget(prev); R.setClearColor(cc, ca); }
    Core.disposeTree(h.group); rt.dispose();
    const c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(W * 0.5, W * 0.42, 10, W * 0.5, W * 0.5, W * 0.72);
    bg.addColorStop(0, '#f6ecd4'); bg.addColorStop(1, kind === 'xiang' ? '#b9a88a' : '#d9b99a');
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    g.globalAlpha = 0.22; g.fillStyle = kind === 'xiang' ? '#1b1a19' : '#8e2418';
    Core.inkBlot(g, W * 0.62, W * 0.58, W * 0.42, 0.7, 0.5); g.globalAlpha = 1;
    const t = document.createElement('canvas'); t.width = t.height = W;
    const img = t.getContext('2d').createImageData(W, W);
    for (let y = 0; y < W; y++) img.data.set(px.subarray((W - 1 - y) * W * 4, (W - y) * W * 4), y * W * 4);
    t.getContext('2d').putImageData(img, 0, 0);
    g.drawImage(t, 0, 0);
    return c.toDataURL('image/png');
  }
  function makeFaces() {
    try { faces.r = portrait('liu'); faces.b = portrait('xiang'); } catch (e) { console.warn('画像生成失败', e); }
    paintCards();
  }
  setTimeout(makeFaces, 700);

  // ---------- 提示 ----------
  let toastT = null;
  function toast(msg, ms = 2200) { const t = $('toast'); t.innerHTML = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
  function banner(t, s, ms = 2600) { $('bannerT').textContent = t; $('bannerS').textContent = s || ''; $('banner').classList.add('on'); setTimeout(() => $('banner').classList.remove('on'), ms); }
  let askTimer = null;
  function ask(title, text, secs = 0, yes = '同 意', no = '拒 绝') {
    return new Promise(res => {
      $('askT').textContent = title; $('askP').textContent = text; $('askYes').textContent = yes; $('askNo').textContent = no;
      $('mAsk').classList.remove('hidden');
      let left = secs;
      const fin = v => { clearInterval(askTimer); $('mAsk').classList.add('hidden'); res(v); };
      $('askYes').onclick = () => fin(true); $('askNo').onclick = () => fin(false);
      clearInterval(askTimer);
      $('askCd').textContent = secs ? `${left} 秒后自动拒绝` : '';
      if (secs) askTimer = setInterval(() => { left--; $('askCd').textContent = `${left} 秒后自动拒绝`; if (left <= 0) fin(false); }, 1000);
    });
  }
  const closeAsk = () => { clearInterval(askTimer); $('mAsk').classList.add('hidden'); };

  // ---------- 对局状态 ----------
  let mode = null, mySide = 'r', viewSide = 'r', opts = { ...ropts }, hostSide = 'r';
  let sel = null, selMoves = [], anim = Promise.resolve(), busy = 0, ended = false, started = false;
  let undoUsed = { r: 0, b: 0 }, pendingUndo = null;
  let notes = [];
  const clock = { r: 0, b: 0, step: 0, last: 0, oppStamp: 0, oppTotal: 0, oppStep: 0 };
  const stepMax = () => opts.step * 1000, totalMax = () => opts.total * 60000;
  const actor = () => (mode === 'local' ? game.turn : mySide);
  const online = () => mode === 'host' || mode === 'guest';
  const aiSide = () => (mode === 'ai' ? other(mySide) : null);
  const watching = () => mode === 'watch';
  let watchWaiting = false;
  // 揭棋：同屏对战时本地随机布子；联机/观战时暗子身份未知，靠双方密钥逐个揭开（见 jq.js）
  const mkGame = o => (o && +o.bf ? new BF.Game() : o && +o.jq ? new XQ.Game({ jq: true, layout: mode === 'local' ? XQ.randomLayout() : null }) : new XQ.Game());
  // 兵法：技能选择状态、升级记法、调试
  let bfMode = null, bfUpNote = '', dbgOn = false, dbgPick = null, dbgSel = null;
  let JK = null, JC = { cin: {}, cout: {}, used: { r: {}, b: {} } }, jqBad = 0, pendingJ = null, lastJx = null;
  const jqOn = () => game.jq && online();
  const jqReady = () => !jqOn() || !!(JK && JC.cin[other(mySide)] && JC.cout[mySide]);

  function resetClocks() { clock.r = clock.b = totalMax(); clock.step = stepMax(); clock.last = performance.now(); }
  function fmt(ms) { if (!opts.total) return '∞'; ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  // ---------- 中文记谱 ----------
  const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const FW_NUM = ['', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
  const PCH = { r: { k: '帥', a: '仕', e: '相', n: '馬', r: '車', c: '炮', p: '兵' }, b: { k: '將', a: '士', e: '象', n: '馬', r: '車', c: '砲', p: '卒' } };
  function notation(board, m) {
    const [ff, fr] = m.from, [tf, tr] = m.to;
    const p = board[fr] && board[fr][ff]; if (!p) return '';
    const s = p.s, red = s === 'r', t = XQ.et(p); // 揭棋暗子按所在位置的兵种记
    const num = f => (red ? CN_NUM[9 - f] : FW_NUM[f + 1]);
    const steps = n => (red ? CN_NUM[n] : FW_NUM[n]);
    let head = PCH[s][t] + num(ff);
    if ('rncp'.includes(t)) {
      const same = [];
      for (let r = 0; r < 10; r++) { const q = board[r][ff]; if (q && q.s === s && XQ.et(q) === t) same.push(r); }
      if (same.length >= 2) {
        same.sort((a, b) => (red ? b - a : a - b)); // 靠前者在前
        const i = same.indexOf(fr);
        const tag = same.length === 2 ? ['前', '後'][i] : same.length === 3 ? ['前', '中', '後'][i] : (red ? CN_NUM : FW_NUM)[i + 1];
        head = tag + PCH[s][t];
      }
    }
    if (tr === fr) return head + '平' + num(tf);
    const fwd = red ? tr > fr : tr < fr;
    return head + (fwd ? '進' : '退') + ('nae'.includes(t) ? num(tf) : steps(Math.abs(tr - fr)));
  }
  // 揭棋：翻出的子记在着法后，如“炮二進七=馬”
  const noteOf = (board, m, rv) => { const p = board[m.from[1]][m.from[0]]; return notation(board, m) + (rv && p ? '=' + PCH[p.s][rv] : ''); };
  // 兵法记谱：升级记作“↑傌”，技能写技能名，攻击未下记“·攻”
  function bfNote(g, e) {
    const at = e.at || e.from, p = at ? g.at(at[0], at[1]) : null;
    if (e.k === 'up') return p ? '↑' + PCH[p.s][p.t] : '';
    if (e.k === 'mv') { const q = g.at(e.to[0], e.to[1]); const n = notation(g.board, e); return q && q.hp >= 2 ? n + '·攻' : n; }
    if (e.k === 'sk' && p) {
      const sk = BF.SKILL_OF(p.t, p.s), cn = BF.SKILL_CN[sk];
      if (e.to && sk !== 'qishe') return cn + '·' + notation(g.board, { from: e.at, to: e.to });
      if (sk === 'qishe') { const q = g.at(e.to[0], e.to[1]); return cn + '·' + (q ? PCH[q.s][q.t] : ''); }
      return cn + '·' + PCH[p.s][p.t];
    }
    if (e.k === 'art') { if (g.turn === 'r') { const d = g.dead.r.find(x => x.id === e.id); return '追韓信·' + (d ? PCH.r[d.t] : ''); } return '破釜沉舟'; }
    if (e.k === 'ult') return g.turn === 'r' ? '四面楚歌' : '鴻門宴';
    if (e.k === 'pass') return '停著';
    return '';
  }
  function rebuildNotes() {
    if (game.bf) {
      const g = new BF.Game(); g.reset(game.base); notes = []; let up = '';
      for (const e of game.entries) { const n = bfNote(g, e); if (!g.apply(e)) break; if (e.k === 'up') up = n; else { notes.push((up ? up + ' ' : '') + n); up = ''; } }
      bfUpNote = up;
      renderLog(); return;
    }
    const g = game.jq ? new XQ.Game(game.opts) : new XQ.Game(); notes = [];
    for (const h of game.history) { notes.push(noteOf(g.board, h, h.rv)); g.play({ from: h.from, to: h.to, rv: h.rv }); }
    renderLog();
  }
  const noteHtml = n => { if (!n) return ''; const [a, b] = n.split('='); return b ? `${a}<em class="rv">${b}</em>` : a; };
  function renderLog() {
    let html = '';
    for (let i = 0; i < notes.length; i += 2) {
      const last = notes.length - 1;
      html += `<li><i>${i / 2 + 1}</i><span class="r${i === last ? ' last' : ''}">${noteHtml(notes[i])}</span><span class="${i + 1 === last ? 'last' : ''}">${noteHtml(notes[i + 1])}</span></li>`;
    }
    const L = $('logList'); L.innerHTML = html || '<li style="display:block;text-align:center;color:#8a8580;font-size:13px">尚未落子</li>'; L.scrollTop = L.scrollHeight;
  }

  // ---------- 界面 ----------
  function bottomSide() { return mode === 'local' ? viewSide : mySide; }
  function cardFor(side) { return side === bottomSide() ? $('cardMe') : $('cardOpp'); }
  function paintCards() {
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      c.classList.remove('r', 'b'); c.classList.add(s);
      c.querySelector('.seal').textContent = SEAL[s];
      c.querySelector('.who').textContent = NAME[s];
      const img = c.querySelector('.face'); if (faces[s] && img.src !== faces[s]) img.src = faces[s];
      c.querySelector('.tag').textContent = mode === 'local' || mode === 'watch' ? (s === 'r' ? '红方' : '黑方')
        : mode === 'ai' ? (s === mySide ? '你' : `电脑 · ${LV[opts.level] || ''}`)
          : (s === mySide ? '你' : '对手');
    }
    updateHud();
  }
  function capturedBy() {
    const by = { r: [], b: [] };
    if (game.bf) { for (const h of game.history) for (const k of h.kills || []) by[other(k.s)].push({ s: k.s, t: k.t, id: k.id }); return by; }
    for (const h of game.history) if (h.cap) by[h.cap.s === 'r' ? 'b' : 'r'].push(h.cap);
    return by;
  }
  // 被吃的揭棋暗子：联机时只有吃子方看得到真身（虚线框）；同屏时显示“暗”，吃子方可点开偷看
  function capChip(p) {
    if (!p.h) return `<div class="capp ${p.s}">${XQ.NAMES[p.s][p.t]}</div>`;
    const know = p.t !== '?' && online() && p.s !== mySide;
    if (know) return `<div class="capp ${p.s} hid know" title="被吃的暗子 · 只有你知道">${XQ.NAMES[p.s][p.t]}</div>`;
    return `<div class="capp ${p.s} hid" data-pid="${p.id}" title="被吃的暗子">暗</div>`;
  }
  for (const id of ['cardMe', 'cardOpp']) $(id).addEventListener('click', e => {
    const el = e.target.closest('.capp.hid'); if (!el || mode !== 'local' || !el.dataset.pid) return;
    const h = game.history.find(x => x.cap && String(x.cap.id) === el.dataset.pid); if (!h) return;
    toast(`这枚暗子是「${XQ.NAMES[h.cap.s][h.cap.t]}」<br><small>（吃子方偷偷看，对手请回避）</small>`, 1800);
  });
  function updateHud() {
    if (!mode) return;
    const by = capturedBy();
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      c.classList.toggle('active', started && !game.result && game.turn === s);
      c.classList.toggle('think', mode === 'ai' && s === aiSide() && aiThinking);
      c.querySelector('.caps').innerHTML = by[s].map(capChip).join('');
      c.querySelector('.undo').textContent = opts.undo && !(mode === 'ai' && s === aiSide()) ? (opts.undo >= 99 ? '悔棋不限' : `悔 ${Math.max(0, opts.undo - undoUsed[s])}`) : '';
      const bfm = c.querySelector('.bfm');
      bfm.classList.toggle('hidden', !game.bf);
      if (game.bf) {
        const mi = bfm.querySelector('.mer i'); if (mi.textContent !== String(game.merit[s])) { mi.textContent = game.merit[s]; mi.classList.add('pop'); setTimeout(() => mi.classList.remove('pop'), 300); }
        const fx = game.fx, used = game.used, U = BF.CFG.ultimates;
        const chips = [];
        // 轮到这一方行动时，卡片上的兵法签可以直接点（手机上技能栏不再常驻）；点灰的签说明原因
        const tap = canAct() && game.turn === s && !bfMode && !game.result;
        const av = tap ? bfAvail() : null, aw = av && artWhy(s, av), uw = av && ultWhy(s, av);
        const tapAttr = (act, why) => tap ? ` data-a="${act}"${why ? ` data-why="${why[1]}"` : ''}` : '';
        chips.push(`<span class="${used.art[s] ? 'used' : tap && !aw ? 'go' : 'ok'}${tap ? ' tap' : ''}${tap && aw ? ' off' : ''}" title="主帅兵法（每局一次）"${tapAttr('art', aw)}>${BF.ART_CN[s]}</span>`);
        // 四面楚歌除了 20 军功还要围住楚将（5×5 内 3 枚汉军子），条件没齐就不亮，并显示还差几枚
        const need = U.simian.minPiecesInRadius, near = s === 'r' ? game.simianCount() : need;
        const ultOk = game.merit[s] >= U.cost && near >= need;
        const ultTxt = used.ult[s] ? '' : game.merit[s] >= U.cost && near < need ? `·将旁${near}/${need}` : '·' + U.cost;
        const ultTip = s === 'r' ? `终极兵法：${U.cost} 军功，且楚将周围两格内（5×5）至少 ${need} 枚汉军棋子` : `终极兵法：${U.cost} 军功`;
        chips.push(`<span class="${used.ult[s] ? 'used' : tap ? (uw ? 'ok' : 'go') : ultOk ? 'red' : 'ok'}${tap ? ' tap' : ''}${tap && uw ? ' off' : ''}" title="${ultTip}"${tapAttr('ult', uw)}>${BF.ULT_CN[s]}${ultTxt}</span>`);
        if (s === 'r' && fx.hm) chips.push(`<span class="red" title="汉帅不能移动">鸿门宴 ${fx.hm}</span>`);
        if (s === 'b' && fx.sm) chips.push(`<span class="red" title="只能吃子、不能用技能">涣散 ${fx.sm}</span>`);
        if (s === 'b' && fx.pf) chips.push(`<span title="破釜沉舟后不能用兵种技能">封技 ${fx.pf}</span>`);
        const fxs = bfm.querySelector('.fxs'), html = chips.join('');
        if (fxs.innerHTML !== html) fxs.innerHTML = html;
        fxs.onclick = e => { const t = e.target.closest('[data-a]'); if (!t) return; e.stopPropagation(); bfButton(t.dataset.a, t); };
      }
    }
    paintClocks();
    let st, warn = false;
    if (game.result) st = `${SIDE_CN[game.result.winner]}胜 · ${REASON[game.result.reason]}`;
    else if (!started) st = mode === 'host' && !Net.connected ? '等待对手入局…' : '开 局';
    else if (online() && Net.peerState === 'lost') { st = '对手连接中断，时钟暂停'; warn = true; }
    else if (mode === 'local') st = `${game.turn === 'r' ? '红方（汉）' : '黑方（楚）'}走棋`;
    else if (mode === 'ai') st = game.turn === mySide ? '轮到你走' : `${NAME[aiSide()]}思考中…`;
    else st = game.turn === mySide ? '轮到你走' : '对手思考中…';
    if (!game.result && started && game.inCheck()) { st += ' · 将军！'; warn = true; }
    if (watching()) {
      if (game.result) st = `${SIDE_CN[game.result.winner]}胜 · ${REASON[game.result.reason]}`;
      else st = !started || (!game.history.length && watchWaiting) ? '等待棋手开局…' : `观战 · ${game.turn === 'r' ? '红方（汉）' : '黑方（楚）'}走棋` + (game.inCheck() ? ' · 将军！' : '');
    }
    if (game.result && !game.result.winner) st = `和棋 · ${REASON[game.result.reason] || ''}`;
    if (game.jq && !game.result) {
      if (pendingJ) st = '揭子中…';
      else if (started && online() && !jqReady()) st = '等待对手洗牌…';
      const q = game.quietPlies();
      if (q >= 60) st += ` · 无吃子 ${Math.floor(q / 2)}/40 回合`;
      st = '揭棋 · ' + st;
      if (jqBad) { st += ' · ⚠对手揭子数据校验未通过'; warn = true; }
    }
    if (game.bf && !game.result) {
      if (started && game.mustPass() && !watching()) { st = `${SIDE_CN[game.turn]}方无子可走 · 请停着`; }
      st = `兵法 · 第 ${game.round} 回合 · ` + st;
    }
    $('statusT').textContent = st; $('status').classList.toggle('warn', warn);
    renderBar();
    $('netDot').classList.toggle('hidden', !(online() || watching()));
    $('netDot').classList.toggle('bad', (online() && Net.peerState !== 'ok') || ((online() || watching()) && !Net.lineOk));
    $('specN').textContent = (online() || watching()) && Spect.count ? `观战 ${Spect.count}` : '';
    layoutHud();
    const left = opts.undo >= 99 ? '' : Math.max(0, opts.undo - undoUsed[actor()]);
    $('undoLeft').textContent = opts.undo ? (left === '' ? '∞' : left) : '';
    $('tUndo').disabled = !canUndo();
  }
  // 浮动元素按卡片实际位置摆放，避免互相压住
  function layoutHud() {
    if ($('hud').classList.contains('hidden')) return;
    const W = innerWidth, H = innerHeight;
    const compact = isCompact();
    document.body.classList.toggle('compact', compact);
    const o = $('cardOpp').getBoundingClientRect(), m = $('cardMe').getBoundingClientRect();
    const st = $('status').style;
    if (compact) { st.left = '50%'; st.top = (o.bottom + 8) + 'px'; st.transform = 'translateX(-50%)'; }
    else if (W <= 1100) { st.left = (o.right + 18) + 'px'; st.top = (o.top + 4) + 'px'; st.transform = 'none'; }
    else { st.left = '50%'; st.top = ''; st.transform = 'translateX(-50%)'; }
    const sr = $('status').getBoundingClientRect();
    const below = compact ? sr.bottom : o.bottom;
    $('bubOpp').style.top = (below + 12) + 'px';
    $('bubMe').style.bottom = (H - m.top + 12) + 'px';
    $('log').style.top = compact ? (sr.bottom + 8) + 'px' : '';
    // 兵法技能栏：手机上贴在自己卡片上方，电脑上居中靠下；气泡让到技能栏上面
    const bar = $('bfBar');
    if (!bar.classList.contains('hidden')) {
      // 电脑：竖排在右侧工具栏左边，不压棋盘；手机：横排贴在自己卡片上方
      bar.classList.toggle('col', !compact); bar.classList.toggle('cmp', compact);
      if (compact) { bar.style.bottom = (H - m.top + 8) + 'px'; bar.style.left = '12px'; bar.style.right = '12px'; bar.style.transform = 'none'; }
      else { const tr = $('tools').getBoundingClientRect(); bar.style.left = 'auto'; bar.style.transform = 'none'; bar.style.right = (W - tr.left + 12) + 'px'; bar.style.bottom = (H - tr.bottom) + 'px'; }
      const br = bar.getBoundingClientRect();
      $('bubMe').style.bottom = (H - Math.min(m.top, br.top) + 10) + 'px';
    }
    $('bfReport').style.top = compact ? (sr.bottom + 6) + 'px' : '';
  }
  window.addEventListener('resize', () => setTimeout(layoutHud, 60));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => layoutHud()); ro.observe($('cardOpp')); ro.observe($('cardMe')); }
  function paintClocks() {
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      let total = clock[s], step = game.turn === s ? clock.step : stepMax();
      if (online() && s !== mySide && game.turn === s && clock.oppStamp && Net.peerState === 'ok' && !busy) {
        const el = performance.now() - clock.oppStamp;
        total = clock.oppTotal - (opts.total ? el : 0); step = clock.oppStep - el;
      }
      const ck = c.querySelector('.clk'); ck.textContent = opts.total ? fmt(total) : '不限时'; ck.classList.toggle('inf', !opts.total);
      ck.classList.toggle('low', !!opts.total && total < 60000 && game.turn === s && started && !game.result);
      // 头像外的计时环：优先显示步时，其次总时
      let k = 1, low = false;
      if (opts.step) { k = step / stepMax(); low = step < 10000; }
      else if (opts.total) { k = total / totalMax(); low = total < 60000; }
      const arc = c.querySelector('.arc');
      arc.style.strokeDashoffset = (226.2 * (1 - Math.max(0, Math.min(1, k)))).toFixed(1);
      arc.classList.toggle('low', low && game.turn === s);
    }
  }

  // ---------- 计时 ----------
  let lastTickSec = -1;
  let turnStartAt = 0, slowIdx = 0;
  setInterval(() => {
    const t = performance.now(), dt = t - clock.last; clock.last = t;
    if (!started || ended || game.result || !mode) return;
    const s = game.turn;
    const mine = mode === 'local' || mode === 'ai' || mode === 'watch' || s === mySide;
    const paused = busy || Ending.running || (online() && Net.peerState !== 'ok');
    if (mine && !paused) {
      if (opts.total) clock[s] -= dt;
      if (opts.step) clock.step -= dt;
      const left = Math.min(opts.total ? clock[s] : 1e9, opts.step ? clock.step : 1e9);
      const sec = Math.ceil(left / 1000);
      if (left < 10000 && sec !== lastTickSec && s !== aiSide() && !watching()) { lastTickSec = sec; Sfx.tick(sec <= 3 ? 0.5 : 0.3); }
      if (!watching() && ((opts.total && clock[s] <= 0) || (opts.step && clock.step <= 0))) onTimeout(s);
      if (online() && Math.floor(t / 2000) !== Math.floor((t - dt) / 2000)) Net.send({ t: 'clk', side: s, total: clock[s], step: clock.step });
    }
    // 人机：玩家久不落子，对方出言相激
    if (mode === 'ai' && s === mySide && !paused && !pendingUndo && turnStartAt) {
      const el = (t - turnStartAt) / 1000;
      const marks = [22, 48, 85, 130, 190, 260];
      if (slowIdx < marks.length && el > marks[slowIdx]) { aiSay('slow' + ((slowIdx % 3) + 1)); slowIdx++; }
    }
    paintClocks();
  }, 200);
  function onTimeout(s) {
    const r = game.timeout(s);
    if (!r) return;
    if (online()) Net.send({ t: 'timeout', side: s });
    toast(`${SIDE_CN[s]}方超时`);
    finishGame(r);
  }

  // ---------- 人机 ----------
  let aiSeq = 0, aiThinking = false;
  const lastAiLine = {};
  function aiSay(kind, force) {
    if (mode !== 'ai') return Promise.resolve();
    const s = aiSide(), k = s === 'b' ? 'x' : 'l';
    let id = `ai_${k}_${kind}`;
    if (kind === 'cap') {
      const pool = [1, 2, 3, 4].map(i => `ai_${k}_cap${i}`).filter(x => x !== lastAiLine.cap);
      id = pool[Math.floor(Math.random() * pool.length)]; lastAiLine.cap = id;
    }
    if (!Voice.has(id)) return Promise.resolve();
    bubble(s, Voice.text(id), 3600);
    return Voice.play(id);
  }
  function cancelAI() { aiSeq++; if (aiThinking) { try { AI.cancel(); } catch (e) { } } aiThinking = false; }
  function maybeAI() {
    if (mode !== 'ai' || ended || game.result || !started || game.turn !== aiSide() || pendingUndo) return;
    if (aiThinking) return;
    const id = ++aiSeq;
    aiThinking = true; updateHud();
    const t0 = performance.now();
    const minWait = { easy: 1100, mid: 1300, hard: 700 }[opts.level] || 1000;
    AI.think(game.history.map(h => ({ from: h.from, to: h.to })), opts.level).then(async r => {
      if (id !== aiSeq) return;
      const el = performance.now() - t0;
      if (el < minWait) await Core.sleep((minWait - el) / 1000);
      await anim;
      while (busy) await Core.sleep(0.1);
      if (id !== aiSeq) return;
      aiThinking = false;
      if (ended || game.result || game.turn !== aiSide()) { updateHud(); return; }
      if (!r || !r.move) { updateHud(); console.warn('电脑无着', r); return; }
      if (!doMove({ from: r.move.from, to: r.move.to })) { console.warn('电脑着法非法', r.move); updateHud(); }
    }).catch(e => { console.error(e); aiThinking = false; });
  }
  // 着法完成后的台词
  function afterMoveLines(info) {
    const mover = info.mover;
    let p = Promise.resolve();
    if (info.result && info.result.reason === 'checkmate') { bubble(mover, '绝杀！', 2600); p = Voice.play(`${mover}_mate`); }
    else if (info.check) {
      bubble(mover, '将军！', 2400); p = Voice.play(`${mover}_check`);
      if (mode === 'ai' && mover === mySide && Math.random() < 0.55) p.then(() => { if (!ended) aiSay('checked'); });
    }
    if (mode !== 'ai' || info.result) return;
    if (mover === aiSide() && info.captured && !info.check) { if ('rnc'.includes(info.captured.t) || Math.random() < 0.6) aiSay('cap'); }
    else if (mover === mySide && info.captured && !info.check && 'rnc'.includes(info.captured.t) && Math.random() < 0.6) aiSay('hurt');
  }

  // ---------- 开局 ----------
  function setView(side) { viewSide = side; Core.Cam.setSide(side); Board.faceViewer(side); Board.viewSide = side; paintCards(); }
  let finaleHero = null;
  function clearFinale() { if (finaleHero) { try { if (finaleHero.dropped) Core.disposeTree(finaleHero.dropped); finaleHero.dispose(); } catch (e) { } finaleHero = null; } }
  async function startGame(m, side, o, { state = null, intro = true } = {}) {
    cancelAI();
    mode = m; mySide = side; opts = { ...o }; ended = false; started = false; lobbySpin = false;
    game = mkGame(opts); undoUsed = { r: 0, b: 0 }; pendingUndo = null;
    resetClocks();
    clearFinale(); Camp.reset();
    Board.setPosition(game); Fx.clearMarks(); Fx.ply = 0;
    Board.clearMoves(); Board.showLast(null);
    if (state) applyState(state);
    jqSetup(state);
    rebuildNotes();
    $('log').classList.toggle('jq', game.jq || !!game.bf);
    bfMode = null; dbgOn = false; $('bfDebug').classList.add('hidden'); $('bfReport').innerHTML = ''; $('bfReport').classList.toggle('hidden', !game.bf);
    $('tDebug').classList.toggle('hidden', !(game.bf && m === 'local'));
    setView(mode === 'local' ? 'r' : side);
    $('lobby').classList.add('hidden'); $('hud').classList.remove('hidden');
    $('netbadge').classList.add('hidden');
    Core.Cam.moveId = (Core.Cam.moveId || 0) + 1;
    for (const id of ['tUndo', 'tResign']) $(id).classList.toggle('hidden', m === 'watch');
    $('tLaugh').classList.toggle('hidden', m !== 'watch');
    setupChat();
    $('log').classList.toggle('hidden', !store.get('log', innerWidth > 1100));
    Ending.hideCard();
    Core.Cam.cine = false;
    Sfx.init(); applySettings();
    Sfx.Music.start(S.music); Sfx.Music.setIntensity(0.35);
    paintCards();
    if (mode === 'ai') { try { AI.warm(); } catch (e) { } }
    if (intro && !game.history.length) {
      Sfx.B.gong(0, 0.9); Sfx.B.taiko(0.5, 0.8); Sfx.B.taiko(0.8, 0.8); Sfx.B.taiko(1.05, 0.9);
      let sub = mode === 'local' ? '红方先行' : mode === 'ai' ? `人机 · ${LV[opts.level]} · ${mySide === 'r' ? '你执红（汉）先行' : '你执黑（楚）后手'}` : mode === 'watch' ? '观战' : (mySide === 'r' ? '你执红（汉）· 先行' : '你执黑（楚）· 后手');
      if (game.jq) sub = '揭棋 · ' + sub;
      if (game.bf) sub = '兵法 · ' + sub;
      banner('楚汉相争', sub, 2700);
      await Core.sleep(2.5);
      bubble('r', '汉王刘邦在此！项籍，可敢一战？', 3000); await Voice.play('r_start', { minDur: 2 });
      bubble('b', '吾乃西楚霸王！谁敢挡我！', 3000); await Voice.play('b_start', { minDur: 1.8 });
    }
    if (mode !== m) return;
    if (game.jq && !game.history.length && intro) { bubble('r', '十五子尽数扣下，翻开方知是何兵马！', 2600); await Core.sleep(1.2); }
    if (game.bf && !game.history.length && intro) { bubble('b', '论兵法，你还嫩了些！', 2400); await Core.sleep(1.0); }
    if (mode !== m) return;
    started = true; clock.last = performance.now(); clock.step = stepMax();
    turnStartAt = performance.now(); slowIdx = 0;
    updateHud();
    maybeAI();
  }
  function snapshot() {
    const jq = game.jq && JK ? { gid: JK.gid, cin: JC.cin, cout: JC.cout } : undefined;
    const bfe = game.bf ? game.entries : undefined;
    return { v: 2, code: Net.code, opts, hostSide, jq, bfe, moves: game.bf ? [] : game.history.map(h => ({ from: h.from, to: h.to, rv: h.rv, cj: h.cj })), result: game.result, undo: { ...undoUsed }, clk: { r: clock.r, b: clock.b }, step: clock.step, t: Date.now() };
  }
  function applyState(st) {
    game = mkGame(opts);
    if (game.bf) for (const e of st.bfe || []) { if (!game.apply(e)) break; }
    else for (const m of st.moves || []) game.play({ from: m.from, to: m.to, rv: m.rv, cj: m.cj });
    if (st.result) game.result = st.result;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) };
    if (st.clk && ((st.moves || []).length || (st.bfe || []).length)) { clock.r = st.clk.r; clock.b = st.clk.b; }
    if (st.step != null) clock.step = st.step;
    jqLearnAll();
    Board.setPosition(game); Board.faceViewer(viewSide);
    Fx.ply = game.history.length;
    const last = game.history[game.history.length - 1];
    Board.showLast(last ? last.from : null, last ? last.to : null);
    rebuildNotes();
  }
  function publish() { if (mode === 'host') Net.publishRoom(snapshot()); }

  // ---------- 揭棋联机：密钥、承诺与揭示 ----------
  const jqKey = () => 'jq-' + Net.code;
  function jqSetup(st) {
    JK = null; JC = { cin: {}, cout: {}, used: { r: {}, b: {} } }; jqBad = 0; pendingJ = null; lastJx = null;
    if (!game.jq || !online()) return;
    const sj = st && st.jq, opp = other(mySide);
    const saved = store.get(jqKey(), null);
    if (sj && sj.gid) {
      if (sj.cin) for (const k of ['r', 'b']) if (Jieqi.validCommits(sj.cin[k])) JC.cin[k] = sj.cin[k];
      if (sj.cout) for (const k of ['r', 'b']) if (Jieqi.validCommits(sj.cout[k])) JC.cout[k] = sj.cout[k];
      if (saved && saved.gid === sj.gid && saved.side === mySide && saved.inner && saved.outer) JK = saved;
      else if (mode === 'guest') JK = Jieqi.create(sj.gid, mySide);
      else if (mode === 'host' && (st.moves || []).length && !st.result) {
        // 房主换了设备、密钥丢失：这局揭不开了，重新洗牌
        setTimeout(() => { if (mode !== 'host') return; toast('揭棋密钥不在这台设备上，重新洗牌开局', 3200); restart(); Net.send({ t: 'restart', state: snapshot() }); }, 60);
        return;
      } else JK = Jieqi.create(sj.gid, mySide);
    } else if (mode === 'host') JK = Jieqi.create(Jieqi.rhex(10), mySide);
    if (!JK) return;
    store.set(jqKey(), JK);
    JC.cin[mySide] = JK.inner.c; JC.cout[opp] = JK.outer.c;
    if (mode === 'guest') Net.send({ t: 'jqc', gid: JK.gid, ...Jieqi.pub(JK) });
    jqLearnAll();
  }
  function jqWarn(why) {
    jqBad++; console.warn('揭棋校验未通过', why);
    toast('⚠ 对手的揭子数据没有通过校验（' + why + '）', 3600);
  }
  // 记录槽位号使用情况：同一槽位不能对应两个不同位置
  function jqNoteSlot(side, j, i) {
    const u = JC.used[side];
    if (u[j] != null && u[j] !== i) jqWarn('槽位重复'); else u[j] = i;
  }
  // 某方已揭晓的兵种数量不能超过标准数量
  function jqCountOk(side) {
    const n = {};
    game.history.forEach((h, i) => {
      if (h.rv && (i % 2 ? 'b' : 'r') === side) n[h.rv] = (n[h.rv] || 0) + 1;
      if (h.cap && h.cap.h && h.cap.t !== '?' && h.cap.s === side) n[h.cap.t] = (n[h.cap.t] || 0) + 1;
    });
    for (const t in n) if (n[t] > XQ.JQ_COUNT[t]) return false;
    return true;
  }
  // 吃子方用自己的 outer 排列算出被吃暗子的真身（含重连后的补算）
  function jqLearn(h) {
    if (!JK || !h || !h.cap || !h.cap.h || h.cap.t !== '?' || h.cj == null || h.cap.s === mySide) return;
    if (!Jieqi.okIdx(h.cj)) return;
    h.cap.t = JK.outer.arr[h.cj];
  }
  function jqLearnAll() { if (JK) for (const h of game.history) jqLearn(h); }
  // 对手走了暗子 / 吃了我方暗子：我方给出揭示
  function jqRespond(d) {
    const opp = other(mySide);
    const p = game.at(d.from[0], d.from[1]), q = game.at(d.to[0], d.to[1]);
    if (!JK || !p || p.s !== opp) return null;
    const jx = { t: 'jx', n: d.n }, out = {};
    if (d.ri) {
      if (!p.h || d.ri.i !== p.hi || !Jieqi.okIdx(d.ri.j)) return null;
      if (!Jieqi.checkIn(JK.gid, opp, JC.cin[opp], d.ri)) jqWarn('暗子位置');
      jqNoteSlot(opp, d.ri.j, d.ri.i);
      jx.rv = Jieqi.outerOf(JK, d.ri.j); out.rv = jx.rv.v;
    } else if (p.h && p.t === '?') return null;
    if (d.wc && q && q.s === mySide && q.h) { jx.cr = Jieqi.innerOf(JK, q.hi); out.cj = jx.cr.j; }
    lastJx = jx;
    Net.send(jx);
    return out;
  }
  // 我方走子后收到对手的揭示
  function jqResolve(d) {
    const P = pendingJ;
    if (!P || d.n !== P.n || d.n !== game.history.length) return;
    const m = { from: P.m.from, to: P.m.to }, opp = other(mySide);
    if (P.needRv) {
      if (!d.rv || d.rv.j !== P.ri.j || typeof d.rv.v !== 'string' || !'rneacp'.includes(d.rv.v) || d.rv.v.length !== 1) return;
      if (!Jieqi.checkOut(JK.gid, mySide, JC.cout[mySide], d.rv)) jqWarn('翻出的兵种');
      m.rv = d.rv.v;
    }
    if (P.needCr) {
      const q = game.at(m.to[0], m.to[1]);
      if (!d.cr || !q || !Jieqi.okIdx(d.cr.j)) return;
      if (d.cr.i !== q.hi || !Jieqi.checkIn(JK.gid, opp, JC.cin[opp], d.cr)) jqWarn('被吃暗子');
      jqNoteSlot(opp, d.cr.j, q.hi);
      q.t = JK.outer.arr[d.cr.j]; // 只有我知道
      m.cj = d.cr.j;
    }
    pendingJ = null;
    doMove(m, false, undefined, true);
    if (!jqCountOk(mySide) || !jqCountOk(opp)) jqWarn('兵种数量');
  }
  setInterval(() => {
    if (!pendingJ || !online()) return;
    if (Net.peerState === 'ok' && performance.now() - pendingJ.sent > 3500) { pendingJ.sent = performance.now(); Net.send(pendingJ.msg); }
  }, 1000);

  // ---------- 走子 ----------
  function canAct() {
    if (watching()) return false;
    if (!started || ended || busy || game.result || pendingUndo || pendingJ) return false;
    if (game.jq && !jqReady()) return false;
    if (game.bf && mode === 'ai') return false;
    if (mode === 'local') return true;
    if (mode === 'ai') return game.turn === mySide && !aiThinking;
    return Net.connected && game.turn === mySide;
  }
  function doMove(m, remote = false, clk, sent = false) {
    // 联机揭棋：走自己的未知暗子、或吃对方的未知暗子，先请对方揭示，收到后再落子
    if (!remote && !sent && jqOn()) {
      const p = game.at(m.from[0], m.from[1]), q = game.at(m.to[0], m.to[1]);
      const needRv = !!(p && p.h && p.t === '?'), needCr = !!(q && q.h && q.t === '?');
      if (needRv || needCr) {
        if (!JK || !game.isLegal(m)) return false;
        const n = game.history.length;
        const msg = { t: 'move', n, from: m.from.slice(), to: m.to.slice(), clk: clock[game.turn] };
        if (needRv) msg.ri = Jieqi.innerOf(JK, p.hi);
        if (needCr) msg.wc = 1;
        pendingJ = { m: { from: m.from.slice(), to: m.to.slice() }, n, msg, ri: msg.ri, needRv, needCr, sent: performance.now() };
        Net.send(msg);
        sel = null; selMoves = [];
        Board.showMoves(m.from, [{ from: m.from, to: m.to }], true);
        Sfx.lift();
        updateHud();
        return true;
      }
    }
    const rv0 = (() => { const p = game.at(m.from[0], m.from[1]); return p && p.h ? (p.t !== '?' ? p.t : m.rv) : null; })();
    const note = noteOf(game.board, m, rv0);
    const info = game.play(m);
    if (!info) return false;
    jqLearn(game.history[game.history.length - 1]);
    if (info.captured && game.history[game.history.length - 1].cap) info.captured = { ...game.history[game.history.length - 1].cap };
    info.dt = capView(info);
    if (info.captured) info.streak = captureStreak();
    notes.push(note); renderLog();
    Fx.ply = game.history.length;
    if (!remote && !sent && online()) Net.send({ t: 'move', n: info.ply, from: m.from, to: m.to, clk: clock[info.mover] });
    if (remote && clk != null) clock[info.mover] = clk;
    clock.step = stepMax(); clock.oppStamp = 0;
    Board.clearMoves(); sel = null; selMoves = [];
    turnStartAt = 0;
    queueAnim(info);
    updateHud(); publish();
    // 电脑在玩家的动画播放时就开始思考
    if (mode === 'ai' && info.mover === mySide && !info.result) maybeAI();
    return true;
  }
  // 连吃：同一方连续吃子、期间对方没吃回（对方一吃回就清零）
  function captureStreak() {
    let side = null, n = 0;
    for (let i = game.history.length - 1; i >= 0; i--) {
      const h = game.history[i]; if (!h.cap) continue;
      const s = i % 2 ? 'b' : 'r';
      if (side === null) side = s;
      if (s !== side) break;
      n++;
    }
    return n;
  }
  // 动画里被吃的子显示成什么：揭棋暗子只有联机的吃子方看得到真身
  function capView(info) {
    const c = info.captured; if (!c) return null;
    if (!c.h) return c.t;
    return online() && c.s !== mySide && c.t !== '?' ? c.t : '?';
  }
  function queueAnim(info) {
    busy++;
    $('skip').classList.remove('hidden'); $('skip').textContent = '跳过 ▸▸';
    anim = anim.then(async () => {
      await Fx.playMove(info);
      Board.showLast(info.from, info.to);
    }).catch(e => console.error(e)).then(() => {
      busy--;
      Core.Time.skip = false;
      if (!busy) $('skip').classList.add('hidden');
      clock.step = stepMax(); clock.last = performance.now();
      if (online() && game.turn === mySide) Net.send({ t: 'clk', side: mySide, total: clock[mySide], step: clock.step });
      const caps = game.history.filter(h => h.cap).length;
      Sfx.Music.setIntensity(game.result ? 1 : game.inCheck() ? 0.95 : Math.min(0.72, 0.32 + caps * 0.03));
      afterMoveLines(info);
      if (info.captured) Spect.react(info.mover);
      if (!busy && game.turn === mySide) { turnStartAt = performance.now(); slowIdx = 0; }
      updateHud();
      if (info.result && !busy) finishGame(info.result);
    });
  }

  // ---------- 终局：棋盘上的收官演出，再进入历史结算 ----------
  async function boardFinale(result) {
    if (!result.winner) {
      // 和棋：鸿沟为界，两军各自收兵
      banner('鴻溝為界', '四十回合未见杀伐 · 和局', 3000);
      Sfx.B.gong(0, 0.8); Camp.cheer('r', 4, 0.8); Camp.cheer('b', 4, 0.8);
      await Core.sleep(3);
      return;
    }
    const loser = result.loser, winner = result.winner;
    const kp = game.kingPos(loser);
    if (!kp) return;
    const km = [...Board.pieces.values()].find(x => x.userData.t === 'k' && x.userData.s === loser);
    const center = Board.pos(kp[0], kp[1]);
    const cine = Fx.level === 'cine';
    const toWin = new THREE.Vector3(0, 0, loser === 'r' ? -1 : 1);
    let faceYaw;
    if (cine) {
      faceYaw = Math.atan2(toWin.x, toWin.z);
      document.body.classList.add('cine');
      const side = new THREE.Vector3(1, 0, 0);
      Core.Cam.to(center.clone().addScaledVector(toWin, 3.4).addScaledVector(side, 1.6).add(new THREE.Vector3(0, 1.9, 0)), center.clone().add(new THREE.Vector3(0, 0.35, 0)), 1.6);
    } else {
      const cp = Core.Cam.pos.clone();
      faceYaw = Math.atan2(cp.x - center.x, cp.z - center.z);
      // 精简档：终局时镜头缓缓推近败方主帅（低特效不动）
      if (Fx.level === 'std') {
        const d = cp.clone().sub(center); d.y = 0; d.normalize();
        Core.Cam.to(center.clone().addScaledVector(d, 4.6).add(new THREE.Vector3(0, 3.6, 0)), center.clone().add(new THREE.Vector3(0, 0.3, 0)), 2.6);
      }
    }
    if (km) Fx.sink(km);
    const mate = result.reason === 'checkmate' || result.reason === 'stalemate';
    const tSur = mate ? Camp.surround(winner, center) : (Camp.cheer(winner, 6, 1.3), 0);
    setTimeout(() => Camp.rout(loser), 600);
    const t0 = performance.now();
    try { await Squads.heroDefeat(loser, center, faceYaw, g => { finaleHero = g; }); } catch (e) { console.error(e); }
    if (endSkip) return;
    if (mode === 'ai') await aiSay(winner === aiSide() ? 'win' : 'lose');
    if (endSkip) return;
    const el = (performance.now() - t0) / 1000;
    await Core.sleep(Math.max(1.2, tSur - el + 0.8));
    if (endSkip) return;
    if (cine) { await Core.Cam.to(center.clone().addScaledVector(toWin, 5.5).add(new THREE.Vector3(0, 4.2, 0)), center.clone().add(new THREE.Vector3(0, 0.3, 0)), 2.2); }
    else await Core.sleep(0.8);
  }
  let endSkip = false, endSkipRes = null;
  function finishGame(result) {
    if (ended) return;
    ended = true; endSkip = false;
    const skipP = new Promise(r => { endSkipRes = r; });
    cancelAI();
    closeAsk(); Board.clearMoves();
    updateHud(); publish();
    $('skip').classList.remove('hidden'); $('skip').textContent = '跳过结算 ▸▸';
    anim = anim.then(async () => {
      await Promise.race([Core.sleep(0.8), skipP]);
      if (!endSkip) { try { await Promise.race([boardFinale(result), skipP]); } catch (e) { console.error(e); } }
      Core.Time.skip = false; endSkipRes = null;
      Sfx.Music.stop();
      const persp = mode === 'local' || watching() || !result.winner ? 'win' : (result.winner === mySide ? 'win' : 'lose');
      const W = watching();
      await Ending.play(result, {
        again: W ? () => { Ending.hideCard(); toast('等待棋手开新局…'); } : requestAgain, againText: W ? '继 续 观 战' : '',
        lobby: toLobby, persp, instant: endSkip,
        mine: mode === 'local' || W || !result.winner ? '' : (persp === 'win' ? '你 胜 了' : '你 败 了'),
      });
      if (pendingRestart) { const st = pendingRestart; pendingRestart = null; restart(st === true ? undefined : st); if (mode === 'host') Net.send({ t: 'restart', state: snapshot() }); }
    });
  }
  function requestAgain() {
    if (mode === 'local' || mode === 'ai') { restart(); return; }
    if (mode === 'host') { restart(); Net.send({ t: 'restart', state: snapshot() }); }
    else { Net.send({ t: 'again' }); toast('已请求再来一局…'); }
  }
  let pendingRestart = null;
  function restart(state) {
    Ending.hideCard(); Core.Time.skip = false; pendingJ = null;
    startGame(mode, mySide, watching() && state && state.opts ? state.opts : opts, { state, intro: true });
    if (mode === 'host') publish();
  }
  function toLobby() {
    Net.close(); store.del('host');
    location.href = location.pathname;
  }

  // ---------- 点选 ----------
  $('gl').addEventListener('pointerup', e => {
    if (Core.lastDragMoved > 10 || Core.Cam.cine) return;
    if (dbgOn && game.bf) { const p = Board.pick(e.clientX, e.clientY); if (p) dbgClick(p[0], p[1]); return; }
    if (game.bf && canAct()) { const p = Board.pick(e.clientX, e.clientY); bfClick(p); return; }
    if (!canAct()) {
      if (started && !ended && !busy && online() && Net.connected && game.turn !== mySide) toast('还没轮到你');
      if (started && !ended && mode === 'ai' && game.turn !== mySide) toast(`${NAME[aiSide()]}正在思考`);
      return;
    }
    const p = Board.pick(e.clientX, e.clientY);
    if (!p) { Board.clearMoves(false); sel = null; selMoves = []; return; }
    const [f, r] = p;
    const mv = selMoves.find(m => m.to[0] === f && m.to[1] === r);
    if (sel && mv) { doMove({ from: sel, to: [f, r] }); return; }
    if (sel && game.jq) {
      const bl = game.blockedFrom(sel[0], sel[1]).find(m => m.to[0] === f && m.to[1] === r);
      if (bl) { toast(bl.why === 'check' ? '同一子不能连续将军超过六回合，请换一着' : '同一子不能连续捉同一子超过六回合，请换一着', 2600); return; }
    }
    const pc = game.at(f, r);
    if (pc && pc.s === actor()) {
      if (sel && sel[0] === f && sel[1] === r) { Board.clearMoves(false); sel = null; selMoves = []; return; }
      sel = [f, r];
      selMoves = game.legalFrom(f, r);
      Board.showMoves(sel, selMoves, !!+opts.hints);
      Sfx.select();
      if (!selMoves.length) toast('这枚棋子无路可走');
    } else { Board.clearMoves(false); sel = null; selMoves = []; }
  });

  // ---------- 兵法：选子、技能栏、兵法 ----------
  const SIDE_ARMY = { r: '汉军', b: '楚军' };
  const pname = p => XQ.NAMES[p.s][p.t];
  function exitBfMode(repaint = true) {
    if (bfMode && bfMode.kind === 'pofu' && bfMode.m1) Board.reconcile(game);
    bfMode = null;
    if (repaint) renderBar();
  }
  function bfSelect(f, r) {
    sel = [f, r];
    selMoves = game.legalFrom(f, r).map(m => { const q = game.at(m.to[0], m.to[1]); return { ...m, atk: !!(q && q.hp >= 2) }; });
    Board.showMoves(sel, selMoves, !!+opts.hints);
    Sfx.select();
  }
  function bfClear() { Board.clearMoves(false); sel = null; selMoves = []; }
  function bfClick(p) {
    if (bfMode && bfMode.kind === 'pofu') { pofuClick(p); return; }
    if (bfMode && bfMode.kind === 'sk') {
      const a = p && bfMode.targets.find(x => x.to && x.to[0] === p[0] && x.to[1] === p[1]);
      if (a) { doBF(a); return; }
      exitBfMode(false);
    }
    if (!p) { bfClear(); renderBar(); return; }
    const [f, r] = p;
    const mv = selMoves.find(m => m.to[0] === f && m.to[1] === r);
    if (sel && mv) { doBF({ k: 'mv', from: sel, to: [f, r] }); return; }
    const pc = game.at(f, r);
    if (pc && pc.s === actor()) {
      if (sel && sel[0] === f && sel[1] === r) bfClear();
      else bfSelect(f, r);
    } else bfClear();
    renderBar();
  }
  // 破釜沉舟：先选第一步，再选第二步，两步一起提交
  function pofuClick(p) {
    const M = bfMode;
    const showFrom = (list, from) => { Board.showMoves(from, list.filter(m => m.from[0] === from[0] && m.from[1] === from[1]), true); };
    if (!p) return;
    const [f, r] = p;
    const list = M.m1 ? M.seconds : M.firsts;
    const hit = M.sel && list.find(m => m.from[0] === M.sel[0] && m.from[1] === M.sel[1] && m.to[0] === f && m.to[1] === r);
    if (hit && !M.m1) {
      M.m1 = { from: hit.from, to: hit.to };
      M.seconds = game.pofuSecond(M.m1);
      // 预览第一步：模型挪过去，被吃的子先藏起来
      const pv = game.pofuPreview(M.m1);
      for (const e of pv.ev) {
        if (e.e === 'move') { const m = Board.pieces.get(e.id); if (m) m.position.copy(Board.pos(e.to[0], e.to[1])); }
        if (e.e === 'kill') { const m = Board.pieces.get(e.id); if (m) m.visible = false; }
      }
      M.board = pv.S.board; M.sel = null;
      Board.clearMoves(true); Sfx.place();
      M.hint = '破釜沉舟 · 第二步：选子再走一步'; renderBar();
      return;
    }
    if (hit && M.m1) { doBF({ k: 'art', steps: [M.m1, { from: hit.from, to: hit.to }] }); return; }
    const board = M.m1 ? M.board : game.board;
    const pc = board[r][f];
    if (pc && pc.s === 'b' && list.some(m => m.from[0] === f && m.from[1] === r)) { M.sel = [f, r]; Sfx.select(); showFrom(list, M.sel); }
    else { M.sel = null; Board.clearMoves(false); }
  }
  let barKey = '', barCache = null;
  function bfAvail() {
    const key = game.entries.length + '|' + (sel ? sel.join() : '') + '|' + game.turn + '|' + (game.result ? 1 : 0);
    if (key === barKey && barCache) return barCache;
    barKey = key;
    const side = game.turn, o = { side };
    if (sel) {
      const p = game.at(sel[0], sel[1]);
      if (p && p.s === side) {
        o.p = p; o.cost = game.upgradeCost(p); o.canUp = game.canUpgrade(sel[0], sel[1]);
        o.sk = game.skillOf(p); o.targets = p.lv >= 2 ? game.skillTargets(sel[0], sel[1]) : []; o.cd = game.cdLeft(p);
      }
    }
    o.art = side === 'r' ? game.reviveOptions() : game.pofuFirst();
    o.ult = game.ultReady();
    o.pass = game.mustPass();
    return (barCache = o);
  }
  // 主帅兵法 / 终极兵法不能用的原因：[按钮小字, 点击说明]；能用返回 null
  function artWhy(side, a) {
    if (a.art.length) return null;
    const N = BF.ART_CN[side];
    if (game.used.art[side]) return ['已用', `${N}每局只能用一次，已经用过了`];
    if (side === 'b' && game.fx.sm > 0) return ['涣散中', `四面楚歌：楚军军心涣散，还有 ${game.fx.sm} 回合不能用兵法`];
    if (side === 'r') {
      if (!game.dead.r.length) return ['暂无阵亡', '萧何追韩信复活己方被吃的子；现在还没有子阵亡'];
      return ['原位被占', '阵亡棋子的开局位置被占着（或复活后己方仍被将军），暂时不能复活'];
    }
    return ['无法连走', '破釜沉舟要连走两步普通走子：每步走完己方不被将军，两步走完不能将军对方；现在找不到这样的两步'];
  }
  function ultWhy(side, a) {
    if (a.ult) return null;
    const U = BF.CFG.ultimates, N = BF.ULT_CN[side], m = game.merit[side];
    if (game.used.ult[side]) return ['已用', `${N}每局只能用一次，已经用过了`];
    if (side === 'b' && game.fx.sm > 0) return ['涣散中', `四面楚歌：楚军军心涣散，还有 ${game.fx.sm} 回合不能用兵法`];
    if (m < U.cost) return [`${m}/${U.cost} 功`, `${N}需要 ${U.cost} 军功，现在只有 ${m}`];
    if (side === 'r') {
      const n = game.simianCount(), need = U.simian.minPiecesInRadius;
      if (n < need) return [`将旁 ${n}/${need}`, `四面楚歌还要围住项羽：楚将周围两格内（以楚将为中心的 5×5，棋盘上已标出）至少 ${need} 枚汉军棋子，现在 ${n} 枚`];
    }
    if (XQ.inCheck(game.board, side)) return ['先应将', `正被将军，${N}解不了将，先应将`];
    return ['不可用', `${N}现在不能发动`];
  }
  // 四面楚歌的范围：楚将周围 5×5，标出已在范围内的汉军棋子
  function simianZone() {
    const R = BF.CFG.ultimates.simian.radius;
    let k = null; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = game.at(f, r); if (p && p.s === 'b' && p.t === 'k') k = [f, r]; }
    if (!k) return;
    const hits = [];
    for (let r = k[1] - R; r <= k[1] + R; r++) for (let f = k[0] - R; f <= k[0] + R; f++) { const p = game.at(f, r); if (p && p.s === 'r') hits.push([f, r]); }
    Board.showZone([Math.max(0, k[0] - R), Math.max(0, k[1] - R)], [Math.min(8, k[0] + R), Math.min(9, k[1] + R)], hits);
  }
  const isCompact = () => innerWidth <= 760 || innerWidth / innerHeight < 0.8;
  function renderBar() {
    const bar = $('bfBar');
    const show = !!(game && game.bf && mode && started && !ended && !game.result && canAct() && !dbgOn);
    bar.classList.toggle('hidden', !show);
    if (!show) { $('bfRow').innerHTML = ''; $('bfHint').textContent = ''; return; }
    const B = [];
    let hint = '';
    if (bfMode) {
      hint = bfMode.hint;
      B.push(`<button class="sk" data-a="cancel">取消<small>换一着</small></button>`);
    } else {
      const a = bfAvail();
      // 按钮不可用时不用 disabled（点了没反应像坏了），改成灰色 + 点一下说明原因
      const btn = (cls, act, ok, label, small, why, extra = '') => `<button class="sk ${cls}${ok ? '' : ' off'}" data-a="${act}" ${ok ? '' : `data-why="${why}" title="${why}"`}>${label}<small>${small}</small>${extra}</button>`;
      if (a.p) {
        hint = `${SIDE_ARMY[a.p.s]}${pname(a.p)} · ${['', '一', '二', '三'][a.p.lv]}级 · ${a.p.hp} 血`;
        if (a.p.t !== 'k') {
          if (a.p.lv < 3) {
            const m = game.merit[a.p.s];
            B.push(btn('up', 'up', a.canUp, `升${['', '', '二', '三'][a.p.lv + 1]}级`, game.upgraded ? '本回合已升' : a.cost + ' 功', game.upgraded ? '每次行动最多升级一次，下次行动再升' : `升级需要 ${a.cost} 军功，现在只有 ${m}`));
          }
          const cn = BF.SKILL_CN[a.sk];
          if (a.p.lv < 2) B.push(btn('', 'sk', false, cn, '二级解锁', `${cn}：升到二级才解锁兵种技能`));
          else {
            const cdTot = BF.CFG.skills[a.sk].cooldown;
            const pct = a.cd ? Math.round(a.cd / cdTot * 100) : 0;
            const fx = game.fx, b = a.p.s === 'b';
            let small = '可用', why = '';
            if (b && fx.sm > 0) { small = '涣散中'; why = `四面楚歌：楚军军心涣散，还有 ${fx.sm} 回合不能用技能`; }
            else if (b && fx.pf > 0) { small = '封锁中'; why = `破釜沉舟之后，楚军还有 ${fx.pf} 回合不能用兵种技能`; }
            else if (a.cd) { small = '冷却'; why = `${cn}冷却中，还要 ${a.cd} 回合`; }
            else if (!a.targets.length) { small = '无目标'; why = `${cn}现在没有可用的目标`; }
            B.push(btn('', 'sk', !why, cn, small, why, a.cd ? `<span class="cd" style="--p:${pct}%"></span><span class="cdn">${a.cd}</span>` : ''));
          }
        }
      }
      const side = a.side;
      // 手机：主帅兵法 / 终极兵法放在自己卡片上（点卡片上的签发动），技能栏只在选中棋子时出现，不压棋盘
      if (!isCompact()) {
        const aw = artWhy(side, a), uw = ultWhy(side, a);
        B.push(btn('art', 'art', !aw, BF.ART_CN[side], aw ? aw[0] : '每局一次', aw ? aw[1] : ''));
        B.push(btn('ult', 'ult', !uw, BF.ULT_CN[side], uw ? uw[0] : BF.CFG.ultimates.cost + ' 功', uw ? uw[1] : ''));
      }
      if (a.pass) B.push(`<button class="sk" data-a="pass">停 着<small>无子可走</small></button>`);
      if (!a.p) hint = `${SIDE_ARMY[side]}行动 · 军功 ${game.merit[side]}`;
      if (isCompact()) hint = '';
    }
    if (!B.length) { bar.classList.add('hidden'); $('bfRow').innerHTML = ''; $('bfHint').textContent = ''; layoutHud(); return; }
    $('bfHint').textContent = hint;
    $('bfRow').innerHTML = B.join('');
    $('bfRow').querySelectorAll('button[data-a]').forEach(b => b.onclick = ev => { ev.stopPropagation(); bfButton(b.dataset.a, b); });
    layoutHud();
  }
  async function bfButton(a, el) {
    if (!canAct()) return;
    Sfx.select && Sfx.select();
    if (el && el.classList.contains('off')) {
      toast(el.dataset.why || '现在不能用', 4200);
      if (a === 'ult' && game.turn === 'r' && !game.used.ult.r) simianZone();
      return;
    }
    if (a === 'cancel') { exitBfMode(false); Board.clearMoves(false); if (sel) bfSelect(sel[0], sel[1]); renderBar(); return; }
    if (a === 'up' && sel) { doBF({ k: 'up', at: sel }); return; }
    if (a === 'sk' && sel) {
      const av = bfAvail(), cn = BF.SKILL_CN[av.sk];
      if (av.targets.length === 1 && !av.targets[0].to) { doBF(av.targets[0]); return; }
      bfMode = { kind: 'sk', targets: av.targets, hint: `${cn}：点选目标（${{ chongzhen: '冲向敌子', taying: '无视马腿', pili: '炮击敌子', qishe: '斜线两格内', jianta: '落点四周溅伤' }[av.sk] || ''}）` };
      Board.showMoves(sel, av.targets.map(t => ({ from: t.at, to: t.to, atk: true })), true);
      renderBar(); return;
    }
    if (a === 'art') {
      if (game.turn === 'r') {
        const opts2 = game.reviveOptions();
        const id = await pick('萧 何 追 韩 信', '复活一枚被吃的子，放回它的开局位置（一级）。', opts2.map(o => ({ v: o.id, label: XQ.NAMES.r[o.t], cls: 'r' })));
        if (id != null && canAct()) doBF({ k: 'art', id: +id });
        return;
      }
      bfClear();
      bfMode = { kind: 'pofu', firsts: game.pofuFirst(), hint: '破釜沉舟 · 第一步：选子走一步（两步走完不能将军）' };
      renderBar(); return;
    }
    if (a === 'ult') {
      const s = game.turn;
      if (s === 'r') simianZone();
      const ok = await ask(BF.ULT_CN[s], s === 'b' ? '花 20 军功：汉方接下来 2 回合，汉帅不能移动，也不能被护驾换位。' : '花 20 军功：楚方接下来 2 回合军心涣散——除楚将外只能吃子或攻击，不能用任何技能。', 0, '发 动', '再想想');
      if (ok && canAct()) doBF({ k: 'ult' });
      return;
    }
    if (a === 'pass') doBF({ k: 'pass' });
  }
  function pick(title, text, items) {
    return new Promise(res => {
      $('pickT').textContent = title; $('pickP').textContent = text;
      $('pickList').innerHTML = items.map(i => `<button class="btn small ${i.cls || ''}" data-v="${i.v}">${i.label}</button>`).join('');
      $('mPick').classList.remove('hidden');
      const fin = v => { $('mPick').classList.add('hidden'); res(v); };
      $('pickList').querySelectorAll('button').forEach(b => b.onclick = () => fin(b.dataset.v));
      $('pickNo').onclick = () => fin(null);
    });
  }
  // 执行一条兵法行动（本地或对手发来）
  function doBF(e, remote = false, clk) {
    if (e.k === 'art' && e.steps) Board.reconcile(game);
    const note = bfNote(game, e);
    const info = game.apply(e);
    if (!info) { if (!remote) toast('这一步不合法'); return false; }
    bfMode = null; sel = null; selMoves = []; Board.clearMoves();
    barKey = '';
    if (!remote && online()) Net.send({ t: 'bf', n: game.entries.length - 1, e, clk: clock[info.side] });
    if (e.k === 'up') {
      bfUpNote = note;
      bfReport(info); bfMerit(info);
      queueBF(info);
      updateHud(); publish();
      if (!remote) setTimeout(() => { if (canAct() && game.turn === info.side) { const p = game.board.flat().find(x => x && x.id === info.id); const pos = p && (() => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (game.board[r][f] === p) return [f, r]; })(); if (pos) { bfSelect(pos[0], pos[1]); renderBar(); } } }, 50);
      return true;
    }
    notes.push((bfUpNote ? bfUpNote + ' ' : '') + note); bfUpNote = ''; renderLog();
    Fx.ply = game.history.length;
    if (remote && clk != null) clock[info.mover] = clk;
    clock.step = stepMax(); clock.oppStamp = 0;
    turnStartAt = 0;
    info.captured = info.cap; info.streak = captureStreak();
    bfReport(info); bfMerit(info);
    queueBF(info);
    updateHud(); publish();
    return true;
  }
  function queueBF(info) {
    busy++;
    $('skip').classList.remove('hidden'); $('skip').textContent = '跳过 ▸▸';
    anim = anim.then(async () => {
      await BFX.play(info, BF.view(info.after));
      if (info.k !== 'up' && info.from) Board.showLast(info.from, info.to || info.from);
    }).catch(e => console.error(e)).then(() => {
      busy--;
      Core.Time.skip = false;
      if (!busy) $('skip').classList.add('hidden');
      if (!busy) Board.reconcile(game);
      if (info.k === 'up') { updateHud(); return; }
      clock.step = stepMax(); clock.last = performance.now();
      if (online() && game.turn === mySide) Net.send({ t: 'clk', side: mySide, total: clock[mySide], step: clock.step });
      const kills = game.history.reduce((n, h) => n + (h.kills ? h.kills.length : 0), 0);
      Sfx.Music.setIntensity(game.result ? 1 : game.inCheck() ? 0.95 : Math.min(0.72, 0.32 + kills * 0.03));
      afterMoveLines(info);
      if (info.captured) Spect.react(info.mover);
      if (!busy && game.turn === mySide) { turnStartAt = performance.now(); slowIdx = 0; }
      updateHud();
      if (game.mustPass() && canAct() && (mode === 'local' || game.turn === mySide)) toast(`${SIDE_CN[game.turn]}方无子可走，请点「停着」`, 2600);
      if (info.result && !busy) finishGame(info.result);
    });
  }
  // 战报
  function bfReport(info) {
    const s = info.side, o = other(s), ev = info.ev || [];
    const bd = info.before ? info.before.board : game.board;
    const at = a => (a ? bd[a[1]][a[0]] : null);
    const nm = (side, t) => SIDE_ARMY[side] + XQ.NAMES[side][t];
    const kills = ev.filter(x => x.e === 'kill'), hits = ev.filter(x => x.e === 'hit');
    let line = null;
    if (info.k === 'up') line = `${nm(s, info.t)}升为${['', '一', '二', '三'][info.lv]}级`;
    else if (info.k === 'mv') {
      const P0 = at(info.from), T0 = at(info.to);
      const died = kills.find(k => P0 && k.id === P0.id);
      if (died && T0) line = `${nm(o, T0.t)}立拒马，${nm(s, P0.t)}撞阵身亡`;
      else if (T0 && kills.some(k => k.id === T0.id)) line = `${nm(s, P0.t)}击杀${nm(o, T0.t)}`;
      else if (T0) line = `${nm(s, P0.t)}强攻${nm(o, T0.t)}，未能拿下`;
      else if (info.check) line = `${nm(s, P0.t)}将军！`;
    } else if (info.k === 'sk') {
      const P0 = at(info.from), sk = info.extra.sk, cn = BF.SKILL_CN[sk];
      const foe = kills.filter(k => k.s === o), hurt = hits.filter(h => true);
      if (sk === 'juma') line = `${nm(s, P0.t)}立起拒马`;
      else if (sk === 'hujia') line = `${nm(s, P0.t)}护驾，与${s === 'r' ? '汉王' : '霸王'}换位`;
      else if (sk === 'chongzhen') line = foe.length >= 2 ? `${SIDE_ARMY[s]}车冲阵，连破${SIDE_ARMY[o]}两阵` : foe.length ? `${SIDE_ARMY[s]}车冲阵，击破${nm(o, foe[0].t)}` : `${SIDE_ARMY[s]}车冲阵受阻`;
      else line = `${nm(s, P0.t)}${cn}` + (foe.length ? `，击杀${foe.map(k => XQ.NAMES[o][k.t]).join('、')}` : '') + (hurt.length ? `，${hurt.length} 子负伤` : '');
    } else if (info.k === 'art') line = s === 'r' ? `萧何月下追韩信：${nm('r', (ev.find(x => x.e === 'revive') || {}).t || 'p')}重回阵前` : `项羽破釜沉舟，楚军连进两步` + (kills.length ? `，击杀${kills.filter(k => k.s === o).map(k => XQ.NAMES[o][k.t]).join('、')}` : '');
    else if (info.k === 'ult') line = s === 'b' ? '鸿门宴：汉王两回合不得移动' : '四面楚歌：楚军军心涣散';
    else if (info.k === 'pass') line = `${SIDE_ARMY[s]}按兵不动`;
    if (!line) return;
    const L = $('bfReport'); L.classList.remove('hidden');
    const li = document.createElement('li'); li.className = s; li.textContent = line; L.appendChild(li);
    const max = document.body.classList.contains('compact') ? 1 : 4;
    while (L.children.length > max) L.firstChild.remove();
    setTimeout(() => { li.classList.add('old'); setTimeout(() => li.remove(), 900); }, 7000);
  }
  // 军功变动：卡片上飘字
  function bfMerit(info) {
    const sum = { r: 0, b: 0 }, why = { r: [], b: [] };
    for (const x of info.ev || []) if (x.e === 'merit') { sum[x.s] += x.n; if (!why[x.s].includes(x.why)) why[x.s].push(x.why); }
    if (info.k === 'up') sum[info.side] -= BF.CFG.upgrade.cost[info.t][info.lv - 2];
    if (info.k === 'ult') sum[info.side] -= BF.CFG.ultimates.cost;
    for (const s of ['r', 'b']) {
      if (!sum[s]) continue;
      const el = cardFor(s).querySelector('.mer'); if (!el) continue;
      const rc = el.getBoundingClientRect();
      const d = document.createElement('div'); d.className = 'merpop';
      d.textContent = (sum[s] > 0 ? '+' : '') + sum[s] + ' 功' + (why[s].length && sum[s] > 0 ? ' · ' + why[s].join('') : '');
      d.style.left = (rc.left) + 'px'; d.style.top = (rc.top - 6) + 'px';
      document.body.appendChild(d); setTimeout(() => d.remove(), 1500);
    }
  }

  // ---------- 兵法调试：自由摆子、改军功等级生命、回合 ----------
  const DBG_TYPES = ['k', 'a', 'e', 'n', 'r', 'c', 'p'];
  function dbgPaint() {
    $('dbgPal').innerHTML = ['r', 'b'].map(s => DBG_TYPES.map(t => `<button class="${s}${dbgPick && dbgPick.s === s && dbgPick.t === t ? ' on' : ''}" data-s="${s}" data-t="${t}">${XQ.NAMES[s][t]}</button>`).join('')).join('') + `<button data-s="" data-t="" class="${dbgPick && !dbgPick.t ? 'on' : ''}">空</button>`;
    $('dbgPal').querySelectorAll('button').forEach(b => b.onclick = () => { dbgPick = b.dataset.t ? { s: b.dataset.s, t: b.dataset.t } : { t: '' }; dbgPaint(); });
    const p = dbgSel && game.at(dbgSel[0], dbgSel[1]);
    $('dbgSel').textContent = p ? `${SIDE_ARMY[p.s]}${pname(p)} · ${p.lv}级 · ${p.hp}血 · 冷却${game.cdLeft(p)}` : '—';
    $('dbgMr').value = game.merit.r; $('dbgMb').value = game.merit.b; $('dbgRound').value = game.round;
  }
  function dbgApply(fn) {
    game.setup(fn);
    notes = []; bfUpNote = ''; renderLog();
    Board.setPosition(game); Board.faceViewer(viewSide); Board.showLast(null);
    barKey = ''; dbgPaint(); updateHud();
  }
  function dbgClick(f, r) {
    if (dbgPick) {
      dbgApply(T => {
        if (!dbgPick.t) { const q = T.board[r][f]; if (q && q.t !== 'k') T.board[r][f] = null; return; }
        const ids = T.board.flat().filter(Boolean).map(x => x.id).concat(T.dead.r.map(x => x.id), T.dead.b.map(x => x.id));
        if (dbgPick.t === 'k') { for (let rr = 0; rr < 10; rr++) for (let ff = 0; ff < 9; ff++) { const q = T.board[rr][ff]; if (q && q.t === 'k' && q.s === dbgPick.s) T.board[rr][ff] = null; } }
        const old = T.board[r][f]; if (old && old.t === 'k') return;
        T.board[r][f] = { s: dbgPick.s, t: dbgPick.t, id: Math.max(31, ...ids) + 1, lv: 1, hp: 1, cd: 0, jm: 0 };
      });
      dbgSel = [f, r]; dbgPaint(); return;
    }
    dbgSel = game.at(f, r) ? [f, r] : null; dbgPaint();
    if (dbgSel) Board.showMoves(dbgSel, [], false); else Board.clearMoves(false);
  }
  function dbgPiece(fn) { if (!dbgSel) return; dbgApply(T => { const p = T.board[dbgSel[1]][dbgSel[0]]; if (p && p.t !== 'k') fn(p); }); }
  $('bfDebug').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => dbgPiece(p => { p.lv = +b.dataset.lv; p.hp = BF.CFG.hp[p.lv - 1]; }));
  $('bfDebug').querySelectorAll('[data-hp]').forEach(b => b.onclick = () => dbgPiece(p => { p.hp = Math.max(1, Math.min(BF.CFG.hp[p.lv - 1], p.hp + +b.dataset.hp)); }));
  $('dbgCd').onclick = () => dbgApply(T => { for (const p of T.board.flat()) if (p) { p.cd = 0; p.jm = 0; } });
  $('dbgMr').onchange = () => dbgApply(T => { T.merit.r = Math.max(0, Math.min(30, +$('dbgMr').value || 0)); });
  $('dbgMb').onchange = () => dbgApply(T => { T.merit.b = Math.max(0, Math.min(30, +$('dbgMb').value || 0)); });
  $('dbgRound').onchange = () => dbgApply(T => { const n = Math.max(1, +$('dbgRound').value || 1) - 1; T.cnt = T.turn === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.fx = { hm: 0, sm: 0, pf: 0 }; T.ckHist = { r: [], b: [] }; });
  $('bfDebug').querySelectorAll('[data-turn]').forEach(b => b.onclick = () => dbgApply(T => { const n = Math.min(T.cnt.r, T.cnt.b); T.turn = b.dataset.turn; T.cnt = T.turn === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.upgraded = false; }));
  $('dbgArts').onclick = () => dbgApply(T => { T.used = { art: { r: 0, b: 0 }, ult: { r: 0, b: 0 } }; });
  $('dbgFx').onclick = () => dbgApply(T => { T.fx = { hm: 0, sm: 0, pf: 0 }; });
  $('dbgClear').onclick = () => dbgApply(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.t !== 'k') T.board[r][f] = null; } });
  $('dbgReset').onclick = () => { game = new BF.Game(); dbgApply(() => { }); };
  $('dbgClose').onclick = () => { dbgOn = false; dbgPick = null; $('bfDebug').classList.add('hidden'); Board.clearMoves(false); updateHud(); };
  $('tDebug').onclick = () => { if (!game.bf || mode !== 'local') return; dbgOn = !dbgOn; $('bfDebug').classList.toggle('hidden', !dbgOn); if (dbgOn) { dbgPick = null; dbgSel = null; dbgPaint(); toast('调试摆子：选子后点棋盘；改完关掉面板即可接着下'); } updateHud(); };

  // ---------- 悔棋 ----------
  function undoPlies(side) { return game.turn === side ? 2 : 1; }
  function canUndo() {
    if (!started || ended || busy || game.result || !opts.undo || pendingUndo || pendingJ) return false;
    const s = actor();
    if (mode === 'local') return game.history.length > 0 && (opts.undo >= 99 || undoUsed[XQ.other(game.turn)] < opts.undo);
    if (opts.undo < 99 && undoUsed[s] >= opts.undo) return false;
    const n = undoPlies(s);
    if (game.history.length < n) return false;
    if (mode === 'ai') return true;
    return online() ? Net.connected : true;
  }
  async function requestUndo() {
    if (!canUndo()) { if (opts.undo && started && !game.result) toast(opts.undo < 99 && undoUsed[actor()] >= opts.undo ? '悔棋次数已用完' : '现在不能悔棋'); return; }
    if (mode === 'local') {
      const who = XQ.other(game.turn); // 刚走完的一方
      const ok = await ask('悔 棋', `${SIDE_CN[who]}方请求悔棋一步，${SIDE_CN[game.turn]}方是否同意？`);
      if (ok) applyUndo(1, who); else toast('对方不同意');
      return;
    }
    if (mode === 'ai') {
      const plies = undoPlies(mySide);
      cancelAI();
      applyUndo(plies, mySide);
      aiSay('undo');
      return;
    }
    const plies = undoPlies(mySide);
    pendingUndo = { n: game.history.length, plies, side: mySide };
    Net.send({ t: 'undoReq', n: game.history.length, plies });
    toast('已请求悔棋，等待对方同意…', 3000);
    updateHud();
    setTimeout(() => { if (pendingUndo && pendingUndo.side === mySide && pendingUndo.n === game.history.length) { pendingUndo = null; updateHud(); } }, 22000);
  }
  // 兵法：悔棋 = 按行动序列重放到悔棋前（军功、等级、生命、冷却、状态全部还原），棋盘墨晕一下重新摆好
  async function bfRewind(n) {
    bfMode = null; barKey = '';
    Sfx.B.whoosh(0, 0.5, 0.3); Sfx.B.bell(0.1, 660, 0.08);
    for (const m of Board.pieces.values()) Fx.P.ink(m.position.clone().setY(Board.TOP + 0.1), 2, 0.3, 0.25, 0.5);
    await Core.sleep(0.25);
    game.rebuild(n);
    rebuildNotes();
    Board.setPosition(game); Board.faceViewer(viewSide);
    const last = game.history[game.history.length - 1];
    Board.showLast(last && last.from ? last.from : null, last && last.from ? (last.to || last.from) : null);
  }
  function bfUndoTarget(plies) {
    const E = game.entries; let n = E.length, left = plies;
    while (n > 0 && left > 0) { n--; if (E[n].k !== 'up') left--; }
    while (n > 0 && E[n - 1].k === 'up') n--;
    return n;
  }
  function applyUndo(plies, side) {
    undoUsed[side]++;
    Board.clearMoves(); sel = null; selMoves = [];
    busy++;
    anim = anim.then(async () => {
      if (game.bf) { await bfRewind(bfUndoTarget(plies)); return; }
      for (let i = 0; i < plies; i++) { const h = game.undo(); if (h) { notes.pop(); await Fx.undoMove(h, game.at(h.from[0], h.from[1])); } }
      const last = game.history[game.history.length - 1];
      Board.showLast(last ? last.from : null, last ? last.to : null);
    }).catch(e => console.error(e)).then(() => {
      busy--; clock.step = stepMax(); clock.last = performance.now(); pendingUndo = null;
      Fx.ply = game.history.length;
      renderLog();
      if (mode !== 'ai') toast(`${SIDE_CN[side]}方悔棋`);
      turnStartAt = performance.now(); slowIdx = 0;
      updateHud(); publish();
      maybeAI();
    });
  }

  // ---------- 喊话 ----------
  const bubT = {};
  function bubble(side, text, ms = 3500) {
    const mine = side === bottomSide();
    const el = mine ? $('bubMe') : $('bubOpp');
    el.querySelector('b').textContent = `${SIDE_CN[side]} · ${NAME[side]}`;
    el.querySelector('span').textContent = text;
    el.classList.add('on');
    clearTimeout(bubT[mine]); bubT[mine] = setTimeout(() => el.classList.remove('on'), ms);
  }
  let lastEmote = 0;
  function emote(side, i, text) {
    if (i != null) { bubble(side, PHRASES[i]); Voice.play(`${side}_t${i}`); }
    else { bubble(side, text); Sfx.B.shime(0, 0.4); Sfx.B.shime(0.12, 0.3); }
  }
  function sendEmote(i, text) {
    if (Date.now() - lastEmote < 1500) { toast('喊话太快了'); return; }
    lastEmote = Date.now();
    const side = actor();
    if (online()) { if (!Net.connected) { toast('对手不在线'); return; } Net.send({ t: 'emote', i, text }); }
    emote(side, i, text);
    $('chat').classList.add('hidden');
    if (mode === 'ai' && Math.random() < 0.7) setTimeout(() => { if (!ended) aiSay('reply'); }, 2300);
  }
  function setupChat() {
    const W = watching();
    $('chatT').textContent = W ? '观 众 拱 火' : '阵 前 喊 话';
    $('watchOpts').classList.toggle('hidden', !W);
    const list = W ? SPEC_PHRASES : PHRASES;
    $('phr').innerHTML = list.map((p, i) => `<button data-i="${i}">${p}</button>`).join('');
    $('phr').querySelectorAll('button').forEach(b => b.onclick = () => (watching() ? specSay(+b.dataset.i) : sendEmote(+b.dataset.i)));
    if (W) { $('wName').textContent = `名号：${myName}`; paintAlleg(); }
  }
  setupChat();
  const sendFree = () => { const v = $('chatIn').value.trim().replace(/[<>]/g, '').slice(0, 24); if (!v) return; $('chatIn').value = ''; watching() ? specSay(null, v) : sendEmote(null, v); };
  $('chatSend').onclick = sendFree;
  $('chatIn').addEventListener('keydown', e => { if (e.key === 'Enter') sendFree(); });
  $('tChat').onclick = () => { $('chat').classList.remove('hidden'); };
  $('chatClose').onclick = () => $('chat').classList.add('hidden');

  // ---------- 联机消息 ----------
  function onData(d) {
    switch (d.t) {
      case 'join':
        if (Net.role !== 'host') return;
        // 揭棋：来人手里没有这局的密钥（换了设备/新棋手接替），无法继续揭子 → 重新洗牌开局
        if (mode === 'host' && game.jq && JK && d.jg !== JK.gid && game.history.length && !game.result && !ended) {
          toast('对手换了设备入座，揭棋重新洗牌开局', 3200);
          restart(); Net.send({ t: 'restart', state: snapshot() });
          return;
        }
        if (!mode && !mode_starting) { mode_starting = true; startGame('host', hostSide, opts).then(() => { mode_starting = false; }); toast('对手已入局'); }
        Net.send({ t: 'welcome', state: snapshot() });
        break;
      case 'welcome':
        if (mode === 'guest' && started) { syncFrom(d.state); return; }
        if (mode) return;
        clearInterval(joinTimer);
        hostSide = d.state.hostSide;
        startGame('guest', other(d.state.hostSide), d.state.opts, { state: d.state, intro: !(d.state.moves || []).length });
        break;
      case 'full': if (!mode && !enteringWatch) enterWatch(Net.code); break;
      case 'vacant':
        if (mode || enteringWatch || vacantAsked) break;
        vacantAsked = true;
        ask('入 座 或 观 战', '这局对手的座位空着（原棋手已离线）。要接替他继续下，还是入席观战？', 0, '接替入座', '观 战').then(yes => {
          if (mode) return;
          if (yes) { Net.send({ t: 'claim' }); $('joinNote').innerHTML = '<span class="spin"></span>正在入座…'; }
          else enterWatch(Net.code);
        });
        break;
      case 'sync': case 'restart':
        if (mode !== 'guest') return;
        if (d.t === 'restart') { if (Ending.running) { pendingRestart = d.state; Ending.skip(); toast('对手开始了新的一局'); } else restart(d.state); return; }
        syncFrom(d.state); break;
      case 'syncReq': if (mode === 'host') Net.send({ t: 'sync', state: snapshot() }); break;
      case 'again':
        if (mode !== 'host') break;
        if (Ending.running) { pendingRestart = true; Ending.skip(); toast('对手请求再来一局'); }
        else { restart(); Net.send({ t: 'restart', state: snapshot() }); }
        break;
      case 'move': {
        // 揭棋：对方没收到我的揭示而重发了这步 → 再发一次揭示
        if (lastJx && d.n === lastJx.n && d.n === game.history.length - 1) { Net.send(lastJx); return; }
        if (d.n !== game.history.length) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
        const m = { from: d.from, to: d.to };
        if (game.jq && (d.ri || d.wc)) {
          const r = jqRespond(d);
          if (!r) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
          if (r.rv) m.rv = r.rv; if (r.cj != null) m.cj = r.cj;
        }
        if (!doMove(m, true, d.clk)) Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() });
        break;
      }
      case 'jx': jqResolve(d); break;
      case 'bf': {
        if (!game.bf) return;
        const E = game.entries;
        if (d.n < E.length && JSON.stringify(E[d.n]) === JSON.stringify(d.e)) return; // 重发的旧行动
        if (d.n !== E.length) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
        if (game.turn === mySide) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
        if (!doBF(d.e, true, d.clk)) Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() });
        break;
      }
      case 'jqc':
        if (mode !== 'host' || !JK || d.gid !== JK.gid || !Jieqi.validCommits(d.cin) || !Jieqi.validCommits(d.cout)) break;
        {
          const opp = other(mySide);
          const same = JSON.stringify(JC.cin[opp]) === JSON.stringify(d.cin) && JSON.stringify(JC.cout[mySide]) === JSON.stringify(d.cout);
          if (same) break;
          if (game.history.length && JC.cin[opp]) { jqWarn('中途更换承诺'); break; }
          JC.cin[opp] = d.cin; JC.cout[mySide] = d.cout;
          publish(); updateHud();
        }
        break;
      case 'clk':
        if (d.side === mySide) return;
        clock[d.side] = d.total; clock.oppTotal = d.total; clock.oppStep = d.step; clock.oppStamp = performance.now();
        break;
      case 'undoReq':
        if (d.n !== game.history.length || busy) { Net.send({ t: 'undoRes', ok: false, n: d.n }); return; }
        pendingUndo = { n: d.n, plies: d.plies, side: other(mySide) }; updateHud();
        ask('对 手 请 求 悔 棋', `对手想退回 ${d.plies} 步（${d.plies === 2 ? '你的上一步也会退回' : '只退回他自己的一步'}），是否同意？`, 15).then(ok => {
          Net.send({ t: 'undoRes', ok, n: d.n, plies: d.plies });
          pendingUndo = null;
          if (ok) applyUndo(d.plies, other(mySide)); else updateHud();
        });
        break;
      case 'undoRes':
        if (!pendingUndo || pendingUndo.side !== mySide) return;
        if (d.ok && d.n === game.history.length) applyUndo(d.plies, mySide);
        else { pendingUndo = null; toast('对手拒绝了悔棋'); updateHud(); }
        break;
      case 'resign': { const r = game.resign(d.side); if (r) { toast('对手认输'); finishGame(r); } break; }
      case 'timeout': { const r = game.timeout(d.side); if (r) { toast('对手超时'); finishGame(r); } break; }
      case 'emote': emote(other(mySide), d.i ?? null, typeof d.text === 'string' ? d.text.replace(/[<>]/g, '').slice(0, 24) : ''); break;
      case 'bye': toast('对手离开了房间', 3000); break;
    }
  }
  let mode_starting = false;
  function syncFrom(st) {
    if (!st) return;
    // 揭棋：房主那边已是新的一局（换了牌）→ 跟着重开
    if (game.jq && st.jq && JK && st.jq.gid !== JK.gid) { restart(st); return; }
    if (game.jq && st.jq && st.jq.cin) { const opp = other(mySide); if (!JC.cin[opp] && Jieqi.validCommits(st.jq.cin[opp])) JC.cin[opp] = st.jq.cin[opp]; if (!JC.cout[mySide] && Jieqi.validCommits(st.jq.cout && st.jq.cout[mySide])) JC.cout[mySide] = st.jq.cout[mySide]; }
    if (game.jq && st.jq && JK && !(st.jq.cin && st.jq.cin[mySide])) Net.send({ t: 'jqc', gid: JK.gid, ...Jieqi.pub(JK) });
    if (game.bf) { bfSync(st, false); return; }
    const mine = game.history, theirs = st.moves || [];
    const same = (a, b) => a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
    const prefix = (a, b) => a.length <= b.length && a.every((m, i) => same(m, b[i]));
    if (prefix(mine, theirs)) { for (const m of theirs.slice(mine.length)) doMove({ from: m.from, to: m.to, rv: m.rv, cj: m.cj }, true); }
    else if (prefix(theirs, mine) && mine.length - theirs.length === 1 && game.turn !== mySide) { const m = mine[mine.length - 1]; Net.send({ t: 'move', n: mine.length - 1, from: m.from, to: m.to, clk: clock[mySide] }); }
    else { applyState(st); }
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) };
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function onPeer(s) {
    if (s === 'ok' && mode === 'guest' && started) Net.send({ t: 'syncReq' });
    if (s === 'lost') lostSince = Date.now(); else lostSince = 0;
    updateHud();
  }
  let lostSince = 0, claimAsked = false;
  setInterval(() => {
    if (!online() || !started || ended || game.result || !lostSince) { claimAsked = false; return; }
    if (Date.now() - lostSince > 90000 && !claimAsked) {
      claimAsked = true;
      ask('对 手 离 线', '对手已离线超过 90 秒。要判对手负吗？', 0, '判对手负', '继续等待').then(ok => {
        if (ok && !game.result) { const r = game.timeout(other(mySide)); if (r) finishGame(r); }
      });
    }
  }, 5000);
  function onLine(n, total) {
    const t = n ? `线路已连接 ${n}/${total}` : '正在连接线路…';
    $('waitLine').textContent = t; $('joinLine').textContent = t;
    if (mode) updateHud();
  }

  // ---------- 观战 ----------
  const SPEC_PHRASES = ['这步臭棋！', '将他！将他！', '车都不要了？', '快吃啊！', '妙手！', '下快点，看睡着了', '汉军威武！', '楚军必胜！'];
  let myName = store.get('specName', ''), myAlleg = 'n', lastSpecSay = 0, enteringWatch = false, specTimer = null, vacantAsked = false;
  const cleanTxt = t => String(t || '').replace(/[<>]/g, '').slice(0, 24);
  function feed(p, text) {
    if (!p) return;
    const li = document.createElement('li'); li.className = p.a;
    li.innerHTML = '<b></b><span></span>';
    li.querySelector('b').textContent = p.name; li.querySelector('span').textContent = text;
    const F = $('specFeed'); F.appendChild(li);
    while (F.children.length > 40) F.firstChild.remove();
    F.scrollTop = F.scrollHeight;
    $('specBox').classList.remove('hidden');
  }
  // 收到观众频道消息（棋手和观众都会收到）
  function onSpec(d) {
    if (!d || !d._p) return;
    if (d.t === 'sbye') { const p = Spect.get(d._p); if (p) feed(p, '离席'); Spect.remove(d._p); updateHud(); return; }
    const isNew = !Spect.has(d._p);
    const p = Spect.upsert(d._p, d.n, d.a, false);
    if (!p) return;
    if (isNew) { feed(p, '入席观战'); if (mode && !watching()) toast(`「${p.name}」入席观战`); }
    if (d.t === 'say') {
      const text = d.i != null ? SPEC_PHRASES[d.i] : cleanTxt(d.text);
      if (!text) return;
      Spect.say(d._p, text); feed(p, text);
      Sfx.B.shout(0, 4, 0.045, 0.5);
    } else if (d.t === 'laugh') {
      Spect.laugh(d._p); feed(p, '哈哈哈哈哈！'); Sfx.smp('laugh', { vol: 0.7, rj: 0.05 });
    } else if (d.t === 'side') feed(p, d.a === 'n' ? '回到中立看台' : `站到${d.a === 'r' ? '汉' : '楚'}军一边`);
    updateHud();
  }
  setInterval(() => {
    let changed = false;
    for (const p of [...Spect.people.values()]) if (!p.self && Date.now() - p.seen > 14000) { Spect.remove(p.id); changed = true; }
    if (changed) updateHud();
  }, 3000);
  function enterWatch(code) {
    enteringWatch = true;
    clearInterval(joinTimer);
    Net.close(true);
    $('joinNote').innerHTML = '这局已有两位棋手，你可以入席观战。';
    $('nameIn').value = myName || '';
    $('nameIn').placeholder = Spect.randomName();
    $('mName').classList.remove('hidden');
    $('nameRnd').onclick = () => { $('nameIn').value = Spect.randomName(); };
    $('nameGo').onclick = () => {
      myName = ($('nameIn').value.trim() || $('nameIn').placeholder).replace(/[<>]/g, '').slice(0, 8);
      store.set('specName', myName);
      $('mName').classList.add('hidden');
      startWatch(code);
    };
  }
  function specHello() { if (Net.role === 'watch') Net.sendSpec({ t: 'sp', n: myName, a: myAlleg }); }
  function startWatch(code) {
    Sfx.init(); applySettings();
    $('joinNote').innerHTML = '<span class="spin"></span>正在入席…';
    Net.watch(code, {
      line(n, total) { onLine(n, total); if (n) specHello(); },
      room: onWatchRoom,
      data(d, ch) {
        const side = ch === 'h' ? hostSide : other(hostSide);
        if (d.t === 'emote') emote(side, d.i ?? null, cleanTxt(d.text));
        else if (d.t === 'bye') toast(`${SIDE_CN[side]}方棋手离开了房间`);
      },
      spec: onSpec,
    });
    clearInterval(specTimer);
    specTimer = setInterval(specHello, 4000);
    // 观战席满员（8 人）则请他稍后再来
    setTimeout(() => {
      const others = [...Spect.people.values()].filter(p => !p.self).length;
      if (others >= Spect.MAX) ask('观 战 席 已 满', `已有 ${Spect.MAX} 位观众，请稍后再来。`, 0, '返回大厅', '留下').then(ok => { if (ok) leaveGame(); });
    }, 4500);
  }
  function onWatchRoom(d) {
    if (!d || !d.v || !d.opts) return;
    hostSide = d.hostSide || 'r';
    watchWaiting = !!d.waiting;
    if (mode !== 'watch') {
      startGame('watch', 'r', d.opts, { state: d, intro: false }).then(() => updateHud());
      Spect.upsert(Net.myPid, myName, myAlleg, true);
      specHello();
      toast(`你以「${myName}」的名号入席观战`, 2600);
      return;
    }
    syncWatch(d);
  }
  // 兵法：按行动序列对齐（快照里是完整的行动序列，重放即可还原全部状态）
  function bfSync(st, watch) {
    const E = game.entries, T = st.bfe || [];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const prefix = (a, b) => a.length <= b.length && a.every((x, i) => same(x, b[i]));
    if (prefix(E, T)) { for (const e of T.slice(E.length)) if (!doBF(e, true)) { applyState(st); break; } }
    else if (prefix(T, E)) {
      const extra = game.sides.slice(T.length);
      if (!watch && extra.length && extra.every(x => x === mySide)) { E.slice(T.length).forEach((e, i) => Net.send({ t: 'bf', n: T.length + i, e, clk: clock[mySide] })); }
      else if (!game.result) {
        busy++;
        anim = anim.then(() => bfRewind(T.length)).catch(e => console.error(e)).then(() => { busy--; Fx.ply = game.history.length; renderLog(); updateHud(); });
        if (watch) toast('棋手悔棋');
      }
    } else applyState(st);
    if (st.clk) { clock.r = st.clk.r; clock.b = st.clk.b; }
    if (st.step != null) clock.step = st.step;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) };
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function syncWatch(st) {
    if (game.bf) {
      const T = st.bfe || [];
      if (!T.length && !st.result && (game.entries.length || game.result || ended)) { if (Ending.running) { pendingRestart = st; Ending.skip(); } else restart(st); return; }
      bfSync(st, true); return;
    }
    const theirs = st.moves || [], mine = game.history;
    if (!theirs.length && !st.result && (mine.length || game.result || ended)) {
      if (Ending.running) { pendingRestart = st; Ending.skip(); } else restart(st);
      return;
    }
    const same = (a, b) => a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
    const prefix = (a, b) => a.length <= b.length && a.every((m, i) => same(m, b[i]));
    if (prefix(mine, theirs)) { for (const m of theirs.slice(mine.length)) doMove({ from: m.from, to: m.to, rv: m.rv }, true); }
    else if (prefix(theirs, mine) && !game.result) {
      const n = mine.length - theirs.length;
      busy++;
      anim = anim.then(async () => { for (let i = 0; i < n; i++) { const h = game.undo(); if (h) { notes.pop(); await Fx.undoMove(h, game.at(h.from[0], h.from[1])); } } })
        .catch(e => console.error(e)).then(() => { busy--; Fx.ply = game.history.length; renderLog(); const l = game.history[game.history.length - 1]; Board.showLast(l ? l.from : null, l ? l.to : null); updateHud(); });
      toast('棋手悔棋');
    } else if (!prefix(mine, theirs)) applyState(st);
    if (st.clk) { clock.r = st.clk.r; clock.b = st.clk.b; }
    if (st.step != null) clock.step = st.step;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) };
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function specSay(i, text) {
    if (Date.now() - lastSpecSay < 3000) { toast('说得太快了，歇口气'); return; }
    lastSpecSay = Date.now();
    const msg = i != null ? SPEC_PHRASES[i] : cleanTxt(text);
    if (!msg) return;
    Net.sendSpec(i != null ? { t: 'say', n: myName, a: myAlleg, i } : { t: 'say', n: myName, a: myAlleg, text: msg });
    Spect.say(Net.myPid, msg); feed(Spect.get(Net.myPid), msg);
    Sfx.B.shout(0, 4, 0.045, 0.5);
    $('chat').classList.add('hidden');
  }
  function specLaugh() {
    if (Date.now() - lastSpecSay < 3000) { toast('笑得太勤了，歇口气'); return; }
    lastSpecSay = Date.now();
    Net.sendSpec({ t: 'laugh', n: myName, a: myAlleg });
    Spect.laugh(Net.myPid); feed(Spect.get(Net.myPid), '哈哈哈哈哈！');
    Sfx.smp('laugh', { vol: 0.7, rj: 0.05 });
    $('chat').classList.add('hidden');
  }
  function paintAlleg() { $('wSide').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === myAlleg)); }
  $('wSide').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (myAlleg === b.dataset.v) return;
    myAlleg = b.dataset.v; paintAlleg();
    Spect.upsert(Net.myPid, myName, myAlleg, true);
    Net.sendSpec({ t: 'side', n: myName, a: myAlleg });
    feed(Spect.get(Net.myPid), myAlleg === 'n' ? '回到中立看台' : `站到${myAlleg === 'r' ? '汉' : '楚'}军一边`);
    Sfx.select && Sfx.select();
  });
  $('bLaugh').onclick = specLaugh;
  $('tLaugh').onclick = specLaugh;
  function leaveGame() { cancelAI(); try { Net.close(); } catch (e) { } location.href = location.pathname; }

  // ---------- 大厅 ----------
  const panes = ['pMain', 'pAI', 'pCreate', 'pWait', 'pJoin'];
  const showPane = id => panes.forEach(p => $(p).classList.toggle('hidden', p !== id));
  setTimeout(() => $('lobby').classList.remove('intro'), 3800);
  const VAR_NOTE = { std: '标准中国象棋', jq: '揭棋：十五子反扣，走动方知真身', bf: '兵法：升级、生命值、兵种技能与主帅兵法' };
  const paintVar = () => { $('varNote').textContent = VAR_NOTE[ropts.v] || ''; };
  bindSeg($('pCreate'), 'data-k', k => ropts[k], (k, v) => { ropts[k] = k === 'side' || k === 'v' ? v : +v; store.set('ropts', ropts); if (k === 'v') paintVar(); });
  paintVar();
  bindSeg($('pAI'), 'data-a', k => aopts[k], (k, v) => { aopts[k] = k === 'side' ? v : +v; store.set('aopts', aopts); });
  const paintLv = () => $('aiLv').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === aopts.level));
  $('aiLv').querySelectorAll('button').forEach(b => b.onclick = () => { aopts.level = b.dataset.v; store.set('aopts', aopts); paintLv(); Sfx.select && Sfx.select(); });
  paintLv();
  let createFor = 'host';
  $('bAI').onclick = () => { showPane('pAI'); try { AI.warm(); } catch (e) { } };
  $('bBack4').onclick = () => showPane('pMain');
  $('bAIGo').onclick = () => {
    Sfx.init(); applySettings();
    const side = aopts.side === 'x' ? (Math.random() < 0.5 ? 'r' : 'b') : aopts.side;
    startGame('ai', side, { undo: aopts.undo, total: aopts.total, step: 0, hints: aopts.hints, level: aopts.level });
  };
  $('bCreate').onclick = () => { createFor = 'host'; $('createTitle').textContent = '房 间 设 置'; $('bCreateGo').textContent = '创 建'; showPane('pCreate'); };
  $('bLocal').onclick = () => { createFor = 'local'; $('createTitle').textContent = '本 地 对 战'; $('bCreateGo').textContent = '开 始'; showPane('pCreate'); };
  $('bJoinShow').onclick = () => { showPane('pJoin'); setTimeout(() => $('joinCode').focus(), 50); };
  $('bBack1').onclick = () => showPane('pMain');
  const clearUrl = () => { try { history.replaceState(null, '', location.pathname); } catch (e) { } };
  $('bBack3').onclick = () => { Net.close(); clearInterval(joinTimer); clearUrl(); showPane('pMain'); };
  $('bBack2').onclick = () => { Net.clearRoom(); Net.close(); store.del('host'); clearUrl(); showPane('pMain'); };
  const httpUrl = /^https?:$/.test(location.protocol);
  const inviteUrl = code => location.origin + location.pathname + '?room=' + code;
  $('bCreateGo').onclick = () => {
    Sfx.init(); applySettings();
    const o = { undo: ropts.undo, total: ropts.total, step: ropts.step, hints: ropts.hints, jq: ropts.v === 'jq' ? 1 : 0, bf: ropts.v === 'bf' ? 1 : 0 };
    const side = ropts.side === 'x' ? (Math.random() < 0.5 ? 'r' : 'b') : ropts.side;
    if (createFor === 'local') { startGame('local', 'r', o); return; }
    hostRoom(Net.gen(), o, side);
  };
  function chipsFor(o, side) {
    return [o.bf ? '兵法' : o.jq ? '揭棋' : '象棋', `房主执${side === 'r' ? '红·汉' : '黑·楚'}`, o.undo ? (o.undo >= 99 ? '悔棋不限' : `悔棋 ${o.undo} 次`) : '不许悔棋', o.total ? `每方 ${o.total} 分钟` : '不限总时', o.step ? `每步 ${o.step >= 60 ? o.step / 60 + ' 分' : o.step + ' 秒'}` : '不限步时', o.hints ? '显示可杀' : '不显示可杀']
      .map(t => `<span class="chip">${t}</span>`).join('');
  }
  function hostRoom(code, o, side, resumeState) {
    opts = o; hostSide = side; mySide = side; resetClocks();
    showPane('pWait'); $('lobby').classList.remove('hidden');
    $('roomCode').textContent = code;
    $('waitChips').innerHTML = chipsFor(o, side);
    $('waitNote').innerHTML = '<span class="spin"></span>正在连接线路…';
    store.set('host', { code, opts: o, side, t: Date.now() });
    try { history.replaceState(null, '', location.pathname + '?room=' + code); } catch (e) { }
    if (httpUrl) {
      $('qrWrap').classList.remove('hidden');
      try {
        const qr = qrcode(0, 'M'); qr.addData(inviteUrl(code)); qr.make();
        const n = qr.getModuleCount(), c = document.createElement('canvas'), sz = 4;
        c.width = c.height = (n + 2) * sz; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#1b1a19';
        for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) g.fillRect((q + 1) * sz, (r + 1) * sz, sz, sz);
        $('qr').innerHTML = ''; $('qr').appendChild(c);
      } catch (e) { $('qrWrap').classList.add('hidden'); }
      $('bShare').classList.remove('hidden');
    } else { $('qrWrap').classList.add('hidden'); $('bShare').classList.add('hidden'); }
    let announced = false;
    Net.host(code, {
      line(n, total) {
        onLine(n, total);
        if (n && !announced) {
          announced = true;
          $('waitNote').innerHTML = '<span class="spin"></span>等待对手入局…<br>' + (httpUrl ? '把邀请链接发给朋友，或让他扫码' : '把房间码告诉朋友，他在「加入房间」里输入');
          // 恢复房间时，先等中继把保存的棋局发回来，再发布，避免覆盖
          if (resumeState === 'pending') setTimeout(() => { if (resumeState === 'pending') { resumeState = null; Net.publishRoom({ ...snapshot(), waiting: true }); } }, 4000);
          else if (!started) Net.publishRoom({ ...snapshot(), waiting: true });
        }
      },
      room(d) {
        // 房主恢复：用中继上保存的棋局
        if (resumeState === 'pending' && d && d.code === code && d.moves) {
          resumeState = d; hostSide = d.hostSide;
          if (d.waiting && !d.moves.length) return; // 还没开局
          startGame('host', hostSide, d.opts, { state: d, intro: false });
          Net.send({ t: 'sync', state: snapshot() });
        }
      },
      data: onData, peer: onPeer, spec: onSpec,
    });
  }
  $('bShare').onclick = () => {
    const code = $('roomCode').textContent, url = inviteUrl(code);
    const text = `来和我下一局《楚汉三维象棋》！房间码 ${code}`;
    if (navigator.share) navigator.share({ title: '楚汉三维象棋', text, url }).catch(() => { });
    else copy(`${text}\n${url}`, '邀请链接已复制');
  };
  $('bCopyCode').onclick = () => copy($('roomCode').textContent, '房间码已复制');
  function copy(t, okMsg) {
    const fallback = () => { const i = document.createElement('textarea'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast(t); } i.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => toast(okMsg), fallback); else fallback();
  }
  let joinTimer = null;
  // 入座请求里带上本机保存的揭棋局号，房主据此判断能否接着下
  const joinMsg = () => { const k = store.get('jq-' + (Net.code || ''), null); return { t: 'join', jg: k ? k.gid : null }; };
  function joinRoom(code) {
    code = code.trim().toUpperCase();
    if (code.length !== 5) { $('joinNote').textContent = '房间码是 5 位字母或数字'; return; }
    Sfx.init(); applySettings();
    try { history.replaceState(null, '', location.pathname + '?room=' + code); } catch (e) { }
    showPane('pJoin'); $('lobby').classList.remove('hidden'); $('joinCode').value = code;
    $('joinNote').innerHTML = '<span class="spin"></span>正在寻找房间…';
    let gotRoom = false;
    const t0 = Date.now();
    Net.join(code, {
      line(n, total) { onLine(n, total); if (n) Net.send(joinMsg()); },
      room(d) {
        if (!d || !d.v) return;
        gotRoom = true;
        if (!mode) $('joinNote').innerHTML = '<span class="spin"></span>找到房间，正在入座…';
      },
      data: onData, peer: onPeer, spec: onSpec,
    });
    clearInterval(joinTimer);
    joinTimer = setInterval(() => {
      if (mode) { clearInterval(joinTimer); return; }
      if (Net.lineOk) Net.send(joinMsg());
      if (!gotRoom && Date.now() - t0 > 9000) $('joinNote').textContent = '暂未找到这个房间：请核对房间码，或确认朋友的房间还开着。仍在继续寻找…';
      if (!Net.lineOk && Date.now() - t0 > 12000) $('joinNote').textContent = '网络线路连接失败，请检查网络（可在设置里换线路）。';
    }, 2000);
  }
  $('bJoin').onclick = () => joinRoom($('joinCode').value);
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('joinCode').value); });
  $('joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

  // ---------- 设置 ----------
  bindSeg($('mSet'), 'data-s', k => (k === 'quality' ? Core.quality : S[k]), (k, v) => {
    if (k === 'quality') { Core.setQuality(v); toast('画质已调整（阴影开关在下次打开时生效）'); return; }
    S[k] = (k === 'music' || k === 'vis') ? v : +v; applySettings();
    if (k === 'music' && (started || !mode)) { Sfx.init(); if (mode && !Ending.running) Sfx.Music.start(v); }
  });
  $('vMusic').value = S.vMusic; $('vSfx').value = S.vSfx; $('oServer').value = S.server;
  $('vMusic').oninput = e => { S.vMusic = +e.target.value; applySettings(); };
  $('vSfx').oninput = e => { S.vSfx = +e.target.value; applySettings(); };
  $('oServer').onchange = e => { S.server = e.target.value.trim(); applySettings(); };
  $('tSet').onclick = $('bSetL').onclick = () => { repaintSegs($('mSet')); $('mSet').classList.remove('hidden'); };
  $('bSetClose').onclick = () => $('mSet').classList.add('hidden');
  $('bHelp').onclick = $('bHelpL').onclick = () => $('mHelp').classList.remove('hidden');
  $('bHelpClose').onclick = () => $('mHelp').classList.add('hidden');

  // ---------- 对局按钮 ----------
  $('tUndo').onclick = requestUndo;
  $('tView').onclick = () => { if (mode === 'local') setView(viewSide === 'r' ? 'b' : 'r'); else setView(viewSide); };
  $('tLog').onclick = () => { const h = !$('log').classList.contains('hidden'); $('log').classList.toggle('hidden', h); store.set('log', !h); if (!h) renderLog(); };
  $('tVis').onclick = () => { S.vis = VIS[(VIS.indexOf(S.vis) + 1) % VIS.length]; applySettings(); toast(`画面：${VISNAME[S.vis]}`); };
  $('tExit').onclick = async () => {
    if (!mode) return;
    let msg;
    if (watching()) msg = '离开观战席，回到大厅？';
    else if (mode === 'local' || mode === 'ai') msg = '退出本局、回到大厅？本局不计胜负。';
    else msg = game.result ? '离开房间、回到大厅？' : '离开房间、回到大厅？本局不计胜负；对手会看到你已离开，用原邀请链接可以回来接着下。';
    const ok = await ask(watching() ? '离 席' : '退 出', msg, 0, watching() ? '离 开' : '退 出', '再想想');
    if (ok) leaveGame();
  };
  $('tResign').onclick = async () => {
    if (!started || ended || game.result) return;
    const side = actor();
    const ok = await ask('认 输', `确定${mode === 'local' ? SIDE_CN[side] + '方' : ''}认输吗？`, 0, '认 输', '再想想');
    if (!ok || game.result) return;
    const r = game.resign(side);
    if (online()) Net.send({ t: 'resign', side });
    finishGame(r);
  };
  const skipNow = () => {
    if (Ending.running) Ending.skip();
    else if (ended && endSkipRes) { endSkip = true; Core.Time.skip = true; Voice.cancel(); endSkipRes(); }
    else if (busy) Core.Time.skip = true;
  };
  $('skip').onclick = skipNow;
  window.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); skipNow(); } });
  window.addEventListener('beforeunload', () => { if (online()) Net.send({ t: 'bye' }); });
  applySettings();

  // ---------- 版本：显示在设置里；发现新版本时提示刷新（微信等内置浏览器缓存很顽固） ----------
  const APPV = window.APP_VERSION && !/APPVER/.test(window.APP_VERSION) ? window.APP_VERSION : 'dev';
  $('verTag').textContent = '版本 ' + APPV;
  async function checkVersion() {
    if (!/^https?:$/.test(location.protocol) || APPV === 'dev') return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      if (j && j.v && j.v !== APPV) {
        $('updBar').classList.remove('hidden');
        $('updBar').onclick = () => { const q = new URLSearchParams(location.search); q.set('v', j.v); location.replace(location.pathname + '?' + q.toString()); };
      }
    } catch (e) { }
  }
  setTimeout(checkVersion, 5000); setInterval(checkVersion, 5 * 60 * 1000);

  // ---------- 入口：邀请链接自动入局 / 房主恢复 ----------
  const q = new URLSearchParams(location.search);
  const room = (q.get('room') || '').toUpperCase();
  const hostRec = store.get('host', null);
  window.__xq = {
    get busy() { return busy; }, get started() { return started; }, get game() { return game; }, get mode() { return mode; }, get aiThinking() { return aiThinking; },
    doMove, startGame, finishGame, Ending, Fx, Board, Core, Camp, Squads, Spect, setView, onData, Net, requestUndo, sendEmote, get clock() { return clock; }, get opts() { return opts; }, joinRoom, notation, get notes() { return notes; }, aiSay,
    doBF, bfButton, bfClick, get bfMode() { return bfMode; }, BF, BFX,
    get JK() { return JK; }, get JC() { return JC; }, get pendingJ() { return pendingJ; }, get jqBad() { return jqBad; }, jqReady, capChip, XQ,
  };
  if (location.hash === '#local') { startGame('local', 'r', { undo: 3, total: 15, step: 60, hints: 1 }, { intro: false }); return; }
  if (location.hash === '#jq') { startGame('local', 'r', { undo: 99, total: 0, step: 0, hints: 1, jq: 1 }, { intro: false }); return; }
  if (location.hash === '#bf' || location.hash === '#bfdebug') {
    startGame('local', 'r', { undo: 99, total: 0, step: 0, hints: 1, bf: 1 }, { intro: false }).then(() => { if (location.hash === '#bfdebug') $('tDebug').click(); });
    return;
  }
  if (location.hash.startsWith('#ai')) { const [, lv, sd] = location.hash.split('-'); startGame('ai', sd || 'r', { undo: 3, total: 0, step: 0, hints: 1, level: lv || 'easy' }, { intro: false }); return; }
  $('lobby').classList.remove('hidden');
  if (room && hostRec && hostRec.code === room && Date.now() - hostRec.t < 6 * 3600e3) {
    hostRoom(room, hostRec.opts, hostRec.side, 'pending');
    toast('正在恢复你的房间…');
  } else if (room) {
    joinRoom(room);
  }
})();
