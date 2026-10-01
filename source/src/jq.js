// ===== 揭棋联机：不靠服务器的公平洗牌，且“被吃的暗子只有吃子方知道” =====
// 一方 15 个暗子的身份 = 对方手里的“槽位→兵种”排列(outer) ∘ 本方手里的“位置→槽位”置换(inner)
//  · 走动本方暗子：本方公开该位置的槽位号，对方公开该槽位的兵种 → 双方都知道
//  · 吃掉对方暗子：子主公开该位置的槽位号，只有吃子方手里有 outer → 只有吃子方知道
// 开局前双方互换承诺哈希（SHA-256 + 随机盐），之后每次揭示都可核对，谁也改不了牌。
const Jieqi = (() => {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(str) {
    const msg = new TextEncoder().encode(str);
    const len = msg.length, nb = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(nb); buf.set(msg); buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(nb - 4, (len * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(len / 0x20000000));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < nb; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return [...H].map(x => x.toString(16).padStart(8, '0')).join('');
  }
  function rhex(n) {
    const a = new Uint8Array(Math.ceil(n / 2));
    try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); }
    return [...a].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, n);
  }
  const commit = (gid, s, kind, idx, val, nonce) => sha256([gid, s, kind, idx, val, nonce].join('|')).slice(0, 32);
  // 新一局的本方密钥：本方暗子的 inner 置换 + 对方暗子的 outer 排列
  function create(gid, side) {
    const opp = XQ.other(side);
    const perm = XQ.shuffle([...Array(15).keys()]);
    const arr = XQ.shuffle(XQ.JQ_STD[opp]);
    const n1 = perm.map(() => rhex(16)), n2 = arr.map(() => rhex(16));
    return {
      gid, side,
      inner: { perm, nonce: n1, c: perm.map((j, i) => commit(gid, side, 'in', i, j, n1[i])) },
      outer: { arr, nonce: n2, c: arr.map((t, j) => commit(gid, opp, 'out', j, t, n2[j])) },
    };
  }
  const pub = k => ({ cin: k.inner.c, cout: k.outer.c });
  const innerOf = (k, i) => ({ i, j: k.inner.perm[i], k: k.inner.nonce[i] });
  const outerOf = (k, j) => ({ j, v: k.outer.arr[j], k: k.outer.nonce[j] });
  const okIdx = x => Number.isInteger(x) && x >= 0 && x < 15;
  // 核对揭示与承诺是否一致（没有承诺时视为无法核对）
  const checkIn = (gid, s, c, r) => !!(r && okIdx(r.i) && okIdx(r.j) && c && commit(gid, s, 'in', r.i, r.j, r.k) === c[r.i]);
  const checkOut = (gid, s, c, r) => !!(r && okIdx(r.j) && typeof r.v === 'string' && 'rneacp'.includes(r.v) && r.v.length === 1 && c && commit(gid, s, 'out', r.j, r.v, r.k) === c[r.j]);
  const validCommits = c => Array.isArray(c) && c.length === 15 && c.every(x => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x));
  return { sha256, rhex, commit, create, pub, innerOf, outerOf, checkIn, checkOut, okIdx, validCommits };
})();
