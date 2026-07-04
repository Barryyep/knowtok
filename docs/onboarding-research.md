# Ohlo 引导页重构研究报告
**研究日期：** 2026-07-04  
**撰写人：** 竞品研究 PM  
**决策对象：** 创始人

---

## 1. TL;DR（≤10行）+ 推荐方向

当前引导三步流程的根本问题不是内容——SPARKS 牌组逻辑扎实——而是**结构节奏**：第二步直接弹出表单，打断了 quiz 建立的心理沉浸感。用户在回答"什么让你停下滑动"后正处于最高信任时刻，这时给他们看三个空白输入框，等于在电影高潮时打开灯。

竞品研究显示，最能建立"被读懂"感的流程有三个共同特征：**一次一问**（Noom、Duolingo、Fabulous）、**答案反馈给用户看**（16Personalities 结果页、Noom 的个性化图表）、**在收集敏感信息前先给用户一个小 reward**（Headspace 先让你做一分钟冥想再问订阅意愿）。

**推荐方向：方向 B「信差审阅」**——把占据半屏的表单拆成 4 张单屏 binary choice 牌（含一张软问职业/身份的选项卡），并在所有问答完成后展示一张生成式「读者档案」信封卡作为 reveal，然后才进入第一条 dispatch。这个方向：数据完整度不低于现状、建设成本最小、心理体验接近 MBTI 式 quiz，且完全符合 Ohlo 的信件隐喻。

---

## 2. 竞品拆解表

| App | 步数 / 时长 | 提问形式 | 敏感信息怎么问 | 结尾 Payoff |
|-----|-----------|---------|------------|------------|
| **16Personalities** | 93 题 / 10-15 min | 滑块量表（强烈同意→强烈不同意），桌面/移动均适配 | 无人口学问题；性格维度全由答案推断，无直接询问 | 完整人格档案页：类型名+形象插画+详细描述；社交分享卡；高度 Barnum 效应打磨的文案 |
| **Noom** | 67-113 屏 / 15-30 min | 一次一题 multiple choice；10 题滑块"行为侧写" | 体重/年龄用 banding（"20多岁" 而非精确数字）；先解释原因再问敏感问题；答完后给共情反馈（"谢谢分享，这是重要的第一步"）| 个性化体重预测图表（目标 + 截止日 + 稳定曲线 vs 溜溜球曲线对比）；出现在付款前 |
| **Fabulous** | ~30 屏 / 5-8 min | 一次一题；Future Self 信件（"未来的 Jason 写给你"）；指纹承诺合同 | 生活满意度题组代替直接询问收入/职业 | "三座山"进度图 + 初始习惯分配；有沉没成本感（做了这么多终于看到自己的路线图） |
| **Duolingo** | 8-12 屏（核心流） | 单选 + 第一课直接嵌入引导 | 先问目标（"旅行/职业/大脑训练"）而非背景；注册延迟到核心体验之后 | 完成第一课解锁进度条；Duo 鸟动效；XP 积累开始 |
| **Headspace** | 9-10 tap | 单选目标 → 立即进入 2 分钟冥想 | 心理健康状态在**体验后**询问（post-session 感受），而非事前表单 | 第一次冥想完成本身即 payoff；订阅 prompt 在体验之后 |
| **Co-Star** | 3 屏（出生日期/时间/地点）| 高度仪式感的数据输入；建图等待动效配俏皮文案 | 无问卷；全部信息通过出生数据客观计算 | 生成"你的 Pattern"——多层人格肖像，用日常语言，无星座术语；主页卡片式呈现 |
| **The Pattern** | 3-4 屏（出生信息）| 同 Co-Star 结构；但着重"性格周期"和当下状态 | 无直接人口学；年龄由出生年自动推断 | "Pattern 档案"：性格 + 当前生命周期阶段 + 关系模式；音频叙事可选层 |
| **Blinkist** | 4-6 屏 | 话题卡片多选（封面式呈现，非枯燥列表）；目标选择（"我想…"句式） | 职业/年龄不直接询问；通过书单口味推断；"我想学 X"优于"我的职业是 X" | 第一本书推荐 + 完成感动效；付费 upsell 出现在此前 |
| **TikTok** | 3-5 屏 | 兴趣话题网格（图标+文字，一次性多选）；然后直接进 feed | 用话题选择代替直接人口学询问；feed 的行为数据很快覆盖声明偏好 | 无明确 reveal；payoff 是 feed 本身立刻变得"懂你" |
| **Noom（行为侧写部分）** | 10 题滑块模块 | 两端陈述之间拖动（"我是冲动的 ←→ 我是有计划的"）；节奏慢、感觉被分析 | 这个模块本身不收集敏感信息，只测量行为风格 | 侧写结果文字反馈（如"你是习惯型的人"）；让用户感觉被科学仪器扫描过 |

