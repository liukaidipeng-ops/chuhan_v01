// 拍板单页面：按部门名字生成（Ham 10-10：各部门各有一张拍板单，名字写清楚，比如数值部的叫“Balance拍板单”）
//   node tools/paiban/make.js <部门名> <输出.html>      例：node tools/paiban/make.js Balance /tmp/paiban.html
//   模板 template.html 里的 {{DEPT}} 换成部门名；中文名旁边的空格自动去掉（“TD 建议”、“美术建议”）。
//   生成后用 Artifact 工具发布，capabilities 要 {"comments":{},"db":{},"user":{}}；用法见同目录 README.md。
'use strict';
const fs = require('fs'), path = require('path');
const [dept, out] = process.argv.slice(2);
if (!dept || !out) { console.error('用法：node tools/paiban/make.js <部门名> <输出.html>'); process.exit(1); }
const cjk = c => !!c && /[　-鿿＀-￯“”‘’]/.test(c);
let s = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const dCJK = cjk(dept[0]), dCJKend = cjk(dept[dept.length - 1]);
s = s.replace(/( ?)\{\{DEPT\}\}( ?)/g, (m, a, b, off, str) => {
  const before = str[off - 1], after = str[off + m.length];
  return (a && !(dCJK && cjk(before)) ? a : '') + dept + (b && !(dCJKend && cjk(after)) ? b : '');
});
fs.writeFileSync(out, s);
console.log('写到', out, `（${dept}拍板单）`);
