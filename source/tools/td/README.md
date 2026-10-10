# TD 工具

- `deploy.sh`：上线（见 `docs/collab/TD-HANDOVER.md` 第 2 节）。
- `steprec_juma.py`：逐帧录屏的例子（拒马演出）。无头浏览器渲染慢，接管 `THREE.Clock` 一帧一帧推、自己渲染再截图。参数见文件开头。
- `arcrec.py`：走法提示弧线的逐帧录屏（`?arcv=N` 选样式；场景 `pili` 炮打马、`fy` 相飞越）。
- `luozi_check.py`：落子入局过场的检查：`python3 source/tools/td/luozi_check.py pc|phone ai|local [站点目录]`，打印过场中三次取的格线是否一致，并在 `shots/` 存叠了格线的截图。
- `perfinfo.py`：手机尺寸下的绘制次数、三角形数、帧率（查发烫、卡顿）。`python3 perfinfo.py <站点目录> lobby|std|bf|bf-models`。
- `desk/shenpi-index.html`：楚汉审批台页面 10-10 的底稿（改之前先用 Artifact 工具读线上最新的）。
