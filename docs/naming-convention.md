# AILL 命名规范

> 本文档为 AILL 项目统一的命名标准，所有代码必须遵守。最后更新：2026-04-29。

---

## 一、前端命名

### 1.1 文件命名

| 类型 | 格式 | 示例 |
|------|------|------|
| React 组件 | PascalCase | `UserProfile.tsx`、`PostCard.tsx` |
| UI 基础组件 | PascalCase | `Button.tsx`、`Icon.tsx`、`ConfirmDialog.tsx` |
| 工具/辅助文件 | camelCase | `formatDate.ts`、`layoutConfig.ts` |
| React Hook | `use` + PascalCase | `useTheme.ts`、`useSocket.ts` |
| Zustand Store | `use` + 领域 + `Store` | `useAuthStore.ts`、`usePostsStore.ts` |
| 类型定义 | 同 feature 模块 | `types.ts`（feature 目录内） |

**规则**：
- `components/ui/` 下所有组件文件必须用 PascalCase
- Hook 文件统一放在 `src/hooks/` 目录下
- Store 文件统一放在对应 feature 的 `store.ts` 中

### 1.2 代码命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 组件（函数/类） | PascalCase | `UserProfile`、`PostCard` |
| 函数/方法 | camelCase | `getUserInfo`、`formatDate` |
| 变量 | camelCase | `isLoading`、`postList` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`、`API_BASE_URL` |
| 枚举值 | UPPER_SNAKE_CASE | `PostStatus.PUBLISHED`、`PostType.ARTICLE` |
| 类型/接口 | PascalCase | `User`、`PostListResponse`、`LayoutConfig` |
| CSS 类名 | camelCase | `layoutShell`、`cardInteractive`、`btnGlow` |
| 事件处理器 | `on` + 动作 + 目标 | `onClickSubmit`、`onChangeInput` |
| API 客户端对象 | 领域 + `Api` | `authApi`、`postApi`、`commentApi` |
| Store Hook | `use` + 领域 + `Store` | `useAuthStore`、`usePostsStore` |
| 自定义 Hook | `use` + PascalCase | `useTheme`、`useSocket`、`usePagination` |

### 1.3 data-name 属性命名

**格式**：`{范围}{区块}{元素}{修饰}{序号}` — 连续 camelCase 拼接，**禁止使用点号分隔**。

| 位置 | 含义 | 必填 | 示例 |
|------|------|------|------|
| 范围 | 页面/组件归属 | 是 | `home`、`postCard`、`sidebar` |
| 区块 | 页面内功能区域 | 视情况 | `Hero`、`List`、`Nav`、`Form` |
| 元素 | 具体可见元素 | 是 | `Btn`、`Title`、`Input`、`Avatar` |
| 修饰 | 状态/变体 | 否 | `Active`、`Disabled`、`Empty` |
| 序号 | 同类元素编号 | 否 | `1`、`2`、`3` |

**元素类型后缀**：`Btn`（按钮）、`Input`（输入框）、`Title`（标题）、`Desc`（描述）、`Avatar`（头像）、`Badge`（徽章）、`Tab`（选项卡）、`Link`（链接）、`List`（列表）、`Grid`（网格）、`Card`（卡片）、`Modal`（弹窗）、`Form`（表单）、`Empty`（空状态）、`Img`（图片）。

**层级控制**：最长不超过 5 段拼接，超过时说明组件需要拆分。

**示例**：

| 含义 | 命名 |
|------|------|
| 首页 Hero 区标题 | `homeHeroTitle` |
| 帖子卡片点赞按钮 | `postCardLikeBtn` |
| 设置页密码表单提交按钮 | `settingsPasswordFormSubmitBtn` |
| 登录页邮箱输入框 | `loginEmailInput` |
| 动态列表项 | `` `postCard${post.id}LikeBtn` `` |

**标注规则**：
- 页面/组件根元素必须标注
- 交互元素（按钮/链接/输入框）必须标注
- 可见文本容器（标题/描述/标签）必须标注
- 空状态/加载态必须标注
- 列表项使用动态 ID 拼接

**范围名索引**：详见 `docs/data-name-naming-system.md`

### 1.4 Import 路径

- 使用 `@/` 别名引用 `src/` 下的模块
- UI 组件路径必须与文件名一致：`@/components/ui/Button`（不是 `@/components/ui/button`）
- Hook 从 `@/hooks/` 引用：`@/hooks/useTheme`
- Store 从对应 feature 引用：`@/features/auth/store`

---

## 二、后端命名

### 2.1 文件命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 路由文件 | camelCase | `auth.js`、`posts.js`、`trust-level.js` |
| 服务文件 | 领域 + `.service.js` | `auth.service.js`、`post.service.js` |
| 验证文件 | 领域 + `.js` | `auth.js`、`posts.js`（在 validations/ 下） |
| 中间件文件 | camelCase | `validate.js`、`apikey-auth.js` |
| 数据文件 | camelCase | `init-db.js`、`migrate.js`、`schema.sql` |

### 2.2 代码命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 导出函数 | 动词 + 领域对象 camelCase | `registerUser`、`getPostList`、`createComment` |
| 中间件函数 | 动作 + `Middleware` | `authMiddleware`、`optionalAuthMiddleware` |
| 验证中间件 | `validateRequest` | 统一入口：`validateRequest(schema)` |
| 验证 Schema | 动作 + 领域 + `Schema` | `registerSchema`、`createPostSchema` |
| 服务初始化函数 | `initialize` + 领域 | `initializeThemes`、`initializeGifts` |
| 数据库连接 | `initialize` + 描述 | `initializePgConnection` |
| 错误类 | 领域 + `Error` | `NotFoundError`、`ValidationError` |
| 常量 | UPPER_SNAKE_CASE | `JWT_SECRET`、`AI_CAPABILITIES` |
| 响应辅助 | 短动词（工具函数） | `success()`、`created()`、`paginated()` |

### 2.3 API 路径

| 规则 | 示例 |
|------|------|
| kebab-case 路径 | `/api/admin/ai-users`、`/api/security/login-check` |
| RESTful 资源名 | `/api/posts`、`/api/comments` |
| 操作用动词 | `/api/auth/validate-token`、`/api/posts/following` |

### 2.4 数据库

| 类型 | 格式 | 示例 |
|------|------|------|
| 表名 | snake_case | `user_account`、`post_comment` |
| 列名 | snake_case | `created_at`、`user_id` |
| 索引名 | `idx_` + 表 + 列 | `idx_api_keys_key_hash` |

> 数据库 snake_case 与代码 camelCase 之间由 Repository 和 Axios 拦截器自动转换，无需手动处理。

---

## 三、命名决策记录

| 决策 | 原因 |
|------|------|
| CSS 类名使用 camelCase | 项目中 37 个自定义 CSS 类均已使用 camelCase（如 `layoutShell`、`cardInteractive`），与 Tailwind 的 @apply 和 React className 配合良好，无需迁移到下划线格式 |
| UI 组件文件名使用 PascalCase | 符合 React 社区主流约定，文件名与导出组件名一致 |
| Hook 放在 `hooks/` 目录 | 职责分离：工具函数在 `lib/`，React Hook 在 `hooks/`，Store 在 feature 模块内 |
| 后端函数加领域对象 | `register` → `registerUser`，避免上下文丢失，IDE 提示更友好 |
| 中间件统一 `Middleware` 后缀 | `optionalAuth` → `optionalAuthMiddleware`，一眼可辨中间件身份 |
| data-name 使用连续 camelCase | 禁止点号分隔（`topBar.menuBtn` → `topBarMenuBtn`），与 CSS 类名风格一致，避免混淆 CSS 选择器语法 |
