# 期刊管线 Plan —「大刊每日新流」
**日期:** 2026-07-06
**状态:** 待创始人过目,未实现
**前置:** docs/journal-sources-research.md(版权结论:API 读摘要→LLM 提炼→自述→附 DOI,合法)

---

## 0. 要解决的两个真问题

1. **内容池是静态的**(现在 412 条,每天净增≈0)——arXiv 每日在"原地打转",OWID/Wikidata 是一次性回填。有用户后会见底。
2. **想要大刊背书**——arXiv 是预印本(未经同行评审),来源印戳盖 "arXiv" 分量不足;盖 "The Lancet" / "Nature Medicine" 才有说服力。

一条 **PubMed 每日管线**同时解决这两个:PubMed 每天有海量真·新论文(按日期抓,不像 arXiv 榜单重复),且覆盖大量顶刊。

---

## 1. Nature 家族 & 我们要收哪些刊

PubMed 收生物医学+生命科学。按我们的 10 个 taxonomy 域,精选高影响期刊白名单:

| 我们的域 | 目标期刊(PubMed 里都有) |
|---|---|
| health 健康 | Nature Medicine, The Lancet, NEJM, BMJ, JAMA, Cell |
| mind 心理/大脑 | Nature Neuroscience, Nature Human Behaviour, Neuron |
| nature 自然/生物 | Nature, Nature Genetics, Nature Ecology & Evolution, Cell, PNAS |
| society 社会/人性 | Nature Human Behaviour, PNAS(社科部分), Lancet Public Health |
| climate 气候 | Nature Climate Change, Nature Sustainability |
| food 食物/营养 | Nature Food, Lancet(营养流行病学) |
| tech_ai / space / money / history | PubMed 覆盖弱 → 继续靠 arXiv(tech/space)、OWID(money)、Wikidata(history) |

**结论:PubMed 管线主攻 health/mind/nature/society/climate/food 六个域**——正好是我们目前偏弱、又最出"社交货币"型冷知识的领域。tech_ai/space 继续 arXiv,不重叠。

## 2. 管线架构(套用现有 ingest 模式)

新文件 `scripts/ingest-pubmed.ts`,和 ingest-owid/apod 一个套路:

```
① esearch:按 期刊 + 日期范围 查新论文
   GET eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
   term = ("Nature Medicine"[Journal] OR "Lancet"[Journal] OR ...) AND <昨天>[PDAT]
   → 返回一批 PMID
② efetch:批量取这些 PMID 的 标题 + 摘要 + 期刊名 + DOI + 日期
   GET .../efetch.fcgi?db=pubmed&id=<pmids>&rettype=abstract
③ 每篇:LLM 读摘要 → 提炼 ONE 可验证事实 → 用我们的话重述(zh+en, hook 规则 v5)
   → 判域(落到 health/mind/… 之一)
④ 入库 papers 表:
   source='pubmed', source_id=PMID, arxiv_id_base='pubmed-'+PMID,
   human_category=域id, hook_summary_*, abs_url='https://doi.org/'+DOI,
   metadata.venue=期刊名(来源印戳显示 "The Lancet" 这种),
   published_at=论文日期
   ⚠️ 绝不写入摘要原文;plain_summary 也是 LLM 自述,非摘要
⑤ 幂等:source_id(PMID)去重,重跑 0 新增
```

## 3. 版权合规(写进代码,硬约束)

- **只读不存**:摘要抓下来喂给 LLM,**用完即弃**,绝不写进 papers 表任何字段;LLM prompt 明确"提炼事实、用你自己的话、禁止复制摘要句子"(和 APOD 脚本同款版权注释)。
- **显示的永远是我们的重述 + 期刊 citation + DOI 链接**,用户点来源跳到官方页面(doi.org),我们不托管任何原文。
- 用 **PubMed E-utilities**(NLM 明确不主张元数据版权)+ 注册 **NCBI API Key**(每秒 10 次;不注册每秒 3 次),礼貌 sleep。
- 不碰:Semantic Scholar 商用、RSS 摘要、存/显示摘要原文。

## 4. 每日节奏 & 预算

- 每天 esearch 昨天发表的、白名单期刊里的新论文(通常几十到一两百篇)。
- 不必全要:按期刊影响力 + hook_strength 打分,**每天精选入库 ~10-20 条**(避免 LLM 成本失控 + 保持质量)。
- 接进 `.github/workflows/daily-ingest.yml`,排在 arXiv 之后。
- LLM 成本:每天 20 篇 ≈ 20 次调用,可忽略。

## 5. 顺带治本:修 arXiv 每日抓新

arXiv 现在抓固定榜单→天天 unchanged。改成按 `submittedDate` 倒序抓真正的新论文(而非 relevance 榜单),tech_ai/space 也能每天有新的。小改动,一起做。

## 6. 需要你拍板/知道的

1. **每天入库上限**:建议 15-20 条 PubMed + 修好的 arXiv 若干。太多 LLM 贵、也稀释质量。OK 吗?
2. **NCBI API Key**:和 NASA 一样免费(https://www.ncbi.nlm.nih.gov/account/ 注册后在 Settings 生成),放进 GitHub Secrets `NCBI_API_KEY`。不配也能跑(每秒 3 次,慢但够用)。要不要配?
3. **期刊白名单**:上面第 1 节的清单是我的初选,你可以加你特别想要的刊(比如某本你信任的)。
4. **先做哪个**:① 只做 PubMed;② PubMed + 修 arXiv 一起。建议 ②(治本)。

## 7. 一句话

PubMed 管线 = 每天稳定的大刊新流,盖 "Nature Medicine / The Lancet" 的来源印戳,合法(只提炼不复制),同时把 arXiv 的"原地打转"一起修了。这是让"每天一条"真正可持续的那块拼图。
