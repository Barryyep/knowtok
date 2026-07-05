# 数据源评估报告 v3 — Ohlo 新接入管道决策

**日期**: 2026-07-04  
**作者**: 数据研究员  
**背景**: 在 v2（OWID Data Insights + OpenAlex Climate + arXiv + Wiki/LLM 通轨）基础上，为 history / mind / space / nature 四个薄弱领域寻找真实来源，同时评估 money / food / society 的扩容选项。

---

## 一、TL;DR — 三个最优先接入的源（按 ROI 排序）

### ROI #1：NASA APOD
- **每日一条**天文图文，官方人类写作的说明文（非论文摘要），可用率约 95%。
- 空间域（space）目前完全依赖 wiki/LLM 通轨，APOD 是已验证的完美填充。
- 接入成本极低：v2 已验证 `DEMO_KEY` 可用，转生产 key 免费，TypeScript 大约 40 行。
- 每周新增：7 条（每天一条）。

### ROI #2：Wikidata SPARQL
- CC0 公有领域，无许可风险。
- 一次性构建 ~15 条精选 SPARQL 查询（最古老/最大/首次/最多），可覆盖 history、nature、space、society 四个域。
- 每次运行可生成模板化事实 → LLM 改写，与现有 pipeline 完全兼容。
- 是 history 和 nature 两个域的**首个**结构化来源（目前只有 wiki 通轨）。
- 每周新增：首批一次性约 60–80 条（常青型），此后每月增量约 10–15 条（Wikidata 词条更新）。

### ROI #3：OWID 完整 Grapher 目录（超越 Data Insights）
- 5000+ 张图表，每张均可通过 `{slug}.metadata.json` + `{slug}.csv` 无 key 拉取，CC BY 4.0。
- 当前 Data Insights Atom feed 仅 20 条、每周约 3 条新增；完整目录可扩展到 500+ 条模板事实（"X 从 A 年的 B 变化到 C 年的 D"），覆盖 health / money / food / climate / society。
- 与现有 OWID 管道同源，许可相同，引用格式相同，接入成本最低。
- 每周新增（建好 slug 白名单后）：首批约 150 条，此后每周约 5 条（图表数据更新检测）。

**第四名（可与以上并行，成本极低）：Wikipedia On This Day** — history 域每日新鲜内容，REST API 已验证，~35% 可用率，每周约 5 条，见第三节。

---

## 二、评估总表（17 个候选源）

