import html
E = html.escape
CHU = [
 ('一 · 垓下', '夜 · 项王造型一', [
  ('G01', 7, '大全景 · 高空缓降', '夜。垓下楚营一圈篝火，被汉营的火把一层层围住（三重光环），远山剪影，营烟往一边飘。镜头从高空慢慢降、往前推。', '旁白：汉五年，项王军壁垓下，兵少食尽，汉军及诸侯兵围之数重。'),
  ('G02', 3, '中景 · 低机位', '汉军阵前一排持火把的士兵：最近一人虚焦占半边画面，焦点在第二排；风吹旗角。', '旁白：夜闻汉军四面皆楚歌。远处楚歌渐起'),
  ('G03', 4, '中近景 · 横移', '楚营哨兵听见歌声，一个放下戈望向山那边；镜头沿栅栏横移，焦点从戈尖移到他脸上。', '楚歌（远处女声）'),
  ('G04', 6, '中景 → 近景 · 慢推', '帐中烛火。项王原本坐着，猛地站起、扭头看向帐门；烛光从一侧打来，帐门那边一道冷光勾边。', '项王：汉皆已得楚乎？是何楚人之多也！'),
  ('G05', 17, '帐内 · 慢环绕', '项王坐回几案举杯，诗句逐句出现。帐布上映着虞姬舞剑的影子（只出影子）；中间插一镜帐外乌骓喷鼻刨蹄。', '项王：力拔山兮气盖世……虞兮虞兮奈若何！'),
 ]),
 ('二 · 乌江', '黎明 · 项王造型二（尘土、雉尾折了一根）', [
  ('G06', 7, '大全景 · 航拍', '黎明江面晨雾、芦苇；渡船挂着灯笼泊在岸边，亭长撑篙；远处项王骑乌骓带二十几骑沿岸奔来，扬起一线尘土。逆光，雾里有光柱。', '旁白：于是项王乃欲东渡乌江。乌江亭长檥船待。'),
  ('G07', 7, '过肩 · 正打', '从项王肩后看亭长：亭长作揖、劝。焦点在亭长，项王的肩甲虚焦占画左。', '亭长：江东虽小，地方千里，众数十万人，亦足王也。'),
  ('G08', 7, '近景 · 反打', '项王听着，不说话，眼神往江东方向飘。', '亭长（画外）：愿大王急渡……'),
  ('G09', 5, '近景 · 仰拍侧脸', '项王仰头望天，脸朝着初升的日头，背后是空空的天。', '项王：天之亡我，我何渡为！'),
  ('G10', 11, '中景 · 侧面长焦', '他转身望西边来路的侧影；中间插一个特写：攥紧缰绳的手。', '项王：且籍与江东子弟八千人渡江而西，今无一人还。'),
  ('G11', 8, '近景', '低头，自嘲地一笑，又抬眼看亭长。', '项王：纵江东父兄怜而王我，我何面目见之？'),
  ('G12', 5, '特写', '眼睛：闭上，再睁开。', '项王：纵彼不言，籍独不愧于心乎？'),
  ('G13', 14, '双人中景', '项王下马，抚乌骓的鬃毛，把缰绳递给亭长，亭长双手接过；景深落在两只手和缰绳上，乌骓回头蹭他。', '项王：吾知公长者……不忍杀之，以赐公。'),
  ('G14', 4, '远景 · 低机位', '山岗上汉军骑兵一排排冒出来，背着光扬起大片尘土，旗子一面面立起来；地面在震，镜头微抖。', '战鼓、马蹄（无台词）'),
 ]),
 ('三 · 最后一战', '项王造型三（盔掉了、散发、披风成条）', [
  ('G15', 8, '动作蒙太奇 · 四镜', '① 项王步战，短兵横扫，慢动作，尘土飞；② 汉兵一排倒下（剪影）；③ 手持镜头跟着他冲；④ 地上折断的汉旗。', '旁白：乃令骑皆下马步行，持短兵接战。独籍所杀汉军数百人。'),
  ('G16', 6, '近景', '项王喘着气，被汉兵围在中间（背景虚焦），对着人群里的旧识吕马童一笑。', '项王：吾闻汉购我头千金，邑万户，吾为若德。'),
  ('G17', 4, '远景 · 剪影', '江边落日，项王的剪影站在日头前，拔出长剑（剑只在这里出鞘）；剑举起时切黑。', '旁白：乃自刎而死。'),
  ('G18', 3, '黑场', '黑场里一团朱红墨晕开，接结算卡。', '一声锣，古琴尾音'),
 ]),
]
HAN = [
 ('彭城', '刘邦造型一 → 造型五', [
  ('P01', 6, '大全景 · 摇臂', '清晨，彭城城墙；汉军和诸侯兵的各色旗从城门涌进去，城外还排着望不到头的队伍，扬尘。', '旁白：汉二年春，汉王部五诸侯兵，凡五十六万人，东伐楚，入彭城。'),
  ('P02', 6, '中景 · 慢推', '宫中宴席：刘邦（冕服）在灯火里，前景是耳杯、金饼、玉璧（虚焦），后面帷幕和一排灯。正式版他手里换成漆耳杯、举杯大笑。', '旁白：收其货宝美人，日置酒高会。'),
  ('P03', 6, '远景 · 低机位跟拍', '晨雾里楚军三万骑从坡上冲下，项王（造型一）在最前面，戟指前方；逆光尘土。', '旁白：项王闻之，乃引精兵三万人，晨击汉军而东，至彭城。'),
  ('P04', 4, '大全景 · 升', '日中，楚骑冲进汉军阵中，汉旗一面面倒下，尘土翻滚。', '旁白：日中，大破汉军。'),
  ('P05', 5, '大全景 · 俯拍', '睢水：汉兵被挤进河里，满河的旗、盾、断戈，河面堵住（不拍血腥）。', '旁白：汉卒十余万人皆入睢水，睢水为之不流。'),
  ('P06', 5, '近景', '风沙里，刘邦（造型五：冠丢了、散发、袖子撕破）回头，举着马鞭；后面楚军的影子追上来。正式版他在马上。', '刘邦：吾宁斗智，不能斗力！'),
  ('P07', 4, '俯拍 · 航拍', '楚军把刘邦和几十骑围了三圈。', '旁白：楚又追击至灵璧东睢水上，围汉王三匝。'),
  ('P08', 8, '大全景', '西北起大风：树被吹弯、屋顶掀飞、沙石满天，天一下子暗下来；楚兵挡着脸往后退。', '旁白：于是大风从西北而起，折木发屋，扬沙石，窈冥昼晦，逢迎楚军。'),
  ('P09', 5, '远景', '风沙里刘邦带几十骑从缺口冲出去，消失在沙尘里，接结算卡。', '旁白：楚军大乱，坏散，而汉王乃得与数十骑遁去。'),
 ]),
]
FR = {'G01', 'G04', 'G06', 'G09', 'G14', 'G17', 'P02', 'P06'}
def total(parts): return sum(s[1] for _, _, shots in parts for s in shots)
def shots_html(parts):
    out = []
    for name, sub, shots in parts:
        out.append(f'<div class="seq"><h3>{E(name)}</h3><span>{E(sub)}</span></div>')
        for sid, dur, cam, pic, snd in shots:
            fr = f'<figure><img src="{sid}.jpg" alt="{sid} 关键帧：{E(pic[:30])}" loading="lazy"><figcaption>{sid} 草帧</figcaption></figure>' if sid in FR else ''
            out.append(f'''<article class="shot{' has' if fr else ''}" id="{sid}">
  <div class="meta"><b>{sid}</b><span class="dur">{dur}″</span><span class="cam">{E(cam)}</span></div>
  <div class="txt"><p class="pic">{E(pic)}</p><p class="snd">{E(snd)}</p></div>{fr}
</article>''')
    return '\n'.join(out)
