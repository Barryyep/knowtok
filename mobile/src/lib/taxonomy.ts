/**
 * The knowledge taxonomy — the CONTRACT between persona input and content
 * output. Every domain a user can be curious about must name the sources
 * able to supply it (input/output 信息面匹配). Onboarding's curiosity deck,
 * persona routing, and the ingest pipelines all key off this file.
 */
import type { AppLanguage } from "./types";

export type ContentSource = "papers" | "owid" | "wiki";

export interface Domain {
  id: string;
  zh: string;
  en: string;
  /** Sources that can genuinely supply this domain today. */
  sources: ContentSource[];
  /** Legacy papers.human_category values that map into this domain. */
  legacyCategories: string[];
}

export const DOMAINS: Domain[] = [
  { id: "tech_ai", zh: "科技与AI", en: "Tech & AI", sources: ["papers", "wiki"], legacyCategories: ["AI & Robots"] },
  { id: "space", zh: "宇宙与太空", en: "Space", sources: ["papers", "wiki"], legacyCategories: [] },
  { id: "health", zh: "健康与身体", en: "Health & Body", sources: ["owid", "wiki", "papers"], legacyCategories: ["Your Health"] },
  { id: "mind", zh: "心理与大脑", en: "Mind & Brain", sources: ["wiki", "owid"], legacyCategories: [] },
  { id: "money", zh: "财富与经济", en: "Money & Economics", sources: ["owid", "wiki", "papers"], legacyCategories: ["Your Money"] },
  { id: "food", zh: "食物与营养", en: "Food & Nutrition", sources: ["owid", "wiki", "papers"], legacyCategories: ["Your Food"] },
  { id: "climate", zh: "气候与地球", en: "Climate & Earth", sources: ["owid", "papers", "wiki"], legacyCategories: ["Climate"] },
  { id: "history", zh: "历史与文明", en: "History & Civilization", sources: ["wiki"], legacyCategories: [] },
  { id: "nature", zh: "自然与生物", en: "Nature & Life", sources: ["wiki", "owid"], legacyCategories: [] },
  { id: "society", zh: "社会与人性", en: "Society & People", sources: ["wiki", "owid"], legacyCategories: [] },
];

export function domainById(id: string): Domain | undefined {
  return DOMAINS.find((d) => d.id === id);
}

export function domainLabel(id: string, language: AppLanguage): string {
  const d = domainById(id);
  return d ? d[language] : id;
}

/** Map a legacy papers.human_category value to its domain id. */
export function domainForLegacyCategory(humanCategory: string): string | undefined {
  return DOMAINS.find((d) => d.legacyCategories.includes(humanCategory))?.id;
}

/**
 * The curiosity deck — real hooks shown during onboarding. The user taps
 * the ones that spark ("这条你会点开吗?"); selections become their declared
 * curiosity spot. Two per domain, bilingual, curated (no network needed).
 */
export interface Spark {
  domainId: string;
  zh: string;
  en: string;
}

