// ===== 主流程：大厅、人机、开房选项、对局、计时、悔棋、喊话、棋谱、联机同步 =====
(() => {
  const $ = id => document.getElementById(id);
  const other = XQ.other;
  document.getElementById('paper').style.backgroundImage = `url(${Core.Tex.paperNoise})`;
  const NAME = { r: '刘邦', b: '项羽' }, SEAL = { r: '漢', b: '楚' }, SIDE_CN = { r: '汉', b: '楚' };
  const PHRASES = ['好棋！', '快些落子，莫要拖延！', '竖子，不足与谋！', '尔等已是瓮中之鳖。', '胜败乃兵家常事。', '此局，天命在我。', '且慢，容我三思。', '再来一局，决一雌雄！'];
  // 更新说明（设置里、大厅底部点「更新」查看；最新的放最前）
  const NEWS = [
    ['第六版', '2026 年 10 月', [
      '房间：客方点「准备」、房主点「开始」才开局；客方可改为观战；房主可添加人机，其他人观战（人机只下象棋）',
      '技能模式：带伤害的技能先预览结果（「殺」/「-1」），再点一次目标才发动',
      '调试摆子新增两个开关：「无冷却」（技能用完不进冷却）、「自由移动」（不分回合，点哪边的子就走哪边）',
      '调试摆子：不再每点一下整盘闪；可先选「摆放等级」，摆下去就是那一级；再点一次同一个子或点「停止摆放」即可退出摆放',
      '刘邦、项羽换新模型：刘邦红袍冕服、项羽乌金重甲黑披风持霸王戟，脸看得清',
      '践踏：四级楚象攻击或吃掉敌子后就地高举前脚跺下，那一格周围一圈八格的敌子各扣 1 点，残血的直接踩死；没打死目标的，结算完四周才退回。走到空格不触发',
      '飞越、踏营有了一气呵成的腾空跃过动画；士的巨盾不再闪烁',
      '技能模式新规则「决战」：双方的车马兵炮都死光后，象、士、帅将都可以过河进攻；取消飞将；帅将按过河兵走（前、左、右各一格）',
      '完整镜头 / 精简特效下，技能打死的子（践踏、霹雳、冲阵、飞越、踏营、拒马反伤）一律换成兵种模型来演：倒地、流血、断肢；棋子显示也一样。只有低特效才是棋子碎掉',
      '棋盘四角的铜包角不再闪烁',
      '霹雳：三轮急速齐射、每轮三发，爆炸更猛；炸死的子炸碎炸飞',
      '设置分成 画面 / 声音 / 对局与其他 三页；新增语音音量、碎片留存（不留 / 三回合 / 五回合 / 永久）',
      '断肢落地留血迹；模型模式脚下的圈不再被战损痕迹盖住；手机上技能模式开局也会出规则速览',
    ]],
    ['第五版', '2026 年 10 月', [
      '「兵法模式」改名「技能模式」；联机大厅放到主菜单第一位；房间界面能看到双方座位和观战席，对手入座后倒数开局；房间可以设密码；设置里新增语音音量',
      '多人联机并成一个入口：进去就是联机大厅，能看到公开的房间直接加入（对局中的可观战），也可以建房或输入房间码；建房时可选公开 / 私密',
      '技能模式（原「兵法」）：杀敌攒的甲片够数会自动升级（不花军功）；升到四级的子成为楚汉名将（樊哙、张良、龙且、范增……）',
      '兵法：相 / 象可升四级；三级新技能「飞越」（无视塞象眼），原来的齐射、践踏挪到四级',
      '兵法：技能说明全部精简；开局有规则速览，右侧「法」按钮随时可看；打不死的目标标 -1，能一击杀死才标「殺」',
      '兵法：召回良将、破釜沉舟换成大招演出；用技能时不再把背景糊掉',
      '汉相改为谋士车驾（羽扇谋士乘华盖轺车、弩手随护）；士披重甲、持长刀巨盾；金甲兵种有金属光泽',
      '兵种模型模式：每队领头的背一面写着棋子字的旗，脚下有汉红楚黑的光圈；炮手站定不再踏步',
      '绝杀：浓墨一笔垫在字的正中，先墨后字；超时判负也出大字',
      '马走日改为一口气奔到位；退出对局直接回主菜单',
    ]],
    ['第四版', '2026 年 10 月', [
      '棋子：银、金顶面的高光收小，远看和白玉分得开；白玉压暗，玉面刻云纹',
      '兵法：兵种升级后改称号（汉军兵 → 汉伍长 → 汉什长 → 无当飞军…），晋升有题签',
      '兵法：四级兵的「神速营」改为被动，直接走；士「铁甲禁卫」可在九宫内上下左右走；马「踏营」只能在敌方半场用',
      '兵法：鸿门宴持续 3 回合，汉士护驾可破（樊哙闯帐）；四面楚歌期间楚军只有将能走，其余只能吃掉将军的子，且不算将军',
      '兵法：鸿门宴、四面楚歌有全屏特效——四周变模糊，被困的子脚下缠锁链',
      '可走的位置改成会呼吸的淡绿墨点，并有一道流动的墨带指过去',
      '绝杀：满屏朱砂手书，下出马后炮、卧槽马这类杀法会直接写出名字',
      '计时：显示每步倒计时；最后 10 秒屏幕中央出大字、四周泛红，本方观战兵坐立不安',
      '营帐旁的火炬轮到哪一方才点亮；连杀三子，观战兵会冲上棋盘嘲讽',
      '战场：击杀腾起血雾，血迹、焦土、裂痕的大小形状都随机，同一处反复厮杀会越打越黑',
      '马、车、象行进扬尘；帅将出行有随从擎旗；士改持带刺巨盾，四级士换金甲；炮击带一点辉光',
      '操作：鼠标中键拖动（手机双指拖动）可平移画面，「視」闪烁时点一下归位',
      '新增「停」暂停键（联机每人 3 次、每次最多 2 分钟）；认输、退出、画面档位收进「設」',
      '开场白新增两套并可跳过；棋谱默认收起；常规对局可选棋子款式；可改用兵种模型代替棋子',
    ]],
    ['第三版', '', ['断线后回到对局、对局结束后复盘', '升级棋子材质重做（乌银、錾金、白玉）']],
    ['第二版', '', ['兵法模式：军功、升级、兵种技能、鸿门宴与四面楚歌', '揭棋模式、人机对战、观战席']],
    ['第一版', '', ['三维水墨棋盘、兵种战斗演出、联机对战']],
  ];
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
    music: store.get('music', 'zen'), vMusic: store.get('vMusic', 55), vSfx: store.get('vSfx', 90), vVoice: store.get('vVoice', 100), voice: store.get('voice', 1),
    models: store.get('models', 0), debris: store.get('debris', 3),
    vis: store.get('vis', store.get('fx', 1) === 0 ? 'low' : 'cine'), gore: store.get('gore', 3), server: store.get('server', ''),
    speed: store.get('speed', 1.5), // 动画播放速度
  };
  if (![1, 1.5, 2, 3].includes(+S.speed)) S.speed = 1.5;
  if (!VIS.includes(S.vis)) S.vis = 'cine';
  let ropts = Object.assign({ side: 'r', undo: 3, total: 15, step: 60, hints: 1, jq: 0, pub: 1 }, store.get('ropts', {}));
  if (!ropts.v) ropts.v = ropts.jq ? 'jq' : 'std';
  let aopts = Object.assign({ level: 'mid', side: 'r', undo: 3, total: 0, step: 0, hints: 1 }, store.get('aopts', {}));

  function applySettings() {
    Fx.level = S.vis; Fx.gore = +S.gore; Voice.enabled = !!+S.voice;
    Squads.Stand.set(!!+S.models); Fx.keep = +S.debris || 0;
    Core.Time.boost = +S.speed || 1.5;
    Sfx.setVol('music', S.vMusic / 100 * 0.9); Sfx.setVol('sfx', S.vSfx / 100); Sfx.setVol('voice', S.vVoice / 100);
    Net.custom = S.server || '';
    for (const k of ['music', 'vMusic', 'vSfx', 'vVoice', 'voice', 'vis', 'gore', 'server', 'speed', 'models', 'debris']) store.set(k, S[k]);
  }
  Net.custom = S.server || '';
  Core.Time.boost = +S.speed || 1.5;
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
    const hy = kind === 'xiang' ? 1.97 : 1.9;
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
  function banner(t, s, ms = 2600) { $('banner').classList.remove('lite'); $('bannerT').textContent = t; $('bannerS').textContent = s || ''; $('banner').classList.add('on'); setTimeout(() => $('banner').classList.remove('on'), ms); }
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
  // 带输入框的询问（房间密码）：确定返回输入的字，取消返回 null
  function askText(title, text, ph = '') {
    const row = $('askInRow'), inp = $('askIn');
    row.classList.remove('hidden'); inp.value = ''; inp.placeholder = ph; setTimeout(() => inp.focus(), 60);
    inp.onkeydown = e => { if (e.key === 'Enter') $('askYes').click(); };
    return ask(title, text, 0, '确 定', '取 消').then(ok => { row.classList.add('hidden'); return ok ? inp.value.trim() : null; });
  }
  const pwHash = (code, pw) => { let h = 2166136261; for (const ch of code + ':' + pw) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const closeAsk = () => { clearInterval(askTimer); $('mAsk').classList.add('hidden'); $('askInRow').classList.add('hidden'); };

  // ---------- 对局状态 ----------
  let mode = null, mySide = 'r', viewSide = 'r', opts = { ...ropts }, hostSide = 'r';
  let sel = null, selMoves = [], anim = Promise.resolve(), busy = 0, ended = false, started = false;
  let undoUsed = { r: 0, b: 0 }, pendingUndo = null;
  let notes = [];
  const clock = { r: 0, b: 0, step: 0, last: 0, oppStamp: 0, oppTotal: 0, oppStep: 0 };
  const stepMax = () => opts.step * 1000, totalMax = () => opts.total * 60000;
  const actor = () => (mode === 'local' ? game.turn : mySide);
  const online = () => mode === 'host' || mode === 'guest';
  // 对面是电脑：人机对战，或者联机房间里房主加了人机（客人观战）
  const vsAI = () => mode === 'ai' || (mode === 'host' && !!(opts && opts.ai));
  const aiSide = () => (vsAI() ? other(mySide) : null);
  const watching = () => mode === 'watch';
  let watchWaiting = false;
  // 揭棋：同屏对战时本地随机布子；联机/观战时暗子身份未知，靠双方密钥逐个揭开（见 jq.js）
  // layout：续局时沿用原来的随机布局（本地揭棋）
  const mkGame = (o, layout) => (o && +o.bf ? new BF.Game() : o && +o.jq ? new XQ.Game({ jq: true, layout: layout || (mode === 'local' ? XQ.randomLayout() : null) }) : new XQ.Game());
  // 兵法：技能选择状态、升级记法、调试
  let bfMode = null, bfUpNote = '', dbgOn = false, dbgPick = null, dbgSel = null, dbgLv = 1, dbgNoCd = false, dbgFree = false;
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
    return head + (fwd ? '進' : '退') + ('nae'.includes(t) || tf !== ff ? num(tf) : steps(Math.abs(tr - fr)));
  }
  // 揭棋：翻出的子记在着法后，如“炮二進七=馬”
  const noteOf = (board, m, rv) => { const p = board[m.from[1]][m.from[0]]; return notation(board, m) + (rv && p ? '=' + PCH[p.s][rv] : ''); };
  // 兵法记谱：升级记作“↑傌”，技能写技能名，攻击未下记“·攻”
  function bfNote(g, e) {
    const at = e.at || e.from, p = at ? g.at(at[0], at[1]) : null;
    if (e.k === 'up') return p ? '↑' + PCH[p.s][p.t] : '';
    if (e.k === 'mv') {
      const q = g.at(e.to[0], e.to[1]); let n = notation(g.board, e);
      // 被动走法（神速营 / 回防 / 铁甲禁卫）前面标出技能名
      const mv = p && p.lv >= 4 ? g.legalFrom(e.from[0], e.from[1]).find(m => m.to[0] === e.to[0] && m.to[1] === e.to[1]) : null;
      if (mv && mv.via) n = { shensu: '神速', huifang: '回防', jinwei: '禁衛' }[mv.via] + '·' + n;
      return q && p && q.hp > g.atkOf(p) ? n + '·攻' : n;
    }
    if (e.k === 'sk' && p) {
      const sk = BF.SKILL_OF(p.t, p.s), cn = BF.SKILL_CN[sk];
      if (e.to && sk !== 'qishe') return cn + '·' + notation(g.board, { from: e.at, to: e.to });
      if (sk === 'qishe') { const q = g.at(e.to[0], e.to[1]); return cn + '·' + (q ? PCH[q.s][q.t] : ''); }
      return cn + '·' + PCH[p.s][p.t];
    }
    if (e.k === 'art') { if (g.turn === 'r') { const d = g.dead.r.find(x => x.id === e.id); return '召回·' + (d ? PCH.r[d.t] : ''); } return '破釜沉舟'; }
    if (e.k === 'ult') return g.turn === 'r' ? '四面楚歌' : '鴻門宴';
    if (e.k === 'sk' && !p) return '';
    if (e.k === 'pass') return '停著';
    return '';
  }
  function rebuildNotes() {
    if (game.bf) {
      const g = new BF.Game(); g.reset(game.base); notes = []; let up = '';
      for (const e of game.entries) { const n = bfNote(g, e); if (!g.apply(e)) break; if (!g.ends[g.ends.length - 1]) up = (up ? up + ' ' : '') + n; else { notes.push((up ? up + ' ' : '') + n); up = ''; } }
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
        : vsAI() ? (s === mySide ? '你' : `电脑 · ${LV[opts.level] || ''}`)
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
    if (game.bf) Fx.ply = (game.round - 1) * 2 + (game.turn === 'b' ? 1 : 0);
    const by = capturedBy();
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      c.classList.toggle('active', started && !game.result && game.turn === s);
      c.classList.toggle('think', vsAI() && s === aiSide() && aiThinking);
      c.querySelector('.caps').innerHTML = by[s].map(capChip).join('');
      c.querySelector('.undo').textContent = opts.undo && !(vsAI() && s === aiSide()) ? (opts.undo >= 99 ? '悔棋不限' : `悔 ${Math.max(0, opts.undo - undoUsed[s])}`) : '';
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
        chips.push(`<span class="${used.art[s] ? 'used' : tap && !aw ? 'go' : 'ok'}${tap ? ' tap' : ''}${tap && aw ? ' off' : ''}" data-tip="${escTip(artTip(s) + (aw ? '<br><em>' + aw[1] + '</em>' : ''))}"${tapAttr('art', aw)}>${BF.ART_CN[s]}</span>`);
        // 四面楚歌除了 20 军功还要围住楚将（5×5 内 3 枚汉军子），条件没齐就不亮，并显示还差几枚
        const need = U.simian.minPiecesInRadius, near = s === 'r' ? game.simianCount() : need;
        const ultOk = game.merit[s] >= U.cost && near >= need;
        const ultTxt = used.ult[s] ? '' : game.merit[s] >= U.cost && near < need ? `·将旁${near}/${need}` : '·' + U.cost;
        chips.push(`<span class="${used.ult[s] ? 'used' : tap ? (uw ? 'ok' : 'go') : ultOk ? 'red' : 'ok'}${tap ? ' tap' : ''}${tap && uw ? ' off' : ''}" data-tip="${escTip(ultTip(s) + (uw ? '<br><em>' + uw[1] + '</em>' : ''))}"${tapAttr('ult', uw)}>${BF.ULT_CN[s]}${ultTxt}</span>`);
        if (s === 'r' && fx.hm) chips.push(`<span class="red" data-tip="${escTip(ultTip('b'))}">鸿门宴 ${fx.hm}</span>`);
        if (s === 'b' && fx.sm) chips.push(`<span class="red" data-tip="${escTip(ultTip('r'))}">涣散 ${fx.sm}</span>`);
        if (s === 'b' && fx.pf) chips.push(`<span data-tip="破釜沉舟之后楚军暂时不能用兵种技能">封技 ${fx.pf}</span>`);

        const fxs = bfm.querySelector('.fxs'), html = chips.join('');
        if (fxs.innerHTML !== html) fxs.innerHTML = html;
        fxs.onclick = e => { const t = e.target.closest('[data-a]'); if (!t) return; e.stopPropagation(); bfButton(t.dataset.a, t); };
      }
    }
    paintClocks();
    let st, warn = false;
    if (game.result) st = `${SIDE_CN[game.result.winner]}胜 · ${REASON[game.result.reason]}`;
    else if (!started) st = mode === 'host' && !Net.connected ? '等待对手入局…' : '开 局';
    else if (netDown()) { st = netText(); warn = true; }
    else if (mode === 'local') st = `${game.turn === 'r' ? '红方（汉）' : '黑方（楚）'}走棋`;
    else if (vsAI()) st = game.turn === mySide ? '轮到你走' : `${NAME[aiSide()]}思考中…`;
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
      else if (started && game.freeUsed && !watching()) { st = `${SIDE_CN[game.turn]}方已架拒马 · 请再走一步棋`; }
      else if (started && game.turn === 'b' && game.fx.sm > 0 && !game.inCheck()) { st += ' · 军心涣散：只能走将或停着'; }
      else if (started && game.turn === 'b' && game.fx.sm > 0) { st += ' · 只能吃掉将军的子或走将'; }
      st = `技能模式 · 第 ${game.round} 回合 · ` + st;
    }
    if (RP) { st = `复盘 · 第 ${RP.k} / ${RP.n} 步` + (RP.k && notes[notes.length - 1] ? ' · ' + notes[notes.length - 1].replace(/=.*/, '') : ''); warn = false; }
    $('statusT').textContent = st; $('status').classList.toggle('warn', warn);
    renderBar();
    paintVeil();
    // 大帐旁的火炬：轮到谁走谁的亮
    Camp.setTurn(mode && started && !ended && !game.result && !RP ? game.turn : null);
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
    // 技能未用提示：手机上贴在卡片（或技能栏）上方，电脑上在屏幕下方正中
    const sh = $('skHint');
    if (!sh.classList.contains('hidden')) {
      if (compact) { const top = bar.classList.contains('hidden') ? m.top : Math.min(m.top, bar.getBoundingClientRect().top); sh.style.bottom = (H - top + 8) + 'px'; }
      else sh.style.bottom = '';
    }
    $('bfReport').style.top = compact ? (sr.bottom + 6) + 'px' : '';
  }
  window.addEventListener('resize', () => setTimeout(layoutHud, 60));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => layoutHud()); ro.observe($('cardOpp')); ro.observe($('cardMe')); }
  const CN10 = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const fmtStep = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return t >= 60 ? Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') : t + ' 秒'; };
  let cdSec = -1;
  function paintClocks() {
    let urgent = null; // 正在走的一方只剩 10 秒以内：{ side, sec }
    const live = mode && started && !ended && !game.result && !RP;
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      let total = clock[s], step = game.turn === s ? clock.step : stepMax();
      if (online() && s !== mySide && game.turn === s && clock.oppStamp && Net.peerState === 'ok' && !busy) {
        const el = performance.now() - clock.oppStamp;
        total = clock.oppTotal - (opts.total ? el : 0); step = clock.oppStep - el;
      }
      // 卡片上：总时 + 这一步还剩多久（只有轮到的一方显示步时）
      const ck = c.querySelector('.clk'), turnNow = live && game.turn === s;
      const stepLow = turnNow && opts.step && step < 10000;
      const html = (opts.total ? fmt(total) : opts.step ? '' : '不限时') + (opts.step ? `<i class="stp${stepLow ? ' low' : ''}${opts.total ? '' : ' solo'}">${turnNow ? '本步 ' + fmtStep(step) : '每步 ' + fmtStep(stepMax())}</i>` : '');
      if (ck.dataset.h !== html) { ck.dataset.h = html; ck.innerHTML = html; }
      ck.classList.toggle('inf', !opts.total && !opts.step);
      ck.classList.toggle('low', !!opts.total && total < 60000 && game.turn === s && started && !game.result);
      // 头像外的计时环：优先显示步时，其次总时
      let k = 1, low = false;
      if (opts.step) { k = step / stepMax(); low = step < 10000; }
      else if (opts.total) { k = total / totalMax(); low = total < 60000; }
      const arc = c.querySelector('.arc');
      arc.style.strokeDashoffset = (226.2 * (1 - Math.max(0, Math.min(1, k)))).toFixed(1);
      arc.classList.toggle('low', low && game.turn === s);
      if (turnNow && (opts.total || opts.step)) {
        const left = Math.min(opts.total ? total : 1e12, opts.step ? step : 1e12);
        if (left > 0 && left <= 10000 && !busy && !Ending.running && !netDown() && !paused()) urgent = { side: s, sec: Math.ceil(left / 1000) };
      }
    }
    // 最后十秒：屏幕中央一个半透明的行书大字逐秒跳动；自己的钟（或同屏对战）时四周泛红；这一方的观战士兵坐立不安
    const big = $('cdBig'), red = $('cdRed');
    if (urgent) {
      if (urgent.sec !== cdSec) {
        cdSec = urgent.sec; big.textContent = CN10[urgent.sec] || '';
        big.classList.remove('on'); void big.offsetWidth; big.classList.add('on'); big.classList.toggle('hot', urgent.sec <= 3);
        if (urgent.sec <= 5) { try { Sfx.B.taiko(0, 0.35 + (5 - urgent.sec) * 0.08, 0.7); } catch (e) { } }
      }
      red.classList.toggle('on', !watching() && (mode === 'local' || urgent.side === mySide));
    } else if (cdSec !== -1) { cdSec = -1; big.classList.remove('on', 'hot'); red.classList.remove('on'); }
    Camp.restless(urgent ? urgent.side : null);
  }
  // 暂停中（见下面的暂停功能）
  // 人机 / 本地：随便停。联机：每人每局 3 次，每次最多 2 分钟，双方时钟都停；到点自动继续，暂停的一方可以提前继续
  const PAUSE_MAX = 3, PAUSE_MS = 120000;
  let introSkip = null;
  const INTROS = [
    [['r', '汉王刘邦在此！项籍，可敢一战？', 'r_start', 2], ['b', '吾乃西楚霸王！谁敢挡我！', 'b_start', 1.8]],
    [['b', '哟，是汉中王来了。', 'b_start2', 1.8], ['r', '托项王的福，汉中的栈道，寡人已经修好了。', 'r_start2', 2.4]],
    [['b', '天下匈匈数岁者，徒以吾两人耳。愿与汉王挑战，决一雌雄！', 'b_start3', 3.2], ['r', '吾宁斗智，不能斗力。', 'r_start3', 1.8]],
  ];
  let pause = null, pauseUsed = { r: 0, b: 0 };
  const paused = () => !!pause;
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const myPause = () => !!pause && (pause.by === 'me' || (!watching() && pause.by === mySide));
  function paintPause() {
    const ov = $('pauseOv');
    ov.classList.toggle('hidden', !pause);
    if (!pause) return;
    const mine = myPause();
    ov.classList.toggle('opp', !mine);
    for (const id of ['pzResign', 'pzSet']) $(id).classList.toggle('hidden', watching());
    let txt = '';
    if (pause.by === 'me') txt = '棋局已停，计时也停了';
    else {
      const left = mmss(pause.until - performance.now());
      txt = mine ? `对手也在等你 · ${left} 后自动继续 · 本局还可暂停 ${PAUSE_MAX - pauseUsed[mySide]} 次`
        : `${SIDE_CN[pause.by]}方叫了暂停 · 最多 ${left} 后继续`;
    }
    $('pzInfo').textContent = txt;
  }
  function setPause(p) {
    const was = !!pause;
    pause = p; Core.Time.hold = !!p;
    if (was && !p) clock.last = performance.now();
    paintPause();
  }
  function resumeGame() {
    if (!pause) return;
    if (online() && pause.by === mySide) Net.send({ t: 'pause', on: 0, side: mySide });
    setPause(null);
  }
  function togglePause() {
    if (pause) {
      if (myPause()) resumeGame();
      else toast('对手暂停中，由对手决定何时继续');
      return;
    }
    if (!mode || !started || ended || game.result || Ending.running || RP) return;
    if (watching()) { toast('观战席不能叫暂停'); return; }
    if (online()) {
      if (netDown()) { toast('对手不在线，计时本来就停着'); return; }
      if (pauseUsed[mySide] >= PAUSE_MAX) { toast(`本局 ${PAUSE_MAX} 次暂停已经用完`); return; }
      pauseUsed[mySide]++;
      Net.send({ t: 'pause', on: 1, side: mySide, ms: PAUSE_MS, used: pauseUsed[mySide] });
      setPause({ by: mySide, until: performance.now() + PAUSE_MS });
    } else setPause({ by: 'me', until: 0 });
  }
  // 对手（或观战时任一方）发来的暂停 / 继续
  function onPause(d, side) {
    if (d.on) {
      if (ended || !started) return;
      if (d.used != null) pauseUsed[side] = d.used;
      closeAsk();
      setPause({ by: side, until: performance.now() + Math.min(PAUSE_MS, +d.ms || PAUSE_MS) + 1500 });
      if (!watching()) toast('对手叫了暂停', 2200);
    } else if (pause && pause.by === side) { setPause(null); toast('棋局继续', 1500); }
  }
  // 同步局面时带上暂停次数和正在进行的暂停
  function applyPz(st) {
    if (st.pz) pauseUsed = { r: 0, b: 0, ...st.pz };
    if (st.pzn && st.pzn.ms > 500 && !st.result) { if (!(pause && pause.by === st.pzn.side)) setPause({ by: st.pzn.side, until: performance.now() + st.pzn.ms }); }
    else if (pause && pause.until && !myPause()) setPause(null);
  }

  // ---------- 计时 ----------
  let lastTickSec = -1;
  let turnStartAt = 0, slowIdx = 0;
  setInterval(() => {
    const t = performance.now(), dt = t - clock.last; clock.last = t;
    if (!started || ended || game.result || !mode) return;
    const s = game.turn;
    const mine = mode === 'local' || vsAI() || mode === 'watch' || s === mySide;
    if (pause) { if (pause.until && t > pause.until) { if (myPause()) resumeGame(); else setPause(null); } else paintPause(); return; }
    const paused = busy || Ending.running || netDown();
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
    if (vsAI() && s === mySide && !paused && !pendingUndo && turnStartAt) {
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
    if (!vsAI()) return Promise.resolve();
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
    if (!vsAI() || ended || game.result || !started || game.turn !== aiSide() || pendingUndo) return;
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
      if (vsAI() && mover === mySide && Math.random() < 0.55) p.then(() => { if (!ended) aiSay('checked'); });
    }
    if (!vsAI() || info.result) return;
    if (mover === aiSide() && info.captured && !info.check) { if ('rnc'.includes(info.captured.t) || Math.random() < 0.6) aiSay('cap'); }
    else if (mover === mySide && info.captured && !info.check && 'rnc'.includes(info.captured.t) && Math.random() < 0.6) aiSay('hurt');
  }

  // ---------- 开局 ----------
  function setView(side) { viewSide = side; Core.Cam.setSide(side); Board.faceViewer(side); Board.viewSide = side; paintCards(); }
  let finaleHero = null;
  function clearFinale() { if (finaleHero) { try { if (finaleHero.dropped) Core.disposeTree(finaleHero.dropped); finaleHero.dispose(); } catch (e) { } finaleHero = null; } }
  async function startGame(m, side, o, { state = null, intro = true } = {}) {
    cancelAI(); closeRoom();
    mode = m; mySide = side; opts = { ...o }; ended = false; started = false; lobbySpin = false;
    if ((m === 'local' || m === 'ai') && !state) store.del('resume');
    resumeKey = '';
    game = mkGame(opts, state && state.layout); undoUsed = { r: 0, b: 0 }; pendingUndo = null; pauseUsed = { r: 0, b: 0 }; setPause(null);
    resetClocks();
    clearFinale(); Camp.reset();
    Board.setSkin(game.bf ? 0 : opts.skin);   // 棋子款式（木 / 银 / 金 / 玉）是开局选项，联机双方和观众一致
    Board.setPosition(game); Fx.clearMarks(); Fx.ply = 0;
    Board.clearMoves(); Board.showLast(null);
    if (state) applyState(state);
    jqSetup(state);
    rebuildNotes();
    $('log').classList.toggle('jq', game.jq || !!game.bf);
    bfMode = null; dbgOn = false; dbgNoCd = false; dbgFree = false; $('bfDebug').classList.add('hidden'); $('bfReport').innerHTML = ''; $('bfReport').classList.toggle('hidden', !game.bf);
    $('tRule').classList.toggle('hidden', !game.bf);
    setView(mode === 'local' ? 'r' : side);
    $('lobby').classList.add('hidden'); $('hud').classList.remove('hidden');
    $('netbadge').classList.add('hidden');
    Core.Cam.moveId = (Core.Cam.moveId || 0) + 1;
    for (const id of ['tUndo', 'tResign', 'tPause']) $(id).classList.toggle('hidden', m === 'watch');
    $('tLaugh').classList.toggle('hidden', m !== 'watch');
    setupChat();
    $('log').classList.add('hidden');   // 棋谱默认收起，点「譜」才展开
    Ending.hideCard();
    Core.Cam.cine = false;
    Sfx.init(); applySettings();
    Sfx.Music.start(S.music); Sfx.Music.setIntensity(0.35);
    paintCards();
    if (vsAI()) { try { AI.warm(); } catch (e) { } }
    if (intro && !game.history.length) {
      Sfx.B.gong(0, 0.9); Sfx.B.taiko(0.5, 0.8); Sfx.B.taiko(0.8, 0.8); Sfx.B.taiko(1.05, 0.9);
      let sub = mode === 'local' ? '红方先行' : vsAI() ? `人机 · ${LV[opts.level]} · ${mySide === 'r' ? '你执红（汉）先行' : '你执黑（楚）后手'}` : mode === 'watch' ? '观战' : (mySide === 'r' ? '你执红（汉）· 先行' : '你执黑（楚）· 后手');
      if (game.jq) sub = '揭棋 · ' + sub;
      if (game.bf) sub = '技能模式 · ' + sub;
      banner('楚汉相争', sub, 2700);
      // 开场白三套随机；随时可以点「跳过」（或按空格）直接开局
      let skipIntro; const skipP = new Promise(r => { skipIntro = r; });
      introSkip = () => { introSkip = null; Voice.cancel(); $('banner').classList.remove('on'); for (const id of ['bubMe', 'bubOpp']) $(id).classList.remove('on'); skipIntro(true); };
      $('skip').classList.remove('hidden'); $('skip').textContent = '跳过开场 ▸▸';
      const say = async (side, text, id, min) => { if (!introSkip || mode !== m) return; bubble(side, text, 3600); await Promise.race([Voice.play(id, { minDur: min }), skipP]); };
      await Promise.race([Core.sleep(2.5), skipP]);
      const v = INTROS[Math.floor(Math.random() * INTROS.length)];
      for (const [side, text, id, min] of v) await say(side, text, id, min);
      introSkip = null; if (!busy && !Ending.running) $('skip').classList.add('hidden');
    }
    if (mode !== m) return;
    if (game.jq && !game.history.length && intro) { bubble('r', '十五子尽数扣下，翻开方知是何兵马！', 2600); await Core.sleep(1.2); }
    if (game.bf && !game.history.length && intro) { bubble('b', '论兵法，你还嫩了些！', 2400); await Core.sleep(1.0); }
    if (mode === m && game.bf && !game.entries.length && m !== 'watch') showBfTip(false);
    if (mode !== m) return;
    started = true; clock.last = performance.now(); clock.step = stepMax();
    turnStartAt = performance.now(); slowIdx = 0;
    updateHud();
    maybeAI();
  }
  function snapshot() {
    const G = RP ? RP.real : game; // 复盘中也发真实棋局
    const jq = G.jq && JK ? { gid: JK.gid, cin: JC.cin, cout: JC.cout } : undefined;
    const bfe = G.bf ? G.entries : undefined;
    return { v: 2, code: Net.code, opts, hostSide, jq, bfe, moves: G.bf ? [] : G.history.map(h => ({ from: h.from, to: h.to, rv: h.rv, cj: h.cj })), result: G.result, undo: { ...undoUsed }, clk: { r: clock.r, b: clock.b }, step: clock.step, t: Date.now(), pz: { ...pauseUsed }, pzn: pause && pause.until ? { side: pause.by, ms: Math.max(0, pause.until - performance.now()) } : null };
  }
  function applyState(st) {
    game = mkGame(opts, st.layout || (game && game.opts && game.opts.layout));
    if (game.bf && st.bfbase) game.reset(st.bfbase);
    if (game.bf) for (const e of st.bfe || []) { if (!game.apply(e)) break; }
    else for (const m of st.moves || []) game.play({ from: m.from, to: m.to, rv: m.rv, cj: m.cj });
    if (st.result) game.result = st.result;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
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
    if (game.bf && vsAI()) return false;
    if (mode === 'local') return true;
    if (vsAI()) return game.turn === mySide && !aiThinking;
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
    // 将死：认一下是哪种杀法（重炮、马后炮……），绝杀大字下面要写
    if (info.result && info.result.reason === 'checkmate') info.mateName = XQ.mateName(game.board, info.result.loser, { to: m.to, cap: info.captured });
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
    if (vsAI() && info.mover === mySide && !info.result) maybeAI();
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
    if (vsAI()) await aiSay(winner === aiSide() ? 'win' : 'lose');
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
    cancelAI(); setPause(null);
    closeAsk(); Board.clearMoves();
    if (result && result.reason === 'timeout') { try { Fx.mateSplash('超时', result.loser); } catch (e) { } }   // 超时判负也出大字
    updateHud(); publish(); saveResume(true);
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
        lobby: toLobby, persp, instant: endSkip, review: startReplay,
        mine: mode === 'local' || W || !result.winner ? '' : (persp === 'win' ? '你 胜 了' : '你 败 了'),
      });
      if (pendingRestart) { const st = pendingRestart; pendingRestart = null; restart(st === true ? undefined : st); if (mode === 'host') Net.send({ t: 'restart', state: snapshot() }); }
    });
  }
  function requestAgain() {
    if (mode === 'local' || vsAI()) { restart(); return; }
    if (mode === 'host') { restart(); Net.send({ t: 'restart', state: snapshot() }); }
    else { Net.send({ t: 'again' }); toast('已请求再来一局…'); }
  }
  let pendingRestart = null;
  function restart(state) {
    if (RP) exitReplay(true);
    Ending.hideCard(); Core.Time.skip = false; pendingJ = null;
    startGame(mode, mySide, watching() && state && state.opts ? state.opts : opts, { state, intro: true });
    if (mode === 'host') publish();
  }
  // ---------- 复盘：终局后从第一步起逐步回看整盘棋（各模式通用） ----------
  let RP = null;
  const rpSteps = g => (g.bf ? g.entries.length : g.history.length);
  function rpBuild(k) {
    const real = RP.real;
    let g;
    if (real.bf) { g = new BF.Game(); g.reset(real.base); for (let i = 0; i < k; i++) if (!g.apply(real.entries[i])) break; }
    else { g = new XQ.Game(real.opts); for (let i = 0; i < k; i++) { const h = real.history[i]; if (!g.play({ from: h.from, to: h.to, rv: h.rv, cj: h.cj })) break; } }
    return g;
  }
  function rpShow(k) {
    RP.k = k; game = rpBuild(k);
    Fx.clearMarks(); Board.setPosition(game); Board.faceViewer(viewSide); Board.clearMoves(); Fx.ply = game.history.length;
    const last = game.history[game.history.length - 1];
    Board.showLast(last && last.from ? last.from : null, last && last.to ? last.to : null);
    rebuildNotes(); rpPaint(); updateHud();
  }
  async function rpStep() {
    if (!RP || RP.busy || RP.k >= RP.n) return;
    RP.busy = true; rpPaint();
    try {
      if (game.bf) {
        const e = RP.real.entries[RP.k], note = bfNote(game, e), info = game.apply(e);
        if (info) { RP.k++; rebuildNotes(); updateHud(); await BFX.play(info, BF.view(info.after)); Board.reconcile(game); if (info.from && info.k !== 'up') Board.showLast(info.from, info.to || info.from); }
      } else {
        const h = RP.real.history[RP.k];
        const info = game.play({ from: h.from, to: h.to, rv: h.rv, cj: h.cj });
        if (info) {
          if (info.captured && game.history[game.history.length - 1].cap) info.captured = { ...game.history[game.history.length - 1].cap };
          info.dt = capView(info); RP.k++; Fx.ply = game.history.length; rebuildNotes(); updateHud();
          await Fx.playMove(info); Board.showLast(info.from, info.to);
        }
      }
    } catch (err) { console.error(err); }
    Core.Time.skip = false; Core.Time.scale = 1; Core.Cam.cine = false; document.body.classList.remove('cine');
    if (RP) { RP.busy = false; rpPaint(); updateHud(); }
  }
  async function rpPlay() {
    if (!RP) return;
    RP.playing = !RP.playing; rpPaint();
    while (RP && RP.playing && RP.k < RP.n) { await rpStep(); await new Promise(r => setTimeout(r, 450)); }
    if (RP) { RP.playing = false; rpPaint(); }
  }
  function rpPaint() {
    if (!RP) return;
    $('rpInfo').textContent = `第 ${RP.k} / ${RP.n} 步`;
    $('rpBar').querySelector('[data-rp="play"]').textContent = RP.playing ? '❚❚ 暂停' : '▶ 播放';
    $('rpBar').querySelectorAll('[data-rp]').forEach(b => { const a = b.dataset.rp; b.disabled = a !== 'exit' && a !== 'play' && RP.busy || ((a === 'prev' || a === 'first') && RP.k === 0) || ((a === 'next' || a === 'last') && RP.k >= RP.n); });
  }
  function startReplay() {
    if (RP || !game) return;
    Ending.hideCard();
    clearFinale(); Camp.reset();
    Core.Cam.moveId = (Core.Cam.moveId || 0) + 1; Core.Cam.cine = false; document.body.classList.remove('cine');
    RP = { real: game, k: 0, n: rpSteps(game), busy: false, playing: false };
    $('rpBar').classList.remove('hidden');
    $('hud').classList.remove('hidden');
    setView(viewSide);
    rpShow(0);
    toast('复盘：用下方按钮逐步前进、后退或自动播放', 2600);
  }
  async function exitReplay(silent) {
    if (!RP) return;
    const real = RP.real; RP.playing = false;
    while (RP && RP.busy) await new Promise(r => setTimeout(r, 100));
    RP = null; $('rpBar').classList.add('hidden');
    game = real; Fx.clearMarks(); Board.setPosition(game); Board.faceViewer(viewSide); rebuildNotes(); updateHud();
    if (!silent) $('endcard').classList.remove('hidden');
  }
  $('rpBar').addEventListener('click', e => {
    const b = e.target.closest('[data-rp]'); if (!b || !RP || b.disabled) return;
    const a = b.dataset.rp; Sfx.select && Sfx.select();
    if (a === 'exit') exitReplay(false);
    else if (a === 'play') rpPlay();
    else if (RP.busy) return;
    else if (a === 'next') rpStep();
    else if (a === 'prev') rpShow(Math.max(0, RP.k - 1));
    else if (a === 'first') rpShow(0);
    else if (a === 'last') rpShow(RP.n);
  });
  function toLobby() {
    Net.close(); store.del('host');
    location.href = location.pathname;
  }

  // ---------- 说明浮窗：电脑鼠标悬停、手机长按（按钮、卡片上的签、棋盘上的棋子） ----------
  const tipEl = $('tip');
  let tipT = 0, lpT = 0, tipFor = null, tipHold = false, boardHold = false;
  function showTip(html, r) {
    tipEl.innerHTML = html; tipEl.classList.remove('hidden');
    const W = innerWidth, H = innerHeight, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = Math.min(W - w - 8, Math.max(8, (r.left + r.right) / 2 - w / 2));
    let y = r.top - h - 10; if (y < 8) y = Math.min(H - h - 8, r.bottom + 10);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.classList.add('hidden'); tipFor = null; }
  const pieceAt = (x, y) => { if (!game || !game.bf || !started) return null; const q = Board.pick(x, y); const p = q && game.at(q[0], q[1]); return p ? { p, q } : null; };
  const pointRect = (x, y) => ({ left: x - 30, right: x + 30, top: y - 40, bottom: y + 30 });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && el === tipFor) return;
    clearTimeout(tipT); if (tipFor && tipFor !== 'board') hideTip();
    if (!el || !el.dataset.tip) return;
    tipT = setTimeout(() => { tipFor = el; showTip(el.dataset.tip, el.getBoundingClientRect()); }, 260);
  });
  document.addEventListener('pointerdown', e => {
    tipHold = false; clearTimeout(lpT);
    if (!tipEl.classList.contains('hidden')) hideTip();
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    const onBoard = e.target.id === 'gl';
    if (!el && !onBoard) return;
    const x0 = e.clientX, y0 = e.clientY;
    const mv = ev => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) { clearTimeout(lpT); document.removeEventListener('pointermove', mv); } };
    document.addEventListener('pointermove', mv);
    lpT = setTimeout(() => {
      document.removeEventListener('pointermove', mv);
      if (el && el.dataset.tip) { tipHold = true; tipFor = el; showTip(el.dataset.tip, el.getBoundingClientRect()); }
      else if (onBoard) { const hit = pieceAt(x0, y0); if (hit) { boardHold = true; tipFor = 'board'; showTip(pieceTip(hit.p), pointRect(x0, y0)); } }
      if (tipFor && navigator.vibrate) try { navigator.vibrate(12); } catch (err) { }
    }, 450);
  }, true);
  document.addEventListener('pointerup', () => clearTimeout(lpT), true);
  document.addEventListener('click', e => { if (tipHold) { tipHold = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && (e.target.closest('[data-tip]') || e.target.id === 'gl')) e.preventDefault(); });
  // 电脑：鼠标停在棋子上一会儿就显示这枚子的说明
  let hoverKey = '', hoverMoveT = 0;
  $('gl').addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const now = performance.now(); if (now - hoverMoveT < 90) return; hoverMoveT = now;
    const hit = pieceAt(e.clientX, e.clientY), key = hit ? hit.p.id + '|' + game.entries.length : '';
    if (key === hoverKey) return;
    hoverKey = key; clearTimeout(tipT);
    if (tipFor === 'board') hideTip();
    if (!hit || Core.Cam.cine) return;
    const x = e.clientX, y = e.clientY;
    tipT = setTimeout(() => { tipFor = 'board'; showTip(pieceTip(hit.p), pointRect(x, y)); }, 380);
  });
  $('gl').addEventListener('pointerleave', () => { hoverKey = ''; clearTimeout(tipT); if (tipFor === 'board') hideTip(); });

  // ---------- 点选 ----------
  $('gl').addEventListener('pointerup', e => {
    if (boardHold) { boardHold = false; return; }
    if (Core.lastDragMoved > 10 || Core.Cam.cine) return;
    if (dbgOn && game.bf) { const p = Board.pick(e.clientX, e.clientY); if (p) dbgClick(p[0], p[1]); return; }
    if (game.bf && canAct()) { const p = Board.pick(e.clientX, e.clientY); dbgFreeTurn(p); bfClick(p); return; }
    if (!canAct()) {
      if (started && !ended && !busy && online() && Net.connected && game.turn !== mySide) toast('还没轮到你');
      if (started && !ended && vsAI() && game.turn !== mySide) toast(`${NAME[aiSide()]}正在思考`);
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
      Board.showMoves(sel, bfDmg(selMoves), !!+opts.hints);
      Sfx.select();
      if (!selMoves.length) toast('这枚棋子无路可走');
    } else { Board.clearMoves(false); sel = null; selMoves = []; }
  });

  // ---------- 兵法：选子、技能栏、兵法 ----------
  const SIDE_ARMY = { r: '汉军', b: '楚军' };
  BFX.hooks.bubble = (side, text, ms, who) => bubble(side, text, ms, who);
  // 鸿门宴 / 四面楚歌的全局效果：被困的一方，屏幕四周蒙上一圈模糊的色雾（联机只有被困的人看到；同屏对战轮到被困方时出现）
  function paintVeil() {
    let k = '';
    if (game && game.bf && mode && started && !ended && !game.result && !RP && !watching()) {
      const fx = game.fx, me = mode === 'local' ? game.turn : mySide;
      if (fx.hm > 0 && me === 'r') k = 'hm'; else if (fx.sm > 0 && me === 'b') k = 'sm';
    }
    const v = $('veil'), cls = k ? 'on ' + k + (Core.quality === 'low' || veilLite ? ' lite' : '') : '';
    if (v.className !== cls) v.className = cls;
    // 真模糊（backdrop-filter）在弱机上很吃力：开着的头一秒量一下帧时间，掉帧就退成只有色雾
    if (k && !veilLite && !veilProbe && Core.quality !== 'low') {
      veilProbe = true;
      let n = 0, t0 = performance.now(), worst = 0, last = t0;
      const tick = () => {
        const t = performance.now(); worst = Math.max(worst, t - last); last = t; n++;
        if (t - t0 < 1400) { requestAnimationFrame(tick); return; }
        if ((t - t0) / n > 42) { veilLite = true; paintVeil(); }
      };
      requestAnimationFrame(tick);
    }
  }
  let veilLite = false, veilProbe = false;
  const pname = p => XQ.NAMES[p.s][p.t];
  function exitBfMode(repaint = true) {
    if (bfMode && bfMode.kind === 'pofu' && bfMode.m1) Board.reconcile(game);
    bfMode = null;
    if (repaint) renderBar();
  }
  function bfSelect(f, r) {
    sel = [f, r];
    const me = game.at(f, r);
    selMoves = game.legalFrom(f, r).map(m => { const q = game.at(m.to[0], m.to[1]); return { ...m, atk: !!(q && q.hp > game.atkOf(me)) }; });
    Board.showMoves(sel, bfDmg(selMoves), !!+opts.hints);
    Sfx.select();
  }
  function bfClear() { Board.clearMoves(false); sel = null; selMoves = []; }
  // 伤害预览：把这一步先在副本上演一遍，列出会阵亡 / 掉血的子（含被波及的、被反伤的）
  function bfHarm(a) {
    let r; try { r = BF.attempt(game.S, a); } catch (e) { return null; }
    if (!r) return null;
    const hp0 = new Map(); for (const row of game.board) for (const q of row) if (q) hp0.set(q.id, q.hp);
    const out = new Map();
    for (const e of r.ev) {
      if (!e.at || e.id == null) continue;
      if (e.e === 'kill') out.set(e.id, { at: e.at.slice(), kill: true });
      else if (e.e === 'hit' && !(out.get(e.id) || {}).kill) out.set(e.id, { at: e.at.slice(), dmg: Math.max(1, (hp0.get(e.id) || e.hp + 1) - e.hp) });
    }
    return { list: [...out.values()], ev: r.ev };
  }
  // 带伤害的技能（霹雳、齐射、冲阵、踏营 / 飞越打到子、楚象带践踏的每一步）：第一次点目标只预览结果，再点一次才发动
  function bfNeedConfirm(a) {
    const h = bfHarm(a); if (!h || !h.list.length) return null;
    if (a.k === 'sk') return h;
    if (a.k === 'mv' && h.ev.some(e => e.e === 'splash' && e.how === 'jianta') && h.ev.some(e => (e.e === 'hit' || e.e === 'kill') && e.how === 'jianta')) return h;
    return null;
  }
  function bfAsk(a, from) {
    const h = bfNeedConfirm(a);
    if (!h) { doBF(a); return; }
    const marks = h.list.map(x => ({ from, to: x.at, dmg: x.kill ? 0 : x.dmg })); marks.noBelt = true;
    if (!h.list.some(x => x.at[0] === a.to[0] && x.at[1] === a.to[1])) { marks.push({ from, to: a.to }); }
    bfMode = { kind: 'confirm', a, hint: '预览：标「殺」的会阵亡，标 -1 的掉血 · 再点一次目标发动，点别处取消' };
    Board.showMoves(from, marks, true); Sfx.select();
    renderBar();
  }
  function bfClick(p) {
    if (bfMode && bfMode.kind === 'pofu') { pofuClick(p); return; }
    if (bfMode && bfMode.kind === 'confirm') {
      const a = bfMode.a;
      if (p && a.to && p[0] === a.to[0] && p[1] === a.to[1]) { bfMode = null; doBF(a); return; }
      exitBfMode(false);
      if (sel) bfSelect(sel[0], sel[1]);
      renderBar(); return;
    }
    if (bfMode && bfMode.kind === 'sk') {
      const a = p && bfMode.targets.find(x => x.to && x.to[0] === p[0] && x.to[1] === p[1]);
      if (a) { bfAsk(a, a.at); return; }
      exitBfMode(false);
    }
    if (!p) { bfClear(); renderBar(); return; }
    const [f, r] = p;
    const mv = selMoves.find(m => m.to[0] === f && m.to[1] === r);
    if (sel && mv) { bfAsk({ k: 'mv', from: sel, to: [f, r] }, sel); return; }
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
        o.p = p; o.cost = game.upgradeCost(p); o.base = game.baseCost(p); o.canUp = game.canUpgrade(sel[0], sel[1]);
        // 这枚子的全部技能：已解锁的逐个列出，未解锁的只列下一个
        o.skills = [];
        let lockedShown = false;
        for (const sk of game.skillsOf(p)) {
          const lv = game.skLevel(sk), have = p.lv >= lv;
          if (!have) { if (lockedShown) continue; lockedShown = true; }
          o.skills.push({ sk, lv, have, passive: game.isPassive(sk), cd: game.cdLeft(p, sk), targets: have && !game.isPassive(sk) ? game.skillTargets(sel[0], sel[1], sk) : [] });
        }
      }
    }
    o.art = side === 'r' ? game.reviveOptions() : game.pofuFirst();
    o.ult = game.ultReady();
    o.pass = game.mayPass(); o.mustPass = game.mustPass();
    return (barCache = o);
  }
  const LVCN = ['', '一', '二', '三', '四'];
  // 兵法规则速览：开局自动亮一下（十几秒后自己收起），右侧「法」按钮随时可再看
  let bfTipT = null;
  // 决战提示：双方车马兵炮都死光时弹出
  function showFinalTip() {
    $('bfTipH').textContent = '决 战';
    $('bfTipBody').innerHTML = [
      '双方的<b>车、马、兵、炮都已阵亡</b>',
      '<b>象、士、帅将</b>都可以过河进攻',
      '象仍走田（塞象眼照旧）、士仍走斜一格，只是不再受河界、九宫限制',
      '<b>帅将</b>按过河兵走：前、左、右各一格，不能后退',
      '<b>取消飞将</b>：帅将可以照面',
    ].map(x => `<li>${x}</li>`).join('');
    $('bfTip').classList.remove('hidden');
    clearTimeout(bfTipT); bfTipT = setTimeout(() => $('bfTip').classList.add('hidden'), 16000);
    try { Sfx.B.taiko(0, 3, 0.7); } catch (e) { }
  }
  function showBfTip(manual) {
    const touch = matchMedia('(pointer: coarse)').matches;
    $('bfTipH').textContent = '技 能 模 式 速 览';
    $('bfTipBody').innerHTML = [
      `<b>${touch ? '长按' : '鼠标停在'}棋子上</b>，看它的等级、血量和技能`,
      '<b>军功</b>：吃子、将军、兵卒过河都得军功',
      '<b>升级</b>：选中棋子点「升级」；杀敌攒的甲片够数会<b>自动升级</b>',
      '<b>三级</b>解锁技能，<b>四级</b>成名将；棋身 木 → 银 → 金 → 玉',
      '打不死的目标头顶标 <b>-1</b>，能一击杀死才标<b>「殺」</b>',
      '<b>军功 20</b> 可发终极兵法；主帅兵法每局一次',
      '<b>决战</b>：双方车马兵炮都死光后，象、士、帅将可过河进攻，取消飞将',
    ].map(x => `<li>${x}</li>`).join('');
    $('bfTip').classList.remove('hidden');
    clearTimeout(bfTipT);
    if (!manual) bfTipT = setTimeout(() => $('bfTip').classList.add('hidden'), 14000);
  }
  // 兵法：给落点标上“这一下打不死，只扣 N 血”（棋盘上显示 -N；能一击杀死的仍显示「殺」）
  function bfDmg(moves, sk) {
    if (!game || !game.bf) return moves;
    return moves.map(m => {
      const p = game.at(m.from[0], m.from[1]), q = game.at(m.to[0], m.to[1]);
      if (!p || !q || q.t === 'k') return m;
      const n = sk === 'qishe' ? BF.CFG.skills.qishe.damage : sk === 'chongzhen' ? BF.CFG.skills.chongzhen.springDamage : game.atkOf(p);
      return q.hp > n ? { ...m, dmg: n } : m;
    });
  }
  const escTip = t => String(t || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ART_DESC = { r: '复活一枚被吃的己方子，回到它的开局位置（一级）。每局一次。', b: '连走两步（不能用技能，第二步不能将军）。此后 3 回合楚军不能用兵种技能。每局一次。' };
  const ULT_DESC = { r: `${BF.CFG.ultimates.cost} 军功，楚将两格内须有 ${BF.CFG.ultimates.simian.minPiecesInRadius} 枚汉子。${BF.CFG.ultimates.simian.rounds} 回合内楚军除将外不能移动，只能吃掉将军的子，也不算将军。`, b: `${BF.CFG.ultimates.cost} 军功。汉帅 ${BF.CFG.ultimates.hongmen.rounds} 回合不能动；汉士「护驾」可破。` };
  const artTip = s => `<b>主帅兵法 · ${BF.ART_CN[s]}</b><br>${ART_DESC[s]}`;
  const ultTip = s => `<b>终极兵法 · ${BF.ULT_CN[s]}</b><br>${ULT_DESC[s]}`;
  // 某一级的能力（血、攻、技能）
  function lvGain(p, lv) {
    const a = BF.levelInfo(p.t, p.s, lv - 1), b = BF.levelInfo(p.t, p.s, lv), out = [];
    if (b.hp > a.hp) out.push(`生命 ${b.hp}`);
    if (b.atk > a.atk) out.push(`攻击 ${b.atk}`);
    for (const k of b.skills) if (!a.skills.includes(k)) out.push(`${BF.CFG.skills[k].passive ? '被动' : '技能'}「${BF.SKILL_CN[k]}」`);
    if (lv === 2 && !out.length) out.push('换乌银棋身');
    return out.join('、') || '换装';
  }
  // 技能的一行小标签：几级 · 被动 / 冷却
  const skTag = sk => { const c = BF.CFG.skills[sk], lv = c.level || BF.CFG.skillLevel; return `${LVCN[lv]}级 · ${c.passive ? '被动' : '主动'}${c.cooldown ? ` · 冷却 ${c.cooldown}` : ''}`; };
  function skillTip(p, sk) {
    sk = sk || BF.SKILL_OF(p.t, p.s); if (!sk) return '';
    const c = BF.CFG.skills[sk], lv = c.level || BF.CFG.skillLevel;
    return `<b>${BF.SKILL_CN[sk]}</b> <small>${skTag(sk)}</small><br>${BF.SKILL_DESC[sk]}`;
  }
  function upTip(p, cost, base) {
    const nx = p.lv + 1;
    return `<b>升${LVCN[nx]}级 ·「${game.rankName(p, nx)}」</b><br>${lvGain(p, nx)}，回满血。<br>花 ${cost} 军功` + (base > cost ? `（甲片省 ${base - cost}）` : '') + `<br><small>甲片攒满 ${base} 片会自动升级，不花军功。</small>`;
  }
  // 棋子说明（悬停 / 长按棋子）：只说要紧的，一条一行
  function pieceTip(p) {
    const nm = `${SIDE_ARMY[p.s]}${pname(p)}`, hero = game.heroName ? game.heroName(p) : '';
    if (p.t === 'k') return `<b>${game.rankName(p)}</b><br>不能升级，不受技能伤害，只能被将死。` + (p.s === 'r' && game.fx.hm ? `<br><em>鸿门宴：还有 ${game.fx.hm} 回合不能动，士护驾可破</em>` : '');
    const info = BF.levelInfo(p.t, p.s, p.lv), mx = info.maxLv;
    let h = `<b>${hero ? hero + ' · ' : ''}${game.rankName(p)}</b> <small>${nm} ${LVCN[p.lv]}级</small><br>生命 ${p.hp}/${info.hp} · 攻击 ${game.atkOf(p)} · 甲片 ${p.xp || 0}`;
    for (const sk of game.skillsOf(p)) {
      const c = BF.CFG.skills[sk], lv = c.level || BF.CFG.skillLevel, cd = game.cdLeft(p, sk);
      const st = p.lv < lv ? `${LVCN[lv]}级解锁` : cd ? `冷却 ${cd}` : c.passive ? '被动' : '可用';
      h += `<br><b>「${BF.SKILL_CN[sk]}」</b><small>${st}</small> ${BF.SKILL_DESC[sk]}`;
    }
    if (p.lv < mx) { const cost = game.upgradeCost(p), base = game.baseCost(p); h += `<br><b>下一级</b>「${game.rankName(p, p.lv + 1)}」${lvGain(p, p.lv + 1)} <small>${cost} 功，或攒满 ${base} 片甲</small>`; }
    if (game.jmActive(p)) h += '<br><em>拒马中：来犯者先挨 1 点</em>';
    if (p.s === 'b' && game.fx.sm) h += `<br><em>军心涣散：还有 ${game.fx.sm} 回合不能移动</em>`;
    return h;
  }
  // 本回合技能可用的子（有目标、不在冷却）
  let rsKey = '', rsS = null, rsCache = [];
  function readySkills() {
    if (!game || !game.bf || game.result || game.freeUsed) return [];
    const key = game.entries.length + '|' + game.turn;
    if (key === rsKey && rsS === game.S) return rsCache;
    rsKey = key; rsS = game.S; rsCache = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = game.at(f, r); if (p && p.s === game.turn && p.lv >= 3 && game.skillTargets(f, r).length) rsCache.push([f, r]); }
    return rsCache;
  }
  // 主帅兵法 / 终极兵法不能用的原因：[按钮小字, 点击说明]；能用返回 null
  function artWhy(side, a) {
    if (a.art.length) return null;
    const N = BF.ART_CN[side];
    if (game.used.art[side]) return ['已用', `${N}每局只能用一次，已经用过了`];
    if (side === 'b' && game.fx.sm > 0) return ['涣散中', `四面楚歌：楚军军心涣散，还有 ${game.fx.sm} 回合不能用兵法`];
    if (side === 'r') {
      if (!game.dead.r.length) return ['暂无阵亡', '召回良将复活己方被吃的子；现在还没有子阵亡'];
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
    const rsOn = game && game.bf && mode && started && !ended && !busy && !bfMode && !dbgOn && canAct();
    const rs = rsOn ? readySkills() : [];
    Board.setGlow(rs);
    // 屏幕下方闪烁提示：本回合还有技能没用（点一下依次选中这些子）
    const sh = $('skHint');
    sh.classList.toggle('hidden', !rs.length);
    if (rs.length) sh.querySelector('small').textContent = `${rs.length} 枚子可用 · 点我查看`;
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
      // 按钮不可用时不用 disabled（点了没反应像坏了），改成灰色 + 点一下说明原因；所有按钮悬停 / 长按看说明
      const btn = (cls, act, ok, label, small, why, extra = '', tip = '') => `<button class="sk ${cls}${ok ? '' : ' off'}" data-a="${act}" ${ok ? '' : `data-why="${why}"`} data-tip="${escTip(tip || why)}">${label}<small>${small}</small>${extra}</button>`;
      if (a.p) {
        hint = (a.p.t === 'k' ? game.rankName(a.p) : `${game.heroName(a.p) ? game.heroName(a.p) + ' · ' : ''}${game.rankName(a.p)} · ${LVCN[a.p.lv]}级${pname(a.p)} · ${a.p.hp} 血`) + (game.atkOf(a.p) > 1 ? ` · 攻 ${game.atkOf(a.p)}` : '') + (a.p.xp ? ` · 甲 ${a.p.xp}` : '');
        if (a.p.t !== 'k') {
          if (a.cost != null) {
            const m = game.merit[a.p.s], save = a.base - a.cost;
            B.push(btn('up', 'up', a.canUp, `升${LVCN[a.p.lv + 1]}级`, game.upgraded ? '本回合已升' : `${a.cost} 功` + (save ? `·省${save}` : ''), game.upgraded ? '每次行动最多升级一次，下次行动再升' : `升级需要 ${a.cost} 军功，现在只有 ${m}`, '', upTip(a.p, a.cost, a.base)));
          }
          for (const k of a.skills) {
            const cn = BF.SKILL_CN[k.sk], skTip = skillTip(a.p, k.sk), C = BF.CFG.skills[k.sk];
            if (!k.have) { B.push(btn('', 'sk', false, cn, `${LVCN[k.lv]}级解锁`, `${cn}：升到${LVCN[k.lv]}级才解锁`, '', skTip)); continue; }
            // 不能用的原因由规则引擎给出（冷却、封锁、踏营须过河、没有目标……）
            const whyE = game.skillWhy(sel[0], sel[1], k.sk);
            const tag = w => (/冷却/.test(w) ? '冷却' : /敌方半场/.test(w) ? '须先过河' : /四面楚歌/.test(w) ? '涣散中' : /破釜/.test(w) ? '封锁中' : /拒马，/.test(w) ? '已用拒马' : '无目标');
            if (k.passive) {
              const small = whyE ? (k.cd ? `冷却 ${k.cd}` : tag(whyE)) : C.move ? '被动·直接走' : '被动';
              B.push(`<button class="sk pas off" data-a="sk" data-sk="${k.sk}" data-why="${escTip(whyE ? cn + '：' + whyE : cn + '是被动技能，' + (C.move ? '冷却好了就能直接走，不用点（落点带金圈）' : '走子落下时自动发动'))}" data-tip="${escTip(skTip + (whyE ? '<br><em>' + whyE + '</em>' : ''))}">${cn}<small>${small}</small></button>`);
              continue;
            }
            const cdTot = C.cooldown || 1, pct = k.cd ? Math.round(k.cd / cdTot * 100) : 0;
            const why = whyE ? cn + '：' + whyE : '', small = whyE ? tag(whyE) : C.free ? '不占行动' : '可用';
            B.push(btn(why ? '' : 'ready', 'sk" data-sk="' + k.sk, !why, cn, small, why, k.cd ? `<span class="cd" style="--p:${pct}%"></span><span class="cdn">${k.cd}</span>` : '', skTip + (why ? '<br><em>' + why + '</em>' : '')));
          }
        }
      }
      const side = a.side;
      // 手机：主帅兵法 / 终极兵法放在自己卡片上（点卡片上的签发动），技能栏只在选中棋子时出现，不压棋盘
      if (!isCompact()) {
        const aw = artWhy(side, a), uw = ultWhy(side, a);
        B.push(btn('art', 'art', !aw, BF.ART_CN[side], aw ? aw[0] : '每局一次', aw ? aw[1] : '', '', artTip(side) + (aw ? '<br><em>' + aw[1] + '</em>' : '')));
        B.push(btn('ult', 'ult', !uw, BF.ULT_CN[side], uw ? uw[0] : BF.CFG.ultimates.cost + ' 功', uw ? uw[1] : '', '', ultTip(side) + (uw ? '<br><em>' + uw[1] + '</em>' : '')));
      }
      if (a.pass) B.push(`<button class="sk${a.mustPass ? ' ready' : ''}" data-a="pass" data-tip="${escTip(a.mustPass ? '无子可走，只能停着（这一回合不行动）' : '四面楚歌期间楚军没被将军时可以停着：这一回合不行动')}">停 着<small>${a.mustPass ? '无子可走' : '按兵不动'}</small></button>`);
      if (!a.p) hint = game.freeUsed ? '已架拒马 · 请再走一步棋' : `${SIDE_ARMY[side]}行动 · 军功 ${game.merit[side]}`;
      if (isCompact() && !game.freeUsed) hint = '';
    }
    if (!B.length) { bar.classList.add('hidden'); $('bfRow').innerHTML = ''; $('bfHint').textContent = ''; layoutHud(); return; }
    $('bfHint').textContent = hint;
    $('bfRow').innerHTML = B.join('');
    $('bfRow').querySelectorAll('button[data-a]').forEach(b => b.onclick = ev => { ev.stopPropagation(); bfButton(b.dataset.a, b); });
    layoutHud();
  }
  let skillCycle = 0;
  $('skHint').addEventListener('click', ev => { ev.stopPropagation(); bfButton('pickSkill'); });
  async function bfButton(a, el) {
    if (!canAct()) return;
    Sfx.select && Sfx.select();
    if (a === 'pickSkill') { const rs = readySkills(); if (!rs.length) return; const p = rs[skillCycle++ % rs.length]; exitBfMode(false); bfSelect(p[0], p[1]); renderBar(); return; }
    if (el && el.classList.contains('off')) {
      toast(el.dataset.why || '现在不能用', 4200);
      if (a === 'ult' && game.turn === 'r' && !game.used.ult.r) simianZone();
      return;
    }
    if (a === 'cancel') { exitBfMode(false); Board.clearMoves(false); if (sel) bfSelect(sel[0], sel[1]); renderBar(); return; }
    if (a === 'up' && sel) { doBF({ k: 'up', at: sel }); return; }
    if (a === 'sk' && sel) {
      const av = bfAvail(), skn = (el && el.dataset.sk) || game.skillOf(av.p), k = (av.skills || []).find(x => x.sk === skn);
      if (!k) return;
      const cn = BF.SKILL_CN[skn];
      if (k.targets.length === 1 && !k.targets[0].to) { doBF(k.targets[0]); return; }
      bfMode = { kind: 'sk', targets: k.targets, hint: `${cn}：点选目标（${{ chongzhen: '点前方第一枚子当跳板', taying: '无视马腿', pili: '炮击敌子', qishe: '斜线两格内' }[skn] || ''}）` };
      Board.showMoves(sel, bfDmg(k.targets.map(t => ({ from: t.at, to: t.to, atk: true })), k.sk), true);
      renderBar(); return;
    }
    if (a === 'art') {
      if (game.turn === 'r') {
        const opts2 = game.reviveOptions();
        const id = await pick('召 回 良 将', '复活一枚被吃的子，放回它的开局位置（一级）。', opts2.map(o => ({ v: o.id, label: XQ.NAMES.r[o.t], cls: 'r' })));
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
      const U = BF.CFG.ultimates;
      const ok = await ask(BF.ULT_CN[s], s === 'b' ? `花 ${U.cost} 军功：接下来 ${U.hongmen.rounds} 回合汉帅不能移动（汉军三级以上的士护驾可破）。` : `花 ${U.cost} 军功：接下来 ${U.simian.rounds} 回合楚军军心涣散——除楚将外都不能移动，只能吃掉正在将军的子；不能用技能，也不算将军。`, 0, '发 动', '再想想');
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
    if (e.k === 'up' || info.free) {
      bfUpNote = (bfUpNote ? bfUpNote + ' ' : '') + note;
      bfReport(info); bfMerit(info);
      queueBF(info);
      updateHud(); publish();
      if (info.free) return true;
      if (!remote) setTimeout(() => { if (canAct() && game.turn === info.side) { const p = game.board.flat().find(x => x && x.id === info.id); const pos = p && (() => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (game.board[r][f] === p) return [f, r]; })(); if (pos) { bfSelect(pos[0], pos[1]); renderBar(); } } }, 50);
      return true;
    }
    notes.push((bfUpNote ? bfUpNote + ' ' : '') + note); bfUpNote = ''; renderLog();
    Fx.ply = game.history.length;
    if (remote && clk != null) clock[info.mover] = clk;
    clock.step = stepMax(); clock.oppStamp = 0;
    turnStartAt = 0;
    info.captured = info.cap; info.streak = captureStreak();
    if (info.result && info.result.reason === 'checkmate') info.mateName = XQ.mateName(game.board, info.result.loser);
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
      if (info.k === 'up' || info.free) { updateHud(); return; }
      clock.step = stepMax(); clock.last = performance.now();
      if (online() && game.turn === mySide) Net.send({ t: 'clk', side: mySide, total: clock[mySide], step: clock.step });
      const kills = game.history.reduce((n, h) => n + (h.kills ? h.kills.length : 0), 0);
      Sfx.Music.setIntensity(game.result ? 1 : game.inCheck() ? 0.95 : Math.min(0.72, 0.32 + kills * 0.03));
      afterMoveLines(info);
      if (info.captured) Spect.react(info.mover);
      if (!busy && game.turn === mySide) { turnStartAt = performance.now(); slowIdx = 0; }
      updateHud();
      if (game.mustPass() && canAct() && (mode === 'local' || game.turn === mySide)) toast(`${SIDE_CN[game.turn]}方无子可走，请点「停着」`, 2600);
      else if (game.mayPass() && game.fx.sm > 0 && canAct() && (mode === 'local' || game.turn === mySide)) toast('四面楚歌：楚军只能走将，或点「停着」', 2800);
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
    if (info.k === 'up') line = `${nm(s, info.t)}晋升「${BF.rankName(s, info.t, info.lv)}」（${LVCN[info.lv]}级）` + (info.usedXp ? `，用掉 ${info.usedXp} 片甲` : '');
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
      else if (sk === 'hujia') line = info.extra.rescue ? '樊哙闯帐：汉士护驾，鸿门宴破' : `${nm(s, P0.t)}护驾，与${s === 'r' ? '汉王' : '霸王'}换位`;
      else if (sk === 'chongzhen') line = foe.length >= 2 ? `${SIDE_ARMY[s]}车冲阵，连破${SIDE_ARMY[o]}两阵` : foe.length ? `${SIDE_ARMY[s]}车冲阵，击破${nm(o, foe[0].t)}` : `${SIDE_ARMY[s]}车冲阵受阻`;
      else line = `${nm(s, P0.t)}${cn}` + (foe.length ? `，击杀${foe.map(k => XQ.NAMES[o][k.t]).join('、')}` : '') + (hurt.length ? `，${hurt.length} 子负伤` : '');
    } else if (info.k === 'art') line = s === 'r' ? `召回良将：${nm('r', (ev.find(x => x.e === 'revive') || {}).t || 'p')}重回阵前` : `项羽破釜沉舟，楚军连进两步` + (kills.length ? `，击杀${kills.filter(k => k.s === o).map(k => XQ.NAMES[o][k.t]).join('、')}` : '');
    else if (info.k === 'ult') line = s === 'b' ? `鸿门宴：汉王 ${BF.CFG.ultimates.hongmen.rounds} 回合不得移动` : '四面楚歌：楚军军心涣散，动弹不得';
    else if (info.k === 'pass') line = `${SIDE_ARMY[s]}按兵不动`;
    if (info.k === 'mv' && info.extra && info.extra.via === 'shensu') line = `${nm(s, 'p')}神速营疾行` + (info.check ? '，将军！' : '');
    if (ev.some(x => x.e === 'final')) { line = (line ? line + '；' : '') + '决战：双方车马兵炮尽没，象、士、帅将皆可过河'; showFinalTip(); }
    const au = ev.find(x => x.e === 'autoup');
    if (au) { const hero = BF.heroName({ s: au.s, t: au.t, nm: au.nm }); line = (line ? line + '；' : '') + `${nm(au.s, au.t)}战功晋升「${hero || BF.rankName(au.s, au.t, au.lv)}」`; }
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
    if (info.k === 'up') sum[info.side] -= info.cost;
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
    // 再点一次同一个按钮（或点「停止摆放」）就退出摆放，回到“点棋盘选中棋子”
    $('dbgPal').querySelectorAll('button').forEach(b => b.onclick = () => {
      const same = dbgPick && (dbgPick.t || '') === b.dataset.t && (dbgPick.s || '') === b.dataset.s;
      dbgPick = same ? null : b.dataset.t ? { s: b.dataset.s, t: b.dataset.t } : { t: '' }; dbgPaint();
    });
    $('dbgStop').classList.toggle('hidden', !dbgPick);
    $('dbgTip').textContent = !dbgPick ? '点下面的子开始摆放；现在点棋盘是选中棋子。' : dbgPick.t ? `正在摆放：${SIDE_ARMY[dbgPick.s]}${XQ.NAMES[dbgPick.s][dbgPick.t]}（${dbgPick.t === 'k' ? '主帅不分等级' : '一二三四'[dbgLv - 1] + '级'}），点棋盘连续摆。` : '正在清除：点棋盘上的子把它拿掉。';
    $('bfDebug').querySelectorAll('[data-plv]').forEach(b => b.classList.toggle('on', +b.dataset.plv === dbgLv));
    const p = dbgSel && game.at(dbgSel[0], dbgSel[1]);
    $('dbgSel').textContent = p ? `${SIDE_ARMY[p.s]}${pname(p)} · ${p.lv}级 · ${p.hp}血 · 甲${p.xp || 0} · 冷却${game.cdLeft(p)}` : '—';
    $('dbgNoCd').textContent = '无冷却：' + (dbgNoCd ? '开' : '关'); $('dbgNoCd').classList.toggle('on', dbgNoCd);
    $('dbgFree').textContent = '自由移动：' + (dbgFree ? '开' : '关'); $('dbgFree').classList.toggle('on', dbgFree);
    $('dbgMr').value = game.merit.r; $('dbgMb').value = game.merit.b; $('dbgRound').value = game.round;
  }
  function dbgApply(fn) {
    game.setup(fn); game.noCd = dbgNoCd;
    notes = []; bfUpNote = ''; renderLog();
    Board.syncPosition(game); Board.faceViewer(viewSide); Board.showLast(null);
    barKey = ''; dbgPaint(); updateHud();
  }
  function dbgClick(f, r) {
    if (dbgPick) {
      dbgApply(T => {
        if (!dbgPick.t) { const q = T.board[r][f]; if (q && q.t !== 'k') T.board[r][f] = null; return; }
        const ids = T.board.flat().filter(Boolean).map(x => x.id).concat(T.dead.r.map(x => x.id), T.dead.b.map(x => x.id));
        if (dbgPick.t === 'k') { for (let rr = 0; rr < 10; rr++) for (let ff = 0; ff < 9; ff++) { const q = T.board[rr][ff]; if (q && q.t === 'k' && q.s === dbgPick.s) T.board[rr][ff] = null; } }
        const old = T.board[r][f]; if (old && old.t === 'k') return;
        const lv = dbgPick.t === 'k' ? 1 : Math.min(BF.levelInfo(dbgPick.t, dbgPick.s, 1).maxLv, dbgLv);
        T.board[r][f] = { s: dbgPick.s, t: dbgPick.t, id: Math.max(31, ...ids) + 1, lv, hp: dbgPick.t === 'k' ? 1 : BF.hpOf(dbgPick.t, lv), cd: 0, jm: 0, xp: 0, kills: 0 };
      });
      dbgSel = [f, r]; dbgPaint(); return;
    }
    dbgSel = game.at(f, r) ? [f, r] : null; dbgPaint();
    if (dbgSel) Board.showMoves(dbgSel, [], false); else Board.clearMoves(false);
  }
  function dbgPiece(fn) { if (!dbgSel) return; dbgApply(T => { const p = T.board[dbgSel[1]][dbgSel[0]]; if (p && p.t !== 'k') fn(p); }); }
  $('bfDebug').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => dbgPiece(p => { const mx = BF.levelInfo(p.t, p.s, 1).maxLv; p.lv = Math.min(mx, +b.dataset.lv); p.hp = BF.hpOf(p.t, p.lv); }));
  $('bfDebug').querySelectorAll('[data-xp]').forEach(b => b.onclick = () => dbgPiece(p => { p.xp = Math.max(0, (p.xp || 0) + +b.dataset.xp); }));
  $('bfDebug').querySelectorAll('[data-hp]').forEach(b => b.onclick = () => dbgPiece(p => { p.hp = Math.max(1, Math.min(BF.hpOf(p.t, p.lv), p.hp + +b.dataset.hp)); }));
  $('bfDebug').querySelectorAll('[data-plv]').forEach(b => b.onclick = () => { dbgLv = +b.dataset.plv; dbgPaint(); });
  $('dbgStop').onclick = () => { dbgPick = null; dbgPaint(); };
  const DBG_CLEAR_CD = T => { for (const p of T.board.flat()) if (p) { p.cd = 0; p.jm = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; } };
  $('dbgNoCd').onclick = () => { dbgNoCd = !dbgNoCd; if (dbgNoCd) dbgApply(DBG_CLEAR_CD); else { game.noCd = false; dbgPaint(); } toast(dbgNoCd ? '无冷却：技能用完不进冷却' : '无冷却已关'); };
  $('dbgFree').onclick = () => { dbgFree = !dbgFree; dbgPaint(); toast(dbgFree ? '自由移动：不分回合，点哪边的子就走哪边' : '自由移动已关'); };
  // 自由移动：点到不该走的那一方的子（又不是当前选中子的攻击目标），就把走棋权切给它
  function dbgFreeTurn(p) {
    if (!dbgFree || mode !== 'local' || !game.bf || !p || bfMode) return;
    const pc = game.at(p[0], p[1]);
    if (!pc || pc.s === game.turn) return;
    if (sel && selMoves.some(m => m.to[0] === p[0] && m.to[1] === p[1])) return;
    const s = pc.s;
    dbgApply(T => { const n = Math.min(T.cnt.r, T.cnt.b); T.turn = s; T.cnt = s === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.upgraded = false; T.freeUsed = false; T.jmLock = null; });
    Board.clearMoves(false); sel = null; selMoves = [];
  }
  $('dbgCd').onclick = () => dbgApply(T => { for (const p of T.board.flat()) if (p) { p.cd = 0; p.jm = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; } });
  $('dbgMr').onchange = () => dbgApply(T => { T.merit.r = Math.max(0, Math.min(30, +$('dbgMr').value || 0)); });
  $('dbgMb').onchange = () => dbgApply(T => { T.merit.b = Math.max(0, Math.min(30, +$('dbgMb').value || 0)); });
  $('dbgRound').onchange = () => dbgApply(T => { const n = Math.max(1, +$('dbgRound').value || 1) - 1; T.cnt = T.turn === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.fx = { hm: 0, sm: 0, pf: 0 }; T.ckHist = { r: [], b: [] }; });
  $('bfDebug').querySelectorAll('[data-turn]').forEach(b => b.onclick = () => dbgApply(T => { const n = Math.min(T.cnt.r, T.cnt.b); T.turn = b.dataset.turn; T.cnt = T.turn === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.upgraded = false; T.freeUsed = false; T.jmLock = null; }));
  $('dbgArts').onclick = () => dbgApply(T => { T.used = { art: { r: 0, b: 0 }, ult: { r: 0, b: 0 } }; });
  $('dbgFx').onclick = () => dbgApply(T => { T.fx = { hm: 0, sm: 0, pf: 0 }; });
  $('dbgClear').onclick = () => dbgApply(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.t !== 'k') T.board[r][f] = null; } });
  $('dbgReset').onclick = () => { game = new BF.Game(); dbgApply(() => { }); };
  $('dbgClose').onclick = () => { dbgOn = false; dbgPick = null; $('bfDebug').classList.add('hidden'); Board.clearMoves(false); updateHud(); };
  $('tRule').onclick = () => showBfTip(true);
  $('bfTipMore').onclick = () => { $('bfTip').classList.add('hidden'); $('mHelp').classList.remove('hidden'); };
  $('bfTipOk').onclick = () => { $('bfTip').classList.add('hidden'); clearTimeout(bfTipT); };
  $('tDebug').onclick = () => {
    $('mSet').classList.add('hidden'); if (!game.bf || mode !== 'local') return; dbgOn = !dbgOn; $('bfDebug').classList.toggle('hidden', !dbgOn); if (dbgOn) { dbgPick = null; dbgSel = null; dbgPaint(); toast('调试摆子：选子后点棋盘；改完关掉面板即可接着下'); } updateHud(); };

  // ---------- 悔棋 ----------
  function undoPlies(side) { return game.turn === side ? 2 : 1; }
  function canUndo() {
    if (!started || ended || busy || game.result || !opts.undo || pendingUndo || pendingJ) return false;
    const s = actor();
    if (mode === 'local') return game.history.length > 0 && (opts.undo >= 99 || undoUsed[XQ.other(game.turn)] < opts.undo);
    if (opts.undo < 99 && undoUsed[s] >= opts.undo) return false;
    const n = undoPlies(s);
    if (game.history.length < n) return false;
    if (vsAI()) return true;
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
    if (vsAI()) {
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
  function bfUndoTarget(plies) { return game.undoTarget(plies); }
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
      if (!vsAI()) toast(`${SIDE_CN[side]}方悔棋`);
      turnStartAt = performance.now(); slowIdx = 0;
      updateHud(); publish();
      maybeAI();
    });
  }

  // ---------- 喊话 ----------
  const bubT = {};
  // who：说话的不是主帅本人时（比如张良）写上名字
  function bubble(side, text, ms = 3500, who) {
    const mine = side === bottomSide();
    const el = mine ? $('bubMe') : $('bubOpp');
    el.querySelector('b').textContent = `${SIDE_CN[side]} · ${who || NAME[side]}`;
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
    if (vsAI() && Math.random() < 0.7) setTimeout(() => { if (!ended) aiSay('reply'); }, 2300);
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
        if (!mode && !mode_starting) {
          // 还没开局：对手先在房间里入座；他点了「准备」、房主再点「开始」才开局
          if (room && room.host) {
            if (room.ai) { Net.send({ t: 'full' }); Net.freeSeat(); return; }   // 房主在和人机下：来人去观战席
            if (!room.seated) { room.seated = true; room.ready = AUTOSTART; toast('对手已入座'); try { Net.hallTouch(); } catch (e) { } paintRoom(); }
            roomTell();
            if (AUTOSTART) roomBegin();
            return;
          }
          return;
        }
        Net.send({ t: 'welcome', state: snapshot() });
        break;
      case 'seat':
        // 我已入座：进房间界面，点「准备」，等房主开局
        if (mode || Net.role !== 'guest') return;
        if (!room) {
          room = { code: Net.code, host: false, hostSide: d.hostSide, seated: true, ready: !!d.ready };
          opts = d.opts || {};
          showPane('pWait'); $('roomCode').textContent = Net.code; $('waitChips').innerHTML = chipsFor(d.opts || {}, d.hostSide); $('roomLock').classList.toggle('hidden', !(d.opts && d.opts.pwh));
        } else room.ready = !!d.ready;
        paintRoom();
        break;
      case 'ready':
        if (Net.role === 'host' && room && room.host && room.seated && !mode) { room.ready = !!d.on; paintRoom(); roomTell(); }
        break;
      case 'needpw':
        if (mode || pwAsking) return;
        pwAsking = true;
        askText('房 间 密 码', store.get('pw-' + Net.code, '') ? '密码不对，请重新输入。' : '这个房间上了密码。', '密码').then(pw => {
          pwAsking = false;
          if (pw == null) { Net.close(); clearInterval(joinTimer); clearUrl(); showPane('pHall'); return; }
          store.set('pw-' + Net.code, pwHash(Net.code, pw)); Net.send(joinMsg());
        });
        break;
      case 'welcome':
        if (mode === 'guest' && started) { syncFrom(d.state); return; }
        if (mode) return;
        clearInterval(joinTimer); closeRoom();
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
        if (introSkip) introSkip();   // 对手跳过开场先走了：我这边的开场白也收掉
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
        if (introSkip) introSkip();
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
      case 'pause': onPause(d, other(mySide)); break;
      case 'emote': emote(other(mySide), d.i ?? null, typeof d.text === 'string' ? d.text.replace(/[<>]/g, '').slice(0, 24) : ''); break;
      case 'bye':
        if (room && room.host && !mode) { room.seated = false; room.ready = false; Net.freeSeat(); paintRoom(); toast('对手离开了座位'); try { Net.hallTouch(); } catch (e) { } break; }
        toast('对手离开了房间', 3000); break;
    }
  }
  let mode_starting = false, pwAsking = false;
  function syncFrom(st) {
    if (!st || RP) return;
    const stLen = game.bf ? (st.bfe || []).length : (st.moves || []).length, myLen = game.bf ? game.entries.length : game.history.length;
    // 房主已开了新的一局，但“再来一局”的消息丢了 → 跟着重开
    if (!stLen && !st.result && (game.result || ended) && !(game.jq && st.jq && JK && st.jq.gid !== JK.gid)) { if (Ending.running) { pendingRestart = st; Ending.skip(); } else restart(st); return; }
    // 我认输 / 超时的消息对方没收到 → 补发
    if (game.result && !st.result && stLen === myLen && (game.result.reason === 'resign' || game.result.reason === 'timeout') && game.result.loser === mySide) Net.send({ t: game.result.reason, side: mySide });
    // 揭棋：房主那边已是新的一局（换了牌）→ 跟着重开
    if (game.jq && st.jq && JK && st.jq.gid !== JK.gid) { restart(st); return; }
    if (game.jq && st.jq && st.jq.cin) { const opp = other(mySide); if (!JC.cin[opp] && Jieqi.validCommits(st.jq.cin[opp])) JC.cin[opp] = st.jq.cin[opp]; if (!JC.cout[mySide] && Jieqi.validCommits(st.jq.cout && st.jq.cout[mySide])) JC.cout[mySide] = st.jq.cout[mySide]; }
    if (game.jq && st.jq && JK && !(st.jq.cin && st.jq.cin[mySide])) Net.send({ t: 'jqc', gid: JK.gid, ...Jieqi.pub(JK) });
    if (game.bf) { bfSync(st, false); return; }
    const mine = game.history, theirs = st.moves || [];
    const same = (a, b) => a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
    const prefix = (a, b) => a.length <= b.length && a.every((m, i) => same(m, b[i]));
    // 我请求的悔棋对方已经同意、但“同意”的消息丢了：对方棋局正好少了这几步 → 照样悔棋
    if (pendingUndo && pendingUndo.side === mySide && prefix(theirs, mine) && mine.length - theirs.length === pendingUndo.plies) { applyUndo(pendingUndo.plies, mySide); undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st); updateHud(); return; }
    if (prefix(mine, theirs)) { for (const m of theirs.slice(mine.length)) doMove({ from: m.from, to: m.to, rv: m.rv, cj: m.cj }, true); }
    else if (prefix(theirs, mine) && mine.length - theirs.length === 1 && game.turn !== mySide) { const m = mine[mine.length - 1]; Net.send({ t: 'move', n: mine.length - 1, from: m.from, to: m.to, clk: clock[mySide] }); }
    else if (prefix(theirs, mine) && mine.length - theirs.length === 1 && game.turn === mySide) { /* 对方自己的那步还没落定（揭棋等揭示），不回滚，等它补上 */ }
    else { applyState(st); }
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function onPeer(s) {
    try { Net.hallTouch(); } catch (e) { }   // 大厅名册：有人入座 / 离座，马上更新“等对手 / 对局中”
    if (s === 'ok' && mode === 'guest' && started) Net.send({ t: 'syncReq' });
    if (s === 'ok' && mode === 'host' && started) Net.send({ t: 'sync', state: snapshot() });
    if (s === 'lost') lostSince = Date.now(); else lostSince = 0;
    if (s === 'ok' && started && !ended && lostSince === 0 && wasLost) toast('对手已重新连上，继续对局');
    wasLost = s === 'lost';
    updateHud();
  }
  // ---------- 断线：自己掉线（线路全断）或对手掉线，双方时钟都暂停；状态栏显示已等多久 ----------
  let wasLost = false, lineDownSince = 0, lineWasUp = false;
  const netDown = () => online() && !(opts && opts.ai) && (!Net.lineOk || Net.peerState !== 'ok');
  function netText() {
    if (!Net.lineOk) { const s = lineDownSince ? Math.floor((Date.now() - lineDownSince) / 1000) : 0; return `网络断开，正在重连${s >= 2 ? ' · ' + s + ' 秒' : '…'} · 时钟暂停`; }
    const s = lostSince ? Math.floor((Date.now() - lostSince) / 1000) : 0;
    return `对手掉线，等待重连${s ? ' · ' + s + ' 秒' : '…'} · 时钟暂停`;
  }
  setInterval(() => { if (started && !ended && !RP && netDown()) updateHud(); }, 1000);
  // 心跳里带上棋局进度（步数、是否终局）：双方连续两次对不上，就请求 / 推送一次同步，防止丢消息后互相干等
  let digestBad = 0, digestT = 0;
  function pingInfo() {
    if (!online() || !started) return null;
    const G = RP ? RP.real : game;
    return { n: G.bf ? G.entries.length : G.history.length, r: G.result ? 1 : 0 };
  }
  function onPing(d) {
    const me = pingInfo();
    if (!me || d.n == null || (me.n === d.n && me.r === (d.r || 0)) || pendingJ || pendingUndo || busy) { digestBad = 0; return; }
    if (++digestBad < 2 || Date.now() - digestT < 6000) return;
    digestT = Date.now(); digestBad = 0;
    if (mode === 'guest') Net.send({ t: 'syncReq' }); else Net.send({ t: 'sync', state: snapshot() });
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
    if (!n && lineWasUp) { lineDownSince = Date.now(); if (online() && started && !ended) toast('网络断开，正在自动重连…', 2400); }
    if (n && !lineWasUp && lineDownSince) {
      // 断线后重新连上：房主把整盘棋推给对手（客人那边会自动重新入座并拿到棋局）
      lineDownSince = 0;
      if (online() && started) {
        if (mode === 'host') { publish(); Net.send({ t: 'sync', state: snapshot() }); }
        else Net.send({ t: 'syncReq' });
        if (!ended) toast('已重新连上，继续对局', 2000);
      }
    }
    lineWasUp = !!n;
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
    setTimeout(paintRoom, 0);
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
        else if (d.t === 'pause') onPause(d, side);
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
    if (mode !== 'watch' && d.opts.pwh && store.get('pw-' + Net.code, '') !== d.opts.pwh) {
      if (pwAsking) return;
      pwAsking = true;
      askText('房 间 密 码', '这个房间上了密码，观战也要输入。', '密码').then(pw => {
        pwAsking = false;
        if (pw == null) { leaveGame(); return; }
        const hh = pwHash(Net.code, pw);
        if (hh === d.opts.pwh) { store.set('pw-' + Net.code, hh); onWatchRoom(d); } else { toast('密码不对'); onWatchRoom(d); }
      });
      return;
    }
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
    // 我请求的悔棋对方已同意、但“同意”的消息丢了 → 照样悔棋
    if (!watch && pendingUndo && pendingUndo.side === mySide && T.length < E.length && prefix(T, E) && T.length === bfUndoTarget(pendingUndo.plies)) { applyUndo(pendingUndo.plies, mySide); undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st); updateHud(); return; }
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
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
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
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
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
  // 退出对局 = 回到主菜单（不重载页面）。只有演出正放到一半、状态收不干净时才退而求其次整页重载
  function leaveGame() {
    cancelAI();
    try { if (online()) Net.send({ t: 'bye' }); } catch (e) { }
    try { Net.close(); } catch (e) { }
    clearInterval(specTimer); clearInterval(joinTimer);
    if (busy || Ending.running || (ended && endSkipRes)) { try { sessionStorage.setItem('xq3d-back', '1'); } catch (e) { } location.href = location.pathname; return; }
    try {
      if (introSkip) introSkip();
      if (RP) exitReplay(true);
      setPause(null); closeAsk(); Voice.cancel();
      mode = null; started = false; ended = false; pendingUndo = null; bfMode = null; dbgOn = false; resumeKey = '';
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      Ending.hideCard(); clearFinale(); Camp.reset(); Fx.clearMarks(); Board.clearMoves(); Board.showLast(null); Spect.clear();
      Core.Time.skip = false; Core.Cam.cine = false;
      game = new XQ.Game(); Board.setSkin(0); Board.setPosition(game); Core.Cam.setSide('r'); Board.faceViewer('r'); viewSide = 'r';
      closeRoom();
      for (const id of ['hud', 'skip', 'bfReport', 'bfDebug', 'log', 'mSet', 'mAsk', 'mNews', 'mHelp', 'chat', 'netbadge', 'rpBar', 'bfTip']) { const el = $(id); if (el) el.classList.add('hidden'); }
      for (const id of ['banner', 'bubMe', 'bubOpp', 'cdBig', 'cdRed']) $(id).classList.remove('on', 'hot');
      paintVeil();
      $('lobby').classList.remove('hidden', 'intro'); showPane('pMain'); lobbySpin = true;
      Sfx.Music.setIntensity(0.2);
    } catch (e) { console.error(e); location.href = location.pathname; }
  }

  // ---------- 大厅 ----------
  const panes = ['pMain', 'pAI', 'pHall', 'pCreate', 'pWait', 'pJoin'];
  const showPane = id => { panes.forEach(p => $(p).classList.toggle('hidden', p !== id)); if (id === 'pMain') paintResume(); if (id === 'pHall') openHall(); else closeHall(); };
  // ---------- 游戏大厅：公开房间列表（实时），点一下就加入；也可以创建房间或输入房间码 ----------
  let hallTimer = null;
  const HV = { std: ['象', '象棋'], jq: ['揭', '揭棋'], bf: ['技', '技能模式'] };
  function paintHall(list) {
    list = list || Net.hallList();
    const L = $('hallList');
    $('hallNote').innerHTML = !Net.hallOk ? '<span class="spin"></span>正在连接大厅…' : list.length ? `${list.filter(x => x.st === 'open').length} 个房间在等对手` : '暂时没有公开的房间——创建一个，等人来战';
    L.innerHTML = list.slice(0, 30).map(d => {
      const v = HV[d.v] || HV.std, open = d.st === 'open';
      const tm = (+d.total ? `每方 ${+d.total} 分` : '不限时') + (+d.step ? ` · 每步 ${+d.step >= 60 ? (+d.step / 60) + ' 分' : +d.step + ' 秒'}` : '');
      const code = String(d.code).replace(/[^A-Z0-9]/g, '').slice(0, 5);
      return `<li class="${open ? 'open' : 'play'}"><span class="hv ${d.v === 'bf' ? 'bf' : d.v === 'jq' ? 'jq' : ''}">${v[0]}</span><span class="hi"><b>${v[1]}</b> · 房间 ${code}${d.lock ? ' 🔒' : ''}<small>${open ? `房主执${d.side === 'r' ? '红（汉）' : '黑（楚）'}，你执${d.side === 'r' ? '黑（楚）' : '红（汉）'}` : '对局中'} · ${tm}</small></span><button class="btn small ${open ? 'red solid' : ''}" data-code="${code}">${open ? '加 入' : '观 战'}</button></li>`;
    }).join('');
    L.querySelectorAll('button[data-code]').forEach(b => b.onclick = () => { Sfx.init(); applySettings(); closeHall(); showPane('pJoin'); $('joinCode').value = b.dataset.code; joinRoom(b.dataset.code); });
  }
  function openHall() { Net.hallOpen(paintHall); paintHall([]); clearInterval(hallTimer); hallTimer = setInterval(() => paintHall(), 4000); }
  function closeHall() { clearInterval(hallTimer); hallTimer = null; try { Net.hallClose(); } catch (e) { } }
  setTimeout(() => $('lobby').classList.remove('intro'), 3800);
  try { if (sessionStorage.getItem('xq3d-back')) { sessionStorage.removeItem('xq3d-back'); $('lobby').classList.remove('intro'); } } catch (e) { }
  const VAR_NOTE = { std: '标准中国象棋', jq: '揭棋：十五子反扣，走动方知真身', bf: '技能模式：升级、生命值、兵种技能与主帅兵法' };
  const paintVar = () => { $('varNote').textContent = VAR_NOTE[ropts.v] || ''; $('optSkin').classList.toggle('hidden', ropts.v === 'bf'); };
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
    startGame('ai', side, { undo: aopts.undo, total: aopts.total, step: aopts.step || 0, hints: aopts.hints, level: aopts.level, skin: aopts.skin || 0 });
  };
  $('bHall').onclick = () => showPane('pHall');
  $('bRoomStart').onclick = roomBegin;
  $('bRoomReady').onclick = () => { if (!room || room.host) return; room.ready = !room.ready; Net.send({ t: 'ready', on: room.ready }); paintRoom(); };
  // 客人改当观众：让出座位，转去观战席
  $('bRoomWatch').onclick = () => { if (!room || room.host) return; const code = room.code; closeRoom(); clearInterval(joinTimer); try { Net.send({ t: 'bye' }); } catch (e) { } showPane('pJoin'); enterWatch(code); };
  $('bRoomAI').onclick = () => { if (!room || !room.host || room.seated) return; room.ai = room.ai ? null : ($('roomAILv').value || 'mid'); paintRoom(); try { Net.hallTouch(); } catch (e) { } };
  $('lockOn').onchange = () => { $('lockPw').classList.toggle('hidden', !$('lockOn').checked); if ($('lockOn').checked) $('lockPw').focus(); };
  $('bBackH').onclick = () => showPane('pMain');
  $('bCreate').onclick = () => { createFor = 'host'; $('createTitle').textContent = '房 间 设 置'; $('bCreateGo').textContent = '创 建'; $('optPub').classList.remove('hidden'); $('optLock').classList.remove('hidden'); showPane('pCreate'); };
  $('bLocal').onclick = () => { createFor = 'local'; $('optPub').classList.add('hidden'); $('optLock').classList.add('hidden'); $('createTitle').textContent = '本 地 对 战'; $('bCreateGo').textContent = '开 始'; showPane('pCreate'); };
  $('bJoinShow').onclick = () => { showPane('pJoin'); setTimeout(() => $('joinCode').focus(), 50); };
  $('bBack1').onclick = () => showPane(createFor === 'host' ? 'pHall' : 'pMain');
  const clearUrl = () => { try { history.replaceState(null, '', location.pathname); } catch (e) { } };
  $('bBack3').onclick = () => { Net.close(); clearInterval(joinTimer); clearUrl(); showPane('pHall'); };
  $('bBack2').onclick = () => { const wasHost = room && room.host; closeRoom(); clearInterval(joinTimer); if (wasHost) { Net.clearRoom(); store.del('host'); } Net.close(); clearUrl(); showPane('pHall'); };
  const httpUrl = /^https?:$/.test(location.protocol);
  const inviteUrl = code => location.origin + location.pathname + '?room=' + code;
  $('bCreateGo').onclick = () => {
    Sfx.init(); applySettings();
    const o = { undo: ropts.undo, total: ropts.total, step: ropts.step, hints: ropts.hints, jq: ropts.v === 'jq' ? 1 : 0, bf: ropts.v === 'bf' ? 1 : 0, skin: ropts.v === 'bf' ? 0 : ropts.skin || 0, pub: createFor === 'host' && +ropts.pub ? 1 : 0 };
    const side = ropts.side === 'x' ? (Math.random() < 0.5 ? 'r' : 'b') : ropts.side;
    if (createFor === 'local') { startGame('local', 'r', o); return; }
    const code = Net.gen(), pw = $('lockOn').checked ? $('lockPw').value.trim() : '';
    if ($('lockOn').checked && !pw) { toast('请输入房间密码，或取消勾选'); $('lockPw').focus(); return; }
    if (pw) { o.pwh = pwHash(code, pw); store.set('pw-' + code, o.pwh); }
    hostRoom(code, o, side);
  };
  function chipsFor(o, side) {
    return [o.bf ? '技能模式' : o.jq ? '揭棋' : '象棋', `房主执${side === 'r' ? '红·汉' : '黑·楚'}`, o.undo ? (o.undo >= 99 ? '悔棋不限' : `悔棋 ${o.undo} 次`) : '不许悔棋', o.total ? `每方 ${o.total} 分钟` : '不限总时', o.step ? `每步 ${o.step >= 60 ? o.step / 60 + ' 分' : o.step + ' 秒'}` : '不限步时', o.hints ? '显示可杀' : '不显示可杀']
      .map(t => `<span class="chip">${t}</span>`).join('');
  }
  // ---------- 房间：两个座位（红·汉 / 黑·楚）+ 观战席。对手入座后倒数 5 秒开局，房主也可以立即开始 ----------
  let room = null;   // { code, host: 我是不是房主, hostSide, seated: 客座有没有人, ready: 客人准备好没有, ai: 房主加的人机档位 }
  const AUTOSTART = (() => { try { return !!localStorage.getItem('xq3d-autostart'); } catch (e) { return false; } })();   // 测试用：客人自动准备、房主自动开始
  function paintRoom() {
    if (!room) return;
    const seat = side => {
      const hostSeat = side === room.hostSide, mine = hostSeat === room.host, ai = !hostSeat && room.ai, taken = hostSeat || room.seated || ai;
      const who = ai ? `人机 · ${LV[room.ai] || ''}` : taken ? (mine ? '你' : hostSeat ? '房主' : '对手') : '空位';
      const st = hostSeat ? '房主' : ai ? '电脑' : !taken ? '等待对手…' : room.ready ? '<b style="color:#2f7d4f">已准备</b>' : '还没准备';
      return `<div class="seat ${side}${taken ? '' : ' empty'}${mine ? ' me' : ''}"><span class="sd">${side === 'r' ? '红·汉' : '黑·楚'}</span><div class="who">${who}</div><small>${st}${side === 'r' ? ' · 先手' : ''}</small></div>`;
    };
    $('roomSeats').innerHTML = seat('r') + seat('b');
    const ps = [...Spect.people.values()].filter(p => !p.self);
    $('roomSpecs').innerHTML = ps.length ? ps.map(p => `<i>${String(p.name).replace(/[<>&]/g, '')}</i>`).join('') : '暂时没有观众';
    const canAI = room.host && !(opts && (opts.bf || opts.jq));
    $('roomHostRow').classList.toggle('hidden', !room.host);
    $('roomGuestRow').classList.toggle('hidden', room.host);
    $('roomInvite').classList.toggle('hidden', !room.host);
    if (!room.host) $('qrWrap').classList.add('hidden');
    if (room.host) {
      const ok = !!room.ai || (room.seated && room.ready);
      $('bRoomStart').classList.toggle('off', !ok);
      $('bRoomAI').classList.toggle('hidden', !canAI || room.seated);
      $('bRoomAI').textContent = room.ai ? '移除人机' : '添加人机';
      $('roomAILv').classList.toggle('hidden', !canAI || room.seated || !!room.ai);
      if (Net.lineOk) $('waitNote').innerHTML = room.ai ? '人机已就位，点「开始」开局；其他人进来会坐到观战席' : !room.seated ? '<span class="spin"></span>等待对手入座…（也可以添加人机）' : room.ready ? '对手已准备，点「开始」开局' : '对手已入座，等他点「准备」';
    } else {
      $('bRoomReady').textContent = room.ready ? '取消准备' : '准 备';
      $('bRoomReady').classList.toggle('solid', !room.ready);
      $('waitNote').innerHTML = room.ready ? '<span class="spin"></span>已准备，等房主开始…' : '点「准备」后房主才能开始；也可以改为观战';
    }
  }
  function roomTell() { if (room && room.host && room.seated) Net.send({ t: 'seat', hostSide, opts, ready: room.ready }); }
  function roomBegin() {
    if (!room || !room.host || mode || mode_starting) return;
    if (!(room.ai || (room.seated && room.ready))) { toast(room.seated ? '对手还没准备' : '还没有对手：等人入座，或者添加人机'); return; }
    mode_starting = true;
    if (room.ai) { opts = { ...opts, ai: room.ai, level: room.ai }; store.set('host', { code: room.code, opts, side: hostSide, t: Date.now() }); }
    closeRoom();
    startGame('host', hostSide, opts).then(() => { mode_starting = false; publish(); });
    Net.send({ t: 'welcome', state: snapshot() });
  }
  const closeRoom = () => { if (room) { clearInterval(room.timer); room = null; } };
  function hostRoom(code, o, side, resumeState) {
    opts = o; hostSide = side; mySide = side; resetClocks();
    showPane('pWait'); $('lobby').classList.remove('hidden');
    $('roomCode').textContent = code;
    $('waitChips').innerHTML = chipsFor(o, side);
    $('roomLock').classList.toggle('hidden', !o.pwh);
    closeRoom(); room = { code, host: true, hostSide: side, seated: false, cd: 0 }; paintRoom();
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
    // 公开房间：挂到游戏大厅的名册上（对手入座后显示为“对局中”，可观战）
    const hallBeat = () => { if (+o.pub && Net.role === 'host' && Net.code === code) Net.hallPub(() => ({ v: o.bf ? 'bf' : o.jq ? 'jq' : 'std', side: hostSide, total: o.total, step: o.step, lock: o.pwh ? 1 : 0, st: (room && room.host && (room.seated || room.ai)) || (started && mode === 'host') ? 'play' : 'open' })); };
    setTimeout(hallBeat, 0);
    Net.host(code, {
      gate: d => !o.pwh || d.ph === o.pwh,
      line(n, total) {
        onLine(n, total);
        if (n) hallBeat();
        if (n && !announced) {
          announced = true;
          $('waitNote').innerHTML = '<span class="spin"></span>等待对手入局…<br>' + (httpUrl ? '把邀请链接发给朋友，或让他扫码' : '把房间码告诉朋友，他在「加入房间」里输入');
          // 恢复房间时，先等中继把保存的棋局发回来，再发布，避免覆盖
          if (resumeState === 'pending') setTimeout(() => {
            if (resumeState !== 'pending') return;
            // 中继上没找到保存的棋局：用本机存的那份接着下
            const r = store.get('resume', null), st = r && r.kind === 'host' && r.code === code && !r.done && r.state;
            if (st && ((st.moves || []).length || (st.bfe || []).length)) { resumeState = st; hostSide = st.hostSide || side; startGame('host', hostSide, st.opts || o, { state: st, intro: false }); publish(); Net.send({ t: 'sync', state: snapshot() }); return; }
            resumeState = null; Net.publishRoom({ ...snapshot(), waiting: true });
          }, 4000);
          else if (!started) Net.publishRoom({ ...snapshot(), waiting: true });
        }
      },
      room(d) {
        // 房主恢复：用中继上保存的棋局
        if (resumeState === 'pending' && d && d.code === code && d.moves) {
          // 本机存的那份更新（比如最后几步没来得及发到中继）就用本机的
          const r = store.get('resume', null), loc = r && r.kind === 'host' && r.code === code && !r.done && r.state;
          const len = x => (x.moves || []).length + (x.bfe || []).length;
          if (loc && !d.result && len(loc) > len(d)) d = loc;
          resumeState = d; hostSide = d.hostSide;
          if (d.waiting && !d.moves.length) return; // 还没开局
          startGame('host', hostSide, d.opts, { state: d, intro: false });
          Net.send({ t: 'sync', state: snapshot() });
        }
      },
      data: onData, peer: onPeer, spec: onSpec, pingInfo, ping: onPing,
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
  const joinMsg = () => { const k = store.get('jq-' + (Net.code || ''), null); return { t: 'join', jg: k ? k.gid : null, ph: store.get('pw-' + (Net.code || ''), '') || undefined }; };
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
      data: onData, peer: onPeer, spec: onSpec, pingInfo, ping: onPing,
    });
    vacantAsked = false; pwAsking = false;
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

  // ---------- 回到对局：记下没下完的那一局，大厅里给一个入口 ----------
  // 本地 / 人机：整盘棋存在本机（含揭棋的随机布局、计时、悔棋次数）；联机：存房间码和身份（房主另存一份棋局，中继丢了也能恢复）
  const RESUME_TTL = { local: 3 * 864e5, ai: 3 * 864e5, host: 6 * 3600e3, guest: 6 * 3600e3 };
  let resumeKey = '';
  function saveResume(force) {
    if (!mode || watching() || !started) return;
    const G = RP ? RP.real : game;
    const n = G.bf ? G.entries.length : G.history.length, round = G.bf ? G.round : Math.floor(n / 2) + 1;
    const key = [mode, Net.code, n, G.result ? 1 : 0, undoUsed.r, undoUsed.b].join('|');
    if (!force && key === resumeKey) return;
    resumeKey = key;
    if (online()) {
      store.set('resume', { kind: mode, code: Net.code, side: mySide, opts, n, round, done: !!G.result, state: mode === 'host' ? snapshot() : undefined, t: Date.now() });
      if (mode === 'host') { const h = store.get('host', null); if (h && h.code === Net.code) store.set('host', { ...h, t: Date.now() }); }
      return;
    }
    if (G.result) { store.del('resume'); return; }
    if (!n) return;
    store.set('resume', {
      kind: mode, side: mySide, opts, n, round, t: Date.now(),
      layout: G.jq && G.opts ? G.opts.layout : null, bfbase: G.bf ? G.base : undefined, bfe: G.bf ? G.entries : undefined,
      moves: G.bf ? undefined : G.history.map(h => ({ from: h.from, to: h.to, rv: h.rv })),
      undo: { ...undoUsed }, clk: { r: clock.r, b: clock.b }, step: clock.step,
    });
  }
  setInterval(() => saveResume(false), 1500);
  window.addEventListener('pagehide', () => saveResume(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveResume(true); });
  const agoText = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.floor(m / 60)} 小时前` : `${Math.floor(m / 1440)} 天前`; };
  function resumeRec() {
    const r = store.get('resume', null);
    if (!r || r.done || !r.t || !(Date.now() - r.t < (RESUME_TTL[r.kind] || 0))) return null;
    if (r.kind === 'host') { const h = store.get('host', null); if (!h || h.code !== r.code) return null; }
    return r;
  }
  function paintResume() {
    const r = resumeRec();
    $('resume').classList.toggle('hidden', !r);
    if (!r) return;
    const o = r.opts || {}, v = +o.bf ? '技能模式' : +o.jq ? '揭棋' : '象棋';
    const who = r.kind === 'ai' ? `人机 · ${LV[o.level] || ''}` : r.kind === 'local' ? '本地对战' : `联机 · 房间 ${r.code}`;
    $('resumeInfo').textContent = `${who} · ${v} · 第 ${r.round || 1} 回合 · ${agoText(r.t)}`;
  }
  $('bResume').onclick = () => {
    const r = resumeRec();
    if (!r) { paintResume(); return; }
    Sfx.init(); applySettings();
    if (r.kind === 'local' || r.kind === 'ai') {
      startGame(r.kind, r.side, r.opts, { state: { moves: r.moves, bfe: r.bfe, bfbase: r.bfbase, layout: r.layout, undo: r.undo, clk: r.clk, step: r.step }, intro: false });
      toast('已回到上一局', 1800);
    } else if (r.kind === 'host') {
      const h = store.get('host', null);
      try { history.replaceState(null, '', location.pathname + '?room=' + r.code); } catch (e) { }
      hostRoom(r.code, h.opts, h.side, 'pending');
      toast('正在恢复你的房间…');
    } else joinRoom(r.code);
  };
  $('bResumeX').onclick = e => { e.stopPropagation(); store.del('resume'); paintResume(); };

  // ---------- 设置 ----------
  bindSeg($('mSet'), 'data-s', k => (k === 'quality' ? Core.quality : S[k]), (k, v) => {
    if (k === 'quality') { Core.setQuality(v); toast('画质已调整（阴影开关在下次打开时生效）'); return; }
    S[k] = (k === 'music' || k === 'vis') ? v : +v; applySettings();
    if (k === 'music' && (started || !mode)) { Sfx.init(); if (mode && !Ending.running) Sfx.Music.start(v); }
  });
  $('vMusic').value = S.vMusic; $('vSfx').value = S.vSfx; $('oServer').value = S.server;
  $('vMusic').oninput = e => { S.vMusic = +e.target.value; applySettings(); };
  $('vSfx').oninput = e => { S.vSfx = +e.target.value; applySettings(); };
  $('vVoice').value = S.vVoice; $('vVoice').oninput = e => { S.vVoice = +e.target.value; applySettings(); };
  $('oServer').onchange = e => { S.server = e.target.value.trim(); applySettings(); };
  const openSet = () => { repaintSegs($('mSet')); $('setGame').classList.toggle('hidden', !(mode && started)); $('tDebug').classList.toggle('hidden', !(mode === 'local' && started && game && game.bf)); $('tExit').textContent = watching() ? '离开观战席' : '退出对局'; $('mSet').classList.remove('hidden'); };
  $('tSet').onclick = $('bSetL').onclick = $('pzSet').onclick = openSet;
  $('bSetClose').onclick = () => $('mSet').classList.add('hidden');
  // 设置分三页：画面 / 声音 / 对局与其他
  $('setTabs').querySelectorAll('button').forEach(b => b.onclick = () => { $('setTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('mSet').querySelectorAll('.tabp').forEach(p => p.classList.toggle('hidden', p.dataset.t !== b.dataset.t)); });
  $('bHelp').onclick = $('bHelpL').onclick = () => $('mHelp').classList.remove('hidden');
  $('bHelpClose').onclick = () => $('mHelp').classList.add('hidden');
  $('bNews').onclick = $('bNewsL').onclick = () => {
    $('newsBody').innerHTML = NEWS.map(([v, d, items]) => `<h4>${v}<small>${d}</small></h4><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('');
    $('mSet').classList.add('hidden'); $('mNews').classList.remove('hidden');
  };
  $('bNewsClose').onclick = () => $('mNews').classList.add('hidden');

  // ---------- 对局按钮 ----------
  $('tUndo').onclick = requestUndo;
  // 視：画面被平移过就先归位；本地对战再点一次才是换边看
  $('tView').onclick = () => { if (mode === 'local' && !Core.Cam.panned) setView(viewSide === 'r' ? 'b' : 'r'); else setView(viewSide); };
  setInterval(() => $('tView').classList.toggle('flash', !!mode && Core.Cam.panned && !Core.Cam.cine), 300);
  $('tPause').onclick = togglePause; $('pzGo').onclick = () => togglePause();
  $('tLog').onclick = () => { const h = !$('log').classList.contains('hidden'); $('log').classList.toggle('hidden', h); if (!h) renderLog(); };
  $('tExit').onclick = $('pzExit').onclick = async () => {
    if (!mode) return;
    $('mSet').classList.add('hidden');
    let msg;
    if (watching()) msg = '离开观战席，回到大厅？';
    else if (mode === 'local' || vsAI()) msg = '退出本局、回到大厅？本局不计胜负。';
    else msg = game.result ? '离开房间、回到大厅？' : '离开房间、回到大厅？本局不计胜负；对手会看到你已离开，用原邀请链接可以回来接着下。';
    const ok = await ask(watching() ? '离 席' : '退 出', msg, 0, watching() ? '离 开' : '退 出', '再想想');
    if (ok) leaveGame();
  };
  $('tResign').onclick = $('pzResign').onclick = async () => {
    if (!started || ended || game.result || watching()) return;
    $('mSet').classList.add('hidden');
    const side = actor();
    const ok = await ask('认 输', `确定${mode === 'local' ? SIDE_CN[side] + '方' : ''}认输吗？`, 0, '认 输', '再想想');
    if (!ok || game.result) return;
    if (pause) resumeGame();
    const r = game.resign(side);
    if (online()) Net.send({ t: 'resign', side });
    finishGame(r);
  };
  const skipNow = () => {
    if (introSkip) introSkip();
    else if (Ending.running) Ending.skip();
    else if (ended && endSkipRes) { endSkip = true; Core.Time.skip = true; Voice.cancel(); endSkipRes(); }
    else if (busy) Core.Time.skip = true;
  };
  $('skip').onclick = skipNow;
  window.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); skipNow(); }
    else if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !document.querySelector('.modal:not(.hidden)')) togglePause();
  });
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
  const urlRoom = (q.get('room') || '').toUpperCase();
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
  paintResume();
  if (urlRoom && hostRec && hostRec.code === urlRoom && Date.now() - hostRec.t < 6 * 3600e3) {
    hostRoom(urlRoom, hostRec.opts, hostRec.side, 'pending');
    toast('正在恢复你的房间…');
  } else if (urlRoom) {
    joinRoom(urlRoom);
  }
})();
