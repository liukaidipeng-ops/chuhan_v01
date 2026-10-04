# 拍板单（给用户点选回答的页面）

- 线上：https://claude.ai/artifact/QaxqVmNF1p2XQiAx8MygEM （只有用户能打开）
- 页面源码：`paiban.html`（改了以后用 Artifact 工具按这个 URL 重新发布）；第一批题目：`questions.json`。
- 数据都在页面自带的数据库里（Code 用 ArtifactData 读写）：
  - `questions/<id>`：{order, title, context, options[{key,label,detail}], rec（Code 建议的 key）, why, batch, status: open|closed}
  - `answers/<id>`：用户提交的 {choice, choiceLabel, note, rec, keptRec, answeredAt}
  - `meta/config`：{notifySession} —— 用户点“提交答案”后，页面用 Claude Code Remote 的 send_message 通知这个会话；会话换了就改它。
- 用法：新问题 = 往 `questions` 写文档（status: open）；处理完 = 把 status 改成 closed（页面会挪到“已经定了的”）。
