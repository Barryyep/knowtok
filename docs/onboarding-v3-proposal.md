# Ohlo Onboarding V3.2 —「一份伪装好的心理问卷」
**日期:** 2026-07-04
**状态:** 创始人已批准方向,V3.2 按最终反馈定稿,进入实现
**修订史:** V3 由浅入深四层漏斗 → V3.1 加入意图伪装 + 周六情节 → **V3.2 去掉假想情节,全部换成贴近生活的琐事**;确认软推断原则(70-80% 准确度即可,题目不必尖锐);好奇雷达揭晓已确认;名字回归第 0 题已确认。

---

## 0. 一句话

把 onboarding 做成一份**伪装好的心理问卷**:问的全是生活里的小事(相册、体检报告、睡不着的夜晚),用户以为在闲聊,实际上每一题都在往一张隐藏的映射表里投软票;漏斗从粗到细再 finetune,最后用「好奇雷达」把测量结果轻轻还给用户。

---

## 1. 产品原则(最终版)

**P1 信任-深度曲线。** 耐心是预算:开头零成本,越答越深,最敏感的(生活状态/年龄)放最后且可跳过。

**P2 多轮小问题。** 每屏一题、一次点击、除了第 0 题永不打字。约 15 屏 / 100 秒。

**P3 永远不定义用户。** 流程中零标签;揭晓只给倾向指标。定义服务,不定义人。

**P4 答案决定下一题。** 牌局六轮是真分支决策树。

**P5 信隐喻只在视觉层。** slip/№/邮戳/落信动效保留,文案不角色扮演。

**P6 测什么就藏什么。** 重要信号的题面必须看起来与它无关,映射只存在于后台账本。

**P7 只问生活琐事。**(V3.2,替代原"情节贯穿")不造假想场景——"假设周六去书店"这种题不贴地,用户对假想情境的回答也失真。问真实发生过一百次的小事:相册里是什么、报告怎么看、睡不着想什么。琐事本身就是伪装:没人觉得"你相册里最多的是什么"是在测画像。

**P8 软推断,70-80% 就够。**(V3.2 确认)映射不需要每题都准:粗票权重 0.5,牌局行为票权重 1、决赛 2,合流后单题的噪声被冲掉。因此题目允许模糊、不尖锐,选项之间没有"对的答案",也没有让人不舒服的逼问。

---

## 2. 流程总览(15 屏,约 100 秒)

```
开场      1 屏   怎么称呼你(可跳过)
过场      1 行   「几个小问题,随便答,没有对错。」(1 秒淡入,自动过)
琐事·粗   4 题   相册 / 体检报告 / 睡不着 / 什么让你停下 → 领域先验 + 口味第一票
牌局·细   6 轮   「哪条你会点开」3选1,自适应决策树 → 领域排名与强度
finetune  2 题   讲法偏好 / 阅读时段 → 口味第二票 + reading_moment
收尾      2 题   平常的日子像什么 / 人生阶段(均可跳过)→ occupation / age
揭晓      1 屏   好奇雷达
```

顶部细进度条静默前进;语言跟随系统,设置里可改。

---

## 3. 完整题库(文案即成品,zh / en)

### 第 0 题 · 称呼(唯一可打字,可跳过)

> zh:怎么称呼你(随便写,或者跳过)
> en: What should we call you (anything works, or skip)

### 过场(一行,自动过)

> zh:几个小问题,随便答,没有对错。
> en: A few small questions. No right answers.

### 琐事·粗筛(4 题,每题都是真实发生过一百次的小事)

**Q1 相册**
> zh:翻你的相册,除了人,更多的是
> A 吃的,和吃过的店  B 天空、路上随手拍的东西  C 各种截图
> en: In your camera roll, besides people, there's mostly
> A Food, and places you ate  B Sky, and things you passed  C Screenshots

*(暗票:A food+0.5 / B nature+0.25 space+0.25 / C tech_ai+0.5)*

**Q2 体检报告**
> zh:体检报告出来,你通常
> A 会把不懂的指标一个个查明白  B 扫一眼结论,没大事就收起来
> en: When a health checkup report comes back, you usually
> A Look up every number you don't recognize  B Scan the summary and file it away

*(暗票:A health+0.5 且投深读一票 / B 无票——不选也是信息,而且没人被评判)*

**Q3 睡不着**
> zh:睡不着的时候,脑子里更常转的是
> A 一些没用但有意思的问题  B 白天的人和事  C 账单、计划这些实际的
> en: Lying awake at night, your head is usually on
> A Useless but interesting questions  B People, and things that happened today  C Bills, plans, practical things
:
*(暗票:A mind+0.25 space+0.25 / B society+0.5 / C money+0.5)*

**Q4 停下来**
> zh:躺着刷手机,哪种东西最容易让你停下来
> A 一个反常识的数字  B 一段讲得特别清楚的原理  C 一件正在发生的大事
> en: Scrolling in bed, what actually stops your thumb
> A A number that shouldn't be true  B A principle explained perfectly  C Something big happening right now

*(暗票:口味第一票 A 惊奇 / B 深读 / C 中性,交给 Q11;同时给牌局排序先验)*

