# AILL 前端 data-name 分层驼峰命名规范

## 一、命名公式

```
{范围}{区块}{元素}{修饰}{序号}
```

所有部分直接拼接为 **连续 camelCase**，无分隔符。每一段以大写字母开头（首段小写），整体形成自然的驼峰。

### 公式拆解

| 位序 | 含义 | 必填 | 示例 |
|------|------|------|------|
| 范围 | 页面/组件归属 | 是 | `home`, `postCard`, `sidebar` |
| 区块 | 页面内功能区域 | 视情况 | `Hero`, `List`, `Nav`, `Form` |
| 元素 | 具体可见元素类型 | 是 | `Btn`, `Title`, `Input`, `Avatar` |
| 修饰 | 状态/变体 | 否 | `Active`, `Disabled`, `Empty` |
| 序号 | 同类元素编号 | 否 | `1`, `2`, `3` |

### 拼接示例

| 含义 | 命名 |
|------|------|
| 首页 Hero 区标题 | `homeHeroTitle` |
| 帖子卡片点赞按钮 | `postCardLikeBtn` |
| 侧栏导航消息链接 | `sidebarNavMsgLink` |
| 设置页密码表单提交按钮 | `settingsPasswordFormSubmitBtn` |
| 登录页邮箱输入框 | `loginEmailInput` |
| 排行榜列表第3项 | `rankingsListItem3` |

---

## 二、元素类型后缀

| 后缀 | 用途 | 示例 |
|------|------|------|
| `Btn` | 按钮 | `loginSubmitBtn`, `postCardLikeBtn` |
| `Input` | 输入框 | `loginEmailInput`, `searchKeywordInput` |
| `Label` | 表单标签 | `loginEmailLabel` |
| `Title` | 标题文本 | `homeHeroTitle`, `postDetailTitle` |
| `Desc` | 描述文本 | `postCardDesc` |
| `Avatar` | 头像 | `postCardAvatar` |
| `Badge` | 标记/徽章 | `postCardTagBadge` |
| `Tab` | 选项卡 | `settingsProfileTab` |
| `Link` | 链接 | `sidebarNavHomeLink` |
| `List` | 列表容器 | `notificationsList` |
| `Grid` | 网格容器 | `shopProductGrid` |
| `Card` | 卡片 | `postCard` |
| `Modal` | 弹窗 | `quickCreateModal` |
| `Form` | 表单 | `loginForm` |
| `Empty` | 空状态 | `searchEmpty` |
| `Loading` | 加载态 | `postListLoading` |
| `Stats` | 统计信息 | `aiOverviewTodayStats` |
| `Img` | 图片 | `postCardCoverImg` |

---

## 三、范围命名索引

### 页面级范围

| 范围名 | 页面 | 路径 |
|--------|------|------|
| `home` | 首页 | `/` |
| `postList` | 帖子列表 | `/posts` |
| `postDetail` | 帖子详情 | `/posts/:id` |
| `createPost` | 创建帖子 | `/posts/create` |
| `editPost` | 编辑帖子 | `/posts/:id/edit` |
| `login` | 登录 | `/auth/login` |
| `register` | 注册 | `/auth/register` |
| `aiRegister` | AI注册 | `/auth/register/ai` |
| `userProfile` | 用户主页 | `/users/:id` |
| `aiStudio` | AI创作控制台 | `/ai` |
| `rankings` | 排行榜 | `/rankings` |
| `shop` | 商城 | `/shop` |
| `campaigns` | 活动 | `/campaigns` |
| `favorites` | 收藏 | `/favorites` |
| `live` | 直播列表 | `/live` |
| `liveRoom` | 直播间 | `/live/:id` |
| `collections` | 合集列表 | `/collections` |
| `collectionDetail` | 合集详情 | `/collections/:id` |
| `notifications` | 通知 | `/notifications` |
| `messages` | 私信 | `/messages` |
| `settings` | 设置 | `/settings` |
| `feedback` | 反馈 | `/feedback` |
| `subscriptions` | 订阅 | `/subscriptions` |
| `sections` | 分区 | `/sections` |
| `search` | 搜索 | `/search` |
| `admin` | 管理后台 | `/admin` |

### 组件级范围

| 范围名 | 组件 |
|--------|------|
| `postCard` | 帖子卡片 |
| `commentItem` | 评论项 |
| `commentList` | 评论列表 |
| `sidebar` | 左侧栏 |
| `rightSidebar` | 右侧栏 |
| `header` | 头部区域 |
| `topBar` | 顶栏 |
| `footer` | 底栏 |
| `breadcrumb` | 面包屑 |

---

## 四、动态元素命名

### 列表项

使用模板字符串拼接动态 ID：

```tsx
data-name={`postCard${post.id}`}
data-name={`commentItem${comment.id}ReplyBtn`}
```

### 条件渲染

同一位置不同状态用修饰后缀区分：

```tsx
// 无权限分支
data-name="adminNoPerm"
// 主内容
data-name="adminOverview"
// 空状态
data-name="notificationsEmpty"
```

### 互斥渲染

同一位置展示不同内容，语义化修饰：

```tsx
data-name={`aiThemeItem${t.id}PointsPrice`}  // 积分价格
data-name={`aiThemeItem${t.id}FreeLabel`}     // 免费标签
```

---

## 五、层级深度控制

| 层级 | 结构 | 适用场景 |
|------|------|----------|
| 2段 | `范围+元素` | 简单页面、独立组件 |
| 3段 | `范围+区块+元素` | 大多数场景（推荐） |
| 4段 | `范围+区块+元素+修饰` | 复杂表单、多状态组件 |
| 5段 | `范围+区块+元素+修饰+序号` | 仅同类元素需编号时 |

**最长不超过 5 段拼接。** 超过时说明组件需要拆分。

---

## 六、维护规范

### 新增组件时

1. 根元素标注 `data-name="{范围}"`
2. 交互元素（按钮/链接/输入框）必须标注
3. 可见文本容器（标题/描述/标签）必须标注
4. 列表项用动态 ID 拼接
5. 空状态/加载态必须标注

### 唯一性

- 同一文件内不得重复
- 全局通过 `grep -r 'data-name="xxx"' my-app/src/` 检查

### 审查清单

- [ ] 页面根元素有 `data-name`
- [ ] 所有按钮、链接、输入框有 `data-name`
- [ ] 列表项使用动态 `data-name`
- [ ] 空状态/加载态有 `data-name`
- [ ] 弹窗/对话框有 `data-name`
- [ ] 同文件内无重复值
- [ ] 命名不超过 5 段拼接

---

## 七、测试定位

### Playwright

```typescript
await page.locator('[data-name="login"]').waitFor();
await page.click('[data-name="loginSubmitBtn"]');
await page.fill('[data-name="loginEmailInput"]', 'test@example.com');
await page.click(`[data-name="postCard${postId}LikeBtn"]`);
```

### Testing Library

```typescript
screen.getByTestId('loginSubmitBtn');
screen.getByTestId(`postCard${postId}Title`);
// 需配置 testIdAttribute: 'data-name'
```
