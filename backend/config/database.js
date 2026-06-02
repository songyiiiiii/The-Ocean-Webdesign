const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ocean_protection',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 转换为 Promise 形式
const promisePool = pool.promise();

// 测试连接
async function testConnection() {
  try {
    const [rows] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('✅ MySQL 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error.message);
    return false;
  }
}

testConnection();

module.exports = promisePool;