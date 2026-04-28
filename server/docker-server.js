// ============================================================
// docker-server.js — Docker 生产环境启动入口
// ============================================================
// 用途：在不修改原有代码的前提下，为 Express 应用注入
//       前端静态文件服务和 SPA fallback 支持。
//
// 工作原理：
//   1. 劫持 http.createServer，在 index.js 创建 HTTP 服务器时
//      拦截 Express app 实例
//   2. 找到 404 catch-all 处理器的位置
//   3. 在其之前插入 express.static 和 SPA fallback 中间件
//   4. 恢复 http.createServer 并正常启动服务器
// ============================================================

import path from 'path';
import http from 'http';
import express from 'express';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');

// ---- 保存原始方法 ----
const originalCreateServer = http.createServer;

// ---- 劫持 http.createServer ----
http.createServer = function (...args) {
  const app = args[0] && typeof args[0] === 'function' ? args[0] : null;

  if (app && typeof app.use === 'function' && app._router) {
    const stack = app._router.stack;

    // 查找 404 处理器（从末尾向前搜索，3参数 catch-all 中间件）
    let notFoundIndex = -1;
    for (let i = stack.length - 1; i >= 0; i--) {
      const layer = stack[i];
      if (
        layer.handle &&
        layer.handle.length === 3 &&       // (req, res, next)
        !layer.route &&                      // 不是具名路由
        !layer.handle.name                   // 匿名函数
      ) {
        const src = layer.handle.toString();
        if (src.includes('404') || src.includes('Not Found')) {
          notFoundIndex = i;
          break;
        }
      }
    }

    // 使用 app.use() 的内部机制来注册中间件
    // 但需要插入到 404 之前，所以手动操作 stack 数组
    const insertAt = notFoundIndex >= 0 ? notFoundIndex : stack.length;

    // 1) 静态文件中间件（只服务 public 目录中存在的文件）
    const staticMiddleware = express.static(publicDir, {
      maxAge: '7d',
      etag: true,
      lastModified: true,
      immutable: true,
    });

    // 2) SPA fallback：非 API 路径回退到 index.html
    const spaFallback = (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        return next();
      }
      res.sendFile(path.join(publicDir, 'index.html'), (err) => {
        if (err) next();
      });
    };

    // 创建与 Express 兼容的 Layer 对象
    // Express Layer 需要以下属性才能正确匹配路由：
    //   handle  — 中间件函数
    //   keys    — 路径参数键数组
    //   regexp  — 路径匹配正则表达式
    //   path    — 路径字符串
    function createLayer(handle) {
      return {
        handle,
        keys: [],
        regexp: /^\/?(?=\/|$)/i,   // 匹配所有路径（与 app.use() 无路径参数时一致）
        path: '',
      };
    }

    // 在 404 处理器之前插入（先 SPA fallback，再 static）
    stack.splice(insertAt, 0, createLayer(spaFallback));
    stack.splice(insertAt, 0, createLayer(staticMiddleware));

    console.log('[Docker] Static file serving injected:', publicDir);
  }

  // 恢复原始方法，避免影响后续代码
  http.createServer = originalCreateServer;

  return originalCreateServer.apply(http, args);
};

// ---- 启动原始服务器 ----
console.log('[Docker] Starting AILL server...');
await import('./src/index.js');
