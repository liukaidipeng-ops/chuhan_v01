// 打包为单个 HTML 文件（three.js、二维码库、配音、真实录音素材全部内嵌）
const fs = require('fs');
const path = require('path');
const D = __dirname;
const order = ['rules', 'bingfa', 'engine', 'core', 'board', 'models', 'audio', 'fx', 'squads', 'camp', 'spect', 'ending', 'net', 'ui', 'jq', 'bfx', 'main'];
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
const data = `window.VOICE_LINES=${JSON.stringify(L)};window.VOICE_CLIPS=${JSON.stringify(C)};window.SFX_CLIPS=${JSON.stringify(S)};`;
const app = order.filter(n => fs.existsSync(path.join(D, 'src', n + '.js')))
  .map(n => `// ---- ${n}.js ----\n` + fs.readFileSync(path.join(D, 'src', n + '.js'), 'utf8')).join('\n');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
// 行楷字体子集（志莽行书，SIL OFL 1.1，见 fonts/OFL.txt）
const xk = 'data:font/woff2;base64,' + fs.readFileSync(path.join(D, 'fonts/xingkai-subset.woff2')).toString('base64');
// 版本号：日期 + 内容摘要；version.json 供页面检查更新（微信等内置浏览器缓存很顽固）
const crypto = require('crypto');
const now = new Date(Date.now() + 8 * 3600e3);
const ver = now.toISOString().slice(0, 10).replace(/-/g, '.') + '-' + crypto.createHash('sha1').update(app + data.length).digest('hex').slice(0, 6);
const out = tpl.replace('/*APPVER*/', ver).replace('/*XKFONT*/', () => xk).replace('/*THREE*/', () => safe(three)).replace('/*QR*/', () => safe(qr)).replace('/*VOICE*/', () => data).replace('/*APP*/', () => safe(app));
fs.mkdirSync(path.join(D, 'dist/site'), { recursive: true });
fs.writeFileSync(path.join(D, 'dist', '楚汉三维象棋.html'), out);
fs.writeFileSync(path.join(D, 'dist/site/index.html'), out);
fs.writeFileSync(path.join(D, 'dist/site/version.json'), JSON.stringify({ v: ver }));
console.log('version', ver);
console.log('built', (out.length / 1024).toFixed(0) + ' KB', 'voice:', Object.keys(C).length, 'sfx:', Object.values(S).reduce((a, b) => a + b.length, 0));
