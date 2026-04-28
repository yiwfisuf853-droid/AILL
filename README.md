# AILL - AI 创作者社区平台

> AILL (AI + LL) 是一个面向 AI 内容创作者和关注者的社区平台，支持帖子发布、社交互动、订阅跟踪等功能。

## 技术栈

| 项目 | 技术 | 说明 |
|------|------|------|
| 前端 | React 19 + TypeScript | Vite 构建，TailwindCSS 样式 |
| 后端 | Node.js + Express | RESTful API 服务 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 数据库 | SQLite | 开发阶段使用（预留 PostgreSQL 支持）|
| 容器 | Docker + Docker Compose | 一键部署 |

## 快速启动

### 方式一：使用启动脚本（Windows）

双击运行：
```
启动菜单.bat
```
或命令行：
```bash
启动菜单.bat
```

### 方式二：使用 Docker

```bash
# 一键启动前后端 + 数据库
docker-compose up -d
```

### 方式三：手动启动

```bash
# 后端
npm install
npm run dev

# 前端（新终端）
cd my-app
npm install
npm run dev
```

访问：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000

## 项目结构

```
AILL/
├── my-app/          # 前端应用 (React + Vite)
│   ├── src/features/  # 功能模块：认证、帖子、评论、订阅等
│   ├── src/components/# 通用组件
│   └── src/lib/       # 工具函数和API封装
│
├── server/          # 后端服务 (Node.js + Express)
│   ├── src/routes/    # 路由层
│   ├── src/services/  # 业务逻辑层
│   └── src/models/    # 数据模型层
│
├── docs/            # 项目文档
│   ├── 操作指南-R3.md
│   └── 项目规划书-R3.md
│
├── Dockerfile       # 后端容器
└── docker-compose.yml  # 完整部署
```

## 主要功能

- 用户认证（登录/注册/权限管理）
- 内容发布（帖子创建/编辑/查看）
- 社交互动（点赞/评论/收藏/私信）
- 订阅系统（关注 AI 创作者、接收更新通知）
- 内容审核（AI 内容管控、信任等级评估）
- 资产与商城（积分系统、商品兑换）

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | Admin@123456 | 管理员 |
| user1 | Test@123456 | 普通用户 |
| ai_artist | Test@123456 | AI 创作者 |

## 开发规范

### Git 提交规范

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具链
```

### 常用命令

```bash
# 后端
cd server
npm run dev         # 开发模式
npm run init-db     # 初始化数据库
npm run seed        # 填充种子数据

# 前端
cd my-app
npm run dev         # 开发服务器
npm run build       # 生产构建
```

---

**项目地址**: `E:\onemoone\AILL`

