# Ken-v3.1.0-YoutubeDataApiV3 commit 清单（中文）

> 用途：合并 `Ken-v3.1.0-YoutubeDataApiV3` 进 `Kelvin-v3.2.1-FinalMerge` 之前的人工审阅清单。
>
> Base：`main` → 列出 Ken 比 main 多的 18 个 commit（按时间顺序，旧 → 新）。
>
> 标记说明：
> - 🔴 **重叠**：你 v3.0.8 已经有同样内容（不同 SHA），merge 时大概率冲突
> - 🟡 **可能影响**：动了 v3.0.8 也碰过的文件，要看具体冲突
> - 🟢 **新内容**：Ken 独有，v3.0.8 没有
>
> 推荐冲突处理策略：🔴 → 保留 v3.0.8 版本；🟡 → 逐个看；🟢 → 接受 Ken 的改动。

---

## 1. `59996f0` — font text change 🟡
**时间**：2026-04-28 ｜ **改了 12 个文件，+334 / −246**

**做了什么**：全站字体/文字样式调整。批量调字号、行高、字体颜色等。重点改动：
- `app/dashboard/book/history/page.tsx` — 借阅历史页字体重排
- `app/dashboard/learning/linkedin/page.tsx` — LinkedIn Learning 页样式（**注意：后面 commit 把 linkedin 改名成 youtube 了**）
- `app/lib/learning/service.ts`、`app/lib/supabase/queries.ts` — 加了一些查询方法
- `app/ui/global.css`、`app/ui/theme/themeToggle.tsx` — 全局样式微调

**风险**：动了 v3.0.8 也改过的 `mobileNav.tsx`、`global.css`、`themeToggle.tsx` —— **可能冲突**。

**Kelvin的决定**:接受改动

---

## 2. `7a0f41c` — ui optimisze 🟡
**时间**：2026-04-28 ｜ **4 个文件，+24 / −10**

**做了什么**：小修小补的 UI 优化：
- `cameraScanner.tsx` — 相机扫码器小改
- `mobileNav.tsx` — 手机导航微调
- `themeProvider.tsx` — 主题 provider 改了几行
- `lib/barcodeScanner.ts` — 条码扫描器加了 2 行

**风险**：v3.0.8 的 `Kelvin-v3.0.5-CameraFix` 应该改过相机扫码——可能冲突。

**Kelvin的决定**:分析一下会不会影响到v3.0.5的相机代码

---

## 3. `55b7d63` — set limit of user borrow book amount 🔴
**时间**：2026-04-29 ｜ **3 个文件，+26 / −2**

**做了什么**：限制用户借书数量。
- `app/api/checkout/route.ts` — 加了 23 行借书数量上限检查
- `app/dashboard/actions.ts` — 改了 1 行
- `app/dashboard/loanPolicy.ts` — 改了 1 个常量

**🔴 重叠**：你 v3.0.8 里 `31278c4 set limit of user borrow book amount` 是同样的功能。
**建议**：**保留 v3.0.8 的版本**（你已经改过 `loanPolicy.ts`：`STUDENT_LOAN_LIMIT = 3`）。

**Kelvin的决定**:接受改动

---

## 4. `9756e37` — ui consistent 🟡
**时间**：2026-04-29 ｜ **7 个文件，+248 / −163**

**做了什么**：UI 一致性大调整：
- `app/profile/profileEditForm.tsx` — Profile 编辑表单大改（+237 行）
- `app/profile/profileAvatarForm.tsx`、`profileNameForm.tsx` — 头像/姓名表单微调
- `mobileNav.tsx` — 又改了一次
- `app/ui/dashboard/recommendations/recommendationLab.tsx` — 推荐页 UI 重排
- `sidenav.tsx` — 侧栏微调
- `tsconfig.tsbuildinfo` — 编译产物（**merge 时可以忽略，会自动重新生成**）

**风险**：v3.0.8 改过 `sidenav.tsx`（`427a49e` Swinburne logo 可点击）——**会冲突**。

**Kelvin的决定**:接受改动

---