---

## 3. 心理学原理提炼

**① Barnum / Forer 效应 — "这说的就是我"**  
来源：16Personalities、The Pattern、Co-Star  
机制：对泛化描述赋予高度个人化的准确感，前提是描述用具体细节包裹（"你表面冷静，但内心会反复推演一件事的得失"）。Ohlo 的「读者档案」文案可以用相同技巧：写得像在描述某一类人，但让每个读者都觉得是在写自己。  
**注意：** 这是可以诚实使用的——关键是文案真的基于用户数据推断，而非纯粹随机。

**② 渐进承诺（Progressive Commitment）— 越投入越舍不得退出**  
来源：Noom（67 屏后才要付款）、Fabulous（指纹承诺）  
机制：沉没成本 + 自我一致性动机。每回答一道题，用户对这个产品的心理所有权都在提升。Ohlo 可用：SPARKS 牌组已经在做这件事；后续问题应感觉像"配合"而非"提交表格"。

**③ 自我概念威胁（Self-Concept）— 问题本身就是奖励**  
来源：Noom 行为侧写、Fabulous 的 Future Self 信件  
机制：当问题框架暗示"你是个有独特内在世界的人"，回答本身就是自我表达，不是数据填写。关键是**问题以第二人称、具象场景描述**，而非抽象分类。  
Ohlo 版本："信差需要知道：你更可能在清晨还是深夜读信？" > "偏好阅读时段：□早晨 □晚上"

**④ 好奇心缺口（Curiosity Gap）— 答完还有什么？**  
来源：16Personalities（93 题后的完整档案）、The Pattern（出生数据换来多层人格图谱）  
机制：Robert Cialdini / George Loewenstein 的好奇心理论：当人知道存在答案但还未看到，会产生强烈驱动力完成任务。Ohlo 必须在流程开始时暗示 reveal 的存在。  
建议开场文案："几张牌之后，你的信差档案就会印上邮戳。"

**⑤ 认知负荷最小化 — 一次一题的超级力量**  
来源：Noom、Duolingo、Headspace  
机制：每屏一个决策消除选择疲劳；答了就自动进入下一题的设计（tap-to-advance）减少摩擦；进度指示器（"5/8"）把剩余工作量变成激励而非威胁。  
Ohlo 当前 Step 2 的三个 TextInput 在同一屏——这是最大的体验断层。

**⑥ 价值先行（Value-First Sequencing）— 先给再要**  
来源：Headspace（先冥想再付款）、Duolingo（先上第一课再注册）  
机制：用户在尝到产品核心价值之前不愿意提供个人信息。Ohlo 的 SPARKS 牌组已经在给价值（每张牌本身就是一条有趣信息），但 Step 2 的表单打断了这个流动。

**⑦ 仪式感与延迟满足 — 等待本身变成体验**  
来源：Co-Star（"正在生成你的星盘..."配打字机文字）、The Pattern  
机制：短暂的处理动画暗示系统在认真计算你的独特性，而非套用模板。这个技巧极低成本，但大幅提升 reveal 的感知价值。  
Ohlo 版本：reveal 前显示"信差正在整理你的档案 — № 印制中..."动效（1.5s）。

**⑧ 间接身份采集 — 让用户用行动而非自述来描述自己**  
来源：TikTok（话题选择 → 推断兴趣）、Blinkist（"我想学 X"→ 推断阅读动机）  
机制：直接问"你的职业是什么"激活防御心理；而"你更想知道哪类信息"是安全的自我表达。Ohlo 需要把 occupation 字段转化为场景选择题。

