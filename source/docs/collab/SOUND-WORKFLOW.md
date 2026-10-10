# 声音部上手文档：配音、音效、音乐

> TD 写于 2026-10-10，用来把声音这块从 TD 交接给新开的声音部。
> 开工前先读 `WORKFLOW.md`（所有部门共用的规矩）。这份只讲声音。
> 下面写到“Ham 原话”的地方，都是从试听台的评语和聊天里照抄的。

---

## 0. 三分钟看懂

- 游戏里的声音分三块：
  - **配音**：主帅、旁白、兵种、四级名将、技能台词。有两套：「写实」（MiniMax，默认）和「原版」（Kokoro 离线合成，老味道，Ham 要保留）。
  - **音效**：真实录音素材，加上代码合成。
  - **音乐**：「禅意」是代码合成的；「战意」是 Ham 自己在 MiniMax 上做的一首；决战鼓用录音；结算曲是代码编的。
- 要 Ham 定的声音，一律挂到**配音试听台**：https://claude.ai/artifact/DGdGe1guoi1pB8UUNDfkS5 。他在上面评「就它 / 还行 / 不行」并写备注，点提交以后会通知出题的人。
- MiniMax 的密钥只放在仓库的 Secrets 里（名字是 `MINIMAX_API_KEY`）。合成只在 GitHub Actions 里跑：往 `voice-lab` 分支推一个 `voicelab/request.json`，几分钟后结果自己提交回来。**密钥绝不进代码、日志、聊天。**
- 上线只走 TD：声音部推自己的分支、写交付单，由 TD 合并、打包、部署。

## 1. 声音部管哪些文件

这是草案，Ham 点头、TD 同意后生效（见 WORKFLOW 第 6 节）。

| 文件 / 目录 | 是什么 |
|---|---|
| `source/voice/lines.json` | 台词表：编号、说话人、字幕；`tts` 字段是给 Kokoro 念的读法 |
| `source/voice/real/` | 写实版成品 mp3（每句一个文件）+ `real.json`（字幕 `text`、说明 `note`） |
| `source/voice/out/` | 原版（Kokoro）成品 mp3 |
| `source/voice/gen.py`、`gen_units.py` | 原版配音生成：主帅和旁白、兵种台词和人群呐喊 |
| `source/sfx/manifest.json`、`source/sfx/out/` | 音效素材清单和成品；清单里每条记了出处 |
| `source/sfx/*.py` | 音效入库脚本（下载 CC0、收试听台通过的成品、房间提示音、界面音效等） |
| `source/music/war.mp3` | 「战意」背景曲 |
| `source/src/audio.js` | 声音引擎：混音、素材加载、各兵种音效套组、配乐、配音播放 |
| `source/src/endtunes.js` | 结算曲（汉、楚的胜和败）和挑定表 `PICK` |
| `source/tools/tunes.py` | 把结算曲离线渲染成 mp3，挂试听台用 |
| `source/tools/sound/` | 后期工具：`vproc.py`、`sfxlib.py`、`pack.py`、`pack-maps/`；试听台页面的底稿在 `desk/` |
| `voice-lab` 分支 | MiniMax 合成：`voicelab/run.py`、`request.json`、`out/<批次>/`、工作流 `.github/workflows/voicelab.yml` |

**不归声音部管、要改先写交付单给 TD 的：**
- **什么时候响**：调声音的地方都在 TD 的文件里，即 `fx.js`（兵种台词 `bark`、名将 `heroKey`）、`squads.js`（对打、拒马）、`bfx.js`（技能演出）、`main.js`（主帅台词、彩蛋、房间提示音、设置）。
- `build.js`：打包规则。
- `template.html`：设置页上的选项，以及「玩法说明」末尾的素材署名。

## 2. 游戏里现在有哪些声音

