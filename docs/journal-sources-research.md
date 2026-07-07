# 学术期刊来源研究：标题 + 摘要的版权与合法接入

> **面向**：Ohlo 产品决策层
> **调研日期**：2026-07-06
> **核心问题**：能否合法获取 Nature、Science、Cell、NEJM、The Lancet 等顶级期刊的标题 + 摘要，并用于"提炼事实 → 用自己的话重述 → 附上 citation"的产品流程？

---

## TL;DR — 能不能用（一句话结论）

**可以用，但要分层处理**：文章标题可以完全自由使用；摘要文字本身属于出版商版权，但你的用法——读取摘要 → LLM 提取事实 → 用自己的话重述 → 附 DOI 链接——法律上是站得住脚的，因为你用的是摘要里的"事实"而非"表达"。关键约束是：**绝对不能把摘要原文存入数据库或展示给用户**。

---

## 一、版权分层：标题 vs 摘要 vs 全文

| 内容层级 | 版权状态 | 对 Ohlo 的含义 |
|---|---|---|
| **文章标题** | 通常不受版权保护（太短、属事实性描述） | 可以自由使用、展示、存储 |
| **摘要文字** | 受出版商版权保护，即使通过 API 获取也是 | 不能原文存储或展示；读取后提取事实可以 |
| **全文** | 明确受版权保护 | 不可使用，除非 open access 且有许可 |
| **书目元数据**（DOI、作者、期刊、日期） | 视为事实，不受版权，CC0 可用 | 可以完全自由使用 |

**关键法律原理**：版权保护的是"表达"，不保护"事实"和"思想"。一篇文章里"某药物在试验中使死亡率降低了 23%"这个事实，任何人都可以用自己的语言报道——这就是新闻报道和学术综述的法律基础，Ohlo 的用法属于同一类别。

---

## 二、可用 API 对照表

| API 来源 | 有摘要？ | 覆盖 Nature/Science 类？ | License | Ohlo 能否用？ |
|---|---|---|---|---|
| **Crossref** (`api.crossref.org`) | 部分有（约占总库 52%） | Nature 仅限 CC BY open access 文章；Elsevier 完全没有 | 元数据：CC0；摘要：出版商版权 | 元数据：✅ 自由用；摘要：仅 OA 文章安全 |
| **OpenAlex** (`openalex.org`) | 以倒排索引形式存储 | Springer Nature 非 OA 摘要已于 2022 年 11 月下线；Elsevier 非 OA 于 2024 年 11 月下线 | 平台数据 CC0，但主要商业期刊摘要已被移除 | 元数据：✅；顶刊摘要：⚠️ 覆盖大幅下降 |
| **Semantic Scholar** (`api.semanticscholar.org`) | ✅ 覆盖率 ~90% | 好，生物医学 + 多学科 | **非商业限制**（standard API 明确限定 non-commercial） | ❌ 商业 app 需单独谈判许可证 |
| **PubMed / NCBI E-utilities** (`eutils.ncbi.nlm.nih.gov`) | ✅ 生物医学摘要 | ✅ NEJM、Lancet、Cell、Nature Medicine 均索引 | NLM 不主张版权；摘要版权归各出版商 | ⚠️ API 免费开放；摘要"临时读取+提炼事实"可以，不能存储展示 |
| **Europe PMC** (`europepmc.org/RestfulWebService`) | ✅ 含摘要及全文链接 | 生物医学为主（NEJM、Lancet、Cell、Nature Med） | 开放获取内容免费；闭合文章依各刊许可 | ⚠️ OA 文章：✅；闭合文章：同 PubMed 处理 |
| **Nature/Science RSS feeds** (`nature.com/nature.rss`) | 通常包含摘要片段 | 直接来源 | Nature 服务条款：个人阅读用途 | ❌ 商业 app 风险高，未经明确授权 |
| **Unpaywall / DOAJ** | 不直接提供摘要 | 仅 OA 子集 | 取决于各文章许可 | 作为 OA 文章发现工具可用，但非摘要来源 |

