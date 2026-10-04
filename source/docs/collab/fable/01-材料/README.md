# 01 审查的脚本和输出（原样）

Fable 三路和核查员在 scratchpad 里写的脚本、跑出的小份输出，审查结束后由 Code 原样拷进来（容器回收后 scratchpad 就没了）。
报告里写的 `/tmp/.../scratchpad/fable/<文件>` 对应这里的 `<文件>`；`skeptic_*` 是各核查员的小实验。
没拷的：电脑文件副本（`git show <提交号>:source/src/bfai.js` 就能取回）、大的 JSON 明细、线上引擎副本（`git show 686d6b3:source/src/bingfa.js`）。
`page_timing/` 是 Code 的真实页面测速输出（工具 `tools/bfpage_timing.js`）：`page_*` = b18c278 对 25eb911，`page2_*` = 73eb7d4 对 25eb911。