| 类别 | 数量 | 在哪 | 备注 |
|---|---|---|---|
| 主帅台词（刘邦 `r_*`、项羽 `b_*`） | 开局、将军、绝杀、走子 / 吃子（`t*`）、送将抱怨（`bad*`）、王不见王、哀名将（`h_*`）、彩蛋（`x_*`）、揭棋开场 | lines.json + real/ + out/ | 两套都有 |
| 人机对战里电脑的嘴（`ai_l_*` 刘邦、`ai_x_*` 项羽） | 各 13 句 | 同上 | 吃子、被将、赢、输、悔棋、催你快走 |
| 旁白（`w1–15` 垓下、`p1–9` 彭城） | 24 句 | 同上 | 结算动画里念 |
| 技能模式剧情（`bf_*`） | 破釜沉舟、鸿门宴、樊哙闯帐 | 同上 | |
| 兵种台词（`u_<方>_<兵种>_<k 吃子 / m 走子><序号>`） | 汉 33、楚 32 | 同上 | 兵种代号：r 车、n 马、e 相象、a 士、c 炮、p 兵、k 帅 |
| 升级台词（`up_<方>_<兵种>_<级>_<序号>`） | 汉、楚各 24 | 只有写实版 | 二、三级说新称号；四级说名将的话 |
| 四级名将（`h_<方>_<兵种><名将序号>_<m1/m2 走子, a1/a2 攻击, k1 吃子, s_<技能>>`） | 约 200 | 只有写实版 | 名将表见第 4.3 节 |
| 三级兵技能句（`sk_<方>_<技能>_<1/2/k>`） | 各 17 | 只有写实版 | 技能：冲阵、拒马、飞越、踏营、霹雳、护驾…… |
| 虎骑台词（`t_u_*`） | 4 | 只有写实版 | 只在 `?tiger=1` 预览里用 |
| 音效素材 | 77 组、约 200 条 | sfx/out | 一组几条随机放 |
| 背景乐 | 禅意（合成）、战意（录好的）、关 | audio.js、music/war.mp3 | 设置「背景音乐」 |
| 决战鼓 | 战鼓一阵紧过一阵 | audio.js `Music` | 全用录音 |
| 结算曲 | 汉胜「礼乐」、楚败「乌江」、楚胜「乌骓」「楚凯」随机；汉败还是原曲 | endtunes.js `PICK` | 见第 6 节 |

## 3. 线上怎么打包、怎么加载

- `node source/build.js` 打包，网页本体 `index.html` 约 2.9 MB。大件声音都**不内嵌**，各打一个包放在网页旁边：

| 包 | 大小 | 内容 | 什么时候取 |
|---|---|---|---|
| `sfx.bin` | 1.5 MB | sfx/out 全部 | 页面一开就在后台取 |
| `voice-real.bin` | 5.1 MB | 写实版（除技能模式句） | 选了「写实」（默认）才取 |
| `voice-bf.bin` | 5.4 MB | `up_` `h_` `sk_` 开头的句子 | 进技能模式的局才取 |
| `voice-orig.bin` | 2.9 MB | 原版 | 选了「原版」才取 |
| `music-war.mp3` | 1.2 MB | 战意 | 选了「战意」才取 |

  每个包的网址带内容摘要（`?v=`），换了素材，玩家自然取新的。
- 设置里的键：
  - `music`：`zen` / `war` / `off`，默认 `zen`；
  - `voice`：`2` 写实 / `1` 原版 / `0` 关，默认写实；
  - 音量 `vMusic` 55、`vSfx` 90、`vVoice` 100。
- `audio.js` 的结构：
  - 三条总线（音效 / 配乐 / 配音）→ 混响、压缩 → 出声。
  - `Sfx.B` 是基础声音；`Sfx.U` 按兵种分套组（move / charge / impact / die……）。
  - `Voice` 负责配音。兵种台词单独走一路 `Voice.bark`，不打断主帅和旁白，也不被它们打断。
- 苹果手机：开着静音键也要出声，所以后台循环放一段 1 秒真静音（`audio.js` 开头）。别删。
- 声音按真实时间放，演出按动画速度走，两边要换算后再对齐（`Sfx.line()`、`after()`、`lineLeft()`）。比如马要先说台词，再踏蹄、嘶鸣。
- 包里还没取到的声音就直接跳过，不会报错。本地测试想全静音，可以在浏览器存储里设 `xq3d-noaudio`。

