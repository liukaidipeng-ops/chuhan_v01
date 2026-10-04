# Fable 的工作记录（Claude Code 维护）

Fable 是 Claude Code 按需调用的“疑难杂症”专家（用户 2026-10-04 同意加入）。它不直接改游戏代码，产出交 Code 测试；有效的再由 chat 正式并入，照样过总闸。
**这里原样保存所有往来**（用户要求：设计说明原样存，不能只留摘要），用户在手机上用 GitHub 就能看。

**在哪看**：这些文件在分支 `claude/gallant-planck-rwr5az` 上（chat 合并后 `dev` 也有），**`main` 上没有**——GitHub 手机端默认打开的是 `main`，要先切到这个分支，再进 `source/docs/collab/fable/`。
Fable 每一路交稿后就先存进来（标“核查中”），不等全部做完。

| 文件 | 内容 |
|---|---|
| `NN-题目-*.md` | Code 交给 Fable 的题目（原文） |
| `NN-回复-*.md` | Fable 的回复、设计说明（原文） |
| `NN-清单-*.md` | Code 给用户的白话“下棋变化清单”（每条配例子） |
| `NN-测试-*.md` | 原型的测试结果（考题、对打、统计） |
| `fable-notes.md` | 01 审查（考卷和总闸六问）的最终汇总：必须改 / 建议改 / 没问题 |
| `01-核查记录.md`、`01-材料/` | 01 审查每条结论的独立核查原文；脚本和输出 |

**chat 怎么看**：原文都在这里，chat 直接读，用 `git show origin/claude/gallant-planck-rwr5az:source/docs/collab/fable/<文件>` 或合并分支都行。
另外 Code 会在 `code-to-chat.md` 写一段简短的“要你做什么”（哪项改动测试有效、代码在哪、注意什么）。
Fable 的原型代码会提交到 `source/tools/variants/bfai_fable.js`，方便 chat 和 `src/bfai.js` 逐行对比、复现测试。
Fable 统一由 Code 调用，chat 不另外调用，避免重复和结论打架。

流程（用户定的，见 NOTES.md 4.1）：
1. Code 先出四个缺口的考题、提交；
2. Fable 交设计说明（原样存这里）；
3. 技术方案由 Code 和 chat 用测试把关，用户只看白话清单；
4. 原型的每个改动做成独立开关，逐项对打测试；
5. 有效的交 chat 并入。
