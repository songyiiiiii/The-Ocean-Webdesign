# 蔚蓝守护 - 海洋环境保护平台

## 项目概述

海洋环境保护主题的全栈 Web 应用。前端采用深海暗色主题，具备 Three.js 3D 海洋场景、Mapbox 3D 地球、滚动驱动动画、实时数据仪表盘等交互效果。后端提供用户认证、污染数据 API 和 WebSocket 实时推送。

## 线上地址

| 组件 | URL |
|------|-----|
| 前端 | https://songyiiiiii.github.io/The-Ocean-Webdesign/ocean-guardian.html |
| 后端 API | https://ocean-webdesign-api.onrender.com/api |
| 健康检查 | https://ocean-webdesign-api.onrender.com/api/health |

## 部署架构

```
GitHub Pages (前端静态文件)
    │
    └─ GitHub Actions (pages.yml)
         └─ 自动部署 frontend/ 目录到 gh-pages 分支

Render (后端 Express)
    │
    ├─ WebSocket (Socket.io) 实时数据推送
    └─ TiDB Cloud (MySQL 兼容, Singapore 节点)
```

## 技术栈

### 前端（独立单文件版）
- 原生 HTML/CSS/JS，无需构建，CDN 加载依赖
- Three.js（3D 设备模型渲染 + OrbitControls）
- Mapbox GL JS v3（3D 地球 + 地图可视化）
- Tailwind CSS CDN（样式）
- Iconify（图标）
- Chart.js（图表）

### 后端
- Node.js + Express 4
- MySQL/TiDB（mysql2 + 连接池）
- Socket.io（WebSocket 实时数据广播）
- JWT 认证（jsonwebtoken + bcryptjs）
- CSV 导入支持（csv-parse）

## 目录结构

```
Webdesign/
├── README.md
├── .gitignore
├── .github/workflows/
│   └── pages.yml                     # GitHub Pages 自动部署
│
├── frontend/                         # 前端项目
│   ├── package.json                  # 静态文件服务器 (node server.js)
│   ├── server.js                     # 简单 HTTP 服务器 (localhost:3000)
│   ├── app-config.js                 # API 地址配置 (git 跟踪，部署时自动覆盖)
│   ├── mapbox-config.js              # Mapbox Token (由 GitHub Secret 注入)
│   │
│   ├── ocean-guardian.html           # ★ 主页面（全套交互）
│   ├── ocean-guardian-bohai.html     # 渤海数据详情页
│   ├── ocean-guardian-norway.html    # 挪威海峡数据详情页
│   ├── ocean-guardian-microplastics.html  # 全球微塑料数据页
│   ├── ocean-forum.html              # 海洋论坛
│   ├── user-profile.html             # 用户中心
│   │
│   └── public/
│       ├── ocean-bg.mp4              # 背景视频 (2.7MB 压缩)
│       ├── ocean-hero.mp4            # 首屏 hero 视频 (488KB)
│       ├── ocean-tran.mp4            # 过渡层视频 (557KB)
│       ├── avatars/                  # 用户头像素材
│       ├── device/                   # 设备 3D 模型 + 展示视频
│       └── species/                  # 海洋生物素材
│
├── backend/                          # 后端项目
│   ├── package.json                  # 依赖：express, mysql2, socket.io, jwt
│   ├── server.js                     # Express 服务入口 + WebSocket
│   ├── .env.example                  # 环境变量模板
│   ├── init-database.sql             # MySQL 数据库初始化脚本
│   │
│   ├── config/
│   │   └── database.js              # 数据库连接池（支持 SSL）
│   │
│   ├── middleware/
│   │   └── auth.js                  # JWT 认证中间件
│   │
│   ├── models/
│   │   ├── User.js                  # 用户模型
│   │   ├── Pollution.js             # 污染热点模型（含 mock 降级）
│   │   ├── Bohai.js                 # 渤海数据模型（含 mock 降级）
│   │   ├── Norway.js                # 挪威海峡模型（含 mock 降级）
│   │   └── GlobalMicroplastics.js   # 全球微塑料模型（含 mock 降级）
│   │
│   └── routes/
│       ├── auth.js                  # 认证路由 (注册/登录/用户信息)
│       ├── pollution.js             # 污染热点路由
│       ├── bohai.js                 # 渤海数据路由
│       ├── norway.js                # 挪威数据路由
│       ├── global_microplastics.js  # 微塑料数据路由
│       ├── domestic.js              # 国内数据路由
│       └── alerts.js                # 告警规则路由
│
└── src/                              # 遗留文件，可忽略
```