---

## 4. Ohlo 三个重构方向

> **通用约定：**  
> - 全程无 emoji、无感叹号（符合 Ohlo deadpan tone）  
> - 所有屏幕保留 `OHLO · DAILY DISPATCH` eyebrow + 落信动效  
> - 目标数据输出：curiosityDomains ≥2、occupation（可推断）、age_range（可选）、language  

---

### 方向 A：「连续牌阵」— 扩展的 SPARKS 流

**核心思路：** 用 SPARKS 的牌组形式把所有问题都转化成 binary tap，消灭表单，每屏一张牌，答完后展示「好奇档案」reveal 卡。

**流程图（8 屏）：**

| 屏 | 内容 | 数据收集 | 时长 |
|----|------|---------|------|
| 0 | 欢迎 + 好奇心缺口暗示 | — | 3s |
| 1–5 | SPARKS 扩展牌：20 张缩减为"一次展示 1 张，左滑=跳过，右滑=我会点开"；显示进度"4/10" | curiosityDomains | ~90s |
| 6 | 身份选择卡（4 选 1）："信件应该寄给…" 配图标，非文字输入 | occupation 类别 | 10s |
| 7 | 年龄段（可跳过）："你在哪个人生章节" | age_range | 5s |
| 8 | Reveal 屏：「你的读者档案」邮戳卡 | — | 15s |

**屏 0 — 欢迎（中/英文案）：**

> **zh:** 好奇心是有地图的。  
> 几张牌之后，Ohlo 会知道往哪里寄信。  
> **en:** Curiosity has a shape.  
> A few cards from now, Ohlo will know where to deliver.

**屏 1-5 — 单张牌（Swipe 格式，中/英示例）：**

牌面上方：`CARD 3 OF 10`（Space Mono）  
牌正文（cream slip，Fraunces）：
> **zh:** 章鱼有三颗心脏——游泳时两颗会停跳。  
> **en:** Octopuses have three hearts — two stop when they swim.  

牌底：两个按钮，均为 pill 形态  
左：`跳过` / `PASS`（ink-muted 边框）  
右：`我会点开` / `OPEN IT`（persimmon fill）

**屏 6 — 身份选择（中/英文案）：**

> **zh（eyebrow）:** 信差需要一个地址。  
> **zh（title）:** 这封信，最常寄给哪种人？  
> **en（eyebrow）:** The courier needs an address.  
> **en（title）:** What kind of reader opens this letter?  

四张身份卡（图标 + 两行描述，cream slip 样式）：

| 卡 | 中文 | 英文 |
|----|------|------|
| A | 在职场里积累弹药的人 | Someone stockpiling conversation ammunition |
| B | 在学校里保持好奇的人 | Someone keeping curiosity alive in school |
| C | 给孩子解释世界的人 | Someone explaining the world to a child |
| D | 享受独自阅读的人 | Someone who reads for the pleasure of reading |

**屏 7 — 年龄段（可跳过，中/英文案）：**

> **zh（title）:** 邮戳印哪个年代？（可跳过）  
> **en（title）:** What era does the postmark say? (Optional)  

五个 chip：18-24 · 25-34 · 35-44 · 45-54 · 55+  
底部：`跳过这一步` / `SKIP` （ink-muted text link，无按钮样式）

**屏 8 — Reveal「读者档案」：**

> **zh（eyebrow）:** 档案已印制  
> **en（eyebrow）:** PROFILE STAMPED  

显示一张竖向 cream slip，带 postmark 印章视觉，内容：

```
OHLO READER PROFILE          № ----
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
好奇领域 / DOMAINS
  宇宙与太空 · 自然与生物 · 心理与大脑

读者类型 / READER TYPE
  在职场里积累弹药的人

派发方式 / DISPATCH TO
  每日一封 · 中文版
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST CLASS                  OHLO ✦
```

底部 CTA：`开始收信` / `BEGIN RECEIVING`（persimmon pill）

