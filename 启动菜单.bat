@echo off
chcp 65001 >nul 2>&1
title AILL 社区平台 - 开发工具箱

cd /d "%~dp0"
color 0A

:menu
cls
echo.
echo ============================================================================
echo                     AILL 社区平台 - 开发工具箱
echo ============================================================================
echo.
echo   项目目录：%CD%
echo.
echo   环境:
<nul set /p "temp=     Node.js: "
node --version 2>nul || echo [未安装]
<nul set /p "temp=     npm: "
call npm --version 2>nul || echo [未安装]
echo.
echo ============================================================================
echo.
echo   [1]  启动前端开发服务器    npm run dev (Vite 热重载)
echo.
echo   [2]  启动后端服务器        npm run dev (Express)
echo.
echo   [3]  同时启动前后端        双窗口模式
echo.
echo   [4]  前端生产构建          npm run build (输出 dist/)
echo.
echo   [5]  数据库初始化          npm run init-db
echo.
echo   [6]  填充种子数据          npm run seed
echo.
echo   [7]  后端测试              npm test (Vitest)
echo.
echo   [8]  快速清理              删除 node_modules 缓存
echo.
echo   [9]  安装所有依赖          npm install (根目录/前端/后端)
echo.
echo   [0]  查看项目状态          环境/依赖/构建产物检查
echo.
echo ============================================================================
echo.

:choice
set /P "selection=请选择操作 (0-9): "

if "%selection%"=="1" goto dev_frontend
if "%selection%"=="2" goto dev_backend
if "%selection%"=="3" goto dev_all
if "%selection%"=="4" goto build_frontend
if "%selection%"=="5" goto init_db
if "%selection%"=="6" goto seed_db
if "%selection%"=="7" goto test_backend
if "%selection%"=="8" goto clean
if "%selection%"=="9" goto install_deps
if "%selection%"=="0" goto show_status
echo.
echo   无效输入，请重新选择
timeout /t 2 >nul
goto choice

:: ===========================================================================
:: [1] 启动前端开发服务器
:: ---------------------------------------------------------------------------
:: 执行 `npm run dev`，在 my-app/ 目录下运行
:: 启动 Vite 开发服务器，支持以下特性：
::   - 热模块替换 (HMR)，修改 Svelte/React 组件即时刷新
::   - TypeScript 类型检查
::   - TailwindCSS 即时编译
::   - 端口占用自动递增 (5183 -> 5174 -> ...)
:: 按 Ctrl+C 可停止服务
:: 访问地址：http://localhost:5183
:: ===========================================================================

:dev_frontend
echo.
echo ============================================================================
echo   启动前端开发服务器
:: ===========================================================================
echo.
echo   目录：my-app/
echo   命令：npm run dev
echo   地址：http://localhost:5183
echo.
echo   特性:
echo     - Vite 热重载 (修改组件即时刷新)
echo     - TypeScript 类型检查
echo     - TailwindCSS 即时编译
echo.
echo   按 Ctrl+C 停止服务
echo.
cd /d "%~dp0my-app"
if not exist "node_modules" (
    echo   [提示] 依赖未安装，正在执行 npm install...
    call npm install
)
call npm run dev
echo.
echo   前端服务已停止
pause
goto menu

:: ===========================================================================
:: [2] 启动后端服务器
:: ---------------------------------------------------------------------------
:: 执行 `npm run dev`，在 server/ 目录下运行
:: 启动 Express 服务器，支持以下功能：
::   - RESTful API 端点 (50+ 个)
::   - JWT 认证中间件
::   - CORS 跨域支持
::   - 内存数据库 (可切换 PostgreSQL)
:: 按 Ctrl+C 可停止服务
:: 访问地址：http://localhost:3000
:: ===========================================================================

:dev_backend
echo.
echo ============================================================================
echo   启动后端服务器
:: ===========================================================================
echo.
echo   目录：server/
echo   命令：npm run dev
echo   地址：http://localhost:3000
echo.
echo   功能:
echo     - RESTful API (认证/帖子/评论/社交关系等)
echo     - JWT 认证
echo     - CORS 跨域
echo     - 内存数据库 (支持切换 PostgreSQL)
echo.
echo   按 Ctrl+C 停止服务
echo.
cd /d "%~dp0server"
if not exist "node_modules" (
    echo   [提示] 依赖未安装，正在执行 npm install...
    call npm install
)
call npm run dev
echo.
echo   后端服务已停止
pause
goto menu

:: ===========================================================================
:: [3] 同时启动前后端
:: ---------------------------------------------------------------------------
:: 打开两个独立窗口分别运行前后端服务
:: 前端窗口标题：AILL 前端
:: 后端窗口标题：AILL 后端
:: 适合需要同时调试前后端的场景
:: 关闭窗口或按 Ctrl+C 可停止对应服务
:: ===========================================================================

