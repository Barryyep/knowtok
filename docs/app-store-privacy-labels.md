# App Store 隐私"营养标签"填写清单

给创始人：在 App Store Connect → App Privacy 里逐项照抄即可。
每一项都对照过实际代码（2026-07-17，v0.5.1 代码库），不是拍脑袋填的。
如果以后加了新的数据收集（比如崩溃上报 SDK），要回来更新这份清单和线上标签。

## 第一问：Do you collect data from this app?

**答：Yes**（有账号系统和行为事件，必须选 Yes）。

## 逐类勾选

Apple 的定义里"收集"= 数据离开设备传到服务器。只在设备本地的不算。

### ✅ Contact Info → Email Address
- 收集吗：**Yes**（邮箱注册/登录；Apple 登录可能提供转发邮箱，同样算）
- Linked to the user's identity：**Yes**（邮箱就是账号标识）
- Used for tracking：**No**
- Purposes：**App Functionality** 只勾这一个

### ✅ Identifiers → User ID
- 收集吗：**Yes**（Supabase 账号 ID，所有画像/事件都挂在它下面）
- Linked to identity：**Yes**
- Used for tracking：**No**
- Purposes：**App Functionality**

### ✅ Usage Data → Product Interaction
- 收集吗：**Yes**（`user_events` 表：展示、换一条、翻面、分享、点出处，
  每条带 fact ID + 领域 + 日期，按 user_id 关联）
- Linked to identity：**Yes**
- Used for tracking：**No**
- Purposes：**App Functionality** + **Product Personalization** 两个都勾
  （周任务用这些事件重算兴趣权重，这就是 Personalization 的定义）

### ✅ Other Data → Other Data Types
- 收集吗：**Yes**（onboarding 画像：读者类型、阅读风格、好奇领域及权重、
  可选年龄段、内容语言，存在 `user_personas` 表）
- Linked to identity：**Yes**
- Used for tracking：**No**
- Purposes：**App Functionality** + **Product Personalization**

## 明确不勾的（有人会犹豫的项，附理由）

| 类别 | 不勾的理由 |
|---|---|
| Name | "怎么称呼你"收集的名字只存设备本地（AsyncStorage），不上传服务器——`buildPersonaUpsertPayload` 里没有 name 字段。Apple 定义里本地数据不算"收集" |
| Location | 完全不碰 |
| Diagnostics / Crash Data | App 里没有任何崩溃上报 SDK；TestFlight 的崩溃数据是 Apple 自己收的，官方明确说不用开发者申报 |
| Browsing / Search History | 无 |
| Purchases / Financial | 无内购无支付 |
| Photos / Contacts / Health | 无 |
| 任何 Tracking | 无广告、无跨公司追踪、无第三方分析 SDK（Vercel Analytics 只在 ohlo.app 网站上，App 标签只管 App 本身）——所以也**不需要 ATT 弹窗** |

## 最后一问：tracking

"Do you or your third-party partners use data for tracking?" → **No**。

---

## 顺手提醒：正式版审核前的其他硬性项

1. **App 内删除账号**（Guideline 5.1.1(v)）——还没做，已在开发任务清单里。
   没有这个功能，正式版审核基本必拒。做完前不要点提交。
2. **隐私政策 URL** → 填 `https://ohlo.app/privacy`（已上线，中英双语）。
3. **审核演示账号** → App Review Information 里填一个能直接登录、
   已完成 onboarding、能看到当日卡片的账号（`mobile/scripts/create-review-demo-account.mjs`）。
4. **出口合规** → `ITSAppUsesNonExemptEncryption=false` 已写在 app.json，
   每个 build 会自动带上，不用手动答题。
