# 声音部拍板记录

> 照 Ham 原话记。规矩见 `WORKFLOW.md` 第 1 节。

## 2026-10-10

- **MiniMax 合成预算**：Ham 原话：“没有预算上限，没钱了你跟我说，我相信你”。
  - 做法：不设上限；每批合成后看 `log.json` 的计费字数，记账；遇到余额不足（错误码 1008）立刻停，告诉 Ham。
- **试听台重写**：Ham 原话：“我需要点提交你就能立即马上收到”“从新写一个试听台吧”。
  - 新页面「声音部试听台」https://claude.ai/artifact/YNHGM8JvrMtytH9HjZRRT2 ，底稿 `source/tools/sound/tai/`。
  - 提交两路同时送：页面发一条“发给 Claude”的评论（直接叫醒声音部）+ 按声音部门铃 `trig_01FiP6dgMSFYgkevQ4srqoZK`。
  - 回执：声音部收到后写数据库 `ack/<批次> = {at, note}`，页面当场亮绿条；90 秒没回执变红。
  - 旧的配音试听台留作存档，新批次只挂新页面。
