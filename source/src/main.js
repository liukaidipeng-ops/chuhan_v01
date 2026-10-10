// ===== 主流程：大厅、人机、开房选项、对局、计时、悔棋、喊话、棋谱、联机同步 =====
(() => {
  const $ = id => document.getElementById(id);
  const other = XQ.other;
  document.getElementById('paper').style.backgroundImage = `url(${Core.Tex.paperNoise})`;
  const NAME = { r: '刘邦', b: '项羽' }, SEAL = { r: '漢', b: '楚' }, SIDE_CN = { r: '汉', b: '楚' };
  const PHRASES = ['好棋！', '快些落子，莫要拖延！', '竖子，不足与谋！', '尔等已是瓮中之鳖。', '胜败乃兵家常事。', '此局，天命在我。', '且慢，容我三思。', '再来一局，决一雌雄！'];
  // 更新说明（设置里、大厅底部点「更新」查看；最新的放最前）
  const NEWS = [
    ['第六版', '2026 年 10 月', [
      '跳过去、打过去的走法提示画成一道抛物线，从这枚子的顶上落到目标子的顶上（往一侧斜一点，顺着镜头方向跳的也看得出）：炮隔子吃子、飞越、踏营，技能里的霹雳、冲阵、齐射；地上一道淡影',
      '技能模式规则：马的「踏营」也改成被动（同飞越）——三级马在敌方半场、冷却好了，马腿被蹩住的日字落点直接能点，点了先问一句用不用，用了冷却 2 回合',
      '结算画面的「复盘」和「分析」合成一个「复盘」：进去就是复盘加分析面板；复盘条上多一个「分析」，可以收起、再打开（揭棋没有分析，只复盘）；「我的棋局」里的复盘也一样',
      '人机对战输了（被将死、困毙等）先不进结算：弹一个框，10 秒内点「悔棋」就悔回去接着下，点「认输」或等 10 秒才进结算（悔棋次数照常算；用完了就直接结算）',
      '技能模式规则：象、相撞上拒马不挨那 1 点（践踏、齐射本来就不触发）；「飞越」改成被动——三级起冷却好了，象眼被塞住的田字落点直接能点，点了先问一句用不用，用了冷却 5 回合',
      '技能模式「拒马」有了新动作（美术画的）：几级就几个兵，压低重心、长矛斜指来敌（三级前二后一，四级金甲的斩马刀也前指），模型模式下拒马的两回合里一直摆着；敌方撞上矛尖先掉 1 点血——头顶飘「−1」、脚下血圈少一段、头马人立——然后面朝拒马倒退几步再冲。顺带修好：原来撞完是转身走回起点，再冲时背对着拒马',
      '棋子换了新字面（美术画的）：十四个字统一成一套宋体，粗细一致、炮字不再偏下；木棋子换成年轮木面，每颗子的年轮疏密、走向都不一样；银、金、玉棋子的珐琅字也换成同一套字',
      '技能模式棋子升级有了变身动画（美术画的）：棋子跳起来翻个身，翻到侧面那一刻换上新材质，落下时迸一圈光（银白 / 金 / 玉白）；脚下血圈、拒马桩留在原地不跟着翻',
      '联机、人机对局楚军获胜时的结算曲换成新写的两首，随机放一首：「乌骓」（马嘶、马蹄、古筝往上扬）、「楚凯」（编钟奏的庄重楚调，最后一声钟余音拉长）',
      '技能模式电脑会想到「先升级、攻击变大、再吃子」了（比如升象吃炮），原来这种升级被它的筛子挡掉（数值部改的，对原来的霸王不吃亏）',
      '结算画面多了「分 析」：电脑把整局每一步评一遍（佳 / 好 / 缓 / 失 / 错），底下一条兵势河看谁占优，点一枚兵符看这步该怎么走；「详解」结合前后几步讲清楚这步为什么错、应该怎么走、两条路走下去差多少，还能在棋盘上演示（Ham 选的方案三「沙盘兵势」）',
      '结算画面多了「保 存」：存进这台设备的「我的棋局」（大厅右上角），能复盘、复制；设置里粘好 GitHub 令牌后可以「存并发给数值部」，数值部回复、处理完都能在「我的棋局」里看到',
      '棋谱上点某一步可以标「这步笨」，写一句哪里笨，保存、发给数值部时一起带上',
      '兵种模型的战马、骑士、战车、铜炮、战象，每个由几十块零件分开画改成合成一块画：样子不变，每帧少画约四分之一（Ham 选的性能活第二件）',
      '修好：被将军、只有先给某枚子升一级才解得了将时，电脑有时一步都不走、对局卡住；人升错了子（升完还是无路可走）也会卡住——现在电脑会找到能解将的升法；人这边，升了也解不了将的子不让升（升级按钮写「解不了将」），只能升对的那枚（数值部查出来的，规则 Ham 定）',
      '联机时状态条左边多了信号格（美术画的）：对方一拍没音信变白、两拍变黄、断开或 9 秒没音信变红并闪；信号好就不显示（原来的小圆点去掉了）',
      '安卓手机在微信、QQ 等 App 里打开时，系统字号调大会把网页字也放大、挤乱界面：现在开局量一下放大了多少再缩回来，字号和浏览器里一样',
      '技能模式：主将卡上的军功改成一方金印（美术画的），加功时一团金光从来处飞进印里、金星四溅；花功时印变红、金光飞向升级的子或兵法签；旁边飘「+n 功 · 原因」',
      '联机房间有观众席了（美术画的样子）：观众按进房先后叫农夫、樵夫、渔夫、牧童、书生、货郎，不用自己填名字；房主可以点观战席最后的「坐这里」去旁观，点空座位坐回；房主在观战席时可以「我的座位加人机」，让电脑替你和对手下（对手也是电脑就是电脑对电脑）。原来的「观看人机对战」按钮去掉了',
      '技能模式改了「拒马」（Ham 定的）：架上拒马的两回合里这枚兵原地不动，不能走（回防、神速营也不行）；炮隔子打过来不挨反伤（拒马的矛够不着），车马兵士象撞上来照旧先挨 1 点；冷却从 2 回合改成 4 回合',
      '「导出本局」里多带了电脑每一步当时的思考（算到几层、前几名候选和它预想的后续、有没有被一步杀保险换掉、筛掉了哪些升级），悔棋悔掉的那几步也留着——给数值部复盘、训练电脑用；电脑的走法没变',
      '电脑上的大厅：三个圆按钮改成「人机 · 联机 · 本地」，联机放中间（手机上照旧竖排，联机在最上面）',
      '本地双人换边改成像转盘一样转过去：慢慢起步、慢慢停下，棋子跟着一起转，字一直是正的（原来是一下子甩过去）',
      '界面音效（你在试听台挑的）：电脑上鼠标移到大厅的三个圆形图标（联机大厅、人机对战、本地对战）上轻轻「叮」一下（玉片轻碰），点它们「嗒」一声（玉扣）；别的按钮、选项不出声。棋子显示选「棋子」+ 低特效时，落子声按棋子材质分开：木棋子像筹码落桌、银棋子「叮」、金棋子厚重的「当」、玉棋子像瓷碗轻磕（技能模式按等级：一级木、二级银、三级金、四级玉）',
      '技能模式电脑「霸王」变强了（数值部做的）：同样的思考时间能多算半层到一层（多数步能算到五层），和上一版对下 600 局赢 57.6%；每步还快了一点。电脑判断“谁在将军”也快了约两成，各模式结果不变',
      '修好：俯瞰、定盘（正上方看）时，进攻、吃子的震屏会让整张棋盘乱转几十度、来回抽动。原因是正上方往下看时镜头分不清哪边是“上”，一点点抖动就整盘转。现在正上方看时震屏只是整个画面轻轻平移一下，不转不歪；本地双人在正上方看时换边也改成平稳地转过去',
      '本地双人：棋盘自动转向——轮到谁下就转到谁那边；按「视」可以改成自由视角（不自动转）',
      '一级木棋子换成牙黄面加色边，手机上汉方的字看得清；银、金棋子顶面的高光收小；二级以上的血条改成棋子脚下一圈立体血段',
      '联机房间：人机座位大字写档位（新兵 / 校尉 / 霸王），小字写「人机 ★★」；选档的下拉换成和按钮一样的样子',
      '技能模式分三个阶段：第 15 回合起进入第二阶段，每回合双方各得 1 点军功；第 45 回合起进入第三阶段，每回合各得 2 点。进入时会弹提示',
      '技能模式新规则：被将军时，只要先给某枚子升一级就能解将（比如士升二级砍死二血车），就不算将死；这时会提示你先升级',
      '技能模式说明框里的技能分颜色：主动青、被动紫、没解锁的灰色；冷却中变暗，写着还剩几回合；每个技能都标上冷却时间',
      '技能模式：棋子说明框改版——生命（红）、攻击（橙）、军功（金）做成三块大字；「甲片」去掉了，统一叫军功：这枚子每杀一个敌子记 1 点，说明框里写着攒满几点自动升级。汉军腰带上换成金边朱心的圆牌，楚军仍是乌铁甲片',
      '联机、人机对局的结算曲分阵营：汉军赢了放新写的「礼乐」，楚军输了放新写的「乌江」（其余照旧）',
      '技能模式：兵的「拒马」二级就能用，架一次管两回合（对方来犯的子先挨 1 点）',
      '技能模式：相 / 象二级起攻击 2（二级 2 攻 2 血）',
      '联机房间加了提示音：有人进房（铜锣 / 战鼓 / 掀帘入帐，随机一条）、有人点「准备」（擂鼓 / 古琴 / 梆子，随机一条）',
      '兵营的卫兵、弓手、鼓手合成一批画，每帧少画六十多次，样子不变',
      '俯瞰、定盘（正上方看）时，吃子、放技能不再拉特写镜头、镜头不跟着跑，震屏也减到两成，画面稳了',
      '修好一个严重问题：电脑上点过页面以后，拖动浏览器窗口会卡死，连别的软件一起卡。原因是为苹果手机准备的一段“静音循环”用了 0 秒的空文件，在电脑上每秒从头重放上万次；现在改成 1 秒真静音，而且只在苹果设备上放',
      '技能模式升级先弹确认框：写明升了以后血量、攻击怎么变，解锁什么技能、花多少军功、升完还剩多少，点「升级」才升；召回良将后的升级也一样',
      '「视」按钮改成三档（对电脑、联机、观战）：沙盘（斜着看，能转能拖能缩放）→ 俯瞰（从正上方看，能拖能缩放）→ 定盘（从正上方看，锁住不动），换的时候在「谁走棋」下面亮一下名字；记住上次选的档。本地双人暂时照旧（按「视」换边）',
      '落子确认的提示改短成「再次点击确认落子」，挪到「谁走棋」下面，不挡棋盘；技能模式里那句改成「再次点击或点「确定」落子」',
      '打开快了很多：配音和声效改成进了大厅以后在后台下载，网页本身从 8 MB 减到 2.5 MB，手机上的加载页短多了，加载页也换成了真实的进度条。走子时不再一顿一顿（地上的血迹、蹄印烙进地面原来要等显卡，现在在内存里算）；待在大厅时不再空转动画，手机更省电。对局里一直卡会自动降一档画质；浏览器没开硬件加速（没用显卡）会提示怎么打开。电脑上进了大厅、建房间时整个浏览器卡住几秒的问题修好了（主帅头像改成事先画好的图，不再在你电脑上现画；显卡准备画面的活儿挪到加载页里、放到后台做），切换画质、技能模式开局时也不再顿一下。拖动窗口、把标签拖成独立窗口时，画面等窗口停稳了才重新分配（原来一秒重分配几十次，会拖得整台电脑卡住）；大屏全屏时画布像素封顶；待在大厅时三维画布藏起来不参与合成',
      '落子要点两下：点了落点，那里先出一个这枚棋子的半透明虚影（兵种模型模式下是整队兵马的虚影），一明一暗地呼吸，底下四个朱红折角框住落点，再点一次同一个落点才走；点到走不了的地方闪一下红色虚影，选中的子不丢。防误触，设置 → 对局与其他里可以关。电脑上选着子时，鼠标移到能走的点也会亮折角',
      '轮到谁走，自家半场的格线跟着闪：默认「涌动」（一道淡淡的亮光从底线推到河边），也可以选「河岸」（只闪靠河那条线）或关掉（设置 → 对局与其他）。最后十秒和头像牌的朱框一个节拍',
      '技能模式：升级时兵种会喊一句——二、三级按新称号说（「当上伍长了，五个弟兄跟我走！」），升到四级的名将各有自己的声音和台词（韩信「臣多多而益善耳！」、项庄「军中无以为乐，请以剑舞！」……），出自《史记》。四级名将走子、攻击、吃子、用技能时也各有自己的台词（樊哙的还在录），三级的兵用技能时也会喊一声',
      '电脑更不容易送一步杀：选好一步之后会再查对方能不能一步将死自己（包括先升级再走），能就换一步',
      '兵种开口说台词时不再原地站着等，先慢慢走起来。马每一步都说话。炮弹在空中的呼啸换成了真实录音，四种随机出',
      '界面细节：技能栏按钮的朱线不再互相撞，设置页签换成墨底；工具栏「譜 視 設」改成简体；苹果手机微信里调大字号不再把界面撑乱',
      '轮到谁走，谁的头像牌外面多一圈朱红粗线；最后十秒粗线跟着读秒一亮一暗，越来越快。兵卒和炮过河不再走到岸边等船、上船下船，直接乘船过去，和平地一样快',
      '对局里的界面和其余弹窗也换成了新样子（头像牌、技能按钮、棋谱、喊话、玩法说明、暂停、终局卡片……），和大厅是一套',
      '将帅话多了：帅和将每次走、每次吃子都会说一句，各添了新词。还藏了些彩蛋——连着两次想走“将帅照面”的棋、开局第一步就动帅、帅亲手吃车、连着三回合都在走帅、连点自己的帅五下……各有各的说法；技能模式里四级名将阵亡，主帅会哀叹一声',
      '大厅、设置、询问弹窗换了新样子：朱红底的棋盘格、圆棋子按钮；手机竖屏主按钮固定在屏幕底部。「退出对局」改叫「返回大厅」，点了只问一句「退出本局？」，「继续对局」是大按钮，防误点。游戏现在叫「技能新象棋」',
      '汉相换了新模样：一位朱袍文臣手持汉节，骑着白虎。吃子是虎扑上去咬，文臣端坐、节杖不动。技能模式里四级白虎披金甲；三、四级平时身边没有别人，行进和攻击时两侧才出弩手——攻击时弩手先放一轮箭，虎再扑出去。称号也换了：汉军相、驭虎长史、持节护军、白虎相国。新台词「白虎开道」「放虎！」在写实版配音里',
      '技能模式的数值改了一轮，两边更均势、车不再一家独大：车、马、炮、兵卒升到三级攻击变成 2（一下能吃掉 2 血的子）；车四级不再加血（3 血）；车升级变贵，10 / 12 / 20 功（原来 6 / 8 / 20）。刘邦的「召回良将」也改了：按兵种选，回来最多二级（死时一级的还是一级），可以放回这一兵种任意一个空着的原位（车放左角右角都行）；落位后可以马上花军功给它升一级，它第一次升级只要半价。改规则之前开的局接着下，还按原来的规则',
      '马、战象、步兵、炮的音效换成了真实录音：马蹄踏在土上、真马嘶、真象鸣、一队人行军的脚步、巨炮。兵种开口说话时，先台词、再脚步、最后一声嘶鸣；技能模式里等级越高，马蹄和脚步叠得越厚，一级炮用小一号的炮声',
      '配音多了一套「写实版」：项羽、刘邦、旁白、两军士兵全部重新配过，有语气、有情绪，楚军汉军嗓音不同。新装默认用写实版；想听原来那套，在 设置 → 声音 → 配音 里选「原版」',
      '放技能更清楚了：能放的落点带金色四角框；选定目标后，一个瞄准圈把它框住，下方出现「确定」，点了才发动（再点一次目标也行）。背水一战走完第一步，落点会留下虚影、头顶悬一个「一」，并留下这一步的路径。刚被召回的子，那一回合身边绕着金光',
      '技能模式的主帅兵法改了，只给落了下风的一方用——己方车马炮最多还剩 3 枚、而且比对方少时才能用。项羽的「破釜沉舟」换成「背水一战」：连走两步（一枚子走两步，或两枚子各走一步），合计最多吃一个子；只看两步走完——楚将不被将军、也不将着汉帅就行；发动后不能取消，用过的子下一回合不能动，不再封技能。刘邦的「召回良将」也要落了下风才能用。改规则之前开的局接着下，还按原来的规则',
      '背水一战发动期间，屏幕四周泛起墨色晕染；两步走完不合规矩，四周变红、写明原因并标出是哪枚子的问题，点一下屏幕棋子归位重走',
      '背景音乐的「战意」换成了一首录制的古风战斗曲（战鼓、琵琶），场边的擂鼓兵跟着曲子里的鼓点敲；「禅意」不变。在设置里选「战意」就能听到',
      '绝杀多了一笔：被将死的将帅头顶先凌空画一把朱红的叉，叉落下来——棋子模式留在棋子面上，模型模式落在棋盘上——停一停让人看清局面，再出绝杀大字',
      '场边的战鼓挪到了营帐旁（原来和卫兵穿在一起），每面鼓配了一名擂鼓兵：鼓声一响就跟着一槌一槌地敲',
      '技能模式的电脑换了一版：懂得「升了级、砍不死的子贴到主帅身边」是最要命的杀法——进攻会往上贴，防守会提前把士升二级；被将军时会把连杀一路算到底；军功不再浪费在救兵上；汉方会提防对面的破釜沉舟。代价是想得久一点：校尉平均一步多半秒左右，霸王基本不变',
      '送将提示：走了会让自己被将军（或将帅照面）的着法，现在也标出来——方向和落点标红，目标是棋子时头顶悬一个禁止符号；点上去会告诉你「不能送将」。连点三次，自家主帅要说话了',
      '自建房间里加了人机之后，可以再点「观看人机对战」把自己的座位也交给电脑：电脑对电脑，你和进房的人一起看（象棋、技能模式都行）',
      '观战可以四处走动了：点地面或棋盘就走过去；过楚河要走桥，上棋盘要走棋盘两侧的小楼梯。站在棋盘上的观众，棋手点一下就能弹飞，被弹飞后 30 秒内不能再上棋盘',
      '新增「导出本局」（设置里、棋谱栏右上角）：把整局导成一段文本并复制，可以贴给别人复盘，或贴给 Claude 指出哪一步走错了',
      '技能模式的电脑会用兵法了：召回良将留着救车（车还在、对方破釜沉舟没用时，不会为一个炮马就用掉）；破釜沉舟留着杀车这样的大子，对方召回还在手里时不急着用；鸿门宴等进攻子压到汉帅跟前才发；汉军会提防对方连走两步',
      '技能模式的电脑不再开局就给士、相 / 象升级：军功先紧着车（其次炮、马），车快攒够时别的先不升；守子只在保命时才升',
      '技能模式的电脑按血量算账：多一点血的子更值钱，打中没吃掉也算赚；被捉又走不开的子会升级保命；也会算到你“先升级再走”',
      '技能模式的电脑重写：每一步都把所有应对算全（不再只挑几步看），并把“这一步之后谁的子会被白吃”算清楚；有了出子、过河、压向对方主帅的位置感。新兵看一步、校尉看三步、霸王在几秒内能看多深看多深（一般四到六步），放在后台线程里算',
      '技能模式可以人机对战了：人机对战里把「玩法」选成「技能模式」即可。电脑会升级、用兵种技能、架拒马、召回良将 / 破釜沉舟、发终极兵法，也会打决战；三档难度同象棋',
      '房间：客方点「准备」、房主点「开始」才开局；客方可改为观战；房主可添加人机，其他人观战',
      '技能模式：带伤害的技能先预览结果（「殺」/「-1」），再点一次目标才发动',
      '调试摆子新增两个开关：「无冷却」（技能用完不进冷却）、「自由移动」（不分回合，点哪边的子就走哪边）',
      '调试摆子：不再每点一下整盘闪；可先选「摆放等级」，摆下去就是那一级；再点一次同一个子或点「停止摆放」即可退出摆放',
      '刘邦、项羽换新模型：刘邦红袍冕服、项羽乌金重甲黑披风持霸王戟，脸看得清',
      '践踏：四级楚象攻击或吃掉敌子后就地高举前脚跺下，那一格周围一圈八格的敌子各扣 1 点，残血的直接踩死；没打死目标的，结算完四周才退回。走到空格不触发',
      '飞越、踏营有了一气呵成的腾空跃过动画；士的巨盾不再闪烁',
      '技能模式新规则「决战」：双方的车马兵炮都死光后，象、士、帅将都可以过河进攻；帅将按过河兵走（前、左、右各一格），各有 3 点生命，没有将军（可以对脸、可以送将），打到 0 血告负；铁甲禁卫出九宫也能用',
      '决战·夺营：帅将走进对方九宫后，对方再走三步还没把它打死（它自己也没走出去），就算夺营获胜；顶上会显示进度',
      '决战里主帅被斩的结算卡另写：项羽「决战阵前、力战而殁」，刘邦「决战阵前、为楚所斩」，不再是乌江自刎 / 彭城之败',
      '决战开场：「决战」大字 → 战鼓一阵紧过一阵（全用录音）→ 两边营里一直挥舞兵器助威；刘邦拔剑摆出战斗架势；主帅被斩后直接出结果，不再演常规结算',
      '模型模式：队伍停下后原地转回默认朝向，不再先缩小再长出来；帅旗加大加高',
      '完整镜头 / 精简特效下，技能打死的子（践踏、霹雳、冲阵、飞越、踏营、拒马反伤）一律换成兵种模型来演：倒地、流血、断肢；棋子显示也一样。只有低特效才是棋子碎掉',
      '棋盘四角的铜包角不再闪烁',
      '霹雳：三轮急速齐射、每轮三发，爆炸更猛；炸死的子炸碎炸飞',
      '设置分成 画面 / 声音 / 对局与其他 三页；新增语音音量、碎片留存（不留 / 三回合 / 五回合 / 永久）',
      '断肢落地留血迹；模型模式脚下的圈不再被战损痕迹盖住；手机上技能模式开局也会出规则速览',
    ]],
    ['第五版', '2026 年 10 月', [
      '「兵法模式」改名「技能模式」；联机大厅放到主菜单第一位；房间界面能看到双方座位和观战席，对手入座后倒数开局；房间可以设密码；设置里新增语音音量',
      '多人联机并成一个入口：进去就是联机大厅，能看到公开的房间直接加入（对局中的可观战），也可以建房或输入房间码；建房时可选公开 / 私密',
      '技能模式（原「兵法」）：杀敌攒的甲片够数会自动升级（不花军功）；升到四级的子成为楚汉名将（樊哙、张良、龙且、范增……）',
      '兵法：相 / 象可升四级；三级新技能「飞越」（无视塞象眼），原来的齐射、践踏挪到四级',
      '兵法：技能说明全部精简；开局有规则速览，右侧「法」按钮随时可看；打不死的目标标 -1，能一击杀死才标「殺」',
      '兵法：召回良将、破釜沉舟换成大招演出；用技能时不再把背景糊掉',
      '汉相改为谋士车驾（羽扇谋士乘华盖轺车、弩手随护）；士披重甲、持长刀巨盾；金甲兵种有金属光泽',
      '兵种模型模式：每队领头的背一面写着棋子字的旗，脚下有汉红楚黑的光圈；炮手站定不再踏步',
      '绝杀：浓墨一笔垫在字的正中，先墨后字；超时判负也出大字',
      '马走日改为一口气奔到位；退出对局直接回主菜单',
    ]],
    ['第四版', '2026 年 10 月', [
      '棋子：银、金顶面的高光收小，远看和白玉分得开；白玉压暗，玉面刻云纹',
      '兵法：兵种升级后改称号（汉军兵 → 汉伍长 → 汉什长 → 无当飞军…），晋升有题签',
      '兵法：四级兵的「神速营」改为被动，直接走；士「铁甲禁卫」可在九宫内上下左右走；马「踏营」只能在敌方半场用',
      '兵法：鸿门宴持续 3 回合，汉士护驾可破（樊哙闯帐）；四面楚歌期间楚军只有将能走，其余只能吃掉将军的子，且不算将军',
      '兵法：鸿门宴、四面楚歌有全屏特效——四周变模糊，被困的子脚下缠锁链',
      '可走的位置改成会呼吸的淡绿墨点，并有一道流动的墨带指过去',
      '绝杀：满屏朱砂手书，下出马后炮、卧槽马这类杀法会直接写出名字',
      '计时：显示每步倒计时；最后 10 秒屏幕中央出大字、四周泛红，本方观战兵坐立不安',
      '营帐旁的火炬轮到哪一方才点亮；连杀三子，观战兵会冲上棋盘嘲讽',
      '战场：击杀腾起血雾，血迹、焦土、裂痕的大小形状都随机，同一处反复厮杀会越打越黑',
      '马、车、象行进扬尘；帅将出行有随从擎旗；士改持带刺巨盾，四级士换金甲；炮击带一点辉光',
      '操作：鼠标中键拖动（手机双指拖动）可平移画面，「視」闪烁时点一下归位',
      '新增「停」暂停键（联机每人 3 次、每次最多 2 分钟）；认输、退出、画面档位收进「設」',
      '开场白新增两套并可跳过；棋谱默认收起；常规对局可选棋子款式；可改用兵种模型代替棋子',
    ]],
    ['第三版', '', ['断线后回到对局、对局结束后复盘', '升级棋子材质重做（乌银、錾金、白玉）']],
    ['第二版', '', ['兵法模式：军功、升级、兵种技能、鸿门宴与四面楚歌', '揭棋模式、人机对战、观战席']],
    ['第一版', '', ['三维水墨棋盘、兵种战斗演出、联机对战']],
  ];
  const REASON = { checkmate: '将死', stalemate: '困毙', kingdead: '主帅阵亡', occupy: '夺营', resign: '认输', timeout: '超时', draw: '四十回合无吃子' };
  const LV = { easy: '新兵', mid: '校尉', hard: '霸王' };
  const VIS = ['cine', 'std', 'low'], VISNAME = { cine: '完整电影镜头', std: '精简特效', low: '低特效' }, VISBADGE = { cine: '影', std: '简', low: '低' };

  // ---------- 本地存储与设置 ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('xq3d-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('xq3d-' + k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem('xq3d-' + k); } catch (e) { } },
  };
  const S = {
    music: store.get('music', 'zen'), vMusic: store.get('vMusic', 55), vSfx: store.get('vSfx', 90), vVoice: store.get('vVoice', 100), voice: store.get('voice', 2),
    models: store.get('models', 0), debris: store.get('debris', 3), confirm: store.get('confirm', 1), turnfx: store.get('turnfx', 'wave'),   // confirm：落子要点两下（Ham 10-09 要的，防误触；默认开）
    vis: store.get('vis', store.get('fx', 1) === 0 ? 'low' : 'cine'), gore: store.get('gore', 3), server: store.get('server', ''),
    speed: store.get('speed', 1.5), // 动画播放速度
  };
  // 配音：2 = 写实版（新的默认），1 = 原版，0 = 关。老玩家存的是 1（开），头一回替他换到写实版，之后随他自己选
  if (!store.get('vreal', 0)) { if (+S.voice === 1) S.voice = 2; store.set('vreal', 1); store.set('voice', S.voice); }
  if (![1, 1.5, 2, 3].includes(+S.speed)) S.speed = 1.5;
  if (!VIS.includes(S.vis)) S.vis = 'cine';
  let ropts = Object.assign({ side: 'r', undo: 3, total: 15, step: 60, hints: 1, jq: 0, pub: 1 }, store.get('ropts', {}));
  if (!ropts.v) ropts.v = ropts.jq ? 'jq' : 'std';
  let aopts = Object.assign({ level: 'mid', side: 'r', undo: 3, total: 0, step: 0, hints: 1 }, store.get('aopts', {}));

  function applySettings() {
    Fx.level = S.vis; Fx.gore = +S.gore; Voice.enabled = !!+S.voice; Voice.mode = +S.voice === 2 ? 'real' : 'orig';
    Squads.Stand.set(!!+S.models); Fx.keep = +S.debris || 0;
    Core.Time.boost = +S.speed || 1.5;
    Sfx.setVol('music', S.vMusic / 100 * 0.9); Sfx.setVol('sfx', S.vSfx / 100); Sfx.setVol('voice', S.vVoice / 100);
    Net.custom = S.server || '';
    for (const k of ['music', 'vMusic', 'vSfx', 'vVoice', 'voice', 'vis', 'gore', 'server', 'speed', 'models', 'debris', 'confirm', 'turnfx']) store.set(k, S[k]);
  }
  Net.custom = S.server || '';
  Core.Time.boost = +S.speed || 1.5;
  function bindSeg(root, attr, get, set) {
    root.querySelectorAll(`.seg[${attr}]`).forEach(seg => {
      const k = seg.getAttribute(attr);
      const paint = () => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(get(k)) === b.dataset.v));
      seg.querySelectorAll('button').forEach(b => b.onclick = () => { set(k, b.dataset.v); paint(); Sfx.select && Sfx.select(); });
      seg._paint = paint;
      paint();
    });
  }
  const repaintSegs = root => root.querySelectorAll('.seg').forEach(s => s._paint && s._paint());

  // ---------- 场景 ----------
  let game = new XQ.Game();
  Board.setPosition(game);
  Core.Cam.setSide('r');
  Board.faceViewer('r');
  Camp.init();
  let lobbyIsUp; const lobbyUp = new Promise(r => { lobbyIsUp = r; });   // 加载页撤掉、大厅能点了
  // 着色器先在后台编译（compileAsync：浏览器另开线程编，主线程不等），编好再画头几帧。
  // 原来第一帧就同步编译，慢手机上要卡好几秒，正好压在刚打开页面的时候
  // 头几帧（编着色器、画影子图）都在加载页底下做完，再撤加载页（10-09 Ham：电脑上打开就卡住——原来是大厅出来以后才编着色器，
  //   Windows 上编一批着色器能卡好几秒，正好卡在大厅里点东西的时候）。最多等 6 秒
  let warmed; const warmUp = new Promise(r => { warmed = r; });
  // 排查开关（10-09 Ham 电脑上把标签拖成独立窗口就整台电脑卡）：
  //   nogl 完全不画三维（画布也不显示）；nopaper 去掉整屏的纸纹叠加（mix-blend）；nobd 去掉所有背景模糊、滤镜、混合
  const DG = Core.DIAG;
  if (DG.has('nopaper')) { const pp = $('paper'); if (pp) pp.remove(); }
  if (DG.has('nobd')) document.head.insertAdjacentHTML('beforeend', '<style>*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;mix-blend-mode:normal!important}</style>');
  if (DG.has('nogl')) { Core.render = false; Core.renderer.domElement.style.display = 'none'; Core.onFrame(() => { Core.render = false; Core.sleepy = true; }); }
  { const canDraw = Core.render && !DG.has('nogl'); if (canDraw) {
    let ready = false, warm = 3; Core.render = false;
    const done = () => { ready = true; };
    // 兵种模型合成网格（蒙皮）的着色器一起先编：放一匹马在地底下陪着编，编完拿走（不然第一次出兵种模型时要当场编，卡一下）
    let warmHorse = null; try { if (Models.FUSE) { warmHorse = Models.makeHorse(); warmHorse.group.position.set(0, -40, 0); Core.scene.add(warmHorse.group); } } catch (e) { warmHorse = null; }
    Core.compileBg(Core.scene, Core.camera, 900).then(() => { if (warmHorse) Core.disposeTree(warmHorse.group); setTimeout(done, 50); });
    setTimeout(done, 8000);   // 万一一直不回话，也别一直不画
    // 不画的时候（大厅整屏盖着）把三维画布藏起来：浏览器就不用再拿它去合成画面。
    //   10-09 Ham（RTX 5060 Ti + Chrome）：把标签拖成独立窗口后窗口发白、不刷新，Alt+Tab 切一下才看到变化，连别的软件都卡
    const cv = Core.renderer.domElement; let cvOn = true;
    Core.onFrame(() => {
      if (!ready) { Core.render = false; return; }
      if (warm > 0) { warm--; if (!warm) warmed(); }
      Core.render = warm > 0 || $('lobby').classList.contains('hidden'); Core.sleepy = !Core.render;
      if (cvOn !== Core.render) { cvOn = Core.render; cv.style.visibility = cvOn ? '' : 'hidden'; }
    });   // 页面刚开时大厅也带着 hidden（等开场动画），不能拿它判断
  } else warmed(); }
  Core.start();
  let lobbySpin = true;
  Core.onFrame(dt => { if (lobbySpin && !Core.Cam.cine) Core.Cam.theta += dt * 0.04; });
  // 界面音效（Ham 10-09）：电脑上鼠标移到大厅那三个圆形图标（联机大厅、人机对战、本地对战）上轻响一下（只认鼠标，手机触屏不响），点它们再响一下。
  //   别的按钮、选项都不响（Ham 10-10：不然吵死了）。以后要给别的按钮加，给它加 data-sfx
  {
    const UI_SEL = '#pMain .menu .btn, [data-sfx]';
    const pick = e => { const el = e.target && e.target.closest ? e.target.closest(UI_SEL) : null; return el && !el.disabled && !el.closest('[data-nosfx]') ? el : null; };
    let hov = null;
    document.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const el = pick(e); if (el === hov) return;
      hov = el; if (el) Sfx.ui('hover');
    }, true);
    document.addEventListener('pointerout', e => { if (hov && !(e.relatedTarget && hov.contains(e.relatedTarget))) hov = null; }, true);
    document.addEventListener('click', e => { if (pick(e)) Sfx.ui('click'); }, true);
  }
  // 大厅现在是整屏不透明的（美术 M3），后面的三维场景看不见：大厅开着时不画，省电、省发热。开头先画几帧，把着色器编译掉、影子图画好，免得开局第一帧卡
  // （原来画 90 帧，慢手机上要占好几秒、正好压在刚打开页面的时候；编译着色器第一帧就做完了，画 3 帧够了）
  // 加载页进度：脚本都跑完、场景搭好是 95%，撤掉之前推到 100%
  { const L = $('loading'); L.classList.add('real'); L.style.setProperty('--p', 0.95); }
  Promise.race([warmUp, new Promise(r => setTimeout(r, 6000))]).then(() => {
    $('loading').style.setProperty('--p', 1); setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => { $('loading').remove(); lobbyIsUp(); }, 900); }, 350);
  });
  // 配音包（几 MB）不等第一次点屏幕：大厅出来一会儿就在后台开始取，进对局时多半已经到了
  setTimeout(() => { Voice.enabled = !!+S.voice; Voice.mode = +S.voice === 2 ? 'real' : 'orig'; }, 1500);
  // 首次触碰时解锁音频（iOS 必需）
  const unlock = () => { Sfx.init(); applySettings(); setTimeout(() => Voice.preload(['r_start', 'b_start', 'r_check', 'b_check', 'r_mate', 'b_mate']), 300); setTimeout(() => Voice.preload(Object.keys(Voice.LINES).filter(k => /_t\d|^ai_/.test(k))), 2500); setTimeout(() => Voice.preload(Object.keys(Voice.LINES).filter(k => /^u_/.test(k))), 4500); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // ---------- 主帅画像（用三维模型离屏渲染） ----------
  const faces = Object.assign({}, window.FACES || {});   // 主帅头像：事先画好的图（tools/faces.py 生成，build.js 内嵌），打开页面时不再现画
  // 从显卡读回像素，不让主线程干等：WebGL2 先读进显卡这边的缓冲、插个「栅栏」，显卡画完了再取（取的时候不用等）；
  //   老浏览器（WebGL1）还是直接读，会等一下
  function readLater(R, rt, W, px) {
    const gl = R.getContext();
    if (!(window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext) || !gl.fenceSync) { R.readRenderTargetPixels(rt, 0, 0, W, W, px); return null; }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf); gl.bufferData(gl.PIXEL_PACK_BUFFER, px.byteLength, gl.STREAM_READ);
    R.state.bindFramebuffer(gl.FRAMEBUFFER, R.properties.get(rt).__webglFramebuffer);   // 多重采样已经在 render 结束时合成到这张图上
    gl.readPixels(0, 0, W, W, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
    return new Promise(res => {
      const t0 = performance.now();
      const tick = () => {
        const st = gl.clientWaitSync(sync, 0, 0);
        if (st === gl.TIMEOUT_EXPIRED && performance.now() - t0 < 3000) { setTimeout(tick, 30); return; }   // 3 秒还没好（软件渲染、对局里一直在画）就直接取，取的时候会等一下
        gl.deleteSync(sync);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.deleteBuffer(buf); res();
      };
      setTimeout(tick, 30);
    });
  }
  async function portrait(kind) {
    const W = 256;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfff4e0, 0x6a5a48, 1.4));
    const dl = new THREE.DirectionalLight(0xfff2dc, 2.4); dl.position.set(1.6, 2.6, 3.2); sc.add(dl);
    const h = kind === 'xiang' ? Models.makeXiangYu() : Models.makeLiuBang();
    h.setPose(kind === 'xiang' ? Models.POSES.xStand : Models.POSES.lStand);
    for (let i = 0; i < 3; i++) h.update(0.016);
    sc.add(h.group);
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    const hy = kind === 'xiang' ? 1.97 : 1.9;
    cam.position.set(0.32, hy + 0.04, 1.5); cam.lookAt(0, hy - 0.05, 0);
    let rt;
    try { rt = new THREE.WebGLRenderTarget(W, W, { samples: 4 }); } catch (e) { rt = new THREE.WebGLRenderTarget(W, W); }
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const R = Core.renderer, prev = R.getRenderTarget(), cc = R.getClearColor(new THREE.Color()), ca = R.getClearAlpha();
    const px = new Uint8Array(W * W * 4);
    // 主帅模型的着色器先在后台编好（compileAsync），再画；不然第一次画要同步编译，电脑上能卡住好几秒
    await Core.compileBg(sc, cam);
    let wait = null;
    try {
      R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(); R.render(sc, cam);
      wait = readLater(R, rt, W, px);
    } finally { R.setRenderTarget(prev); R.setClearColor(cc, ca); }
    Core.disposeTree(h.group);
    try { await wait; } finally { rt.dispose(); }
    const c = document.createElement('canvas'); c.width = c.height = W;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(W * 0.5, W * 0.42, 10, W * 0.5, W * 0.5, W * 0.72);
    bg.addColorStop(0, '#f6ecd4'); bg.addColorStop(1, kind === 'xiang' ? '#b9a88a' : '#d9b99a');
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    g.globalAlpha = 0.22; g.fillStyle = kind === 'xiang' ? '#1b1a19' : '#8e2418';
    Core.inkBlot(g, W * 0.62, W * 0.58, W * 0.42, 0.7, 0.5); g.globalAlpha = 1;
    const t = document.createElement('canvas'); t.width = t.height = W;
    const img = t.getContext('2d').createImageData(W, W);
    for (let y = 0; y < W; y++) img.data.set(px.subarray((W - 1 - y) * W * 4, (W - y) * W * 4), y * W * 4);
    t.getContext('2d').putImageData(img, 0, 0);
    g.drawImage(t, 0, 0);
    return c.toDataURL('image/png');
  }
  // 头像原来在玩家电脑上现画：要给主帅模型另编一批着色器、再从显卡读回像素。有的 Windows 电脑上这一下会让整个浏览器卡住几秒
  //   （10-09 Ham：进大厅后、建房间时整个浏览器不动）。现在改成事先画好：只有带 ?makefaces 打开时才画，给 tools/faces.py 取图用
  function makeFaces() {
    (async () => {
      try { window.__faces = { r: await portrait('liu'), b: await portrait('xiang') }; } catch (e) { window.__faces = { err: String(e) }; }
    })();
  }
  if (/[?&]makefaces\b/.test(location.search)) lobbyUp.then(() => setTimeout(makeFaces, 500));
  else try { localStorage.removeItem('xq3d-faces'); } catch (e) { }   // 以前存在本机的现画头像，不用了

  // ---------- 卡顿对策 ----------
  // 1) 浏览器没用显卡（硬件加速关了）：画质开头已经降到低（core.js），这里再告诉玩家怎么打开
  lobbyUp.then(() => { if (Core.softGL && !Core.userQ) setTimeout(() => toast('这台设备的浏览器没有用显卡画图（硬件加速可能关了），所以会卡，已先用低画质。<br>在浏览器设置里打开「硬件加速 / 使用图形加速」，重启浏览器，会流畅很多。', 9000), 1200); });
  // 2) 对局里一直卡：每 5 秒看一次，连着两次平均不到 25 帧就降一档画质（只这次打开有效，设置里存的不动；自己在设置里改过就不再自动降）
  let autoQ = !Core.softGL, slowN = 0;
  setInterval(() => {
    const [n, avg] = Core.takeFrames();
    if (!autoQ || document.hidden || !$('lobby').classList.contains('hidden') || n < 5) { slowN = 0; return; }
    slowN = avg > 40 ? slowN + 1 : 0;
    if (slowN >= 2 && Core.quality !== 'low') {
      const q = Core.quality === 'high' ? 'mid' : 'low'; Core.setQuality(q, false); slowN = 0;
      toast(`画面有点卡，已自动把画质降到「${q === 'mid' ? '中' : '低'}」（设置里可以改回来）`, 4000);
    }
  }, 5000);
  // 3) 网址后面加 ?perf：左上角显示帧率、每帧绘制次数、显卡名字（查卡顿用，玩家看不到）
  if (/[?&]perf\b/.test(location.search)) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;background:rgba(0,0,0,.75);color:#9f9;font:12px/1.45 monospace;padding:6px 9px;border-radius:6px;pointer-events:none;white-space:pre';
    document.body.appendChild(d);
    let n = 0, t0 = performance.now(), lt = t0, worst = 0;
    const tick = () => {
      const t = performance.now(); worst = Math.max(worst, t - lt); lt = t; n++;
      if (t - t0 >= 1000) {
        const R = Core.renderer, i = R.info.render, c = R.domElement;
        d.textContent = `${Math.round(n * 1000 / (t - t0))} 帧/秒  最慢一帧 ${worst.toFixed(0)} ms\n画质 ${Core.quality}  像素比 ${R.getPixelRatio()}  画布 ${c.width}×${c.height}\n每帧 ${i.calls} 次绘制  ${(i.triangles / 1000).toFixed(0)}K 三角形  影子 ${Core.sun.castShadow ? '开' : '关'}\n${Core.gpu || '显卡未知'}${Core.softGL ? '  ← 软件渲染，没用显卡！' : ''}\n后台编着色器：${Core.parallelGL ? '支持' : '不支持（换场景时可能整个浏览器顿一下）'}${[...Core.DIAG.keys()].filter(k => k !== 'perf').length ? '\n排查开关：' + [...Core.DIAG.keys()].filter(k => k !== 'perf').join(' ') : ''}\n${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90)}`;
        n = 0; t0 = t; worst = 0;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- 提示 ----------
  let toastT = null;
  function toast(msg, ms = 2200) { const t = $('toast'); t.innerHTML = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
  function banner(t, s, ms = 2600) { $('banner').classList.remove('lite'); $('bannerT').textContent = t; $('bannerS').textContent = s || ''; $('banner').classList.add('on'); setTimeout(() => $('banner').classList.remove('on'), ms); }
  let askTimer = null;
  function ask(title, text, secs = 0, yes = '同 意', no = '拒 绝', cls = '', cdFmt = null) {   // cls = 'e-stay'：退出确认，“留下”是大按钮（样式归美术）；'e-grace'：贴在底下、不压暗棋盘
    return new Promise(res => {
      $('askT').textContent = title; $('askP').textContent = text; $('askYes').textContent = yes; $('askNo').textContent = no;
      $('mAsk').classList.toggle('e-stay', cls === 'e-stay'); $('mAsk').classList.toggle('e-grace', cls === 'e-grace');
      $('mAsk').classList.remove('hidden');
      let left = secs;
      const fin = v => { clearInterval(askTimer); $('mAsk').classList.add('hidden'); $('mAsk').classList.remove('e-stay', 'e-grace'); res(v); };
      $('askYes').onclick = () => fin(true); $('askNo').onclick = () => fin(false);
      clearInterval(askTimer);
      const cdt = n => cdFmt ? cdFmt(n) : `${n} 秒后自动拒绝`; $('askCd').textContent = secs ? cdt(left) : '';
      if (secs) askTimer = setInterval(() => { left--; $('askCd').textContent = cdt(Math.max(0, left)); if (left <= 0) fin(false); }, 1000);
    });
  }
  // 带输入框的询问（房间密码）：确定返回输入的字，取消返回 null
  function askText(title, text, ph = '') {
    const row = $('askInRow'), inp = $('askIn');
    row.classList.remove('hidden'); inp.value = ''; inp.placeholder = ph; setTimeout(() => inp.focus(), 60);
    inp.onkeydown = e => { if (e.key === 'Enter') $('askYes').click(); };
    return ask(title, text, 0, '确 定', '取 消').then(ok => { row.classList.add('hidden'); return ok ? inp.value.trim() : null; });
  }
  const pwHash = (code, pw) => { let h = 2166136261; for (const ch of code + ':' + pw) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const closeAsk = () => { clearInterval(askTimer); $('mAsk').classList.add('hidden'); $('mAsk').classList.remove('e-stay', 'e-grace'); $('askInRow').classList.add('hidden'); };

  // ---------- 对局状态 ----------
  let mode = null, mySide = 'r', viewSide = 'r', opts = { ...ropts }, hostSide = 'r';
  let sel = null, selMoves = [], anim = Promise.resolve(), busy = 0, ended = false, started = false;
  let undoUsed = { r: 0, b: 0 }, pendingUndo = null;
  let notes = [];
  const clock = { r: 0, b: 0, step: 0, last: 0, oppStamp: 0, oppTotal: 0, oppStep: 0 };
  const stepMax = () => opts.step * 1000, totalMax = () => opts.total * 60000;
  const actor = () => (mode === 'local' ? game.turn : mySide);
  const online = () => mode === 'host' || mode === 'guest';
  // 对面是电脑：人机对战，或者联机房间里房主加了人机（客人观战）
  const vsAI = () => mode === 'ai' || (mode === 'host' && !!(opts && opts.ai));
  const aiSide = () => (vsAI() ? other(mySide) : null);
  // 房主把自己的座位也交给电脑：电脑对电脑，房主和进房的人一起看
  const aiBoth = () => mode === 'host' && !!(opts && opts.ai && opts.ai2);
  // 房主坐到观战席、把自己的座位交给电脑，对面是真人（美术 M15 第一期）：联机照常，只是房主这一方由房主这台机器上的电脑走
  const hostBot = () => mode === 'host' && !!(opts && opts.ai2) && !(opts && opts.ai);
  const isAI = s => (vsAI() && (s !== mySide || aiBoth())) || (hostBot() && s === mySide);
  const aiLevel = s => ((aiBoth() && s === mySide) || hostBot() ? opts.ai2 : opts.level);
  const watching = () => mode === 'watch';
  let watchWaiting = false;
  // 揭棋：同屏对战时本地随机布子；联机/观战时暗子身份未知，靠双方密钥逐个揭开（见 jq.js）
  // layout：续局时沿用原来的随机布局（本地揭棋）
  const mkGame = (o, layout) => (o && +o.bf ? new BF.Game() : o && +o.jq ? new XQ.Game({ jq: true, layout: layout || (mode === 'local' ? XQ.randomLayout() : null) }) : new XQ.Game());
  // 兵法：技能选择状态、升级记法、调试
  const BS_NEW = /[?&]beishui=0/.test(location.search) ? 0 : 1;
  // 规则 r6（见 bingfa.js 的 CFG.r6）：2026-10-05 起是正式规则，新开的技能模式对局默认用它（记在这一局的选项 opts.r6 里，联机双方、观众、接着下的局都看这个记号；没有记号的局照旧规则）。
  //   网址带 ?r6=0：这台设备新开的局回到旧规则，并且记住（刷新、回大厅、建房改了网址都还在）；带 ?r6=1 换回来
  { const q6 = /[?&]r6=([01])\b/.exec(location.search); if (q6) store.set('r6', +q6[1]); }
  const R6_NEW = +store.get('r6', 1) ? 1 : 0;
  const r6On = () => (BF.CFG.r6 && BF.CFG.r6.on ? BF.CFG.r6 : null);
  // 汉相「虎骑」预览（?tiger=1）：称号跟着模型一起换
  if (Models.TIGER && BF.TIGER_RANKS) BF.RANK_CN.r.e = BF.TIGER_RANKS.slice();
  let bfMode = null, bfUpNote = '', dbgOn = false, dbgPick = null, dbgSel = null, dbgLv = 1, dbgNoCd = false, dbgFree = false;
  let JK = null, JC = { cin: {}, cout: {}, used: { r: {}, b: {} } }, jqBad = 0, pendingJ = null, lastJx = null;
  const jqOn = () => game.jq && online();
  const jqReady = () => !jqOn() || !!(JK && JC.cin[other(mySide)] && JC.cout[mySide]);

  function resetClocks() { clock.r = clock.b = totalMax(); clock.step = stepMax(); clock.last = performance.now(); }
  function fmt(ms) { if (!opts.total) return '∞'; ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  // ---------- 中文记谱 ----------
  const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const FW_NUM = ['', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
  const PCH = { r: { k: '帥', a: '仕', e: '相', n: '馬', r: '車', c: '炮', p: '兵' }, b: { k: '將', a: '士', e: '象', n: '馬', r: '車', c: '砲', p: '卒' } };
  function notation(board, m) {
    const [ff, fr] = m.from, [tf, tr] = m.to;
    const p = board[fr] && board[fr][ff]; if (!p) return '';
    const s = p.s, red = s === 'r', t = XQ.et(p); // 揭棋暗子按所在位置的兵种记
    const num = f => (red ? CN_NUM[9 - f] : FW_NUM[f + 1]);
    const steps = n => (red ? CN_NUM[n] : FW_NUM[n]);
    let head = PCH[s][t] + num(ff);
    if ('rncp'.includes(t)) {
      const same = [];
      for (let r = 0; r < 10; r++) { const q = board[r][ff]; if (q && q.s === s && XQ.et(q) === t) same.push(r); }
      if (same.length >= 2) {
        same.sort((a, b) => (red ? b - a : a - b)); // 靠前者在前
        const i = same.indexOf(fr);
        const tag = same.length === 2 ? ['前', '後'][i] : same.length === 3 ? ['前', '中', '後'][i] : (red ? CN_NUM : FW_NUM)[i + 1];
        head = tag + PCH[s][t];
      }
    }
    if (tr === fr) return head + '平' + num(tf);
    const fwd = red ? tr > fr : tr < fr;
    return head + (fwd ? '進' : '退') + ('nae'.includes(t) || tf !== ff ? num(tf) : steps(Math.abs(tr - fr)));
  }
  // 揭棋：翻出的子记在着法后，如“炮二進七=馬”
  const noteOf = (board, m, rv) => { const p = board[m.from[1]][m.from[0]]; return notation(board, m) + (rv && p ? '=' + PCH[p.s][rv] : ''); };
  // 兵法记谱：升级记作“↑傌”，技能写技能名，攻击未下记“·攻”
  function bfNote(g, e) {
    const at = e.at || e.from, p = at ? g.at(at[0], at[1]) : null;
    if (e.k === 'up') return p ? '↑' + PCH[p.s][p.t] : '';
    if (e.k === 'mv') {
      const q = g.at(e.to[0], e.to[1]); let n = notation(g.board, e);
      // 被动走法（神速营 / 回防 / 铁甲禁卫）前面标出技能名
      const mv = p && p.lv >= 3 ? g.legalFrom(e.from[0], e.from[1]).find(m => m.to[0] === e.to[0] && m.to[1] === e.to[1]) : null;
      if (mv && mv.via) n = { shensu: '神速', huifang: '回防', jinwei: '禁衛', feiyue: '飛越', taying: '踏營' }[mv.via] + '·' + n;
      return q && p && q.hp > g.atkOf(p) ? n + '·攻' : n;
    }
    if (e.k === 'sk' && p) {
      const sk = BF.SKILL_OF(p.t, p.s), cn = BF.SKILL_CN[sk];
      if (e.to && sk !== 'qishe') return cn + '·' + notation(g.board, { from: e.at, to: e.to });
      if (sk === 'qishe') { const q = g.at(e.to[0], e.to[1]); return cn + '·' + (q ? PCH[q.s][q.t] : ''); }
      return cn + '·' + PCH[p.s][p.t];
    }
    if (e.k === 'art') { if (g.turn === 'r') { const d = g.dead.r.find(x => x.id === e.id); return '召回·' + (d ? PCH.r[d.t] : '') + (e.up ? '↑' : ''); } return BF.ART_CN.b; }
    if (e.k === 'ult') return g.turn === 'r' ? '四面楚歌' : '鴻門宴';
    if (e.k === 'sk' && !p) return '';
    if (e.k === 'pass') return '停著';
    return '';
  }
  function rebuildNotes() {
    if (game.bf) {
      const g = new BF.Game(); g.reset(game.base); notes = []; let up = '';
      for (const e of game.entries) { const n = bfNote(g, e); if (!g.apply(e)) break; if (!g.ends[g.ends.length - 1]) up = (up ? up + ' ' : '') + n; else { notes.push((up ? up + ' ' : '') + n); up = ''; } }
      bfUpNote = up;
      renderLog(); return;
    }
    const g = game.jq ? new XQ.Game(game.opts) : new XQ.Game(); notes = [];
    for (const h of game.history) { notes.push(noteOf(g.board, h, h.rv)); g.play({ from: h.from, to: h.to, rv: h.rv }); }
    renderLog();
  }
  function escH(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // 标了“这步笨”的那几步：ply → { ply, at, turn, side, move, note }。正在下的局先把悔掉的步上的标记去掉（棋谱对不上的）
  function flagMap() {
    const m = new Map();
    try {
      const G = RP ? RP.real : game; if (!G || !G.__flags) return m;
      if (!RP) G.__flags = G.__flags.filter(f => f.ply < notes.length && f.move === noteText(notes[f.ply]));
      for (const f of G.__flags) m.set(f.ply, f);
    } catch (e) { }
    return m;
  }
  const noteHtml = n => { if (!n) return ''; const [a, b] = n.split('='); return b ? `${a}<em class="rv">${b}</em>` : a; };
  function renderLog() {
    let html = '';
    const fl = flagMap();
    const sp = (i, cls) => notes[i] == null ? `<span class="${cls}"></span>` : `<span class="${cls}${fl.has(i) ? ' flag' : ''}" data-i="${i}"${fl.has(i) && fl.get(i).note ? ` title="${escH(fl.get(i).note)}"` : ''}>${noteHtml(notes[i])}</span>`;
    for (let i = 0; i < notes.length; i += 2) {
      const last = notes.length - 1;
      html += `<li><i>${i / 2 + 1}</i>${sp(i, 'r' + (i === last ? ' last' : ''))}${sp(i + 1, i + 1 === last ? 'last' : '')}</li>`;
    }
    const L = $('logList'); L.innerHTML = html || '<li style="display:block;text-align:center;color:#8a8580;font-size:calc(13px * var(--fs,1))">尚未落子</li>'; L.scrollTop = L.scrollHeight;
  }

  // 信号格（美术 M9 第 5 条 / Ham art-024）：对方的心跳（每 3 秒一次）晚了多久——晚一拍白、晚两拍黄、断开或 9 秒没音信红（会闪）；信号好就不显示
  //   观众没有对方心跳，只看自己的线路；原来的小圆点 #netDot 不再显示
  function paintSig() {
    const el = $('netSig'); if (!el) return;
    let lv = 0;
    if (online() || watching()) {
      if (!Net.lineOk) lv = 3;
      else if (online() && Net.peerState !== 'none') { const age = Net.peerAge; lv = Net.peerState === 'lost' || age >= 9000 ? 3 : age > 6500 ? 2 : age > 4500 ? 1 : 0; }
    }
    if (paintSig.lv === lv) return; paintSig.lv = lv;
    el.classList.remove('lv1', 'lv2', 'lv3'); if (lv) el.classList.add('lv' + lv);
    el.classList.toggle('hidden', !lv);
    el.setAttribute('aria-label', ['网络正常', '网络有点慢', '网络较差', '网络很差或已断开'][lv]);
    el.title = el.getAttribute('aria-label');
  }
  setInterval(() => { if (mode) paintSig(); }, 1000);
  // 字号固定（美术 M9 第 3 条 / Ham art-026）：苹果的微信、QQ 靠样式 text-size-adjust 钉住了；安卓 App 内网页按系统字号放大（setTextZoom）样式拦不住——
  //   量一下网页里的字比画布上同样的字大了多少（画布不受放大影响），把 --fs 设成它的倒数，所有 calc(Npx * var(--fs,1)) 的字就缩回原样
  function fixTextZoom() {
    try {
      const T = '汉楚汉楚汉楚汉楚汉楚', ff = getComputedStyle(document.body).fontFamily;
      const p = document.createElement('span'); p.textContent = T;
      p.style.cssText = `position:absolute;left:-9999px;top:0;white-space:nowrap;font:normal 400 100px/1 ${ff};letter-spacing:0;word-spacing:0;font-feature-settings:normal;visibility:hidden`;
      document.body.appendChild(p);
      const w = p.getBoundingClientRect().width, fs = parseFloat(getComputedStyle(p).fontSize) || 100; p.remove();
      const c = document.createElement('canvas').getContext('2d'); c.font = `normal 400 100px ${ff}`; const cw = c.measureText(T).width;
      let r = cw > 0 && w > 0 ? w / cw : fs / 100; if (!(r > 0.5 && r < 4)) r = fs / 100;
      document.documentElement.style.setProperty('--fs', r > 1.02 ? (1 / r).toFixed(4) : '1');
      fixTextZoom.r = r;
    } catch (e) { }
  }
  fixTextZoom();
  addEventListener('resize', () => { clearTimeout(fixTextZoom.t); fixTextZoom.t = setTimeout(fixTextZoom, 300); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fixTextZoom(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixTextZoom);
  // 微信安卓：让它别跟着系统字号放大（设成「标准」），用户在右上角菜单里改字号时也改回来
  { const wx = () => { try { WeixinJSBridge.invoke('setFontSizeCallback', { fontSize: 0 }); WeixinJSBridge.on('menu:setfont', () => { WeixinJSBridge.invoke('setFontSizeCallback', { fontSize: 0 }); setTimeout(fixTextZoom, 300); }); } catch (e) { } };
    if (typeof WeixinJSBridge === 'object' && typeof WeixinJSBridge.invoke === 'function') wx(); else document.addEventListener('WeixinJSBridgeReady', wx, false); }

  // ---------- 界面 ----------
  function bottomSide() { return mode === 'local' ? viewSide : mySide; }
  function cardFor(side) { return side === bottomSide() ? $('cardMe') : $('cardOpp'); }
  function paintCards() {
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      c.classList.remove('r', 'b'); c.classList.add(s);
      c.querySelector('.seal').textContent = SEAL[s];
      c.querySelector('.who').textContent = NAME[s];
      const img = c.querySelector('.face'); if (faces[s] && img.src !== faces[s]) img.src = faces[s];
      const botSide = online() && opts && opts.ai2 && !opts.ai ? hostSide : null;   // 房主的座位交给了电脑
      c.querySelector('.tag').textContent = mode === 'local' || mode === 'watch' ? (s === 'r' ? '红方' : '黑方')
        : vsAI() ? (isAI(s) ? `电脑 · ${LV[aiLevel(s)] || ''}` : '你')
          : s === botSide ? `电脑 · ${LV[opts.ai2] || ''}` : (s === mySide ? '你' : '对手');
    }
    updateHud();
  }
  function capturedBy() {
    const by = { r: [], b: [] };
    if (game.bf) { for (const h of game.history) for (const k of h.kills || []) by[other(k.s)].push({ s: k.s, t: k.t, id: k.id }); return by; }
    for (const h of game.history) if (h.cap) by[h.cap.s === 'r' ? 'b' : 'r'].push(h.cap);
    return by;
  }
  // 被吃的揭棋暗子：联机时只有吃子方看得到真身（虚线框）；同屏时显示“暗”，吃子方可点开偷看
  function capChip(p) {
    if (!p.h) return `<div class="capp ${p.s}">${XQ.NAMES[p.s][p.t]}</div>`;
    const know = p.t !== '?' && online() && p.s !== mySide;
    if (know) return `<div class="capp ${p.s} hid know" title="被吃的暗子 · 只有你知道">${XQ.NAMES[p.s][p.t]}</div>`;
    return `<div class="capp ${p.s} hid" data-pid="${p.id}" title="被吃的暗子">暗</div>`;
  }
  for (const id of ['cardMe', 'cardOpp']) $(id).addEventListener('click', e => {
    const el = e.target.closest('.capp.hid'); if (!el || mode !== 'local' || !el.dataset.pid) return;
    const h = game.history.find(x => x.cap && String(x.cap.id) === el.dataset.pid); if (!h) return;
    toast(`这枚暗子是「${XQ.NAMES[h.cap.s][h.cap.t]}」<br><small>（吃子方偷偷看，对手请回避）</small>`, 1800);
  });
  // 决战的场面（战鼓、两边营里一直助威、刘邦持剑）跟着局面走：进入、悔棋退回、复盘、重开都对得上
  let finalFx = false, finalT = null;
  function resetFinalFx() { finalFx = false; clearTimeout(finalT); Squads.finalMode = false; Camp.frenzy(false); }
  function syncFinalFx() {
    const on = !!(mode && game && game.bf && game.final && started && !RP);
    Camp.frenzy(on && !ended);
    if (on === finalFx) return;
    finalFx = on; clearTimeout(finalT);
    const apply = () => {
      Squads.finalMode = finalFx; Camp.frenzy(finalFx && !ended);
      if (started && !ended) { try { Sfx.Music.start(finalFx && S.music !== 'off' ? 'final' : S.music); } catch (e) { } }
    };
    // 刚打出来的决战：先出「决战」两个大字，字落定了鼓声才起、两边才开始助威，然后弹规则提示
    const live = on && game.last && game.last.ev && game.last.ev.some(e => e.e === 'final');
    if (!live) { apply(); return; }
    try { Sfx.Music.stop(true); } catch (e) { }
    try { Fx.mateSplash('决战', null); } catch (e) { }
    finalT = setTimeout(() => { if (!finalFx) return; apply(); finalT = setTimeout(() => { if (finalFx) showFinalTip(); }, 2400); }, 1500);
  }
  function updateHud() {
    syncFinalFx();
    if (!mode) return;
    if (game.bf) Fx.ply = (game.round - 1) * 2 + (game.turn === 'b' ? 1 : 0);
    const by = capturedBy();
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      c.classList.toggle('active', started && !game.result && game.turn === s);
      c.classList.toggle('think', isAI(s) && game.turn === s && aiThinking);
      c.querySelector('.caps').innerHTML = by[s].map(capChip).join('');
      c.querySelector('.undo').textContent = opts.undo && !(vsAI() && s === aiSide()) ? (opts.undo >= 99 ? '悔棋不限' : `悔 ${Math.max(0, opts.undo - undoUsed[s])}`) : '';
      const bfm = c.querySelector('.bfm');
      bfm.classList.toggle('hidden', !game.bf);
      if (game.bf) {
        const mi = bfm.querySelector('.mer i'); if (mi.textContent !== String(game.merit[s])) { mi.textContent = game.merit[s]; mi.classList.add('pop'); setTimeout(() => mi.classList.remove('pop'), 300); }
        const fx = game.fx, used = game.used, U = BF.CFG.ultimates;
        const chips = [];
        // 轮到这一方行动时，卡片上的兵法签可以直接点（手机上技能栏不再常驻）；点灰的签说明原因
        const tap = canAct() && game.turn === s && !bfMode && !game.result;
        const av = tap ? bfAvail() : null, aw = av && artWhy(s, av), uw = av && ultWhy(s, av);
        const tapAttr = (act, why) => tap ? ` data-a="${act}"${why ? ` data-why="${why[1]}"` : ''}` : '';
        chips.push(`<span class="${used.art[s] ? 'used' : tap && !aw ? 'go' : 'ok'}${tap ? ' tap' : ''}${tap && aw ? ' off' : ''}" data-tip="${escTip(artTip(s) + (aw ? '<br><em>' + aw[1] + '</em>' : ''))}"${tapAttr('art', aw)}>${BF.ART_CN[s]}</span>`);
        // 四面楚歌除了 20 军功还要围住楚将（5×5 内 3 枚汉军子），条件没齐就不亮，并显示还差几枚
        const need = U.simian.minPiecesInRadius, near = s === 'r' ? game.simianCount() : need;
        const ultOk = game.merit[s] >= U.cost && near >= need;
        const ultTxt = used.ult[s] ? '' : game.merit[s] >= U.cost && near < need ? `·将旁${near}/${need}` : '·' + U.cost;
        chips.push(`<span data-k="ult" class="${used.ult[s] ? 'used' : tap ? (uw ? 'ok' : 'go') : ultOk ? 'red' : 'ok'}${tap ? ' tap' : ''}${tap && uw ? ' off' : ''}" data-tip="${escTip(ultTip(s) + (uw ? '<br><em>' + uw[1] + '</em>' : ''))}"${tapAttr('ult', uw)}>${BF.ULT_CN[s]}${ultTxt}</span>`);
        if (s === 'r' && fx.hm) chips.push(`<span class="red" data-tip="${escTip(ultTip('b'))}">鸿门宴 ${fx.hm}</span>`);
        if (s === 'b' && fx.sm) chips.push(`<span class="red" data-tip="${escTip(ultTip('r'))}">涣散 ${fx.sm}</span>`);
        if (s === 'b' && fx.pf) chips.push(`<span data-tip="破釜沉舟之后楚军暂时不能用兵种技能">封技 ${fx.pf}</span>`);

        const fxs = bfm.querySelector('.fxs'), html = chips.join('');
        if (fxs.innerHTML !== html) fxs.innerHTML = html;
        fxs.onclick = e => { const t = e.target.closest('[data-a]'); if (!t) return; e.stopPropagation(); bfButton(t.dataset.a, t); };
      }
    }
    paintClocks();
    let st, warn = false;
    if (game.result) st = `${SIDE_CN[game.result.winner]}胜 · ${REASON[game.result.reason]}`;
    else if (!started) st = mode === 'host' && !Net.connected ? '等待对手入局…' : '开 局';
    else if (netDown()) { st = netText(); warn = true; }
    else if (mode === 'local') st = `${game.turn === 'r' ? '红方（汉）' : '黑方（楚）'}走棋`;
    else if (vsAI()) st = !isAI(game.turn) ? '轮到你走' : `${NAME[game.turn]}思考中…`;
    else st = game.turn === mySide ? '轮到你走' : '对手思考中…';
    if (!game.result && started && game.inCheck()) { st += ' · 将军！'; warn = true; }
    if (!game.result && started && game.bf && game.final) for (const s of ['r', 'b']) if (game.occ[s] > 0) { st += ` · ${s === 'r' ? '汉帅' : '楚将'}夺营 ${game.occ[s]}/${BF.CFG.finalOccupyRounds}`; warn = true; }
    if (watching()) {
      if (game.result) st = `${SIDE_CN[game.result.winner]}胜 · ${REASON[game.result.reason]}`;
      else st = !started || (!game.history.length && watchWaiting) ? '等待棋手开局…' : `观战 · ${game.turn === 'r' ? '红方（汉）' : '黑方（楚）'}走棋` + (game.inCheck() ? ' · 将军！' : '');
    }
    if (game.result && !game.result.winner) st = `和棋 · ${REASON[game.result.reason] || ''}`;
    if (game.jq && !game.result) {
      if (pendingJ) st = '揭子中…';
      else if (started && online() && !jqReady()) st = '等待对手洗牌…';
      const q = game.quietPlies();
      if (q >= 60) st += ` · 无吃子 ${Math.floor(q / 2)}/40 回合`;
      st = '揭棋 · ' + st;
      if (jqBad) { st += ' · ⚠对手揭子数据校验未通过'; warn = true; }
    }
    if (game.bf && !game.result) {
      if (started && game.mustPass() && !watching()) { st = `${SIDE_CN[game.turn]}方无子可走 · 请停着`; }
      else if (started && game.freeUsed && !watching()) { st = `${SIDE_CN[game.turn]}方已架拒马 · 请再走一步棋`; }
      else if (started && game.turn === 'b' && game.fx.sm > 0 && !game.inCheck()) { st += ' · 军心涣散：只能走将或停着'; }
      else if (started && game.turn === 'b' && game.fx.sm > 0) { st += ' · 只能吃掉将军的子或走将'; }
      st = `技能模式 · 第 ${game.round} 回合 · ` + st;
    }
    if (RP) { st = `复盘 · 第 ${RP.k} / ${RP.n} 步` + (RP.k && notes[notes.length - 1] ? ' · ' + notes[notes.length - 1].replace(/=.*/, '') : ''); warn = false; }
    $('statusT').textContent = st; $('status').classList.toggle('warn', warn);
    renderBar();
    paintVeil();
    // 大帐旁的火炬：轮到谁走谁的亮
    Camp.setTurn(mode && started && !ended && !game.result && !RP ? game.turn : null);
    paintSig();
    $('specN').textContent = (online() || watching()) && Spect.count ? `观战 ${Spect.count}` : '';
    layoutSoon();
    const left = opts.undo >= 99 ? '' : Math.max(0, opts.undo - undoUsed[actor()]);
    $('undoLeft').textContent = opts.undo ? (left === '' ? '∞' : left) : '';
    $('tUndo').disabled = !canUndo();
  }
  // 浮动元素按卡片实际位置摆放，避免互相压住
  // 一步棋里 updateHud / renderBar 会被调好几次，每次 layoutHud 都要量元素位置（逼浏览器当场重排版面）。
  // 攒到下一帧只排一次；窗口尺寸、卡片尺寸变了（resize / ResizeObserver）还是当场排
  var hudQ = false;   // var：可能在这一行执行之前就被调到
  function layoutSoon() { if (hudQ) return; hudQ = true; requestAnimationFrame(() => { hudQ = false; layoutHud(); }); }
  function layoutHud() {
    if ($('hud').classList.contains('hidden')) { document.documentElement.style.removeProperty('--below-status'); return; }
    const W = innerWidth, H = innerHeight;
    const compact = isCompact();
    document.body.classList.toggle('compact', compact);
    const o = $('cardOpp').getBoundingClientRect(), m = $('cardMe').getBoundingClientRect();
    const st = $('status').style;
    if (compact) { st.left = '50%'; st.top = (o.bottom + 8) + 'px'; st.transform = 'translateX(-50%)'; }
    else if (W <= 1100) { st.left = (o.right + 18) + 'px'; st.top = (o.top + 4) + 'px'; st.transform = 'none'; }
    else { st.left = '50%'; st.top = ''; st.transform = 'translateX(-50%)'; }
    const sr = $('status').getBoundingClientRect();
    document.documentElement.style.setProperty('--below-status', (sr.bottom + 10) + 'px');   // 提示框、视角提示都在「谁走棋」下面（美术 M11）
    const below = compact ? sr.bottom : o.bottom;
    $('bubOpp').style.top = (below + 12) + 'px';
    $('bubMe').style.bottom = (H - m.top + 12) + 'px';
    $('log').style.top = compact ? (sr.bottom + 8) + 'px' : '';
    // 兵法技能栏：手机上贴在自己卡片上方，电脑上居中靠下；气泡让到技能栏上面
    const bar = $('bfBar');
    if (!bar.classList.contains('hidden')) {
      // 电脑：竖排在右侧工具栏左边，不压棋盘；手机：横排贴在自己卡片上方
      bar.classList.toggle('col', !compact); bar.classList.toggle('cmp', compact);
      if (compact) { bar.style.bottom = (H - m.top + 8) + 'px'; bar.style.left = '12px'; bar.style.right = '12px'; bar.style.transform = 'none'; }
      else { const tr = $('tools').getBoundingClientRect(); bar.style.left = 'auto'; bar.style.transform = 'none'; bar.style.right = (W - tr.left + 12) + 'px'; bar.style.bottom = (H - tr.bottom) + 'px'; }
      const br = bar.getBoundingClientRect();
      if (compact) $('bubMe').style.bottom = (H - Math.min(m.top, br.top) + 10) + 'px';   // 只有手机上技能栏才叠在卡片上方；电脑上它在右侧，气泡不用让
    }
    // 技能未用提示：手机上贴在卡片（或技能栏）上方，电脑上在屏幕下方正中
    const sh = $('skHint');
    if (!sh.classList.contains('hidden')) {
      if (compact) { const top = bar.classList.contains('hidden') ? m.top : Math.min(m.top, bar.getBoundingClientRect().top); sh.style.bottom = (H - top + 8) + 'px'; }
      else sh.style.bottom = '';
    }
    $('bfReport').style.top = compact ? (sr.bottom + 6) + 'px' : '';
  }
  window.addEventListener('resize', () => setTimeout(layoutHud, 60));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => layoutHud()); ro.observe($('cardOpp')); ro.observe($('cardMe')); }
  const CN10 = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const fmtStep = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return t >= 60 ? Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') : t + ' 秒'; };
  let cdSec = -1, hurryKey = '';
  function paintClocks() {
    let urgent = null; // 正在走的一方只剩 10 秒以内：{ side, sec }
    const live = mode && started && !ended && !game.result && !RP;
    for (const s of ['r', 'b']) {
      const c = cardFor(s);
      let total = clock[s], step = game.turn === s ? clock.step : stepMax();
      if (online() && s !== mySide && game.turn === s && clock.oppStamp && Net.peerState === 'ok' && !busy) {
        const el = performance.now() - clock.oppStamp;
        total = clock.oppTotal - (opts.total ? el : 0); step = clock.oppStep - el;
      }
      // 卡片上：总时 + 这一步还剩多久（只有轮到的一方显示步时）
      const ck = c.querySelector('.clk'), turnNow = live && game.turn === s;
      const stepLow = turnNow && opts.step && step < 10000;
      const html = (opts.total ? fmt(total) : opts.step ? '' : '不限时') + (opts.step ? `<i class="stp${stepLow ? ' low' : ''}${opts.total ? '' : ' solo'}">${turnNow ? '本步 ' + fmtStep(step) : '每步 ' + fmtStep(stepMax())}</i>` : '');
      if (ck.dataset.h !== html) { ck.dataset.h = html; ck.innerHTML = html; }
      ck.classList.toggle('inf', !opts.total && !opts.step);
      ck.classList.toggle('low', !!opts.total && total < 60000 && game.turn === s && started && !game.result);
      // 头像外的计时环：优先显示步时，其次总时
      let k = 1, low = false;
      if (opts.step) { k = step / stepMax(); low = step < 10000; }
      else if (opts.total) { k = total / totalMax(); low = total < 60000; }
      const arc = c.querySelector('.arc');
      arc.style.strokeDashoffset = (226.2 * (1 - Math.max(0, Math.min(1, k)))).toFixed(1);
      arc.classList.toggle('low', low && game.turn === s);
      if (turnNow && (opts.total || opts.step)) {
        const left = Math.min(opts.total ? total : 1e12, opts.step ? step : 1e12);
        if (left > 0 && left <= 10000 && !busy && !Ending.running && !netDown() && !paused()) urgent = { side: s, sec: Math.ceil(left / 1000) };
      }
    }
    // 最后十秒：屏幕中央一个半透明的行书大字逐秒跳动；自己的钟（或同屏对战）时四周泛红；这一方的观战士兵坐立不安
    const big = $('cdBig'), red = $('cdRed');
    if (urgent) {
      if (urgent.sec !== cdSec) {
        cdSec = urgent.sec; big.textContent = CN10[urgent.sec] || '';
        big.classList.remove('on'); void big.offsetWidth; big.classList.add('on'); big.classList.toggle('hot', urgent.sec <= 3);
        if (urgent.sec <= 5) { try { Sfx.B.taiko(0, 0.35 + (5 - urgent.sec) * 0.08, 0.7); } catch (e) { } }
      }
      red.classList.toggle('on', !watching() && (mode === 'local' || urgent.side === mySide));
    } else if (cdSec !== -1) { cdSec = -1; big.classList.remove('on', 'hot'); red.classList.remove('on'); }
    Camp.restless(urgent ? urgent.side : null);
    // 头像牌外那圈朱红粗线（美术 M7）：读秒时跟着一亮一暗，越到后面越快——剩 10 秒 1 秒一下，剩 1 秒 0.33 秒一下。每秒换一次节拍
    const hk = urgent ? urgent.side + urgent.sec : '';
    if (hk !== hurryKey) {
      hurryKey = hk;
      for (const s of ['r', 'b']) { const c = cardFor(s), on = !!urgent && urgent.side === s; c.classList.toggle('hurry', on); if (on) c.style.setProperty('--beat', (0.26 + 0.074 * urgent.sec).toFixed(2) + 's'); }
    }
    // 自家半场的格线闪（美术 M9）：和头像牌的朱框同一个条件、读秒时同一个节拍
    if (typeof TurnGlow !== 'undefined') { const ts = mode && started && !game.result ? game.turn : null; TurnGlow.set(ts, S.turnfx, urgent && urgent.side === ts ? 0.26 + 0.074 * urgent.sec : 0); }
  }
  // 暂停中（见下面的暂停功能）
  // 人机 / 本地：随便停。联机：每人每局 3 次，每次最多 2 分钟，双方时钟都停；到点自动继续，暂停的一方可以提前继续
  const PAUSE_MAX = 3, PAUSE_MS = 120000;
  let introSkip = null;
  const INTROS = [
    [['r', '汉王刘邦在此！项籍，可敢一战？', 'r_start', 2], ['b', '吾乃西楚霸王！谁敢挡我！', 'b_start', 1.8]],
    [['b', '哟，是汉中王来了。', 'b_start2', 1.8], ['r', '托项王的福，汉中的栈道，寡人已经修好了。', 'r_start2', 2.4]],
    [['b', '天下匈匈数岁者，徒以吾两人耳。愿与汉王挑战，决一雌雄！', 'b_start3', 3.2], ['r', '吾宁斗智，不能斗力。', 'r_start3', 1.8]],
  ];
  let pause = null, pauseUsed = { r: 0, b: 0 };
  const paused = () => !!pause;
  const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const myPause = () => !!pause && (pause.by === 'me' || (!watching() && pause.by === mySide));
  function paintPause() {
    const ov = $('pauseOv');
    ov.classList.toggle('hidden', !pause);
    if (!pause) return;
    const mine = myPause();
    ov.classList.toggle('opp', !mine);
    for (const id of ['pzResign', 'pzSet']) $(id).classList.toggle('hidden', watching());
    let txt = '';
    if (pause.by === 'me') txt = '棋局已停，计时也停了';
    else {
      const left = mmss(pause.until - performance.now());
      txt = mine ? `对手也在等你 · ${left} 后自动继续 · 本局还可暂停 ${PAUSE_MAX - pauseUsed[mySide]} 次`
        : `${SIDE_CN[pause.by]}方叫了暂停 · 最多 ${left} 后继续`;
    }
    $('pzInfo').textContent = txt;
  }
  function setPause(p) {
    const was = !!pause;
    pause = p; Core.Time.hold = !!p;
    if (was && !p) clock.last = performance.now();
    paintPause();
  }
  function resumeGame() {
    if (!pause) return;
    if (online() && pause.by === mySide) Net.send({ t: 'pause', on: 0, side: mySide });
    setPause(null);
  }
  function togglePause() {
    if (pause) {
      if (myPause()) resumeGame();
      else toast('对手暂停中，由对手决定何时继续');
      return;
    }
    if (!mode || !started || ended || game.result || Ending.running || RP) return;
    if (watching()) { toast('观战席不能叫暂停'); return; }
    if (online()) {
      if (netDown()) { toast('对手不在线，计时本来就停着'); return; }
      if (pauseUsed[mySide] >= PAUSE_MAX) { toast(`本局 ${PAUSE_MAX} 次暂停已经用完`); return; }
      pauseUsed[mySide]++;
      Net.send({ t: 'pause', on: 1, side: mySide, ms: PAUSE_MS, used: pauseUsed[mySide] });
      setPause({ by: mySide, until: performance.now() + PAUSE_MS });
    } else setPause({ by: 'me', until: 0 });
  }
  // 对手（或观战时任一方）发来的暂停 / 继续
  function onPause(d, side) {
    if (d.on) {
      if (ended || !started) return;
      if (d.used != null) pauseUsed[side] = d.used;
      closeAsk();
      setPause({ by: side, until: performance.now() + Math.min(PAUSE_MS, +d.ms || PAUSE_MS) + 1500 });
      if (!watching()) toast('对手叫了暂停', 2200);
    } else if (pause && pause.by === side) { setPause(null); toast('棋局继续', 1500); }
  }
  // 同步局面时带上暂停次数和正在进行的暂停
  function applyPz(st) {
    if (st.pz) pauseUsed = { r: 0, b: 0, ...st.pz };
    if (st.pzn && st.pzn.ms > 500 && !st.result) { if (!(pause && pause.by === st.pzn.side)) setPause({ by: st.pzn.side, until: performance.now() + st.pzn.ms }); }
    else if (pause && pause.until && !myPause()) setPause(null);
  }

  // ---------- 计时 ----------
  let lastTickSec = -1;
  let turnStartAt = 0, slowIdx = 0;
  setInterval(() => {
    const t = performance.now(), dt = t - clock.last; clock.last = t;
    if (!started || ended || game.result || !mode) return;
    const s = game.turn;
    const mine = mode === 'local' || vsAI() || mode === 'watch' || s === mySide;
    if (pause) { if (pause.until && t > pause.until) { if (myPause()) resumeGame(); else setPause(null); } else paintPause(); return; }
    const paused = busy || Ending.running || netDown();
    if (mine && !paused) {
      if (opts.total) clock[s] -= dt;
      if (opts.step) clock.step -= dt;
      const left = Math.min(opts.total ? clock[s] : 1e9, opts.step ? clock.step : 1e9);
      const sec = Math.ceil(left / 1000);
      if (left < 10000 && sec !== lastTickSec && s !== aiSide() && !watching()) { lastTickSec = sec; Sfx.tick(sec <= 3 ? 0.5 : 0.3); }
      if (!watching() && ((opts.total && clock[s] <= 0) || (opts.step && clock.step <= 0))) onTimeout(s);
      if (online() && Math.floor(t / 2000) !== Math.floor((t - dt) / 2000)) Net.send({ t: 'clk', side: s, total: clock[s], step: clock.step });
    }
    // 人机：玩家久不落子，对方出言相激
    if (vsAI() && !aiBoth() && s === mySide && !paused && !pendingUndo && turnStartAt) {
      const el = (t - turnStartAt) / 1000;
      const marks = [22, 48, 85, 130, 190, 260];
      if (slowIdx < marks.length && el > marks[slowIdx]) { aiSay('slow' + ((slowIdx % 3) + 1)); slowIdx++; }
    }
    paintClocks();
  }, 200);
  function onTimeout(s) {
    const r = game.timeout(s);
    if (!r) return;
    if (online()) Net.send({ t: 'timeout', side: s });
    toast(`${SIDE_CN[s]}方超时`);
    finishGame(r);
  }

  // ---------- 人机 ----------
  let aiSeq = 0, aiThinking = false;
  const lastAiLine = {};
  function aiSay(kind, force) {
    if (!vsAI()) return Promise.resolve();
    const s = aiSide(), k = s === 'b' ? 'x' : 'l';
    let id = `ai_${k}_${kind}`;
    if (kind === 'cap') {
      const pool = [1, 2, 3, 4].map(i => `ai_${k}_cap${i}`).filter(x => x !== lastAiLine.cap);
      id = pool[Math.floor(Math.random() * pool.length)]; lastAiLine.cap = id;
    }
    if (!Voice.has(id)) return Promise.resolve();
    bubble(s, Voice.text(id), 3600);
    return Voice.play(id);
  }
  // 技能模式的电脑放进 Web Worker 里算（和动画互不耽误）；开不了 Worker 就等动画放完在主线程分片算
  let bfW = null, bfWSeq = 0;
  const bfWait = new Map();
  // trace：要不要电脑的思考记录（C62 A：对局里的电脑都记，导出时带上；分析不记）
  function bfThink(S, level, waitIdle, trace) {
    const local = async () => { await waitIdle(); BFAI.trace = !!trace; try { const seq = await BFAI.think(S, level, () => new Promise(r => setTimeout(r, 0))); bfThink.last = BFAI.think.last; return seq; } finally { BFAI.trace = false; } };
    if (bfW === null) {
      try {
        const src = document.getElementById('eng').textContent + '\nself.onmessage=async e=>{const d=e.data;try{BFAI.trace=!!d.trace;if(d.cfg){Object.assign(BF.CFG.beishui,d.cfg.beishui);if(d.cfg.r6)Object.assign(BF.CFG.r6,d.cfg.r6);BF.CFG.generalArts.fromRound=d.cfg.fromRound;BF.CFG.attack=d.cfg.attack;}const seq=await BFAI.think(d.S,d.level);postMessage({id:d.id,seq:seq,stat:BFAI.think.last});}catch(err){postMessage({id:d.id,err:String(err&&err.stack||err)});}};';
        bfW = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
        bfW.onmessage = e => { const w = bfWait.get(e.data.id); if (!w) return; bfWait.delete(e.data.id); if (e.data.err) w.rej(new Error(e.data.err)); else { bfThink.last = e.data.stat; w.res(e.data.seq); } };
        bfW.onerror = () => { bfW = false; for (const w of bfWait.values()) w.rej(new Error('worker')); bfWait.clear(); };
      } catch (e) { bfW = false; }
    }
    if (!bfW) return local();
    // 试验性的规则开关（背水一战等）也带给电脑线程：它那边有自己的一份配置
    return new Promise((res, rej) => { const id = ++bfWSeq; bfWait.set(id, { res, rej }); bfW.postMessage({ id, S, level, trace: !!trace, cfg: { beishui: BF.CFG.beishui, r6: BF.CFG.r6, fromRound: BF.CFG.generalArts.fromRound, attack: BF.CFG.attack } }); }).catch(e => { console.warn('电脑线程出错，改在主线程算', e); return local(); });
  }
  function cancelAI() { aiSeq++; if (aiThinking) { try { AI.cancel(); } catch (e) { } } aiThinking = false; }
  function maybeAI() {
    if (!(vsAI() || hostBot()) || ended || game.result || !started || !isAI(game.turn) || pendingUndo) return;
    if (aiThinking) return;
    const id = ++aiSeq, side = game.turn, lvl = aiLevel(side);
    aiThinking = true; updateHud();
    const t0 = performance.now();
    const minWait = { easy: 1100, mid: 1300, hard: 700 }[lvl] || 1000;
    if (game.bf) {
      // 技能模式：电脑给出一串行动（升级 → 拒马 → 主行动），依次执行；每一步等上一步的演出放完
      const waitIdle = async () => { await anim; while (busy) await Core.sleep(0.1); };
      (async () => {
        if (game.mustPass && game.mustPass()) return [{ k: 'pass' }];
        return bfThink(BF.cloneState(game.S), lvl, waitIdle, true);
      })().then(async seq => {
        if (id !== aiSeq || !seq) { if (id === aiSeq) { aiThinking = false; updateHud(); } return; }
        // 思考记录按这一回合第一条行动的序号存（导出里的 think）
        const tr = bfThink.last && bfThink.last.trace;
        if (tr) { if (!game.__think) game.__think = {}; game.__think[game.entries.length] = tr; }
        const el = performance.now() - t0;
        if (el < minWait) await Core.sleep((minWait - el) / 1000);
        aiThinking = false;
        for (const a of seq) {
          await waitIdle();
          if (id !== aiSeq || ended || game.result || game.turn !== side || pendingUndo) break;
          if (!doBF(a)) { console.warn('电脑行动非法', a); break; }
        }
        updateHud();
      }).catch(e => { console.error(e); aiThinking = false; updateHud(); });
      return;
    }
    AI.think(game.history.map(h => ({ from: h.from, to: h.to })), lvl).then(async r => {
      if (id !== aiSeq) return;
      const el = performance.now() - t0;
      if (el < minWait) await Core.sleep((minWait - el) / 1000);
      await anim;
      while (busy) await Core.sleep(0.1);
      if (id !== aiSeq) return;
      aiThinking = false;
      if (ended || game.result || game.turn !== side) { updateHud(); return; }
      if (!r || !r.move) { updateHud(); console.warn('电脑无着', r); return; }
      if (!doMove({ from: r.move.from, to: r.move.to })) { console.warn('电脑着法非法', r.move); updateHud(); }
    }).catch(e => { console.error(e); aiThinking = false; });
  }
  // ---------- 将帅的彩蛋台词（Ham 10-05 要的：主帅走子、吃子之外的“特殊”一类） ----------
  // 每方一份：n 这一局动过几步；kRun 连着几回合在走帅；chk 连着几回合被将军；left 帅离开过原位；flee 上次说“走为上”是第几步；
  //   said 一局只说一次的；poke 连着点了几下自己的帅；face 这一步里想走“将帅照面”的次数；cnt 上一步之后还剩多少子、几个车
  const KT = {}, KHOME = { r: [4, 0], b: [4, 9] };
  function ktReset(resumed) { Fx.state.kingLines.length = 0; for (const s of 'rb') KT[s] = { n: resumed ? 1 : 0, kRun: 0, chk: 0, left: false, flee: -9, said: new Set(), poke: 0, face: 0, faceAt: -1, cnt: null }; }
  ktReset(false);
  const ktCount = s => { let all = 0, rook = 0; for (const row of game.board) for (const q of row) if (q && q.s === s) { all++; if (q.t === 'r' && !q.h) rook++; } return { all, rook }; };
  const ktInit = () => { if (KT.r) for (const s of 'rb') if (!KT[s].cnt) KT[s].cnt = ktCount(s); };   // 落子之前先数一遍场上的子（落子之后才好比较少了什么）
  // 主帅开口：带字幕，走主帅那一路声音。这句还没有配音就不说
  function kingSay(side, id, ms = 3400) { if (!Voice.has(id)) return null; bubble(side, Voice.text(id), ms); return Voice.play(id); }
  Fx.state.onKingLine = (side, id) => { kingSay(side, id); };
  // 落子之前：这一步要是主帅自己走，看看有没有彩蛋可说——登记给 Fx，演到这一步时由它说（代替普通的那句）
  //   开局第一步就动帅 > 亲手吃车 > 连着三回合走帅 > 被将军时自己走开 > 走出去又坐回原位
  function ktBefore(side, piece, from, to, cap, wasChk) {
    const k = KT[side]; if (!k) return;
    const first = k.n === 0; k.n++;
    if (!piece || piece.t !== 'k') { k.kRun = 0; return; }
    k.kRun++;
    const H = KHOME[side], home = to[0] === H[0] && to[1] === H[1], fromHome = from[0] === H[0] && from[1] === H[1];
    let id = null;
    if (first) id = 'first';
    else if (cap && cap.t === 'r' && !cap.h) id = 'eatr';
    else if (k.kRun >= 3) { id = 'run'; k.kRun = 0; }
    else if (wasChk && k.n - k.flee >= 3) { id = 'flee'; k.flee = k.n; }
    else if (home && k.left) id = 'home';
    if (fromHome) k.left = true;
    if (id && Voice.has(`${side}_x_${id}`)) { const q = Fx.state.kingLines; q.push({ s: side, from: from.slice(), to: to.slice(), id: `${side}_x_${id}` }); if (q.length > 2) q.shift(); }
  }
  // 落子之后（演出放完）：四级名将阵亡的哀叹 > 只剩光杆一个帅 > 两个车都没了 > 连着三回合被将军。一步最多说一句；返回 [哪一方, 哪一句, 字幕留多久]
  function ktAfter(info) {
    if (!KT.r || !game) return null;
    const mover = info.mover, opp = mover === 'r' ? 'b' : 'r';
    if (info.check) KT[opp].chk++; else KT[opp].chk = 0;
    let say = null;
    for (const h of info.heroDead || []) { const id = `${h.s}_h_${h.t}${h.nm}`; if (!say && Voice.has(id)) say = [h.s, id, 5200]; }
    for (const s of 'rb') {
      const k = KT[s], was = k.cnt, now = ktCount(s); k.cnt = now;
      if (!was || say) continue;
      if (now.all === 1 && was.all > 1 && !k.said.has('alone')) { k.said.add('alone'); say = [s, `${s}_x_alone`, 3600]; }
      else if (!game.jq && now.rook === 0 && was.rook > 0 && !k.said.has('norook')) { k.said.add('norook'); say = [s, `${s}_x_norook`, 3600]; }
    }
    if (KT[opp].chk >= 3) { KT[opp].chk = 0; if (!say) say = [opp, `${opp}_x_chk3`, 3000]; }
    if (info.result || (say && !Voice.has(say[1]))) return null;
    return say;
  }
  // 连着点自己的主帅 5 下
  function ktPoke(p) {
    const s = actor(), k = KT[s]; if (!k || !game) return;
    const pc = p && game.at(p[0], p[1]);
    if (pc && pc.s === s && pc.t === 'k' && !pc.h) { if (++k.poke >= 5) { k.poke = 0; const two = Voice.has(`${s}_x_poke2`) && (k.pokeAlt = !k.pokeAlt); kingSay(s, `${s}_x_poke${two ? 2 : ''}`); } } else k.poke = 0;   // 有两句的轮着说
  }
  // 着法完成后的台词
  function afterMoveLines(info) {
    const mover = info.mover;
    let p = Promise.resolve();
    const egg = ktAfter(info);
    if (info.result && info.result.reason === 'checkmate') { bubble(mover, '绝杀！', 2600); p = Voice.play(`${mover}_mate`); }
    else if (info.check) {
      bubble(mover, '将军！', 2400); p = Voice.play(`${mover}_check`);
      if (!egg && vsAI() && mover === mySide && Math.random() < 0.55) p.then(() => { if (!ended) aiSay('checked'); });
    }
    if (egg) { p.then(() => { if (!ended && started) kingSay(egg[0], egg[1], egg[2]); }); return; }
    if (!vsAI() || info.result) return;
    if (mover === aiSide() && info.captured && !info.check) { if ('rnc'.includes(info.captured.t) || Math.random() < 0.6) aiSay('cap'); }
    else if (mover === mySide && info.captured && !info.check && 'rnc'.includes(info.captured.t) && Math.random() < 0.6) aiSay('hurt');
  }

  // ---------- 开局 ----------
  function setView(side, smooth) { viewSide = side; Core.Cam.setSide(side, !smooth); Board.faceViewer(side, smooth); Board.viewSide = side; paintCards(); }
  let finaleHero = null;
  function clearFinale() { if (finaleHero) { try { if (finaleHero.dropped) Core.disposeTree(finaleHero.dropped); finaleHero.dispose(); } catch (e) { } finaleHero = null; } }
  async function startGame(m, side, o, { state = null, intro = true } = {}) {
    cancelAI(); closeRoom();
    mode = m; mySide = side; opts = { ...o }; ended = false; started = false; lobbySpin = false;
    // 技能模式的楚方主帅兵法用哪一套，记在这一局的选项里（bs = 1 背水一战）：新开的局用背水一战；
    //   没有这个记号的（改规则之前开的局接着下、房主还是旧版本、旧的复盘）照旧用破釜沉舟——联机双方、观众、接着下的局都看同一个记号，不会一边一套
    if (+opts.bf) { if (opts.bs == null && !state && (m === 'local' || m === 'ai' || m === 'host')) opts.bs = BS_NEW; BF.CFG.beishui.on = !!+opts.bs; }
    if (+opts.bf) try { Voice.loadBF(); } catch (e) { }   // 技能模式专用的配音包（升级、名将、技能的台词）
    // 试行规则同样记在这一局的选项里（r6 = 1）：只有网址带 ?r6=1 的机器新开的局才有；没有这个记号的一律照现行规则
    //   自己新开的局（本地、人机、房主）每次都按这台设备现在的选择定；跟着别人的（客人、观众）和接着下的局看带来的记号
    if (+opts.bf) { if (!state && (m === 'local' || m === 'ai' || m === 'host')) opts.r6 = R6_NEW; BF.CFG.r6.on = !!+opts.r6; } else BF.CFG.r6.on = false;
    if (+opts.bf && !BF.CFG.r6.on && !state && !R6_NEW) setTimeout(() => { if (game && game.bf && !BF.CFG.r6.on) toast('这台设备选的是旧规则 · 网址带 ?r6=1 换回新规则', 4200); }, 1800);
    if ((m === 'local' || m === 'ai') && !state) store.del('resume');
    resumeKey = '';
    game = mkGame(opts, state && state.layout); undoUsed = { r: 0, b: 0 }; pendingUndo = null; pauseUsed = { r: 0, b: 0 }; setPause(null);
    resetClocks();
    clearFinale(); Camp.reset();
    Board.setSkin(game.bf ? 0 : opts.skin);   // 棋子款式（木 / 银 / 金 / 玉）是开局选项，联机双方和观众一致
    Board.setPosition(game); Fx.clearMarks(); Fx.ply = 0;
    Board.clearMoves(); Board.showLast(null);
    if (state) applyState(state);
    jqSetup(state);
    rebuildNotes();
    $('log').classList.toggle('jq', game.jq || !!game.bf);
    bfMode = null; dbgOn = false; dbgNoCd = false; dbgFree = false; $('bfDebug').classList.add('hidden'); $('bfReport').innerHTML = ''; $('bfReport').classList.toggle('hidden', !game.bf);
    $('tRule').classList.toggle('hidden', !game.bf);
    Core.Cam.view = mode === 'local' ? 0 : Math.max(0, Math.min(2, +store.get('view', 0) || 0));   // 本地双人先照旧（「视」= 换边看），不用三档
    $('tView').title = mode === 'local' ? '换边 / 自由视角' : '换视角：沙盘 → 俯瞰 → 定盘';
    $('viewTag').classList.toggle('lc', mode === 'local');   // 本地双人：「视」只有换边 / 自由视角两档（美术 M14）
    setView(mode === 'local' ? 'r' : side);
    $('lobby').classList.add('hidden'); $('hud').classList.remove('hidden');
    $('netbadge').classList.add('hidden');
    Core.Cam.moveId = (Core.Cam.moveId || 0) + 1;
    for (const id of ['tUndo', 'tResign', 'tPause']) $(id).classList.toggle('hidden', m === 'watch');
    $('tLaugh').classList.toggle('hidden', m !== 'watch');
    setupChat();
    $('log').classList.add('hidden');   // 棋谱默认收起，点「譜」才展开
    Ending.hideCard();
    Core.Cam.cine = false;
    Sfx.init(); applySettings();
    resetFinalFx(); Sfx.Music.start(S.music); Sfx.Music.setIntensity(0.35);
    paintCards();
    if (vsAI()) { try { AI.warm(); } catch (e) { } }
    if (intro && !game.history.length) {
      Sfx.B.gong(0, 0.9); Sfx.B.taiko(0.5, 0.8); Sfx.B.taiko(0.8, 0.8); Sfx.B.taiko(1.05, 0.9);
      let sub = mode === 'local' ? '红方先行' : vsAI() ? `人机 · ${LV[opts.level]} · ${mySide === 'r' ? '你执红（汉）先行' : '你执黑（楚）后手'}` : mode === 'watch' ? '观战' : (mySide === 'r' ? '你执红（汉）· 先行' : '你执黑（楚）· 后手');
      if (game.jq) sub = '揭棋 · ' + sub;
      if (game.bf) sub = '技能模式 · ' + sub;
      banner('楚汉相争', sub, 2700);
      // 开场白三套随机；随时可以点「跳过」（或按空格）直接开局
      let skipIntro; const skipP = new Promise(r => { skipIntro = r; });
      introSkip = () => { introSkip = null; Voice.cancel(); $('banner').classList.remove('on'); for (const id of ['bubMe', 'bubOpp']) $(id).classList.remove('on'); skipIntro(true); };
      $('skip').classList.remove('hidden'); $('skip').textContent = '跳过开场 ▸▸';
      const say = async (side, text, id, min) => { if (!introSkip || mode !== m) return; bubble(side, text, 3600); await Promise.race([Voice.play(id, { minDur: min }), skipP]); };
      await Promise.race([Core.sleep(2.5), skipP]);
      const v = INTROS[Math.floor(Math.random() * INTROS.length)];
      for (const [side, text, id, min] of v) await say(side, text, id, min);
      introSkip = null; if (!busy && !Ending.running) $('skip').classList.add('hidden');
    }
    if (mode !== m) return;
    if (game.jq && !game.history.length && intro) { bubble('r', '十五子尽数扣下，翻开方知是何兵马！', 3200); if (Voice.has('r_jq_start')) Voice.play('r_jq_start'); await Core.sleep(1.2); }
    if (game.bf && !game.history.length && intro) { bubble('b', '论兵法，你还嫩了些！', 3200); if (Voice.has('b_bf_start')) Voice.play('b_bf_start'); await Core.sleep(1.0); }
    ktReset(!!(game.history && game.history.length));
    if (mode === m && game.bf && !game.entries.length && m !== 'watch') showBfTip(false);
    if (mode !== m) return;
    started = true; clock.last = performance.now(); clock.step = stepMax();
    turnStartAt = performance.now(); slowIdx = 0;
    updateHud();
    maybeAI();
  }
  function snapshot() {
    const G = RP ? RP.real : game; // 复盘中也发真实棋局
    const jq = G.jq && JK ? { gid: JK.gid, cin: JC.cin, cout: JC.cout } : undefined;
    const bfe = G.bf ? G.entries : undefined;
    return { v: 2, code: Net.code, opts, hostSide, jq, bfe, moves: G.bf ? [] : G.history.map(h => ({ from: h.from, to: h.to, rv: h.rv, cj: h.cj })), result: G.result, undo: { ...undoUsed }, clk: { r: clock.r, b: clock.b }, step: clock.step, t: Date.now(), pz: { ...pauseUsed }, pzn: pause && pause.until ? { side: pause.by, ms: Math.max(0, pause.until - performance.now()) } : null };
  }
  function applyState(st) {
    game = mkGame(opts, st.layout || (game && game.opts && game.opts.layout));
    if (game.bf && st.bfbase) game.reset(st.bfbase);
    if (game.bf) for (const e of st.bfe || []) { if (!game.apply(e)) break; }
    else for (const m of st.moves || []) game.play({ from: m.from, to: m.to, rv: m.rv, cj: m.cj });
    if (st.result) game.result = st.result;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
    if (st.clk && ((st.moves || []).length || (st.bfe || []).length)) { clock.r = st.clk.r; clock.b = st.clk.b; }
    if (st.step != null) clock.step = st.step;
    jqLearnAll();
    Board.setPosition(game); Board.faceViewer(viewSide);
    Fx.ply = game.history.length;
    const last = game.history[game.history.length - 1];
    Board.showLast(last ? last.from : null, last ? last.to : null);
    rebuildNotes();
  }
  function publish() { if (mode === 'host') Net.publishRoom(snapshot()); }

  // ---------- 揭棋联机：密钥、承诺与揭示 ----------
  const jqKey = () => 'jq-' + Net.code;
  function jqSetup(st) {
    JK = null; JC = { cin: {}, cout: {}, used: { r: {}, b: {} } }; jqBad = 0; pendingJ = null; lastJx = null;
    if (!game.jq || !online()) return;
    const sj = st && st.jq, opp = other(mySide);
    const saved = store.get(jqKey(), null);
    if (sj && sj.gid) {
      if (sj.cin) for (const k of ['r', 'b']) if (Jieqi.validCommits(sj.cin[k])) JC.cin[k] = sj.cin[k];
      if (sj.cout) for (const k of ['r', 'b']) if (Jieqi.validCommits(sj.cout[k])) JC.cout[k] = sj.cout[k];
      if (saved && saved.gid === sj.gid && saved.side === mySide && saved.inner && saved.outer) JK = saved;
      else if (mode === 'guest') JK = Jieqi.create(sj.gid, mySide);
      else if (mode === 'host' && (st.moves || []).length && !st.result) {
        // 房主换了设备、密钥丢失：这局揭不开了，重新洗牌
        setTimeout(() => { if (mode !== 'host') return; toast('揭棋密钥不在这台设备上，重新洗牌开局', 3200); restart(); Net.send({ t: 'restart', state: snapshot() }); }, 60);
        return;
      } else JK = Jieqi.create(sj.gid, mySide);
    } else if (mode === 'host') JK = Jieqi.create(Jieqi.rhex(10), mySide);
    if (!JK) return;
    store.set(jqKey(), JK);
    JC.cin[mySide] = JK.inner.c; JC.cout[opp] = JK.outer.c;
    if (mode === 'guest') Net.send({ t: 'jqc', gid: JK.gid, ...Jieqi.pub(JK) });
    jqLearnAll();
  }
  function jqWarn(why) {
    jqBad++; console.warn('揭棋校验未通过', why);
    toast('⚠ 对手的揭子数据没有通过校验（' + why + '）', 3600);
  }
  // 记录槽位号使用情况：同一槽位不能对应两个不同位置
  function jqNoteSlot(side, j, i) {
    const u = JC.used[side];
    if (u[j] != null && u[j] !== i) jqWarn('槽位重复'); else u[j] = i;
  }
  // 某方已揭晓的兵种数量不能超过标准数量
  function jqCountOk(side) {
    const n = {};
    game.history.forEach((h, i) => {
      if (h.rv && (i % 2 ? 'b' : 'r') === side) n[h.rv] = (n[h.rv] || 0) + 1;
      if (h.cap && h.cap.h && h.cap.t !== '?' && h.cap.s === side) n[h.cap.t] = (n[h.cap.t] || 0) + 1;
    });
    for (const t in n) if (n[t] > XQ.JQ_COUNT[t]) return false;
    return true;
  }
  // 吃子方用自己的 outer 排列算出被吃暗子的真身（含重连后的补算）
  function jqLearn(h) {
    if (!JK || !h || !h.cap || !h.cap.h || h.cap.t !== '?' || h.cj == null || h.cap.s === mySide) return;
    if (!Jieqi.okIdx(h.cj)) return;
    h.cap.t = JK.outer.arr[h.cj];
  }
  function jqLearnAll() { if (JK) for (const h of game.history) jqLearn(h); }
  // 对手走了暗子 / 吃了我方暗子：我方给出揭示
  function jqRespond(d) {
    const opp = other(mySide);
    const p = game.at(d.from[0], d.from[1]), q = game.at(d.to[0], d.to[1]);
    if (!JK || !p || p.s !== opp) return null;
    const jx = { t: 'jx', n: d.n }, out = {};
    if (d.ri) {
      if (!p.h || d.ri.i !== p.hi || !Jieqi.okIdx(d.ri.j)) return null;
      if (!Jieqi.checkIn(JK.gid, opp, JC.cin[opp], d.ri)) jqWarn('暗子位置');
      jqNoteSlot(opp, d.ri.j, d.ri.i);
      jx.rv = Jieqi.outerOf(JK, d.ri.j); out.rv = jx.rv.v;
    } else if (p.h && p.t === '?') return null;
    if (d.wc && q && q.s === mySide && q.h) { jx.cr = Jieqi.innerOf(JK, q.hi); out.cj = jx.cr.j; }
    lastJx = jx;
    Net.send(jx);
    return out;
  }
  // 我方走子后收到对手的揭示
  function jqResolve(d) {
    const P = pendingJ;
    if (!P || d.n !== P.n || d.n !== game.history.length) return;
    const m = { from: P.m.from, to: P.m.to }, opp = other(mySide);
    if (P.needRv) {
      if (!d.rv || d.rv.j !== P.ri.j || typeof d.rv.v !== 'string' || !'rneacp'.includes(d.rv.v) || d.rv.v.length !== 1) return;
      if (!Jieqi.checkOut(JK.gid, mySide, JC.cout[mySide], d.rv)) jqWarn('翻出的兵种');
      m.rv = d.rv.v;
    }
    if (P.needCr) {
      const q = game.at(m.to[0], m.to[1]);
      if (!d.cr || !q || !Jieqi.okIdx(d.cr.j)) return;
      if (d.cr.i !== q.hi || !Jieqi.checkIn(JK.gid, opp, JC.cin[opp], d.cr)) jqWarn('被吃暗子');
      jqNoteSlot(opp, d.cr.j, q.hi);
      q.t = JK.outer.arr[d.cr.j]; // 只有我知道
      m.cj = d.cr.j;
    }
    pendingJ = null;
    doMove(m, false, undefined, true);
    if (!jqCountOk(mySide) || !jqCountOk(opp)) jqWarn('兵种数量');
  }
  setInterval(() => {
    if (!pendingJ || !online()) return;
    if (Net.peerState === 'ok' && performance.now() - pendingJ.sent > 3500) { pendingJ.sent = performance.now(); Net.send(pendingJ.msg); }
  }, 1000);

  // ---------- 走子 ----------
  function canAct() {
    if (watching()) return false;
    if (!started || ended || busy || game.result || pendingUndo || pendingJ) return false;
    if (game.jq && !jqReady()) return false;
    if (mode === 'local') return true;
    if (vsAI()) return !aiBoth() && game.turn === mySide && !aiThinking;
    if (hostBot()) return false;   // 房主在观战席，他那一方电脑在走
    return Net.connected && game.turn === mySide;
  }
  function doMove(m, remote = false, clk, sent = false) {
    // 联机揭棋：走自己的未知暗子、或吃对方的未知暗子，先请对方揭示，收到后再落子
    if (!remote && !sent && jqOn()) {
      const p = game.at(m.from[0], m.from[1]), q = game.at(m.to[0], m.to[1]);
      const needRv = !!(p && p.h && p.t === '?'), needCr = !!(q && q.h && q.t === '?');
      if (needRv || needCr) {
        if (!JK || !game.isLegal(m)) return false;
        const n = game.history.length;
        const msg = { t: 'move', n, from: m.from.slice(), to: m.to.slice(), clk: clock[game.turn] };
        if (needRv) msg.ri = Jieqi.innerOf(JK, p.hi);
        if (needCr) msg.wc = 1;
        pendingJ = { m: { from: m.from.slice(), to: m.to.slice() }, n, msg, ri: msg.ri, needRv, needCr, sent: performance.now() };
        Net.send(msg);
        sel = null; selMoves = [];
        Board.showMoves(m.from, [{ from: m.from, to: m.to }], true);
        Sfx.lift();
        updateHud();
        return true;
      }
    }
    pendTo = null;
    const rv0 = (() => { const p = game.at(m.from[0], m.from[1]); return p && p.h ? (p.t !== '?' ? p.t : m.rv) : null; })();
    const note = noteOf(game.board, m, rv0);
    ktInit();
    const kt0 = { side: game.turn, pc: game.at(m.from[0], m.from[1]), cap: game.at(m.to[0], m.to[1]), chk: game.inCheck() };
    const info = game.play(m);
    if (!info) return false;
    ktBefore(kt0.side, kt0.pc, m.from, m.to, kt0.cap, kt0.chk);
    jqLearn(game.history[game.history.length - 1]);
    if (info.captured && game.history[game.history.length - 1].cap) info.captured = { ...game.history[game.history.length - 1].cap };
    info.dt = capView(info);
    if (info.captured) info.streak = captureStreak();
    // 将死：认一下是哪种杀法（重炮、马后炮……），绝杀大字下面要写
    if (info.result && info.result.reason === 'checkmate') info.mateName = XQ.mateName(game.board, info.result.loser, { to: m.to, cap: info.captured });
    notes.push(note); renderLog();
    Fx.ply = game.history.length;
    if (!remote && !sent && online()) Net.send({ t: 'move', n: info.ply, from: m.from, to: m.to, clk: clock[info.mover] });
    if (remote && clk != null) clock[info.mover] = clk;
    clock.step = stepMax(); clock.oppStamp = 0;
    Board.clearMoves(); sel = null; selMoves = [];
    turnStartAt = 0;
    queueAnim(info);
    updateHud(); publish();
    // 电脑在玩家的动画播放时就开始思考
    if ((vsAI() || hostBot()) && !info.result && isAI(game.turn)) maybeAI();
    return true;
  }
  // 连吃：同一方连续吃子、期间对方没吃回（对方一吃回就清零）
  function captureStreak() {
    let side = null, n = 0;
    for (let i = game.history.length - 1; i >= 0; i--) {
      const h = game.history[i]; if (!h.cap) continue;
      const s = i % 2 ? 'b' : 'r';
      if (side === null) side = s;
      if (s !== side) break;
      n++;
    }
    return n;
  }
  // 动画里被吃的子显示成什么：揭棋暗子只有联机的吃子方看得到真身
  function capView(info) {
    const c = info.captured; if (!c) return null;
    if (!c.h) return c.t;
    return online() && c.s !== mySide && c.t !== '?' ? c.t : '?';
  }
  function queueAnim(info) {
    busy++;
    $('skip').classList.remove('hidden'); $('skip').textContent = '跳过 ▸▸';
    anim = anim.then(async () => {
      await Fx.playMove(info);
      Board.showLast(info.from, info.to);
    }).catch(e => console.error(e)).then(() => {
      busy--;
      Core.Time.skip = false;
      if (!busy) $('skip').classList.add('hidden');
      clock.step = stepMax(); clock.last = performance.now();
      if (online() && game.turn === mySide) Net.send({ t: 'clk', side: mySide, total: clock[mySide], step: clock.step });
      const caps = game.history.filter(h => h.cap).length;
      Sfx.Music.setIntensity(game.result ? 1 : game.inCheck() ? 0.95 : Math.min(0.72, 0.32 + caps * 0.03));
      afterMoveLines(info);
      if (info.captured) Spect.react(info.mover);
      if (!busy && game.turn === mySide) { turnStartAt = performance.now(); slowIdx = 0; }
      updateHud();
      if (info.result && !busy) endOrGrace(info.result);
      else if (!busy) localFlip();
    });
  }

  // ---------- 终局：棋盘上的收官演出，再进入历史结算 ----------
  async function boardFinale(result) {
    if (!result.winner) {
      // 和棋：鸿沟为界，两军各自收兵
      banner('鸿沟为界', '四十回合未见杀伐 · 和局', 3000);
      Sfx.B.gong(0, 0.8); Camp.cheer('r', 4, 0.8); Camp.cheer('b', 4, 0.8);
      await Core.sleep(3);
      return;
    }
    const loser = result.loser, winner = result.winner;
    const kp = game.kingPos(loser);
    if (!kp) return;
    const km = [...Board.pieces.values()].find(x => x.userData.t === 'k' && x.userData.s === loser);
    const center = Board.pos(kp[0], kp[1]);
    const cine = Fx.level === 'cine';
    const toWin = new THREE.Vector3(0, 0, loser === 'r' ? -1 : 1);
    let faceYaw;
    if (cine) {
      faceYaw = Math.atan2(toWin.x, toWin.z);
      document.body.classList.add('cine');
      const side = new THREE.Vector3(1, 0, 0);
      Core.Cam.to(center.clone().addScaledVector(toWin, 3.4).addScaledVector(side, 1.6).add(new THREE.Vector3(0, 1.9, 0)), center.clone().add(new THREE.Vector3(0, 0.35, 0)), 1.6, undefined, true);
    } else {
      const cp = Core.Cam.pos.clone();
      // 正上方看时镜头几乎就在头顶，水平方向只差一点点，算出来的朝向是乱的：改用我方所在的那一边
      const flat = cp.clone().sub(center); flat.y = 0;
      if (flat.length() < 1) flat.copy(Core.Cam.homeDir());
      faceYaw = Math.atan2(flat.x, flat.z);
      // 精简档：终局时镜头缓缓推近败方主帅（低特效不动）
      if (Fx.level === 'std') {
        const d = flat.clone().normalize();
        Core.Cam.to(center.clone().addScaledVector(d, 4.6).add(new THREE.Vector3(0, 3.6, 0)), center.clone().add(new THREE.Vector3(0, 0.3, 0)), 2.6, undefined, true);
      }
    }
    if (km) Fx.sink(km);
    const mate = result.reason === 'checkmate' || result.reason === 'stalemate';
    const tSur = mate ? Camp.surround(winner, center) : (Camp.cheer(winner, 6, 1.3), 0);
    setTimeout(() => Camp.rout(loser), 600);
    const t0 = performance.now();
    try { await Squads.heroDefeat(loser, center, faceYaw, g => { finaleHero = g; }); } catch (e) { console.error(e); }
    if (endSkip) return;
    if (vsAI()) await aiSay(winner === aiSide() ? 'win' : 'lose');
    if (endSkip) return;
    const el = (performance.now() - t0) / 1000;
    await Core.sleep(Math.max(1.2, tSur - el + 0.8));
    if (endSkip) return;
    if (cine) { await Core.Cam.to(center.clone().addScaledVector(toWin, 5.5).add(new THREE.Vector3(0, 4.2, 0)), center.clone().add(new THREE.Vector3(0, 0.3, 0)), 2.2); }
    else await Core.sleep(0.8);
  }
  let endSkip = false, endSkipRes = null;
  // 人机对战输了（被将死、困毙、主帅阵亡、九宫失守）：先不进结算，10 秒内还能悔棋（Ham 10-10 12:09）。悔棋次数用完、电脑对电脑、超时认输不算
  let graceTok = 0;
  const GRACE_T = { checkmate: '被 将 死 了', stalemate: '困 毙', kingdead: '主 帅 阵 亡', occupy: '九 宫 失 守' };
  function graceOk(r) {
    if (!r || !r.winner || r.winner === mySide || !GRACE_T[r.reason]) return false;
    if (!vsAI() || aiBoth() || watching() || RP || !opts.undo) return false;
    if (opts.undo < 99 && undoUsed[mySide] >= opts.undo) return false;
    return game.history.length >= undoPlies(mySide);
  }
  async function endOrGrace(r) {
    if (!graceOk(r)) { finishGame(r); return; }
    const tok0 = ++graceTok;
    // 先让「绝杀」大字放完、镜头回到棋盘上方，让人看清怎么输的，再开始倒计时
    await Core.sleep(2.6);
    if (tok0 !== graceTok || ended || !game.result) return;
    try { if (Core.Cam.cine) { document.body.classList.remove('cine'); await Core.Cam.home(0.7); } } catch (e) { }
    if (tok0 !== graceTok || ended || !game.result) return;
    const tok = graceTok, S0 = +Core.DIAG.get('grace') || 10;   // ?grace=60：测试用，慢机器上拉长
    const done = y => {
      if (tok !== graceTok) return; graceTok++;
      if (ended || !game.result) return;
      if (y) { const plies = undoPlies(mySide); cancelAI(); applyUndo(plies, mySide); aiSay('undo'); }
      else finishGame(r);
    };
    const left = opts.undo >= 99 ? '' : `（悔棋还剩 ${opts.undo - undoUsed[mySide]} 次）`;
    ask(GRACE_T[r.reason], `${S0} 秒内还可以悔棋，悔回去接着下${left}；不悔就进结算。`, S0, '悔 棋', '认 输', 'e-grace', n => `还剩 ${n} 秒`).then(done);
    setTimeout(() => done(false), (S0 + 1.5) * 1000);   // 提示框万一被别的关掉，也照样进结算
  }
  function finishGame(result) {
    graceTok++;
    if (ended) return;
    ended = true; endSkip = false;
    const skipP = new Promise(r => { endSkipRes = r; });
    cancelAI(); setPause(null);
    closeAsk(); Board.clearMoves();
    if (result && result.reason === 'timeout') { try { Fx.mateSplash('超时', result.loser); } catch (e) { } }   // 超时判负也出大字
    updateHud(); publish(); saveResume(true);
    $('skip').classList.remove('hidden'); $('skip').textContent = '跳过结算 ▸▸';
    anim = anim.then(async () => {
      await Promise.race([Core.sleep(0.8), skipP]);
      // 决战里主帅是在棋盘上被当场斩杀的：不再演败方主帅跪地、围营那套结算，直接出结果
      const slain = result && result.reason === 'kingdead';
      if (slain) await Promise.race([Core.sleep(2.6), skipP]);
      else if (!endSkip) { try { await Promise.race([boardFinale(result), skipP]); } catch (e) { console.error(e); } }
      Core.Time.skip = false; endSkipRes = null;
      Sfx.Music.stop();
      const persp = mode === 'local' || watching() || aiBoth() || !result.winner ? 'win' : (result.winner === mySide ? 'win' : 'lose');
      const W = watching();
      // 联机（含观战）和人机：结算曲分汉、楚（EndTunes；Ham 10-09 审批台 td-004 选 A：联机 + 人机，本地双人照旧）。
      //   胜 → 胜方的曲子；败 → 自己这方的。曲子挑定前照旧放原来那两首
      const tune = (mode === 'host' || mode === 'guest' || mode === 'ai' || W) && result.winner ? { side: persp === 'win' ? result.winner : mySide } : null;
      await Ending.play(result, {
        again: W ? () => { Ending.hideCard(); toast('等待棋手开新局…'); } : requestAgain, againText: W ? '继 续 观 战' : '',
        lobby: toLobby, persp, tune, instant: endSkip || slain, review: reviewOpen,
        extra: watching() ? [] : [{ text: '保 存', fn: () => openSave() }],   // 结算卡：复盘（带分析，Ham 10-10 13:32 合成一个）· 保存
        mine: mode === 'local' || W || aiBoth() || !result.winner ? '' : (persp === 'win' ? '你 胜 了' : '你 败 了'),
      });
      if (pendingRestart) { const st = pendingRestart; pendingRestart = null; restart(st === true ? undefined : st); if (mode === 'host') Net.send({ t: 'restart', state: snapshot() }); }
    });
  }
  function requestAgain() {
    if (mode === 'local' || vsAI()) { restart(); return; }
    if (mode === 'host') { restart(); Net.send({ t: 'restart', state: snapshot() }); }
    else { Net.send({ t: 'again' }); toast('已请求再来一局…'); }
  }
  let pendingRestart = null;
  function restart(state) {
    anaTok++;   // 正在分析的停下
    if (RP) exitReplay(true);
    Ending.hideCard(); Core.Time.skip = false; pendingJ = null;
    startGame(mode, mySide, mode !== 'host' && state && state.opts ? state.opts : opts, { state, intro: true });   // 再来一局：客人、观众都用房主带来的选项（规则记号在里面）
    if (mode === 'host') publish();
  }
  // ---------- 复盘：终局后从第一步起逐步回看整盘棋（各模式通用） ----------
  let RP = null;
  const rpSteps = g => (g.bf ? g.entries.length : g.history.length);
  function rpBuild(k) {
    const real = RP.real;
    let g;
    if (real.bf) { g = new BF.Game(); g.reset(real.base); for (let i = 0; i < k; i++) if (!g.apply(real.entries[i])) break; }
    else { g = new XQ.Game(real.opts); for (let i = 0; i < k; i++) { const h = real.history[i]; if (!g.play({ from: h.from, to: h.to, rv: h.rv, cj: h.cj })) break; } }
    return g;
  }
  function rpShow(k) {
    RP.k = k; game = rpBuild(k);
    Fx.clearMarks(); Board.setPosition(game); Board.faceViewer(viewSide); Board.clearMoves(); Fx.ply = game.history.length;
    const last = game.history[game.history.length - 1];
    Board.showLast(last && last.from ? last.from : null, last && last.to ? last.to : null);
    rebuildNotes(); rpPaint(); updateHud(); anaFollow();
  }
  async function rpStep() {
    if (!RP || RP.busy || RP.k >= RP.n) return;
    RP.busy = true; rpPaint();
    try {
      if (game.bf) {
        const e = RP.real.entries[RP.k], note = bfNote(game, e), info = game.apply(e);
        if (info) { RP.k++; rebuildNotes(); updateHud(); await BFX.play(info, BF.view(info.after)); Board.reconcile(game); if (info.from && info.k !== 'up') Board.showLast(info.from, info.to || info.from); }
      } else {
        const h = RP.real.history[RP.k];
        const info = game.play({ from: h.from, to: h.to, rv: h.rv, cj: h.cj });
        if (info) {
          if (info.captured && game.history[game.history.length - 1].cap) info.captured = { ...game.history[game.history.length - 1].cap };
          info.dt = capView(info); RP.k++; Fx.ply = game.history.length; rebuildNotes(); updateHud();
          await Fx.playMove(info); Board.showLast(info.from, info.to);
        }
      }
    } catch (err) { console.error(err); }
    Core.Time.skip = false; Core.Time.scale = 1; Core.Cam.cine = false; document.body.classList.remove('cine');
    if (RP) { RP.busy = false; rpPaint(); updateHud(); anaFollow(); }
  }
  async function rpPlay() {
    if (!RP) return;
    RP.playing = !RP.playing; rpPaint();
    while (RP && RP.playing && RP.k < RP.n) { await rpStep(); await new Promise(r => setTimeout(r, 450)); }
    if (RP) { RP.playing = false; rpPaint(); }
  }
  function rpPaint() {
    if (!RP) return;
    $('rpInfo').textContent = `第 ${RP.k} / ${RP.n} 步`;
    $('rpBar').querySelector('[data-rp="play"]').textContent = RP.playing ? '❚❚ 暂停' : '▶ 播放';
    $('rpBar').querySelectorAll('[data-rp]').forEach(b => { const a = b.dataset.rp; b.disabled = a !== 'exit' && a !== 'play' && RP.busy || ((a === 'prev' || a === 'first') && RP.k === 0) || ((a === 'next' || a === 'last') && RP.k >= RP.n); });
  }
  // 复盘和分析合成一个按钮（Ham 10-10 13:32）：进复盘就把分析面板一起打开；揭棋看不见暗子，只复盘。复盘条上「分析」可以收起 / 再打开
  function reviewOpen() { if (anaOk(game)) anaOpen(); else startReplay(); }
  reviewOpen.label = '复 盘';
  function startReplay(quiet) {
    if (RP || !game) return;
    Ending.hideCard();
    clearFinale(); Camp.reset();
    Core.Cam.moveId = (Core.Cam.moveId || 0) + 1; Core.Cam.cine = false; document.body.classList.remove('cine');
    RP = { real: game, k: 0, n: rpSteps(game), busy: false, playing: false };
    $('rpBar').classList.remove('hidden'); $('rpBar').querySelector('[data-rp="ana"]').classList.toggle('hidden', !anaOk(game));
    $('hud').classList.remove('hidden');
    setView(viewSide);
    rpShow(0);
    if (quiet !== true) toast('复盘：用下方按钮逐步前进、后退或自动播放', 2600);
  }
  async function exitReplay(silent) {
    if (!RP) return;
    const real = RP.real; RP.playing = false;
    while (RP && RP.busy) await new Promise(r => setTimeout(r, 100));
    RP = null; $('rpBar').classList.add('hidden'); anaClose();
    game = real; Fx.clearMarks(); Board.setPosition(game); Board.faceViewer(viewSide); rebuildNotes(); updateHud();
    if (savedView) { toLobby(); return; }   // 「我的棋局」进来的复盘：退出就回大厅
    if (!silent) $('endcard').classList.remove('hidden');
  }
  $('rpBar').addEventListener('click', e => {
    const b = e.target.closest('[data-rp]'); if (!b || !RP || b.disabled) return;
    const a = b.dataset.rp; Sfx.select && Sfx.select();
    if (a === 'exit') exitReplay(false);
    else if (a === 'ana') { if ($('ana').classList.contains('hidden')) anaOpen(); else anaClose(); rpAnaBtn(); }
    else if (a === 'play') rpPlay();
    else if (RP.busy) return;
    else if (a === 'next') rpStep();
    else if (a === 'prev') rpShow(Math.max(0, RP.k - 1));
    else if (a === 'first') rpShow(0);
    else if (a === 'last') rpShow(RP.n);
  });

  // ---------- 对局分析（Ham 10-09 22:36）：结算界面「分析」——局势曲线、每步电脑认为最好的走法、哪步是错棋 ----------
  //   做法：把每一步走之前的局面交给电脑各算一遍（标准象棋用人机引擎，技能模式用技能电脑），得到「这一方最好的一步」和局面分 V（轮到的一方看）。
  //   第 i 步损失 = V(走之前) + V(走之后，对方看)：走了最好的一步损失约 0，走坏了对方的分涨上来。按损失分五档：最佳 / 好棋 / 缓着 / 失误 / 错棋
  //   技能模式按「一回合」算（升级 + 主行动 + 拒马算一回合）。揭棋看不见暗子，不做分析
  const ANA = {
    std: { cut: [0, 20, 50, 120], scale: 300, cap: 1500, time: 450 },     // 引擎分：车约 200、马炮约 90、兵 10～40
    bf: { cut: [0, 0.5, 1.2, 3], scale: 6, cap: 40, time: 0 },            // 技能电脑的分：车 9、马炮 4 多、兵 1 多
    tags: ['最佳', '好棋', '缓着', '失误', '错棋'], cls: ['best', 'good', 'slow', 'miss', 'err'],
  };
  let anaTok = 0;
  const anaOk = g => !!g && !g.jq;
  // 每一步（技能模式是每一回合）：{ side, note, k0（从第几条记录起）, k1（到第几条为止，复盘用）, mv（主行动，画线用） }
  function anaSteps(real) {
    const out = [];
    if (real.bf) {
      const g = new BF.Game(); g.reset(real.base); let cur = null;
      real.entries.forEach((e, i) => {
        if (!cur) cur = { side: g.turn, notes: [], k0: i, S: BF.cloneState(g.S), mv: null };
        cur.notes.push(bfNote(g, e));
        if (e.k !== 'up') cur.mv = e.from ? { from: e.from, to: e.to } : e.at ? { from: e.at, to: e.to || e.at } : cur.mv;
        if (!g.apply(e)) return;
        if (g.ends[g.ends.length - 1]) { cur.k1 = i + 1; cur.note = cur.notes.join(' '); out.push(cur); cur = null; }
      });
      if (cur) { cur.k1 = real.entries.length; cur.note = cur.notes.join(' '); out.push(cur); }
      out.endS = BF.cloneState(g.S);
    } else {
      const g = real.jq ? new XQ.Game(real.opts) : new XQ.Game();
      real.history.forEach((h, i) => { out.push({ side: g.turn, note: noteOf(g.board, h, h.rv), k0: i, k1: i + 1, mv: { from: h.from, to: h.to } }); g.play({ from: h.from, to: h.to, rv: h.rv }); });
    }
    return out;
  }
  // 算一个局面：{ v（轮到的一方看）, best（主行动 from/to）, bestNote }
  async function anaPos(real, steps, i) {
    if (real.bf) {
      const S = i < steps.length ? steps[i].S : steps.endS;
      const g = new BF.Game(); g.reset(BF.cloneState(S));
      if (g.status.result) return { v: -9000, over: true };
      const seq = await bfThink(BF.cloneState(S), 'ana', async () => { });
      const st = bfThink.last || {};
      let note = [], best = null;
      for (const a of seq || []) { note.push(bfNote(g, a)); if (a.k !== 'up') best = a.from ? { from: a.from, to: a.to } : a.at ? { from: a.at, to: a.to || a.at } : null; if (!g.apply(a)) break; }
      return { v: st.v || 0, best, bestNote: note.filter(Boolean).join(' ') };
    }
    const moves = real.history.slice(0, i).map(h => ({ from: h.from, to: h.to }));
    const r = await AI.analyzePos(moves, ANA.std.time);
    if (!r || r.over) return { v: -10000, over: true };
    let bestNote = '';
    if (r.best) { const g = new XQ.Game(); for (const h of real.history.slice(0, i)) g.play({ from: h.from, to: h.to }); bestNote = notation(g.board, r.best); }
    return { v: r.score, best: r.best, bestNote };
  }
  function anaOpen() {
    const real = RP ? RP.real : game;
    if (!anaOk(real)) { toast('揭棋看不见暗子，这一局没法分析'); return; }
    if (!RP) startReplay(true);
    $('ana').classList.remove('hidden'); document.body.classList.add('anaOn'); rpAnaBtn();
    // 面板挡住一边：电脑上棋盘往左让一点，手机上往上让一点
    document.body.classList.toggle('anaWide', ANAV === 1 || ANAV === 3);
    anaFit(true); setTimeout(() => anaFit(), 700);
    if (!real.__ana) anaStart(real); else anaPaint();
  }
  // 面板挡住一块：把整张棋盘挪进空着的那块、必要时缩小一点（量棋盘四角投到屏幕上的位置算）。soft = 先按估计直接放好，不动画
  function anaFit(soft) {
    const el = $('ana'); if (!el || el.classList.contains('hidden')) return;
    const W = innerWidth, H = innerHeight, b = el.getBoundingClientRect(), bar = $('rpBar').getBoundingClientRect();
    let R = { l: 8, t: 64, r: W - 8, b: (bar.height ? bar.top : H) - 8 };
    const side = b.left > W * 0.45 && b.height > H * 0.4;   // 右侧一栏
    if (side) R.r = b.left - 10; else R.b = Math.min(R.b, b.top - 8);
    if (ANAV === 3) { const c = [$('anaCur'), $('anaDet')].find(x => !x.classList.contains('hidden')); if (c && W > 760) R.r = Math.min(R.r, c.getBoundingClientRect().left - 8); }
    if (W <= 760) { R.t = 96; if (ANAV === 3) { const c = !$('anaCur').classList.contains('hidden') ? $('anaCur') : $('anaDet').classList.contains('demo') ? $('anaDet') : null; if (c) R.t = Math.max(R.t, c.getBoundingClientRect().bottom + 6); } }   // 手机上详解那张大卡片盖在棋盘上看，演示时缩成一行再让开
    const cam = Core.camera, keep = Core.shiftNow; Core.viewShift(0, 0, 1); cam.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [f, r] of [[0, 0], [8, 0], [0, 9], [8, 9]]) { const p = Board.pos(f, r); for (const d of [-0.6, 0.6]) for (const e of [-0.6, 0.6]) for (const y of [0, 0.5]) { const v = p.clone().add(new THREE.Vector3(d, y, e)).project(cam); const x = (v.x + 1) / 2 * W, yy = (1 - v.y) / 2 * H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); } }
    const z = Math.max(1, (x1 - x0) / Math.max(80, R.r - R.l), (y1 - y0) / Math.max(80, R.b - R.t));
    const offX = (x0 + x1) / 2 - (R.l + R.r) / 2 * z, offY = (y0 + y1) / 2 - (R.t + R.b) / 2 * z;
    const to = [(offX + W * (z - 1) / 2) / W, (offY + H * (z - 1) / 2) / H, z];
    if (soft) { Core.viewShift(...to); return; }
    Core.viewShift(...keep);
    const from = keep; Core.tween(0.35, k => Core.viewShift(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k), Core.ease.inOut);
  }
  window.addEventListener('resize', () => setTimeout(() => anaFit(), 300));
  const rpAnaBtn = () => { const b = $('rpBar').querySelector('[data-rp="ana"]'); if (b) { const on = !$('ana').classList.contains('hidden'); b.textContent = on ? '收起分析' : '分 析'; b.classList.toggle('on', on); } };
  function anaClose() { anaTok2++; anaDet = null; anaDetPaint(); $('ana').classList.add('hidden'); document.body.classList.remove('anaOn', 'anaWide'); Board.showStep(null); Core.viewShift(0, 0); rpAnaBtn(); }
  async function anaStart(real) {
    const tok = ++anaTok, M = real.bf ? ANA.bf : ANA.std;
    const steps = anaSteps(real), n = steps.length;
    const A = real.__ana = { steps, V: new Array(n + 1).fill(null), done: 0, n, bf: !!real.bf, sel: -1 };
    anaPaint();
    for (let i = 0; i <= n; i++) {
      let r;
      try { r = await anaPos(real, steps, i); } catch (e) { console.error(e); r = { v: 0 }; }
      if (tok !== anaTok || real.__ana !== A) return;   // 已经换了一局 / 关掉了
      A.V[i] = r;
      if (i < n) { steps[i].best = r.best; steps[i].bestNote = r.bestNote; }
      if (i > 0) anaGrade(A, i - 1, M);
      A.done = i + 1; anaPaint();
    }
  }
  // 给第 i 步打分：损失 = V(i) + V(i+1)（分数先压到 ±cap，杀棋算到头）
  function anaGrade(A, i, M) {
    const c = v => Math.max(-M.cap, Math.min(M.cap, v)), s = A.steps[i];
    const loss = c(A.V[i].v) + c(A.V[i + 1].v);
    const same = s.best && s.mv && s.best.from[0] === s.mv.from[0] && s.best.from[1] === s.mv.from[1] && s.best.to[0] === s.mv.to[0] && s.best.to[1] === s.mv.to[1];
    let g = 4; for (let k = 1; k < 4; k++) if (loss <= M.cut[k]) { g = k; break; }
    if (same && g <= 2) g = 0;   // 走的就是电脑认为最好的那步
    s.loss = loss; s.grade = g;
  }
  // 局势：汉（红）方看的优势，压到 -1..1
  const anaAdv = (A, i) => { const r = A.V[i]; if (!r) return null; const side = i < A.steps.length ? A.steps[i].side : (A.steps.length ? (A.steps[A.steps.length - 1].side === 'r' ? 'b' : 'r') : 'r'); const M = A.bf ? ANA.bf : ANA.std; const v = (side === 'r' ? 1 : -1) * r.v; return Math.tanh(v / M.scale); };
  // 面板四种样子（Ham 10-09 审批台 td-011：再做几个和天天象棋不一样的设计）。网址 ?anav=0/1/2/3 预览，选定后改默认值
  //   0 侧栏（原来那版）/ 1 战报长卷（底部横卷：水墨局势 + 一根根竹简）/ 2 古谱朱批（米黄纸页，竖排记谱，朱笔圈点）/ 3 沙盘兵势（棋盘不挡：底部一条兵势河 + 军情签）
  const ANAV = Math.max(0, Math.min(3, +(Core.DIAG.get('anav') || 3)));   // Ham 10-10 审批台 td-012 选了方案三（沙盘兵势）
  const ANA1 = ['佳', '好', '缓', '失', '错'], ANA2 = ['◎', '○', '、', '△', '✕'];
  function anaCurve(A, W, H, pad = 6) {   // 局势曲线的点（汉优在上）
    const n = Math.max(1, A.n), X = i => pad + (W - pad * 2) * i / n, Y = a => H / 2 - a * (H / 2 - 4);
    const pts = []; for (let i = 0; i <= A.n; i++) { const a = anaAdv(A, i); if (a == null) break; pts.push([X(i), Y(a)]); }
    return { pts, X, Y };
  }
  function anaPaint() {
    const real = RP ? RP.real : game, A = real && real.__ana; if (!A) return;
    const SN = { r: SIDE_CN.r, b: SIDE_CN.b }, el = $('ana');
    el.classList.remove('v0', 'v1', 'v2', 'v3'); el.classList.add('v' + ANAV);
    $('anaProg').textContent = A.done > A.n ? `共 ${A.n} ${A.bf ? '回合' : '步'}` : `分析中 ${A.done} / ${A.n + 1}…`;
    // 汇总：每方各档几步、准确率（最佳 + 好棋占多少）
    const sum = { r: [0, 0, 0, 0, 0], b: [0, 0, 0, 0, 0] };
    for (const s of A.steps) if (s.grade != null) sum[s.side][s.grade]++;
    const acc = s => { const t = sum[s].reduce((a, b) => a + b, 0); return t ? Math.round((sum[s][0] + sum[s][1]) / t * 100) : null; };
    const no = i => A.bf ? `${i + 1}` : `${Math.floor(i / 2) + 1}${A.steps[i].side === 'r' ? '' : '′'}`;
    if (ANAV === 1) $('anaSum').innerHTML = ['r', 'b'].map(s => `<div class="lp ${s}"><b>${SEAL[s]}</b><span>${acc(s) == null ? '—' : acc(s) + '<small>%</small>'}</span><em>准确率</em><i>${ANA1.map((x, g) => sum[s][g] ? `${x}${sum[s][g]}` : '').filter(Boolean).join(' ')}</i></div>`).join('');
    else if (ANAV === 2) $('anaSum').innerHTML = ['r', 'b'].map(s => `<div class="sl ${s}"><b>${SN[s]}</b><span>${acc(s) == null ? '—' : acc(s)}</span></div>`).join('') + `<div class="lgd">${ANA2.map((x, g) => `<i class="m${g}">${x}</i>${ANA.tags[g]}`).join(' ')}</div>`;
    else if (ANAV === 3) $('anaSum').innerHTML = ['r', 'b'].map(s => `<div class="bd ${s}"><b>${SN[s]}</b>${acc(s) == null ? '—' : acc(s) + '%'}</div>`).join('');
    else $('anaSum').innerHTML = ['r', 'b'].map(s => { const t = sum[s].reduce((a, b) => a + b, 0);
      return `<div class="as ${s}"><b>${SN[s]}方</b><span class="acc">${t ? acc(s) + '%' : '—'}</span><small>准确率</small>` + ANA.tags.map((x, g) => sum[s][g] ? `<i class="g${g}">${x} ${sum[s][g]}</i>` : '').join('') + '</div>'; }).join('');
    // 局势
    let svg = '', W = 360, H = 112;
    if (ANAV === 1) {
      // 水墨长卷：汉优的一侧朱色晕染、楚优的一侧墨色晕染，曲线是一笔飞白；错棋盖一方小朱印
      W = 900; H = 96; const { pts, X } = anaCurve(A, W, H, 10);
      svg = `<defs><filter id="anaBr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
        <linearGradient id="anaGR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8321f" stop-opacity=".9"/><stop offset="1" stop-color="#b8321f" stop-opacity=".25"/></linearGradient>
        <linearGradient id="anaGB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1c1a17" stop-opacity=".9"/><stop offset="1" stop-color="#1c1a17" stop-opacity=".25"/></linearGradient></defs>
        <line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="rv"/><text x="${W - 8}" y="${H / 2 - 4}" class="rt" text-anchor="end">漢　界</text><text x="${W - 8}" y="${H / 2 + 13}" class="rt" text-anchor="end">楚　河</text>`;
      if (pts.length > 1) {
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H / 2} L${pts[0][0].toFixed(1)} ${H / 2} Z`;
        svg += `<clipPath id="anaTop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="anaBot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath>`;
        svg += `<path d="${area}" fill="url(#anaGR)" clip-path="url(#anaTop)" filter="url(#anaBr)"/><path d="${area}" fill="url(#anaGB)" clip-path="url(#anaBot)" filter="url(#anaBr)"/><path d="${line}" class="ln" filter="url(#anaBr)"/>`;
      }
      A.steps.forEach((s, i) => { if (s.grade >= 3 && pts[i + 1]) { const [x, y] = pts[i + 1]; svg += `<g class="st${s.grade}" transform="translate(${x.toFixed(1)} ${(y - 15).toFixed(1)})"><rect x="-7" y="-7" width="14" height="14" rx="1.5"/><text y="4.2" text-anchor="middle">${ANA1[s.grade]}</text></g>`; } });
      if (A.sel >= 0 && A.sel <= A.n) svg += `<line x1="${X(A.sel).toFixed(1)}" x2="${X(A.sel).toFixed(1)}" y1="2" y2="${H - 2}" class="cur"/>`;
    } else if (ANAV === 2) {
      // 天头：一条细带，每一步一格，朱（汉优）—— 米色 —— 墨（楚优）；错棋、失误在格子下面点一个朱点
      W = 360; H = 22; const n = Math.max(1, A.n), w = (W - 4) / n;
      for (let i = 0; i < A.n; i++) { const a = anaAdv(A, i + 1); if (a == null) break; const c = a >= 0 ? `rgba(176,48,31,${(0.12 + 0.85 * a).toFixed(2)})` : `rgba(28,26,23,${(0.12 - 0.85 * a).toFixed(2)})`; svg += `<rect x="${(2 + i * w).toFixed(1)}" y="2" width="${(w + 0.3).toFixed(1)}" height="12" fill="${c}"/>`; const s = A.steps[i]; if (s.grade >= 3) svg += `<circle cx="${(2 + (i + 0.5) * w).toFixed(1)}" cy="18.5" r="${s.grade === 4 ? 2.6 : 2}" class="dot"/>`; }
      svg += `<rect x="2" y="2" width="${W - 4}" height="12" class="frame"/>`;
      if (A.sel >= 0) svg += `<rect x="${(2 + A.sel * w).toFixed(1)}" y="1" width="${Math.max(2, w).toFixed(1)}" height="14" class="cur"/>`;
    } else if (ANAV === 3) {
      // 兵势河：细细一条，红在上、绿在下；错棋处立一面小旗
      W = 900; H = 40; const { pts, X } = anaCurve(A, W, H, 4);
      svg = `<rect x="0" y="${H / 2 - 1}" width="${W}" height="2" class="rv"/>`;
      if (pts.length > 1) {
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H / 2} L${pts[0][0].toFixed(1)} ${H / 2} Z`;
        svg += `<clipPath id="anaTop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="anaBot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath>`;
        svg += `<path d="${area}" class="aR" clip-path="url(#anaTop)"/><path d="${area}" class="aB" clip-path="url(#anaBot)"/><path d="${line}" class="ln"/>`;
      }
      if (A.sel >= 0 && A.sel <= A.n) svg += `<line x1="${X(A.sel).toFixed(1)}" x2="${X(A.sel).toFixed(1)}" y1="0" y2="${H}" class="cur"/>`;
    } else {
      const { pts, X } = anaCurve(A, W, H, 6);
      svg = `<rect x="0" y="0" width="${W}" height="${H / 2}" class="bgR"/><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}" class="bgB"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="mid"/>`;
      if (pts.length > 1) {
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${H / 2} L${pts[0][0].toFixed(1)} ${H / 2} Z`;
        svg += `<clipPath id="anaTop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="anaBot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath>`;
        svg += `<path d="${area}" class="aR" clip-path="url(#anaTop)"/><path d="${area}" class="aB" clip-path="url(#anaBot)"/><path d="${line}" class="ln"/>`;
      }
      A.steps.forEach((s, i) => { if (s.grade >= 3 && pts[i + 1]) svg += `<circle cx="${pts[i + 1][0].toFixed(1)}" cy="${pts[i + 1][1].toFixed(1)}" r="${s.grade === 4 ? 4.2 : 3.4}" class="d${s.grade}"/>`; });
      if (A.sel >= 0 && A.sel <= A.n) svg += `<line x1="${X(A.sel).toFixed(1)}" x2="${X(A.sel).toFixed(1)}" y1="2" y2="${H - 2}" class="cur"/>`;
      svg += `<text x="6" y="14" class="lbR">${SN.r}优</text><text x="6" y="${H - 6}" class="lbB">${SN.b}优</text>`;
    }
    $('anaChart').innerHTML = svg; $('anaChart').setAttribute('viewBox', `0 0 ${W} ${H}`);
    // 每一步
    const xbtn = (i, g, txt = '详解') => g != null && (A.sel === i || g >= 3) ? `<button class="xb" data-xi="${i}" title="结合前后几步，讲清楚这步好在哪 / 错在哪、应该怎么走">${txt}</button>` : '';
    if (ANAV === 1) $('anaList').innerHTML = A.steps.map((s, i) => { const g = s.grade;   // 一根竹简：竖排记谱，底下一方小印
      return `<div class="ar sl ${s.side}${A.sel === i ? ' on' : ''}${g >= 3 ? ' bad' : ''}" data-i="${i}"><span class="no">${no(i)}</span><span class="mv">${s.note || ''}</span>${g == null ? '<i class="tg wait">·</i>' : `<i class="tg g${g}">${ANA1[g]}</i>`}${xbtn(i, g, '详')}</div>`; }).join('');
    else if (ANAV === 2) $('anaList').innerHTML = A.steps.map((s, i) => { const g = s.grade;   // 一行竖排：第几着、记谱，右边朱笔圈点，缓着以下夹注「宜 ……」
      const bm = g != null && g >= 2 && s.bestNote ? `<span class="bm">宜 ${s.bestNote}</span>` : '';
      return `<div class="ar ${s.side}${A.sel === i ? ' on' : ''}" data-i="${i}"><span class="no">${A.bf ? '第' + (i + 1) + '回' : (s.side === 'r' ? '第' + (Math.floor(i / 2) + 1) + '着' : '')}</span><span class="mv">${s.note || ''}</span>${g == null ? '' : `<i class="mk m${g}">${ANA2[g]}</i>`}${bm}${xbtn(i, g, '评')}</div>`; }).join('');
    else if (ANAV === 3) $('anaList').innerHTML = A.steps.map((s, i) => { const g = s.grade;   // 一枚兵符：颜色是评价，红 / 绿边是哪一方
      return `<div class="ar tk ${s.side}${A.sel === i ? ' on' : ''}" data-i="${i}" title="${no(i)} ${SN[s.side]} ${s.note}${g == null ? '' : ' · ' + ANA.tags[g]}">${g == null ? '' : `<i class="g${g}" data-c="${ANA1[g]}">${g >= 3 ? ANA1[g] : ''}</i>`}</div>`; }).join('');   // data-c：手机上选中的那枚放大后显示的字
    else $('anaList').innerHTML = A.steps.map((s, i) => {
      const g = s.grade, tag = g == null ? '<i class="tg wait">…</i>' : `<i class="tg g${g}">${ANA.tags[g]}</i>`;
      const bm = g != null && g >= 2 && s.bestNote ? `<span class="bm">应走 ${s.bestNote}</span>` : '';
      return `<div class="ar${A.sel === i ? ' on' : ''}" data-i="${i}"><span class="no">${A.bf ? i + 1 : Math.floor(i / 2) + 1}${A.bf ? '' : s.side === 'r' ? '.' : '…'}</span><span class="sd ${s.side}">${SN[s.side]}</span><span class="mv">${s.note || ''}</span>${tag}${xbtn(i, g)}${bm}</div>`;
    }).join('');
    // 沙盘兵势：选中的那一步单独一张军情签
    const cur = $('anaCur');
    if (ANAV === 3 && A.sel >= 0 && A.steps[A.sel] && !anaDet) {
      const s = A.steps[A.sel], g = s.grade;
      cur.innerHTML = `<div class="ch"><span class="sd ${s.side}">${SN[s.side]}</span><b>${no(A.sel)}</b> ${s.note}${g == null ? '' : `<i class="tg g${g}">${ANA.tags[g]}</i>`}</div>` + (g != null && g >= 2 && s.bestNote ? `<div class="cb">应走 <b>${s.bestNote}</b>（棋盘上墨绿的路）</div>` : g != null && g <= 1 ? '<div class="cb">和电脑想的一样或差不多。</div>' : '') + (g != null ? `<button class="xb" data-xi="${A.sel}">详解 ›</button>` : '');
      cur.classList.remove('hidden');
    } else cur.classList.add('hidden');
    if (ANAV === 3) { const vis = !cur.classList.contains('hidden') || !!anaDet; if (vis !== anaPaint.card) { anaPaint.card = vis; setTimeout(() => anaFit(), 30); } }
    const on = $('anaList').querySelector('.ar.on'); if (on && !anaPaint.noScroll) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  $('anaCur').addEventListener('click', e => { const xb = e.target.closest('[data-xi]'); if (xb) anaExplain(+xb.dataset.xi); });
  // 复盘走到哪一步，分析面板跟着亮哪一行，棋盘上画出这一步电脑认为最好的走法
  function anaFollow() {
    Board.showStep(null);
    if (!RP || $('ana').classList.contains('hidden')) return;
    const A = RP.real.__ana; if (!A) return;
    const i = A.steps.findIndex(s => s.k0 === RP.k);
    A.sel = i; const s = A.steps[i];
    if (s && s.best) Board.showStep({ from: s.best.from, to: s.best.to, seal: '佳' });
    anaPaint();
  }
  // 点某一步：棋盘回到这一步走之前，标出实际走的（落点框）和电脑认为最好的（墨绿的路 + 「佳」）
  function anaPick(i) {
    const real = RP ? RP.real : game, A = real && real.__ana; if (!A || !RP || RP.busy) return;
    const s = A.steps[i]; if (!s) return;
    if (anaDet && anaDet.i !== i) { anaTok2++; anaDet = null; anaDetPaint(); }
    anaPaint.noScroll = true; rpShow(s.k0); anaPaint.noScroll = false;
    if (s.mv) Board.showLast(s.mv.from, s.mv.to);
  }
  // ---------- 对局分析 · 详解（Ham 10-09 审批台 td-011：结合前后几步，讲清楚这步为什么错、最优解该怎么走） ----------
  //   标准象棋：引擎把这一局面细算一遍（explainPos）——最好一步往下的主变、实际走完后对方最狠的应法往下几步、
  //   “停一手”时对方想走什么（= 对方已经在威胁什么）。技能模式：技能电脑一回合一回合往下推三回合。
  //   然后顺着这几条线把每步走一遍，看谁吃了谁、将军、成杀，按模板写成话；棋盘上可以分别演示两条线。
  const XNM = { r: { k: '帅', a: '仕', e: '相', n: '马', r: '车', c: '炮', p: '兵' }, b: { k: '将', a: '士', e: '象', n: '马', r: '车', c: '炮', p: '卒' } };
  const XV = { r: 9, n: 4, c: 4.5, e: 2, a: 2, p: 1, k: 0 }, XCN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const xName = p => (p.lv > 1 ? XCN[p.lv - 1] + '级' : '') + XNM[p.s][p.t];
  const xVal = p => XV[p.t] + (p.lv > 1 ? (p.lv - 1) * 1.5 : 0);
  const xMat = v => v >= 12 ? '一个车还多' : v >= 8 ? '约一个车' : v >= 5.5 ? '一个马炮还多' : v >= 3.5 ? '约一个马（炮）' : v >= 1.6 ? '约一个相（仕）' : '约一个兵';
  // 顺着一串着法走（标准象棋），记下每步：谁走、记谱、吃了什么、将军、成杀
  function xStd(real, k, line) {
    const g = new XQ.Game(); for (const h of real.history.slice(0, k)) g.play({ from: h.from, to: h.to });
    const out = [];
    for (const m of line || []) {
      if (!m || g.result || !g.isLegal(m)) break;
      const side = g.turn, note = notation(g.board, m), info = g.play({ from: m.from, to: m.to });
      out.push({ side, note, mv: { from: m.from, to: m.to }, kills: info.captured ? [{ ...info.captured, lv: 1 }] : [], check: !info.result && g.inCheck(), mate: info.result && info.result.reason === 'checkmate' ? side : null });
      if (info.result) break;
    }
    return out;
  }
  // 技能模式：一回合一组行动
  function xBF(S0, seqs) {
    const g = new BF.Game(); g.reset(BF.cloneState(S0)); const out = [];
    for (const seq of seqs) {
      if (g.result || !seq || !seq.length) break;
      const side = g.turn, notes = [], kills = []; let mv = null;
      for (const a of seq) { const n = bfNote(g, a), info = g.apply(a); if (!info) break; notes.push(n); for (const k of info.kills || []) kills.push(k); if (a.k !== 'up') mv = a.from ? { from: a.from, to: a.to } : a.at ? { from: a.at, to: a.to || a.at } : mv; }
      out.push({ side, note: notes.filter(Boolean).join(' '), mv, seq, kills, check: !g.result && !!(g.status && g.status.check), mate: g.result && g.result.winner === side && g.result.reason !== 'timeout' ? side : null });
    }
    return out;
  }
  async function xPlanBF(S0, first, n) {   // 先走 first（可以没有），再让电脑双方各自往下走，共 n 回合
    const g = new BF.Game(); g.reset(BF.cloneState(S0)); const seqs = [];
    if (first) { for (const a of first) if (!g.apply(a)) break; seqs.push(first); }
    while (seqs.length < n && !g.result) {
      const seq = g.mustPass && g.mustPass() ? [{ k: 'pass' }] : await bfThink(BF.cloneState(g.S), 'ana', async () => { });
      if (!seq || !seq.length) break;
      let ok = true; for (const a of seq) if (!g.apply(a)) { ok = false; break; }
      seqs.push(seq); if (!ok) break;
    }
    return seqs;
  }
  // 一条线上，到第 h 步为止“我”净赚多少子力（吃对方 +，被吃 -）
  const xNet = (line, me, h = 99) => line.slice(0, h).reduce((a, st) => a + st.kills.reduce((b, k) => b + (k.s === me ? -1 : 1) * xVal(k), 0), 0);
  const xNotes = (line, a, b) => line.slice(a, b).map(st => st.note).join('，');
  let anaDet = null;
  async function anaExplain(i) {
    const real = RP ? RP.real : game, A = real && real.__ana; if (!A) return;
    const s = A.steps[i]; if (!s || s.grade == null) return;
    const tok = ++anaTok2, M = A.bf ? ANA.bf : ANA.std;
    anaDet = { i, busy: true }; anaDetPaint();
    let D;
    try {
      if (!A.bf) {
        const moves = real.history.slice(0, s.k0).map(h => ({ from: h.from, to: h.to }));
        const X = await AI.explainPos(moves, s.mv, 1400);
        const g0 = new XQ.Game(); for (const h of real.history.slice(0, s.k0)) g0.play({ from: h.from, to: h.to });
        let threat = null;
        if (X.threat && X.threat.mv) { const q = g0.at(X.threat.mv.to[0], X.threat.mv.to[1]); threat = { note: notation(g0.board, X.threat.mv), target: q && q.s === s.side ? q : null, mate: X.threat.score > 9000 }; }
        D = { bestLine: xStd(real, s.k0, X.bestPV), realLine: xStd(real, s.k0, [s.mv, ...(X.refute || [])]), threat,
          next: xStd(real, s.k0, real.history.slice(s.k0, s.k0 + 4)), lossU: Math.max(0, (X.score - (X.actualScore ?? X.score))) / 22, H: 6 };
      } else {
        const realSeq = real.entries.slice(s.k0, s.k1);
        const bestSeqs = await xPlanBF(s.S, null, 3); if (tok !== anaTok2) return;
        const realSeqs = await xPlanBF(s.S, realSeq, 3); if (tok !== anaTok2) return;
        const nextSeqs = A.steps.slice(i, i + 3).map(st => real.entries.slice(st.k0, st.k1));
        D = { bestLine: xBF(s.S, bestSeqs), realLine: xBF(s.S, realSeqs), next: xBF(s.S, nextSeqs), lossU: Math.max(0, s.loss || 0), H: 3 };
      }
    } catch (e) { console.error(e); if (tok === anaTok2) { anaDet = { i, err: true }; anaDetPaint(); } return; }
    if (tok !== anaTok2) return;
    D.i = i; D.text = xText(A, s, D); anaDet = D; anaDetPaint();
  }
  let anaTok2 = 0;
  // 按模板写成话
  function xText(A, s, D) {
    const me = s.side, opp = me === 'r' ? 'b' : 'r', SN = SIDE_CN, R = D.realLine, Bl = D.bestLine, out = [];
    const prev = A.steps[A.steps.indexOf(s) - 1];
    const unit = A.bf ? '回合' : '步';
    // ① 局面：对方上一步，和它已经在威胁什么
    if (prev || D.threat) {
      let t = prev ? `对方上一${unit}走了 <b>${prev.note}</b>。` : '';
      if (D.threat && D.threat.mate) t += `对方已经有杀棋的威胁（从 <b>${D.threat.note}</b> 起）。`;
      else if (D.threat && D.threat.target && XV[D.threat.target.t] >= 2) t += `这时对方已经在瞄你的<b>${xName(D.threat.target)}</b>：下一步 ${D.threat.note} 就能吃。`;
      if (t) out.push(['局面', t]);
    }
    // ② 为什么错：先看有没有杀、丢子（两条路的子力差得够多才算丢子，应走也保不住的子不算），再看错过的杀和吃子，都没有就是局面上的亏
    let why = '';
    const threatSaid = !!(D.threat && (D.threat.mate || (D.threat.target && XV[D.threat.target.t] >= 2)));
    const mateK = R.findIndex((st, k) => k > 0 && st.mate === opp);
    const lostB = new Set(); for (const st of Bl.slice(0, D.H)) for (const x of st.kills) if (x.s === me) lostB.add(x.t);   // 应走也会丢的子（按兵种）不算这步的错
    const lossOf = st => st.kills.find(x => x.s === me && xVal(x) >= 1 && !lostB.has(x.t));
    const lossK = R.findIndex((st, k) => k > 0 && k <= 4 && st.side === opp && !!lossOf(st));
    const netR = xNet(R, me, D.H), netB = xNet(Bl, me, D.H), delta = netB - netR;
    const myMateB = Bl.findIndex(st => st.mate === me);
    const bk0 = Bl[0] && Bl[0].kills.find(x => x.s === opp);
    if (s.grade <= 1) why = `这${unit}走得不错，和电脑认为最好的走法差不多。`;
    else if (mateK > 0) {
      const n = R.slice(1, mateK + 1).filter(st => st.side === opp).length;
      why = `走完之后对方有杀：<b>${xNotes(R, 1, mateK + 1)}</b>，${n} ${unit}就将死你。`;
    } else if (myMateB >= 0) {
      const n = Bl.slice(0, myMateB + 1).filter(st => st.side === me).length;
      why = `这里本来有杀：<b>${xNotes(Bl, 0, myMateB + 1)}</b>，${n} ${unit}就能将死对方，这一${unit}错过了。`;
    } else if (lossK > 0 && delta >= 0.9) {
      const st = R[lossK], k = lossOf(st);
      const pre = lossK > 1 ? `（中间 ${xNotes(R, 1, lossK)}）` : '';
      why = `走完之后，对方${pre} <b>${st.note}</b> 就能吃掉你的<b>${xName(k)}</b>`;
      const back = R.slice(lossK + 1, D.H).find(x => x.side === me && x.kills.some(y => y.s === opp)), bv = back && back.kills.find(y => y.s === opp);
      if (R[0].kills.some(y => y.s === opp)) why += `——你这${unit}虽然吃了对方的${xName(R[0].kills.find(y => y.s === opp))}，可是得不偿失`;
      else if (!back) why += '，而且吃不回来';
      else if (xVal(bv) < xVal(k) - 0.5) why += `，你最多只能 ${back.note} 吃回一个${xName(bv)}`;
      else why += `；你能 ${back.note} 吃回${xName(bv)}，但后面还是吃亏`;
      why += `。和应走比，这一串走下来你少了${xMat(delta)}。`;
      if (threatSaid && D.threat.target && st.kills.some(x => x.id === D.threat.target.id)) why += '这个威胁在你走之前就有了，这一步没有理会。';
    } else if (bk0 && xVal(bk0) >= 2 && delta >= 0.9 && !R[0].kills.some(x => x.s === opp)) {
      why = `这里能直接 <b>${Bl[0].note}</b> 吃掉对方的<b>${xName(bk0)}</b>，这一${unit}错过了。`;
    } else {
      why = `两条路走下去子力差不多，差在局面：这${unit}让局面变差了${xMat(D.lossU)}的分量`;
      if (R[1]) why += `。对方最好的应法是 <b>${R[1].note}</b>${R[1].check ? '（将军）' : ''}，之后 ${xNotes(R, 2, 5) || '……'}，电脑算下来对方更主动`;
      why += '。';
    }
    out.push([s.grade <= 1 ? '评价' : '为什么' + ANA.tags[s.grade], why]);
    // ③ 应走
    if (Bl.length && s.grade >= 1) {
      let t = `应走 <b>${Bl[0].note}</b>`;
      if (Bl[0].mate === me) t += '，直接将死';
      else if (myMateB > 0) t += `，${Bl.slice(0, myMateB + 1).filter(st => st.side === me).length} ${unit}成杀`;
      else if (bk0) t += `，吃掉对方的${xName(bk0)}`;
      else if (threatSaid && D.threat.target && !Bl.slice(0, 4).some(st => st.kills.some(x => x.id === D.threat.target.id))) t += `，先护住你的${xName(D.threat.target)}`;
      else if (Bl[0].check) t += '，将军';
      t += `。电脑往下算的变化：${xNotes(Bl, 0, D.H + 1)}。`;
      out.push(['应走', t]);
      // ④ 两条路比一比
      const h = Math.min(D.H, Math.max(R.length, Bl.length));
      const mt = (L, v) => { const mk = L.findIndex(st => st.mate); if (mk >= 0) return L[mk].mate === me ? `${L.slice(0, mk + 1).filter(st => st.side === me).length} ${unit}将死对方` : `被对方 ${L.slice(1, mk + 1).filter(st => st.side === opp).length} ${unit}将死`; return v >= 0.9 ? `净赚${xMat(v)}` : v <= -0.9 ? `净亏${xMat(-v)}` : '子力不吃亏'; };
      const nb = xNet(Bl, me, h), nr = xNet(R, me, h);
      if (h > 1) out.push(['对比', `往下 ${h} ${unit}：按应走，你${mt(Bl, nb)}；按实战的走法（对方应得最好时），你${mt(R, nr)}。` + (nb <= -0.9 && nr < nb - 0.5 && !Bl.some(st => st.mate) ? '这时局面已经吃紧，应走也要亏一点，但比实战亏得少。' : '')]);
    }
    // ⑤ 实战后续：对方有没有抓住
    const nx = D.next[1];
    if (nx) {
      let t = `实战中对方接着走了 <b>${nx.note}</b>`;
      const kk = nx.kills.find(x => x.s === me);
      if (kk) t += `，吃掉了你的${xName(kk)}`;
      const best1 = R[1], same = best1 && nx.note === best1.note;
      const ng = A.steps[A.steps.indexOf(s) + 1];
      if (s.grade >= 2) t += same ? '——正是最狠的一手。' : ng && ng.grade >= 3 && best1 ? `，没抓住机会（最狠的是 ${best1.note}）。` : '。';
      else t += '。';
      out.push(['实战', t]);
    }
    return out;
  }
  function anaDetPaint() {
    const el = $('anaDet'); if (!el) return;
    const real = RP ? RP.real : game, A = real && real.__ana;
    if (!anaDet || !A) { el.classList.add('hidden'); $('ana').classList.remove('det'); return; }
    const s = A.steps[anaDet.i]; el.classList.remove('hidden'); $('ana').classList.add('det'); $('anaCur').classList.add('hidden');
    const no = A.bf ? `第 ${anaDet.i + 1} 回合` : `第 ${Math.floor(anaDet.i / 2) + 1} 步`;
    let h = `<div class="dh"><button class="db" data-x="back">‹ 返回</button><span>${no} · ${SIDE_CN[s.side]} · <b>${s.note}</b></span><i class="tg g${s.grade}">${ANA.tags[s.grade]}</i></div>`;
    if (anaDet.busy) h += '<div class="dw">详解计算中……（电脑在把前后几步细算一遍）</div>';
    else if (anaDet.err) h += '<div class="dw">这一步没算出来，稍后再试一次。</div>';
    else {
      h += anaDet.text.map(([k, v]) => `<div class="dp"><em>${k}</em><p>${v}</p></div>`).join('');
      h += `<div class="dd"><button class="db b" data-x="best">▶ 演示应走</button><button class="db r" data-x="real">▶ 演示实战变化</button></div>`;
    }
    el.innerHTML = h;
    if (ANAV === 3) { anaPaint.noScroll = true; anaPaint(); anaPaint.noScroll = false; }
    setTimeout(() => anaFit(), 30);
  }
  // 棋盘上演示一条线：一步一步摆出来，标上一、二、三……；放完回到这一步走之前
  async function anaDemo(which) {
    const D = anaDet, real = RP ? RP.real : game, A = real && real.__ana; if (!D || !D.text || !A || D.demo || !RP || RP.busy) return;
    const s = A.steps[D.i], line = which === 'best' ? D.bestLine : D.realLine; if (!line.length) return;
    D.demo = which; RP.busy = true; $('anaDet').classList.add('demo'); setTimeout(() => anaFit(), 30);
    try {
      let g;
      if (A.bf) { g = new BF.Game(); g.reset(BF.cloneState(s.S)); } else { g = new XQ.Game(); for (const h of real.history.slice(0, s.k0)) g.play({ from: h.from, to: h.to }); }
      for (let k = 0; k < Math.min(line.length, D.H + 1); k++) {
        if (anaDet !== D) break;
        const st = line[k];
        if (A.bf) { for (const a of st.seq) if (!g.apply(a)) break; } else g.play({ from: st.mv.from, to: st.mv.to });
        Fx.clearMarks(); Board.setPosition(g); Board.faceViewer(viewSide); Board.clearMoves();
        if (st.mv) { Board.showLast(st.mv.from, st.mv.to); Board.showStep({ from: st.mv.from, to: st.mv.to, seal: XCN[k] || '…' }); }
        Sfx.place(st.mv && Board.pieces.get((g.at(st.mv.to[0], st.mv.to[1]) || {}).id));
        $('anaDet').dataset.k = `${which === 'best' ? '应走' : '实战'} 第 ${XCN[k] || k + 1} ${A.bf ? '回合' : '步'}：${st.note}`;
        await Core.sleep(1.25);
      }
      await Core.sleep(0.8);
    } finally {
      RP.busy = false; $('anaDet').classList.remove('demo'); delete $('anaDet').dataset.k; if (anaDet === D) D.demo = null; setTimeout(() => anaFit(), 30);
      Board.showStep(null); rpShow(s.k0); if (s.mv) Board.showLast(s.mv.from, s.mv.to);
    }
  }
  $('anaDet').addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    const x = b.dataset.x;
    if (x === 'back') { anaTok2++; anaDet = null; anaDetPaint(); anaPaint(); return; }
    if (x === 'best' || x === 'real') anaDemo(x);
  });
  $('anaList').addEventListener('click', e => {
    const xb = e.target.closest('[data-xi]'); if (xb) { e.stopPropagation(); anaPick(+xb.dataset.xi); anaExplain(+xb.dataset.xi); return; }
    const r = e.target.closest('.ar'); if (r) anaPick(+r.dataset.i);
  });
  $('anaChart').addEventListener('click', e => {
    const real = RP ? RP.real : game, A = real && real.__ana; if (!A || !A.n) return;
    const b = $('anaChart').getBoundingClientRect(), i = Math.round((e.clientX - b.left) / b.width * A.n);
    anaPick(Math.max(0, Math.min(A.n - 1, i)));
  });
  $('anaX').onclick = () => anaClose();
  function toLobby() {
    Net.close(); store.del('host');
    location.href = location.pathname;
  }

  // ---------- 说明浮窗：电脑鼠标悬停、手机长按（按钮、卡片上的签、棋盘上的棋子） ----------
  const tipEl = $('tip');
  let tipT = 0, lpT = 0, tipFor = null, tipHold = false, boardHold = false;
  function showTip(html, r) {
    tipEl.innerHTML = html; tipEl.classList.remove('hidden');
    const W = innerWidth, H = innerHeight, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = Math.min(W - w - 8, Math.max(8, (r.left + r.right) / 2 - w / 2));
    let y = r.top - h - 10; if (y < 8) y = Math.min(H - h - 8, r.bottom + 10);
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.classList.add('hidden'); tipFor = null; }
  const pieceAt = (x, y) => { if (!game || !game.bf || !started) return null; const q = Board.pick(x, y); const p = q && game.at(q[0], q[1]); return p ? { p, q } : null; };
  const pointRect = (x, y) => ({ left: x - 30, right: x + 30, top: y - 40, bottom: y + 30 });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && el === tipFor) return;
    clearTimeout(tipT); if (tipFor && tipFor !== 'board') hideTip();
    if (!el || !el.dataset.tip) return;
    tipT = setTimeout(() => { tipFor = el; showTip(el.dataset.tip, el.getBoundingClientRect()); }, 260);
  });
  document.addEventListener('pointerdown', e => {
    tipHold = false; clearTimeout(lpT);
    if (!tipEl.classList.contains('hidden')) hideTip();
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest && e.target.closest('[data-tip]');
    const onBoard = e.target.id === 'gl';
    if (!el && !onBoard) return;
    const x0 = e.clientX, y0 = e.clientY;
    const mv = ev => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) { clearTimeout(lpT); document.removeEventListener('pointermove', mv); } };
    document.addEventListener('pointermove', mv);
    lpT = setTimeout(() => {
      document.removeEventListener('pointermove', mv);
      if (el && el.dataset.tip) { tipHold = true; tipFor = el; showTip(el.dataset.tip, el.getBoundingClientRect()); }
      else if (onBoard) { const hit = pieceAt(x0, y0); if (hit) { boardHold = true; tipFor = 'board'; showTip(pieceTip(hit.p), pointRect(x0, y0)); } }
      if (tipFor && navigator.vibrate) try { navigator.vibrate(12); } catch (err) { }
    }, 450);
  }, true);
  document.addEventListener('pointerup', () => clearTimeout(lpT), true);
  document.addEventListener('click', e => { if (tipHold) { tipHold = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && (e.target.closest('[data-tip]') || e.target.id === 'gl')) e.preventDefault(); });
  // 电脑：鼠标停在棋子上一会儿就显示这枚子的说明
  let hoverKey = '', hoverMoveT = 0;
  $('gl').addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const now = performance.now(); if (now - hoverMoveT < 90) return; hoverMoveT = now;
    const hit = pieceAt(e.clientX, e.clientY), key = hit ? hit.p.id + '|' + game.entries.length : '';
    if (key === hoverKey) return;
    hoverKey = key; clearTimeout(tipT);
    if (tipFor === 'board') hideTip();
    if (!hit || Core.Cam.cine) return;
    const x = e.clientX, y = e.clientY;
    tipT = setTimeout(() => { tipFor = 'board'; showTip(pieceTip(hit.p), pointRect(x, y)); }, 380);
  });
  $('gl').addEventListener('pointerleave', () => { hoverKey = ''; clearTimeout(tipT); if (tipFor === 'board') hideTip(); Board.hoverMark(null); });
  // 电脑：选着子时鼠标移到能走的点，那里亮一个落点标记（Ham 10-09 11:37）；待确认的那个点已经有标记，不重复
  let hmT = 0;
  $('gl').addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const now = performance.now(); if (now - hmT < 40) return; hmT = now;
    const q = sel && !busy && !Core.Cam.cine ? Board.pick(e.clientX, e.clientY) : null;
    const ok = q && selMoves.some(m => m.to[0] === q[0] && m.to[1] === q[1]) && !(pendTo && pendTo[0] === q[0] && pendTo[1] === q[1]);
    Board.hoverMark(ok ? q : null);
  });

  // ---------- 点选 ----------
  $('gl').addEventListener('pointerup', e => {
    if (boardHold) { boardHold = false; return; }
    if (Core.lastDragMoved > 10 || Core.Cam.cine) return;
    if (dbgOn && game.bf) { const p = Board.pick(e.clientX, e.clientY); if (p) dbgClick(p[0], p[1]); return; }
    // 观众：点哪儿走到哪儿。棋手：点到站在棋盘上的观众就把他弹飞
    if (watching()) { if (!RP && !Ending.running) specGo(e.clientX, e.clientY); return; }
    if (online() && Spect.count) { const sid = Spect.pickOnBoard(e.clientX, e.clientY); if (sid && specFlick(sid, true)) return; }
    if (game.bf && canAct()) { const p = Board.pick(e.clientX, e.clientY); dbgFreeTurn(p); ktPoke(p); bfClick(p); return; }
    if (!canAct()) {
      if (started && !ended && !busy && online() && Net.connected && game.turn !== mySide) toast('还没轮到你');
      if (started && !ended && vsAI() && game.turn !== mySide) toast(`${NAME[aiSide()]}正在思考`);
      return;
    }
    const p = Board.pick(e.clientX, e.clientY);
    ktPoke(p);
    if (!p) { pendTo = null; Board.clearMoves(false); sel = null; selMoves = []; return; }
    const [f, r] = p;
    const mv = selMoves.find(m => m.to[0] === f && m.to[1] === r);
    if (pendTo && !(pendTo[0] === f && pendTo[1] === r)) pendTo = null;
    if (sel && mv) { if (confirmMove([f, r])) return; doMove({ from: sel, to: [f, r] }); return; }
    if (sel && badClick(f, r)) return;
    if (sel && game.jq) {
      const bl = game.blockedFrom(sel[0], sel[1]).find(m => m.to[0] === f && m.to[1] === r);
      if (bl) { toast(bl.why === 'check' ? '同一子不能连续将军超过六回合，请换一着' : '同一子不能连续捉同一子超过六回合，请换一着', 2600); return; }
    }
    const pc = game.at(f, r);
    if (pc && pc.s === actor()) {
      if (sel && sel[0] === f && sel[1] === r) { Board.clearMoves(false); sel = null; selMoves = []; return; }
      sel = [f, r];
      selMoves = game.legalFrom(f, r);
      Board.showMoves(sel, withBad(bfDmg(selMoves), f, r), !!+opts.hints);
      Sfx.select();
      if (!selMoves.length) toast(selBad.length ? '这枚棋子一动就会送将' : '这枚棋子无路可走');
    } else if (sel) { Board.flashBad(sel, [f, r]); }   // 选着子点到走不了的地方：那里闪一下红色虚影，选中的子不丢
    else { Board.clearMoves(false); sel = null; selMoves = []; selBad = []; }
  });
  // ---------- 送将提示 ----------
  // 按走法能走、但走了自己会被将军的着法：照样标出来（标红 / 头顶禁止符号），点上去说明原因；连点三次，自家主帅出言调侃
  let selBad = [], badN = 0, badAt = -1;
  const BAD_SAY = ['怎么？你想害老子？', '莫要害老子！', '你想作甚！']; let badSay = -1;
  // 落子确认（设置里可以关）：第一下只把落点框住，再点同一个落点才走；点别的落点改框那个，点别处取消
  let pendTo = null;
  function confirmMove(to) {   // 返回 true：这一下只是选中落点，先不走
    if (!+S.confirm) return false;
    if (pendTo && pendTo[0] === to[0] && pendTo[1] === to[1]) { pendTo = null; return false; }
    pendTo = to.slice();
    const L = withBad(bfDmg(selMoves), sel[0], sel[1]); L.ghost = pendTo;
    Board.showMoves(sel, L, !!+opts.hints); Sfx.select();
    toast('再次点击确认落子', 1800);
    return true;
  }
  function withBad(list, f, r) {
    selBad = game.selfCheckFrom ? game.selfCheckFrom(f, r) : [];
    if (!selBad.length) return list;
    const out = list.concat(selBad.map(m => ({ from: m.from, to: m.to, bad: true })));
    if (list.noBelt) out.noBelt = true;
    return out;
  }
  function badClick(f, r) {
    const m = selBad.find(x => x.to[0] === f && x.to[1] === r);
    if (!m) return false;
    const ply = game.bf ? game.entries.length : game.history.length;
    if (ply !== badAt) { badAt = ply; badN = 0; }
    badN++;
    toast(m.why === 'face' ? '不能送将：将帅不能照面' : '不能送将：这样走，自己的' + (actor() === 'r' ? '帅' : '将') + '会被吃', 2200);
    if (sel) Board.flashBad(sel, [f, r]);
    Sfx.select();
    // 王不见王：这一步里第二次想走“将帅照面”的棋，自己的主帅开口（有这句配音才说）
    if (m.why === 'face') { const k = KT[actor()]; if (k) { if (k.faceAt !== ply) { k.faceAt = ply; k.face = 0; } if (++k.face === 2 && kingSay(actor(), `${actor()}_face`)) return true; } }
    if (badN >= 6) { bubble(actor(), '愚蠢，庶子不可教也！', 3800); Voice.play(`${actor()}_bad6`); badN = 0; }          // 点到第六次：终极抱怨，然后从头数
    else if (badN > 2) {
      let i; do { i = Math.floor(Math.random() * BAD_SAY.length); } while (i === badSay);   // 第三次起调侃，不连着说同一句
      badSay = i; bubble(actor(), BAD_SAY[i], 3200); Voice.play(`${actor()}_bad${i}`);
    }
    return true;
  }

  // ---------- 兵法：选子、技能栏、兵法 ----------
  const SIDE_ARMY = { r: '汉军', b: '楚军' };
  BFX.hooks.bubble = (side, text, ms, who) => bubble(side, text, ms, who);
  // 鸿门宴 / 四面楚歌的全局效果：被困的一方，屏幕四周蒙上一圈模糊的色雾（联机只有被困的人看到；同屏对战轮到被困方时出现）
  function paintVeil() {
    let k = '';
    if (game && game.bf && mode && started && !ended && !game.result && !RP && !watching()) {
      const fx = game.fx, me = mode === 'local' ? game.turn : mySide;
      if (fx.hm > 0 && me === 'r') k = 'hm'; else if (fx.sm > 0 && me === 'b') k = 'sm';
      if (bfMode && bfMode.bs) { k = bfMode.bad ? 'bs bad' : 'bs'; inkMask(); }   // 背水一战发动期间：四周墨绿水墨晕染；走完不合法 → 朱红
    }
    if (!(bfMode && bfMode.bs && bfMode.bad)) Board.showBad([]);
    const v = $('veil'), cls = k ? 'on ' + k + (Core.quality === 'low' || veilLite ? ' lite' : '') : '';
    if (v.className !== cls) v.className = cls;
    // 真模糊（backdrop-filter）在弱机上很吃力：开着的头一秒量一下帧时间，掉帧就退成只有色雾
    if (k && !veilLite && !veilProbe && Core.quality !== 'low') {
      veilProbe = true;
      let n = 0, t0 = performance.now(), worst = 0, last = t0;
      const tick = () => {
        const t = performance.now(); worst = Math.max(worst, t - last); last = t; n++;
        if (t - t0 < 1400) { requestAnimationFrame(tick); return; }
        if ((t - t0) / n > 42) { veilLite = true; paintVeil(); }
      };
      requestAnimationFrame(tick);
    }
  }
  let veilLite = false, veilProbe = false;
  // 水墨晕染的形状：四周一圈深浅不匀的墨团（画一次，当遮罩用；颜色由样式给，墨绿 / 朱红共用这一张）
  let inkMade = false;
  function inkMask() {
    if (inkMade) return; inkMade = true;
    try {
      const W = 480, H = 300, c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      let sd = 20261004; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
      const blob = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
      // 底：越靠边越浓
      const base = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62); base.addColorStop(0, 'rgba(0,0,0,0)'); base.addColorStop(0.5, 'rgba(0,0,0,.5)'); base.addColorStop(1, 'rgba(0,0,0,.95)');
      g.save(); g.translate(W / 2, H / 2); g.scale(1, H / W * 1.25); g.translate(-W / 2, -H / 2); g.fillStyle = base; g.fillRect(-W, -H * 2, W * 3, H * 5); g.restore();
      // 墨团：沿四边往里渗，大小浓淡不一
      for (let i = 0; i < 170; i++) {
        const t = rnd(), side = Math.floor(rnd() * 4), d = Math.pow(rnd(), 1.7) * 0.2, r = 16 + rnd() * 58;
        const x = side === 0 ? d * W : side === 1 ? (1 - d) * W : t * W, y = side === 2 ? d * H * 1.15 : side === 3 ? (1 - d * 1.15) * H : t * H;
        blob(x, y, r, 0.22 + rnd() * 0.4);
      }
      // 留白：往里咬出几个缺口，边缘才不是一圈整齐的椭圆
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 46; i++) {
        const a = rnd() * 6.283, k = 0.52 + rnd() * 0.3, r = 14 + rnd() * 40;
        blob(W / 2 + Math.cos(a) * W * 0.5 * k, H / 2 + Math.sin(a) * H * 0.5 * k, r, 0.2 + rnd() * 0.35);
      }
      g.globalCompositeOperation = 'source-over';
      const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
      const g2 = c2.getContext('2d'); g2.filter = 'blur(5px)'; g2.drawImage(c, 0, 0);
      $('veil').style.setProperty('--inkm', `url(${c2.toDataURL('image/png')})`);
    } catch (e) { console.warn('inkMask', e); }
  }
  const pname = p => XQ.NAMES[p.s][p.t];
  function exitBfMode(repaint = true) {
    if (bfMode && bfMode.kind === 'pofu' && bfMode.m1) Board.reconcile(game);
    if (bfMode && bfMode.bs) { Board.showBad([]); Board.showStep(null); }
    if (bfMode && (bfMode.kind === 'rvUp' || bfMode.kind === 'rvBusy')) { bfMode = null; Board.reconcile(game); }   // 召回只演了落位、还没提交：把那枚子收走
    bfMode = null;
    if (repaint) renderBar();
  }
  function bfSelect(f, r) {
    sel = [f, r];
    const me = game.at(f, r);
    selMoves = game.legalFrom(f, r).map(m => { const q = game.at(m.to[0], m.to[1]); return { ...m, atk: !!(q && q.hp > game.atkOf(me)) }; });
    Board.showMoves(sel, withBad(bfDmg(selMoves), f, r), !!+opts.hints);
    if (game.frozen(me) && !selMoves.length) toast('这枚子刚用过背水一战，这一回合不能动', 2200);
    else if (game.jmRooted && game.jmRooted(me) && !selMoves.length) toast('这枚兵正在拒马，拒马结束前不能移动', 2200);
    Sfx.select();
  }
  function bfClear() { Board.clearMoves(false); sel = null; selMoves = []; selBad = []; }
  // 伤害预览：把这一步先在副本上演一遍，列出会阵亡 / 掉血的子（含被波及的、被反伤的）
  function bfHarm(a) {
    let r; try { r = BF.attempt(game.S, a); } catch (e) { return null; }
    if (!r) return null;
    const hp0 = new Map(); for (const row of game.board) for (const q of row) if (q) hp0.set(q.id, q.hp);
    const out = new Map();
    for (const e of r.ev) {
      if (!e.at || e.id == null) continue;
      if (e.e === 'kill') out.set(e.id, { at: e.at.slice(), kill: true });
      else if (e.e === 'hit' && !(out.get(e.id) || {}).kill) out.set(e.id, { at: e.at.slice(), dmg: Math.max(1, (hp0.get(e.id) || e.hp + 1) - e.hp) });
    }
    return { list: [...out.values()], ev: r.ev };
  }
  // 带伤害的技能（霹雳、齐射、冲阵、踏营 / 飞越打到子、楚象带践踏的每一步）：第一次点目标只预览结果，再点一次才发动
  function bfNeedConfirm(a) {
    const h = bfHarm(a); if (!h || !h.list.length) return null;
    if (a.k === 'sk') return h;
    if (a.k === 'mv' && h.ev.some(e => e.e === 'splash' && e.how === 'jianta') && h.ev.some(e => (e.e === 'hit' || e.e === 'kill') && e.how === 'jianta')) return h;
    return null;
  }
  const ARC_SK = new Set(['chongzhen', 'pili', 'qishe']);   // 这些技能是跳过去 / 打过去的：指示画成抛物线（Ham 审批台 td-021）
  function bfAsk(a, from) {
    // 飞越（Ham 10-10 改被动）：点了象眼被塞住的落点，先问一句用不用飞越
    if (a.k === 'mv' && !a.fy) {
      const m = selMoves.find(x => x.to[0] === a.to[0] && x.to[1] === a.to[1]), me = game.at(from[0], from[1]);
      if (m && (m.via === 'feiyue' || m.via === 'taying') && me) {   // 踏营也改了被动（Ham 审批台 td-024），同样先问
        const fy = m.via === 'feiyue', cd = BF.CFG.skills[m.via].cooldown, nm = fy ? '飞 越' : '踏 营';
        ask(nm, fy ? `${XQ.NAMES[me.s].e}眼被塞住了，要用「飞越」强行跳过去吗？用了之后冷却 ${cd} 回合。` : `马腿被蹩住了，要用「踏营」强行跳过去吗？用了之后冷却 ${cd} 回合。`, 0, nm, '不 用').then(y => { if (y && sel && sel[0] === from[0] && sel[1] === from[1]) bfAsk({ ...a, fy: 1 }, from); });
        return;
      }
    }
    // 点了目标的技能一律先“瞄准”：目标被瞄准圈框住，下方出现「确定」，点了才发动（会伤到谁照旧先标出来）
    const aimed = a.k === 'sk' && !!a.to;
    const h = bfNeedConfirm(a) || (aimed ? (bfHarm(a) || { list: [], ev: [] }) : null);
    if (!h && a.k === 'mv' && +S.confirm) {   // 落子确认：普通走子 / 攻击也先框住落点，再点一次（或点「确定」）才走
      const L = withBad(bfDmg(selMoves), from[0], from[1]); L.ghost = a.to;
      bfMode = { kind: 'confirm', a, hint: '再次点击或点「确定」落子' };   // Ham 审批台 art-042 选 A
      Board.showMoves(from, L, !!+opts.hints); Sfx.select(); renderBar(); return;
    }
    if (!h) { doBF(a); return; }
    const marks = h.list.map(x => ({ from, to: x.at, dmg: x.kill ? 0 : x.dmg })); marks.noBelt = true;
    if (!h.list.some(x => x.at[0] === a.to[0] && x.at[1] === a.to[1])) { marks.push({ from, to: a.to, skill: aimed }); }
    if (aimed) {
      // 发动之后自己会落到哪（冲阵越过去的那一格、踏营 / 飞越的落点）：也用金框标出来
      const me = game.at(from[0], from[1]), mv = me && h.ev.filter(e => e.e === 'move' && e.id === me.id).pop();
      if (mv && !(mv.to[0] === a.to[0] && mv.to[1] === a.to[1]) && !marks.some(x => x.to[0] === mv.to[0] && x.to[1] === mv.to[1])) marks.push({ from, to: mv.to, skill: true });
    }
    marks.aim = a.to;
    bfMode = { kind: 'confirm', a, hint: (h.list.length ? '已瞄准：标「殺」的会阵亡，标 -1 的掉血' : '已瞄准') + ' · 点「确定」发动（再点一次目标也行），点别处取消' };
    Board.showMoves(from, marks, true); Sfx.select();
    renderBar();
  }
  function bfClick(p) {
    if (bfMode && bfMode.kind === 'pofu') { pofuClick(p); return; }
    if (bfMode && (bfMode.kind === 'rvBusy' || bfMode.kind === 'rvUp')) return;   // 召回落位后等玩家点「升级 / 结束回合」：棋盘不接别的操作
    if (bfMode && bfMode.kind === 'rvPlace') {
      const q = p && bfMode.o.squares.find(x => x[0] === p[0] && x[1] === p[1]);
      if (q) { reviveLand(bfMode.o, q); return; }
      exitBfMode(false); Board.clearMoves(false); renderBar(); return;
    }
    if (bfMode && bfMode.kind === 'confirm') {
      const a = bfMode.a;
      if (p && a.to && p[0] === a.to[0] && p[1] === a.to[1]) { bfMode = null; doBF(a); return; }
      if (a.k === 'mv' && p && sel && selMoves.some(m => m.to[0] === p[0] && m.to[1] === p[1])) { bfMode = null; bfAsk({ k: 'mv', from: sel, to: [p[0], p[1]] }, sel); return; }   // 改选另一个落点
      exitBfMode(false);
      if (sel) bfSelect(sel[0], sel[1]);
      renderBar(); return;
    }
    if (bfMode && bfMode.kind === 'sk') {
      const a = p && bfMode.targets.find(x => x.to && x.to[0] === p[0] && x.to[1] === p[1]);
      if (a) { bfAsk(a, a.at); return; }
      exitBfMode(false);
    }
    if (!p) { bfClear(); renderBar(); return; }
    const [f, r] = p;
    const mv = selMoves.find(m => m.to[0] === f && m.to[1] === r);
    if (sel && mv) { bfAsk({ k: 'mv', from: sel, to: [f, r] }, sel); return; }
    if (sel && badClick(f, r)) return;
    const pc = game.at(f, r);
    if (pc && pc.s === actor()) {
      if (sel && sel[0] === f && sel[1] === r) bfClear();
      else bfSelect(f, r);
    } else if (sel) Board.flashBad(sel, [f, r]);   // 选着子点到走不了的地方：红色虚影，选中的子不丢
    else bfClear();
    renderBar();
  }
  // 破釜沉舟：先选第一步，再选第二步，两步一起提交
  function pofuClick(p) {
    const M = bfMode;
    if (M.bs) { bsClick(p); return; }
    const showFrom = (list, from) => { Board.showMoves(from, list.filter(m => m.from[0] === from[0] && m.from[1] === from[1]), true); };
    if (!p) return;
    const [f, r] = p;
    const list = M.m1 ? M.seconds : M.firsts;
    const hit = M.sel && list.find(m => m.from[0] === M.sel[0] && m.from[1] === M.sel[1] && m.to[0] === f && m.to[1] === r);
    if (hit && !M.m1) {
      M.m1 = { from: hit.from, to: hit.to };
      M.seconds = game.pofuSecond(M.m1);
      // 预览第一步：模型挪过去，被吃的子先藏起来
      const pv = game.pofuPreview(M.m1);
      for (const e of pv.ev) {
        if (e.e === 'move') { const m = Board.pieces.get(e.id); if (m) m.position.copy(Board.pos(e.to[0], e.to[1])); }
        if (e.e === 'kill') { const m = Board.pieces.get(e.id); if (m) m.visible = false; }
      }
      M.board = pv.S.board; M.sel = null;
      Board.clearMoves(true); Sfx.place(Board.pieces.get((game.at(hit.from[0], hit.from[1]) || {}).id));
      M.hint = BF.CFG.beishui.on ? BS_HINT[1] : '破釜沉舟 · 第二步：选子再走一步'; renderBar();
      return;
    }
    if (hit && M.m1) { doBF({ k: 'art', steps: [M.m1, { from: hit.from, to: hit.to }] }); return; }
    const board = M.m1 ? M.board : game.board;
    const pc = board[r][f];
    if (pc && pc.s === 'b' && list.some(m => m.from[0] === f && m.from[1] === r)) { M.sel = [f, r]; Sfx.select(); showFrom(list, M.sel); }
    else { M.sel = null; Board.clearMoves(false); }
  }
  // 背水一战：发动后收不回来（没有“取消”）。能走的步都让走，两步走完再判——
  //   合法就结算；不合法 → 四周变朱红、说明原因、惹祸的子标红，点一下屏幕棋子归位，从第一步重走
  const bsHow = () => (BF.CFG.beishui.twoPieces ? '两枚不同的子各走一步' : '一枚子连走两步，或两枚子各走一步');
  const BS_HINT = { get 0() { return '背水一战 · 第一步：选一枚子走一步（不能取消）'; }, get 1() { return '背水一战 · 第二步：' + (BF.CFG.beishui.twoPieces ? '换一枚子再走一步' : '再走一步（这枚子、另一枚子都行）'); } };
  const BS_WHY = {
    self: '两步走完，楚将正被将军', face: '两步走完，将帅照面了', give: '背水一战走完不能将着汉帅',
    kills: () => `背水一战合计最多吃 ${BF.CFG.beishui.maxKills} 个子`, long: '同一枚子不能一直将军', other: '这两步不合规则',
  };
  function bsStart() {
    Board.showBad([]); Board.showStep(null); Board.clearMoves(true); sel = null; selMoves = []; selBad = [];
    bfMode = { kind: 'pofu', bs: true, firsts: game.bsFree().list, hint: BS_HINT[0] };
    renderBar();
  }
  function bsReset() { Board.reconcile(game); Sfx.place(); bsStart(); }
  function bsShow(ev) {   // 预览：子先挪过去，被吃的先藏起来
    for (const e of ev) {
      if (e.e === 'move') { const m = Board.pieces.get(e.id); if (m) m.position.copy(Board.pos(e.to[0], e.to[1])); }
      if (e.e === 'kill') { const m = Board.pieces.get(e.id); if (m) m.visible = false; }
    }
  }
  function bsClick(p) {
    const M = bfMode;
    if (M.bad) { bsReset(); return; }
    if (!p) return;
    const [f, r] = p, list = M.m1 ? M.seconds : M.firsts;
    const hit = M.sel && list.find(m => m.from[0] === M.sel[0] && m.from[1] === M.sel[1] && m.to[0] === f && m.to[1] === r);
    if (hit && !M.m1) {
      M.m1 = { from: hit.from, to: hit.to };
      const pv = game.bsFree(M.m1);
      bsShow(pv.ev); M.board = pv.S.board; M.seconds = pv.list; M.sel = null;
      Board.clearMoves(true); Sfx.place(Board.pieces.get((game.at(hit.from[0], hit.from[1]) || {}).id));
      { const me = game.at(hit.from[0], hit.from[1]), mv = me && pv.ev.filter(e => e.e === 'move' && e.id === me.id).pop();   // 第一步的落点留虚影、悬「一」、留路径（打不死被弹回的，虚影留在原地）
        Board.showStep({ from: hit.from, to: mv ? mv.to : hit.from, aim: hit.to, id: me && me.id }); }
      M.hint = BS_HINT[1]; renderBar();
      return;
    }
    if (hit && M.m1) {
      const steps = [M.m1, { from: hit.from, to: hit.to }], j = game.bsJudge(steps);
      if (j.ok) { doBF({ k: 'art', steps }); return; }
      bsShow(j.ev); Board.clearMoves(true); M.sel = null;
      const why = BS_WHY[j.why] || BS_WHY.other, txt = typeof why === 'function' ? why() : why;
      M.bad = j; M.hint = '不合法：' + txt + ' · 点一下屏幕，棋子归位重走';
      Board.showBad(j.marks, j.links);
      const u = $('veil').querySelector('u');
      u.querySelector('em').textContent = '不合法'; u.querySelector('strong').textContent = txt; u.querySelector('small').textContent = '点一下屏幕 · 棋子归位，重走背水一战';
      // 大字别压住标红的子：惹祸的子在屏幕上半就把字放到下面
      const ys = j.marks.map(c => (1 - Board.pos(c[0], c[1]).project(Core.camera).y) / 2);
      const free = (a, b) => !ys.some(y => y > a && y < b), band = free(0.08, 0.36) ? '' : free(0.36, 0.6) ? 'mid' : free(0.6, 0.84) ? 'low' : '';
      u.classList.toggle('mid', band === 'mid'); u.classList.toggle('low', band === 'low');
      try { Sfx.B.thud(0, 0.7); Sfx.B.clang(0.03, 0.3); } catch (e) { }
      Core.Cam.shake(0.12);
      renderBar();
      return;
    }
    const pc = (M.m1 ? M.board : game.board)[r][f];
    if (pc && pc.s === 'b' && list.some(m => m.from[0] === f && m.from[1] === r)) {
      M.sel = [f, r]; Sfx.select();
      Board.showMoves(M.sel, list.filter(m => m.from[0] === f && m.from[1] === r), true);
    } else { M.sel = null; Board.clearMoves(false); }
  }
  $('veil').addEventListener('click', ev => { if (bfMode && bfMode.bs && bfMode.bad) { ev.stopPropagation(); bsReset(); } });
  let barKey = '', barCache = null;
  function bfAvail() {
    const key = game.entries.length + '|' + (sel ? sel.join() : '') + '|' + game.turn + '|' + (game.result ? 1 : 0);
    if (key === barKey && barCache) return barCache;
    barKey = key;
    const side = game.turn, o = { side };
    if (sel) {
      const p = game.at(sel[0], sel[1]);
      if (p && p.s === side) {
        o.p = p; o.cost = game.upgradeCost(p); o.base = game.baseCost(p); o.canUp = game.canUpgrade(sel[0], sel[1]);
        // 这枚子的全部技能：已解锁的逐个列出，未解锁的只列下一个
        o.skills = [];
        let lockedShown = false;
        for (const sk of game.skillsOf(p)) {
          const lv = game.skLevel(sk), have = p.lv >= lv;
          if (!have) { if (lockedShown) continue; lockedShown = true; }
          o.skills.push({ sk, lv, have, passive: game.isPassive(sk), cd: game.cdLeft(p, sk), targets: have && !game.isPassive(sk) ? game.skillTargets(sel[0], sel[1], sk) : [] });
        }
      }
    }
    o.art = side === 'r' ? game.reviveOptions() : game.pofuFirst();
    o.ult = game.ultReady();
    o.pass = game.mayPass(); o.mustPass = game.mustPass();
    return (barCache = o);
  }
  const LVCN = ['', '一', '二', '三', '四'];
  // 兵法规则速览：开局自动亮一下（十几秒后自己收起），右侧「法」按钮随时可再看
  let bfTipT = null;
  // 决战提示：双方车马兵炮都死光时弹出
  function showFinalTip() {
    $('bfTipH').textContent = '决 战';
    $('bfTipBody').innerHTML = [
      '双方的<b>车、马、兵、炮都已阵亡</b>',
      '<b>象、士、帅将</b>都可以过河进攻',
      '象仍走田（塞象眼照旧）、士仍走斜一格，只是不再受河界、九宫限制',
      '<b>帅将</b>按过河兵走：前、左、右各一格，不能后退；各有 <b>3 点生命</b>',
      '<b>没有将军</b>：可以对脸、可以送将，帅将被打到 0 血就输',
      '士的<b>铁甲禁卫</b>在九宫外也能用',
      '<b>夺营</b>：帅将走进对方九宫，对方再走三步还没把它打死，就算赢',
    ].map(x => `<li>${x}</li>`).join('');
    $('bfTip').classList.remove('hidden');
    clearTimeout(bfTipT); bfTipT = setTimeout(() => $('bfTip').classList.add('hidden'), 16000);
    try { Sfx.B.taiko(0, 3, 0.7); } catch (e) { }
  }
  // 进入第二 / 第三阶段（Ham 10-09 22:17）：第 15 回合起每回合双方各得 1 点军功，第 45 回合起各得 2 点
  function showPhaseTip(ph) {
    $('bfTipH').textContent = ph.n === 3 ? '第 三 阶 段' : '第 二 阶 段';
    $('bfTipBody').innerHTML = [
      `第 ${ph.round} 回合起，每回合双方各得 <b>${ph.per} 点军功</b>`,
      ph.n === 3 ? '军功来得更快：抓紧升级，或攒满 20 发终极兵法' : `到第 ${BF.CFG.merit.phase3FromRound} 回合进入第三阶段，每回合各得 ${BF.CFG.merit.phase3PerRound} 点`,
    ].map(x => `<li>${x}</li>`).join('');
    $('bfTip').classList.remove('hidden');
    clearTimeout(bfTipT); bfTipT = setTimeout(() => $('bfTip').classList.add('hidden'), 9000);
    try { Sfx.B.gong(0, 0.6); } catch (e) { }
  }
  function showBfTip(manual) {
    const touch = matchMedia('(pointer: coarse)').matches;
    $('bfTipH').textContent = '技 能 模 式 速 览';
    $('bfTipBody').innerHTML = [
      `<b>${touch ? '长按' : '鼠标停在'}棋子上</b>，看它的等级、血量和技能`,
      '<b>军功</b>：吃子、将军、兵卒过河都得军功；第 15 回合起每回合各 +1，第 45 回合起各 +2',
      '<b>升级</b>：选中棋子点「升级」；一枚子每杀一个敌子自己记 1 点<b>军功</b>，攒满<b>自动升级</b>',
      '兵<b>二级</b>就能架拒马，其余<b>三级</b>解锁技能，<b>四级</b>成名将；棋身 木 → 银 → 金 → 玉',
      '打不死的目标头顶标 <b>-1</b>，能一击杀死才标<b>「殺」</b>',
      '<b>军功 20</b> 可发终极兵法；主帅兵法每局一次',
      ...(r6On() ? ['车、马、炮、兵<b>三级起攻击 2</b>；车升级贵：<b>10 / 12 / 20</b> 功', '<b>召回</b>的子最多<b>二级</b>，落位后可以马上升级，第一次升级<b>半价</b>'] : ['<b>这一局用的是旧规则</b>：攻击都是 1，车升级 6 / 8 / 20，召回回来一级']),
      '<b>决战</b>：双方车马兵炮都死光后，象、士、帅将可过河进攻；帅将 3 血，打死为止',
    ].map(x => `<li>${x}</li>`).join('');
    $('bfTip').classList.remove('hidden');
    clearTimeout(bfTipT);
    if (!manual) bfTipT = setTimeout(() => $('bfTip').classList.add('hidden'), 14000);
  }
  // 兵法：给落点标上“这一下打不死，只扣 N 血”（棋盘上显示 -N；能一击杀死的仍显示「殺」）
  function bfDmg(moves, sk) {
    if (!game || !game.bf) return moves;
    return moves.map(m => {
      const p = game.at(m.from[0], m.from[1]), q = game.at(m.to[0], m.to[1]);
      if (!p || !q) return m;   // 决战里帅将有 3 点生命：打不死同样标 -N，最后一下才标「殺」
      const n = sk === 'qishe' ? BF.CFG.skills.qishe.damage : sk === 'chongzhen' ? BF.CFG.skills.chongzhen.springDamage : game.atkOf(p);
      return q.hp > n ? { ...m, dmg: n } : m;
    });
  }
  const escTip = t => String(t || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 主帅兵法、终极兵法说明。背水一战用简化版（Ham 10-09 审批台 td-006：其余保留原文）
  const ART_DESC = { get r() {
      const B = BF.CFG.beishui, R = r6On(), cond = B.on ? `汉军车马炮${B.maxLeft != null ? `最多还剩 ${B.maxLeft} 枚、而且` : ''}比楚军少时才能用。` : '';
      if (R) return `复活一枚被吃的子，放回原位，最多${LVCN[R.reviveLevel]}级。${R.reviveUp ? '落位后可以马上升级' + (R.reviveHalf ? '（第一次半价）' : '') + '；' : ''}它这回合不能动。每局一次。` + cond;
      return '复活一枚被吃的己方子，回到它的开局位置（一级）。每局一次。' + cond; },
    get b() {
      const B = BF.CFG.beishui;
      if (!B.on) return '连走两步（不能用技能，第二步不能将军）。此后 3 回合楚军不能用兵种技能。每局一次。';
      return `每局一次，车马炮少于汉军${B.maxLeft != null ? `（最多剩 ${B.maxLeft} 枚）` : ''}时可用。${B.twoPieces ? '两枚子各走一步' : '连走两步（一枚走两步或两枚各一步）'}，最多吃 ${B.maxKills} 子；走完不能被将军，也不能将着对方。用过的子下回合不能动。`;
    } };
  const ULT_DESC = { r: `${BF.CFG.ultimates.cost} 军功，楚将两格内须有 ${BF.CFG.ultimates.simian.minPiecesInRadius} 枚汉子。${BF.CFG.ultimates.simian.rounds} 回合内楚军除将外不能移动，只能吃掉将军的子，也不算将军。`, b: `${BF.CFG.ultimates.cost} 军功。汉帅 ${BF.CFG.ultimates.hongmen.rounds} 回合不能动；汉士「护驾」可破。` };
  const artTip = s => `<b>主帅兵法 · ${BF.ART_CN[s]}</b><br>${ART_DESC[s]}`;
  const ultTip = s => `<b>终极兵法 · ${BF.ULT_CN[s]}</b><br>${ULT_DESC[s]}`;
  // 某一级的能力（血、攻、技能）
  function lvGain(p, lv) {
    const a = BF.levelInfo(p.t, p.s, lv - 1), b = BF.levelInfo(p.t, p.s, lv), out = [];
    if (b.hp > a.hp) out.push(`生命 ${b.hp}`);
    if (b.atk > a.atk) out.push(`攻击 ${b.atk}`);
    for (const k of b.skills) if (!a.skills.includes(k)) out.push(`${BF.CFG.skills[k].passive ? '被动' : '技能'}「${BF.SKILL_CN[k]}」`);
    if (lv === 2 && !out.length) out.push('换乌银棋身');
    return out.join('、') || '换装';
  }
  // 技能的一行小标签：几级 · 被动 / 冷却
  const skTag = sk => { const c = BF.CFG.skills[sk], lv = c.level || BF.CFG.skillLevel; return `${LVCN[lv]}级 · ${c.passive ? '被动' : '主动'}${c.cooldown ? ` · 冷却 ${c.cooldown}` : ''}`; };
  function skillTip(p, sk) {
    sk = sk || BF.SKILL_OF(p.t, p.s); if (!sk) return '';
    const c = BF.CFG.skills[sk], lv = c.level || BF.CFG.skillLevel;
    return `<b>${BF.SKILL_CN[sk]}</b> <small>${skTag(sk)}</small><br>${BF.SKILL_DESC[sk]}`;
  }
  const halfNow = p => !!(p && p.rh && r6On() && r6On().reviveHalf);   // 试行规则：召回的子第一次升级半价
  function upTip(p, cost, base) {
    const nx = p.lv + 1;
    return `<b>升${LVCN[nx]}级 ·「${game.rankName(p, nx)}」</b><br>${lvGain(p, nx)}，回满血。<br>花 ${cost} 军功` + (base > cost ? `（杀敌抵了 ${base - cost}）` : '') + (halfNow(p) ? '<br><em>召回的子第一次升级半价</em>' : '') + `<br><small>这枚子杀敌记功攒满 ${upNeed(p)} 点会自动升级，不花军功。</small>`;
  }
  // 升级确认框（美术 M9 第 2 条 #mUp）：点「升 X 级」先弹框，写明升了以后血量、攻击怎么变、解锁什么技能、花多少军功；点「升级」才升。
  //   召回良将落位后的「升 X 级」也弹（美术 M12，Ham 10-09 16:16 定）
  let upOpen = false;
  function upConfirm(p, cost, base, half) {
    return new Promise(res => {
      const nx = p.lv + 1, a = BF.levelInfo(p.t, p.s, p.lv), b = BF.levelInfo(p.t, p.s, nx), m = game.merit[p.s];
      $('upT').textContent = `升${LVCN[nx]}级`;
      $('upFrom').textContent = `${game.rankName(p, p.lv)} · ${LVCN[p.lv]}级`;
      $('upTo').textContent = `${game.rankName(p, nx)} · ${LVCN[nx]}级`;
      const row = (k, x, y) => `<tr><th>${k}</th><td>${x}</td><td class="to${y > x ? ' gain' : ''}">${y}</td></tr>`;
      $('upTbl').innerHTML = '<thead><tr><th></th><th>现在</th><th>升级后</th></tr></thead><tbody>' + row('血量', a.hp, b.hp) + row('攻击', a.atk, b.atk) + '</tbody>';
      $('upNew').innerHTML = b.skills.filter(k => !a.skills.includes(k)).map(k => `<li><b>${BF.SKILL_CN[k]}${BF.CFG.skills[k] && BF.CFG.skills[k].passive ? '（被动）' : ''}</b>${BF.SKILL_DESC[k] || ''}</li>`).join('');
      $('upCost').textContent = `花费 ${cost} 军功，升完还剩 ${m - cost}` + (half ? '（召回半价）' : base > cost ? `（杀敌抵了 ${base - cost}）` : '') + '。升级后回满血。';
      $('mUp').classList.remove('hidden'); upOpen = true;
      const fin = v => { $('mUp').classList.add('hidden'); upOpen = false; $('upGo').onclick = $('upNo').onclick = null; res(v); };
      $('upGo').onclick = () => fin(true); $('upNo').onclick = () => fin(false);
    });
  }
  // 技能块的样式：Ham 10-09 审批台 td-009 先选方案一，22:20 改选方案三（印章块）；其余保留作备选，网址 ?sv=0（朴素）/ 1（色带行）/ 2（卡片 + 圆章）调出来
  const SKV = Math.max(0, Math.min(3, +(Core.DIAG.get('sv') || 3)));
  // 自动升级要攒的军功：这枚子自己记满这么多点（一杀一点）就自动晋升；已经满级返回 null
  const upNeed = p => { const U = BF.CFG.upgrade; if (!p || p.t === 'k' || p.lv >= BF.maxLvOf(p.t)) return null; return Math.ceil(game.baseCost(p) / (U.killDiscount || 1)); };
  // 生命、攻击、军功三块大字（颜色区分：生命红、攻击橙、军功金）。军功这一块是这枚子自己杀敌记的（Ham 10-09 td-010：统一叫军功）
  function statRow(p, hpMax, atkV) {
    let h = `<div class="tst"><div class="hp"><i>生命</i><b>${p.hp}<small>/${hpMax}</small></b></div><div class="at"><i>攻击</i><b>${atkV}</b></div>`;
    if (p.t !== 'k') { const need = upNeed(p), xp = p.xp || 0; h += `<div class="xp"><i>军功</i><b>${xp}${need ? `<small>/${need}</small>` : ''}</b>${need ? `<u><s style="width:${Math.min(100, xp / need * 100)}%"></s></u>` : ''}</div>`; }
    return h + '</div>';
  }
  // 棋子说明（悬停 / 长按棋子）：先是生命、攻击、军功三块大字，再是技能、下一级
  function pieceTip(p) {
    const nm = `${SIDE_ARMY[p.s]}${pname(p)}`, hero = game.heroName ? game.heroName(p) : '';
    if (p.t === 'k' && game.final) {
      const N = BF.CFG.finalOccupyRounds, oc = game.occ[p.s];
      return `<b class="tnm">${game.rankName(p)}</b> <small>决战</small>` + statRow(p, BF.CFG.finalKingHp, game.atkOf(p))
        + '按过河兵走：前、左、右各一格，可以过河、出九宫、攻击。'
        + '<br>没有将军：可以对脸、可以送将，被打到 0 血就输。不受践踏、霹雳这类范围伤害。'
        + `<br><b>夺营</b>：走进对方九宫，对方再走 ${N} 步还没把它打死就赢` + (oc ? `<em>（已撑过 ${oc}/${N}）</em>` : '。');
    }
    if (p.t === 'k') return `<b class="tnm">${game.rankName(p)}</b><br>不能升级，不受技能伤害，只能被将死。<small>决战（双方车马兵炮都死光）时可出九宫、有 3 点生命。</small>` + (p.s === 'r' && game.fx.hm ? `<br><em>鸿门宴：还有 ${game.fx.hm} 回合不能动，士护驾可破</em>` : '');
    const info = BF.levelInfo(p.t, p.s, p.lv), mx = info.maxLv, need = upNeed(p), xp = p.xp || 0;
    let h = `<b class="tnm">${hero ? hero + ' · ' : ''}${game.rankName(p)}</b> <small>${nm} · ${LVCN[p.lv]}级</small>` + statRow(p, info.hp, game.atkOf(p));
    h += `<div class="tnote">${need ? `这枚子每杀一个敌子记 1 点军功，<b>攒满 ${need} 点自动升级</b>${xp ? `（还差 ${Math.max(0, need - xp)} 点）` : ''}` : '已满级'}</div>`;
    // 技能一行一块：主动青、被动紫、没解锁灰；冷却中颜色变暗、显示还剩几回合（Ham 10-09 审批台 td-006：出三版给他挑，网址 ?sv=1/2/3 切换）
    let sks = '';
    for (const sk of game.skillsOf(p)) {
      const c = BF.CFG.skills[sk], lv = c.level || BF.CFG.skillLevel, cd = p.lv < lv ? 0 : game.cdLeft(p, sk);
      const cls = p.lv < lv ? 'off' : cd ? 'cd' : c.passive ? 'pas' : 'act', kind = c.passive ? ' pv' : '';
      const st = cls === 'off' ? `${LVCN[lv]}级解锁` : cls === 'cd' ? `冷却中 · 还剩 <em>${cd}</em> 回合` : c.passive ? '被动 · 可用' : '主动 · 可用';
      const badge = cls === 'off' ? '锁' : cls === 'cd' ? cd : c.passive ? '被' : '用';
      // 技能本身的冷却时间（不是倒计时；Ham 10-09 td-009：有就写上）
      const cdT = c.cooldown ? `<small class="sc">冷却时间 ${c.cooldown} 回合</small>` : '';
      sks += `<div class="tsk ${cls}${kind}"><b class="sn">${BF.SKILL_CN[sk]}</b>${cdT}<i class="ss">${st}</i><u class="sb">${badge}</u><span class="sd">${BF.SKILL_DESC[sk]}</span></div>`;
    }
    if (sks) h += `<div class="tsks sv${SKV}">${sks}</div>`;
    if (p.lv < mx) { const cost = game.upgradeCost(p), base = game.baseCost(p); h += `<div class="tnx"><b>下一级</b>「${game.rankName(p, p.lv + 1)}」${lvGain(p, p.lv + 1)}<small>　或花 ${cost} 军功升级${base > cost ? `（杀敌抵了 ${base - cost}）` : ''}${halfNow(p) ? '，召回后首次半价' : ''}</small></div>`; }
    if (game.jmActive(p)) h += '<em>拒马中：这枚兵不能移动；近身来攻的子先挨 1 点（炮隔子打不受影响）</em>';
    if (game.frozen(p)) h += '<em>背水一战后力竭：这回合不能动（被将军时可以去吃将军的子）</em>';
    if (p.s === 'b' && game.fx.sm) h += `<em>军心涣散：还有 ${game.fx.sm} 回合不能走</em>`;
    return h;
  }
  // 本回合技能可用的子（有目标、不在冷却）
  let rsKey = '', rsS = null, rsCache = [];
  function readySkills() {
    if (!game || !game.bf || game.result || game.freeUsed) return [];
    const key = game.entries.length + '|' + game.turn;
    if (key === rsKey && rsS === game.S) return rsCache;
    rsKey = key; rsS = game.S; rsCache = [];
    for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = game.at(f, r); if (p && p.s === game.turn && p.lv >= 2 && game.skillTargets(f, r).length) rsCache.push([f, r]); }
    return rsCache;
  }
  // 主帅兵法 / 终极兵法不能用的原因：[按钮小字, 点击说明]；能用返回 null
  function artWhy(side, a) {
    if (a.art.length) return null;
    const N = BF.ART_CN[side];
    if (game.used.art[side]) return ['已用', `${N}每局只能用一次，已经用过了`];
    if (side === 'b' && game.fx.sm > 0) return ['涣散中', `四面楚歌：楚军军心涣散，还有 ${game.fx.sm} 回合不能用兵法`];
    const BS0 = BF.CFG.beishui;
    if (BS0.on) {   // 背水一战开着：两边的主帅兵法都只给弱势方用
      let m = 0, o = 0; for (const p of game.board.flat()) if (p && (p.t === 'r' || p.t === 'n' || p.t === 'c')) { if (p.s === side) m++; else o++; }
      const me = SIDE_CN[side] + '军', op = SIDE_CN[side === 'r' ? 'b' : 'r'] + '军';
      if (BS0.maxLeft != null && m > BS0.maxLeft) return ['兵力尚足', `${N}要到绝境才能用：${me}的车马炮最多还剩 ${BS0.maxLeft} 枚（现在 ${m} 枚）`];
      if (m >= o) return ['未落下风', `${N}要${me}的车马炮比${op}少才能用（现在${me} ${m} 枚、${op} ${o} 枚）`];
    }
    if (side === 'r') {
      if (!game.dead.r.length) return ['暂无阵亡', '召回良将复活己方被吃的子；现在还没有子阵亡'];
      return ['原位被占', '阵亡棋子的开局位置被占着（或复活后己方仍被将军），暂时不能复活'];
    }
    const BS = BF.CFG.beishui;
    if (BS.on) {
      return ['无法连走', `背水一战要连走两步（${bsHow()}）：两步走完时己方不被将军、也不将着对方，合计最多吃 ${BS.maxKills} 个子；现在找不到这样的两步`];
    }
    return ['无法连走', '破釜沉舟要连走两步普通走子：每步走完己方不被将军，两步走完不能将军对方；现在找不到这样的两步'];
  }
  function ultWhy(side, a) {
    if (a.ult) return null;
    const U = BF.CFG.ultimates, N = BF.ULT_CN[side], m = game.merit[side];
    if (game.used.ult[side]) return ['已用', `${N}每局只能用一次，已经用过了`];
    if (side === 'b' && game.fx.sm > 0) return ['涣散中', `四面楚歌：楚军军心涣散，还有 ${game.fx.sm} 回合不能用兵法`];
    if (m < U.cost) return [`${m}/${U.cost} 功`, `${N}需要 ${U.cost} 军功，现在只有 ${m}`];
    if (side === 'r') {
      const n = game.simianCount(), need = U.simian.minPiecesInRadius;
      if (n < need) return [`将旁 ${n}/${need}`, `四面楚歌还要围住项羽：楚将周围两格内（以楚将为中心的 5×5，棋盘上已标出）至少 ${need} 枚汉军棋子，现在 ${n} 枚`];
    }
    if (XQ.inCheck(game.board, side)) return ['先应将', `正被将军，${N}解不了将，先应将`];
    return ['不可用', `${N}现在不能发动`];
  }
  // 四面楚歌的范围：楚将周围 5×5，标出已在范围内的汉军棋子
  function simianZone() {
    const R = BF.CFG.ultimates.simian.radius;
    let k = null; for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = game.at(f, r); if (p && p.s === 'b' && p.t === 'k') k = [f, r]; }
    if (!k) return;
    const hits = [];
    for (let r = k[1] - R; r <= k[1] + R; r++) for (let f = k[0] - R; f <= k[0] + R; f++) { const p = game.at(f, r); if (p && p.s === 'r') hits.push([f, r]); }
    Board.showZone([Math.max(0, k[0] - R), Math.max(0, k[1] - R)], [Math.min(8, k[0] + R), Math.min(9, k[1] + R)], hits);
  }
  const isCompact = () => innerWidth <= 760 || innerWidth / innerHeight < 0.8;
  function renderBar() {
    const bar = $('bfBar');
    paintVeil();
    const rsOn = game && game.bf && mode && started && !ended && !busy && !bfMode && !dbgOn && canAct();
    const rs = rsOn ? readySkills() : [];
    Board.setGlow(rs);
    // 屏幕下方闪烁提示：本回合还有技能没用（点一下依次选中这些子）
    const sh = $('skHint');
    sh.classList.toggle('hidden', !rs.length);
    if (rs.length) sh.querySelector('small').textContent = `${rs.length} 枚子可用 · 点我查看`;
    const show = !!(game && game.bf && mode && started && !ended && !game.result && canAct() && !dbgOn);
    bar.classList.toggle('hidden', !show);
    if (!show) { $('bfRow').innerHTML = ''; $('bfHint').textContent = ''; return; }
    const B = [];
    let hint = '';
    if (bfMode) {
      hint = bfMode.hint;
      if (bfMode.bs) { if (bfMode.m1 || bfMode.bad) B.push(`<button class="sk" data-a="bsRedo">重 走<small>棋子归位</small></button>`); }   // 背水一战发动后不能取消，只能把两步重走
      else if (bfMode.kind === 'rvUp') {
        const o = bfMode.o;
        B.push(`<button class="sk up ready" data-a="rvUp">升${LVCN[o.upLv]}级<small>${o.upCost} 功${r6On() && r6On().reviveHalf ? ' · 半价' : ''}</small></button>`);
        B.push(`<button class="sk ready ok" data-a="rvEnd">结束回合<small>不升级</small></button>`);
        B.push(`<button class="sk" data-a="rvRedo">重 选<small>换一枚</small></button>`);
      }
      else if (bfMode.kind === 'rvPlace') {
        // 位置也给成按钮（棋盘角上的格子可能被名牌挡住）：车马炮士相分左右，兵按从左到右的五个兵位
        const o = bfMode.o, nmAt = q => (o.t === 'p' ? ['左边', '', '左二', '', '中路', '', '右二', '', '右边'][q[0]] : q[0] < 4 ? '左边' : '右边');
        o.squares.forEach((q, i) => B.push(`<button class="sk ready" data-a="rvAt" data-i="${i}">${nmAt(q)}<small>放这里</small></button>`));
        B.push(`<button class="sk" data-a="cancel">取消<small>换一着</small></button>`);
      }
      else if (bfMode.kind !== 'rvBusy') {
        if (bfMode.kind === 'confirm') B.push(`<button class="sk ready ok" data-a="ok">确 定<small>${bfMode.a.k === 'mv' ? '落子' : '发动'}</small></button>`);
        B.push(`<button class="sk" data-a="cancel">取消<small>换一着</small></button>`);
      }
    } else {
      const a = bfAvail();
      // 按钮不可用时不用 disabled（点了没反应像坏了），改成灰色 + 点一下说明原因；所有按钮悬停 / 长按看说明
      const btn = (cls, act, ok, label, small, why, extra = '', tip = '') => `<button class="sk ${cls}${ok ? '' : ' off'}" data-a="${act}" ${ok ? '' : `data-why="${why}"`} data-tip="${escTip(tip || why)}">${label}<small>${small}</small>${extra}</button>`;
      if (a.p) {
        hint = (a.p.t === 'k' ? game.rankName(a.p) : `${game.heroName(a.p) ? game.heroName(a.p) + ' · ' : ''}${game.rankName(a.p)} · ${LVCN[a.p.lv]}级${pname(a.p)} · ${a.p.hp} 血`) + (game.atkOf(a.p) > 1 ? ` · 攻 ${game.atkOf(a.p)}` : '') + (a.p.xp ? ` · 记功 ${a.p.xp}` : '');
        if (a.p.t !== 'k') {
          if (a.cost != null) {
            const m = game.merit[a.p.s], save = a.base - a.cost;
            const upNoEsc = !game.upgraded && game.upOnly && game.upOnly() && !game.upEscapes(sel[0], sel[1]);
            B.push(btn('up', 'up', a.canUp, `升${LVCN[a.p.lv + 1]}级`, game.upgraded ? '本回合已升' : upNoEsc ? '解不了将' : `${a.cost} 功` + (halfNow(a.p) ? '·半价' : '') + (save ? `·省${save}` : ''), game.upgraded ? '每次行动最多升级一次，下次行动再升' : upNoEsc ? '被将军时只能给能解将的子升级：升它解不了将，换一枚' : `升级需要 ${a.cost} 军功，现在只有 ${m}`, '', upTip(a.p, a.cost, a.base)));
          }
          for (const k of a.skills) {
            const cn = BF.SKILL_CN[k.sk], skTip = skillTip(a.p, k.sk), C = BF.CFG.skills[k.sk];
            if (!k.have) { B.push(btn('', 'sk', false, cn, `${LVCN[k.lv]}级解锁`, `${cn}：升到${LVCN[k.lv]}级才解锁`, '', skTip)); continue; }
            // 不能用的原因由规则引擎给出（冷却、封锁、踏营须过河、没有目标……）
            const whyE = game.skillWhy(sel[0], sel[1], k.sk);
            const tag = w => (/冷却/.test(w) ? '冷却' : /敌方半场/.test(w) ? '须先过河' : /四面楚歌/.test(w) ? '涣散中' : /破釜/.test(w) ? '封锁中' : /拒马，/.test(w) ? '已用拒马' : '无目标');
            if (k.passive) {
              const small = whyE ? (k.cd ? `冷却 ${k.cd}` : tag(whyE)) : C.move ? '被动·直接走' : '被动';
              B.push(`<button class="sk pas off" data-a="sk" data-sk="${k.sk}" data-why="${escTip(whyE ? cn + '：' + whyE : cn + '是被动技能，' + (C.move ? '冷却好了就能直接走，不用点（落点带金圈）' : '走子落下时自动发动'))}" data-tip="${escTip(skTip + (whyE ? '<br><em>' + whyE + '</em>' : ''))}">${cn}<small>${small}</small></button>`);
              continue;
            }
            const cdTot = C.cooldown || 1, pct = k.cd ? Math.round(k.cd / cdTot * 100) : 0;
            const why = whyE ? cn + '：' + whyE : '', small = whyE ? tag(whyE) : C.free ? '不占行动' : '可用';
            B.push(btn(why ? '' : 'ready', 'sk" data-sk="' + k.sk, !why, cn, small, why, k.cd ? `<span class="cd" style="--p:${pct}%"></span><span class="cdn">${k.cd}</span>` : '', skTip + (why ? '<br><em>' + why + '</em>' : '')));
          }
        }
      }
      const side = a.side;
      // 手机：主帅兵法 / 终极兵法放在自己卡片上（点卡片上的签发动），技能栏只在选中棋子时出现，不压棋盘
      if (!isCompact()) {
        const aw = artWhy(side, a), uw = ultWhy(side, a);
        B.push(btn('art', 'art', !aw, BF.ART_CN[side], aw ? aw[0] : '每局一次', aw ? aw[1] : '', '', artTip(side) + (aw ? '<br><em>' + aw[1] + '</em>' : '')));
        B.push(btn('ult', 'ult', !uw, BF.ULT_CN[side], uw ? uw[0] : BF.CFG.ultimates.cost + ' 功', uw ? uw[1] : '', '', ultTip(side) + (uw ? '<br><em>' + uw[1] + '</em>' : '')));
      }
      if (a.pass) B.push(`<button class="sk${a.mustPass ? ' ready' : ''}" data-a="pass" data-tip="${escTip(a.mustPass ? '无子可走，只能停着（这一回合不行动）' : '四面楚歌期间楚军没被将军时可以停着：这一回合不行动')}">停 着<small>${a.mustPass ? '无子可走' : '按兵不动'}</small></button>`);
      if (!a.p) hint = game.freeUsed ? '已架拒马 · 请再走一步棋' : `${SIDE_ARMY[side]}行动 · 军功 ${game.merit[side]}`;
      if (isCompact() && !game.freeUsed) hint = '';
    }
    if (!B.length && !(bfMode && bfMode.bs)) { bar.classList.add('hidden'); $('bfRow').innerHTML = ''; $('bfHint').textContent = ''; layoutSoon(); return; }
    $('bfHint').textContent = hint;
    $('bfRow').innerHTML = B.join('');
    $('bfRow').querySelectorAll('button[data-a]').forEach(b => b.onclick = ev => { ev.stopPropagation(); bfButton(b.dataset.a, b); });
    layoutSoon();
  }
  let skillCycle = 0;
  $('skHint').addEventListener('click', ev => { ev.stopPropagation(); bfButton('pickSkill'); });
  async function bfButton(a, el) {
    if (!canAct()) return;
    Sfx.select && Sfx.select();
    if (a === 'pickSkill') { const rs = readySkills(); if (!rs.length) return; const p = rs[skillCycle++ % rs.length]; exitBfMode(false); bfSelect(p[0], p[1]); renderBar(); return; }
    if (el && el.classList.contains('off')) {
      toast(el.dataset.why || '现在不能用', 4200);
      if (a === 'ult' && game.turn === 'r' && !game.used.ult.r) simianZone();
      return;
    }
    if (a === 'bsRedo') { if (bfMode && bfMode.bs) bsReset(); return; }
    if (a === 'rvUp' || a === 'rvEnd') {   // 召回落位后：升级 / 不升级，这时才真正提交
      const M = bfMode; if (!M || M.kind !== 'rvUp' || !canAct()) return;
      if (a === 'rvUp') {   // 升级先弹确认框；取消就回到「升级 / 结束回合 / 重选」，什么都不提交
        if (upOpen) return;
        const key = game.entries.length;
        const ok = await upConfirm({ s: game.turn, t: M.o.t, lv: M.o.upLv - 1 }, M.o.upCost, M.o.upCost, !!(r6On() && r6On().reviveHalf));
        if (!ok || bfMode !== M || game.entries.length !== key || !canAct()) return;
      }
      bfMode = null; rvLanded = M.o.id;
      const e = { k: 'art', id: M.o.id, at: M.at.slice() }; if (a === 'rvUp') e.up = true;
      if (!doBF(e)) { rvLanded = null; Board.reconcile(game); renderBar(); }
      return;
    }
    if (a === 'rvAt') { const M = bfMode; if (M && M.kind === 'rvPlace' && el && M.o.squares[+el.dataset.i]) reviveLand(M.o, M.o.squares[+el.dataset.i]); return; }
    if (a === 'rvRedo') { if (bfMode && bfMode.kind === 'rvUp') { exitBfMode(false); renderBar(); reviveFlow(); } return; }
    if (a === 'ok') { if (bfMode && bfMode.kind === 'confirm') { const act = bfMode.a; bfMode = null; doBF(act); } return; }
    if (a === 'cancel') { if (bfMode && bfMode.bs) return; exitBfMode(false); Board.clearMoves(false); if (sel) bfSelect(sel[0], sel[1]); renderBar(); return; }
    if (a === 'up' && sel) {
      const av = bfAvail();
      if (av.p && game.upOnly && game.upOnly() && !game.upEscapes(sel[0], sel[1])) { toast('升它解不了将：被将军时只能给能解将的子升级，换一枚', 2600); return; }   // Ham 10-10 td-017 选 B
      if (!av.p || !av.canUp || av.cost == null) { doBF({ k: 'up', at: sel }); return; }   // 升不了：照原来的路子走（会说明原因）
      if (upOpen) return;
      const at = sel.slice(), key = game.entries.length;
      upConfirm(av.p, av.cost, av.base, halfNow(av.p)).then(ok => { if (ok && game.entries.length === key && canAct()) doBF({ k: 'up', at }); });   // 框开着的时候棋局变了（超时、对方动了），就不升
      return;
    }
    if (a === 'sk' && sel) {
      const av = bfAvail(), skn = (el && el.dataset.sk) || game.skillOf(av.p), k = (av.skills || []).find(x => x.sk === skn);
      if (!k) return;
      const cn = BF.SKILL_CN[skn];
      if (k.targets.length === 1 && !k.targets[0].to) { doBF(k.targets[0]); return; }
      bfMode = { kind: 'sk', targets: k.targets, hint: `${cn}：点选目标（${{ chongzhen: '点前方第一枚子当跳板', taying: '无视马腿', pili: '炮击敌子', qishe: '斜线两格内' }[skn] || ''}）` };
      Board.showMoves(sel, bfDmg(k.targets.map(t => ({ from: t.at, to: t.to, atk: true, skill: true, arc: ARC_SK.has(k.sk) })), k.sk), true);   // 技能的落点都带金色四角框，和普通走子区分开
      renderBar(); return;
    }
    if (a === 'art') {
      if (game.turn === 'r') {
        const opts2 = game.reviveOptions(), R = r6On();
        if (!R) {
          const id = await pick('召 回 良 将', '复活一枚被吃的子，放回它的开局位置（一级）。', opts2.map(o => ({ v: o.id, label: XQ.NAMES.r[o.t], cls: 'r' })));
          if (id != null && canAct()) doBF({ k: 'art', id: +id });
          return;
        }
        reviveFlow();
        return;
      }
      if (BF.CFG.beishui.on) {
        // 背水一战一旦发动就收不回来：先郑重问一句
        const B = BF.CFG.beishui;
        const ok = await ask('背 水 一 战', `一旦发动就不能收回：这一回合必须把背水一战的两步走完（${bsHow()}）。每局只有这一次。走完两步时楚将不能被将军、也不能将着汉帅，合计最多吃 ${B.maxKills} 个子；用过的子下一回合不能动。`, 0, '发 动', '再想想');
        if (ok && canAct() && game.turn === 'b' && !bfMode) bsStart();
        return;
      }
      bfClear();
      bfMode = { kind: 'pofu', firsts: game.pofuFirst(), hint: '破釜沉舟 · 第一步：选子走一步（两步走完不能将军）' };
      renderBar(); return;
    }
    if (a === 'ult') {
      const s = game.turn;
      if (s === 'r') simianZone();
      const U = BF.CFG.ultimates;
      const ok = await ask(BF.ULT_CN[s], s === 'b' ? `花 ${U.cost} 军功：接下来 ${U.hongmen.rounds} 回合汉帅不能移动（汉军三级以上的士护驾可破）。` : `花 ${U.cost} 军功：接下来 ${U.simian.rounds} 回合楚军军心涣散——除楚将外都不能移动，只能吃掉正在将军的子；不能用技能，也不算将军。`, 0, '发 动', '再想想');
      if (ok && canAct()) doBF({ k: 'ult' });
      return;
    }
    if (a === 'pass') doBF({ k: 'pass' });
  }
  // 召回良将（r6）：选兵种 → 有不止一个空位就在棋盘上点位置 → 落位。升得起级的话落位后停一下，玩家自己点「升级」或「结束回合」
  //   棋局里召回和当场升级是同一个行动（{ k:'art', id, at, up }），所以落位那一下先只演不提交，等玩家点了再提交
  let rvLanded = null;
  async function reviveFlow() {
    const R = r6On(), list = game.reviveOptions(), blocked = game.reviveBlocked();
    const sm = t => `<small style="display:block;font-size:calc(12px * var(--fs,1));line-height:1.4;opacity:.85">${t}</small>`;
    const silver = 'background:linear-gradient(160deg,#fbfcfd,#cfd6df 55%,#eef1f5);border-color:#8a94a3;box-shadow:inset 0 0 0 1px #fff8;';
    const items = list.map((o, i) => ({ v: i, label: XQ.NAMES.r[o.t] + sm(LVCN[o.lv] + '级'), cls: 'r', w: '74px', style: o.lv >= 2 ? silver : '' }))
      .concat(blocked.map(t => ({ v: 'x', label: XQ.NAMES.r[t] + sm('原位被占'), cls: 'r', w: '74px', dis: true })));
    const v = await pick('召 回 良 将', `复活一枚被吃的子，放回原位（最多${LVCN[R.reviveLevel]}级）。`, items);
    const o = v == null ? null : list[+v];
    if (!o || !canAct() || game.turn !== 'r' || bfMode) return;
    if (o.squares.length > 1) {
      bfClear();
      bfMode = { kind: 'rvPlace', o, hint: `召回${XQ.NAMES.r[o.t]}：放到哪边？` };
      Board.showMoves(null, o.squares.map(q => ({ to: q, skill: true })), true);
      renderBar(); return;
    }
    reviveLand(o, o.squares[0]);
  }
  async function reviveLand(o, sq) {
    Board.clearMoves(false);
    if (!o.canUp) { bfMode = null; doBF({ k: 'art', id: o.id, at: sq.slice() }); return; }
    bfClear();
    bfMode = { kind: 'rvBusy', hint: '' }; renderBar();   // 落位演出期间不接别的操作
    busy++;
    try {
      await BFX.reviveShow({ t: o.t, id: o.id, at: sq, lv: o.lv });
      const m = Board.pieces.get(o.id);
      if (m) Board.decorate(m, { s: 'r', t: o.t, id: o.id, lv: o.lv, hp: BF.hpOf(o.t, o.lv), xp: 0, kills: 0 }, {});
    } catch (e) { console.error(e); }
    busy--; Core.Time.skip = false;
    if (!(bfMode && bfMode.kind === 'rvBusy') || game.result || ended) { Board.reconcile(game); return; }   // 演出期间棋局变了（超时、认输……）
    bfMode = { kind: 'rvUp', o, at: sq.slice(), hint: `${XQ.NAMES.r[o.t]}归阵 · 要升级现在点` };
    renderBar();
  }
  function pick(title, text, items) {
    return new Promise(res => {
      $('pickT').textContent = title; $('pickP').textContent = text;
      $('pickList').innerHTML = items.map(i => i.br ? '<i style="flex-basis:100%;height:0"></i>' : `<button class="btn small ${i.cls || ''}" data-v="${i.v}"${i.dis ? ' disabled' : ''} style="${i.w ? `width:${i.w};max-width:260px;padding-left:4px;padding-right:4px;` : ''}${i.style || ''}${i.dis ? 'opacity:.45' : ''}">${i.label}</button>`).join('');
      $('mPick').classList.remove('hidden');
      const fin = v => { $('mPick').classList.add('hidden'); res(v); };
      $('pickList').querySelectorAll('button').forEach(b => b.onclick = () => fin(b.dataset.v));
      $('pickNo').onclick = () => fin(null);
    });
  }
  // 执行一条兵法行动（本地或对手发来）
  function doBF(e, remote = false, clk) {
    if (e.k === 'art' && e.steps) { Board.reconcile(game); Board.showStep(null); }
    const note = bfNote(game, e);
    ktInit();
    const kt0 = { side: game.turn, chk: game.inCheck(), heroes: [] };
    for (const row of game.board) for (const q of row) if (q && q.nm != null) kt0.heroes.push({ id: q.id, s: q.s, t: q.t, nm: q.nm });
    if (e.k === 'mv' && e.from && e.to) { kt0.pc = game.at(e.from[0], e.from[1]); kt0.cap = game.at(e.to[0], e.to[1]); }
    const info = game.apply(e);
    if (info && rvLanded != null && e.k === 'art' && e.id === rvLanded) info.landed = true;   // 界面已经先演过落位
    rvLanded = null;
    if (!info) { if (!remote) toast('这一步不合法'); return false; }
    bfMode = null; sel = null; selMoves = []; Board.clearMoves();
    barKey = '';
    if (!remote && online()) Net.send({ t: 'bf', n: game.entries.length - 1, e, clk: clock[info.side] });
    if (e.k === 'up' || info.free) {
      bfUpNote = (bfUpNote ? bfUpNote + ' ' : '') + note;
      bfReport(info); bfMerit(info);
      queueBF(info);
      updateHud(); publish();
      if (info.free) return true;
      if (!remote) setTimeout(() => { if (canAct() && game.turn === info.side) { const p = game.board.flat().find(x => x && x.id === info.id); const pos = p && (() => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) if (game.board[r][f] === p) return [f, r]; })(); if (pos) { bfSelect(pos[0], pos[1]); renderBar(); } } }, 50);
      return true;
    }
    notes.push((bfUpNote ? bfUpNote + ' ' : '') + note); bfUpNote = ''; renderLog();
    Fx.ply = game.history.length;
    { const alive = new Set(); for (const row of game.board) for (const q of row) if (q) alive.add(q.id);
      info.heroDead = kt0.heroes.filter(h => !alive.has(h.id));
      if (e.k === 'mv' && kt0.pc) ktBefore(kt0.side, kt0.pc, e.from, e.to, kt0.cap && !alive.has(kt0.cap.id) ? kt0.cap : null, kt0.chk); else ktBefore(kt0.side, null); }
    if (remote && clk != null) clock[info.mover] = clk;
    clock.step = stepMax(); clock.oppStamp = 0;
    turnStartAt = 0;
    info.captured = info.cap; info.streak = captureStreak();
    if (info.result && info.result.reason === 'checkmate') info.mateName = XQ.mateName(game.board, info.result.loser);
    bfReport(info); bfMerit(info);
    queueBF(info);
    updateHud(); publish();
    return true;
  }
  function queueBF(info) {
    busy++;
    $('skip').classList.remove('hidden'); $('skip').textContent = '跳过 ▸▸';
    anim = anim.then(async () => {
      await BFX.play(info, BF.view(info.after));
      if (info.k !== 'up' && info.from) Board.showLast(info.from, info.to || info.from);
    }).catch(e => console.error(e)).then(() => {
      busy--;
      Core.Time.skip = false;
      if (!busy) $('skip').classList.add('hidden');
      if (!busy) Board.reconcile(game);
      if (info.k === 'up' || info.free) { updateHud(); return; }
      clock.step = stepMax(); clock.last = performance.now();
      if (online() && game.turn === mySide) Net.send({ t: 'clk', side: mySide, total: clock[mySide], step: clock.step });
      const kills = game.history.reduce((n, h) => n + (h.kills ? h.kills.length : 0), 0);
      Sfx.Music.setIntensity(game.result ? 1 : game.inCheck() ? 0.95 : Math.min(0.72, 0.32 + kills * 0.03));
      afterMoveLines(info);
      if (info.captured) Spect.react(info.mover);
      if (!busy && game.turn === mySide) { turnStartAt = performance.now(); slowIdx = 0; }
      updateHud();
      if (!game.bf) return;   // 演出放完时已经换了一局（退出重开）
      { const ph = (info.ev || []).find(x => x.e === 'phase'); if (ph && !info.result) showPhaseTip(ph); }
      if (game.mustPass() && canAct() && (mode === 'local' || game.turn === mySide)) toast(`${SIDE_CN[game.turn]}方无子可走，请点「停着」`, 2600);
      else if (game.upOnly && game.upOnly() && canAct() && (mode === 'local' || game.turn === mySide)) toast('被将军：直接走解不了将，先给能解将的子升一级（升了也解不了将的子不让升）', 3200);
      else if (game.mayPass() && game.fx.sm > 0 && canAct() && (mode === 'local' || game.turn === mySide)) toast('四面楚歌：楚军只能走将，或点「停着」', 2800);
      if (info.result && !busy) endOrGrace(info.result);
      else if (!busy && (vsAI() || hostBot()) && isAI(game.turn)) maybeAI();
      else if (!busy) localFlip();
    });
  }
  // 战报
  function bfReport(info) {
    const s = info.side, o = other(s), ev = info.ev || [];
    const bd = info.before ? info.before.board : game.board;
    const at = a => (a ? bd[a[1]][a[0]] : null);
    const nm = (side, t) => SIDE_ARMY[side] + XQ.NAMES[side][t];
    const kills = ev.filter(x => x.e === 'kill'), hits = ev.filter(x => x.e === 'hit');
    let line = null;
    if (info.k === 'up') line = `${nm(s, info.t)}晋升「${BF.rankName(s, info.t, info.lv)}」（${LVCN[info.lv]}级）` + (info.usedXp ? '（杀敌记功攒满，自动晋升）' : '');
    else if (info.k === 'mv') {
      const P0 = at(info.from), T0 = at(info.to);
      const died = kills.find(k => P0 && k.id === P0.id);
      if (died && T0) line = `${nm(o, T0.t)}立拒马，${nm(s, P0.t)}撞阵身亡`;
      else if (T0 && kills.some(k => k.id === T0.id)) line = `${nm(s, P0.t)}击杀${nm(o, T0.t)}`;
      else if (T0) line = `${nm(s, P0.t)}强攻${nm(o, T0.t)}，未能拿下`;
      else if (info.check) line = `${nm(s, P0.t)}将军！`;
    } else if (info.k === 'sk') {
      const P0 = at(info.from), sk = info.extra.sk, cn = BF.SKILL_CN[sk];
      const foe = kills.filter(k => k.s === o), hurt = hits.filter(h => true);
      if (sk === 'juma') line = `${nm(s, P0.t)}立起拒马`;
      else if (sk === 'hujia') line = info.extra.rescue ? '樊哙闯帐：汉士护驾，鸿门宴破' : `${nm(s, P0.t)}护驾，与${s === 'r' ? '汉王' : '霸王'}换位`;
      else if (sk === 'chongzhen') line = foe.length >= 2 ? `${SIDE_ARMY[s]}车冲阵，连破${SIDE_ARMY[o]}两阵` : foe.length ? `${SIDE_ARMY[s]}车冲阵，击破${nm(o, foe[0].t)}` : `${SIDE_ARMY[s]}车冲阵受阻`;
      else line = `${nm(s, P0.t)}${cn}` + (foe.length ? `，击杀${foe.map(k => XQ.NAMES[o][k.t]).join('、')}` : '') + (hurt.length ? `，${hurt.length} 子负伤` : '');
    } else if (info.k === 'art') line = s === 'r' ? (() => { const rv = ev.find(x => x.e === 'revive') || {}, ru = ev.find(x => x.e === 'reviveUp'); return `召回良将：${nm('r', rv.t || 'p')}重回阵前` + (rv.lv > 1 ? `（${LVCN[rv.lv]}级）` : '') + (ru ? `，当场晋升「${BF.rankName('r', ru.t, ru.lv)}」（${LVCN[ru.lv]}级），花 ${ru.cost} 功` : ''); })() : `项羽${BF.ART_CN.b}，楚军连进两步` + (kills.length ? `，击杀${kills.filter(k => k.s === o).map(k => XQ.NAMES[o][k.t]).join('、')}` : '');
    else if (info.k === 'ult') line = s === 'b' ? `鸿门宴：汉王 ${BF.CFG.ultimates.hongmen.rounds} 回合不得移动` : '四面楚歌：楚军军心涣散，动弹不得';
    else if (info.k === 'pass') line = `${SIDE_ARMY[s]}按兵不动`;
    if (info.k === 'mv' && info.extra && info.extra.via === 'shensu') line = `${nm(s, 'p')}神速营疾行` + (info.check ? '，将军！' : '');
    if (info.k === 'mv' && info.extra && info.extra.via === 'feiyue') line = line ? line.replace(nm(s, 'e'), nm(s, 'e') + '飞越，') : `${nm(s, 'e')}飞越`;   // 被动飞越：在原句里标出来
    if (info.k === 'mv' && info.extra && info.extra.via === 'taying') line = line ? line.replace(nm(s, 'n'), nm(s, 'n') + '踏营，') : `${nm(s, 'n')}踏营`;
    if (ev.some(x => x.e === 'final')) { line = (line ? line + '；' : '') + '决战：双方车马兵炮尽没，象、士、帅将皆可过河'; }
    const oc = ev.find(x => x.e === 'occupy');
    if (oc) line = (line ? line + '；' : '') + `${oc.s === 'r' ? '汉帅' : '楚将'}占住${oc.s === 'r' ? '楚' : '汉'}营九宫 ${oc.n}/${BF.CFG.finalOccupyRounds}` + (oc.n >= BF.CFG.finalOccupyRounds ? '，夺营！' : '');
    const au = ev.find(x => x.e === 'autoup');
    if (au) { const hero = BF.heroName({ s: au.s, t: au.t, nm: au.nm }); line = (line ? line + '；' : '') + `${nm(au.s, au.t)}战功晋升「${hero || BF.rankName(au.s, au.t, au.lv)}」`; }
    if (!line) return;
    const L = $('bfReport'); L.classList.remove('hidden');
    const li = document.createElement('li'); li.className = s; li.textContent = line; L.appendChild(li);
    const max = document.body.classList.contains('compact') ? 1 : 4;
    while (L.children.length > max) L.firstChild.remove();
    setTimeout(() => { li.classList.add('old'); setTimeout(() => li.remove(), 900); }, 7000);
  }
  // 军功变动：主将卡军功印上飞金光（美术 M19，merit.js；Ham 10-10 审批台 070 选「乙 · 军功印」+「甲 · 金光」）
  //   一步里有好几笔（吃子又将军）一笔一笔排着飞，花在前、加在后；击杀、哀兵从倒下的子飞来，过河从落点飞来，将军、每回合进账从顶上状态条飞来
  function bfMerit(info) {
    if (typeof Merit === 'undefined') return;
    const ev = info.ev || [], at = a => (a ? Merit.at(a[0], a[1]) : null);
    const spend = { r: [], b: [] }, gain = { r: [], b: [] };
    if (info.k === 'up') spend[info.side].push([info.cost, '升级', at(info.at)]);
    { const ru = ev.find(x => x.e === 'reviveUp'); if (ru) spend.r.push([ru.cost, '召回升级', at(info.e && info.e.at)]); }   // 试行规则：召回后当场升级花的军功
    if (info.k === 'ult') spend[info.side].push([BF.CFG.ultimates.cost, '兵法', cardFor(info.side).querySelector('.fxs [data-k="ult"]')]);
    let lastKill = null;
    for (const x of ev) {
      if (x.e === 'kill') lastKill = x.at;
      if (x.e !== 'merit' || x.n <= 0) continue;
      const from = x.why === '击杀' || x.why === '哀兵' ? at(lastKill) : x.why === '过河' ? at(info.to) : null;
      gain[x.s].push([x.n, x.why, from]);
    }
    for (const s of ['r', 'b']) {
      const out = spend[s].reduce((a, q) => a + q[0], 0), inn = gain[s].reduce((a, q) => a + q[0], 0);
      let v = game.merit[s] - inn + out, t = 0;   // 动画开始前印上该是几
      for (const [n, why, to] of spend[s]) { v -= n; const vv = v; setTimeout(() => Merit.spend(s, n, why, to, vv), t); t += 450; }
      for (const [n, why, from] of gain[s]) { v += n; const vv = v; setTimeout(() => Merit.gain(s, n, why, from, vv), t); t += 300; }
    }
  }


  // ---------- 兵法调试：自由摆子、改军功等级生命、回合 ----------
  const DBG_TYPES = ['k', 'a', 'e', 'n', 'r', 'c', 'p'];
  function dbgPaint() {
    $('dbgPal').innerHTML = ['r', 'b'].map(s => DBG_TYPES.map(t => `<button class="${s}${dbgPick && dbgPick.s === s && dbgPick.t === t ? ' on' : ''}" data-s="${s}" data-t="${t}">${XQ.NAMES[s][t]}</button>`).join('')).join('') + `<button data-s="" data-t="" class="${dbgPick && !dbgPick.t ? 'on' : ''}">空</button>`;
    // 再点一次同一个按钮（或点「停止摆放」）就退出摆放，回到“点棋盘选中棋子”
    $('dbgPal').querySelectorAll('button').forEach(b => b.onclick = () => {
      const same = dbgPick && (dbgPick.t || '') === b.dataset.t && (dbgPick.s || '') === b.dataset.s;
      dbgPick = same ? null : b.dataset.t ? { s: b.dataset.s, t: b.dataset.t } : { t: '' }; dbgPaint();
    });
    $('dbgStop').classList.toggle('hidden', !dbgPick);
    $('dbgTip').textContent = !dbgPick ? '点下面的子开始摆放；现在点棋盘是选中棋子。' : dbgPick.t ? `正在摆放：${SIDE_ARMY[dbgPick.s]}${XQ.NAMES[dbgPick.s][dbgPick.t]}（${dbgPick.t === 'k' ? '主帅不分等级' : '一二三四'[dbgLv - 1] + '级'}），点棋盘连续摆。` : '正在清除：点棋盘上的子把它拿掉。';
    $('bfDebug').querySelectorAll('[data-plv]').forEach(b => b.classList.toggle('on', +b.dataset.plv === dbgLv));
    const p = dbgSel && game.at(dbgSel[0], dbgSel[1]);
    $('dbgSel').textContent = p ? `${SIDE_ARMY[p.s]}${pname(p)} · ${p.lv}级 · ${p.hp}血 · 记功${p.xp || 0} · 冷却${game.cdLeft(p)}` : '—';
    $('dbgNoCd').textContent = '无冷却：' + (dbgNoCd ? '开' : '关'); $('dbgNoCd').classList.toggle('on', dbgNoCd);
    $('dbgFree').textContent = '自由移动：' + (dbgFree ? '开' : '关'); $('dbgFree').classList.toggle('on', dbgFree);
    $('dbgMr').value = game.merit.r; $('dbgMb').value = game.merit.b; $('dbgRound').value = game.round;
  }
  function dbgApply(fn) {
    game.setup(fn); game.noCd = dbgNoCd;
    notes = []; bfUpNote = ''; renderLog();
    Board.syncPosition(game); Board.faceViewer(viewSide); Board.showLast(null);
    barKey = ''; dbgPaint(); updateHud();
  }
  function dbgClick(f, r) {
    if (dbgPick) {
      dbgApply(T => {
        if (!dbgPick.t) { const q = T.board[r][f]; if (q && q.t !== 'k') T.board[r][f] = null; return; }
        const ids = T.board.flat().filter(Boolean).map(x => x.id).concat(T.dead.r.map(x => x.id), T.dead.b.map(x => x.id));
        if (dbgPick.t === 'k') { for (let rr = 0; rr < 10; rr++) for (let ff = 0; ff < 9; ff++) { const q = T.board[rr][ff]; if (q && q.t === 'k' && q.s === dbgPick.s) T.board[rr][ff] = null; } }
        const old = T.board[r][f]; if (old && old.t === 'k') return;
        const lv = dbgPick.t === 'k' ? 1 : Math.min(BF.levelInfo(dbgPick.t, dbgPick.s, 1).maxLv, dbgLv);
        T.board[r][f] = { s: dbgPick.s, t: dbgPick.t, id: Math.max(31, ...ids) + 1, lv, hp: dbgPick.t === 'k' ? 1 : BF.hpOf(dbgPick.t, lv), cd: 0, jm: 0, xp: 0, kills: 0 };
      });
      dbgSel = [f, r]; dbgPaint(); return;
    }
    dbgSel = game.at(f, r) ? [f, r] : null; dbgPaint();
    if (dbgSel) Board.showMoves(dbgSel, [], false); else Board.clearMoves(false);
  }
  function dbgPiece(fn) { if (!dbgSel) return; dbgApply(T => { const p = T.board[dbgSel[1]][dbgSel[0]]; if (p && p.t !== 'k') fn(p); }); }
  $('bfDebug').querySelectorAll('[data-lv]').forEach(b => b.onclick = () => dbgPiece(p => { const mx = BF.levelInfo(p.t, p.s, 1).maxLv; p.lv = Math.min(mx, +b.dataset.lv); p.hp = BF.hpOf(p.t, p.lv); }));
  $('bfDebug').querySelectorAll('[data-xp]').forEach(b => b.onclick = () => dbgPiece(p => { p.xp = Math.max(0, (p.xp || 0) + +b.dataset.xp); }));
  $('bfDebug').querySelectorAll('[data-hp]').forEach(b => b.onclick = () => dbgPiece(p => { p.hp = Math.max(1, Math.min(BF.hpOf(p.t, p.lv), p.hp + +b.dataset.hp)); }));
  $('bfDebug').querySelectorAll('[data-plv]').forEach(b => b.onclick = () => { dbgLv = +b.dataset.plv; dbgPaint(); });
  $('dbgStop').onclick = () => { dbgPick = null; dbgPaint(); };
  const DBG_CLEAR_CD = T => { for (const p of T.board.flat()) if (p) { p.cd = 0; p.jm = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; } };
  $('dbgNoCd').onclick = () => { dbgNoCd = !dbgNoCd; if (dbgNoCd) dbgApply(DBG_CLEAR_CD); else { game.noCd = false; dbgPaint(); } toast(dbgNoCd ? '无冷却：技能用完不进冷却' : '无冷却已关'); };
  $('dbgFree').onclick = () => { dbgFree = !dbgFree; dbgPaint(); toast(dbgFree ? '自由移动：不分回合，点哪边的子就走哪边' : '自由移动已关'); };
  // 自由移动：点到不该走的那一方的子（又不是当前选中子的攻击目标），就把走棋权切给它
  function dbgFreeTurn(p) {
    if (!dbgFree || mode !== 'local' || !game.bf || !p || bfMode) return;
    const pc = game.at(p[0], p[1]);
    if (!pc || pc.s === game.turn) return;
    if (sel && selMoves.some(m => m.to[0] === p[0] && m.to[1] === p[1])) return;
    const s = pc.s;
    dbgApply(T => { const n = Math.min(T.cnt.r, T.cnt.b); T.turn = s; T.cnt = s === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.upgraded = false; T.freeUsed = false; T.jmLock = null; });
    Board.clearMoves(false); sel = null; selMoves = [];
  }
  $('dbgCd').onclick = () => dbgApply(T => { for (const p of T.board.flat()) if (p) { p.cd = 0; p.jm = 0; for (const k of Object.keys(p)) if (k.startsWith('c_')) p[k] = 0; } });
  $('dbgMr').onchange = () => dbgApply(T => { T.merit.r = Math.max(0, Math.min(30, +$('dbgMr').value || 0)); });
  $('dbgMb').onchange = () => dbgApply(T => { T.merit.b = Math.max(0, Math.min(30, +$('dbgMb').value || 0)); });
  $('dbgRound').onchange = () => dbgApply(T => { const n = Math.max(1, +$('dbgRound').value || 1) - 1; T.cnt = T.turn === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.fx = { hm: 0, sm: 0, pf: 0 }; T.ckHist = { r: [], b: [] }; });
  $('bfDebug').querySelectorAll('[data-turn]').forEach(b => b.onclick = () => dbgApply(T => { const n = Math.min(T.cnt.r, T.cnt.b); T.turn = b.dataset.turn; T.cnt = T.turn === 'r' ? { r: n, b: n } : { r: n + 1, b: n }; T.upgraded = false; T.freeUsed = false; T.jmLock = null; }));
  $('dbgArts').onclick = () => dbgApply(T => { T.used = { art: { r: 0, b: 0 }, ult: { r: 0, b: 0 } }; });
  $('dbgFx').onclick = () => dbgApply(T => { T.fx = { hm: 0, sm: 0, pf: 0 }; });
  $('dbgClear').onclick = () => dbgApply(T => { for (let r = 0; r < 10; r++) for (let f = 0; f < 9; f++) { const p = T.board[r][f]; if (p && p.t !== 'k') T.board[r][f] = null; } });
  $('dbgReset').onclick = () => { game = new BF.Game(); dbgApply(() => { }); };
  $('dbgClose').onclick = () => { dbgOn = false; dbgPick = null; $('bfDebug').classList.add('hidden'); Board.clearMoves(false); updateHud(); };
  $('tRule').onclick = () => showBfTip(true);
  $('bfTipMore').onclick = () => { $('bfTip').classList.add('hidden'); $('mHelp').classList.remove('hidden'); };
  $('bfTipOk').onclick = () => { $('bfTip').classList.add('hidden'); clearTimeout(bfTipT); };
  $('tDebug').onclick = () => {
    $('mSet').classList.add('hidden'); if (!game.bf || mode !== 'local') return; dbgOn = !dbgOn; $('bfDebug').classList.toggle('hidden', !dbgOn); if (dbgOn) { dbgPick = null; dbgSel = null; dbgPaint(); toast('调试摆子：选子后点棋盘；改完关掉面板即可接着下'); } updateHud(); };

  // ---------- 悔棋 ----------
  function undoPlies(side) { return game.turn === side ? 2 : 1; }
  function canUndo() {
    if (!started || ended || busy || game.result || !opts.undo || pendingUndo || pendingJ) return false;
    const s = actor();
    if (mode === 'local') return game.history.length > 0 && (opts.undo >= 99 || undoUsed[XQ.other(game.turn)] < opts.undo);
    if (opts.undo < 99 && undoUsed[s] >= opts.undo) return false;
    const n = undoPlies(s);
    if (game.history.length < n) return false;
    if (vsAI()) return true;
    return online() ? Net.connected : true;
  }
  async function requestUndo() {
    if (!canUndo()) { if (opts.undo && started && !game.result) toast(opts.undo < 99 && undoUsed[actor()] >= opts.undo ? '悔棋次数已用完' : '现在不能悔棋'); return; }
    if (mode === 'local') {
      const who = XQ.other(game.turn); // 刚走完的一方
      const ok = await ask('悔 棋', `${SIDE_CN[who]}方请求悔棋一步，${SIDE_CN[game.turn]}方是否同意？`);
      if (ok) applyUndo(1, who); else toast('对方不同意');
      return;
    }
    if (vsAI()) {
      if (aiBoth()) { toast('电脑对电脑，不能悔棋'); return; }
      const plies = undoPlies(mySide);
      cancelAI();
      applyUndo(plies, mySide);
      aiSay('undo');
      return;
    }
    const plies = undoPlies(mySide);
    pendingUndo = { n: game.history.length, plies, side: mySide };
    Net.send({ t: 'undoReq', n: game.history.length, plies });
    toast('已请求悔棋，等待对方同意…', 3000);
    updateHud();
    setTimeout(() => { if (pendingUndo && pendingUndo.side === mySide && pendingUndo.n === game.history.length) { pendingUndo = null; updateHud(); } }, 22000);
  }
  // 兵法：悔棋 = 按行动序列重放到悔棋前（军功、等级、生命、冷却、状态全部还原），棋盘墨晕一下重新摆好
  async function bfRewind(n) {
    bfMode = null; barKey = '';
    Sfx.B.whoosh(0, 0.5, 0.3); Sfx.B.bell(0.1, 660, 0.08);
    for (const m of Board.pieces.values()) Fx.P.ink(m.position.clone().setY(Board.TOP + 0.1), 2, 0.3, 0.25, 0.5);
    await Core.sleep(0.25);
    // 悔掉的分支留着（C62 A：Ham 悔棋往往正是找到了电脑的漏洞）：被悔掉的行动、电脑当时的思考记录
    if (n < game.entries.length) {
      const th = {}; for (const k of Object.keys(game.__think || {})) if (+k >= n) { th[k] = game.__think[k]; delete game.__think[k]; }
      if (!game.__branches) game.__branches = [];
      game.__branches.push({ at: n, t: Date.now(), entries: JSON.parse(JSON.stringify(game.entries.slice(n))), think: th });
    }
    game.rebuild(n);
    rebuildNotes();
    Board.setPosition(game); Board.faceViewer(viewSide);
    const last = game.history[game.history.length - 1];
    Board.showLast(last && last.from ? last.from : null, last && last.from ? (last.to || last.from) : null);
  }
  function bfUndoTarget(plies) { return game.undoTarget(plies); }
  function applyUndo(plies, side) {
    undoUsed[side]++;
    Board.clearMoves(); sel = null; selMoves = [];
    busy++;
    anim = anim.then(async () => {
      if (game.bf) { await bfRewind(bfUndoTarget(plies)); return; }
      { const n = game.history.length - plies; if (n >= 0 && plies > 0) { if (!game.__branches) game.__branches = []; game.__branches.push({ at: n, t: Date.now(), moves: game.history.slice(n).map(h => ({ from: h.from, to: h.to })) }); } }
      for (let i = 0; i < plies; i++) { const h = game.undo(); if (h) { notes.pop(); await Fx.undoMove(h, game.at(h.from[0], h.from[1])); } }
      const last = game.history[game.history.length - 1];
      Board.showLast(last ? last.from : null, last ? last.to : null);
    }).catch(e => console.error(e)).then(() => {
      busy--; clock.step = stepMax(); clock.last = performance.now(); pendingUndo = null;
      Fx.ply = game.history.length;
      renderLog();
      if (!vsAI()) toast(`${SIDE_CN[side]}方悔棋`);
      turnStartAt = performance.now(); slowIdx = 0;
      updateHud(); publish();
      localFlip();
      maybeAI();
    });
  }

  // ---------- 喊话 ----------
  const bubT = {};
  // who：说话的不是主帅本人时（比如张良）写上名字
  function bubble(side, text, ms = 3500, who) {
    const mine = side === bottomSide();
    const el = mine ? $('bubMe') : $('bubOpp');
    el.querySelector('b').textContent = `${SIDE_CN[side]} · ${who || NAME[side]}`;
    el.querySelector('span').textContent = text;
    el.classList.add('on');
    clearTimeout(bubT[mine]); bubT[mine] = setTimeout(() => el.classList.remove('on'), ms);
  }
  let lastEmote = 0;
  function emote(side, i, text) {
    if (i != null) { bubble(side, PHRASES[i]); Voice.play(`${side}_t${i}`); }
    else { bubble(side, text); Sfx.B.shime(0, 0.4); Sfx.B.shime(0.12, 0.3); }
  }
  function sendEmote(i, text) {
    if (Date.now() - lastEmote < 1500) { toast('喊话太快了'); return; }
    lastEmote = Date.now();
    const side = actor();
    if (online()) { if (!Net.connected) { toast('对手不在线'); return; } Net.send({ t: 'emote', i, text }); }
    emote(side, i, text);
    $('chat').classList.add('hidden');
    if (vsAI() && Math.random() < 0.7) setTimeout(() => { if (!ended) aiSay('reply'); }, 2300);
  }
  function setupChat() {
    const W = watching();
    $('chatT').textContent = W ? '观 众 拱 火' : '阵 前 喊 话';
    $('watchOpts').classList.toggle('hidden', !W);
    const list = W ? SPEC_PHRASES : PHRASES;
    $('phr').innerHTML = list.map((p, i) => `<button data-i="${i}">${p}</button>`).join('');
    $('phr').querySelectorAll('button').forEach(b => b.onclick = () => (watching() ? specSay(+b.dataset.i) : sendEmote(+b.dataset.i)));
    if (W) { $('wName').textContent = `名号：${myName}`; paintAlleg(); }
  }
  setupChat();
  const sendFree = () => { const v = $('chatIn').value.trim().replace(/[<>]/g, '').slice(0, 24); if (!v) return; $('chatIn').value = ''; watching() ? specSay(null, v) : sendEmote(null, v); };
  $('chatSend').onclick = sendFree;
  $('chatIn').addEventListener('keydown', e => { if (e.key === 'Enter') sendFree(); });
  $('tChat').onclick = () => { $('chat').classList.remove('hidden'); };
  $('chatClose').onclick = () => $('chat').classList.add('hidden');

  // ---------- 联机消息 ----------
  function onData(d) {
    switch (d.t) {
      case 'join':
        if (Net.role !== 'host') return;
        // 揭棋：来人手里没有这局的密钥（换了设备/新棋手接替），无法继续揭子 → 重新洗牌开局
        if (mode === 'host' && game.jq && JK && d.jg !== JK.gid && game.history.length && !game.result && !ended) {
          toast('对手换了设备入座，揭棋重新洗牌开局', 3200);
          restart(); Net.send({ t: 'restart', state: snapshot() });
          return;
        }
        if (!mode && !mode_starting) {
          // 还没开局：对手先在房间里入座；他点了「准备」、房主再点「开始」才开局
          if (room && room.host) {
            if (room.ai) { Net.send({ t: 'full' }); Net.freeSeat(); return; }   // 房主在和人机下：来人去观战席
            if (!room.seated) { room.seated = true; room.ready = AUTOSTART; toast('对手已入座'); roomSfx('roomjoin'); try { Net.hallTouch(); } catch (e) { } paintRoom(); }
            roomTell();
            if (AUTOSTART) roomBegin();
            return;
          }
          return;
        }
        Net.send({ t: 'welcome', state: snapshot() });
        break;
      case 'seat':
        // 我已入座：进房间界面，点「准备」，等房主开局
        if (mode || Net.role !== 'guest') return;
        if (!room) {
          room = { code: Net.code, host: false, hostSide: d.hostSide, seated: true, ready: !!d.ready, hostOut: !!d.hostOut, ai2: d.ai2 || null };
          opts = d.opts || {};
          showPane('pWait'); $('roomCode').textContent = Net.code; $('waitChips').innerHTML = chipsFor(d.opts || {}, d.hostSide); $('roomLock').classList.toggle('hidden', !(d.opts && d.opts.pwh));
        } else { room.ready = !!d.ready; room.hostOut = !!d.hostOut; room.ai2 = d.ai2 || null; }
        paintRoom();
        break;
      case 'ready':
        if (Net.role === 'host' && room && room.host && room.seated && !mode) { if (d.on && !room.ready) roomSfx('roomready'); room.ready = !!d.on; paintRoom(); roomTell(); }
        break;
      case 'needpw':
        if (mode || pwAsking) return;
        pwAsking = true;
        askText('房 间 密 码', store.get('pw-' + Net.code, '') ? '密码不对，请重新输入。' : '这个房间上了密码。', '密码').then(pw => {
          pwAsking = false;
          if (pw == null) { Net.close(); clearInterval(joinTimer); clearUrl(); showPane('pHall'); return; }
          store.set('pw-' + Net.code, pwHash(Net.code, pw)); Net.send(joinMsg());
        });
        break;
      case 'welcome':
        if (mode === 'guest' && started) { syncFrom(d.state); return; }
        if (mode) return;
        clearInterval(joinTimer); closeRoom();
        hostSide = d.state.hostSide;
        startGame('guest', other(d.state.hostSide), d.state.opts, { state: d.state, intro: !(d.state.moves || []).length });
        break;
      case 'full': if (!mode && !enteringWatch) enterWatch(Net.code); break;
      case 'vacant':
        if (mode || enteringWatch || vacantAsked) break;
        vacantAsked = true;
        ask('入 座 或 观 战', '这局对手的座位空着（原棋手已离线）。要接替他继续下，还是入席观战？', 0, '接替入座', '观 战').then(yes => {
          if (mode) return;
          if (yes) { Net.send({ t: 'claim' }); $('joinNote').innerHTML = '<span class="spin"></span>正在入座…'; }
          else enterWatch(Net.code);
        });
        break;
      case 'sync': case 'restart':
        if (mode !== 'guest') return;
        if (d.t === 'restart') { if (Ending.running) { pendingRestart = d.state; Ending.skip(); toast('对手开始了新的一局'); } else restart(d.state); return; }
        syncFrom(d.state); break;
      case 'syncReq': if (mode === 'host') Net.send({ t: 'sync', state: snapshot() }); break;
      case 'again':
        if (mode !== 'host') break;
        if (Ending.running) { pendingRestart = true; Ending.skip(); toast('对手请求再来一局'); }
        else { restart(); Net.send({ t: 'restart', state: snapshot() }); }
        break;
      case 'move': {
        if (introSkip) introSkip();   // 对手跳过开场先走了：我这边的开场白也收掉
        // 揭棋：对方没收到我的揭示而重发了这步 → 再发一次揭示
        if (lastJx && d.n === lastJx.n && d.n === game.history.length - 1) { Net.send(lastJx); return; }
        if (d.n !== game.history.length) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
        const m = { from: d.from, to: d.to };
        if (game.jq && (d.ri || d.wc)) {
          const r = jqRespond(d);
          if (!r) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
          if (r.rv) m.rv = r.rv; if (r.cj != null) m.cj = r.cj;
        }
        if (!doMove(m, true, d.clk)) Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() });
        break;
      }
      case 'jx': jqResolve(d); break;
      case 'bf': {
        if (introSkip) introSkip();
        if (!game.bf) return;
        const E = game.entries;
        if (d.n < E.length && JSON.stringify(E[d.n]) === JSON.stringify(d.e)) return; // 重发的旧行动
        if (d.n !== E.length) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
        if (game.turn === mySide) { Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() }); return; }
        if (!doBF(d.e, true, d.clk)) Net.send(mode === 'guest' ? { t: 'syncReq' } : { t: 'sync', state: snapshot() });
        break;
      }
      case 'jqc':
        if (mode !== 'host' || !JK || d.gid !== JK.gid || !Jieqi.validCommits(d.cin) || !Jieqi.validCommits(d.cout)) break;
        {
          const opp = other(mySide);
          const same = JSON.stringify(JC.cin[opp]) === JSON.stringify(d.cin) && JSON.stringify(JC.cout[mySide]) === JSON.stringify(d.cout);
          if (same) break;
          if (game.history.length && JC.cin[opp]) { jqWarn('中途更换承诺'); break; }
          JC.cin[opp] = d.cin; JC.cout[mySide] = d.cout;
          publish(); updateHud();
        }
        break;
      case 'clk':
        if (d.side === mySide) return;
        clock[d.side] = d.total; clock.oppTotal = d.total; clock.oppStep = d.step; clock.oppStamp = performance.now();
        break;
      case 'undoReq':
        if (d.n !== game.history.length || busy) { Net.send({ t: 'undoRes', ok: false, n: d.n }); return; }
        pendingUndo = { n: d.n, plies: d.plies, side: other(mySide) }; updateHud();
        ask('对 手 请 求 悔 棋', `对手想退回 ${d.plies} 步（${d.plies === 2 ? '你的上一步也会退回' : '只退回他自己的一步'}），是否同意？`, 15).then(ok => {
          Net.send({ t: 'undoRes', ok, n: d.n, plies: d.plies });
          pendingUndo = null;
          if (ok) applyUndo(d.plies, other(mySide)); else updateHud();
        });
        break;
      case 'undoRes':
        if (!pendingUndo || pendingUndo.side !== mySide) return;
        if (d.ok && d.n === game.history.length) applyUndo(d.plies, mySide);
        else { pendingUndo = null; toast('对手拒绝了悔棋'); updateHud(); }
        break;
      case 'resign': { const r = game.resign(d.side); if (r) { toast('对手认输'); finishGame(r); } break; }
      case 'timeout': { const r = game.timeout(d.side); if (r) { toast('对手超时'); finishGame(r); } break; }
      case 'pause': onPause(d, other(mySide)); break;
      case 'emote': emote(other(mySide), d.i ?? null, typeof d.text === 'string' ? d.text.replace(/[<>]/g, '').slice(0, 24) : ''); break;
      case 'bye':
        if (room && room.host && !mode) { room.seated = false; room.ready = false; Net.freeSeat(); paintRoom(); toast('对手离开了座位'); try { Net.hallTouch(); } catch (e) { } break; }
        toast('对手离开了房间', 3000); break;
    }
  }
  let mode_starting = false, pwAsking = false;
  function syncFrom(st) {
    if (!st || RP) return;
    const stLen = game.bf ? (st.bfe || []).length : (st.moves || []).length, myLen = game.bf ? game.entries.length : game.history.length;
    // 房主已开了新的一局，但“再来一局”的消息丢了 → 跟着重开
    if (!stLen && !st.result && (game.result || ended) && !(game.jq && st.jq && JK && st.jq.gid !== JK.gid)) { if (Ending.running) { pendingRestart = st; Ending.skip(); } else restart(st); return; }
    // 我认输 / 超时的消息对方没收到 → 补发
    if (game.result && !st.result && stLen === myLen && (game.result.reason === 'resign' || game.result.reason === 'timeout') && game.result.loser === mySide) Net.send({ t: game.result.reason, side: mySide });
    // 揭棋：房主那边已是新的一局（换了牌）→ 跟着重开
    if (game.jq && st.jq && JK && st.jq.gid !== JK.gid) { restart(st); return; }
    if (game.jq && st.jq && st.jq.cin) { const opp = other(mySide); if (!JC.cin[opp] && Jieqi.validCommits(st.jq.cin[opp])) JC.cin[opp] = st.jq.cin[opp]; if (!JC.cout[mySide] && Jieqi.validCommits(st.jq.cout && st.jq.cout[mySide])) JC.cout[mySide] = st.jq.cout[mySide]; }
    if (game.jq && st.jq && JK && !(st.jq.cin && st.jq.cin[mySide])) Net.send({ t: 'jqc', gid: JK.gid, ...Jieqi.pub(JK) });
    if (game.bf) { bfSync(st, false); return; }
    const mine = game.history, theirs = st.moves || [];
    const same = (a, b) => a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
    const prefix = (a, b) => a.length <= b.length && a.every((m, i) => same(m, b[i]));
    // 我请求的悔棋对方已经同意、但“同意”的消息丢了：对方棋局正好少了这几步 → 照样悔棋
    if (pendingUndo && pendingUndo.side === mySide && prefix(theirs, mine) && mine.length - theirs.length === pendingUndo.plies) { applyUndo(pendingUndo.plies, mySide); undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st); updateHud(); return; }
    if (prefix(mine, theirs)) { for (const m of theirs.slice(mine.length)) doMove({ from: m.from, to: m.to, rv: m.rv, cj: m.cj }, true); }
    else if (prefix(theirs, mine) && mine.length - theirs.length === 1 && game.turn !== mySide) { const m = mine[mine.length - 1]; Net.send({ t: 'move', n: mine.length - 1, from: m.from, to: m.to, clk: clock[mySide] }); }
    else if (prefix(theirs, mine) && mine.length - theirs.length === 1 && game.turn === mySide) { /* 对方自己的那步还没落定（揭棋等揭示），不回滚，等它补上 */ }
    else { applyState(st); }
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function onPeer(s) {
    try { Net.hallTouch(); } catch (e) { }   // 大厅名册：有人入座 / 离座，马上更新“等对手 / 对局中”
    if (s === 'ok' && mode === 'guest' && started) Net.send({ t: 'syncReq' });
    if (s === 'ok' && mode === 'host' && started) Net.send({ t: 'sync', state: snapshot() });
    if (s === 'lost') lostSince = Date.now(); else lostSince = 0;
    if (s === 'ok' && started && !ended && lostSince === 0 && wasLost) toast('对手已重新连上，继续对局');
    wasLost = s === 'lost';
    updateHud();
  }
  // ---------- 断线：自己掉线（线路全断）或对手掉线，双方时钟都暂停；状态栏显示已等多久 ----------
  let wasLost = false, lineDownSince = 0, lineWasUp = false;
  const netDown = () => online() && !(opts && opts.ai) && (!Net.lineOk || Net.peerState !== 'ok');
  function netText() {
    if (!Net.lineOk) { const s = lineDownSince ? Math.floor((Date.now() - lineDownSince) / 1000) : 0; return `网络断开，正在重连${s >= 2 ? ' · ' + s + ' 秒' : '…'} · 时钟暂停`; }
    const s = lostSince ? Math.floor((Date.now() - lostSince) / 1000) : 0;
    return `对手掉线，等待重连${s ? ' · ' + s + ' 秒' : '…'} · 时钟暂停`;
  }
  setInterval(() => { if (started && !ended && !RP && netDown()) updateHud(); }, 1000);
  // 心跳里带上棋局进度（步数、是否终局）：双方连续两次对不上，就请求 / 推送一次同步，防止丢消息后互相干等
  let digestBad = 0, digestT = 0;
  function pingInfo() {
    if (!online() || !started) return null;
    const G = RP ? RP.real : game;
    return { n: G.bf ? G.entries.length : G.history.length, r: G.result ? 1 : 0 };
  }
  function onPing(d) {
    const me = pingInfo();
    if (!me || d.n == null || (me.n === d.n && me.r === (d.r || 0)) || pendingJ || pendingUndo || busy) { digestBad = 0; return; }
    if (++digestBad < 2 || Date.now() - digestT < 6000) return;
    digestT = Date.now(); digestBad = 0;
    if (mode === 'guest') Net.send({ t: 'syncReq' }); else Net.send({ t: 'sync', state: snapshot() });
  }
  let lostSince = 0, claimAsked = false;
  setInterval(() => {
    if (!online() || !started || ended || game.result || !lostSince) { claimAsked = false; return; }
    if (Date.now() - lostSince > 90000 && !claimAsked) {
      claimAsked = true;
      ask('对 手 离 线', '对手已离线超过 90 秒。要判对手负吗？', 0, '判对手负', '继续等待').then(ok => {
        if (ok && !game.result) { const r = game.timeout(other(mySide)); if (r) finishGame(r); }
      });
    }
  }, 5000);
  function onLine(n, total) {
    const t = n ? `线路已连接 ${n}/${total}` : '正在连接线路…';
    $('waitLine').textContent = t; $('joinLine').textContent = t;
    if (!n && lineWasUp) { lineDownSince = Date.now(); if (online() && started && !ended) toast('网络断开，正在自动重连…', 2400); }
    if (n && !lineWasUp && lineDownSince) {
      // 断线后重新连上：房主把整盘棋推给对手（客人那边会自动重新入座并拿到棋局）
      lineDownSince = 0;
      if (online() && started) {
        if (mode === 'host') { publish(); Net.send({ t: 'sync', state: snapshot() }); }
        else Net.send({ t: 'syncReq' });
        if (!ended) toast('已重新连上，继续对局', 2000);
      }
    }
    lineWasUp = !!n;
    if (mode) updateHud();
  }

  // ---------- 观战 ----------
  const SPEC_PHRASES = ['这步臭棋！', '将他！将他！', '车都不要了？', '快吃啊！', '妙手！', '下快点，看睡着了', '汉军威武！', '楚军必胜！'];
  let myName = store.get('specName', ''), myAlleg = 'n', lastSpecSay = 0, enteringWatch = false, specTimer = null, vacantAsked = false;
  const cleanTxt = t => String(t || '').replace(/[<>]/g, '').slice(0, 24);
  function feed(p, text) {
    if (!p) return;
    const li = document.createElement('li'); li.className = p.a;
    li.innerHTML = '<b></b><span></span>';
    li.querySelector('b').textContent = p.name; li.querySelector('span').textContent = text;
    const F = $('specFeed'); F.appendChild(li);
    while (F.children.length > 40) F.firstChild.remove();
    F.scrollTop = F.scrollHeight;
    $('specBox').classList.remove('hidden');
  }
  // ---------- 观众的名号（美术 M15 / Ham art-053：按进房先后叫农夫、樵夫、渔夫、牧童、书生、货郎，再往后加「二」「三」）----------
  //   房主起名、发给大家（观众频道 snames），大家看到的一样；观众走了名号空出来，下一个进来的先用空出来的那个
  const SPEC_ORDER = ['农夫', '樵夫', '渔夫', '牧童', '书生', '货郎'], CNN = ['', '', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  let specNames = {}, specToastT = 0;   // 观众的 pid → 名号（房主那份是源头）
  const specNameOf = (pid, fallback) => specNames[pid] || fallback;
  function hostNameSpecs() {
    if (Net.role !== 'host') return false;
    const live = [...Spect.people.values()].filter(p => !p.self).map(p => p.id);
    let changed = false;
    for (const id of Object.keys(specNames)) if (!live.includes(id)) { delete specNames[id]; changed = true; }
    const used = new Set(Object.values(specNames));
    for (const id of live) if (!specNames[id]) {
      for (let k = 0; k < 600; k++) { const r = Math.floor(k / 6) + 1, nm = SPEC_ORDER[k % 6] + (r > 1 ? CNN[r] || String(r) : ''); if (!used.has(nm)) { specNames[id] = nm; used.add(nm); changed = true; break; } }
    }
    return changed;
  }
  function sendSpecNames() { if (Net.role === 'host' && Object.keys(specNames).length) Net.sendSpec({ t: 'snames', m: specNames }); }
  setInterval(() => { if (Net.role === 'host' && (room || mode)) { if (hostNameSpecs()) setTimeout(paintRoom, 0); sendSpecNames(); } }, 4000);
  function specNamed() {   // 观众：拿到了自己的名号
    const nm = specNames[Net.myPid]; if (!nm || Net.role !== 'watch') return;
    if (nm !== myName) { myName = nm; Spect.upsert(Net.myPid, myName, myAlleg, true); specHello(); }
    if (specToastT) { clearTimeout(specToastT); specToastT = 0; toast(`你以「${myName}」的名号入席观战`, 2600); }
  }
  // 收到观众频道消息（棋手和观众都会收到）
  function onSpec(d) {
    if (!d || !d._p) return;
    setTimeout(paintRoom, 0);
    if (d.t === 'snames') {   // 房主发的名号表
      if (Net.role === 'host' || !d.m) return;
      specNames = d.m;
      for (const [id, nm] of Object.entries(specNames)) { const q = Spect.get(id); if (q && q.name !== nm) Spect.upsert(id, nm, q.a, q.self); }
      specNamed(); updateHud(); return;
    }
    if (d.t === 'sbye') { const p = Spect.get(d._p); if (p) feed(p, '离席'); Spect.remove(d._p); if (hostNameSpecs()) sendSpecNames(); updateHud(); return; }
    // 棋手把站在棋盘上的观众弹飞（发的人是棋手，不是观众，不能把他登记进观战席）
    if (d.t === 'flick') { specFlick(d.id, false); return; }
    const isNew = !Spect.has(d._p);
    let p = Spect.upsert(d._p, specNameOf(d._p, d.n), d.a, false);
    if (!p) return;
    if (isNew && Net.role === 'host' && hostNameSpecs()) { p = Spect.upsert(d._p, specNames[d._p], d.a, false) || p; sendSpecNames(); }
    if (isNew) { feed(p, '入席观战'); if (mode && !watching()) toast(`「${p.name}」入席观战`); if (!mode && room) roomSfx('roomjoin'); }
    if (d.t === 'go') { Spect.walk(d._p, d.wp); return; }
    if (d.p) Spect.setPos(d._p, d.p);
    if (d.t === 'say') {
      const text = d.i != null ? SPEC_PHRASES[d.i] : cleanTxt(d.text);
      if (!text) return;
      Spect.say(d._p, text); feed(p, text);
      Sfx.B.shout(0, 4, 0.045, 0.5);
    } else if (d.t === 'laugh') {
      Spect.laugh(d._p); feed(p, '哈哈哈哈哈！'); Sfx.smp('laugh', { vol: 0.7, rj: 0.05 });
    } else if (d.t === 'side') feed(p, d.a === 'n' ? '回到中立看台' : `站到${d.a === 'r' ? '汉' : '楚'}军一边`);
    updateHud();
  }
  setInterval(() => {
    let changed = false;
    for (const p of [...Spect.people.values()]) if (!p.self && Date.now() - p.seen > 14000) { Spect.remove(p.id); changed = true; }
    if (changed) { if (hostNameSpecs()) sendSpecNames(); updateHud(); setTimeout(paintRoom, 0); }
  }, 3000);
  function enterWatch(code) {
    enteringWatch = true;
    clearInterval(joinTimer);
    Net.close(true);
    $('joinNote').innerHTML = '这局已有两位棋手，你入席观战。';
    // 观众的名号由房主按进房先后起（农夫、樵夫……），不再自己填；房主那边还是旧版本时用一个随机的
    myName = Spect.randomName(); specNames = {};
    startWatch(code);
  }
  function specHello() { if (Net.role === 'watch') Net.sendSpec({ t: 'sp', n: myName, a: myAlleg, p: Spect.posOf(Net.myPid) || undefined }); }
  // 观众走动：点地面 / 棋盘就走过去（过河走桥、上棋盘走楼梯；路线在自己这边算好，发给大家照着走）
  function specGo(cx, cy) {
    const me = Spect.get(Net.myPid); if (!me) return;
    const t = Spect.rayTarget(cx, cy); if (!t) return;
    const r = Spect.plan(Net.myPid, t);
    if (r.err != null) { if (r.err) toast(r.err, 2200); return; }
    if (Spect.walk(Net.myPid, r.wp)) { Net.sendSpec({ t: 'go', n: myName, a: myAlleg, wp: r.wp }); Sfx.select && Sfx.select(); }
  }
  // 弹飞：mine = 我点的（要告诉大家）
  function specFlick(id, mine) {
    const p = Spect.get(id); if (!p) return false;
    if (!Spect.flick(id)) return false;
    if (mine) Net.sendSpec({ t: 'flick', id });
    feed(p, '被弹下了棋盘');
    if (p.self) toast(`你被弹下了棋盘，${Math.round(Spect.BAN_MS / 1000)} 秒内不能再上去`, 3200);
    return true;
  }
  function startWatch(code) {
    Sfx.init(); applySettings();
    $('joinNote').innerHTML = '<span class="spin"></span>正在入席…';
    Net.watch(code, {
      line(n, total) { onLine(n, total); if (n) specHello(); },
      room: onWatchRoom,
      data(d, ch) {
        const side = ch === 'h' ? hostSide : other(hostSide);
        if (d.t === 'emote') emote(side, d.i ?? null, cleanTxt(d.text));
        else if (d.t === 'pause') onPause(d, side);
        else if (d.t === 'bye') toast(`${SIDE_CN[side]}方棋手离开了房间`);
      },
      spec: onSpec,
    });
    clearInterval(specTimer);
    specTimer = setInterval(specHello, 4000);
    // 观战席满员（8 人）则请他稍后再来
    setTimeout(() => {
      const others = [...Spect.people.values()].filter(p => !p.self).length;
      if (others >= Spect.MAX) ask('观 战 席 已 满', `已有 ${Spect.MAX} 位观众，请稍后再来。`, 0, '返回大厅', '留下').then(ok => { if (ok) leaveGame(); });
    }, 4500);
  }
  function onWatchRoom(d) {
    if (!d || !d.v || !d.opts) return;
    hostSide = d.hostSide || 'r';
    watchWaiting = !!d.waiting;
    if (mode !== 'watch' && d.opts.pwh && store.get('pw-' + Net.code, '') !== d.opts.pwh) {
      if (pwAsking) return;
      pwAsking = true;
      askText('房 间 密 码', '这个房间上了密码，观战也要输入。', '密码').then(pw => {
        pwAsking = false;
        if (pw == null) { leaveGame(); return; }
        const hh = pwHash(Net.code, pw);
        if (hh === d.opts.pwh) { store.set('pw-' + Net.code, hh); onWatchRoom(d); } else { toast('密码不对'); onWatchRoom(d); }
      });
      return;
    }
    if (mode !== 'watch') {
      startGame('watch', 'r', d.opts, { state: d, intro: false }).then(() => updateHud());
      Spect.upsert(Net.myPid, myName, myAlleg, true);
      specHello();
      // 名号等房主发过来再报（最多等 3 秒，房主是旧版本就用自己这个）
      clearTimeout(specToastT); specToastT = setTimeout(() => { specToastT = 0; toast(`你以「${myName}」的名号入席观战`, 2600); }, 3000);
      if (specNames[Net.myPid]) specNamed();
      setTimeout(() => { if (watching()) toast('点地面或棋盘就能走过去：过河走桥，上棋盘走两侧的小楼梯', 5200); }, 3000);
      return;
    }
    syncWatch(d);
  }
  // 兵法：按行动序列对齐（快照里是完整的行动序列，重放即可还原全部状态）
  function bfSync(st, watch) {
    const E = game.entries, T = st.bfe || [];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const prefix = (a, b) => a.length <= b.length && a.every((x, i) => same(x, b[i]));
    // 我请求的悔棋对方已同意、但“同意”的消息丢了 → 照样悔棋
    if (!watch && pendingUndo && pendingUndo.side === mySide && T.length < E.length && prefix(T, E) && T.length === bfUndoTarget(pendingUndo.plies)) { applyUndo(pendingUndo.plies, mySide); undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st); updateHud(); return; }
    if (prefix(E, T)) { for (const e of T.slice(E.length)) if (!doBF(e, true)) { applyState(st); break; } }
    else if (prefix(T, E)) {
      const extra = game.sides.slice(T.length);
      if (!watch && extra.length && extra.every(x => x === mySide)) { E.slice(T.length).forEach((e, i) => Net.send({ t: 'bf', n: T.length + i, e, clk: clock[mySide] })); }
      else if (!game.result) {
        busy++;
        anim = anim.then(() => bfRewind(T.length)).catch(e => console.error(e)).then(() => { busy--; Fx.ply = game.history.length; renderLog(); updateHud(); });
        if (watch) toast('棋手悔棋');
      }
    } else applyState(st);
    if (st.clk) { clock.r = st.clk.r; clock.b = st.clk.b; }
    if (st.step != null) clock.step = st.step;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function syncWatch(st) {
    if (game.bf) {
      const T = st.bfe || [];
      if (!T.length && !st.result && (game.entries.length || game.result || ended)) { if (Ending.running) { pendingRestart = st; Ending.skip(); } else restart(st); return; }
      bfSync(st, true); return;
    }
    const theirs = st.moves || [], mine = game.history;
    if (!theirs.length && !st.result && (mine.length || game.result || ended)) {
      if (Ending.running) { pendingRestart = st; Ending.skip(); } else restart(st);
      return;
    }
    const same = (a, b) => a.from[0] === b.from[0] && a.from[1] === b.from[1] && a.to[0] === b.to[0] && a.to[1] === b.to[1];
    const prefix = (a, b) => a.length <= b.length && a.every((m, i) => same(m, b[i]));
    if (prefix(mine, theirs)) { for (const m of theirs.slice(mine.length)) doMove({ from: m.from, to: m.to, rv: m.rv }, true); }
    else if (prefix(theirs, mine) && !game.result) {
      const n = mine.length - theirs.length;
      busy++;
      anim = anim.then(async () => { for (let i = 0; i < n; i++) { const h = game.undo(); if (h) { notes.pop(); await Fx.undoMove(h, game.at(h.from[0], h.from[1])); } } })
        .catch(e => console.error(e)).then(() => { busy--; Fx.ply = game.history.length; renderLog(); const l = game.history[game.history.length - 1]; Board.showLast(l ? l.from : null, l ? l.to : null); updateHud(); });
      toast('棋手悔棋');
    } else if (!prefix(mine, theirs)) applyState(st);
    if (st.clk) { clock.r = st.clk.r; clock.b = st.clk.b; }
    if (st.step != null) clock.step = st.step;
    undoUsed = { r: 0, b: 0, ...(st.undo || {}) }; applyPz(st);
    if (st.result && !game.result) { game.result = st.result; finishGame(st.result); }
    updateHud();
  }
  function specSay(i, text) {
    if (Date.now() - lastSpecSay < 3000) { toast('说得太快了，歇口气'); return; }
    lastSpecSay = Date.now();
    const msg = i != null ? SPEC_PHRASES[i] : cleanTxt(text);
    if (!msg) return;
    Net.sendSpec(i != null ? { t: 'say', n: myName, a: myAlleg, i } : { t: 'say', n: myName, a: myAlleg, text: msg });
    Spect.say(Net.myPid, msg); feed(Spect.get(Net.myPid), msg);
    Sfx.B.shout(0, 4, 0.045, 0.5);
    $('chat').classList.add('hidden');
  }
  function specLaugh() {
    if (Date.now() - lastSpecSay < 3000) { toast('笑得太勤了，歇口气'); return; }
    lastSpecSay = Date.now();
    Net.sendSpec({ t: 'laugh', n: myName, a: myAlleg });
    Spect.laugh(Net.myPid); feed(Spect.get(Net.myPid), '哈哈哈哈哈！');
    Sfx.smp('laugh', { vol: 0.7, rj: 0.05 });
    $('chat').classList.add('hidden');
  }
  function paintAlleg() { $('wSide').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === myAlleg)); }
  $('wSide').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (myAlleg === b.dataset.v) return;
    myAlleg = b.dataset.v; paintAlleg();
    Spect.upsert(Net.myPid, myName, myAlleg, true);
    Net.sendSpec({ t: 'side', n: myName, a: myAlleg });
    feed(Spect.get(Net.myPid), myAlleg === 'n' ? '回到中立看台' : `站到${myAlleg === 'r' ? '汉' : '楚'}军一边`);
    Sfx.select && Sfx.select();
  });
  $('bLaugh').onclick = specLaugh;
  $('tLaugh').onclick = specLaugh;
  // 退出对局 = 回到主菜单（不重载页面）。只有演出正放到一半、状态收不干净时才退而求其次整页重载
  function leaveGame() {
    document.documentElement.style.removeProperty('--below-status');
    $('viewTag').classList.remove('lc');
    if (upOpen) $('upNo').click();   // 升级确认框开着就关掉
    cancelAI();
    try { if (online()) Net.send({ t: 'bye' }); } catch (e) { }
    try { Net.close(); } catch (e) { }
    clearInterval(specTimer); clearInterval(joinTimer);
    if (busy || Ending.running || (ended && endSkipRes)) { try { sessionStorage.setItem('xq3d-back', '1'); } catch (e) { } location.href = location.pathname; return; }
    try {
      if (introSkip) introSkip();
      if (RP) exitReplay(true);
      setPause(null); closeAsk(); Voice.cancel();
      resetFinalFx();
      mode = null; started = false; ended = false; pendingUndo = null; bfMode = null; dbgOn = false; resumeKey = '';
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      Ending.hideCard(); clearFinale(); Camp.reset(); Fx.clearMarks(); Board.clearMoves(); Board.showLast(null); Spect.clear();
      Core.Time.skip = false; Core.Cam.cine = false;
      game = new XQ.Game(); Board.setSkin(0); Board.setPosition(game); Core.Cam.setSide('r'); Board.faceViewer('r'); viewSide = 'r';
      closeRoom();
      for (const id of ['hud', 'skip', 'bfReport', 'bfDebug', 'log', 'mSet', 'mAsk', 'mNews', 'mHelp', 'chat', 'netbadge', 'rpBar', 'bfTip']) { const el = $(id); if (el) el.classList.add('hidden'); }
      for (const id of ['banner', 'bubMe', 'bubOpp', 'cdBig', 'cdRed']) $(id).classList.remove('on', 'hot');
      paintVeil();
      $('lobby').classList.remove('hidden', 'intro'); showPane('pMain'); lobbySpin = true;
      Sfx.Music.setIntensity(0.2);
    } catch (e) { console.error(e); location.href = location.pathname; }
  }

  // ---------- 大厅 ----------
  const panes = ['pMain', 'pAI', 'pHall', 'pCreate', 'pWait', 'pJoin'];
  const showPane = id => { panes.forEach(p => $(p).classList.toggle('hidden', p !== id)); if (id === 'pMain') paintResume(); if (id === 'pHall') openHall(); else closeHall(); };
  // ---------- 游戏大厅：公开房间列表（实时），点一下就加入；也可以创建房间或输入房间码 ----------
  let hallTimer = null;
  const HV = { std: ['象', '象棋'], jq: ['揭', '揭棋'], bf: ['技', '技能模式'] };
  function paintHall(list) {
    list = list || Net.hallList();
    const L = $('hallList');
    $('hallNote').innerHTML = !Net.hallOk ? '<span class="spin"></span>正在连接大厅…' : list.length ? `${list.filter(x => x.st === 'open').length} 个房间在等对手` : '暂时没有公开的房间——创建一个，等人来战';
    L.innerHTML = list.slice(0, 30).map(d => {
      const v = HV[d.v] || HV.std, open = d.st === 'open';
      const tm = (+d.total ? `每方 ${+d.total} 分` : '不限时') + (+d.step ? ` · 每步 ${+d.step >= 60 ? (+d.step / 60) + ' 分' : +d.step + ' 秒'}` : '');
      const code = String(d.code).replace(/[^A-Z0-9]/g, '').slice(0, 5);
      return `<li class="${open ? 'open' : 'play'}"><span class="hv ${d.v === 'bf' ? 'bf' : d.v === 'jq' ? 'jq' : ''}">${v[0]}</span><span class="hi"><b>${v[1]}</b> · 房间 ${code}${d.lock ? ' 🔒' : ''}<small>${open ? `房主执${d.side === 'r' ? '红（汉）' : '黑（楚）'}，你执${d.side === 'r' ? '黑（楚）' : '红（汉）'}` : '对局中'} · ${tm}</small></span><button class="btn small ${open ? 'red solid' : ''}" data-code="${code}">${open ? '加 入' : '观 战'}</button></li>`;
    }).join('');
    L.querySelectorAll('button[data-code]').forEach(b => b.onclick = () => { Sfx.init(); applySettings(); closeHall(); showPane('pJoin'); $('joinCode').value = b.dataset.code; joinRoom(b.dataset.code); });
  }
  function openHall() { Net.hallOpen(paintHall); paintHall([]); clearInterval(hallTimer); hallTimer = setInterval(() => paintHall(), 4000); }
  function closeHall() { clearInterval(hallTimer); hallTimer = null; try { Net.hallClose(); } catch (e) { } }
  setTimeout(() => $('lobby').classList.remove('intro'), 3800);
  try { if (sessionStorage.getItem('xq3d-back')) { sessionStorage.removeItem('xq3d-back'); $('lobby').classList.remove('intro'); } } catch (e) { }
  const VAR_NOTE = { std: '标准中国象棋', jq: '揭棋：十五子反扣，走动方知真身', bf: '技能模式：升级、生命值、兵种技能与主帅兵法' };
  const paintVar = () => { $('varNote').textContent = VAR_NOTE[ropts.v] || ''; $('optSkin').classList.toggle('hidden', ropts.v === 'bf'); };
  bindSeg($('pCreate'), 'data-k', k => ropts[k], (k, v) => { ropts[k] = k === 'side' || k === 'v' ? v : +v; store.set('ropts', ropts); if (k === 'v') paintVar(); });
  paintVar();
  bindSeg($('pAI'), 'data-a', k => aopts[k], (k, v) => { aopts[k] = k === 'side' ? v : +v; store.set('aopts', aopts); });
  const paintLv = () => $('aiLv').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === aopts.level));
  $('aiLv').querySelectorAll('button').forEach(b => b.onclick = () => { aopts.level = b.dataset.v; store.set('aopts', aopts); paintLv(); Sfx.select && Sfx.select(); });
  paintLv();
  let createFor = 'host';
  $('bAI').onclick = () => { showPane('pAI'); try { AI.warm(); } catch (e) { } };
  $('bBack4').onclick = () => showPane('pMain');
  $('bAIGo').onclick = () => {
    Sfx.init(); applySettings();
    const side = aopts.side === 'x' ? (Math.random() < 0.5 ? 'r' : 'b') : aopts.side;
    startGame('ai', side, { undo: aopts.undo, total: aopts.total, step: aopts.step || 0, hints: aopts.hints, level: aopts.level, skin: aopts.skin || 0, bf: aopts.bf ? 1 : 0 });
  };
  $('bHall').onclick = () => showPane('pHall');
  $('bRoomStart').onclick = roomBegin;
  // 房间提示音（Ham 10-09 试听台第二十七批挑的，各三条随机）：有人进房、有人准备
  function roomSfx(id) { try { Sfx.init(); Sfx.smp(id, { vol: 0.7, rj: 0 }); } catch (e) { } }
  $('bRoomReady').onclick = () => { if (!room || room.host) return; room.ready = !room.ready; if (room.ready) roomSfx('roomready'); Net.send({ t: 'ready', on: room.ready }); paintRoom(); };
  // 客人改当观众：让出座位，转去观战席
  $('bRoomWatch').onclick = () => { if (!room || room.host) return; const code = room.code; closeRoom(); clearInterval(joinTimer); try { Net.send({ t: 'bye' }); } catch (e) { } showPane('pJoin'); enterWatch(code); };
  $('bRoomAI2').onclick = () => { if (!room || !room.host || !room.hostOut) return; room.ai2 = room.ai2 ? null : ($('roomAI2Lv').value || 'mid'); paintRoom(); roomTell(); };
  $('bRoomAI').onclick = () => { if (!room || !room.host || room.seated) return; room.ai = room.ai ? null : ($('roomAILv').value || 'mid'); paintRoom(); try { Net.hallTouch(); } catch (e) { } };
  $('lockOn').onchange = () => { $('lockPw').classList.toggle('hidden', !$('lockOn').checked); if ($('lockOn').checked) $('lockPw').focus(); };
  $('bBackH').onclick = () => showPane('pMain');
  $('bCreate').onclick = () => { createFor = 'host'; $('createTitle').textContent = '房间设置'; $('bCreateGo').textContent = '创建'; $('optPub').classList.remove('hidden'); $('optLock').classList.remove('hidden'); showPane('pCreate'); };
  $('bLocal').onclick = () => { createFor = 'local'; $('optPub').classList.add('hidden'); $('optLock').classList.add('hidden'); $('createTitle').textContent = '本地对战'; $('bCreateGo').textContent = '开始'; showPane('pCreate'); };
  $('bJoinShow').onclick = () => { showPane('pJoin'); setTimeout(() => $('joinCode').focus(), 50); };
  $('bBack1').onclick = () => showPane(createFor === 'host' ? 'pHall' : 'pMain');
  const clearUrl = () => { try { history.replaceState(null, '', location.pathname); } catch (e) { } };
  $('bBack3').onclick = () => { Net.close(); clearInterval(joinTimer); clearUrl(); showPane('pHall'); };
  $('bBack2').onclick = () => { const wasHost = room && room.host; closeRoom(); clearInterval(joinTimer); if (wasHost) { Net.clearRoom(); store.del('host'); } Net.close(); clearUrl(); showPane('pHall'); };
  const httpUrl = /^https?:$/.test(location.protocol);
  const inviteUrl = code => location.origin + location.pathname + '?room=' + code;
  $('bCreateGo').onclick = () => {
    Sfx.init(); applySettings();
    const o = { undo: ropts.undo, total: ropts.total, step: ropts.step, hints: ropts.hints, jq: ropts.v === 'jq' ? 1 : 0, bf: ropts.v === 'bf' ? 1 : 0, skin: ropts.v === 'bf' ? 0 : ropts.skin || 0, pub: createFor === 'host' && +ropts.pub ? 1 : 0 };
    const side = ropts.side === 'x' ? (Math.random() < 0.5 ? 'r' : 'b') : ropts.side;
    if (createFor === 'local') { startGame('local', 'r', o); return; }
    const code = Net.gen(), pw = $('lockOn').checked ? $('lockPw').value.trim() : '';
    if ($('lockOn').checked && !pw) { toast('请输入房间密码，或取消勾选'); $('lockPw').focus(); return; }
    if (pw) { o.pwh = pwHash(code, pw); store.set('pw-' + code, o.pwh); }
    hostRoom(code, o, side);
  };
  function chipsFor(o, side) {
    return [o.bf ? '技能模式' : o.jq ? '揭棋' : '象棋', `房主执${side === 'r' ? '红·汉' : '黑·楚'}`, o.undo ? (o.undo >= 99 ? '悔棋不限' : `悔棋 ${o.undo} 次`) : '不许悔棋', o.total ? `每方 ${o.total} 分钟` : '不限总时', o.step ? `每步 ${o.step >= 60 ? o.step / 60 + ' 分' : o.step + ' 秒'}` : '不限步时', o.hints ? '显示可杀' : '不显示可杀']
      .map(t => `<span class="chip">${t}</span>`).join('');
  }
  // ---------- 房间：两个座位（红·汉 / 黑·楚）+ 观战席。对手入座后倒数 5 秒开局，房主也可以立即开始 ----------
  let room = null;   // { code, host: 我是不是房主, hostSide, seated: 客座有没有人, ready: 客人准备好没有, ai: 房主加的人机档位 }
  const AUTOSTART = (() => { try { return !!localStorage.getItem('xq3d-autostart'); } catch (e) { return false; } })();   // 测试用：客人自动准备、房主自动开始
  // 房间（美术 M15 第一期）：房主可以点观战席的「坐这里」坐过去，他的座位空出来（点空座位坐回）；空座位可以加人机（电脑替房主下，房主旁观）。
  //   room.hostOut：房主在观战席；room.ai2：房主座位上的电脑档位（只在房主在观战席时有）；room.ai：对面座位上的电脑
  function paintRoom() {
    if (!room) return;
    const STAR = { easy: '★', mid: '★★', hard: '★★★' }, SN2 = { r: '红', b: '黑' };
    const hostOut = !!room.hostOut, ai2 = hostOut ? room.ai2 || null : null;
    const seat = side => {
      const hostSeat = side === room.hostSide, first = side === 'r' ? ' · 先手' : '';
      let cls = '', who, st, attr = '';
      if (hostSeat) {
        const back = room.host && hostOut ? ' data-back tabindex="0" role="button"' : '';
        if (!hostOut) { who = room.host ? '你' : '房主'; st = '房主'; if (room.host) cls = ' me'; }
        else if (ai2) { who = LV[ai2] || '人机'; st = `人机 <span class="st">${STAR[ai2] || ''}</span>${room.host ? ' · 点我坐回' : ' · 房主观战'}`; cls = ' ai' + (back ? ' back' : ''); attr = back; }
        else { who = '空位'; st = room.host ? '点这里坐回' : '房主在观战席'; cls = ' empty' + (back ? ' back' : ''); attr = back; }
      } else {
        const ai = room.ai, taken = room.seated || ai, mine = !room.host && room.seated && !ai;
        who = ai ? (LV[ai] || '人机') : taken ? (mine ? '你' : '对手') : '空位';
        st = ai ? `人机 <span class="st">${STAR[ai] || ''}</span>` : !taken ? '等待对手…' : room.ready ? '<b style="color:#2f7d4f">已准备</b>' : '还没准备';
        cls = (taken ? '' : ' empty') + (mine ? ' me' : '') + (ai ? ' ai' : '');
      }
      return `<div class="seat ${side}${cls}"${attr}><span class="sd">${side === 'r' ? '红·汉' : '黑·楚'}</span><div class="who">${who}</div><small>${st}${hostSeat && ai2 ? '' : first}</small></div>`;   // 人机座位的小字已经够长，不再写「先手」
    };
    $('roomSeats').innerHTML = seat('r') + seat('b');
    // 观战席：自己（房主坐过来了）排第一，再是各位观众（名字房主按进房先后发：农夫、樵夫……），房主还在座位上时最后一块「坐这里」
    const esc = t => String(t).replace(/[<>&]/g, '');
    const ps = [...Spect.people.values()].filter(p => !p.self);
    let h = '';
    if (room.host && hostOut) h += '<i class="me">你（房主）</i>';
    if (!room.host && hostOut) h += '<i>房主</i>';
    h += ps.map(p => `<i>${esc(specNameOf(p.id, p.name))}</i>`).join('');
    if (room.host && !hostOut) h += '<i class="open" data-sit tabindex="0" role="button">坐这里</i>';
    $('roomSpecs').innerHTML = h || '暂时没有观众';
    const specs = $('roomSpecs').parentNode; let tip = specs.querySelector('.tip');
    const tipTxt = !room.host ? '' : !hostOut ? '点这里就坐过来' : `点${SN2[room.hostSide]}方${ai2 ? '的人机' : '空座位'}坐回去`;
    if (tipTxt) { if (!tip) { tip = document.createElement('span'); tip.className = 'tip'; specs.appendChild(tip); } tip.textContent = tipTxt; } else if (tip) tip.remove();
    const canAI = room.host && !(opts && opts.jq);   // 象棋、技能模式都能加人机；揭棋没有电脑
    $('roomHostRow').classList.toggle('hidden', !room.host);
    $('roomGuestRow').classList.toggle('hidden', room.host);
    $('roomInvite').classList.toggle('hidden', !room.host);
    if (!room.host) $('qrWrap').classList.add('hidden');
    if (room.host) {
      const ok = roomFull();
      $('bRoomStart').classList.toggle('off', !ok);
      $('bRoomAI').classList.toggle('hidden', !canAI || room.seated);
      $('bRoomAI').textContent = room.ai ? '移除人机' : '添加人机';
      $('roomAILv').classList.toggle('hidden', !canAI || room.seated || !!room.ai);
      // 房主在观战席：他空出来的座位也能加人机（电脑替他下，他在旁边看）
      $('bRoomAI2').classList.toggle('hidden', !canAI || !hostOut);
      $('bRoomAI2').textContent = ai2 ? '撤下我座位的人机' : '我的座位加人机';
      $('roomAI2Lv').classList.toggle('hidden', !canAI || !hostOut || !!ai2);
      if (Net.lineOk) $('waitNote').innerHTML = hostOut ? '你在观战席。两个座位都有人（或电脑）时，点「开始」开局'
        : room.ai ? '人机已就位，点「开始」开局；其他人进来会坐到观战席' : !room.seated ? '<span class="spin"></span>等待对手入座…（也可以添加人机）' : room.ready ? '对手已准备，点「开始」开局' : '对手已入座，等他点「准备」';
    } else {
      $('bRoomReady').textContent = room.ready ? '取消准备' : '准 备';
      $('bRoomReady').classList.toggle('solid', !room.ready);
      $('waitNote').innerHTML = room.ready ? '<span class="spin"></span>已准备，等房主开始…' : '点「准备」后房主才能开始；也可以改为观战';
    }
  }
  // 两个座位都有人（或电脑）了：房主那边（房主自己 / 他座位上的电脑）+ 对面（电脑 / 已准备的对手）
  const roomFull = () => !!room && (!room.hostOut || !!room.ai2) && (!!room.ai || (room.seated && room.ready));
  // 房主坐到观战席 / 坐回座位
  function roomSit(out) {
    if (!room || !room.host || mode || mode_starting) return;
    room.hostOut = !!out; if (!out) room.ai2 = null;
    paintRoom(); roomTell(); try { Net.hallTouch(); } catch (e) { }
  }
  $('roomSpecs').addEventListener('click', e => { if (e.target.closest('[data-sit]')) roomSit(true); });
  $('roomSpecs').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-sit]')) { e.preventDefault(); roomSit(true); } });
  $('roomSeats').addEventListener('click', e => { if (e.target.closest('[data-back]')) roomSit(false); });
  $('roomSeats').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-back]')) { e.preventDefault(); roomSit(false); } });
  function roomTell() { if (room && room.host && room.seated) Net.send({ t: 'seat', hostSide, opts, ready: room.ready, hostOut: !!room.hostOut, ai2: room.hostOut ? room.ai2 || null : null }); }
  function roomBegin() {
    if (!room || !room.host || mode || mode_starting) return;
    if (room.hostOut && !room.ai2) { toast('你的座位空着：给它加个人机，或者点空座位坐回去'); return; }
    if (!(room.ai || (room.seated && room.ready))) { toast(room.seated ? '对手还没准备' : '还没有对手：等人入座，或者添加人机'); return; }
    mode_starting = true;
    const ai2 = room.hostOut ? room.ai2 || null : null;
    if (room.ai) opts = { ...opts, ai: room.ai, level: room.ai, ai2 };
    else opts = { ...opts, ai: null, ai2 };   // 对面是真人；房主座位上有电脑时由房主这台机器替他走（hostBot）
    if (room.ai || ai2) store.set('host', { code: room.code, opts, side: hostSide, t: Date.now() });
    closeRoom();
    startGame('host', hostSide, opts).then(() => { mode_starting = false; publish(); });
    Net.send({ t: 'welcome', state: snapshot() });
  }
  const closeRoom = () => { if (room) { clearInterval(room.timer); room = null; } };
  function hostRoom(code, o, side, resumeState) {
    // 建房时就把这一局用哪套规则写进选项：还没开始就进来的观众、客人拿到的房间信息里就有，不会按旧规则看
    if (!resumeState && +o.bf) { if (o.bs == null) o.bs = BS_NEW; o.r6 = R6_NEW; }
    opts = o; hostSide = side; mySide = side; resetClocks();
    showPane('pWait'); $('lobby').classList.remove('hidden');
    $('roomCode').textContent = code;
    $('waitChips').innerHTML = chipsFor(o, side);
    $('roomLock').classList.toggle('hidden', !o.pwh);
    closeRoom(); specNames = {}; room = { code, host: true, hostSide: side, seated: false, cd: 0, hostOut: false, ai2: null }; paintRoom();
    $('waitNote').innerHTML = '<span class="spin"></span>正在连接线路…';
    store.set('host', { code, opts: o, side, t: Date.now() });
    try { history.replaceState(null, '', location.pathname + '?room=' + code); } catch (e) { }
    if (httpUrl) {
      $('qrWrap').classList.remove('hidden');
      try {
        const qr = qrcode(0, 'M'); qr.addData(inviteUrl(code)); qr.make();
        const n = qr.getModuleCount(), c = document.createElement('canvas'), sz = 4;
        c.width = c.height = (n + 2) * sz; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#1b1a19';
        for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) g.fillRect((q + 1) * sz, (r + 1) * sz, sz, sz);
        $('qr').innerHTML = ''; $('qr').appendChild(c);
      } catch (e) { $('qrWrap').classList.add('hidden'); }
      $('bShare').classList.remove('hidden');
    } else { $('qrWrap').classList.add('hidden'); $('bShare').classList.add('hidden'); }
    let announced = false;
    // 公开房间：挂到游戏大厅的名册上（对手入座后显示为“对局中”，可观战）
    const hallBeat = () => { if (+o.pub && Net.role === 'host' && Net.code === code) Net.hallPub(() => ({ v: o.bf ? 'bf' : o.jq ? 'jq' : 'std', side: hostSide, total: o.total, step: o.step, lock: o.pwh ? 1 : 0, st: (room && room.host && (room.seated || room.ai)) || (started && mode === 'host') ? 'play' : 'open' })); };
    setTimeout(hallBeat, 0);
    Net.host(code, {
      gate: d => !o.pwh || d.ph === o.pwh,
      line(n, total) {
        onLine(n, total);
        if (n) hallBeat();
        if (n && !announced) {
          announced = true;
          $('waitNote').innerHTML = '<span class="spin"></span>等待对手入局…<br>' + (httpUrl ? '把邀请链接发给朋友，或让他扫码' : '把房间码告诉朋友，他在「加入房间」里输入');
          // 恢复房间时，先等中继把保存的棋局发回来，再发布，避免覆盖
          if (resumeState === 'pending') setTimeout(() => {
            if (resumeState !== 'pending') return;
            // 中继上没找到保存的棋局：用本机存的那份接着下
            const r = store.get('resume', null), st = r && r.kind === 'host' && r.code === code && !r.done && r.state;
            if (st && ((st.moves || []).length || (st.bfe || []).length)) { resumeState = st; hostSide = st.hostSide || side; startGame('host', hostSide, st.opts || o, { state: st, intro: false }); publish(); Net.send({ t: 'sync', state: snapshot() }); return; }
            resumeState = null; Net.publishRoom({ ...snapshot(), waiting: true });
          }, 4000);
          else if (!started) Net.publishRoom({ ...snapshot(), waiting: true });
        }
      },
      room(d) {
        // 房主恢复：用中继上保存的棋局
        if (resumeState === 'pending' && d && d.code === code && d.moves) {
          // 本机存的那份更新（比如最后几步没来得及发到中继）就用本机的
          const r = store.get('resume', null), loc = r && r.kind === 'host' && r.code === code && !r.done && r.state;
          const len = x => (x.moves || []).length + (x.bfe || []).length;
          if (loc && !d.result && len(loc) > len(d)) d = loc;
          resumeState = d; hostSide = d.hostSide;
          if (d.waiting && !d.moves.length) return; // 还没开局
          startGame('host', hostSide, d.opts, { state: d, intro: false });
          Net.send({ t: 'sync', state: snapshot() });
        }
      },
      data: onData, peer: onPeer, spec: onSpec, pingInfo, ping: onPing,
    });
  }
  $('bShare').onclick = () => {
    const code = $('roomCode').textContent, url = inviteUrl(code);
    const text = `来和我下一局《技能新象棋》！房间码 ${code}`;
    if (navigator.share) navigator.share({ title: '技能新象棋', text, url }).catch(() => { });
    else copy(`${text}\n${url}`, '邀请链接已复制');
  };
  $('bCopyCode').onclick = () => copy($('roomCode').textContent, '房间码已复制');
  function copy(t, okMsg) {
    const fallback = () => { const i = document.createElement('textarea'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast(okMsg); } catch (e) { toast(t); } i.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => toast(okMsg), fallback); else fallback();
  }
  let joinTimer = null;
  // 入座请求里带上本机保存的揭棋局号，房主据此判断能否接着下
  const joinMsg = () => { const k = store.get('jq-' + (Net.code || ''), null); return { t: 'join', jg: k ? k.gid : null, ph: store.get('pw-' + (Net.code || ''), '') || undefined }; };
  function joinRoom(code) {
    code = code.trim().toUpperCase();
    if (code.length !== 5) { $('joinNote').textContent = '房间码是 5 位字母或数字'; return; }
    Sfx.init(); applySettings();
    try { history.replaceState(null, '', location.pathname + '?room=' + code); } catch (e) { }
    showPane('pJoin'); $('lobby').classList.remove('hidden'); $('joinCode').value = code;
    $('joinNote').innerHTML = '<span class="spin"></span>正在寻找房间…';
    let gotRoom = false;
    const t0 = Date.now();
    Net.join(code, {
      line(n, total) { onLine(n, total); if (n) Net.send(joinMsg()); },
      room(d) {
        if (!d || !d.v) return;
        gotRoom = true;
        if (!mode) $('joinNote').innerHTML = '<span class="spin"></span>找到房间，正在入座…';
      },
      data: onData, peer: onPeer, spec: onSpec, pingInfo, ping: onPing,
    });
    vacantAsked = false; pwAsking = false;
    clearInterval(joinTimer);
    joinTimer = setInterval(() => {
      if (mode) { clearInterval(joinTimer); return; }
      if (Net.lineOk) Net.send(joinMsg());
      if (!gotRoom && Date.now() - t0 > 9000) $('joinNote').textContent = '暂未找到这个房间：请核对房间码，或确认朋友的房间还开着。仍在继续寻找…';
      if (!Net.lineOk && Date.now() - t0 > 12000) $('joinNote').textContent = '网络线路连接失败，请检查网络（可在设置里换线路）。';
    }, 2000);
  }
  $('bJoin').onclick = () => joinRoom($('joinCode').value);
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('joinCode').value); });
  $('joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

  // ---------- 回到对局：记下没下完的那一局，大厅里给一个入口 ----------
  // 本地 / 人机：整盘棋存在本机（含揭棋的随机布局、计时、悔棋次数）；联机：存房间码和身份（房主另存一份棋局，中继丢了也能恢复）
  const RESUME_TTL = { local: 3 * 864e5, ai: 3 * 864e5, host: 6 * 3600e3, guest: 6 * 3600e3 };
  let resumeKey = '';
  function saveResume(force) {
    if (!mode || watching() || !started || savedView) return;   // 复盘「我的棋局」时不动「回到对局」
    const G = RP ? RP.real : game;
    const n = G.bf ? G.entries.length : G.history.length, round = G.bf ? G.round : Math.floor(n / 2) + 1;
    const key = [mode, Net.code, n, G.result ? 1 : 0, undoUsed.r, undoUsed.b].join('|');
    if (!force && key === resumeKey) return;
    resumeKey = key;
    if (online()) {
      store.set('resume', { kind: mode, code: Net.code, side: mySide, opts, n, round, done: !!G.result, state: mode === 'host' ? snapshot() : undefined, t: Date.now() });
      if (mode === 'host') { const h = store.get('host', null); if (h && h.code === Net.code) store.set('host', { ...h, t: Date.now() }); }
      return;
    }
    if (G.result) { store.del('resume'); return; }
    if (!n) return;
    store.set('resume', {
      kind: mode, side: mySide, opts, n, round, t: Date.now(),
      layout: G.jq && G.opts ? G.opts.layout : null, bfbase: G.bf ? G.base : undefined, bfe: G.bf ? G.entries : undefined,
      moves: G.bf ? undefined : G.history.map(h => ({ from: h.from, to: h.to, rv: h.rv })),
      undo: { ...undoUsed }, clk: { r: clock.r, b: clock.b }, step: clock.step,
    });
  }
  setInterval(() => saveResume(false), 1500);
  window.addEventListener('pagehide', () => saveResume(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveResume(true); });
  const agoText = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.floor(m / 60)} 小时前` : `${Math.floor(m / 1440)} 天前`; };
  function resumeRec() {
    const r = store.get('resume', null);
    if (!r || r.done || !r.t || !(Date.now() - r.t < (RESUME_TTL[r.kind] || 0))) return null;
    if (r.kind === 'host') { const h = store.get('host', null); if (!h || h.code !== r.code) return null; }
    return r;
  }
  function paintResume() {
    const r = resumeRec();
    $('resume').classList.toggle('hidden', !r);
    if (!r) return;
    const o = r.opts || {}, v = +o.bf ? '技能模式' : +o.jq ? '揭棋' : '象棋';
    const who = r.kind === 'ai' ? `人机 · ${LV[o.level] || ''}` : r.kind === 'local' ? '本地对战' : `联机 · 房间 ${r.code}`;
    $('resumeInfo').textContent = `${who} · ${v} · 第 ${r.round || 1} 回合 · ${agoText(r.t)}`;
  }
  $('bResume').onclick = () => {
    const r = resumeRec();
    if (!r) { paintResume(); return; }
    Sfx.init(); applySettings();
    if (r.kind === 'local' || r.kind === 'ai') {
      startGame(r.kind, r.side, r.opts, { state: { moves: r.moves, bfe: r.bfe, bfbase: r.bfbase, layout: r.layout, undo: r.undo, clk: r.clk, step: r.step }, intro: false });
      toast('已回到上一局', 1800);
    } else if (r.kind === 'host') {
      const h = store.get('host', null);
      try { history.replaceState(null, '', location.pathname + '?room=' + r.code); } catch (e) { }
      hostRoom(r.code, h.opts, h.side, 'pending');
      toast('正在恢复你的房间…');
    } else joinRoom(r.code);
  };
  $('bResumeX').onclick = e => { e.stopPropagation(); store.del('resume'); paintResume(); };

  // ---------- 设置 ----------
  bindSeg($('mSet'), 'data-s', k => (k === 'quality' ? Core.quality : S[k]), (k, v) => {
    if (k === 'quality') { Core.setQuality(v); autoQ = false; toast('画质已调整'); return; }   // 自己选过画质，就不再自动降
    S[k] = (k === 'music' || k === 'vis' || k === 'turnfx') ? v : +v; applySettings();
    if (k === 'music' && (started || !mode)) { Sfx.init(); if (mode && !Ending.running) Sfx.Music.start(finalFx && v !== 'off' ? 'final' : v); }
  });
  $('vMusic').value = S.vMusic; $('vSfx').value = S.vSfx; $('oServer').value = S.server;
  $('vMusic').oninput = e => { S.vMusic = +e.target.value; applySettings(); };
  $('vSfx').oninput = e => { S.vSfx = +e.target.value; applySettings(); };
  $('vVoice').value = S.vVoice; $('vVoice').oninput = e => { S.vVoice = +e.target.value; applySettings(); };
  $('oServer').onchange = e => { S.server = e.target.value.trim(); applySettings(); };
  const openSet = () => { repaintSegs($('mSet')); $('setGame').classList.toggle('hidden', !(mode && started)); $('tDebug').classList.toggle('hidden', !(mode === 'local' && started && game && game.bf)); $('tExit').classList.toggle('hidden', !(mode && started)); $('mSet').classList.remove('hidden'); };
  $('tSet').onclick = $('bSetL').onclick = $('pzSet').onclick = openSet;
  $('bSetClose').onclick = () => $('mSet').classList.add('hidden');
  // 设置分三页：画面 / 声音 / 对局与其他
  $('setTabs').querySelectorAll('button').forEach(b => b.onclick = () => { $('setTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('mSet').querySelectorAll('.tabp').forEach(p => p.classList.toggle('hidden', p.dataset.t !== b.dataset.t)); });
  $('bHelp').onclick = $('bHelpL').onclick = () => { const h = $('helpOld'); if (h) h.hidden = !(started && game && game.bf && !BF.CFG.r6.on); $('mHelp').classList.remove('hidden'); };   // 只有正在下一局旧规则的技能模式时，才显示“这一局用的是旧规则”那段
  $('bHelpClose').onclick = () => $('mHelp').classList.add('hidden');
  $('bNews').onclick = $('bNewsL').onclick = () => {
    $('newsBody').innerHTML = NEWS.map(([v, d, items]) => `<h4>${v}<small>${d}</small></h4><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`).join('');
    $('mSet').classList.add('hidden'); $('mNews').classList.remove('hidden');
  };
  $('bNewsClose').onclick = () => $('mNews').classList.add('hidden');
  // ---------- 导出本局：整局行动 + 模式、双方、电脑档位、结果，导成一段文本（贴给别人复盘，或贴给 Claude 分析哪一步走错了） ----------
  function exportGame(raw) {
    const G = RP ? RP.real : game;
    if (!G) return raw ? null : '';
    if (savedView) {   // 正在复盘「我的棋局」里的一局：导出存着的那份（标记按现在的）
      const o = { ...savedView.data }; if (G.__flags && G.__flags.length) o.flags = G.__flags; else delete o.flags;
      return raw ? o : mgText({ ...savedView, data: o });
    }
    const kind = G.bf ? 'bf' : G.jq ? 'jq' : 'xq', KIND = { bf: '技能模式', jq: '揭棋', xq: '象棋' };
    const o = { app: 'chuhan3d', ver: APPV, when: new Date().toISOString(), kind, mode, me: mode === 'local' ? null : mySide };
    if (vsAI()) o.ai = aiBoth() ? { r: aiLevel('r'), b: aiLevel('b') } : { [aiSide()]: opts.level };
    else if (online() && opts.ai2 && !opts.ai) o.ai = { [hostSide]: opts.ai2 };
    o.opts = { undo: opts.undo, total: opts.total, step: opts.step };
    if (G.bf) { o.opts.bs = +opts.bs ? 1 : 0; o.opts.r6 = +opts.r6 ? 1 : 0; }   // 这一局用的哪套规则（重放要用）
    o.cfg = {};   // 调过的规则配置（游戏里没有调配置的入口，恒为空；留着给模拟工具对齐格式）
    o.result = G.result || null;
    // C62 A：电脑每一回合的思考记录（键是这一回合第一条行动在 entries 里的序号）、悔掉的分支；C62 C：标了“这步笨”的
    if (G.__think) o.think = G.__think;
    if (G.__branches && G.__branches.length) o.branches = G.__branches;
    if (G.__flags && G.__flags.length) o.flags = G.__flags;
    if (G.bf) {
      o.entries = G.entries;
      // 调试摆过子的局：起始局面不是标准开局，一并带上
      try { if (JSON.stringify(G.base) !== JSON.stringify(BF.newState(BF.CFG))) o.base = G.base; } catch (e) { }
    } else {
      o.moves = G.history.map(h => { const m = { from: h.from, to: h.to }; if (h.rv != null) m.rv = h.rv; if (h.cj != null) m.cj = h.cj; return m; });
      if (G.jq && G.opts && G.opts.layout) o.layout = G.opts.layout;
    }
    const who = mode === 'local' ? '同屏对战' : vsAI() ? (aiBoth() ? `电脑对电脑（汉 ${LV[aiLevel('r')]} / 楚 ${LV[aiLevel('b')]}）` : `人机：电脑执${SIDE_CN[aiSide()]} · ${LV[opts.level] || ''}`) : watching() ? '观战' : `联机：我执${SIDE_CN[mySide]}`;
    const res = G.result ? (G.result.winner ? `${SIDE_CN[G.result.winner]}胜 · ${REASON[G.result.reason] || G.result.reason}` : `和棋 · ${REASON[G.result.reason] || ''}`) : '未分胜负';
    const lines = [`技能新象棋 · 对局导出（版本 ${APPV}）`, `玩法：${KIND[kind]} · ${who} · 共 ${notes.length} 步 · ${res}`, '棋谱：'];
    for (let i = 0; i < notes.length; i += 2) lines.push(`${i / 2 + 1}. ${noteText(notes[i])}${notes[i + 1] ? '  ' + noteText(notes[i + 1]) : ''}`);
    if (raw) return o;
    lines.push('---DATA---', JSON.stringify(o));
    return lines.join('\n');
  }
  function noteText(n) { const d = document.createElement('div'); d.innerHTML = noteHtml(n); return d.textContent.replace(/\s+/g, ' ').trim(); }
  async function doExport() {
    const text = exportGame(); if (!text) { toast('还没有对局'); return; }
    $('mSet').classList.add('hidden');
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { }
    $('exportText').value = text;
    $('exportNote').textContent = ok ? '已复制到剪贴板。直接粘贴给别人，或粘贴给 Claude 说“第几步走得不对”。' : '没能自动复制：点「复制」，或长按 / 全选下面的文字手动复制。';
    $('mExport').classList.remove('hidden');
  }
  $('tExport').onclick = $('logExport').onclick = doExport;
  $('bExportClose').onclick = () => $('mExport').classList.add('hidden');
  $('bExportCopy').onclick = async () => {
    const t = $('exportText'); t.focus(); t.select();
    let ok = false;
    try { await navigator.clipboard.writeText(t.value); ok = true; } catch (e) { try { ok = document.execCommand('copy'); } catch (e2) { } }
    toast(ok ? '已复制' : '复制失败，请手动全选复制');
  };

  // ---------- 保存棋局 · 我的棋局 · 发给数值部（Ham 10-10：在游戏里直接把对局传给数值部） ----------
  //   结算卡「保 存」→ 存进这台设备的「我的棋局」；可以顺手发给数值部：在游戏仓库开一条带「对局」标签的工单
  //   工单格式按数值部 C62 / tools/review/decode_issue.js：正文第一段是 Ham 的话，下面 ```json 是导出数据（note、flags、ver 都在里面）；
  //   超过 6 万字改成 gzip + base64 放进 ```bfgz；还超就拆成几块，后面的块放评论，每块开头写「第 i/n 块」
  //   GitHub 令牌只存在这台设备的浏览器里（设置 → 对局与其他），代码和存档里都没有
  const GH_REPO = 'liukaidipeng-ops/chuhan_v01', GH_API = 'https://api.github.com', GH_MAX = 60000, GH_LABEL = '对局';
  const MG_KEY = 'xq3d-mygames', MG_MAX = 40;
  const KIND_CN = { bf: '技能', jq: '揭棋', xq: '象棋' };
  let savedView = null;   // 正在复盘「我的棋局」里的哪一局（这时不动「回到对局」的存档，退出回大厅）
  const ghTok = () => String(store.get('ghToken', '') || '').trim();
  const pad2 = n => String(n).padStart(2, '0');
  const stampOf = t => { const d = new Date(t); return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  function mgLoad() { try { const v = JSON.parse(localStorage.getItem(MG_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function mgSave(list) {
    list = list.slice(0, MG_MAX);
    for (let pass = 0; pass < 200; pass++) {
      try { localStorage.setItem(MG_KEY, JSON.stringify(list)); return true; } catch (e) { }
      // 放不下：从最旧的开始去掉电脑思考记录和悔棋分支（发出去的那份工单里还有），还不行就删最旧的
      const old = [...list].reverse().find(r => r.data && (r.data.think || r.data.branches));
      if (old) { delete old.data.think; delete old.data.branches; old.slim = 1; continue; }
      if (list.length <= 1) return false;
      list.pop();
    }
    return false;
  }
  function mgPut(rec) { const list = mgLoad().filter(r => r.id !== rec.id); list.unshift(rec); return mgSave(list); }
  // 标题里的几项：技能 · 霸王 · 电脑执楚 · 汉胜 · 36 回合
  function mgHead(o, rounds) {
    const ai = o.ai || null, ks = ai ? Object.keys(ai) : [];
    const vs = o.mode === 'ai' && ks.length === 2 ? `电脑对电脑 · 汉${LV[ai.r] || ''} 楚${LV[ai.b] || ''}` : o.mode === 'ai' && ks.length ? `${LV[ai[ks[0]]] || ''} · 电脑执${SIDE_CN[ks[0]]}` : o.mode === 'local' ? '本地' : '联机';
    const res = o.result ? (o.result.winner ? SIDE_CN[o.result.winner] + '胜' : '和棋') : '未分胜负';
    return [KIND_CN[o.kind] || o.kind, vs, res, `${rounds} 回合`].join(' · ');
  }
  const mgTitle = rec => ['对局', rec.head, rec.data.ver, stampOf(rec.t)].join(' · ');
  const reasonOf = r => (r ? (r.winner ? `${SIDE_CN[r.winner]}胜 · ${REASON[r.reason] || r.reason}` : `和棋 · ${REASON[r.reason] || r.reason || ''}`) : '未分胜负');
  // 「复制」用的文字：和「导出本局」同一个样子（---DATA--- 下面一行 JSON），数值部的工具都能读
  function mgText(rec) {
    const o = rec.data;
    return [`技能新象棋 · 对局导出（版本 ${o.ver || '?'}）`, `${rec.head} · ${reasonOf(o.result)} · ${stampOf(rec.t)}`, o.note ? 'Ham 的话：' + o.note : '', '---DATA---', JSON.stringify(o)].filter(Boolean).join('\n');
  }
  function flagsHtml(fl) {
    if (!fl || !fl.length) return '想标出电脑哪步笨：点「复盘」或打开棋谱（譜），点那一步。';
    return `标了 ${fl.length} 步「这步笨」：` + fl.map(f => `<b>第 ${f.turn} 回合 ${SIDE_CN[f.side] || ''} ${escH(f.move)}</b>${f.note ? '（' + escH(f.note) + '）' : ''}`).join('；');
  }
  // —— 结算卡「保 存」 ——
  let saveCur = null;   // 这一局存成的那一条（同一局再点「保 存」就更新它，不重复存）
  function openSave() {
    const G = RP ? RP.real : game; if (!G) return;
    const o = exportGame(true); if (!o) return;
    if (savedView) { saveCur = { g: G, id: savedView.id, t: savedView.t, rounds: savedView.rounds, note: savedView.note }; }
    else if (!saveCur || saveCur.g !== G) saveCur = { g: G, id: 'g' + Date.now().toString(36), t: Date.now(), rounds: Math.ceil((G.bf ? G.ends.filter(Boolean).length : G.history.length) / 2), note: '' };   // 下了几个回合（双方各走一步算一回合）
    const old = mgLoad().find(r => r.id === saveCur.id);
    $('saveSum').innerHTML = `${escH(mgHead(o, saveCur.rounds))}<br>${escH(reasonOf(o.result))} · ${stampOf(saveCur.t)} · 版本 ${escH(o.ver)}`;
    $('saveNote').value = old ? old.note || '' : saveCur.note || '';
    $('saveFlags').innerHTML = flagsHtml(G.__flags);
    const sent = old && old.issue && old.issue.n && old.issue.sent >= old.issue.chunks;
    saveMsg(sent ? `这局已经发给数值部了（工单 #${old.issue.n}）。改了话再存，只改这台设备上的那份。` : ghTok() ? '' : '还没设置 GitHub 令牌：「存并发给数值部」要先在 设置 → 对局与其他 里粘贴令牌（那里有步骤）。', '');
    $('bSaveSend').disabled = !!sent;
    $('mSave').classList.remove('hidden');
    setTimeout(() => { try { $('saveNote').focus({ preventScroll: true }); } catch (e) { } }, 60);
  }
  function saveMsg(t, cls) { const m = $('saveMsg'); m.className = 'svmsg' + (cls ? ' ' + cls : ''); m.innerHTML = t || ''; }
  function saveNow() {
    const G = saveCur.g, o = exportGame(true); if (!o) return null;
    o.note = $('saveNote').value.trim().replace(/`{3,}/g, '``');
    saveCur.note = o.note;
    const old = mgLoad().find(r => r.id === saveCur.id);
    const rec = { id: saveCur.id, t: saveCur.t, rounds: saveCur.rounds, head: mgHead(o, saveCur.rounds), note: o.note, data: o, issue: old ? old.issue || null : null };
    if (savedView && savedView.id === rec.id) savedView = rec;
    return mgPut(rec) ? rec : null;
  }
  $('bSaveCancel').onclick = () => $('mSave').classList.add('hidden');
  $('bSaveLocal').onclick = () => {
    const rec = saveNow();
    if (!rec) { saveMsg('这台设备的浏览器存储满了，存不下。到「我的棋局」删几局再试。', 'err'); return; }
    $('mSave').classList.add('hidden'); toast('已存到「我的棋局」（大厅右上角）', 2400);
  };
  let sending = false;
  $('bSaveSend').onclick = async () => {
    if (sending) return;
    if (!ghTok()) { saveMsg('还没设置 GitHub 令牌：设置 → 对局与其他 → 发给数值部，粘贴令牌（那里有步骤）。这局可以先点「存到我的棋局」，设好令牌后在「我的棋局」里发。', 'err'); return; }
    const rec = saveNow();
    if (!rec) { saveMsg('这台设备的浏览器存储满了，存不下。到「我的棋局」删几局再试。', 'err'); return; }
    sending = true; $('bSaveSend').disabled = true; saveMsg('正在发给数值部…', '');
    try {
      const iss = await mgSend(rec);
      saveMsg(`已发出：工单 #${iss.n}${iss.chunks > 1 ? `（分成 ${iss.chunks} 块）` : ''}。数值部看完会在工单里回复、处理完会关掉，「我的棋局」里能看到。`, 'ok');
      setTimeout(() => $('mSave').classList.add('hidden'), 2600);
    } catch (e) {
      saveMsg('没发出去：' + escH(e.message || e) + '<br>这局已经存在「我的棋局」，可以稍后在那里重发。', 'err');
      $('bSaveSend').disabled = false;
    }
    sending = false;
  };
  // —— GitHub 工单 ——
  function ghErr(st, j) {
    const m = (j && j.message) || '';
    if (st === 401) return '令牌无效或已过期，到「设置 → 对局与其他」重新粘贴';
    if (st === 403) return /rate limit/i.test(m) ? 'GitHub 暂时限流，过一会儿再试' : '令牌没有写工单的权限：令牌设置里 Permissions → Issues 要选 Read and write';
    if (st === 404) return '令牌访问不到 chuhan_v01：令牌设置里 Repository access 要选上这个仓库';
    if (st === 410) return '这个仓库关掉了工单功能';
    if (st === 422) return '内容格式不对' + (m ? '（' + m + '）' : '');
    return `GitHub 返回 ${st}` + (m ? '：' + m : '');
  }
  async function ghReq(path, method, body, noTok) {
    const tok = noTok ? '' : ghTok(), h = { Accept: 'application/vnd.github+json' };
    if (tok) h.Authorization = 'Bearer ' + tok;
    if (body) h['Content-Type'] = 'application/json';
    let r;
    try { r = await fetch(GH_API + path, { method: method || 'GET', headers: h, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); }
    catch (e) { throw new Error('连不上 GitHub（网络问题）'); }
    let j = null; try { j = await r.json(); } catch (e) { }
    if (!r.ok) { const e = new Error(ghErr(r.status, j)); e.status = r.status; throw e; }
    return j;
  }
  async function gzip64(s) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
      const buf = new Uint8Array(await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return btoa(bin);
    } catch (e) { return null; }
  }
  // 不压缩的 JSON 拆块：只在字符串外面的逗号后面断开（数值部拼块时每块末尾的换行落在值和值之间，不会改坏字符串）
  function cutJson(s, size) {
    const out = []; let from = 0;
    while (s.length - from > size) {
      let inStr = false, esc = false, cut = -1;
      for (let i = from; i < from + size; i++) {
        const c = s[i];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; }
        else if (c === '"') inStr = true; else if (c === ',') cut = i + 1;
      }
      if (cut <= from) cut = from + size;   // 一个值本身就超长（不会发生），硬切
      out.push(s.slice(from, cut)); from = cut;
    }
    out.push(s.slice(from));
    return out;
  }
  // 工单正文和后面几条评论
  async function issueParts(note, data) {
    const json = JSON.stringify(data), head = note ? note + '\n\n' : '';
    if (head.length + json.length + 16 <= GH_MAX) return ['' + head + '```json\n' + json + '\n```'];
    const gz = await gzip64(json), kind = gz ? 'bfgz' : 'json';
    const lines = gz ? gz.replace(/.{1,76}/g, '$&\n') : null;
    if (gz && head.length + lines.length + 16 <= GH_MAX) return [head + '```bfgz\n' + lines + '```'];
    const size = GH_MAX - 600 - head.length;
    let chunks;
    if (gz) { chunks = []; const per = Math.floor(size / 77) * 76; for (let i = 0; i < gz.length; i += per) chunks.push(gz.slice(i, i + per).replace(/.{1,76}/g, '$&\n')); }
    else chunks = cutJson(json, size).map(c => c + '\n');
    const n = chunks.length;
    return chunks.map((c, i) => (i ? '' : head) + '```' + kind + '\n第 ' + (i + 1) + '/' + n + ' 块\n' + c + '```');
  }
  const mgParts = new Map();   // 发了一半断掉的：这次打开网页期间记着没发完的块，重发时接着发
  async function mgSend(rec) {
    if (!ghTok()) throw new Error('还没设置 GitHub 令牌（设置 → 对局与其他）');
    let iss = rec.issue;
    if (iss && iss.n && iss.sent < iss.chunks && !mgParts.has(rec.id)) iss = null;   // 上次发了一半、块已经找不回来：重开一条
    const parts = mgParts.get(rec.id) || await issueParts(rec.note, rec.data);
    mgParts.set(rec.id, parts);
    if (!iss || !iss.n) {
      const j = await ghReq(`/repos/${GH_REPO}/issues`, 'POST', { title: mgTitle(rec), body: parts[0], labels: [GH_LABEL] });
      iss = rec.issue = { n: j.number, url: j.html_url, chunks: parts.length, sent: 1, state: 'open', replies: 0, at: Date.now() };
      mgPut(rec);
    }
    for (let i = iss.sent; i < parts.length; i++) {
      await ghReq(`/repos/${GH_REPO}/issues/${iss.n}/comments`, 'POST', { body: parts[i] });
      iss.sent = i + 1; mgPut(rec);
    }
    mgParts.delete(rec.id);
    return iss;
  }
  // 工单现在的样子：开着 / 数值部回复了几条 / 关了（评论里减掉我们自己拆出去的块）
  async function mgStatus(rec) {
    const j = await ghReq(`/repos/${GH_REPO}/issues/${rec.issue.n}`);
    rec.issue.state = j.state; rec.issue.replies = Math.max(0, (j.comments || 0) - Math.max(0, (rec.issue.sent || 1) - 1)); rec.issue.chk = Date.now();
    if (j.html_url) rec.issue.url = j.html_url;
  }
  function stTag(r) {
    const i = r.issue;
    if (!i || !i.n) return '<span class="st">只在本机</span>';
    if (i.sent < i.chunks) return `<span class="st err">没发完 #${i.n}</span>`;
    if (i.state === 'closed') return `<span class="st done">数值部已处理 #${i.n}</span>`;
    if (i.replies > 0) return `<span class="st reply">数值部回复了 ${i.replies} 条 #${i.n}</span>`;
    return `<span class="st sent">已发 #${i.n} · 等数值部看</span>`;
  }
  // —— 我的棋局 ——
  function paintGames() {
    const list = mgLoad();
    $('gamesNote').innerHTML = list.length ? `存在这台设备的浏览器里，最多 ${MG_MAX} 局${ghTok() ? '' : ' · 还没设置 GitHub 令牌，发不了数值部（设置 → 对局与其他）'}` : '';
    $('gamesList').innerHTML = list.length ? list.map(r => {
      const sent = r.issue && r.issue.n && r.issue.sent >= r.issue.chunks;
      const fl = r.data && r.data.flags && r.data.flags.length ? ` · 标了 ${r.data.flags.length} 步笨` : '';
      return `<div class="gm" data-id="${escH(r.id)}"><div class="t1">${escH(r.head)}${stTag(r)}</div>`
        + `<div class="t2">${stampOf(r.t)} · ${escH(reasonOf(r.data && r.data.result))} · 版本 ${escH(r.data && r.data.ver)}${fl}${r.slim ? ' · 思考记录已省掉' : ''}</div>`
        + (r.note ? `<div class="nt">${escH(r.note)}</div>` : '')
        + `<div class="bt"><button class="btn" data-g="view">复盘</button>${sent ? '<button class="btn" data-g="open">看工单</button>' : '<button class="btn" data-g="send">发给数值部</button>'}<button class="btn" data-g="copy">复制</button><button class="btn" data-g="del">删除</button></div></div>`;
    }).join('') : '<div class="empty">还没有存过棋局。<br>下完一局，在结算画面点「保 存」。</div>';
  }
  async function mgRefresh() {
    const list = mgLoad().filter(r => r.issue && r.issue.n && r.issue.sent >= r.issue.chunks && r.issue.state !== 'closed').slice(0, 12);
    let changed = false;
    for (const r of list) {
      if (r.issue.chk && Date.now() - r.issue.chk < 60000) continue;
      try { await mgStatus(r); changed = true; const all = mgLoad(), k = all.findIndex(x => x.id === r.id); if (k >= 0) { all[k].issue = r.issue; mgSave(all); } } catch (e) { break; }
    }
    if (changed && !$('mGames').classList.contains('hidden')) paintGames();
  }
  $('bMyGames').onclick = () => { paintGames(); $('mGames').classList.remove('hidden'); mgRefresh(); };
  $('bGamesClose').onclick = () => $('mGames').classList.add('hidden');
  $('gamesList').addEventListener('click', async e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const id = b.closest('.gm').dataset.id, rec = mgLoad().find(r => r.id === id); if (!rec) { paintGames(); return; }
    const a = b.dataset.g;
    if (a === 'view') openSaved(rec);
    else if (a === 'open') { if (rec.issue && rec.issue.url) window.open(rec.issue.url, '_blank', 'noopener'); }
    else if (a === 'copy') {
      let ok = false; try { await navigator.clipboard.writeText(mgText(rec)); ok = true; } catch (err) { }
      toast(ok ? '已复制（和「导出本局」一样的格式）' : '没能复制：浏览器不让', 2000);
    } else if (a === 'del') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '再点一次删除'; setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.textContent = '删除'; } }, 3000); return; }
      mgSave(mgLoad().filter(r => r.id !== id)); paintGames();
    } else if (a === 'send') {
      if (!ghTok()) { $('gamesNote').innerHTML = '<b>还没设置 GitHub 令牌</b>：设置 → 对局与其他 → 发给数值部，粘贴令牌（那里有步骤）。'; return; }
      b.disabled = true; b.textContent = '发送中…';
      try { const iss = await mgSend(rec); toast(`已发给数值部：工单 #${iss.n}`, 2400); }
      catch (err) { $('gamesNote').innerHTML = '没发出去：' + escH(err.message || err); }
      paintGames();
    }
  });
  // 复盘「我的棋局」里的一局：按本地对局摆出来（不计时、没有电脑），直接进复盘；退出回大厅
  async function openSaved(rec) {
    const o = rec.data || {}, kind = o.kind;
    if (kind === 'jq' && !o.layout) { toast('这局揭棋没存布局，复盘不了'); return; }
    $('mGames').classList.add('hidden');
    savedView = rec; saveCur = null;
    const op = { undo: 0, total: 0, step: 0, hints: 1, bf: kind === 'bf' ? 1 : 0, jq: kind === 'jq' ? 1 : 0 };
    if (kind === 'bf') { op.bs = o.opts && o.opts.bs != null ? o.opts.bs : 1; op.r6 = o.opts && o.opts.r6 != null ? o.opts.r6 : 0; }
    Sfx.init(); applySettings();
    await startGame('local', o.me || 'r', op, { state: { bfe: o.entries, bfbase: o.base, moves: o.moves, layout: o.layout, result: o.result }, intro: false });
    if (o.result && !game.result) game.result = o.result;
    game.__flags = (o.flags || []).map(f => ({ ...f }));
    if (o.think) game.__think = o.think;
    if (o.branches) game.__branches = o.branches;
    ended = true;
    reviewOpen();
    toast(`复盘：${rec.head} · ${stampOf(rec.t)}`, 2600);
  }
  // —— 标“这步笨”：点棋谱上的某一步 ——
  let flagPly = -1;
  // 第 i 条棋谱：这一回合第一条行动在 entries（技能模式）/ history 里的序号，和哪一方走的（技能模式一条棋谱可能含升级、拒马几条行动）
  function noteMeta(i) {
    const G = RP ? RP.real : game;
    if (G.bf) { let t = 0, st = 0; for (let k = 0; k < G.entries.length; k++) if (G.ends[k]) { if (t === i) return { at: st, side: G.sides[k] }; t++; st = k + 1; } return { at: st, side: G.turn }; }
    return { at: i, side: i % 2 ? 'b' : 'r' };
  }
  $('logList').addEventListener('click', e => {
    const sp = e.target.closest('span[data-i]'); if (!sp || watching() || !game) return;
    flagPly = +sp.dataset.i; if (!(flagPly >= 0 && notes[flagPly] != null)) return;
    const G = RP ? RP.real : game, f = (G.__flags || []).find(x => x.ply === flagPly);
    $('flagWhat').innerHTML = `第 ${Math.floor(flagPly / 2) + 1} 回合 · ${SIDE_CN[noteMeta(flagPly).side] || ''}方 · <b>${escH(noteText(notes[flagPly]))}</b>`;
    $('flagNote').value = f ? f.note || '' : '';
    $('bFlagOff').classList.toggle('hidden', !f);
    $('bFlagOn').textContent = f ? '改 好' : '标为这步笨';
    $('mFlag').classList.remove('hidden');
  });
  function flagSet(on) {
    const G = RP ? RP.real : game; if (!G || flagPly < 0) return;
    G.__flags = (G.__flags || []).filter(x => x.ply !== flagPly);
    if (on) {
      const mt = noteMeta(flagPly);
      G.__flags.push({ ply: flagPly, at: mt.at, turn: Math.floor(flagPly / 2) + 1, side: mt.side, move: noteText(notes[flagPly]), note: $('flagNote').value.trim().replace(/`{3,}/g, '``') });
      G.__flags.sort((a, b) => a.ply - b.ply);
    }
    if (savedView) {   // 复盘存着的局时改的标记，存回那一条
      const all = mgLoad(), k = all.findIndex(r => r.id === savedView.id);
      if (k >= 0) { if (G.__flags.length) all[k].data.flags = G.__flags.map(f => ({ ...f })); else delete all[k].data.flags; mgSave(all); savedView = all[k]; }
    }
    $('mFlag').classList.add('hidden'); renderLog();
    toast(on ? '已标「这步笨」，保存或发给数值部时一起带上' : '已取消标记', 1800);
  }
  $('bFlagOn').onclick = () => flagSet(true);
  $('bFlagOff').onclick = () => flagSet(false);
  $('bFlagClose').onclick = () => $('mFlag').classList.add('hidden');
  // —— 设置里的 GitHub 令牌 ——
  const GH_HOW = '怎么拿令牌：GitHub 网页右上角头像 → Settings → 左边最下面 Developer settings → Personal access tokens → Fine-grained tokens → Generate new token。'
    + 'Repository access 选 Only select repositories，选上 chuhan_v01；<b>选好仓库之后</b>下面 Permissions 里才会出现 Issues，把它改成 Read and write。生成后复制，粘贴到上面，点「保存并测试」。';
  function paintGh(msg, cls) {
    const t = ghTok();
    $('ghTok').value = '';
    $('ghTok').placeholder = t ? `已保存（末四位 ${t.slice(-4)}）· 粘贴新的可替换` : 'github_pat_…';
    $('ghDel').classList.toggle('hidden', !t);
    $('ghMsg').className = 'ghmsg' + (cls ? ' ' + cls : '');
    $('ghMsg').innerHTML = msg || (t ? '令牌只存在这台设备的浏览器里，不会上传到别处。' : GH_HOW);
  }
  $('ghTest').onclick = async () => {
    const v = $('ghTok').value.trim();
    if (v) { if (!/^(github_pat_|ghp_|gho_|ghu_)[A-Za-z0-9_]{20,}$/.test(v)) { paintGh('这不像 GitHub 令牌（应该以 github_pat_ 开头）。<br>' + GH_HOW, 'err'); return; } store.set('ghToken', v); }
    if (!ghTok()) { paintGh(GH_HOW); return; }
    paintGh('正在测试…');
    try {
      const u = await ghReq('/user');
      // 写权限：把「对局」标签按它现在的颜色原样存一次（不改任何东西），没有 Issues 写权限会被拒
      const lb = await ghReq(`/repos/${GH_REPO}/labels/${encodeURIComponent(GH_LABEL)}`);
      await ghReq(`/repos/${GH_REPO}/labels/${encodeURIComponent(GH_LABEL)}`, 'PATCH', { color: lb.color });
      paintGh(`令牌可用：账号 ${escH(u.login)}，能在 chuhan_v01 开工单。`, 'ok');
    } catch (e) { paintGh('测试没通过：' + escH(e.message || e) + '<br>' + GH_HOW, 'err'); }
  };
  $('ghDel').onclick = () => { store.del('ghToken'); paintGh('已从这台设备删除令牌。'); };
  paintGh();

  // ---------- 对局按钮 ----------
  $('tUndo').onclick = requestUndo;
  // 視：画面被平移过就先归位；本地对战再点一次才是换边看
  // 视角三档（美术 M11）：每按一下 沙盘 → 俯瞰 → 定盘 → 沙盘，换的时候在「谁走棋」下面亮一下名字和说明；记住上次选的档。
  //   本地双人原来按「视」是换边看：换边以后放哪还没定（放在决策台上问 Ham），本地双人先照旧换边
  const VIEW_S = ['斜着看，能转、能拖、能缩放', '从正上方看，能拖、能缩放', '从正上方看，锁住不动'];
  Core.Cam.view = Math.max(0, Math.min(2, +store.get('view', 0) || 0));
  let viewTagT = 0;
  function showViewTag(v) {
    $('viewTag').querySelectorAll('.row span').forEach(sp => sp.classList.toggle('on', +sp.dataset.v === v));
    $('viewTagS').textContent = VIEW_S[v];
    $('viewTag').classList.add('on'); clearTimeout(viewTagT); viewTagT = setTimeout(() => $('viewTag').classList.remove('on'), 1500);
  }
  // 本地双人「视」两档（Ham：本地对战只有自由视角和换边；美术 M14 / art-045 选 A）：
  //   换边（默认）——轮到谁下，棋盘就转到谁那边（每回合自动转的时候不亮提示）；自由视角——不自动转，自己拖着看。按「视」在两档间切，亮 1.5 秒提示
  let localView = store.get('localView', 'flip') === 'free' ? 'free' : 'flip';
  const LV_S = { flip: '轮到谁下，棋盘就转到谁那边', free: '不自动转，自己拖着看' };
  function showLocalTag() {
    $('viewTag').querySelectorAll('.row.lc span').forEach(sp => sp.classList.toggle('on', sp.dataset.l === localView));
    $('viewTagS').textContent = LV_S[localView];
    $('viewTag').classList.add('on'); clearTimeout(viewTagT); viewTagT = setTimeout(() => $('viewTag').classList.remove('on'), 1500);
  }
  function localFlip() {
    if (mode !== 'local' || localView !== 'flip' || RP || !game || game.result || ended || !started) return;
    if (viewSide !== game.turn || Core.Cam.panned) setView(game.turn, true);
  }
  $('tView').onclick = () => {
    if (mode === 'local') {
      localView = localView === 'flip' ? 'free' : 'flip'; store.set('localView', localView);
      showLocalTag(); localFlip(); return;
    }
    const v = (Core.Cam.view + 1) % 3; store.set('view', v);
    Core.Cam.setView(v, viewSide); showViewTag(v);
  };
  setInterval(() => $('tView').classList.toggle('flash', !!mode && Core.Cam.panned && !Core.Cam.cine), 300);
  $('tPause').onclick = togglePause; $('pzGo').onclick = () => togglePause();
  $('tLog').onclick = () => { const h = !$('log').classList.contains('hidden'); $('log').classList.toggle('hidden', h); if (!h) renderLog(); };
  $('tExit').onclick = $('pzExit').onclick = async () => {
    if (!mode) return;
    $('mSet').classList.add('hidden');
    // Ham 定的（10-05）：按钮叫「返回大厅」，确认只问一句，不写说明；留下是大按钮，防误点
    const ok = await ask(watching() ? '离开观战？' : '退出本局？', '', 0, '返回大厅', watching() ? '继续观战' : '继续对局', 'e-stay');
    if (ok) leaveGame();
  };
  $('tResign').onclick = $('pzResign').onclick = async () => {
    if (!started || ended || game.result || watching()) return;
    $('mSet').classList.add('hidden');
    const side = actor();
    const ok = await ask('认 输', `确定${mode === 'local' ? SIDE_CN[side] + '方' : ''}认输吗？`, 0, '认 输', '再想想');
    if (!ok || game.result) return;
    if (pause) resumeGame();
    const r = game.resign(side);
    if (online()) Net.send({ t: 'resign', side });
    finishGame(r);
  };
  const skipNow = () => {
    if (introSkip) introSkip();
    else if (Ending.running) Ending.skip();
    else if (ended && endSkipRes) { endSkip = true; Core.Time.skip = true; Voice.cancel(); endSkipRes(); }
    else if (busy) Core.Time.skip = true;
  };
  $('skip').onclick = skipNow;
  window.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); skipNow(); }
    else if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !document.querySelector('.modal:not(.hidden)')) togglePause();
  });
  window.addEventListener('beforeunload', () => { if (online()) Net.send({ t: 'bye' }); });
  applySettings();

  // ---------- 版本：显示在设置里；发现新版本时提示刷新（微信等内置浏览器缓存很顽固） ----------
  const APPV = window.APP_VERSION && !/APPVER/.test(window.APP_VERSION) ? window.APP_VERSION : 'dev';
  $('verTag').textContent = '版本 ' + APPV;
  async function checkVersion() {
    if (!/^https?:$/.test(location.protocol) || APPV === 'dev') return;
    try {
      const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
      const j = await r.json();
      if (j && j.v && j.v !== APPV) {
        $('updBar').classList.remove('hidden');
        $('updBar').onclick = () => { const q = new URLSearchParams(location.search); q.set('v', j.v); location.replace(location.pathname + '?' + q.toString()); };
      }
    } catch (e) { }
  }
  setTimeout(checkVersion, 5000); setInterval(checkVersion, 5 * 60 * 1000);

  // ---------- 入口：邀请链接自动入局 / 房主恢复 ----------
  const q = new URLSearchParams(location.search);
  const urlRoom = (q.get('room') || '').toUpperCase();
  const hostRec = store.get('host', null);
  // （主帅兵法用哪一套由每一局的 opts.bs 决定，见 startGame；网址带 ?beishui=0 时，这台机器新开的局回到破釜沉舟）
  // 省电（?eco=1）：演出、结算、自动复盘、电脑在走的时候照常满帧
  if (Core.ECO) Core.onFrame(() => { if (busy || Ending.running || (RP && RP.playing) || document.body.classList.contains('cine')) Core.poke(300); });
  window.__xq = {
    get busy() { return busy; }, get started() { return started; }, get game() { return game; }, get mode() { return mode; }, get aiThinking() { return aiThinking; },
    doMove, startGame, finishGame, Ending, Fx, Board, Core, Camp, Squads, Spect, setView, onData, Net, requestUndo, sendEmote, get clock() { return clock; }, get opts() { return opts; }, joinRoom, notation, get notes() { return notes; }, aiSay,
    doBF, bfButton, bfClick, get bfMode() { return bfMode; }, BF, BFX, specGo, specFlick, exportGame, hostRoom, roomSit, get room() { return room; }, get specNames() { return specNames; }, anaOpen, anaPick, anaExplain, anaDemo, get anaDet() { return anaDet; }, get RP() { return RP; },
    get badN() { return badN; }, get JK() { return JK; }, get JC() { return JC; }, get pendingJ() { return pendingJ; }, get jqBad() { return jqBad; }, jqReady, capChip, XQ,
  };
  if (location.hash === '#local') { startGame('local', 'r', { undo: 3, total: 15, step: 60, hints: 1 }, { intro: false }); return; }
  if (location.hash === '#jq') { startGame('local', 'r', { undo: 99, total: 0, step: 0, hints: 1, jq: 1 }, { intro: false }); return; }
  if (location.hash === '#bf' || location.hash === '#bfdebug') {
    startGame('local', 'r', { undo: 99, total: 0, step: 0, hints: 1, bf: 1 }, { intro: false }).then(() => { if (location.hash === '#bfdebug') $('tDebug').click(); });
    return;
  }
  if (location.hash.startsWith('#bfai')) { const [, lv, sd] = location.hash.split('-'); startGame('ai', sd || 'r', { undo: 3, total: 0, step: 0, hints: 1, level: lv || 'mid', bf: 1 }, { intro: false }); return; }
  if (location.hash.startsWith('#ai')) { const [, lv, sd] = location.hash.split('-'); startGame('ai', sd || 'r', { undo: 3, total: 0, step: 0, hints: 1, level: lv || 'easy' }, { intro: false }); return; }
  $('lobby').classList.remove('hidden');
  paintResume();
  if (urlRoom && hostRec && hostRec.code === urlRoom && Date.now() - hostRec.t < 6 * 3600e3) {
    hostRoom(urlRoom, hostRec.opts, hostRec.side, 'pending');
    toast('正在恢复你的房间…');
  } else if (urlRoom) {
    joinRoom(urlRoom);
  }
})();