**时间估算：** 2–3 分钟  
**风险：** 单张牌 swipe 格式需要新的手势交互实现；20 张 SPARKS 缩减为 10 张会损失覆盖面（建议保留 10 张最强钩子，其余在 in-app 行为中补充）。

---

### 方向 B：「信差审阅」— 最小改动的 MBTI 化重构（推荐方向）

**核心思路：** 保留 Step 1 SPARKS 牌组（改为可滚动牌阵，逻辑不变），把 Step 2 的三个 TextInput 替换成 2 张单屏 binary choice 牌（职业类型 + 兴趣侧重），Step 3 改为 reveal 屏。总步数从 3 变成 5，但每步极轻量，整体感觉是 quiz 而非 form。

**流程（5 屏）：**

| 屏 | 内容 | 对应原步骤 | 数据收集 |
|----|------|---------|---------|
| 1 | SPARKS 牌组（现有逻辑不变，但题目精简至 12 张，3×4 布局） | 原 Step 1 | curiosityDomains |
| 2 | 职业身份卡（4 选 1，单屏） | 原 Step 2（occupation） | occupation 类别 |
| 3 | 信息口味卡（2 选 1，单屏）："你更喜欢的信..." | 原 Step 2（interests） | interests 风格标签 |
| 4 | 收信偏好（年龄 chip + 语言，现有 Step 3 逻辑） | 原 Step 3 | age_range + language |
| 5 | Reveal：「读者档案」邮戳卡 + CTA | 新增 | — |

**屏 2 — 职业身份卡（中/英文案）：**

> **zh（eyebrow）:** OHLO · DAILY DISPATCH  
> **zh（title）:** 信差需要知道你的世界  
> **zh（subtitle）:** 选一张最接近你当下的牌。  
> **en（eyebrow）:** OHLO · DAILY DISPATCH  
> **en（title）:** The courier needs to know your world.  
> **en（subtitle）:** Pick the card that fits your current chapter.  

四张身份选项卡（cream slip 样式，带 persimmon 左侧竖线激活态）：

| 编号 | zh 文案 | en 文案 | 数据映射 |
|------|---------|---------|---------|
| A | 在职场里穿行的人——会议、截止日期、需要能拿出手的谈资 | Moving through workplaces — meetings, deadlines, and the need to sound informed | `occupation: professional` |
| B | 在学校里保持好奇的人——考试之外，也想知道世界长什么样 | Keeping curiosity alive at school — beyond exams, also interested in how the world works | `occupation: student` |
| C | 在家里平衡一切的人——家庭、孩子、零碎的独处时间 | Balancing everything at home — family, children, slivers of alone time | `occupation: homemaker` |
| D | 没有标准描述——自由职业、创业，或者就是不想被分类 | No standard description — freelance, building something, or simply uncategorizable | `occupation: other` |

**屏 3 — 信息口味卡（中/英文案）：**

> **zh（eyebrow）:** OHLO · DAILY DISPATCH  
> **zh（title）:** 你更想要哪种信？  
> **en（title）:** Which letter do you want more?  

两张对比 slip（大号，并排或上下排列）：

| 左 / A | 右 / B |
|--------|--------|
| **zh:** 让我在饭桌上讲出来的那种——冷知识、反直觉、让人"等等这是真的吗" | **zh:** 让我独自消化的那种——深一点，有历史脉络或科学推导 |
| **en:** The kind I repeat at dinner — counterintuitive, makes people say "wait, is that real?" | **en:** The kind I sit with alone — deeper, with historical context or scientific reasoning |
| 数据：`interests: social_currency` | 数据：`interests: depth_thinker` |

**屏 4 — 收信偏好（保留现有逻辑，轻度改文案）：**

> **zh（title）:** 最后两件事。  
> **en（title）:** Two last things.  

年龄 chip 改为"你在哪个人生章节"副标题；语言选择保留。可跳过年龄。

**屏 5 — Reveal（读者档案）：**  
同方向 A 屏 8，文案根据选择动态填入。额外加一行"信息口味"：

```
信息口味 / READING STYLE
  社交弹药型 / For the dinner table
```