## 快速启动

### 前端

```bash
cd frontend
npm install && npm start
# 打开 http://localhost:3000
```

### 后端

```bash
cd backend
cp .env.example .env   # 编辑 .env 填入本地 MySQL 连接信息
npm install && npm start
# http://localhost:5000/api/health
```

### .env 示例

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ocean_protection
JWT_SECRET=your_secret
```

## 云部署（Render + TiDB Cloud）

当前线上部署配置：

| 变量 | 值 |
|------|-----|
| `PORT` | `5000` |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | 通过 Render 环境变量注入 |
| `FRONTEND_URL` | `https://songyiiiiii.github.io` |

数据库使用 TiDB Cloud Serverless Tier（MySQL 8.0 兼容，5GB 免费存储，Singapore 节点）。

### 数据库降级策略

所有数据模型（Pollution、Bohai、Norway、GlobalMicroplastics）内置 `safeQuery` 机制：
- 数据库连通时 → 返回 TiDB 真实数据
- 数据库断开时 → 5 秒超时后自动切换 mock 本地数据
- 地图点位、统计图表等均不受影响

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/health` | 健康检查（含数据库/TCP 诊断） | 否 |
| GET | `/api/stations` | 监测站点列表 | 否 |
| GET | `/api/realtime` | 实时传感器数据 | 否 |
| GET | `/api/data/history` | 历史数据查询 | 否 |
| GET | `/api/data/export` | 数据导出 (CSV/JSON) | 否 |
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 → JWT | 否 |
| GET | `/api/auth/me` | 当前用户信息 | 是 |
| PUT | `/api/auth/location` | 更新用户位置 | 是 |
| GET | `/api/pollution/hotspots` | 污染热点列表 | 否 |
| GET | `/api/pollution/stats` | 污染统计数据 | 否 |
| GET | `/api/pollution/region/:name` | 区域污染详情 | 否 |
| GET | `/api/bohai/overview` | 渤海数据概览 | 否 |
| GET | `/api/bohai/map-points` | 渤海地图采样点 | 否 |
| GET | `/api/norway/overview` | 挪威海峡概览 | 否 |
| GET | `/api/norway/map-points` | 挪威地图采样点 | 否 |
| GET | `/api/microplastics/overview` | 全球微塑料概览 | 否 |
| GET | `/api/microplastics/map-points` | 微塑料地图采样点 | 否 |
| GET | `/api/alerts/rules` | 告警规则列表 | 是 |

认证方式：请求头 `Authorization: Bearer <token>`

WebSocket 端点：`wss://ocean-webdesign-api.onrender.com`（需 token 认证）

## 设计系统

项目使用统一的深海暗色设计系统：

| 类名 | 用途 |
|------|------|
| `.tactile-base` | 主卡片表面（深色渐变 + 微光内阴影） |
| `.tactile-glass` | 玻璃拟态面板（模糊 + 渐变） |
| `.tactile-inset` | 凹陷/内嵌元素 |
| `.btn-physical-light` | 亮色 3D 按钮（青色，按下有位移） |
| `.btn-physical-dark` | 暗色 3D 按钮 |
| `.nav-glass` | 导航栏玻璃效果 |
| `.scroll-animate` | 滚动触发动画元素（配合 IntersectionObserver） |

色系：背景 `#020a14`，主色 cyan `#06b6d4`，次色 emerald/lime

## 关键架构说明

1. **前端** 6 个独立 HTML 文件，共用 CDN 依赖，无需构建工具
2. **视频优化**：20MB → 5.4MB（ffmpeg 压缩），首屏仅加载 hero 视频，后台延时预加载其余视频
3. **3D 设备展示**：Three.js + GLTFLoader + OrbitControls，支持交互旋转/缩放
4. **Mapbox 3D 地球**：各数据页使用 Globe 投影 + 热力图/散点图层
5. **认证流程**：JWT token 存 localStorage，请求自动附加 Authorization header
6. **WebSocket**：Socket.io 每 3 秒广播 6 个站点的实时传感器数据
7. **数据库降级**：所有模型内置 mock fallback，数据库不可用时自动切换
8. **GitHub Pages 部署**：Actions 将 frontend/ 发布到 gh-pages，Secret 注入 Mapbox Token