## 5. `10867ea` — remove extra camera scan page, faq update 🔴
**时间**：2026-04-29 ｜ **5 个文件，+225 / −348**

**做了什么**：
- **删除** `app/dashboard/cameraScan/page.tsx`（283 行整页删除）
- 改 `app/dashboard/faq/page.tsx`（+39/-39）
- 改 `app/ui/dashboard/faqFloatingHelp.tsx`、`studentFaqData.ts` —— FAQ 数据扩充
- **新增** `app/ui/dashboard/zendeskChatButton.tsx`（67 行的 Zendesk 客服按钮）

**🔴 重叠**：你 v3.0.8 的 `4dfc01f feat(faq): add Zendesk live-chat button` 和 `1c28c7c feat(faq): add Holds & Reservations section` 都是 port 自这个 commit。
**建议**：**保留 v3.0.8 版本**（你已经 port 过来并加了 Holds & Reservations 部分，比 Ken 原版更完整）。

⚠️ 但要注意：**删除 cameraScan 整页**这件事 v3.0.8 可能没做。需要确认你的 v3.0.8 还有没有 `app/dashboard/cameraScan/page.tsx`。如果还有 → merge 时让 Ken 的删除生效；如果已经没了 → 保留即可。

**Kelvin的决定**:删除remove extra camera scan page然后剩下的保留v3.0.8改动

---

## 6. `d549727` — remove khan academy 🔴
**时间**：2026-04-29 ｜ **4 个文件，+49 / −478**

**做了什么**：
- **删除** `app/lib/khan/data.ts`（388 行）
- **删除** `app/lib/khan/service.ts`（77 行）
- 改 `app/lib/recommendations/ai.ts`（+32/-... 调整 AI 推荐逻辑去掉 khan）
- 改 `app/ui/dashboard/studentChat.tsx`（+30/-... 学生聊天去掉 khan）

**🔴 重叠**：你 v3.0.8 有 `b15881e remove khan academy` + `58a9afd fix: complete khan removal`（你做得**更彻底**——补了 learning/service 和 chat 里残留的 khan fallback）。
**建议**：**保留 v3.0.8 版本**（已经更完整）。

**Kelvin的决定**:保留v3.0.8改动

---

## 7. `94c6b13` — small update 🟡
**时间**：2026-04-30 ｜ **4 个文件，+137 / −75**

**做了什么**：杂项小更新：
- `profileEditForm.tsx`（+134/-... 又改 profile）
- `faqFloatingHelp.tsx`（+10 行）
- `sidenav.tsx`（+18/-... 侧栏）
- `studentFaqData.ts`（+50/-... FAQ 数据加内容）

**风险**：又动 `sidenav.tsx`、`faqFloatingHelp.tsx`、`studentFaqData.ts`——**v3.0.8 都改过这三个文件，会冲突**。

**Kelvin的决定**:接受改动

---

## 8. `2d46e32` — profile system update 🟢
**时间**：2026-04-30 ｜ **8 个文件，+79 / −93**

**做了什么**：Profile 系统更新（v3.0.8 的 profile 没大改过，相对独立）：
- `app/profile/actions.ts`、`page.tsx`、`profileAvatarForm.tsx`、`profileEditForm.tsx`、`profileNameForm.tsx` — Profile 一系列文件调整
- `app/ui/dashboard/checkOutForm.tsx`（+6/-... 借书表单小改）
- **新增** `supabase/migrations/20260430_avatars_bucket.sql`（34 行的 Supabase 头像 bucket migration）
- `tailwind.config.ts`（+6 行配置）

**🟢 新内容**：v3.0.8 没有这个 avatars bucket migration。**建议接受 Ken 的改动**。

**Kelvin的决定**:接受改动

---

## 9. `c33b0be` — side nav minimize 🟡
**时间**：2026-05-01 ｜ **2 个文件，+101 / −65**

**做了什么**：侧栏可以**折叠最小化**。改了：
- `app/ui/dashboard/dashboardShell.tsx`（+21 行）
- `app/ui/dashboard/sidenav.tsx`（+145/-... 大改）

