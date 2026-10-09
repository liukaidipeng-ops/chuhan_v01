// 打包网页：three.js、二维码库、字体、脚本内嵌在 index.html；配音和录音素材各打一个包放在旁边（见下）
const fs = require('fs');
const path = require('path');
const D = __dirname;
const order = ['rules', 'bingfa', 'bfai', 'engine', 'core', 'board', 'turnglow', 'models', 'tiger', 'audio', 'fx', 'squads', 'camp', 'spect', 'ending', 'net', 'ui', 'jq', 'bfx', 'main'];
const tpl = fs.readFileSync(path.join(D, 'src/template.html'), 'utf8');
const three = fs.readFileSync(path.join(D, 'node_modules/three/build/three.min.js'), 'utf8');
const qr = fs.readFileSync(path.join(D, 'node_modules/qrcode-generator/dist/qrcode.js'), 'utf8');
// 配音
const lines = JSON.parse(fs.readFileSync(path.join(D, 'voice/lines.json'), 'utf8'));
// 大件声音素材都不内嵌（首屏只下页面本身，手机上快很多）：各打一个包放在网页旁边，页面里只带目录（每段在包里的位置）
const crypto = require('crypto');
const pack = (parts) => { const b = Buffer.concat(parts); return { b, v: crypto.createHash('sha1').update(b).digest('hex').slice(0, 8) }; };
// 原版配音：选了「原版」才取
const L = {}, origIdx = {}, origParts = []; let origOff = 0;
for (const l of lines) {
  L[l.id] = { spk: l.spk, text: l.text };
  const f = path.join(D, 'voice/out', l.id + '.mp3');
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); origIdx[l.id] = [origOff, b.length]; origParts.push(b); origOff += b.length; }
}
const origPack = pack(origParts);
const ORIG = { url: 'voice-orig.bin?v=' + origPack.v, idx: origIdx };
// 录音素材（刀枪、马蹄、炮弹……）：页面一开就在后台取
const man = JSON.parse(fs.readFileSync(path.join(D, 'sfx/manifest.json'), 'utf8'));
const sfxIdx = {}, sfxParts = []; let sfxOff = 0;
for (const [id, list] of Object.entries(man)) sfxIdx[id] = list.map(x => { const b = fs.readFileSync(path.join(D, 'sfx/out', x.f)); sfxParts.push(b); const r = [sfxOff, b.length]; sfxOff += b.length; return r; });
const sfxPack = pack(sfxParts);
const SFXP = { url: 'sfx.bin?v=' + sfxPack.v, idx: sfxIdx };
// 写实版配音：选了「写实」（默认）才取
const realDir = path.join(D, 'voice/real'), realMeta = JSON.parse(fs.readFileSync(path.join(realDir, 'real.json'), 'utf8'));
// 技能模式专用的句子（up_ 升级、h_ 四级名将、sk_ 技能）另打一个包 voice-bf.bin：只有开技能模式的局才取，普通对局不用多下几 MB
const BFLINE = /^(up_|h_|sk_)/;
const realIdx = {}, realParts = []; let realOff = 0;
const bfIdx = {}, bfParts = []; let bfOff = 0;
for (const l of lines) { const f = path.join(realDir, l.id + '.mp3'); if (!fs.existsSync(f) || BFLINE.test(l.id)) continue; const b = fs.readFileSync(f); realIdx[l.id] = [realOff, b.length]; realParts.push(b); realOff += b.length; }
// 台词表里没有、只在写实版里有的句子（t_ 开头：汉相换成虎骑之后的台词；技能模式的句子进另一个包）
for (const f of fs.readdirSync(realDir).filter(f => f.endsWith('.mp3')).sort()) {
  const id = f.slice(0, -4); if (realIdx[id] || bfIdx[id]) continue; const b = fs.readFileSync(path.join(realDir, f));
  if (BFLINE.test(id)) { bfIdx[id] = [bfOff, b.length]; bfParts.push(b); bfOff += b.length; } else { realIdx[id] = [realOff, b.length]; realParts.push(b); realOff += b.length; }
}
const realPack = Buffer.concat(realParts), realVer = crypto.createHash('sha1').update(realPack).digest('hex').slice(0, 8);
const bfPack = Buffer.concat(bfParts), bfVer = crypto.createHash('sha1').update(bfPack).digest('hex').slice(0, 8);
const REAL = { url: 'voice-real.bin?v=' + realVer, idx: realIdx, text: realMeta.text || {}, bf: { url: 'voice-bf.bin?v=' + bfVer, idx: bfIdx } };
const data = `window.VOICE_LINES=${JSON.stringify(L)};window.VOICE_ORIG=${JSON.stringify(ORIG)};window.VOICE_REAL=${JSON.stringify(REAL)};window.SFX_PACK=${JSON.stringify(SFXP)};`;
// 规则引擎和技能模式的电脑单独放一个 <script id="eng">：页面照常执行，另外整段原样塞进 Web Worker 里算棋
const ENG = ['rules', 'bingfa', 'bfai'];
const src = n => `// ---- ${n}.js ----\n` + fs.readFileSync(path.join(D, 'src', n + '.js'), 'utf8');
const eng = ENG.map(src).join('\n');
const app = order.filter(n => !ENG.includes(n) && fs.existsSync(path.join(D, 'src', n + '.js')))
  .map(n => `// ---- ${n}.js ----\n` + fs.readFileSync(path.join(D, 'src', n + '.js'), 'utf8')).join('\n');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
