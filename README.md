# 蔚蓝守护 - 海洋环境保护平台

## 项目概述

海洋环境保护主题的全栈 Web 应用。前端采用深海暗色主题，具备 Three.js 3D 海洋场景、滚动驱动动画、实时数据仪表盘等交互效果。后端提供用户认证和污染数据 API。

## 技术栈

### 前端（React 版）
- React 18 + Vite 5
- Three.js / @react-three/fiber + @react-three/drei（3D 海洋场景）
- Tailwind CSS 3（样式）
- Framer Motion + GSAP ScrollTrigger（动画）
- ECharts（图表）
- Leaflet + React-Leaflet（地图）
- Axios（HTTP）
- React Router DOM 6（路由）

### 前端（独立单文件版）
- 原生 HTML/CSS/JS，无需构建
- Three.js（3D 海洋漩涡）
- Tailwind CSS CDN
- Lucide + Iconify（图标）

### 后端
- Node.js + Express 4
- MySQL（mysql2）
- JWT 认证（jsonwebtoken + bcryptjs）
- express-validator（校验）

## 目录结构

```
Webdesign/
├── README.md
├── .gitignore
│
├── frontend/                        # 前端项目
│   ├── package.json                 # 依赖：react, three, gsap, echarts, leaflet 等
│   ├── index.html                   # Vite 入口
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   ├── ocean-guardian.html          # ★ 独立单文件前端（完整交互，直接浏览器打开）
│   ├── nexus-ai-platform.html       # 设计参考文件（框架来源，勿修改）
│   │
│   ├── public/
│   │   └── ocean-bg.mp4            # 背景视频素材
│   │
│   └── src/
│       ├── main.jsx                 # React 入口
│       ├── App.jsx                  # 根组件（认证状态、3D场景、深度层切换）
│       ├── index.css                # 全局样式
│       ├── ocean-styles.css         # 海洋主题样式变量
│       │
│       ├── utils/
│       │   └── api.js              # Axios 封装（拦截器、认证、污染数据接口）
│       │
│       ├── components/
│       │   ├── Navbar.jsx          # 浮动玻璃导航栏
│       │   ├── AuthModal.jsx       # 登录/注册弹窗
│       │   ├── SplashScreen.jsx    # 启动加载屏
│       │   ├── OceanScene.jsx      # Three.js 3D 海洋主场景（相机随滚动下潜）
│       │   ├── OceanSurface.jsx    # 海面着色器网格
│       │   ├── Orca.jsx            # 虎鲸 3D 模型
│       │   ├── VolumetricLight.jsx # 体积光效果
│       │   ├── OceanParticles.jsx  # 海洋粒子系统
│       │   ├── DepthIndicator.jsx  # 深度指示器 UI
│       │   ├── DepthLayers.jsx     # 5层深度内容区（海面/透光/中层/深海/深渊）
│       │   ├── FullPageScroll.jsx  # 全屏滚动容器
│       │   ├── ParticleBackground.jsx
│       │   ├── OceanHero.jsx       # 英雄区组件
│       │   ├── MapSection.jsx      # 地图区块
│       │   ├── FoodChainSection.jsx# 食物链区块
│       │   ├── DeviceSection.jsx   # 设备区块
│       │   ├── StatsCard.jsx       # 统计卡片
│       │   ├── PollutionChart.jsx  # 污染图表（ECharts）
│       │   └── LocationUpload.jsx  # 位置上传组件
│       │
│       └── pages/
│           ├── Home.jsx            # 首页
│           ├── Map.jsx             # 污染地图页（Leaflet）
│           ├── FoodChain.jsx       # 食物链演示页
│           └── Device.jsx          # 设备监控页
│
├── backend/                         # 后端项目
│   ├── package.json                 # 依赖：express, mysql2, jwt, bcryptjs
│   ├── server.js                    # Express 服务入口
│   ├── init-database.sql            # MySQL 数据库初始化脚本
│   ├── config/                      # 配置目录（需 .env）
│   ├── middleware/
│   │   └── auth.js                 # JWT 认证中间件
│   ├── models/
│   │   ├── User.js                 # 用户模型
│   │   └── Pollution.js            # 污染数据模型
│   └── routes/
│       ├── auth.js                 # 认证路由（注册/登录/用户信息/位置更新）
│       └── pollution.js            # 污染数据路由（热点/区域/统计）
│
└── src/
    └── Main.java                    # 遗留文件，可忽略
```

## 快速启动

### 方式一：独立单文件版（推荐演示用）

直接浏览器打开 `frontend/ocean-guardian.html`，无需安装任何依赖。

包含完整的 12 个区块：导航、Three.js 英雄区、监测能力、数据管线、仪表盘、全球网络、架构、安全、API、评价、定价、页脚。所有动画和交互均可用。

### 方式二：React 开发模式

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 方式三：全栈运行

```bash
# 终端1 - 后端
cd backend
npm install
# 先执行 init-database.sql 初始化 MySQL 数据库
# 创建 .env 文件（见下方）
npm run dev    # http://localhost:3000

# 终端2 - 前端
cd frontend
npm install
npm run dev    # http://localhost:5173（API 代理到后端）
```

## 后端环境变量（.env）

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ocean_protection
JWT_SECRET=your_jwt_secret
PORT=3000
```

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册（username, email, password） | 否 |
| POST | `/api/auth/login` | 登录 → 返回 JWT token | 否 |
| GET | `/api/auth/me` | 获取当前用户信息 | 是 |
| PUT | `/api/auth/location` | 更新用户位置（region, lat, lng） | 是 |
| GET | `/api/pollution/hotspots` | 获取污染热点列表 | 否 |
| GET | `/api/pollution/region/:name` | 获取指定区域污染详情 | 否 |
| GET | `/api/pollution/stats` | 获取污染统计数据 | 否 |

认证方式：请求头 `Authorization: Bearer <token>`

## 设计系统

项目使用统一的深海暗色设计系统（定义在 ocean-guardian.html 和 ocean-styles.css 中）：

| 类名 | 用途 |
|------|------|
| `.tactile-base` | 主卡片表面（深色渐变 + 微光内阴影） |
| `.tactile-glass` | 玻璃拟态面板（模糊 + 渐变） |
| `.tactile-inset` | 凹陷/内嵌元素 |
| `.btn-physical-light` | 亮色 3D 按钮（青色，按下有位移） |
| `.btn-physical-dark` | 暗色 3D 按钮 |
| `.cmd-panel` | 仪表盘面板容器 |
| `.nav-glass` | 导航栏玻璃效果 |
| `.scroll-animate` | 滚动触发动画元素（配合 IntersectionObserver） |

色系：背景 `#020a14`，主色 cyan `#06b6d4` / `#22d3ee`，成功态 emerald

## 关键架构说明

1. **ocean-guardian.html** 是最终交付的独立前端，包含所有交互，CDN 加载依赖
2. **nexus-ai-platform.html** 是设计框架参考源文件，不要修改
3. **React 版前端**（src/ 目录）是开发迭代版本，使用 @react-three/fiber 实现 3D
4. **3D 场景核心逻辑**：OceanScene.jsx 通过 GSAP ScrollTrigger 驱动相机沿 Y 轴下潜，模拟从海面到深渊的探索
5. **认证流程**：JWT token 存 localStorage，Axios 拦截器自动附加 header，401 时清除本地存储
6. **数据库**：MySQL，通过 init-database.sql 初始化表结构
