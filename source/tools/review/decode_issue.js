// 读「对局」工单（TD 的“存并发给数值部”：一局对局变成仓库里的一条 GitHub 工单，标签「对局」）
//   正文：第一段是 Ham 写的那句话（可空），下面是导出 JSON，放在 ```json 代码块里；
//   超过 GitHub 的 65536 字上限时：gzip + base64 放进 ```bfgz 代码块；还超就拆进后面几条评论，每块开头写「第 i/n 块」。
// 用法：把工单正文和评论原样存进一个文本文件（评论按顺序接在后面），然后
//   node tools/review/decode_issue.js 工单.txt [--out 对局.txt]
//   输出成和“导出对局”一样的文本（---DATA--- 下面一行 JSON），trace_game.js / game2exam.js 能直接读。
'use strict';
const fs = require('fs'), zlib = require('zlib');

function decode(text) {
  const note = (text.split(/```/)[0] || '').trim();
  const blocks = [];
  const re = /```(json|bfgz)\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) blocks.push({ kind: m[1], body: m[2] });
  if (!blocks.length) throw new Error('工单里没找到 ```json 或 ```bfgz 代码块');
  const kind = blocks[0].kind;
  // 拆块的：每块开头「第 i/n 块」，按 i 排好再拼
  const parts = blocks.filter(b => b.kind === kind).map(b => {
    const h = b.body.match(/^\s*第\s*(\d+)\s*\/\s*(\d+)\s*块\s*\n/);
    return { i: h ? +h[1] : 1, n: h ? +h[2] : 1, s: h ? b.body.slice(h[0].length) : b.body };
  }).sort((a, b) => a.i - b.i);
  const n = parts[0].n;
  if (parts.length !== n || parts.some((p, k) => p.i !== k + 1)) throw new Error(`代码块不全：应有 ${n} 块，找到 ${parts.map(p => p.i).join(',')}`);
  const joined = parts.map(p => p.s).join('');
  const json = kind === 'bfgz' ? zlib.gunzipSync(Buffer.from(joined.replace(/\s+/g, ''), 'base64')).toString('utf8') : joined;
  const data = JSON.parse(json);
  return { note, data };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const file = argv.find(a => !a.startsWith('--')), oi = argv.indexOf('--out');
  if (!file) { console.error('用法见文件开头'); process.exit(1); }
  const { note, data } = decode(fs.readFileSync(file, 'utf8'));
  const head = `技能新象棋 · 对局（工单）（版本 ${data.ver || '?'}）\nHam 的话：${note || '（没写）'}\n---DATA---\n`;
  const out = head + JSON.stringify(data) + '\n';
  if (oi >= 0) { fs.writeFileSync(argv[oi + 1], out); console.log('写到', argv[oi + 1], `（${(out.length / 1024).toFixed(0)} KB，${(data.entries || []).length} 条行动${data.think ? '，带思考记录' : ''}）`); }
  else process.stdout.write(out);
}
module.exports = { decode };