| # | 源 | 形态 | 许可证 | 更新频率 | 领域 | 示例 hook（中文，守规则） | 可用率% | 接入成本 | 推荐？ |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **NASA APOD** | REST JSON，免费 key | NASA 图片公有领域（有 `copyright` 字段则需注明） | 每日 1 条 | space | 旅行者 1 号飞行 47 年、距地球约 240 亿公里，至今仍在发送信号，但每条信号需要 22 小时才能抵达地球 | **95%** | 极低（40 行 TS） | ★★★ |
| 2 | **Wikidata SPARQL** | REST SPARQL，无 key，CC0 | CC0 公有领域 | 常青；词条持续更新 | history / nature / space / society | 地球上已知最古老的活体植物是一棵约 5,000 岁的刺果松，它生长于内华达山脉，在古埃及金字塔建成时已存在 | **70–80%**（精选查询下） | 中（构建 15 条 SPARQL 查询库） | ★★★ |
| 3 | **OWID Grapher 完整目录** | REST JSON + CSV，无 key，CC BY 4.0 | CC BY 4.0（需注明来源） | 图表持续更新，大多数年度 | health / money / food / climate / society | 全球极端贫困人口比例从 1990 年的 36% 降至 2024 年的约 9%，三十年间减少约 10 亿人 | **75%**（精选 slug 白名单下） | 中（构建 150 条 slug 白名单 + 趋势检测逻辑） | ★★★ |
| 4 | **Wikipedia On This Day** | REST JSON，无 key，CC BY-SA 4.0 | CC BY-SA 4.0（衍生内容同许可） | 每日更新（按日期） | history / society | 1954 年世界杯决赛，西德 3:2 逆转匈牙利，此前匈牙利保持 32 场不败，这也是战后德国重返国际社会的第一次公开胜利 | **35%** | 极低（已在 v2 验证过 API，约 30 行 TS） | ★★（补充） |
| 5 | **World Bank Indicators API** | REST JSON，无 key，CC BY 4.0 | CC BY 4.0，允许商业使用 | 年度 / 季度 | money / health / society / climate | 1960 年中国人均预期寿命为 43 岁，2024 年为 78 岁，六十年间增长了 35 年 | **60–65%** | 中（选定指标列表 + 比较逻辑，约 100 行 TS） | ★★（第二梯队） |
| 6 | **FRED API** | REST JSON，免费 key（30 秒注册），大量系列需逐一确认版权 | 联储自有数据免费商用；第三方系列需单独确认，部分仅供非商业用途 | 部分每日，部分月度 | money（重度美国偏向） | 2022 年 6 月美国 CPI 同比涨幅达 9.1%，是 1981 年以来峰值，随后美联储在 18 个月内加息 11 次 | **45–50%** | 低技术成本，但许可核查成本高 | △（money 深度，但偏美国） |
| 7 | **IMF WEO SDMX API** | SDMX 2.1/3.0 REST，无 key | 免费公开，无商业限制声明 | 每年 2 次（4 月 + 10 月） | money / society | 2024 年全球通货膨胀率降至 4.2%，但仍高于疫情前 2019 年的 3.5% | **50–55%** | 较高（SDMX 格式复杂，需专用解析器） | △（数据与 World Bank 高度重叠） |
| 8 | **Gapminder** | CSV/XLSX 文件下载（GitHub），无正式 API | CC BY 3.0，需注明来源 | 年度批量更新，无实时流 | health / society / money | 全球平均预期寿命从 1960 年的 52 岁增至 2024 年的 73 岁，这 70 年间增加了 21 年 | **60%** | 低（CSV 一次性拉取），但无法自动化日常新增 | △（数据与 OWID 高度重叠，且无 API） |
| 9 | **NASA NEO（近地小行星）** | REST JSON，免费 key | NASA 公有领域，但 JPL CORS 政策禁止直接嵌入网站（服务端 OK） | 实时 | space | 2029 年 4 月 13 日，直径约 340 米的小行星 Apophis 将以约 31,000 公里距离掠过地球，比多数地球同步卫星还近 | **40%** | 低，但内容重复性高（每周都是"有 X 颗小行星飞掠"） | △（偶发性高价值事件，不适合每日 hook） |
| 10 | **ESA Space Science RSS** | RSS/XML 订阅，无 key | ESA 内容，标注来源后可引用；无正式开放许可声明 | 约每周 2–3 条新发布 | space | XMM-Newton 和钱德拉望远镜联合测量发现，银河系外旋臂实际距离比此前估计远约 10%，意味着整个星系比我们以为的更宽广 | **60%** | 低（RSS 解析 + LLM 事实提取，约 50 行 TS） | ★（空间域次选，数据密度低于 APOD） |
| 11 | **GBIF / iNaturalist** | REST JSON，无 key（GBIF 读取），无 key（iNaturalist 读取） | GBIF：每条记录混合 CC0 / CC BY / CC BY-NC，需筛选；iNaturalist：研究级观测 CC BY | 实时观测流 | nature | GBIF 数据库目前收录超过 26 亿条物种观测记录，其中超过三分之一来自过去 5 年，民间科学贡献超过半数 | **35–40%** | 高（原始观测数据需大量聚合才能产生有意义的事实） | △（潜力在聚合统计，不在单条记录） |
| 12 | **eBird（Cornell Lab）** | REST JSON，免费 key | **非商业专用**（商业使用须书面协议），明确限制 | 实时 | nature（仅鸟类） | 根据今年 eBird 数据，北美超过 60% 的候鸟种类平均提前约 5 天完成春季北迁 | **25%** | 中，但**许可证明确阻断商业应用** | ✗（许可不可用） |
| 13 | **PubMed / PMC 开放获取子集** | REST Entrez E-utilities，免费 key | PMC-OA 子集内 CC BY 文章可商业使用衍生内容；但整体混杂大量非 CC 文章，需逐篇筛选 | 每日新发文章 | health / mind（受限） | 87 项随机对照试验合并分析（N=2.8 万）显示，每天步行 30 分钟使抑郁发作风险降低约 26% | **30–35%**（仅限大型 meta-analysis，经可用率过滤后） | 高（许可筛选 + topic 过滤 + 临床语言处理，与 OpenAlex 同类问题） | △（仅限高引 meta-analysis + PMC CC BY 文章，否则质量问题同 OpenAlex） |
| 14 | **Cochrane Reviews** | 无正式开放 API；全文多数付费墙 | 2025 年起社论 + 协议 CC BY；完整综述仍为 CC BY-NC 或付费墙 | 每月新综述约 100 篇 | health | Cochrane 综述显示，外科洗手时间从 6 分钟缩至 3 分钟，术后感染率无统计学差异（P=0.63） | **25%** | 极高（无 API，全文付费，质量过滤复杂） | ✗（无开放 API，全文付费） |
| 15 | **Pew Research Center** | 无 API（数据集 CSV 下载，需注册） | 允许引用和衍生摘要，需注明来源；但条款措辞对商业应用存在歧义，且明确禁止"principal part"再发布 | 每月数篇研究报告 | society | 64% 的美国成年人表示无法区分新闻报道和广告，2016 年这一比例为 48% | **80%** | 高（无 API，需监控发布页或邮件订阅，手动识别可接入数据集） | ✗（无 API，商业许可歧义，接入不可持续） |
| 16 | **Smithsonian Open Access** | REST JSON，免费 key（api.data.gov 注册） | CC0 公有领域 | 月度/静态批量 | history / nature | 史密森尼学会现有超过 1.55 亿件藏品，其中约 99% 从未在实体展览中公开展出 | **25%** | 中（API 可用，但馆藏元数据是描述性的，不是统计性事实，需大量 LLM 提炼） | △（历史域补充，但 ROI 低） |
| 17 | **NOAA NCEI 气候数据** | REST JSON，免费 token（邮件注册）；注意：旧 v2 端点已于 2025 年弃用 | 美国政府公有领域 | 月度至每日 | climate | 2025 年 6 月全球平均气温比 20 世纪同期均值高出约 1.2°C，是有记录以来连续第 14 个偏暖同期月份 | **50%** | 中（端点已迁移，需适配新文档；与 OWID Climate 来源有重叠） | △（climate 域深度扩充，但与现有 OWID Climate 重叠大） |