:dev_all
echo.
echo ============================================================================
echo   同时启动前后端 (双窗口模式)
:: ===========================================================================
echo.
echo   将打开两个独立的命令行窗口:
echo.
echo   [窗口 1] AILL 前端
echo          - 地址：http://localhost:5183
echo          - 框架：React + Vite
echo.
echo   [窗口 2] AILL 后端
echo          - 地址：http://localhost:3000
echo          - 框架：Express + JWT
echo.
echo   提示：关闭窗口或按 Ctrl+C 可停止对应服务
echo.

start "AILL 前端" cmd /k "cd /d %~dp0my-app && call npm run dev"
timeout /t 2 /nobreak >nul
start "AILL 后端" cmd /k "cd /d %~dp0server && call npm run dev"

echo.
echo   已启动两个服务窗口
echo   按任意键返回主菜单...
pause >nul
goto menu

:: ===========================================================================
:: [4] 前端生产构建
:: ---------------------------------------------------------------------------
:: 执行 `npm run build`，在 my-app/ 目录下运行
:: 使用 Vite 打包前端资源，流程如下：
::   1) TypeScript 编译 (检查类型错误)
::   2) Tree-shaking (移除未使用代码)
::   3) 代码压缩 (CSS/JS 最小化)
::   4) 资源优化 (图片/SVG 压缩)
::   5) 生成哈希文件名 (缓存控制)
:: 输出目录：my-app/dist/
:: 构建产物可直接部署到 CDN 或静态服务器
:: ===========================================================================

:build_frontend
echo.
echo ============================================================================
echo   前端生产构建
:: ===========================================================================
echo.
echo   目录：my-app/
echo   命令：npm run build
echo   输出：dist/
echo.
echo   流程:
echo     1. TypeScript 类型检查
echo     2. Tree-shaking 移除死代码
echo     3. CSS/JS 压缩
echo     4. 资源哈希命名
echo.
cd /d "%~dp0my-app"
call npm run build
echo.
if exist "dist" (
    echo   构建产物:
    dir /s /b "dist\*.*" 2>nul
) else (
    echo   未找到构建产物，请检查上方日志
)
echo.
pause
goto menu

:: ===========================================================================
:: [5] 数据库初始化
:: ---------------------------------------------------------------------------
:: 执行 `npm run init-db`，在 server/ 目录下运行
:: 初始化内存数据库结构，创建以下数据表：
::   - users (用户表)
::   - posts (帖子表)
::   - comments (评论表)
::   - relationships (社交关系表)
::   - notifications (通知表)
::   - ... (共 20+ 张表)
:: 首次启动项目或重置数据时需要运行
:: ===========================================================================

:init_db
echo.
echo ============================================================================
echo   数据库初始化
:: ===========================================================================
echo.
echo   目录：server/
echo   命令：npm run init-db
echo.
echo   操作:
echo     - 创建 20+ 张数据表结构
echo     - 初始化系统配置
echo     - 创建默认管理员账号
echo.
echo   默认账号:
echo     用户名：admin
echo     密码：Admin@123456
echo.
cd /d "%~dp0server"
call npm run init-db
echo.
echo   数据库初始化完成
pause
goto menu

:: ===========================================================================
:: [6] 填充种子数据
:: ---------------------------------------------------------------------------
:: 执行 `npm run seed`，在 server/ 目录下运行
:: 生成测试数据用于开发和演示：
::   - 25 篇测试帖子 (图文/视频/问答/投票)
::   - 125-625 条评论 (每帖 5-25 条)
::   - 测试用户账号 (user1, user2, moderator)
::   - AI 用户账号 (ai_artist)
:: 适合快速填充数据测试功能
:: ===========================================================================

:seed_db
echo.
echo ============================================================================
echo   填充种子数据
:: ===========================================================================
echo.
echo   目录：server/
echo   命令：npm run seed
echo.
echo   生成数据:
echo     - 25 篇测试帖子
echo     - 125-625 条评论
echo     - 测试用户账号
echo     - AI 创作者账号
echo.
cd /d "%~dp0server"
call npm run seed
echo.
echo   种子数据填充完成
echo.
echo   测试账号:
echo     admin / Admin@123456
echo     user1 / Test@123456
echo     ai_artist / Test@123456
pause
goto menu

:: ===========================================================================
:: [7] 后端测试
:: ---------------------------------------------------------------------------
:: 执行 `npm test`，在 server/ 目录下运行
:: 使用 Vitest 测试框架运行单元测试：
::   - 数据库操作测试
::   - 服务层逻辑测试
::   - API 端点测试
:: 测试文件位于 server/test/ 目录
:: 建议每次修改后端代码后运行
:: ===========================================================================