**风险**：你 v3.0.8 的 `427a49e feat(sidenav): make Swinburne logo clickable` 也改了 sidenav。**两边都改 sidenav，必冲突**。
**建议**：手工合并——保留 v3.0.8 的 logo 可点击 + 接受 Ken 的折叠功能。

**Kelvin的决定**:接受改动

---

## 10. `ef0cdb4` — LinkedIn demo 🔴
**时间**：2026-05-01 ｜ **4 个文件，+71 / −14**

**做了什么**：LinkedIn 登录 demo：
- `.env.example` — 加 LinkedIn OAuth 环境变量
- `app/login/LoginClient.tsx`、`app/login/page.tsx` — 登录页加 LinkedIn 按钮
- `auth.ts` — NextAuth 加 LinkedIn provider

**🔴 重叠**：你 v3.0.8 的 `79217c9 LinkedIn demo` 是同样功能。
**建议**：**保留 v3.0.8 版本**。

**Kelvin的决定**:保留v3.0.8改动

---

## 11. `48de9ae` — Youtube Data Api linked 🟢⭐
**时间**：2026-05-02 ｜ **18 个文件，+692 / −847**

**做了什么**：**这是 Ken 这条 branch 的核心**——把 LinkedIn Learning 整体替换成 YouTube Data API：
- **删除** `app/lib/linkedin/sample-data.ts`、`service.ts`、`types.ts`（共 723 行）
- **新增** `app/lib/youtube/sample-data.ts`、`service.ts`（377 行）、`types.ts`（63 行）
- **重命名** `app/dashboard/learning/linkedin/page.tsx` → `app/dashboard/learning/youtube/page.tsx`
- 改 `app/api/recommendations/route.ts`、`app/lib/learning/service.ts`、`app/lib/recommendations/ai.ts` — 后端切到 YouTube
- 改 `app/ui/dashboard/learning/*.tsx` 一系列 UI 文件
- `app/ui/dashboard/studentChat.tsx`（+29/-... AI 聊天里换数据源）
- `next.config.ts` — 加 YouTube CDN 域名白名单
- `.env.example` — YouTube API 环境变量

**🟢 新内容**：v3.0.8 没有这个迁移，**全盘接受 Ken 的改动**。
⚠️ 但是：v3.0.8 的代码里很可能还在用 `app/lib/linkedin/...`（learning 页面、recommendations 等）。**merge 后必须 build 验证**。

**Kelvin的决定**:接受改动

---

## 12. `34e9550` — Learning hub small feature update 🟢
**时间**：2026-05-03 ｜ **13 个文件，+504 / −74**

**做了什么**：YouTube Learning Hub 加小功能：
- 改 `app/lib/youtube/service.ts`（+198 行——加 caching / pagination 之类）
- **新增** `app/ui/dashboard/learning/scrollUnlock.tsx`（21 行）
- **新增** `app/ui/dashboard/learning/youtubePlayerModal.tsx`（96 行——视频播放弹窗）
- 改 `courseCard.tsx`（+106/-... 课程卡片大改）
- 改 `dashboardShell.tsx`、`faqFloatingHelp.tsx`、`faqScrollTopButton.tsx`
- `package.json`（+2 个依赖）

**🟢 新内容**：基本独立。
**风险**：动 `dashboardShell.tsx`、`faqFloatingHelp.tsx`——v3.0.8 改过，可能冲突。

**Kelvin的决定**:接受改动

---

## 13. `9b8476f` — ScrollToTop button 🟢
**时间**：2026-05-03 ｜ **4 个文件，+66 / −12**

**做了什么**：全局回到顶部按钮：
- **新增** `app/ui/scrollToTop.tsx`（47 行）
- `app/layout.tsx`（+6 行）
- 改 youtube page 和 searchResultsPanel

**🟢 新内容**。
**风险**：`app/layout.tsx` 是根 layout，v3.0.8 没大改过——理论上可以直接接受。

**Kelvin的决定**:接受改动

---

## 14. `db4b376` — dev to fetch 🟢⭐
**时间**：2026-05-03 ｜ **5 个文件，+579 / −102**

