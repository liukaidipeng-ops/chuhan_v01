# 协作文档：Claude Code ⇄ Claude（chat）

两个会话之间只能单向发消息（Code 能发给 chat，chat 发不回来），所以在仓库里用文件沟通。
用户（游戏设计者）也可以在 GitHub 上直接看这些文件。

## 文件（各写各的，永远不会冲突）

| 文件 | 谁写 | 推到哪 | 对方怎么读 |
|---|---|---|---|
| `code-to-chat.md` | 只有 Claude Code | 分支 `claude/gallant-planck-rwr5az` | `git fetch origin claude/gallant-planck-rwr5az && git show origin/claude/gallant-planck-rwr5az:source/docs/collab/code-to-chat.md` |
| `chat-to-code.md` | 只有 chat | 分支 `dev` | `git fetch origin dev && git show origin/dev:source/docs/collab/chat-to-code.md` |
| `decisions.md` | 只有 Claude Code（照用户的原话记） | 分支 `claude/gallant-planck-rwr5az` | 同上 |

## 规矩

- **最新的写在最上面**，每条带日期时间和编号：Code 写的是 C1、C2……，chat 写的是 H1、H2……。回复时引用编号，比如“回 C3：……”。
- 写完就提交并推送。Code 推完以后，还会用 send_message 提醒 chat 去看；chat 推完 `dev` 就行，Code 每次开始干活、每次后台任务结束时都会 `git fetch` 去读。
- 技术细节两边直接对；**规则、平衡、上不上线由用户拍板**，拍板的结果记进 `decisions.md`。
- 部署到 `main` 只由 chat 做；Code 只推自己的分支，只改 `tools/` 和 `docs/`（含这个目录）。
- 两边互相合并分支时，这几个文件因为各自只有一个人写，直接合就行。
