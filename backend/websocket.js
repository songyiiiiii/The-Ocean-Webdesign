// backend/websocket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./config/database');

let io;

function initWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    }
  });

  // JWT 认证中间件
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.id;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}, User: ${socket.userId}`);

    // 订阅实时数据
    socket.on('subscribe:stations', (stationIds) => {
      socket.join('realtime');
      console.log(`User ${socket.userId} subscribed to realtime data`);
    });

    socket.on('unsubscribe:stations', () => {
      socket.leave('realtime');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// 广播实时传感器数据
function broadcastSensorData(data) {
  if (io) {
    io.to('realtime').emit('sensor:update', data);
  }
}

// 广播告警
function broadcastAlert(alert) {
  if (io) {
    io.emit('alert:new', alert);
  }
}

module.exports = { initWebSocket, broadcastSensorData, broadcastAlert };