**做了什么**：加 **Dev.to** 文章源 + **Reddit** 页面：
- **新增** `app/dashboard/learning/reddit/page.tsx`（5 行——可能只是占位）
- 改 `app/dashboard/learning/youtube/page.tsx`（+325 行——把 dev.to 集成进去）
- **新增** `app/ui/dashboard/learning/devToGrid.tsx`（342 行——dev.to 文章网格）

**🟢 全新功能**，独立。

**Kelvin的决定**:接受改动

---

## 15. `8be7725` — layout update 🟢
**时间**：2026-05-03 ｜ **1 个文件，+29 / −29**

**做了什么**：`devToGrid.tsx` 排版小调整。

**🟢 直接接受**。

**Kelvin的决定**:接受改动

---

## 16. `a0035ee` — news trending 🟢⭐
**时间**：2026-05-03 ｜ **2 个文件，+407 / −57**

**做了什么**：新闻趋势 feed：
- 改 `youtube/page.tsx`（+182/-... 集成进去）
- **新增** `app/ui/dashboard/learning/newsGrid.tsx`（282 行的新闻网格）

**🟢 全新功能**。

**Kelvin的决定**:接受改动

---

## 17. `9d90df1` — search bar consistent 🟢
**时间**：2026-05-03 ｜ **4 个文件，+195 / −15**

**做了什么**：
- **新增** `app/ui/dashboard/learning/communityFeed.tsx`（74 行）
- **新增** `app/ui/dashboard/learning/newsFeed.tsx`（112 行）
- 改 `youtube/page.tsx`、`searchForm.tsx` — 搜索栏样式一致化

**🟢 全新文件**，但要看 `searchForm.tsx` 改了什么（前面 `48de9ae`、`db4b376` 也改过）。

**Kelvin的决定**:接受改动

---

## 18. `a1bd8b3` — error fixed 🟢
**时间**：2026-05-03 ｜ **4 个文件，+68 / −15**

**做了什么**：bug fix——`youtube/service.ts` 加 +66 行错误处理之类，`youtube/page.tsx` / `learning/service.ts` / `app/layout.tsx` 各小改。

**🟢 修 bug 性质，直接接受**。

**Kelvin的决定**:接受改动

---

# 总结

## 🔴 一定会冲突（4 个，全部"保留 v3.0.8"）
- `55b7d63` set limit of user borrow book amount
- `10867ea` remove extra camera scan page, faq update
- `d549727` remove khan academy
- `ef0cdb4` LinkedIn demo

## 🟡 可能冲突（5 个，逐个看）
- `59996f0` font text change（mobileNav / global.css / themeToggle）
- `7a0f41c` ui optimisze（cameraScanner / mobileNav）
- `9756e37` ui consistent（sidenav）
- `94c6b13` small update（sidenav / faqFloatingHelp / studentFaqData）
- `c33b0be` side nav minimize（**和你 sidenav logo 冲突**——手工合并）

## 🟢 全新内容（9 个，直接接受）
- `2d46e32` profile system update（含 avatars bucket migration ⭐）
- `48de9ae` Youtube Data Api linked（**核心功能** ⭐）
- `34e9550` Learning hub small feature update
- `9b8476f` ScrollToTop button
- `db4b376` dev to fetch（**新增 dev.to + Reddit** ⭐）
- `8be7725` layout update
- `a0035ee` news trending（**新增 newsGrid** ⭐）
- `9d90df1` search bar consistent
- `a1bd8b3` error fixed

## 关键判断

**如果你确认这个清单 OK**，我执行 Ken 这条 merge 时会：
1. 先 `git merge --no-ff origin/Ken-v3.1.0-YoutubeDataApiV3`
2. 遇到上面 🔴/🟡 列的文件时**主动停下来问你**，把冲突 diff 贴给你看
3. 🟢 列的文件直接接受 Ken 版
4. merge 完跑 `pnpm build`，build 失败再找你

**特别要小心的两个点**：
- `48de9ae` Youtube Data Api 把 LinkedIn 整个目录删了——v3.0.8 里如果还有代码引用 `@/app/lib/linkedin/...` 会编译失败
- `c33b0be` 和你的 sidenav logo 冲突——必须手工合并保留双方
