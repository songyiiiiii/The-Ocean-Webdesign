const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT || 3306);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'ocean_protection';
const dbSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

console.log(`🔧 DB Config: ${dbUser}@${dbHost}:${dbPort}/${dbName} (SSL: ${dbSsl})`);

// 创建连接池
const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: false,
  connectionLimit: 3,
  queueLimit: 0,
  connectTimeout: 5000,
  ssl: dbSsl ? { rejectUnauthorized: false } : undefined
});

// 转换为 Promise 形式
const promisePool = pool.promise();

// 测试连接
async function testConnection() {
  try {
    console.log(`🔄 正在连接数据库 ${dbHost}:${dbPort}...`);
    const [rows] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('✅ MySQL 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error.message);
    console.error('   错误码:', error.code);
    console.error('   地址:', error.address, error.port);
    return false;
  }
}

testConnection();

module.exports = promisePool;
