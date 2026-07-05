# Ohlo 选题算法 V1 —「三圆重叠」
**日期:** 2026-07-05
**状态:** 待创始人过目
**一句话:** 每天那一条,选在 **想知道(Want)× 需要知道(Need)× 我们有(Have)** 三个圆的交集里;三个圆各自有独立的分数来源,交集用乘法(任何一个圆为零,总分为零)。

---

## 0. 现状诚实盘点

| 圆 | 现在有什么 | 缺什么 |
|---|---|---|
| **Want 想知道** | 好奇雷达(测验暗票+牌局+可手调的 domainWeights),按权重轮换域 | 只到"域"粒度,没有域内偏好;行为(换一条/分享/翻面)还没有反哺 |
| **Need 需要知道** | **缺失**。职业/工作质地/人生阶段只用于事后写"为什么与你有关",不参与选择 | 把"这条对这个人有没有用"变成选择时的分数 |
| **Have 我们有** | 396 条五源库存 + wiki 现场生成;域路由;500 条去重 | 内容没有质量分/新鲜度分;域内选择是纯 hash,好牌和平庸牌等概率 |

结论:V1 的工作量集中在**补 Need 圆**和**给 Have 圆装质量分**,Want 圆升级留给隐式学习(V2)。

---

## 1. 模型

```
score(fact, user, day) =
    want(domain(fact), user)          # 雷达权重,已有
  × need(fact, user)                  # 新:生活相关度
  × have(fact)                        # 新:内容质量分
  × novelty(fact, user)               # 已有:看过=0,否则 1
```

乘法而非加法:**三圆哲学的数学表达**——再高质量的内容,用户不想看(want=0)就不该出现;再想看的域,没有好内容(have 低)也不硬凑。

每日选择:先按 want 权重轮换选域(现有机制,保留仪式感和多样性),再在**域内**用 `need × have` 排序取最高,同分用现有 hash 决定(保持确定性:同一天重开 app 是同一条)。「换一条」= 域内次高 → 耗尽后换域。

### 1.1 need(fact, user) — 新东西,V1 这样落地

**入库时**(不是运行时)给每条内容打「相关标签」:ingest 管线里加一次 LLM 批量调用,输出:

```
relevance_tags: {
  contexts:   ["professional","student","homemaker","parent"],  # 对谁有用
  utility:    "conversation" | "decision" | "self",             # 用处类型:谈资/帮判断/自我理解
  timeliness: "evergreen" | "recent" | "breaking"               # 时效
}
```

**运行时**用户侧免费:画像里已有 occupation(reader type)、workday(工作质地)、ageRange、readingStyle。匹配规则(纯查表,无 LLM):

```
need = 0.4                                  # 保底:任何人对任何事实的基础兴趣
     + 0.3 × context_match                  # 内容 contexts 含用户 reader type
     + 0.2 × utility_match                  # social_currency 口味 ↔ conversation;depth ↔ decision/self
     + 0.1 × timeliness_match               # readingMoment=缝隙 ↔ 短平快;professional ↔ recent
```

保底 0.4 是刻意的:**Need 圆不能变成过滤器**——章鱼三颗心脏对谁都没"用",但它正是产品灵魂;它靠 want 和 have 得高分,need 只是不拖后腿。

### 1.2 have(fact) — 质量分,入库时一次算好

```
have = 0.35 × source_tier      # arXiv/OpenAlex 论文=1.0,OWID=0.9,APOD=0.85,Wikidata=0.8,wiki 现场=0.6
     + 0.35 × hook_strength    # LLM 给 hook 打"停下来指数" 0-1(批量,入库时)
     + 0.20 × freshness        # 时效衰减:breaking 全额,recent 半年线性衰减,evergreen 恒 0.7
     + 0.10 × structure        # 有数字 +,有对比 +(正则即可)
```

### 1.3 探索保险丝(防信息茧房)

每 7 天中固定 1 天(hash(userId+week)决定是周几)是**野牌日**:域从用户权重为 0 的域里选,域内仍按 need×have 排序——"你没说想看,但这条真的好"。这是把测验里野牌轮的哲学搬进日常。

---

## 2. 迭代闭环(V2,依赖已立项的隐式学习 P1)

行为信号 → 圆的更新:

| 信号 | 更新 |
|---|---|
| 换一条(软否决) | 该域 want ×0.97;该内容 tags 的 need 匹配项微降 |
| 翻面看理由 | need 打中(utility_match 权重上调) |
| 分享 | want 该域 +,have 该条的 hook_strength 佐证 + |
| 点来源链接 | depth 倾向 +(readingStyle 光谱位移) |
| 组件点开进 app | 整体参与度,不动圆 |

每周日重算一次 domainWeights(用户在雷达页看得到自己的圆在动——「你读什么,它就跟着变」从口号变机制)。用户手调的权重永远是**硬覆盖**(手动 > 学习)。

## 3. 度量(没有度量就没有迭代)

北极星:**翻面率**(看了"寄给你的理由"= need 圆打中)。辅助:分享率(want+have 双打中)、换一条率(错配率,应下降)、组件→app 打开率。全部进 user_events 表(隐式学习 P1 的同一张表,一份工两用)。

## 4. 实施切分

| 步骤 | 内容 | 规模 |
|---|---|---|
| A1 | ingest 管线加 relevance_tags + hook_strength 批量打分;存 papers.metadata;跑存量 396 条回填 | 1 个 agent,半天 |
| A2 | factService:域内选择从纯 hash 改为 need×have 排序 + 确定性 tie-break;换一条=次高 | 1 个 agent,半天 |
| A3 | 野牌日 + 度量事件埋点(user_events) | 1 个 agent,半天 |
| V2 | 周度权重重算(隐式学习 P1) | 后续 |

风险与握手:标签是 LLM 打的,单条会有错(P8 软推断哲学同样适用——70-80% 够,乘法模型下单条错标只影响单条排序);need 保底 0.4 保证错标不毁掉好内容。

## 5. 要你拍板的

1. 乘法模型 + need 保底 0.4 的哲学 OK?(备选:加权求和,更平滑但会出现"很有用但完全不想看"的推荐)
2. 野牌日每周 1 天的频率?(0 = 不要探索,2 = 更激进)
3. A1-A3 按顺序开工?