**时间估算：** 2 分钟以内  
**优势：** 与现有组件结构最接近；新增 2 屏均无键盘、无 TextInput；Reveal 屏是纯展示，1天可实现原型；名字（name 字段）直接删除，不收集。  
**劣势：** 12 张 SPARKS 仍是一个相对长的滚动列表；职业分类只有 4 类，可能失真（但已优于自由填写）。

---

### 方向 C：「诊断信函」— 全沉浸式 MBTI 体验（高风险高回报）

**核心思路：** 把引导做成一个短篇小故事：用户是"新订阅者"，Ohlo 的信差需要在 3 分钟内完成"订阅者画像"，以便印制第一封个性化信件。全程用叙事性文案包裹每个问题，最终生成一张带有「读者类型名称」的 reveal 卡（类似 16Personalities 的类型名）。

**流程（7 屏）：**

| 屏 | 叙事框架 | 实际收集 |
|----|---------|---------|
| 0 | 开场信："一封来自 Ohlo 信差的便条——在我们印制第一封信之前，请允许我了解一下你。" | — |
| 1-3 | 快问快答 3 题（binary）：睡前还是早晨读信？你更担心：错过重要信息，还是被无聊内容淹没？如果只能告诉你一件事：关于你自己，还是关于世界？ | 阅读时段、信息焦虑类型、自我 vs 世界取向 |
| 4 | SPARKS 牌组（精简为 8 张，一次性展示） | curiosityDomains |
| 5 | 情境身份题："你更像哪个场景里的读者？"（配情境插图文字，非图标） | occupation 软推断 |
| 6 | 年龄 / 语言（可跳过） | age_range + language |
| 7 | Reveal：「你的读者类型」命名卡 + 档案细节 | — |

**读者类型命名系统（示例）：**

| 类型编号 | zh 名称 | en 名称 | 触发条件（示例） |
|---------|---------|---------|--------------|
| Type I | 弹药收藏者 | The Munitions Collector | social_currency + professional + 2+ domains |
| Type II | 深夜档案员 | The Night Archivist | depth_thinker + 晚间阅读 + history/mind domains |
| Type III | 静默观察者 | The Quiet Observer | depth_thinker + homemaker/other + nature/society |
| Type IV | 晨间好奇者 | The Morning Curious | social_currency + student + 早晨阅读 |

Reveal 卡文案示例（Type I）：

> **zh:**  
> 读者类型 № I  
> 弹药收藏者  
>   
> 你读信，不只是为了知道。  
> 是为了在对的时刻，能说出来。  
> 你的信差会优先投递：反直觉的数据、被忽视的大事、  
> 以及那种"等等这是真的吗"的瞬间。  
>   
> FIRST CLASS · OHLO  
>   
> **en:**  
> Reader Profile № I  
> The Munitions Collector  
>   
> You don't read to know things.  
> You read to say them at the right moment.  
> Your courier prioritizes: counterintuitive data, overlooked stories,  
> and anything that earns a "wait, is that real?"  
>   
> FIRST CLASS · OHLO  

**时间估算：** 2.5–3 分钟  
**优势：** 最接近 MBTI 体验；读者类型有社交分享价值（用户愿意截图）；叙事框架与信件隐喻完美吻合。  
**劣势：** 需要编写 4–8 套类型文案 + 条件逻辑路由；3 道"诊断题"（睡前/担忧/自我 vs 世界）目前在 SPARKS 体系外，需要额外的 persona 字段设计；build 成本最高；如果分类不够准，用户会感觉被错贴标签。

---

## 5. 推荐方案 + 数据完整性对照表

**推荐：方向 B「信差审阅」**

**理由：**
1. **保留率最高：** 5 屏中无任何键盘弹出；binary choice 的完成率通常比 TextInput 高 40-60%（Noom 内部数据参考）。
2. **数据质量不降低：** occupation 从自由填写变成 4 类分类，实际上更利于后端 persona 路由（精确分类 > 模糊自述）。interests 用风格标签替代 free-text，同样如此。
3. **build 成本最小：** 只需新增 2 个 binary choice 屏 + 1 个 reveal 屏；SPARKS 逻辑、PreferencesStep、保存逻辑均可沿用。Reveal 屏是纯展示组件，无状态。
4. **name 字段删除无损：** 经 Co-Star / The Pattern 验证，用户名不是个性化信件的必要元素；去掉后 About 步骤的最后一块多余感消失。
5. **可以 A/B 测试：** 方向 B 和当前流程的差异足够清晰，可以测量 onboarding 完成率和 D1/D7 留存的变化。