// 行楷字体子集（志莽行书，SIL OFL 1.1，见 fonts/OFL.txt）
const xk = 'data:font/woff2;base64,' + fs.readFileSync(path.join(D, 'fonts/xingkai-subset.woff2')).toString('base64');
// 版本号：日期 + 内容摘要；version.json 供页面检查更新（微信等内置浏览器缓存很顽固）
const now = new Date(Date.now() + 8 * 3600e3);
const ver = now.toISOString().slice(0, 10).replace(/-/g, '.') + '-' + crypto.createHash('sha1').update(eng + app + data + realVer + bfVer + tpl + fs.statSync(path.join(D, 'fonts/songhei-subset.woff2')).size).digest('hex').slice(0, 6);   // 页面模板和界面字体也算进版本号：只改样式的更新，开着页面的人也要收到“有新版本”的提示
// 界面用的宋体黑（思源宋体 Black 子集，SIL OFL 1.1，见 fonts/OFL-NotoSerifSC.txt；字表 fonts/songhei-chars.txt，归美术）
const eb = 'data:font/woff2;base64,' + fs.readFileSync(path.join(D, 'fonts/songhei-subset.woff2')).toString('base64');
const out = tpl.replace('/*APPVER*/', ver).replace('/*XKFONT*/', () => xk).replace('/*EBFONT*/', () => eb).replace('/*THREE*/', () => safe(three)).replace('/*QR*/', () => safe(qr)).replace('/*VOICE*/', () => data).replace('/*ENG*/', () => safe(eng)).replace('/*APP*/', () => safe(app));
fs.mkdirSync(path.join(D, 'dist/site'), { recursive: true });
fs.writeFileSync(path.join(D, 'dist', '楚汉三维象棋.html'), out);
fs.writeFileSync(path.join(D, 'dist/site/index.html'), out);
fs.writeFileSync(path.join(D, 'dist/site/version.json'), JSON.stringify({ v: ver }));
// 战意曲（选了「战意」才取）：和网页放在一起
fs.copyFileSync(path.join(D, 'music/war.mp3'), path.join(D, 'dist/site/music-war.mp3'));
fs.writeFileSync(path.join(D, 'dist/site/voice-real.bin'), realPack);
fs.writeFileSync(path.join(D, 'dist/site/voice-bf.bin'), bfPack);
fs.writeFileSync(path.join(D, 'dist/site/voice-orig.bin'), origPack.b);
fs.writeFileSync(path.join(D, 'dist/site/sfx.bin'), sfxPack.b);
console.log('version', ver);
console.log('built', (out.length / 1024).toFixed(0) + ' KB', 'orig:', Object.keys(origIdx).length, (origPack.b.length / 1024).toFixed(0) + ' KB', 'real:', Object.keys(realIdx).length, (realPack.length / 1024).toFixed(0) + ' KB', 'bf:', Object.keys(bfIdx).length, (bfPack.length / 1024).toFixed(0) + ' KB', 'sfx:', (sfxPack.b.length / 1024).toFixed(0) + ' KB');
