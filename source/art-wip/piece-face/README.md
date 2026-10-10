# 棋子字面 · 宋体 + 年轮（M21 交付用的底稿）

审批台 078 选「乙 · 宋体」，072 选年轮木面，074 要字体统一。游戏里用的是 `source/src/face.js`，这里是怎么来的：

- `NotoSerifTC-Bold-pieces.ttf`：思源宋体 TC（Noto Serif TC）Bold 只留十四个棋子字的子集，SIL OFL 1.1（授权全文同 `source/fonts/OFL-NotoSerifSC.txt`）。
- `bake.py`：把十四个字的轮廓烘成 SVG 路径，算好统一缩放和居中（`python3 bake.py NotoSerifTC-Bold-pieces.ttf glyphs.json`），结果贴进 face.js 的 `K` 和 `G`。
- `shoot.py`：交付前自查，用打了交付补丁的构建起本地对局，拍木、银、金、玉（电脑、手机、揭棋暗子），再和 078 送审的字模逐像素比。
- `m21_check.jpg`：自查图。
