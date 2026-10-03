// ===== 联机：MQTT over WebSocket 中继（多线路并发，手机网络与微信内置浏览器可用） =====
// 双方都连到公共中继服务器，按房间码收发消息；任一线路可用即可对弈。
const Net = (() => {
  const ROOT = 'chuhan3d/v2/';
  const DEFAULT_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',      // EMQX（杭州，国内可达）
    'wss://broker.hivemq.com:8884/mqtt',   // HiveMQ
    'wss://test.mosquitto.org:8081/mqtt',  // Mosquitto
  ];
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const enc = new TextEncoder(), dec = new TextDecoder();

  // ---------- 极简 MQTT 3.1.1 客户端（QoS 0 + retain） ----------
  class Mqtt {
    constructor(url, onMsg, onState) { this.url = url; this.onMsg = onMsg; this.onState = onState; this.subs = new Set(); this.buf = new Uint8Array(0); this.ok = false; this.closed = false; this.retry = 1000; this.pid = 1; }
    static varint(n) { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; o.push(b); } while (n > 0); return o; }
    static str(s) { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
    send(bytes) { if (this.ws && this.ws.readyState === 1) this.ws.send(new Uint8Array(bytes)); }
    connect() {
      if (this.closed) return;
      clearTimeout(this.rt);
      this.detach();
      let ws;
      try { ws = new WebSocket(this.url, ['mqtt']); } catch (e) { this.schedule(); return; }
      ws.binaryType = 'arraybuffer';
      this.ws = ws; this.buf = new Uint8Array(0); this.last = Date.now();
      const cid = 'xq' + Math.random().toString(36).slice(2, 12);
      const timeout = setTimeout(() => { if (!this.ok && this.ws === ws) this.drop(); }, 7000);
      ws.onopen = () => {
        if (this.ws !== ws) return;
        const vh = [...Mqtt.str('MQTT'), 4, 0x02, 0, 45];
        const pl = Mqtt.str(cid);
        this.send([0x10, ...Mqtt.varint(vh.length + pl.length), ...vh, ...pl]);
      };
      ws.onmessage = e => { if (this.ws !== ws) return; this.last = Date.now(); this.feed(new Uint8Array(e.data)); };
      ws.onclose = () => {
        clearTimeout(timeout);
        if (this.ws !== ws) return; // 已经换了新连接
        clearInterval(this.ping);
        const was = this.ok; this.ok = false; this.ws = null;
        if (was) this.onState(false);
        this.schedule();
      };
      ws.onerror = () => { };
    }
    // 摘掉旧连接（不再理会它的任何事件）
    detach() {
      const ws = this.ws; this.ws = null;
      clearInterval(this.ping); clearTimeout(this.pt);
      if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch (e) { } }
    }
    // 强制断开并马上重连：手机切后台、换网络之后，旧连接常常“假死”（看着连着，收发都不通）
    drop() {
      if (this.closed) return;
      this.detach();
      const was = this.ok; this.ok = false;
      if (was) this.onState(false);
      this.retry = 600; this.schedule();
    }
    // 探活：发一个心跳，3.5 秒内什么都没收到就判定假死、重连；本来就断着的立刻重连
    probe() {
      if (this.closed) return;
      if (!this.ok) { if (!this.ws || this.ws.readyState > 1) { this.retry = 600; clearTimeout(this.rt); this.connect(); } return; }
      const t0 = Date.now();
      this.send([0xC0, 0]);
      clearTimeout(this.pt);
      this.pt = setTimeout(() => { if (this.ok && this.last < t0) this.drop(); }, 3500);
    }
    schedule() {
      if (this.closed) return;
      clearTimeout(this.rt);
      this.rt = setTimeout(() => this.connect(), this.retry);
      this.retry = Math.min(8000, this.retry * 1.7);
    }
    feed(chunk) {
      const b = new Uint8Array(this.buf.length + chunk.length); b.set(this.buf); b.set(chunk, this.buf.length); this.buf = b;
      for (; ;) {
        if (this.buf.length < 2) return;
        let len = 0, mul = 1, i = 1, byte;
        do { if (i >= this.buf.length) return; byte = this.buf[i++]; len += (byte & 127) * mul; mul *= 128; } while (byte & 128);
        if (this.buf.length < i + len) return;
        const type = this.buf[0] >> 4, flags = this.buf[0] & 15, body = this.buf.subarray(i, i + len);
        this.buf = this.buf.slice(i + len);
        this.handle(type, flags, body);
      }
    }
    handle(type, flags, body) {
      if (type === 2) { // CONNACK
        if (body[1] !== 0) { try { this.ws.close(); } catch (e) { } return; }
        this.ok = true; this.retry = 1000;
        for (const t of this.subs) this.subPacket(t);
        clearInterval(this.ping);
        // 每 15 秒一次心跳；50 秒没收到任何东西（连心跳回执都没有）就当断线重连
        this.ping = setInterval(() => { if (Date.now() - this.last > 50000) { this.drop(); return; } this.send([0xC0, 0]); }, 15000);
        this.onState(true);
      } else if (type === 3) { // PUBLISH
        const tl = (body[0] << 8) | body[1];
        const topic = dec.decode(body.subarray(2, 2 + tl));
        let off = 2 + tl;
        if ((flags >> 1) & 3) off += 2;
        const payload = dec.decode(body.subarray(off));
        this.onMsg(topic, payload, !!(flags & 1));
      }
    }
    subPacket(topic) { const id = this.pid++ & 0xffff || 1; const pl = [id >> 8, id & 255, ...Mqtt.str(topic), 0]; this.send([0x82, ...Mqtt.varint(pl.length), ...pl]); }
    sub(topic) { this.subs.add(topic); if (this.ok) this.subPacket(topic); }
    pub(topic, text, retain = false) {
      if (!this.ok) return false;
      const t = Mqtt.str(topic), p = enc.encode(text);
      this.send([0x30 | (retain ? 1 : 0), ...Mqtt.varint(t.length + p.length), ...t, ...p]);
      return true;
    }
    close() { this.closed = true; clearTimeout(this.rt); clearTimeout(this.pt); clearInterval(this.ping); try { this.send([0xE0, 0]); } catch (e) { } this.detach(); this.ok = false; }
  }

  // ---------- 房间层 ----------
  // 消息序号从本次打开页面的时刻起算：同一台设备刷新后身份不变，若序号从 0 重来会被对方当成重复消息丢掉（刷新后要等很久才能入座）
  let clients = [], role = null, code = null, h = {}, seq = Date.now(), seen = new Set(), seenQ = [];
  let peerSeen = 0, peerPid = null, peerState = 'none', hb = null;
  // 每个房间、每个座位一个固定身份：刷新或重开链接仍是同一个人
  let myPid = Math.random().toString(36).slice(2, 10);
  function pidFor(c, r) {
    const k = `xq3d-pid-${c}-${r}`;
    try { let p = localStorage.getItem(k); if (!p) { p = Math.random().toString(36).slice(2, 10); localStorage.setItem(k, p); } return p; } catch (e) { return myPid; }
  }
  const base = () => ROOT + code;
  const gen = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

  function brokers() {
    const c = (Net.custom || '').trim();
    return c ? [c] : DEFAULT_BROKERS;
  }
  function anyOk() { return clients.some(c => c.ok); }
  function onState() {
    const n = clients.filter(c => c.ok).length;
    h.line && h.line(n, clients.length);
  }
  function onMsg(topic, payload, retained) {
    if (!payload) return;
    if (Net.debug) console.log('RAW<', role, topic.split('/').pop(), payload.slice(0, 90));
    let d; try { d = JSON.parse(payload); } catch (e) { return; }
    if (topic.endsWith('/room')) { h.room && h.room(d, retained); return; }
    if (!d || d._p === myPid) return;
    const key = d._p + ':' + d._s;
    if (seen.has(key)) return;
    seen.add(key); seenQ.push(key); if (seenQ.length > 800) seen.delete(seenQ.shift());
    // 观众频道：任何身份都收，不影响对手在线状态
    if (topic.endsWith('/s')) { h.spec && h.spec(d); return; }
    // 观众：只看双方的喊话、离开等消息（棋局走房间快照）
    if (role === 'watch') { h.data && h.data(d, topic.endsWith('/h') ? 'h' : 'g'); return; }
    if (d._to && d._to !== myPid) return;
    if (role === 'host' && (d.t === 'join' || d.t === 'claim')) {
      // 上了密码的房间：密码不对不给座位（原来就坐在这个位子上的人重连不再查）
      if (h.gate && peerPid !== d._p && !h.gate(d)) { sendTo(d._p, { t: 'needpw' }); return; }
      // 座位：同一个人重连直接接纳；对手在线时来人进观众席；
      // 对手已离线 15 秒以上时，问来人要不要接替入座（claim），否则观战
      const vacant = peerState === 'lost' || Date.now() - peerSeen > 9000;
      if (!peerPid || peerPid === d._p || (d.t === 'claim' && vacant)) { peerPid = d._p; d = { ...d, t: 'join' }; }
      else { sendTo(d._p, { t: vacant ? 'vacant' : 'full' }); return; }
    }
    if (role === 'host' && !peerPid && d.t !== 'join') peerPid = d._p;
    if (role === 'host' && peerPid && d._p !== peerPid) return;
    if (role === 'guest') { if (!peerPid) peerPid = d._p; if (d._p !== peerPid && d.t !== 'welcome') return; if (d.t === 'welcome') peerPid = d._p; }
    // 对手主动离开：座位立即空出
    if (d.t === 'bye') { peerSeen = 0; if (peerState === 'ok') { peerState = 'lost'; h.peer && h.peer('lost'); } h.data && h.data(d); return; }
    peerSeen = Date.now();
    if (peerState !== 'ok') { peerState = 'ok'; h.peer && h.peer('ok'); }
    if (Net.debug && d.t !== 'ping') console.log('NET<', role, JSON.stringify(d).slice(0, 160));
    if (d.t === 'ping') { h.ping && h.ping(d); return; }
    h.data && h.data(d);
  }
  function start(r, c, handlers) {
    close(true);
    role = r; code = c; h = handlers; peerPid = null; peerSeen = 0; peerState = 'none';
    myPid = pidFor(c, r);
    clients = brokers().map(url => new Mqtt(url, onMsg, () => onState()));
    for (const cl of clients) {
      cl.sub(base() + '/room');
      if (role === 'watch') { cl.sub(base() + '/h'); cl.sub(base() + '/g'); }
      else cl.sub(base() + (role === 'host' ? '/g' : '/h'));
      cl.sub(base() + '/s');
      cl.connect();
    }
    clearInterval(hb);
    hb = setInterval(() => {
      if (!anyOk() || role === 'watch') return;
      send({ t: 'ping', ...(h.pingInfo ? h.pingInfo() || {} : {}) });
      if (peerState === 'ok' && Date.now() - peerSeen > 9000) { peerState = 'lost'; h.peer && h.peer('lost'); }
    }, 3000);
  }
  function raw(obj, ch) {
    if (role === 'watch' && ch !== '/s') return false;
    obj._p = myPid; obj._s = ++seq;
    const s = JSON.stringify(obj);
    let sent = false;
    for (const c of clients) sent = c.pub(base() + (ch || (role === 'host' ? '/h' : '/g')), s) || sent;
    return sent;
  }
  // 观众频道（观众发言、到场、站队、离场）
  function sendSpec(obj) { return raw({ ...obj }, '/s'); }
  function send(obj) { return raw({ ...obj }); }
  function sendTo(pid, obj) { return raw({ ...obj, _to: pid }); }
  // 房间信息（retain：后来者/重连者立即拿到）
  function publishRoom(state) { const s = JSON.stringify(state); for (const c of clients) c.pub(base() + '/room', s, true); }
  function clearRoom() { for (const c of clients) { if (c.ok) { const t = Mqtt.str(base() + '/room'); c.send([0x31, ...Mqtt.varint(t.length), ...t]); } } }
  // ---------- 游戏大厅：公开房间的名册 ----------
  // 房主每 15 秒往 hall/<房间码> 留一条（retain）；大厅订阅 hall/+ 就得到实时的房间列表。房主离开时把这一条清掉，
  // 万一房主是直接断线的，这条 40 秒没有续上也会从列表里消失
  const HALL = ROOT + 'hall/';
  let hallInfo = null, hallBeat = null, hallClients = [], hallCb = null;
  const hallMap = new Map();
  const hallSend = text => { for (const c of clients) if (c.ok) c.pub(HALL + code, text, true); };
  function hallPub(info) {
    hallInfo = info;
    const beat = () => { if (hallInfo && role === 'host') hallSend(JSON.stringify({ ...(typeof hallInfo === 'function' ? hallInfo() : hallInfo), code, t: Date.now() })); };
    beat(); clearInterval(hallBeat); hallBeat = setInterval(beat, 15000);
    return beat;
  }
  function hallClear() { clearInterval(hallBeat); hallBeat = null; if (hallInfo && code) hallSend(''); hallInfo = null; }
  function hallList() {
    const now = Date.now();
    return [...hallMap.values()].filter(d => now - d._rx < 40000 && Math.abs(now - d.t) < 180000).sort((a, b) => (a.st === b.st ? b.t - a.t : a.st === 'open' ? -1 : 1));
  }
  function hallOpen(cb) {
    hallClose(); hallCb = cb; hallMap.clear();
    hallClients = brokers().map(url => new Mqtt(url, (topic, payload) => {
      if (!topic.startsWith(HALL)) return;
      const c = topic.slice(HALL.length);
      if (!payload) hallMap.delete(c);
      else { try { const d = JSON.parse(payload); if (d && d.code === c) { d._rx = Date.now(); hallMap.set(c, d); } } catch (e) { } }
      hallCb && hallCb(hallList());
    }, () => hallCb && hallCb(hallList())));
    for (const cl of hallClients) { cl.sub(HALL + '+'); cl.connect(); }
  }
  function hallClose() { for (const c of hallClients) c.close(); hallClients = []; hallCb = null; }
  function close(silent) {
    clearInterval(hb);
    hallClear();
    if (!silent && anyOk() && role) try { role === 'watch' ? sendSpec({ t: 'sbye' }) : send({ t: 'bye' }); } catch (e) { }
    for (const c of clients) c.close();
    clients = []; role = null;
  }
  // 断线自动重连：切回前台、网络恢复、页面从缓存恢复时，立刻探活（假死的连接马上换新的）
  function kick() { for (const c of clients) c.probe(); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });
  window.addEventListener('online', kick);
  window.addEventListener('pageshow', e => { if (e.persisted) kick(); });
  document.addEventListener('resume', kick);
  // 系统报告断网：旧连接肯定不通了，直接丢掉（界面马上显示“正在重连”），之后按退避节奏重试
  window.addEventListener('offline', () => { for (const c of clients) c.drop(); });
  const Net = {
    debug: (() => { try { return !!localStorage.getItem('xq3d-netdebug'); } catch (e) { return false; } })(),
    gen, get myPid() { return myPid; }, DEFAULT_BROKERS,
    host(c, handlers) { start('host', c, handlers); },
    join(c, handlers) { start('guest', c.toUpperCase(), handlers); },
    watch(c, handlers) { start('watch', c.toUpperCase(), handlers); },
    send, sendSpec, publishRoom, clearRoom, close, kick,
    freeSeat() { peerPid = null; peerSeen = 0; peerState = 'none'; },
    hallPub, hallClear, hallOpen, hallClose, hallList, hallTouch() { if (hallInfo) hallPub(hallInfo); }, get hallOk() { return hallClients.some(c => c.ok); },
    get connected() { return anyOk() && peerState === 'ok'; },
    get lineOk() { return anyOk(); },
    get peerState() { return peerState; },
    get role() { return role; }, get code() { return code; },
    custom: '',
  };
  return Net;
})();
