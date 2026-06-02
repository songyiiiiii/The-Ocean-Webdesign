# 数据库连接设置指南

## 1. 安装MySQL

### Windows系统:
1. 下载MySQL安装包: https://dev.mysql.com/downloads/mysql/
2. 选择 "MySQL Installer for Windows"
3. 运行安装程序,选择 "Developer Default" 或 "Server only"
4. 在配置过程中:
   - 设置root密码(或留空)
   - 端口保持默认 3306
   - 启动MySQL服务

### 验证安装:
打开命令提示符(CMD)运行:
```bash
mysql --version
```

## 2. 创建数据库

### 方法1: 使用MySQL命令行
```bash
mysql -u root -p
```
然后执行:
```sql
source C:\Users\LENOVO\IdeaProjects\Webdesign\backend\init-database.sql
```

### 方法2: 使用MySQL Workbench
1. 打开MySQL Workbench
2. 连接到本地MySQL服务器
3. 打开 `backend/init-database.sql` 文件
4. 点击执行按钮

### 方法3: 让Node.js自动创建
直接启动后端服务器,它会自动创建数据库表:
```bash
cd backend
npm run dev
```

## 3. 配置已完成

你的 `.env` 文件已配置为:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ocean_protection
```

## 4. 启动项目

### 启动后端:
```bash
cd backend
npm run dev
```

### 启动前端:
```bash
cd frontend
npm run dev
```

## 5. 测试连接

访问: http://localhost:5000/api/health

如果看到 `{"status": "OK"}` 说明数据库连接成功!

## 常见问题

### MySQL服务未启动
Windows: 在服务管理器中启动 "MySQL" 服务
```bash
net start MySQL
```

### 连接被拒绝
检查MySQL是否在3306端口运行:
```bash
netstat -an | findstr 3306
```

### 密码错误
如果设置了密码,更新 `.env` 文件中的 `DB_PASSWORD`
