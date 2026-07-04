# KnowTok Daily — widget-first mobile app

每天一条来自**真实 arXiv 论文**的冷知识,附出处,为你个性化解读——显示在手机主屏/锁屏组件和手表表盘上,不用打开 app。
iOS + Android 一套代码(Expo / React Native),数据与账号和 knowtok 网页版共用同一个 Supabase。

## 架构

```
Supabase (与网页版共用: auth + papers + user_personas)
   │  登录用户直读 papers 表 (RLS), <1s
   ▼
每日一条: pickDailyPaper(userId, date) 确定性选取, 附 arXiv 出处
   │                          ┌──────────────────────────────┐
   ├─ 卡片立即渲染             │ whyCare("跟你有什么关系")      │
   │                          │ goodvision LLM 异步生成, 不阻塞 │
   ▼                          └──────────────────────────────┘
DailyFact {emoji, topic, fact, whyCare, source{arxivId,title,url}}
   │
   ├─ iOS: App Group → WidgetKit 组件 (主屏 small/medium + 锁屏)
   ├─ iOS → Watch: WatchConnectivity (modules/watch-sync) → 手表 app + 表盘复杂功能
   └─ Android: react-native-android-widget (后台每 30 分钟自查跨天)
```

**Loading 设计**:卡片内容来自数据库(亚秒级),先渲染;LLM 只写个性化的一句话,异步补上——UI 永远不等 LLM。

**多语言**:内容语言(中/英)独立于系统语言,存在画像里;论文的中英文 hook/摘要由主项目的 ingest 管线生成;UI 文案在 `src/i18n.ts`,默认跟随系统语言。

## 快速开始

```bash
cd mobile
npm install
cp .env.example .env   # 填 goodvision key + Supabase URL/anon key
```

原生组件不能跑在 Expo Go,必须 dev build:

```bash
npx expo run:ios       # 需要 Xcode; 真机加 --device 和 app.json 的 ios.appleTeamId
npx expo run:android   # 需要 Android SDK
```

手表(模拟器):

```bash
# 配对手表模拟器后,手表 app 内嵌在 iOS app 的 Watch/ 目录里:
xcrun simctl install <watch-udid> ios/build/.../KnowTokDaily.app/Watch/KnowTokWatch.app
```

⚠️ 不要用 `CODE_SIGNING_ALLOWED=NO` 手动 xcodebuild——会丢 entitlements,App Group 会被系统移除,组件读不到数据。

## 目录结构

```
mobile/
├── App.tsx                     # 登录态 → 画像引导 → Tab 导航(今日/历史/设置)
├── src/
│   ├── lib/
│   │   ├── supabase.ts         # 与网页版同一项目 (auth 共享账号)
│   │   ├── paperService.ts     # 候选论文查询 + 确定性每日选取
│   │   ├── factService.ts      # 快路径取当日 fact + 异步 whyCare
│   │   ├── personaService.ts   # user_personas 双向同步
│   │   ├── goodvision.ts       # Anthropic 兼容网关客户端
│   │   ├── prompt.ts           # whyCare 一句话 prompt (纯文本, 无 JSON 解析风险)
│   │   ├── storage.ts          # AsyncStorage + iOS App Group + 手表同步
│   │   └── watchSync.ts        # WatchConnectivity JS 侧
│   ├── screens/                # Auth / Profile / Today / History / Settings
│   ├── components/FactCard.tsx # 冷知识卡片 (含出处 + arXiv 链接)
│   └── widgets/                # Android 组件 UI + 后台任务
├── modules/watch-sync/         # 本地 Expo 原生模块 (WCSession)
├── targets/
│   ├── widget/                 # iOS 主屏+锁屏组件 (SwiftUI)
│   ├── watch/                  # watchOS app (接收手机同步的 fact)
│   └── watch-widget/           # 表盘复杂功能 (inline/rectangular/circular/corner)
└── scripts/smoke-goodvision.mjs
```

## 环境变量(.env, 已 gitignore)

| 变量 | 说明 |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | 与网页版相同的项目 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key(RLS 管权限,可进客户端) |
| `EXPO_PUBLIC_GOODVISION_API_KEY` | goodvision key;公开发布前必须挪到服务端 |
| `EXPO_PUBLIC_GOODVISION_MODEL` | 默认 `claude-sonnet-4-6`(无 fable-5) |

## 已知限制 / 下一步

- iOS 组件跨天刷新依赖打开 app(V2:background task / 推送);安卓组件后台自刷新。
- Supabase 免费档不活跃会暂停项目 → DNS 失效,登录和数据都会挂,去 dashboard Restore。
- whyCare 的 LLM 调用在客户端(key 在 bundle 里)——上线前挪到服务端(可复用主项目 impact API)。
- 手表复杂功能的数据依赖 iPhone app 至少打开过一次(WatchConnectivity 推送)。