### 牌局·细分(6 轮,3 选 1 事实牌,自适应)

题干每轮一句:
> zh:哪条你会点开
> en: Which one would you open

```
R1   粗测:三大类(前沿/身体/世界)各出当前先验分最高的领域,各 1 张探测牌
R2   补测:还没上过牌桌的领域里挑 3 个(尽量跨大类),补齐曝光
R3   加深:当前总分第 1 的领域出确认牌 + 它同大类的两个邻居
R4   加深:当前总分第 2 的领域出确认牌 + 它的邻居
R5   野牌:总分垫底的领域里挑 3 个,各出最强的牌,给爆冷机会
R6   决赛:总分前 3 的领域各出一张没用过的牌,计双分
```

*(计分:琐事暗票 0.5 → 点牌 1 → 决赛 2。产出领域排名+强度分,强度分即雷达条长度。)*

### finetune(2 题)

**Q11 讲法**
> zh:朋友非要给你讲一个"改变他世界观"的事。你希望他
> A 一句话说完重点,惊到就行  B 从头讲清楚来龙去脉
> en: A friend insists on telling you something that "changed how they see everything." You'd rather they
> A Land the punchline in one line  B Walk you through it from the start

*(口味第二票;与 Q4 分歧时以 Q11 为准)*

**Q12 时段**
> zh:这种闲逛式的看东西,你最常发生在
> A 通勤、排队、等人的缝隙里  B 晚上安静下来之后
> en: This kind of idle reading mostly happens
> A In the cracks — commutes, queues  B Late, once things go quiet

*(reading_moment,未来通知/widget 刷新时机;V1 仅本地存储)*

### 收尾(2 题,均可跳过)

**Q13 平常的日子**
> zh:平常的日子,更像下面哪一种
> A 会议和截止日期  B 课表和考试  C 家和孩子的日程  D 都不太像
> en: Most days look like
> A Meetings and deadlines  B Classes and exams  C The family calendar  D None of these

*(occupation 四分类;跳过 = other)*

**Q14 人生阶段**
> zh:你在哪个人生阶段(可跳过)
> 18-24 · 25-34 · 35-44 · 45-54 · 55+

---

## 4. 隐藏映射表(后台账本)

| 题 | 表面上像 | 实际在测 | 字段 | 互证 |
|---|---|---|---|---|
| Q0 称呼 | 打招呼 | (无)降压台阶 | name | — |
| Q1 相册 | 闲聊习惯 | food/nature/space/tech 先验 | curiosityDomains | 与牌局合流 |
| Q2 体检 | 生活习惯 | health 先验 + 深浅 | curiosityDomains, interests | 与 Q4/Q11 合议 |
| Q3 睡不着 | 闲聊 | mind/space/society/money 先验 | curiosityDomains | 与牌局合流 |
| Q4 停下来 | 刷手机习惯 | 口味第一票 + 牌局先验 | interests | 与 Q11 合议 |
| R1-R6 牌局 | 选内容玩 | 领域排名+强度 | curiosityDomains | 主信号 |
| Q11 讲法 | 吐槽朋友 | 口味第二票 | interests | 分歧以此为准 |
| Q12 时段 | 聊生活 | 阅读时机 | reading_moment(新,本地) | — |
| Q13 日子 | 收尾寒暄 | 职业类别 | occupation | — |
| Q14 阶段 | 常规资料 | 年龄段 | age_range | — |

检验标准:任何一行,用户单看题面推不出右边两列。history/climate 没有粗票——牌局 R2 补测轮保证它们上桌,这正是漏斗的意义。

---

## 5. 揭晓(已确认)

「你的好奇雷达」(留了称呼则为「XX 的好奇雷达」):领域强度条(长度=合流分)+ 口味光谱(惊奇 ●——○—— 深读)+ 节奏行(每天一条 · 缝隙时间/夜晚)+ 底注「这不是结论。你读什么,它就跟着变。」+ CTA「看今天这条」。

---

## 6. 数据映射与兜底

| 字段 | 来源 | 兜底 |
|---|---|---|
| curiosityDomains | 暗票 0.5 + 点牌 1 + 决赛 2 合流,取前 3-4 | 恒 ≥2 个域(R1/R2 牌桌不相交) |
| interests | Q4 + Q11 合议 | 分歧取 Q11;都中性则默认惊奇 |
| occupation | Q13 | 跳过 = other |
| age_range | Q14 | 可空 |
| name | Q0 | 可空 |
| reading_moment | Q12 | 新字段,V1 只存本地(远端列待定,不动库表) |
| language | 系统语言 | 设置可改 |

---

## 7. 实现拆分

- **契约(Fable):** src/lib/quiz.ts——题库常量 + 决策树引擎 + 计分合流,纯函数可单测。
- **内容(Sonnet):** SPARKS 每域 2→4 张(40 张),从库里 251 条 hook 精选改写,守 hook 规则。
- **UI(Sonnet):** 一屏一题全流程 + 转场衔接(出题滑离/落信进场/进度条动画/过场淡入自动过)+ 雷达揭晓卡。衔接质量是创始人点名要求。