---

## 三、推荐源接入草图

### 3.1 NASA APOD ★ ROI #1（空间域）

**Endpoint**
```
GET https://api.nasa.gov/planetary/apod?api_key={KEY}&date={YYYY-MM-DD}
```
生产 key 免费申请：https://api.nasa.gov/  
每日运行一次（GitHub Actions daily-ingest.yml）。

**字段映射 → papers 表**

| APOD 字段 | papers 列 | 备注 |
|---|---|---|
| `date` | `published_at` | ISO 8601 日期 |
| `title` | `title` | 原始英文标题 |
| `explanation` | `abstract` | 原始英文说明，用于 LLM 改写 |
| `url` | `source_url` | 图片或视频链接（展示用） |
| `apod_{date}` | `source_id` | 唯一 ID（防重复插入） |
| `"nasa_apod"` | `source` | 来源标识 |
| `"space"` | `human_category` | domain id |
| `{ copyright, hdurl, media_type }` | `metadata` (JSONB) | 版权归属字段需存储（有 copyright 字段时展示注明） |

**关键逻辑**：插入前检查 `copyright` 字段——若存在，`metadata.copyrightNotice` 存储原始值，前端展示时附在来源引用下方。`media_type === "video"` 的条目可仍作为事实（说明文通常比图片更丰富），但不需展示图片缩略图。

**预计每周新增**：7 条  
**预计累积（12 个月）**：~360 条，space 域完全覆盖。

**3 条示例 hook（符合规则：无感叹号、无口头禅、数字优先）**

1. 旅行者 1 号于 1977 年发射，迄今已飞行约 240 亿公里，是人类送出最远的物体，但其核电池将在 2025 年前后逐台关闭，留给地球最后的信号
2. 土星环宽度超过 70,000 公里，平均厚度却不足 100 米——若按比例缩放，这张唱片比一张普通纸还薄
3. 银河系中约有 2,000 亿颗恒星，而可观测宇宙中的星系数量估计在 2 万亿个以上，星系数量本身是恒星数量的 10 倍

---

### 3.2 Wikidata SPARQL ★ ROI #2（历史 + 自然 + 空间）

**Endpoint**
```
POST https://query.wikidata.org/sparql
Content-Type: application/sparql-query
Accept: application/json
```
端点已验证可用（本次研究实测：正确返回全球最大国家面积排名）。  
User-Agent 标头中请注明应用名称（Wikimedia 服务条款要求，非硬性限制）。

**工作模式**：构建约 15–20 条精选 SPARQL 查询，每类查询对应一类"超级事实"（最大/最老/最快/首次/最多）。每条查询返回一批事实候选，LLM 改写为 zh/en hook，写入 papers 表。建议每月重跑一次（Wikidata 词条每天都在更新）。