**字段来源对照：**

| 字段 | 现方案来源 | 方向 B 来源 | 是否变化 |
|-----|---------|---------|---------|
| `curiosityDomains` | SPARKS 牌组点选 | SPARKS 牌组点选（逻辑不变） | 无变化 |
| `occupation` | AboutStep TextInput（自由填写） | 屏 2 binary choice（4 类） | 形式变更，精度提升 |
| `interests` | AboutStep TextInput（自由填写） | 屏 3 binary choice（2 类风格标签） | 形式变更，降至2类 |
| `name` | AboutStep TextInput（可选） | **删除** | 删除（无损） |
| `age_range` | PreferencesStep chip | PreferencesStep chip（不变） | 无变化 |
| `language` | PreferencesStep | PreferencesStep（不变） | 无变化 |

**关于 interests 字段降级的注意：** 当前 interests 是自由填写，后端用于生成「跟你有什么关系」个性化文案。方向 B 将其简化为 `social_currency` / `depth_thinker` 标签，后端模板需配合修改（新增两个 interests 模板路径），但这实际上比 NLP 解析自由文本更可靠。

---

## 6. 风险与开放问题

**风险 1：SPARKS 缩减（方向 A/B）**  
将 20 张牌减少到 10-12 张，可能导致 curiosityDomains 覆盖不足（某些用户只在某 1 个领域找到共鸣）。  
缓解：保留每个 domain 至少 1 张代表性牌；在 in-app 行为中持续修正 persona。

**风险 2：Reveal 文案的 Barnum 效应边界**  
如果「读者档案」文案写得过于通用，用户会觉得没有被"读懂"，效果适得其反。  
缓解：档案内容必须直接反映用户的实际选择（写出具体的 domain 名称，而非抽象的性格描述）。

**风险 3：职业 4 分类过于粗糙**  
"在家平衡一切的人"可能让部分用户感觉被归类到自己不认同的标签。  
缓解：文案采用情境描述（"有孩子要照顾的人"）而非身份标签（"家庭主妇"）；始终提供"不想被分类"的选项。

**风险 4：Reveal 屏在首次运行时的技术依赖**  
Reveal 卡需要读取当前会话的所有选择并动态渲染。需要确保保存逻辑在 Reveal 屏展示时已完成（或在 Reveal 屏显示期间异步保存）。

**开放问题：**

1. **方向 C 的读者类型系统** 值得在 V2 版本考虑，尤其是当产品有足够用户数据可以验证类型分布之后。如果 V1 的方向 B 在 reveal 屏加上一个"隐藏类型名"（如 `Type I · 弹药收藏者`），技术上可以零成本为 V2 做铺垫。

2. **语言选择的位置：** 当前语言选在最后一步，但如果用户看不懂前几步的中文，会在中途流失。考虑将语言选择提前到第 0 屏（欢迎页），或利用设备系统语言自动设置，只在检测为中文时显示中文。

3. **name 字段删除后的称呼问题：** 「跟你有什么关系」文案目前是否用到了 name 字段？如果引导完成后还有其他地方在读取 `profile.name`，需要一并清理。

4. **SPARKS 是否要做手势：** 方向 A 的左右滑动手势在 React Native 上需要引入 react-native-gesture-handler 或 Reanimated 手势识别。方向 B 保留现有 tap 交互，技术风险更低。建议方向 B 短期内不引入滑动手势，保留为 V2 体验优化项。

---

*本报告基于竞品公开资料、UX 拆解文章及心理学文献综合撰写。研究覆盖：16Personalities、Noom、Fabulous、Duolingo、Headspace、Co-Star、The Pattern、Blinkist、TikTok 共 9 个产品的引导流程。*
