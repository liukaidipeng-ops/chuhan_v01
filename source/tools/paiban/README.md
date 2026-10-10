# 拍板单（给用户点选回答的页面）

> **各部门都可以用这个模板建自己的拍板单**（Ham 10-10：名字写清楚，比如数值部的叫“Balance拍板单”；规矩见 `source/docs/collab/WORKFLOW.md` 第 3 节）：
> `node tools/paiban/make.js <部门名> 输出.html` → 用 Artifact 工具发布（`capabilities`：`{"comments":{},"db":{},"user":{}}`）→ 用 ArtifactData 往 `questions` 写题。谁发布的，Ham 提交时就通知谁。
> 模板 `template.html` 里的 `{{DEPT}}` 会换成部门名；`paiban.html` 是早期版本，留作参考。

- 数值部的“Balance拍板单”：https://claude.ai/artifact/QaxqVmNF1p2XQiAx8MygEM （只有用户能打开；源码 = `make.js Balance` 生成的）
- 页面源码：`paiban.html`（改了以后用 Artifact 工具按这个 URL 重新发布）；第一批题目：`questions.json`。
- 数据都在页面自带的数据库里（Code 用 ArtifactData 读写）：
  - `questions/<id>`：{order, title, context, options[{key,label,detail}], rec（Code 建议的 key）, why, batch, status: open|closed}
  - `answers/<id>`：用户提交的 {choice, choiceLabel, note, rec, keptRec, answeredAt}；部门读到后用 ArtifactData `update` 加 `ack: {at, text}`（回执，WORKFLOW 第 3 节第 6 条），页面亮“✓ 已收到”；用户再改再交会盖掉 ack，要重新写
  - `meta/progress`（可选）：页面顶部的百分比进度条——{title, note, stages:[{name, steps:[{label, state: done/doing/todo, w: 权重, note}]}], log:[{date, text}], updatedAt}；只有 done 的权重算进百分比，doing 在条上浅色标出
  - `meta/config`：{notifySession} —— 用户点“提交答案”后，页面用 Claude Code Remote 的 send_message 通知这个会话；会话换了就改它。
- 用法：新问题 = 往 `questions` 写文档（status: open）；处理完 = 把 status 改成 closed（页面会挪到“已经定了的”）。