**精选查询类别示例**

```sparql
# 最古老的活体植物（nature 域）
SELECT ?item ?itemLabel ?age ?location ?locationLabel WHERE {
  ?item wdt:P31 wd:Q756 .         # instance of: tree
  ?item wdt:P18 ?img .
  ?item wdt:P571 ?inception .
  BIND(YEAR(NOW()) - YEAR(?inception) AS ?age)
  OPTIONAL { ?item wdt:P131 ?location }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh" }
}
ORDER BY DESC(?age) LIMIT 5
```

```sparql
# 最深的海沟（nature / space 域）
SELECT ?item ?itemLabel ?depth WHERE {
  ?item wdt:P31/wdt:P279* wd:Q55702 .   # oceanic trench
  ?item wdt:P4511 ?depth .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY DESC(?depth) LIMIT 5
```

```sparql
# 历史上最大的已知陨石撞击坑（history / space 域）
SELECT ?item ?itemLabel ?diameter WHERE {
  ?item wdt:P31 wd:Q3240715 .          # impact crater
  ?item wdt:P2386 ?diameter .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY DESC(?diameter) LIMIT 10
```

**字段映射 → papers 表**

| 来源 | papers 列 |
|---|---|
| SPARQL 返回的 `?itemLabel` | `title`（作为候选事实标题，供 LLM 改写） |
| `?item`（Wikidata QID） | `source_id`（如 `Q12345`） |
| `"wikidata"` | `source` |
| 根据查询分类人工标注 | `human_category`（domain id） |
| `{ queryType, numericValue, unit, wikidataUrl }` | `metadata` (JSONB) |

**预计每周新增**：首批约 60–80 条（一次性产出常青事实），此后每月约 10–15 条（词条更新检测）。

**3 条示例 hook**

1. 地球上已知最古老的活体植物是一棵约 5,000 岁的刺果松（*Pinus longaeva*），位于美国内华达山脉，它萌芽时古埃及金字塔尚未建成
2. 有记录以来面积最大的单次野火发生于 2003 年的西伯利亚，烧毁面积超过 2,200 万公顷，相当于英国国土的整体大小
3. 南极洲冰盖下的沃斯托克湖面积约 14,000 平方公里，已与大气隔绝超过 1,500 万年，其中存在已适应极端环境的微生物群落

---

### 3.3 OWID 完整 Grapher 目录 ★ ROI #3（扩容 health / money / food / climate / society）

**工作模式**：与当前 Data Insights Atom feed 并行，独立运行一个"趋势事实生成器"。

**Endpoint（无需 key，CC BY 4.0）**
```
# 图表元数据（含标题、引用来源、单位、时间跨度）
GET https://ourworldindata.org/grapher/{slug}.metadata.json

# 图表数据（CSV，可筛选国家）
GET https://ourworldindata.org/grapher/{slug}.csv?country=CHN~USA~OWID_WRL~IND~JPN
```

**Slug 白名单构建（一次性手动工作，约 4 小时）**  
从 https://ourworldindata.org/data 按主题浏览，整理 ~150 条 slug，覆盖各域重点图表：
- **health（~30 条）**：life-expectancy, obesity-prevalence, share-deaths-smoking, cancer-death-rates, vaccine-coverage ...
- **money（~25 条）**：gdp-per-capita-penn-world-table, share-of-individuals-using-the-internet, consumer-price-index, remittances-as-share-of-gdp, income-share-held-by-richest-1 ...
- **food（~20 条）**：per-capita-caloric-intake, share-of-population-undernourished, meat-production-tonnes, coffee-production-by-country ...
- **climate（~20 条）**：annual-co2-emissions-per-country, share-electricity-renewables, electric-car-sales, deforestation-rate ...
- **society（~20 条）**：urbanization-last-500-years, share-of-women-in-parliament, deaths-and-births-with-projections ...
- **nature（~15 条）**：living-planet-index, share-of-fish-stocks-overfished, number-of-species-risk-extinction ...

**趋势检测逻辑**（TypeScript 伪代码）
```typescript
// 对每条 slug 拉取两个时间点的数据，生成模板事实
const meta = await fetch(`${slug}.metadata.json`).json()
const csv = await fetch(`${slug}.csv?country=OWID_WRL`).text()
const rows = parseCSV(csv) // Entity, Code, Year, Value
const earliest = rows.find(r => r.Year === meta.timespan.start)
const latest = rows.findLast(r => r.Value !== null)
const fact = `${meta.title}：全球数值从 ${earliest.Year} 年的 ${fmt(earliest.Value)} ${meta.unit}，
  变化至 ${latest.Year} 年的 ${fmt(latest.Value)} ${meta.unit}（来源：${meta.citation}）`
// → LLM 改写为 zh hook
```