## 4. 配音

### 4.1 写实版（MiniMax）：从写词到上线

1. **写词、定编号**：编号规则见第 2 节。新句子如果两套都要有，就进 `lines.json`。只要写实版的（技能模式那些），不用进 `lines.json`，字幕写进 `real/real.json` 的 `text`。
2. **合成**：切到 `voice-lab` 分支，改 `voicelab/request.json`，然后推送。
   ```json
   { "batch": "b35", "list_voices": false,
     "jobs": [ { "id": "real_h_r_a0_m1__1", "voice": "Japanese_GenerousIzakayaOwner", "text": "樊哙来了，都让开！",
                 "emotion": "angry", "speed": 1, "pitch": 0, "vol": 1,
                 "tone": ["哙/(kuai4)"], "modify": { "pitch": -20, "intensity": 30, "timbre": 20 } } ] }
   ```
   - 默认模型 `speech-2.8-hd`。`emotion` 可选 happy / sad / angry / fearful / disgusted / surprised / calm。
   - `tone` 用来指定读音，比如“将军”。`modify` 调音色：pitch 低沉↔明亮、intensity 刚劲↔轻柔、timbre 浑厚↔清脆，都在 −100..100。
   - `voice` 写成 `~关键词`，会在 `voicelab/voices.json`（全部音色清单）里找第一个匹配的音色。
   - 推送后 Actions 自动跑，结果提交回 `voicelab/out/<batch>/`：每条一个 `real_<id>.mp3`，外加 `log.json`（成功与否、时长、计费字数）。
   - 失败会自动重试。限流（1002 / 1039 / 429）会等着再试；余额不足是 1008。
3. **后期**：工具在 `source/tools/sound/vproc.py`，统一 32 kHz 单声道。能用的处理：
   - 去头尾静音 `trim`、拉齐响度、拖尾音 `tail`、改句间停顿 `setgaps`、拼接 `xjoin`、混响 `reverb`。
   - 刘邦统一加一层大殿混响（Ham：“刘邦也加点空间混响”）。
4. **挂试听台**，等 Ham 评（见第 7 节）。
5. **入库**：把通过的那条写进映射文件（格式见 `pack-maps/`），然后运行
   `python3 source/tools/sound/pack.py 映射.json <voice-lab 的 voicelab/out 目录>`。
   成品落到 `voice/real/<编号>.mp3`：响度 −17.4 dB、56 kbps，字幕同时写进 `real.json`。
6. **交给 TD**：要写清楚新句子在什么时候说。已有的触发点（比如名将的 m1/m2/a1/k1）不用改代码，有了文件就会自己说。

### 4.2 原版（Kokoro）

- 用 `voice/gen.py`（主帅、旁白）和 `voice/gen_units.py`（兵种、人群呐喊）生成。用的是 sherpa-onnx 的 Kokoro 多语种模型 `kokoro-multi-lang-v1_0`，到 GitHub 上 k2-fsa/sherpa-onnx 的 tts-models 发布页下载。
- 两个脚本里写死了模型路径（指向 TD 的临时目录），用之前改成你自己的。
- 主帅的声线和处理链在 `SPK` 里：narr 旁白、xiang 项羽、liu 刘邦、zhang 张良、elder 乌江亭长。
- 原版只覆盖老句子。技能模式的新句子只有写实版，选原版的玩家会退回去用写实版的包。

### 4.3 角色和音色（写实版）

依据是 `voice-lab` 分支 `voicelab/request.json` 的提交历史：取最后一次录这个角色时用的音色。重录前请对照试听台上 Ham 选中的那条。

