const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();

// 中间件
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// 测试数据库连接
const db = require('./config/database');

// ========== WebSocket 初始化 ==========
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length
      ? allowedOrigins
      : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5500'],
    credentials: true
  }
});

// WebSocket 认证中间件（使用与你 auth 中间件相同的方式）
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.userId;  // 使用 userId 保持一致
    next();
  });
});

// WebSocket 连接处理
io.on('connection', (socket) => {
  console.log(`🔌 WebSocket 客户端连接: ${socket.id}, 用户ID: ${socket.userId}`);

  socket.on('subscribe:stations', (stationIds) => {
    socket.join('realtime');
    console.log(`用户 ${socket.userId} 订阅了实时数据`);
  });

  socket.on('unsubscribe:stations', () => {
    socket.leave('realtime');
  });

  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket 客户端断开: ${socket.id}`);
  });
});

// 广播实时传感器数据的函数
function broadcastSensorData(data) {
  io.to('realtime').emit('sensor:update', data);
}

// 广播告警的函数
function broadcastAlert(alert) {
  io.emit('alert:new', alert);
}

// 导出供其他模块使用
app.set('io', io);
app.set('broadcastSensorData', broadcastSensorData);
app.set('broadcastAlert', broadcastAlert);

// ========== 原有路由 ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pollution', require('./routes/pollution'));
app.use('/api/bohai', require('./routes/bohai'));
app.use('/api/norway', require('./routes/norway'));
app.use('/api/microplastics', require('./routes/global_microplastics'));
app.use('/api/domestic', require('./routes/domestic'));

// ========== 新增：告警规则路由 ==========
const alertRoutes = require('./routes/alerts');
app.use('/api/alerts', alertRoutes);

// ========== 站点数据 ==========
const stations = [
  { station_id: 'SCS-07', station_name: 'South China Sea', lat: 16.5, lng: 114.3 },
  { station_id: 'PAC-03', station_name: 'Pacific Ocean', lat: 22.3, lng: -145.7 },
  { station_id: 'ATL-12', station_name: 'Atlantic Ocean', lat: 35.6, lng: -40.0 },
  { station_id: 'IND-05', station_name: 'Indian Ocean', lat: -8.4, lng: 72.5 },
  { station_id: 'MED-08', station_name: 'Mediterranean', lat: 37.0, lng: 15.0 },
  { station_id: 'ARC-01', station_name: 'Arctic', lat: 78.0, lng: 5.0 }
];

// 存储历史数据
let sensorHistory = {};

// 模拟实时传感器数据推送（每3秒）
setInterval(() => {
  const now = new Date().toISOString();

  stations.forEach(station => {
    const data = {
      station_id: station.station_id,
      station_name: station.station_name,
      temperature: Number((14 + Math.random() * 12).toFixed(1)),
      ph: Number((7.8 + Math.random() * 0.6).toFixed(2)),
      dissolved_oxygen: Number((5 + Math.random() * 4).toFixed(1)),
      salinity: Number((32 + Math.random() * 5).toFixed(1)),
      pollution_index: Number((15 + Math.random() * 60).toFixed(0)),
      timestamp: now
    };

    if (!sensorHistory[station.station_id]) {
      sensorHistory[station.station_id] = [];
    }
    sensorHistory[station.station_id].unshift(data);
    if (sensorHistory[station.station_id].length > 100) {
      sensorHistory[station.station_id].pop();
    }

    broadcastSensorData(data);
    checkAlerts(data).catch(console.error);
  });

  console.log(`📡 已广播 ${stations.length} 个站点的实时数据`);
}, 3000);

// 检查告警规则
let checkAlertsDbDown = false;
async function checkAlerts(sensorData) {
  try {
    const [rules] = await db.query(
      'SELECT * FROM alert_rules WHERE is_active = 1'
    );
    checkAlertsDbDown = false;

    for (const rule of rules) {
      let triggered = false;
      let actualValue = null;

      switch (rule.parameter) {
        case 'temperature':
          actualValue = sensorData.temperature;
          break;
        case 'ph':
          actualValue = sensorData.ph;
          break;
        case 'dissolved_oxygen':
          actualValue = sensorData.dissolved_oxygen;
          break;
        case 'pollution_index':
          actualValue = sensorData.pollution_index;
          break;
        default:
          continue;
      }

      switch (rule.operator) {
        case '>':
          triggered = actualValue > rule.threshold;
          break;
        case '<':
          triggered = actualValue < rule.threshold;
          break;
        case '>=':
          triggered = actualValue >= rule.threshold;
          break;
        case '<=':
          triggered = actualValue <= rule.threshold;
          break;
        case '==':
          triggered = Math.abs(actualValue - rule.threshold) < 0.01;
          break;
      }

      if (triggered) {
        const alertMessage = `⚠️ 告警: ${rule.name} - ${sensorData.station_name} 的 ${getParameterName(rule.parameter)} 为 ${actualValue}${getUnit(rule.parameter)}，超过阈值 ${rule.threshold}`;

        await db.query(
          `INSERT INTO alert_history (user_id, rule_id, station_id, message, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [rule.user_id, rule.id, sensorData.station_id, alertMessage]
        );

        broadcastAlert({
          id: Date.now(),
          rule_id: rule.id,
          rule_name: rule.name,
          station_id: sensorData.station_id,
          station_name: sensorData.station_name,
          parameter: rule.parameter,
          actual_value: actualValue,
          threshold: rule.threshold,
          message: alertMessage,
          timestamp: new Date().toISOString()
        });

        console.log(`🔔 告警触发: ${alertMessage}`);
      }
    }
  } catch (error) {
    if (!checkAlertsDbDown) {
      console.warn('检查告警规则失败（已切换本地数据）:', error.message);
      checkAlertsDbDown = true;
    }
  }
}