---

## 三、关键细节：出版商是否向 Crossref 存入摘要？

这是最容易被误解的地方，逐一说明：

**Springer Nature（Nature 系列刊物）**
- 仅对 **CC BY open access** 文章存入 Crossref 摘要
- 订阅制文章（Nature、Nature Physics、Nature Chemistry 等旗舰刊的大多数内容）**不在其中**
- OpenAlex 已于 2022 年 11 月移除所有非 OA Springer Nature 摘要（原因：来自 Microsoft Academic Graph 的摘要缺乏开放许可）

**Elsevier（Cell、The Lancet）**
- **完全不向 Crossref 存入摘要**（截至 2024 年为止，ACS、IEEE、Taylor & Francis 亦如此）
- Elsevier 于 2024 年 11 月要求 OpenAlex 移除非 OA 文章摘要，导致约 1,100 万条摘要消失

**AAAS（Science）**
- 未加入 I4OA（Initiative for Open Abstracts）；Crossref 和 OpenAlex 的摘要覆盖率低

**NEJM / The Lancet**
- PubMed 收录并可通过 E-utilities 返回摘要
- NEJM 明确声明商业机构**重新发布或分发内容需要获得许可**
- Lancet（Elsevier 旗下）要求"以原始形式转载"

**结论**：这五家期刊的摘要，通过 Crossref/OpenAlex 大量获取**几乎不可行**；通过 PubMed 可以临时读取，但不能存储或展示原文。

---

## 四、推荐的合法接入方式

### 核心原则：临时读取 → 不存储 → 不展示

**Pattern（所有顶刊通用）：**

```
API 返回摘要原文（临时，内存中）
    ↓
LLM 提取核心事实（单条科学发现）
    ↓
LLM 用不同措辞重新表达（Ohlo 的语言风格）
    ↓
输出：重述后的事实 + DOI 链接 + 期刊名 + 作者
    ↓
摘要原文不落库、不展示
```

### 各类内容推荐 API 端点

**生物医学内容（NEJM、Lancet、Cell、Nature Medicine）**

```
PubMed EFetch:
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
  ?db=pubmed&id={PMID}&retmode=xml&rettype=abstract

或用 ESearch + EFetch 组合按 DOI 查询:
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed&term={DOI}[doi]&retmode=json
```
- 速率限制：无 API Key 时每秒 3 次；注册 API Key 后每秒 10 次（免费）
- NLM 无版权主张；读取后提炼不展示原文，风险极低

**物理/化学/跨学科（Nature、Science 的 OA 文章）**

```
Crossref REST API:
GET https://api.crossref.org/works/{DOI}
```
- 元数据（标题、作者、DOI）：CC0，完全自由
- 摘要字段：仅当出版商主动存入时才有，且限 CC BY OA 文章
- Polite Pool：请求头加 `User-Agent: Ohlo/1.0 (mailto:your@email.com)` 获得更高速率

**发现 OA 全文（可用于 OA 文章的完整摘要）**

```
OpenAlex Works API:
GET https://api.openalex.org/works/{DOI}
```
- 关注 `abstract_inverted_index` 字段（需客户端重建为文本）
- CC0 平台数据；但注意 Springer Nature / Elsevier 非 OA 摘要已移除
- 仍适合发现 OA 文章及其元数据

**Europe PMC（生物医学补充来源）**

```
GET https://www.ebi.ac.uk/europepmc/webservices/rest/search
  ?query={DOI}&resulttype=core&format=json
```
- `abstractText` 字段可用
- 偏重 open access；闭合文章同 PubMed 处理原则

### 明确的"不能做"清单