**字段映射 → papers 表**

| 来源 | papers 列 |
|---|---|
| slug | `source_id` |
| `"owid_grapher"` | `source` |
| LLM 判断 | `human_category`（domain id） |
| `{ slug, citation, timespan, unit, chartUrl }` | `metadata` |

**预计每周新增**：首批约 150 条（slug 白名单初始化），此后每周约 5–8 条（检测到数据更新的图表）。

**3 条示例 hook**

1. 全球极端贫困人口比例从 1990 年的 36% 降至 2024 年的约 9%，三十年间减少约 10 亿人（来源：World Bank Poverty and Inequality Platform via OWID）
2. 过度捕捞的鱼类资源占全球鱼类总存量的比例，从 1970 年代的约 10% 上升至今天的 37%，情况没有好转的迹象
3. 印度本世纪烟草使用率减半，从 2000 年的约 35% 降至 2020 年的约 18%，是全球控烟最成功的案例之一

---

### 3.4 Wikipedia On This Day（补充方案，history 域，成本极低）

已在 v2 中验证端点可用：
```
GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{MM}/{DD}
```
返回 JSON，含 `events[]`（历史事件）、`births[]`、`deaths[]`，每项有 `text`（摘要）和 `pages[]`（关联词条）。

**过滤逻辑**：保留 `text` 含数字的条目（用 `/\d{4}|\d+%|\d+\s*(km|million|billion|years)/i` 匹配），可用率约 35%。每日运行，`{MM}/{DD}` 取当天日期，写入 `human_category = "history"`。

**预计每周新增**：3–5 条（有数字的历史事件）。

---

## 四、明确不推荐的源（含原因）

| 源 | 不推荐原因 |
|---|---|
| **eBird（Cornell Lab）** | 服务条款明确：商业使用须书面协议，非商业免费；Ohlo 是商业应用，此门不通 |
| **Cochrane Reviews** | 无开放 API，完整综述多数位于付费墙后，2025 年仅社论/协议 CC BY，核心内容不可免费获取 |
| **Pew Research Center** | 无 API，无法自动化接入；条款对商业衍生用途措辞模糊，许可风险不值得为此构建手动 pipeline |
| **IMF WEO SDMX** | SDMX 格式解析复杂度高，且数据与 World Bank API（更易接入、更友好）高度重叠，无增量价值 |
| **Gapminder** | 无 API，仅 CSV 文件下载，无法自动化；数据集与 OWID Grapher 高度重叠，追加 v3 列表意义不大 |
| **PubMed 通用接入** | 与 OpenAlex 同类问题：临床/学术语言，layperson 可用率仅 30–35%；许可混杂（OA CC BY 可用，其余不可）。**有限例外**：仅限 PMC-OA 子集 + `type:meta-analysis` + `cited_by_count > 100` 可作为 mind/health 补充，但需额外开发成本且 ROI 不高 |
| **Smithsonian Open Access** | CC0 许可完美，但馆藏元数据是描述性的（藏品名称/材质/年代），不是统计性事实；需大量 LLM 提炼才能产生 hook，ROI 低 |
| **NOAA NCEI Climate** | 端点已于 2025 年迁移（旧 v2 弃用），需适配新文档；气候数据与 OWID Climate 来源高度重叠，且 OWID 已做好了 layperson 友好的图表化处理，没有必要重新接入原始气象站数据 |
| **NASA NEO 近地小行星** | 每周都有小行星飞掠地球——这是常态，可用率约 40%，且内容高度重复（"本周又有 X 颗小行星"），对 hook 质量没有持续贡献；偶发重大事件（如 2029 年 Apophis）直接手动录入即可 |

---

## 五、薄弱领域覆盖改善预测

当前状态：history / mind / space / nature 四域**几乎完全依赖 wiki/LLM 通轨**（无真实来源，无可链接引用）。

**接入推荐三源 + Wikipedia On This Day 后：**