| 角色 | MiniMax 音色 | Ham 的要求 |
|---|---|---|
| 刘邦 | `Chinese (Mandarin)_Reliable_Executive` + 大殿混响 | 温文尔雅但也毒辣；“再老道一点，有城府一点”；哀名将时自称“寡人”，悲叹、带哭腔，不能听着像嘲讽 |
| 项羽 | `Chinese (Mandarin)_Humorous_Elder` | 霸气外露、蔑视群雄的傲慢；“把声音喊出来”；绝杀后哈哈大笑 |
| 旁白 | `Chinese (Mandarin)_News_Anchor` | Ham 最初定的方向：女声、沉着；句与句之间的停顿不能太短 |
| 汉兵（升级、技能句） | `Spanish_PowerfulSoldier` | 不能太嫩、太年轻；吃子“一定要激动！喊出来！” |
| 楚兵（升级、技能句） | `Spanish_PowerfulVeteran` | 同上 |
| 汉名将 | 韩信 `male-qn-jingying`、夏侯婴 `Portuguese_Debator`、周勃 `Spanish_PassionateWarrior`、曹参 `Spanish_Debator`、王陵 `Spanish_AngryMan`、卢绾 `junlang_nanyou`、傅宽 `Spanish_ReliableMan`、樊哙 `Japanese_GenerousIzakayaOwner`（定名“辰”）、纪信 `Spanish_ThoughtfulMan`、张良 `Chinese (Mandarin)_Radio_Host`、萧何 `Portuguese_SensibleManager` | 樊哙：“沧桑有力气”“无脑勇”；技能击杀句：“再狂妄一点，可以加点笑” |
| 楚名将 | 龙且 `badao_shaoye`、钟离昧 `Portuguese_Strong-WilledBoy`、季布 `Chinese (Mandarin)_Unrestrained_Young_Man`、英布 `Portuguese_AngryMan`、虞子期 `male-qn-qingse`、桓楚 `Spanish_Ghost`、周殷 `Spanish_Deep-tonedMan`、项庄 `Korean_CockyGuy`、项伯 `Spanish_MaturePartner`、范增 `Spanish_SereneElder`、项佗 `Portuguese_ReliableMan` | 钟离昧冲阵：“太娘了……不够决绝，不够傲气” |

- 名将的编号：`bingfa.js` 里 `HERO_CN` 的顺序就是名将序号，比如汉车 r0 韩信、r1 夏侯婴。
- 四级的名将名字发完了，就借同兵种一位名将的声音（Ham：“四级直接用名将语音就好了”）。

## 5. 音效

- **素材只用三种许可**：CC0（公共领域）、CC BY 3.0、CC BY-SA 3.0。后两种必须署名，署名写在「玩法说明」末尾（`template.html`，改它找 TD）。现在用到的：
  - 0 A.D.（Wildfire Games，CC BY-SA 3.0）：马蹄、马嘶、象鸣、兽吼、脚步；
  - OpenClonk（CC BY 3.0）：炮响、爆炸；
  - Kenney、OpenGameArt、Minetest 等（CC0）。
  每条的出处记在 `manifest.json` 的 `src` 里。
- **下载**：这个工作环境只能访问 GitHub 和常用的包管理站点。CC0 素材是从 GitHub 上的合集取的，`sfx/fetch.py` 里有地址。别的网站多半打不开，需要就请 Ham 下载后发来。
- **入库**：
  - 成品放进 `sfx/out/<名字>_<n>.mp3`（单声道 22.05 kHz），然后登记到 `manifest.json`：`{名字: [{f, dur, src}]}`。
  - 代码里用 `smp('名字', {t, vol, rate, pan, …})` 放，同组多条会随机挑。
  - 入库脚本（`add_approved.py`、`add_real.py`、`add_room.py`、`add_uisfx.py`）的参数要求“后期工具目录”，现在就是 `source/tools/sound`。
- **Ham 通过的成品直接入库**，不在游戏里现叠素材，这样玩家听到的就是他点头的那一条。比如巨炮 = 实录炮响 + 爆炸 + 火药爆炸。
- `sfxlib.py` 是马蹄叠层、“台词 + 马蹄 + 马嘶”的拼法、巨炮的做法。里面 `E='/tmp/ele/'` 是象的原始素材目录，已经不在了，用到要重新取。

## 6. 音乐