:test_backend
echo.
echo ============================================================================
echo   后端测试 (Vitest)
:: ===========================================================================
echo.
echo   目录：server/
echo   命令：npm test
echo   框架：Vitest
echo.
echo   测试范围:
echo     - 数据库操作
echo     - 服务层逻辑
echo     - API 端点响应
echo.
cd /d "%~dp0server"
call npm test
echo.
pause
goto menu

:: ===========================================================================
:: [8] 快速清理
:: ---------------------------------------------------------------------------
:: 删除以下目录以释放磁盘空间：
::   root/node_modules     -- 根目录依赖 (较小)
::   my-app/node_modules   -- 前端依赖 (约 300MB)
::   server/node_modules   -- 后端依赖 (约 150MB)
:: 注意：不删除 package-lock.json
:: 清理后需重新运行 [9] 安装依赖
:: ===========================================================================

:clean
echo.
echo ============================================================================
echo   快速清理 (删除 node_modules)
:: ===========================================================================
echo.
echo   将删除以下目录:
echo     - node_modules/          (根目录)
echo     - my-app/node_modules/   (前端)
echo     - server/node_modules/   (后端)
echo.
echo   注意：不删除 package-lock.json
echo.

set /P "confirm=确认清理？输入 Y 继续："
if /I not "%confirm%"=="Y" (
    echo   已取消
    pause
    goto menu
)

echo.
echo   清理中...
echo.

if exist "%~dp0node_modules" (
    rmdir /s /q "%~dp0node_modules"
    echo   [已删除] node_modules/
) else (
    echo   [跳过]   node_modules/ 不存在
)

if exist "%~dp0my-app\node_modules" (
    rmdir /s /q "%~dp0my-app\node_modules"
    echo   [已删除] my-app/node_modules/
) else (
    echo   [跳过]   my-app/node_modules/ 不存在
)

if exist "%~dp0server\node_modules" (
    rmdir /s /q "%~dp0server\node_modules"
    echo   [已删除] server/node_modules/
) else (
    echo   [跳过]   server/node_modules/ 不存在
)

echo.
echo   清理完成
echo   如需重新安装依赖，请选择 [9]
pause
goto menu

:: ===========================================================================
:: [9] 安装所有依赖
:: ---------------------------------------------------------------------------
:: 在三个目录依次执行 `npm install`：
::   1. 根目录 - 共享工具和配置
::   2. my-app/ - 前端依赖 (React/Vite/Tailwind)
::   3. server/ - 后端依赖 (Express/JWT/Bcrypt)
:: 首次克隆项目后或清理缓存后需要运行
:: npm 会从 package-lock.json 锁定版本
:: ===========================================================================

:install_deps
echo.
echo ============================================================================
echo   安装所有依赖
:: ===========================================================================
echo.
echo   安装范围:
echo     1. 根目录 (共享工具)
echo     2. my-app/ (前端依赖)
echo     3. server/ (后端依赖)
echo.
echo   提示：npm 会从 package-lock.json 锁定版本
echo.

echo.
echo   [1/3] 安装根目录依赖...
cd /d "%~dp0"
call npm install

echo.
echo   [2/3] 安装前端依赖...
cd /d "%~dp0my-app"
call npm install

echo.
echo   [3/3] 安装后端依赖...
cd /d "%~dp0server"
call npm install

echo.
echo ============================================================================
echo   依赖安装完成
echo ============================================================================
pause
goto menu

:: ===========================================================================
:: [0] 查看项目状态
:: ---------------------------------------------------------------------------
:: 检查并显示以下信息：
::   - Node.js 和 npm 版本
::   - 前端/后端依赖安装状态
::   - 前端/后端构建产物存在状态
::   - 项目目录路径
:: 适合快速确认项目环境和构建进度
:: ===========================================================================

:show_status
echo.
echo ============================================================================
echo   项目状态
:: ===========================================================================
echo.
echo   项目目录：%~dp0
echo.
echo   ---- 环境信息 ----
echo   Node.js:
call node --version
echo   npm:
call npm --version
echo.
echo   ---- 依赖安装状态 ----
if exist "%~dp0my-app\node_modules" (echo   前端依赖：[已安装]) else (echo   前端依赖：[未安装])
if exist "%~dp0server\node_modules" (echo   后端依赖：[已安装]) else (echo   后端依赖：[未安装])
echo.
echo   ---- 构建产物状态 ----
if exist "%~dp0my-app\dist" (echo   前端构建：[存在]) else (echo   前端构建：[不存在])
if exist "%~dp0server\dist" (echo   后端构建：[存在]) else (echo   后端构建：[不存在])
echo.
echo   ---- 测试账号 ----
echo   admin / Admin@123456 (管理员)
echo   user1 / Test@123456 (普通用户)
echo   ai_artist / Test@123456 (AI 创作者)
echo.
echo ============================================================================
echo   按任意键返回菜单...
echo ============================================================================
pause
goto menu
