// 极端诊断（不是规则提案，用户 2026-10-05 提）：象升级不要钱；四级象落地就践踏，范围是以落点为中心的 9×9（半径 4），每个敌子扣 9 点（帅将除外）。
//   目的：看电脑懂不懂“升象”的好处——好处大到这个地步，会算的一方应该把象一路升到四级再踩。
//   在 engine_planc.js（ENGINE_REV 底版 + Plan C 开关）生成的引擎上再改两处：
//     · skills.jianta.radius = R（> 1 时）：践踏和“踩不踩得到人”的判断都改用 (2R+1)×(2R+1) 的方块，不含中心；不伤己方，跟原来一样
//     · 升级基础价是 0 时就是 0（原来最低 minCost = 1 功）
// 用法（在 source/ 下）：ENGINE_REV=9aca810 BFSIM_ENGINE=tools/variants/engine_xe.js node tools/bfsim.js --ai git:98dd206 --nodes mid=60000 \
//     --set skills.jianta.onMove=true --set skills.jianta.radius=4 --set skills.jianta.splashDamage=9 --set skills.jianta.moveCooldown=0 --set 'upgrade.cost.e=[0,0,0]' …
const fs = require('fs'), path = require('path'), os = require('os');
const planc = require(path.join(__dirname, 'engine_planc.js'));
let built = null;
function enginePath() {
  if (built) return built;
  let s = fs.readFileSync(planc.enginePath(), 'utf8');
  const rep = (a, b, n = 1) => { const k = s.split(a).length - 1; if (k !== n) throw new Error(`engine_xe：锚点出现 ${k} 次、应为 ${n} 次：${a.slice(0, 80)}`); s = s.split(a).join(b); };
  rep('  const RING8 = [', '  const SQUARE = R => { const o = []; for (let df = -R; df <= R; df++) for (let dr = -R; dr <= R; dr++) if (df || dr) o.push([df, dr]); return o; };\n  const RING8 = [');
  rep('    for (const [df, dr] of (K.ring8 ? RING8 : ORTHO)) {', '    for (const [df, dr] of (K.radius > 1 ? SQUARE(K.radius) : K.ring8 ? RING8 : ORTHO)) {');
  rep('    for (const [df, dr] of (J.ring8 ? RING8 : ORTHO)) {', '    for (const [df, dr] of (J.radius > 1 ? SQUARE(J.radius) : J.ring8 ? RING8 : ORTHO)) {');
  rep('const base = baseCostOf(p); return Math.max(U.minCost, base - (p.xp || 0) * U.killDiscount); };', 'const base = baseCostOf(p); return base === 0 ? 0 : Math.max(U.minCost, base - (p.xp || 0) * U.killDiscount); };');
  const file = path.join(os.tmpdir(), `bingfa_xe_${process.pid}.js`);
  fs.writeFileSync(file, s);
  process.on('exit', () => { try { fs.unlinkSync(file); } catch (e) { } });
  built = file;
  return file;
}
module.exports = { enginePath };