- **禅意**：`audio.js` 里 `Music` 现场合成，有古琴、泛音、箫、磬。Ham 对它满意，别动。
- **战意**：`music/war.mp3`，Ham 自己在 MiniMax 网页上生成的古风战斗曲。原来合成的那版他不喜欢。循环播放，首尾交叠 1.6 秒。
- **决战**：一阵紧过一阵的战鼓，全用录音。
- **结算曲**：
  - 写在 `endtunes.js`，汉用 D 宫（明亮），楚用 D 羽（悲壮）。每首是一段代码。
  - `PICK` 记着挑定的方案，挑定前用老曲子。
  - 出试听样：先 `node source/build.js`，再 `python3 source/tools/tunes.py source/dist/site <输出目录>`。设环境变量 `JOBS=b:win:3,b:win:4` 可以只出这几首。脚本会报每首的时长、响度、峰值。
  - 响度对齐：胜约 −15 LUFS，败约 −21 LUFS。
  - Ham 的口味：他挑中的都是弹拨、编钟、古琴、真鼓真锣；合成的“电子感”不要（b19：“电子感有点”）。
- **MiniMax 的音乐接口用不了**：对新用户关闭（2153），三个站点都试过。曲子只能自己编，或者请 Ham 在 MiniMax 网页上做好发来。

## 7. 配音试听台（Ham 审声音的地方）

- 页面：https://claude.ai/artifact/DGdGe1guoi1pB8UUNDfkS5 。用的能力是数据库（db）和 Claude Code Remote（mcp，用来通知）。底稿在 `source/tools/sound/desk/`。
- **出一批新题**：
  1. 用 Artifact 工具 `read` 这个页面，取最新的 `clips.json`。
  2. 在 `batches` **最前面**加一批：`{id:"b35", title:"第三十二批 · …", date, note:"给 Ham 的说明：为什么、要他定什么", groups:[{id, who, title, hint, clips:[{id, label, text, src:"audio/b35/xxx.mp3"}]}]}`。
  3. 用 Artifact `publish`（带 `url`）发布页面，`files` 里带上新的 mp3。旧文件不传会保留；clips.json 只留最近十来批。
  4. 每组都要写清楚：在游戏里什么时候响、和什么对比、怎么挑（三选一 / 都行随机）。对照的原声放在组里的最后一条。
- **读结果**：用 ArtifactData 读集合 `fb`，`fb/<条目 id>` 的内容是 `{v: "yes"(就它) | "ok"(还行) | "no"(不行), note, at}`。按组评的备注在 `fb/<组 id>` 里；`submit/<批次>` 是提交记录。备注就是 Ham 原话，照做。
- **通知**：页面提交时会改一个提醒，把通知送进出题人的对话。现在用的是 TD 的提醒 `trig_01W35STHBCavAc6wHcR1tsZ5`。声音部接手的步骤：
  1. 给自己装一个提醒（`create_trigger`，绑定自己的会话，不设时间）；
  2. 在试听台数据库写 `cfg/notify = {trigger: "<你的提醒编号>"}`，页面就改为通知你。
  写之前跟 TD 说一声。通知不到时，Ham 会在聊天里说“提交了”。
  （10-10：声音部已把 `cfg/notify` 改成它的门铃 `trig_01FiP6dgMSFYgkevQ4srqoZK`，试听台提交从此通知声音部。）
- 编号惯例：每批一个 `bNN`（标题里写第几批）。条目 id 写成 `<批次>_<游戏编号>_<变体>`，看到评语就能对回去。

## 8. 交付给 TD

- 分支：建议 `claude/sound`，具体以分工草案为准。只推自己的分支和 `voice-lab`，不碰 `dev` / `main`。
- 交付单：声音部 → TD 写在 `sound-to-main.md`（S 号），TD → 声音部写在 `main-to-sound.md`（H 号），每条都编号。交付单要写清楚：
  - 动了哪些文件、试听台哪一批通过；
  - 要 TD 接什么触发；
  - 有没有新的署名。