| 禁止行为 | 原因 |
|---|---|
| 将摘要原文存入数据库（哪怕加密）| 构成版权作品的复制存储 |
| 在 app 界面展示摘要原文给用户 | 公开传播版权内容 |
| 对 Semantic Scholar API 进行商业调用（未签商业许可） | 违反其标准 API 协议，明确禁止 |
| 抓取 Nature.com / Science.org RSS 并存储摘要 | 超出 ToS 允许的个人阅读范围 |
| 构建可搜索的摘要索引（即使内部使用）| 创建版权作品的二次数据库 |
| 批量下载摘要用于训练自有 AI 模型 | 明确版权侵权风险 |
| 直接重述但保留大量原文措辞 | 可能被认定为"实质性相似"侵权 |

---

## 五、风险评估

### 整体风险：**低到中**（在正确操作前提下）

**低风险 ✅**
- 临时 API 读取摘要 → LLM 提炼 → 输出重述句子 + DOI → 摘要文本不落地
- 使用书目元数据（标题、作者、DOI、期刊名）—— 这是事实，无版权
- 引用 DOI 链接指向原文 —— 鼓励而非替代访问原始内容

**中等风险 ⚠️（需要注意）**
- 出于性能对摘要文本短暂缓存（建议设置极短 TTL，如 1 小时内，并记录为"处理管道中间数据"而非"存储"）
- NEJM / Lancet 对"商业再分发"的定义较宽，需确保 app 仅输出重述内容，绝不展示原文

**高风险 ❌（不要做）**
- 使用 Semantic Scholar API 不签商业协议
- 抓取或展示 Nature/Science 摘要原文
- 构建摘要库作为产品核心资产

### App Store / 平台下架风险

**极低**：App Store 审核关注的是 app 展示给用户的内容。只要：
1. 用户界面展示的是 Ohlo 自己的重述文字
2. 有引用 attribution（期刊名 + DOI 链接）
3. 不展示原始摘要文字

就不会触发 App Store 版权投诉。出版商的维权重点是转载原文或构建替代阅读体验，而非"基于事实的独立报道"。

### 历史参照

学术新闻报道（Quanta Magazine、The Scientist、ScienceAlert）每天都在做同样的事：读论文 → 提炼核心发现 → 用自己的语言报道 → 给出 citation。这是明确受法律保护的新闻/教育用途。Ohlo 的模式本质上是相同的，只是自动化了。

---

## 六、Sources（来源链接）

- [Crossref Open Abstracts Status Blog](https://www.crossref.org/blog/open-abstracts-where-are-we/)
- [Crossref REST API Documentation](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
- [Sesame Open Science: More open abstracts? (Nov 2024)](https://bmkramer.github.io/SesameOpenScience_site/thought/202411_open_abstracts/)
- [Semantic Scholar API License Agreement](https://www.semanticscholar.org/product/api/license)
- [OpenAlex Developers Documentation](https://developers.openalex.org/)
- [OpenAlex Wikipedia Entry](https://en.wikipedia.org/wiki/OpenAlex)
- [OpenAlex — Springer Nature Missing Abstracts (Google Groups)](https://groups.google.com/g/openalex-users/c/ptFDD7qWvYw)
- [NCBI Website and Data Usage Policies](https://www.ncbi.nlm.nih.gov/home/about/policies/)
- [PubMed Central Copyright Notice](https://pmc.ncbi.nlm.nih.gov/about/copyright/)
- [I4OA Initiative for Open Abstracts](https://i4oa.org/)
- [Europe PMC RESTful Web Service](https://europepmc.org/RestfulWebService)
- [Springer Nature Permissions Requests](https://support.springernature.com/en/support/solutions/articles/6000085109-permissions-requests)
- [NEJM Permissions](https://www.nejm.org/about-nejm/permissions)
- [Research Paper APIs for Scientific Literature 2026 (IntuitionLabs)](https://intuitionlabs.ai/articles/research-paper-apis-scientific-literature)
- [Frontiers AI: Copyright Frameworks for LLMs on Scientific Literature (2026)](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1781692/full)
- [Publishers Close Access to Abstracts Due to AI Incentives](https://librarylearningspace.com/publishers-close-access-to-scholarly-content-such-as-abstracts-due-to-ai-incentives/)