t1, t2 = total(CHU), total(HAN)
ASSETS = [
 ('人物', ['刘邦（造型一、五）、项王（造型一、二、三）：已通过，要补动作：站起转身、举杯、抚鬃、递缰、下马、步战横扫、拔剑', '亭长和渡船：初版已有，要补「双手接缰」', '乌骓：现在是对局里的低精度马，要做一匹和人物同精度的', '吕马童（汉将）：用汉军将领改盔甲即可', '虞姬：只出现在帐布上的影子（建议），或另做模型']),
 ('场景', ['垓下：楚营帐篷、栅栏、篝火，汉营火把阵；帐内（帐布、几案、烛台、酒具）', '乌江：江面、芦苇、岸线、晨雾、落日', '彭城：城墙城门、宫中宴席（帷幕、灯、宝箱）、睢水河道', '远山、天空、云：分黎明、正午、黄昏、夜四套']),
 ('军队', ['汉军、楚军步兵和骑兵的高精度版（现在草帧里的骑兵是对局里的低精度模型，正式版要换）', '实例化成片：几百骑同时奔跑，远处用剪影卡片', '旗子按风向飘动']),
 ('特效与后期', ['扬尘（逆光暖色）、营烟、江雾、光柱、大风扬沙', '摄像机景深（焦点随镜头拉）、2.39:1 宽银幕、调色、暗角、胶片颗粒', '朱墨晕染的转场和结尾', '画质分档：低档关景深、少粒子，手机也能跑']),
]
QS = ['手机竖屏时 2.39:1 的画面只占中间一条：是提示横过来看，还是竖屏时改成 16:9 裁掉两边，还是保持宽银幕？', '虞姬：只在帐布上出影子（省一个模型、也更含蓄），还是要做一个虞姬的三维模型？']
page = f'''<title>终局分镜 · 史笔</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;900&family=Noto+Sans+SC:wght@400;500&display=swap">
<style>
/* 一列分镜表：左边镜号、时长、机位，中间画面和台词，有草帧的镜头整宽放图。只用深色一套，和游戏界面同一套朱、米白、墨 */
:root{{ --g:#a8281c; --c:#f0e7d2; --k:#141311; --page:#1b1a17; --dim:#a39b89; --line:#3a362f; --gold:#c9a14a;
  --ef:"Noto Serif SC","Songti SC","STSong",serif; --es:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif; color-scheme:dark; }}
body{{background:var(--page);color:var(--c);font-family:var(--es);padding-block:30px 64px;padding-inline:16px;line-height:1.75}}
.wrap{{max-width:1040px;margin:0 auto;display:flex;flex-direction:column;gap:30px}}
h1{{margin:0;font-family:var(--ef);font-weight:900;font-size:30px;letter-spacing:.18em;text-wrap:balance}}
.lead{{margin:0;max-width:68ch;color:var(--dim);font-size:15px}} .lead b{{color:var(--c);font-weight:500}}
.part{{display:flex;flex-direction:column;gap:14px;padding-top:22px;border-top:2px solid var(--c)}}
.part h2{{margin:0;font-family:var(--ef);font-weight:900;font-size:24px;letter-spacing:.14em;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}}
.part h2 small{{font-family:var(--es);font-weight:400;font-size:13px;color:var(--dim);letter-spacing:.08em}}
.seq{{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-top:10px}}
.seq h3{{margin:0;font-family:var(--ef);font-weight:900;font-size:18px;letter-spacing:.16em;background:var(--g);padding:0 10px}}
.seq span{{color:var(--dim);font-size:13px;letter-spacing:.06em}}
.shot{{display:grid;grid-template-columns:150px minmax(0,1fr);gap:4px 20px;padding:12px 0;border-bottom:1px solid var(--line)}}
.meta{{display:flex;flex-direction:column;gap:2px}}
.meta b{{font-family:var(--ef);font-weight:900;font-size:17px;letter-spacing:.08em}}
.dur{{font-variant-numeric:tabular-nums;color:var(--gold);font-size:13px}}
.cam{{color:var(--dim);font-size:13px}}
.txt p{{margin:0}} .pic{{font-size:15px}} .snd{{color:var(--dim);font-size:14px;margin-top:4px!important}}
.snd::before{{content:"♪ ";color:var(--gold)}}
.shot figure{{grid-column:1 / -1;margin:8px 0 4px;display:flex;flex-direction:column;gap:4px}}
.shot img{{width:100%;height:auto;aspect-ratio:2.39/1;object-fit:cover;box-shadow:0 0 0 1px var(--line);background:#000}}
.shot figcaption{{color:var(--dim);font-size:12px;letter-spacing:.1em}}
.assets{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px 26px}}
.assets div{{min-width:0}} .assets h3{{margin:0 0 4px;font-size:13px;font-weight:500;color:var(--dim);letter-spacing:.16em}}
.assets ul{{margin:0;padding-left:1.1em;font-size:14px}}
.qs{{margin:0;padding-left:1.4em;font-size:15px}} .qs li{{margin-bottom:6px}}
.note{{margin:0;color:var(--dim);font-size:13px;max-width:72ch}}
@media (max-width:560px){{.shot{{grid-template-columns:1fr}} .meta{{flex-direction:row;gap:12px;align-items:baseline;flex-wrap:wrap}}}}
</style>
<div class="wrap">
  <h1>终局分镜 · 史笔</h1>
  <p class="lead">030 定的「甲 · 史笔」：电影正剧，<b>2.39:1 宽银幕</b>，正反打、特写、慢推，景深跟着焦点走。台词全用现在的写实配音，时长按配音排。下面是逐镜分镜表，<b>八个关键镜头附了草帧</b>：在引擎里用已经通过的刘邦、项王模型拍的，场景、军队还是临时搭的，主要看构图、光和景深。</p>
  <section class="part">
    <h2>楚败 · 垓下 · 乌江<small>{len([s for _,_,ss in CHU for s in ss])} 镜　约 {t1 // 60} 分 {t1 % 60} 秒</small></h2>
    {shots_html(CHU)}
  </section>
  <section class="part">
    <h2>汉败 · 彭城<small>{len([s for _,_,ss in HAN for s in ss])} 镜　约 {t2} 秒</small></h2>
    {shots_html(HAN)}
  </section>
  <section class="part">
    <h2>要补的资产</h2>
    <div class="assets">{''.join(f'<div><h3>{E(k)}</h3><ul>' + ''.join(f'<li>{E(x)}</li>' for x in v) + '</ul></div>' for k, v in ASSETS)}</div>
  </section>
  <section class="part">
    <h2>要你定的两件事</h2>
    <ol class="qs">{''.join(f'<li>{E(q)}</li>' for q in QS)}</ol>
  </section>
  <p class="note">分镜通过以后的顺序：先做乌骓和缺的动作 → 搭垓下、乌江、彭城三处场景 → 高精度军队和扬尘 → 按这张表排镜头，做成带声音的样片给你看。演出的时间轴写在 TD 的 ending.js 里，到时候和他一起接。</p>
</div>
'''
open('page/index.html', 'w').write(page); print(len(page), t1, t2)
