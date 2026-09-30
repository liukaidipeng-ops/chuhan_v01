// 打包为单个 HTML 文件（three.js、二维码库、配音全部内嵌）
const fs = require('fs');
const path = require('path');
const D = __dirname;
const order = ['rules', 'core', 'board', 'models', 'audio', 'fx', 'camp', 'ending', 'net', 'main'];
const tpl = fs.readFileSync(path.join(D, 'src/template.html'), 'utf8');
const three = fs.readFileSync(path.join(D, 'node_modules/three/build/three.min.js'), 'utf8');
const qr = fs.readFileSync(path.join(D, 'node_modules/qrcode-generator/dist/qrcode.js'), 'utf8');
const lines = JSON.parse(fs.readFileSync(path.join(D, 'voice/lines.json'), 'utf8'));
const L = {}, C = {};
for (const l of lines) {
  L[l.id] = { spk: l.spk, text: l.text };
  const f = path.join(D, 'voice/out', l.id + '.mp3');
  if (fs.existsSync(f)) C[l.id] = fs.readFileSync(f).toString('base64');
}
const voice = `window.VOICE_LINES=${JSON.stringify(L)};window.VOICE_CLIPS=${JSON.stringify(C)};`;
const app = order.map(n => `// ---- ${n}.js ----\n` + fs.readFileSync(path.join(D, 'src', n + '.js'), 'utf8')).join('\n');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const out = tpl.replace('/*THREE*/', () => safe(three)).replace('/*QR*/', () => safe(qr)).replace('/*VOICE*/', () => voice).replace('/*APP*/', () => safe(app));
fs.mkdirSync(path.join(D, 'dist'), { recursive: true });
fs.writeFileSync(path.join(D, 'dist', '楚汉三维象棋.html'), out);
// 部署包：index.html（放到任意静态网站即可）
fs.mkdirSync(path.join(D, 'dist/site'), { recursive: true });
fs.writeFileSync(path.join(D, 'dist/site/index.html'), out);
console.log('built', (out.length / 1024).toFixed(0) + ' KB', 'voice clips:', Object.keys(C).length);
