# ============================================================
# Dockerfile — AILL 社区平台多阶段构建
# ============================================================

# ---------- 阶段1：构建前端 ----------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/my-app

# 先复制依赖描述文件，利用 Docker 缓存层
COPY my-app/package.json my-app/package-lock.json* ./

RUN npm ci

# 复制前端源码并构建
COPY my-app/ ./

RUN npm run build
# 构建产物在 /app/my-app/dist

# ---------- 阶段2：生产镜像 ----------
FROM node:20-alpine AS production

LABEL maintainer="AILL Team"
LABEL description="AILL 社区平台 — 前端 + 后端一体化镜像"

WORKDIR /app

# 安装后端依赖（单独步骤，利用缓存）
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

# 复制后端源码（不覆盖 node_modules：先安装再复制）
COPY server/src ./server/src
COPY server/docker-server.js ./server/docker-server.js

# 从阶段1复制前端构建产物到 public 目录
COPY --from=frontend-builder /app/my-app/dist ./server/public

# 创建 uploads 目录（供文件上传使用）
RUN mkdir -p ./server/uploads

# 环境变量（可通过 docker-compose / .env 覆盖）
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/server

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "docker-server.js"]