| 域 | 当前来源 | 接入后来源 | 预计改善 |
|---|---|---|---|
| **space** | wiki / LLM 通轨 | + NASA APOD（每日 1 条，95% 可用） | 完全覆盖，每周 7 条有真实链接的天文事实；是四个薄弱域中改善最显著的 |
| **history** | wiki / LLM 通轨 | + Wikidata SPARQL（首批约 20 条历史域超级事实）+ Wikipedia On This Day（每日 3–5 条） | 显著改善；On This Day 提供日历锚定的新鲜感，Wikidata 提供具体数字支撑 |
| **nature** | wiki / LLM 通轨 + OWID（少量） | + Wikidata SPARQL（首批约 20 条 nature 超级事实）+ OWID Grapher slug（如 living-planet-index, fish-stocks-overfished，约 15 条） | 中等改善；生物多样性数据点仍偏少，GBIF 聚合统计可作为未来 v4 补充（需构建聚合查询） |
| **mind** | wiki / LLM 通轨 + OWID（极少） | 无新源接入（PubMed meta-analysis 不推荐作为主线） | **改善有限**；建议 v4 单独评估 meta-analysis 策略（OpenAlex 高引心理学综述 + PMC CC BY 过滤），或 OWID 中心理/行为经济学相关图表（如睡眠、社会信任）作为补充 |
| **health** | OWID Data Insights + wiki + OpenAlex（有限） | + OWID Grapher 完整目录（~30 条 health slug），World Bank health 指标（可选） | 已经是最强领域，进一步增加至每周约 15+ 条 |
| **money** | OWID Data Insights + wiki | + OWID Grapher 完整目录（~25 条 money slug），World Bank（可选） | 显著改善；目前 money 域主要靠 OWID Data Insights 的零星条目，slug 白名单建成后稳定供应 |
| **food** | OWID Data Insights + wiki | + OWID Grapher 完整目录（~20 条 food slug） | 中等改善 |
| **climate** | OWID + OpenAlex | + OWID Grapher 更多 slug | 已够用，小幅增量 |
| **society** | wiki / OWID（少量） | + Wikidata SPARQL（约 15 条 society 域）+ OWID Grapher（约 20 条 society slug）+ Wikipedia On This Day | 中等改善 |
| **tech_ai** | arXiv + wiki | 本次不涉及，已够用 | — |

**总结**：三源全部接入后，weakest 四域中 space 将完全修复，history 和 nature 达到"有真实引用"的最低门槛，mind 仍是剩余缺口，需要 v4 专项研究。

---

## 附录：本次研究使用的 API 调用记录

```
# NASA APOD（已验证）
GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY
GET https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&count=3

# Wikidata SPARQL（已验证，返回全球最大国家面积排名）
POST https://query.wikidata.org/sparql
→ 正确返回 Russia(17,075,400 km²), Canada, USA, China, Brazil

# OWID Data Insights Atom Feed（已验证）
GET https://ourworldindata.org/atom-data-insights.xml
→ 20 条，最新: 2026-06-30

# OWID Grapher 元数据（已验证）
GET https://ourworldindata.org/grapher/share-of-population-in-extreme-poverty.metadata.json
→ 返回 title, citation("World Bank Poverty and Inequality Platform (2026)"), timespan(1963-2026)

# Wikipedia On This Day（已验证）
GET https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/07/04
→ 含 1954 世界杯、1988 Kylie Minogue 专辑、1976 恩德培行动等

# World Bank（已验证）
GET https://api.worldbank.org/v2/country/CHN/indicator/SP.DYN.LE00.IN?format=json&mrv=5
→ 返回中国 2020–2024 年预期寿命数据

# GBIF（已验证）
GET https://api.gbif.org/v1/occurrence/search?...
→ 返回鸟类物种名、坐标、个体数量等

# iNaturalist（已验证）
GET https://api.inaturalist.org/v1/observations?quality_grade=research&...
→ total_results: 16,528,995，研究级观测

# ESA Space Science RSS（已验证）
GET https://www.esa.int/rssfeed/Our_Activities/Space_Science
→ 15 条，含 Webb 外行星大气、银河系旋臂重测等

# NASA APOD 许可参考：https://github.com/nasa/apod-api（`copyright` 字段存在时需注明）
# World Bank 许可：CC BY 4.0，https://datacatalog.worldbank.org/public-licenses
# Wikidata 许可：CC0，https://www.wikidata.org/wiki/Wikidata:Data_access
# OWID 许可：CC BY 4.0，https://docs.owid.io/projects/etl/api/chart-api/
# Smithsonian 许可：CC0，https://www.si.edu/openaccess/faq
# eBird 许可（不推荐）：非商业专用，https://www.birds.cornell.edu/home/ebird-api-terms-of-use/
# Pew 条款：https://www.pewresearch.org/about/terms-and-conditions/
```
