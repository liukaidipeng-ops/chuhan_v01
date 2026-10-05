// 打包为单个 HTML 文件（three.js、二维码库、配音、真实录音素材全部内嵌）
const fs = require('fs');
const path = require('path');
const D = __dirname;
const order = ['rules', 'bingfa', 'bfai', 'engine', 'core', 'board', 'models', 'tiger', 'audio', 'fx', 'squads', 'camp', 'spect', 'ending', 'net', 'ui', 'jq', 'bfx', 'main'];
const tpl = fs.readFileSync(path.join(D, 'src/template.html'), 'utf8');
const three = fs.readFileSync(path.join(D, 'node_modules/three/build/three.min.js'), 'utf8');
const qr = fs.readFileSync(path.join(D, 'node_modules/qrcode-generator/dist/qrcode.js'), 'utf8');
// 配音
const lines = JSON.parse(fs.readFileSync(path.join(D, 'voice/lines.json'), 'utf8'));
const L = {}, C = {};
for (const l of lines) {
  L[l.id] = { spk: l.spk, text: l.text };
  const f = path.join(D, 'voice/out', l.id + '.mp3');
  if (fs.existsSync(f)) C[l.id] = fs.readFileSync(f).toString('base64');
}
// 录音素材
const man = JSON.parse(fs.readFileSync(path.join(D, 'sfx/manifest.json'), 'utf8'));
const S = {};
for (const [id, list] of Object.entries(man)) S[id] = list.map(x => fs.readFileSync(path.join(D, 'sfx/out', x.f)).toString('base64'));
// 写实版配音：不内嵌，单独打成一个包放在网页旁边，选了「写实」才取（首屏不变慢）。页面里只带一张目录：每句在包里的位置
const crypto = require('crypto');
const realDir = path.join(D, 'voice/real'), realMeta = JSON.parse(fs.readFileSync(path.join(realDir, 'real.json'), 'utf8'));
const realIdx = {}, realParts = []; let realOff = 0;
for (const l of lines) { const f = path.join(realDir, l.id + '.mp3'); if (!fs.existsSync(f)) continue; const b = fs.readFileSync(f); realIdx[l.id] = [realOff, b.length]; realParts.push(b); realOff += b.length; }
const realPack = Buffer.concat(realParts), realVer = crypto.createHash('sha1').update(realPack).digest('hex').slice(0, 8);
const REAL = { url: 'voice-real.bin?v=' + realVer, idx: realIdx, text: realMeta.text || {} };
const data = `window.VOICE_LINES=${JSON.stringify(L)};window.VOICE_CLIPS=${JSON.stringify(C)};window.VOICE_REAL=${JSON.stringify(REAL)};window.SFX_CLIPS=${JSON.stringify(S)};`;
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
const ver = now.toISOString().slice(0, 10).replace(/-/g, '.') + '-' + crypto.createHash('sha1').update(eng + app + data.length + realVer).digest('hex').slice(0, 6);
const out = tpl.replace('/*APPVER*/', ver).replace('/*XKFONT*/', () => xk).replace('/*THREE*/', () => safe(three)).replace('/*QR*/', () => safe(qr)).replace('/*VOICE*/', () => data).replace('/*ENG*/', () => safe(eng)).replace('/*APP*/', () => safe(app));
fs.mkdirSync(path.join(D, 'dist/site'), { recursive: true });
fs.writeFileSync(path.join(D, 'dist', '楚汉三维象棋.html'), out);
fs.writeFileSync(path.join(D, 'dist/site/index.html'), out);
fs.writeFileSync(path.join(D, 'dist/site/version.json'), JSON.stringify({ v: ver }));
// 战意曲（选了「战意」才取）：和网页放在一起
fs.copyFileSync(path.join(D, 'music/war.mp3'), path.join(D, 'dist/site/music-war.mp3'));
fs.writeFileSync(path.join(D, 'dist/site/voice-real.bin'), realPack);
console.log('version', ver);
console.log('built', (out.length / 1024).toFixed(0) + ' KB', 'voice:', Object.keys(C).length, 'real:', Object.keys(realIdx).length, (realPack.length / 1024).toFixed(0) + ' KB', 'sfx:', Object.values(S).reduce((a, b) => a + b.length, 0));
