# 刘邦三维模型 · 三个版本（进度存档，未审）

审批台 art-051 等 Ham 选方向。这里的东西不进打包（build.js 不读这个目录）。

- `lb2.js`：版本一（卡通精修）的全部：冕服、冕冠、大袖、卡通头；也是版本二、三的衣服。`LB2.make({stage:1})`
- `lb3.js`：版本二、三：MakeHuman 身体和脸（`window.LIU_BODY`），衣服用 `lb2.js` 按这副身体的关节生成。`LB3.make({look:'pbr', ink:true})` 是版本二，`LB3.make({look:'pbr'})` 是版本三
- `cine.js`、`dress.js`：MakeHuman 网格 + 骨架的运行时、皮肤 / 眼睛 / 眉须发
- `mhbuild.py`、`chars.py`：从 MakeHuman 基础网格（CC0）按配方生成 `liu_body.json`（`python3 chars.py liu`，形变目标从 MakeHuman 的 GitHub 取）
- `mrender.py`（游戏的光）、`rrender.py`（写实的光 / 墨线纸色）：出图脚本
