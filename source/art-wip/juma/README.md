# 拒马动画分镜（进度，未审）

审批台 art-073。`jm.js` 在真实对局里摆持矛兵（拒马阵）和来犯的楚骑：新姿势 `jmLow`（前排压低弓步）/ `jmHigh`（后排站高），通过包一层 `Models.Troop.prototype.target` 加进去；腿的弓步要接管 `update()` 里每帧重算的 `lL/lR`（交付时改 models.js 一行）。`jm.py wide sb2.json` 出图，`sheet.py` 拼图。
