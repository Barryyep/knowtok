# KnowTok Demo

React Native (Expo) 信息探索流 Demo：
- 类似短视频的纵向刷流
- 支持中文/英文 Wikipedia 随机词条
- Supabase 用户系统（邮箱+密码登录/注册）
- 每条内容支持三档标记：
  - `known` 已经知道（信息茧房内）
  - `curious` 不知道但好奇（后续多推）
  - `not_interested` 不知道且不感兴趣

## 1. 安装依赖

```bash
npm install
```

## 2. 配置 Supabase

已使用 `.env` 读取以下变量：

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

如需重建，可参考 `.env.example`。

## 3. 初始化数据库

在 Supabase Dashboard -> SQL Editor 执行：

`/Users/barry/Desktop/knowtok/supabase/schema.sql`

这个脚本会创建：
- `profiles`（语言偏好）
- `feed_votes`（三档内容标记）
- RLS 与 owner-only policies

## 4. 启动项目

```bash
npm run start -- --clear
```

然后在 Expo Go 打开，或按 `i` / `a` 启动模拟器。

## 5. 当前功能

- 邮箱 + 密码登录/注册
- 用户语言偏好持久化（`zh` / `en`）
- 根据语言从对应 Wikipedia 拉取词条
- 三档标记写入 Supabase，并在列表中显示当前状态
- 纵向分页滑动与自动加载下一批内容