- 交之前：
  - 在本地跑一遍 `node source/build.js`，确认不报错；
  - 看一眼包的大小（第 3 节），手机首屏只下 `index.html`，大件一律放进旁边的包，别内嵌；
  - 跑一遍 TD 的测试：`node source/test/<各个>.test.js`。
- TD 合并、打包、部署、写更新说明，部署后在 `main-to-sound.md` 回一条。

## 9. Ham 定过的规矩和口味（原话为准）

**做事的规矩**
- 声音都要先挂试听台，他点了「就它」才进游戏。上线后有变化的（比如改了结尾），再挂一批“已上线”的给他复听。
- 原版配音“虽然唐但有风格”，作为选项保留；写实是默认。
- 四级“直接用名将语音”。
- 落子声分木、银、金、玉四种材质，“主要是针对极简模式下的音效”：只在「棋子显示：棋子」并且低特效时用，其他档位照旧用木头声。
- 房间提示音（进房、准备）各挑了三条，“都行随机”。

**配音的口味**
- 情绪要足：吃子“一定要激动！喊出来！愤怒一点！有情绪化”。读书腔、软绵绵一律不要。
- 重音和读音：
  - “将军”的“军”要读准，重音放在“军”上（他评过好几次）；
  - 炮手“炮”要拖长音、喊出来；
  - 停顿要自然：句子中间别怪停，旁白句与句之间别太短。
- 同一个角色前后音色不能变（b11：“为啥音色都变了？？？？”）。
- 士兵“太嫩了，不够士兵”的不要。

**音效的口味**
- 炮：“不要火铳，要大炮！巨炮”。开炮组（人声 + 点引线 + 开炮）和落地组（呼啸 + 爆炸 + 碎石）分开审。
- 马：顺序是先人声台词，再马蹄，最后马嘶。
  - 马蹄要“踏在土地上”，不能太脆，还要错开、不能太同步；
  - 标准模式叠 3 个马蹄；技能模式按等级叠 1 / 2 / 3 个。
- 虎：“虎啸山岭的感觉”，加混响；要偏进攻的猛兽声。
- 象：真实象鸣，随机放在楚象进攻后和象死后。
- 兵的脚步：标准模式用干土地上的那条；技能模式按等级、人数决定。

## 10. 没办完的事（交接时的状态）

1. **兵卒对打的盾挡声**（美术 M26，在 `model-lab` 分支，Ham 审批台 art-085 的备注）。M26 描述的声音：矛尖扎在蒙皮木盾、铜钉上被顶住；底下一声闷的“咚”，上面一点短促的金属“锵”；比 `thud` 脆、比 `clang` 闷、不拖尾。
   - 建议加成 `Sfx.B.block(pan, vol)`，先挂试听台让 Ham 挑。
   - 哪一帧响，等美术交付对打时在单子里写。
2. **汉胜、汉败结算曲**：Ham 在第二十八批要求“方案三保留，再让 minimax 写俩方案”，汉败是“原曲保留，再写俩”。MiniMax 音乐接口不开放，这两组还没出新方案。可以自己编几首挂试听台，或者请 Ham 在 MiniMax 网页上做。
3. **拒马的新动画**（Ham 10-10，美术在做）：弩手射拒马兵、虎骑冲毁工事、象冲锋踏碎。动画交付后要配声音。
4. 虎骑台词 `t_u_*` 只在 `?tiger=1` 预览里用；正式换上虎骑后，要和美术、TD 对一下。

## 11. 坑

- 合成要往 `voice-lab` 推，别推到 `dev` / `main`。GitHub Actions 的并发和数值部的模拟共用（免费账号一共 20 个任务），一次别塞太多。
- `voicelab/out` 只在 `voice-lab` 分支上，不进游戏。游戏只认 `voice/real/` 里打包好的成品。
- 字幕分两处：选「写实」时先用 `real.json` 的 `text`（没有才用 `lines.json`），选「原版」时用 `lines.json`。改词时两处都要看。
- 在无头浏览器里出试听样要加 `?nogl`（不画三维），并且等素材解码完（`tunes.py` 里有等待的写法）。
- 素材许可不清楚的，一条都不要用。