function getParameterName(param) {
  const names = {
    temperature: '温度',
    ph: 'pH值',
    dissolved_oxygen: '溶解氧',
    pollution_index: '污染指数'
  };
  return names[param] || param;
}

function getUnit(param) {
  const units = {
    temperature: '°C',
    ph: '',
    dissolved_oxygen: 'mg/L',
    pollution_index: ''
  };
  return units[param] || '';
}

// ========== 健康检查 ==========
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  let dbCode = '';
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    dbStatus = rows[0].ok === 1 ? 'connected' : 'error';
  } catch (e) {
    dbStatus = 'disconnected: ' + e.message;
    dbCode = e.code || '';
  }

  // 原始 TCP 连通性测试
  let tcpStatus = 'unknown';
  try {
    const net = require('net');
    await new Promise((resolve, reject) => {
      const s = net.connect({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306)
      }, () => { s.end(); resolve(); });
      s.on('error', reject);
      s.setTimeout(8000, () => { s.destroy(); reject(new Error('TCP timeout')); });
    });
    tcpStatus = 'reachable';
  } catch (e) {
    tcpStatus = 'blocked: ' + e.message;
  }

  res.json({
    status: 'OK',
    message: '海洋保护API运行正常',
    version: '2.0.1',
    database: dbStatus,
    dbCode: dbCode,
    dbName: process.env.DB_NAME || 'ocean_protection',
    tcpToDb: tcpStatus,
    dbTarget: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`,
    websocket: true
  });
});

// 调试端点：检查真实数据表状态和聚合结果
app.get('/api/debug/pollution-source', async (req, res) => {
  const info = {};
  try {
    const [dbName] = await db.query('SELECT DATABASE() AS db');
    info.current_db = dbName[0].db;
  } catch (e) { info.current_db = 'error: ' + e.message; }

  const tables = ['bohai_raw', 'norway_organic', 'norway_microplastic', 'global_microplastics', 'pollution_data'];
  for (const table of tables) {
    try {
      const [cnt] = await db.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
      info[table] = { count: cnt[0].cnt };
    } catch (e) { info[table] = { error: e.message }; }
  }

  try {
    const Pollution = require('./models/Pollution');
    const aggregated = await Pollution.getAll();
    info.aggregated = { count: aggregated.length, sources: aggregated.map(r => r.region) };
  } catch (e) { info.aggregated = { error: e.message }; }

  res.json(info);
});

// ========== 历史数据查询 API ==========
app.get('/api/data/history', async (req, res) => {
  const { station_id, start_date, end_date, limit = 100 } = req.query;

  try {
    let history = sensorHistory[station_id] || [];

    if (start_date) {
      history = history.filter(item => item.timestamp >= start_date);
    }
    if (end_date) {
      history = history.filter(item => item.timestamp <= end_date);
    }

    history = history.slice(0, parseInt(limit));

    res.json({
      station_id,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('查询历史数据失败:', error);
    res.status(500).json({ message: '查询失败' });
  }
});

// ========== 数据导出 API ==========
app.get('/api/data/export', async (req, res) => {
  const { station_id, start_date, end_date, format = 'csv' } = req.query;

  try {
    let data = sensorHistory[station_id] || [];

    if (start_date) {
      data = data.filter(item => item.timestamp >= start_date);
    }
    if (end_date) {
      data = data.filter(item => item.timestamp <= end_date);
    }

    if (format === 'csv') {
      const headers = ['timestamp', 'station_id', 'station_name', 'temperature', 'ph', 'dissolved_oxygen', 'salinity', 'pollution_index'];
      const csvRows = [headers.join(',')];

      for (const row of data) {
        const values = headers.map(header => {
          let val = row[header] || '';
          if (typeof val === 'string' && val.includes(',')) {
            val = `"${val}"`;
          }
          return val;
        });
        csvRows.push(values.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ocean_data_${Date.now()}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      res.json({
        export_time: new Date().toISOString(),
        station_id,
        count: data.length,
        data
      });
    }
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ message: '导出失败' });
  }
});

// ========== 站点列表 API ==========
app.get('/api/stations', (req, res) => {
  res.json(stations);
});

// ========== 实时数据 API ==========
app.get('/api/realtime', (req, res) => {
  const realtimeData = {};
  for (const station of stations) {
    if (sensorHistory[station.station_id] && sensorHistory[station.station_id][0]) {
      realtimeData[station.station_id] = sensorHistory[station.station_id][0];
    }
  }
  res.json(realtimeData);
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 5000;

async function initializeDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(255) DEFAULT NULL,
      region VARCHAR(50) DEFAULT NULL,
      lat DECIMAL(10, 8) DEFAULT NULL,
      lng DECIMAL(11, 8) DEFAULT NULL,
      location_updated_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createPollutionTable = `
    CREATE TABLE IF NOT EXISTS pollution_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      region VARCHAR(50) UNIQUE NOT NULL,
      pollution_index INT NOT NULL CHECK (pollution_index >= 0 AND pollution_index <= 100),
      microplastic_level INT DEFAULT 0,
      chemical_level INT DEFAULT 0,
      lat DECIMAL(10, 8) NOT NULL,
      lng DECIMAL(11, 8) NOT NULL,
      zoom INT DEFAULT 5,
      affected_species JSON,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_region (region)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createAlertRulesTable = `
    CREATE TABLE IF NOT EXISTS alert_rules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      parameter VARCHAR(50) NOT NULL,
      operator VARCHAR(10) NOT NULL,
      threshold DECIMAL(10, 2) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createAlertHistoryTable = `
    CREATE TABLE IF NOT EXISTS alert_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      rule_id INT NOT NULL,
      station_id VARCHAR(20),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await db.query(createUsersTable);
  try { await db.query(`ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT NULL AFTER password`); } catch (e) { /* column may already exist */ }
  await db.query(createPollutionTable);
  await db.query(createAlertRulesTable);
  await db.query(createAlertHistoryTable);

  const [rows] = await db.query('SELECT COUNT(*) as count FROM pollution_data');
  if (rows[0].count === 0) {
    const insertData = `
      INSERT INTO pollution_data (region, pollution_index, microplastic_level, chemical_level, lat, lng, zoom, affected_species)
      VALUES
        ('渤海', 83, 76, 89, 38.5, 119.5, 6, '["斑海豹", "中国对虾", "小黄鱼"]'),
        ('挪威海峡', 67, 58, 72, 63.0, 8.0, 5, '["虎鲸", "大西洋鲑", "北极鳕"]'),
        ('北海', 52, 48, 55, 56.0, 3.0, 5, '["港湾鼠海豚", "欧洲鳗鲡"]'),
        ('地中海', 44, 42, 46, 37.0, 15.0, 5, '["僧海豹", "蓝鳍金枪鱼"]'),
        ('其他海域', 38, 35, 40, 30.0, 140.0, 3, '["多种海洋生物"]')
    `;
    await db.query(insertData);
    console.log('✅ 默认污染数据已插入');
  }
}

server.listen(PORT, async () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📡 HTTP API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);

  try {
    await initializeDatabase();
    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
});