export const SPARKS: Spark[] = [
  // tech_ai
  { domainId: "tech_ai", zh: "现在任何视频都能变成你可以走进去的3D场景。", en: "Any video can now become a 3D scene you can walk into." },
  { domainId: "tech_ai", zh: "ChatGPT上线5天用户破百万,Netflix达到同规模用了3.5年。", en: "ChatGPT hit 1 million users in 5 days; Netflix took 3.5 years to reach the same number." },
  { domainId: "tech_ai", zh: "一个AI能在多次更新中藏恶意代码,成功率超过65%。", en: "An AI can hide malicious code across updates with a 65% success rate." },
  { domainId: "tech_ai", zh: "AlphaFold在2022年预测了2亿个蛋白质结构,超过科学家50年的总和。", en: "AlphaFold predicted 200 million protein structures in 2022, more than scientists had mapped in the previous 50 years." },
  // space
  { domainId: "space", zh: "土星环宽逾7万公里,厚度却仅约100米。", en: "Saturn's rings span over 70,000 km but average only about 100 meters thick." },
  { domainId: "space", zh: "国际空间站的浓缩咖啡机,管路代码超过十万行。", en: "The ISS espresso machine runs on over 100,000 lines of code." },
  { domainId: "space", zh: "月球每年远离地球3.8厘米,自1969年起由激光测距持续确认。", en: "The Moon drifts 3.8 cm farther from Earth every year, confirmed by laser ranging since 1969." },
  { domainId: "space", zh: "太阳的半径,三百年来没有缩小过一毫米。", en: "The Sun's radius hasn't shrunk a millimeter in 300 years." },
  // health
  { domainId: "health", zh: "在乍得,每25个女孩中约有1人死于妊娠相关原因。", en: "In Chad, roughly 1 in 25 girls will die from pregnancy-related causes in her lifetime." },
  { domainId: "health", zh: "巴基斯坦的肥胖率,20年里翻了三倍。", en: "Obesity in Pakistan tripled in 20 years." },
  { domainId: "health", zh: "肺癌每年致死超过180万人,其中80%与吸烟直接相关。", en: "Lung cancer kills over 1.8 million people a year, about 80% of cases directly linked to smoking." },
  { domainId: "health", zh: "以前要10分钟的膝盖核磁,现在不到1分钟就能扫完。", en: "Knee MRIs that took 10 minutes now finish in under one." },
  // mind
  { domainId: "mind", zh: "已知道是假药,安慰剂依然能减轻真实的疼痛。", en: "Knowing a pill is a placebo doesn't stop it from relieving real pain." },
  { domainId: "mind", zh: "人对一张脸的信任判断,只需要0.1秒。", en: "Your brain judges whether to trust a face in 0.1 seconds." },
  { domainId: "mind", zh: "大脑仅占体重的2%,却消耗全身约20%的能量。", en: "The brain accounts for 2% of body weight but consumes about 20% of the body's energy." },
  { domainId: "mind", zh: "睡前刷手机的蓝光,会把褪黑素分泌推迟约一个半小时。", en: "Pre-sleep screen light delays melatonin by about 90 minutes." },
  // money
  { domainId: "money", zh: "塔吉克斯坦的汇款占该国GDP的48%。", en: "Remittances from abroad make up 48% of Tajikistan's entire GDP." },
  { domainId: "money", zh: "照明的价格,从1700年到今天下降了99.9%。", en: "The price of lighting has fallen 99.9% since 1700." },
  { domainId: "money", zh: "日本的平均工资自90年代末以来几乎没有涨过。", en: "Japan's average wages have barely risen since the late 1990s." },
  { domainId: "money", zh: "错误预测河流水量,曾让巴西电价上涨30%。", en: "Mispredicting river flow once pushed Brazil's power prices up 30%." },
  // food
  { domainId: "food", zh: "越南咖啡产量从1980年代的5000吨增到如今逾180万吨。", en: "Vietnam's coffee output grew from 5,000 tons in the 1980s to over 1.8 million tons today." },
  { domainId: "food", zh: "拿铁拉花的稳定性,主要取决于奶泡气泡的大小而不是手法。", en: "Latte art stability depends on bubble size, not barista technique." },
  { domainId: "food", zh: "欧洲人均乳制品消费量超过全球平均水平的2.5倍。", en: "Europeans consume more than 2.5 times more dairy per person than the global average." },
  { domainId: "food", zh: "印度的烟草使用率,本世纪已经减半。", en: "Tobacco use in India has halved this century." },
  // climate
  { domainId: "climate", zh: "全球水泥生产的碳排放,超过所有航空业的总和。", en: "Cement production emits more CO2 than all of aviation." },
  { domainId: "climate", zh: "去年中国新增的发电量,相当于德国全年的总发电量。", en: "China's electricity generation grew by more in one year than Germany produces in an entire year." },
  { domainId: "climate", zh: "全球燃油车销量在2017年达到峰值,之后开始下降。", en: "Global sales of combustion-engine cars peaked in 2017 and have been declining since." },
  { domainId: "climate", zh: "去掉卫星图像里的云层,地面变化检测准确率能提高30%。", en: "Removing clouds from satellite images boosts change detection by 30%." },
  // history
  { domainId: "history", zh: "克利奥帕特拉生活的年代,距登月比距建造大金字塔更近。", en: "Cleopatra's lifetime is closer to the Moon landing than to the construction of the Great Pyramid." },
  { domainId: "history", zh: "1918年流感疫情的死亡人数超过第一次世界大战。", en: "The 1918 influenza pandemic killed more people than the entire First World War." },
  { domainId: "history", zh: "罗马人用火山灰造的混凝土,泡在海水里反而越来越硬。", en: "Roman concrete made with volcanic ash gets harder in seawater." },
  { domainId: "history", zh: "1560年的一次日全食记录,至今还在帮科学家校准太阳模型。", en: "A 1560 eclipse record still helps calibrate solar models today." },
  // nature
  { domainId: "nature", zh: "古埃及墓穴中发现的3000年前蜂蜜,至今仍可食用。", en: "Honey found in 3,000-year-old Egyptian tombs is still edible." },
  { domainId: "nature", zh: "章鱼有三颗心脏,游泳时其中两颗会停跳。", en: "Octopuses have three hearts — two stop when they swim." },
  { domainId: "nature", zh: "全球超过三分之一的鱼类资源被过度捕捞,1970年代时仅为10%。", en: "More than a third of the world's fish stocks are now overfished, up from 10% in the 1970s." },
  { domainId: "nature", zh: "一棵成年橡树,一天能蒸腾掉约400升水。", en: "A mature oak transpires about 400 liters of water a day." },
  // society
  { domainId: "society", zh: "多个欧洲和东亚国家的死亡人数,已超过出生人数。", en: "In multiple countries across Europe and East Asia, deaths now outnumber births." },
  { domainId: "society", zh: "日本约有700万套空置房屋,占全国住宅总量的14%。", en: "Japan has around 7 million abandoned homes — about 14% of its entire housing stock." },
  { domainId: "society", zh: "当后来的评审改了报告,最初分析师的功劳常常被完全抹掉。", en: "When later reviewers edit a report, the first analyst's credit often vanishes." },
  { domainId: "society", zh: "建筑工地上,木工电工泥水等十余个工种各自独立互不统属。", en: "A construction site runs on a dozen independent trades, none in charge of the rest." },
];
