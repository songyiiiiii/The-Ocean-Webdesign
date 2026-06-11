/**
 * 渤海海水水质数据导入脚本
 * 用法: node scripts/import_bohai.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATA_DIR = path.join(__dirname, '..', 'bohai_data');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    if (vals.length === headers.length) rows.push(vals);
  }
  return { headers, rows };
}

async function importRawData(conn) {
  console.log('📥 导入原始监测数据...');
  const filePath = path.join(DATA_DIR, '01_raw_data.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  console.log(`   总行数: ${lines.length - 1}`);

  // 先建表
  await conn.query(`DROP TABLE IF EXISTS bohai_raw`);
  await conn.query(`
    CREATE TABLE bohai_raw (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source_layer VARCHAR(120),
      year INT,
      month INT,
      lon DECIMAL(16,12),
      lat DECIMAL(16,12),
      offshore_km DECIMAL(12,4),
      zone VARCHAR(10),
      quality_class VARCHAR(10),
      ph DECIMAL(10,3),
      dissolved_oxygen DECIMAL(10,3),
      cod DECIMAL(10,3),
      inorganic_nitrogen DECIMAL(12,6),
      active_phosphate DECIMAL(12,6),
      petroleum DECIMAL(12,6),
      site VARCHAR(20),
      city_cn VARCHAR(50),
      province_cn VARCHAR(50),
      sea_cn VARCHAR(50),
      INDEX idx_year (year),
      INDEX idx_zone (zone),
      INDEX idx_quality (quality_class),
      INDEX idx_coords (lon, lat),
      INDEX idx_offshore (offshore_km)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const BATCH = 500;
  let batch = [];
  let totalImported = 0;

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    if (vals.length < 18) continue;

    batch.push([
      vals[0], parseInt(vals[1]), parseInt(vals[2]),
      parseFloat(vals[3]), parseFloat(vals[4]), parseFloat(vals[5]),
      vals[6], vals[7],
      parseFloat(vals[8]), parseFloat(vals[9]), parseFloat(vals[10]),
      parseFloat(vals[11]), parseFloat(vals[12]), parseFloat(vals[13]),
      vals[14], vals[15], vals[16], vals[17]
    ]);

    if (batch.length >= BATCH) {
      await conn.query(
        `INSERT INTO bohai_raw (source_layer,year,month,lon,lat,offshore_km,zone,quality_class,ph,dissolved_oxygen,cod,inorganic_nitrogen,active_phosphate,petroleum,site,city_cn,province_cn,sea_cn) VALUES ?`,
        [batch]
      );
      totalImported += batch.length;
      process.stdout.write(`\r   已导入: ${totalImported} 条`);
      batch = [];
    }
  }

  // 导入剩余
  if (batch.length > 0) {
    await conn.query(
      `INSERT INTO bohai_raw (source_layer,year,month,lon,lat,offshore_km,zone,quality_class,ph,dissolved_oxygen,cod,inorganic_nitrogen,active_phosphate,petroleum,site,city_cn,province_cn,sea_cn) VALUES ?`,
      [batch]
    );
    totalImported += batch.length;
  }

  console.log(`\n✅ 原始数据导入完成: ${totalImported} 条`);
}

async function importAggregated(conn) {
  console.log('\n📥 导入聚合统计数据...');

  // 区域统计 — 32个CSV列 + 1个自增ID = 33个表列
  console.log('  导入区域统计...');
  await conn.query(`DROP TABLE IF EXISTS bohai_zone_stats`);
  await conn.query(`
    CREATE TABLE bohai_zone_stats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      zone VARCHAR(10), point_count INT,
      ph_avg DOUBLE, ph_std DOUBLE, ph_median DOUBLE, ph_min DOUBLE, ph_max DOUBLE,
      do_avg DOUBLE, do_std DOUBLE, do_median DOUBLE, do_min DOUBLE, do_max DOUBLE,
      cod_avg DOUBLE, cod_std DOUBLE, cod_median DOUBLE, cod_min DOUBLE, cod_max DOUBLE,
      nitrogen_avg DOUBLE, nitrogen_std DOUBLE, nitrogen_median DOUBLE, nitrogen_min DOUBLE, nitrogen_max DOUBLE,
      phosphate_avg DOUBLE, phosphate_std DOUBLE, phosphate_median DOUBLE, phosphate_min DOUBLE, phosphate_max DOUBLE,
      petroleum_avg DOUBLE, petroleum_std DOUBLE, petroleum_median DOUBLE, petroleum_min DOUBLE, petroleum_max DOUBLE
    )
  `);
  const zoneCSV = parseCSV(fs.readFileSync(path.join(DATA_DIR, '02_zone_statistics.csv'), 'utf8'));
  const zonePlaceholders = zoneCSV.rows[0].map(() => '?').join(',');
  for (const row of zoneCSV.rows) {
    await conn.query(`INSERT INTO bohai_zone_stats (zone,point_count,ph_avg,ph_std,ph_median,ph_min,ph_max,do_avg,do_std,do_median,do_min,do_max,cod_avg,cod_std,cod_median,cod_min,cod_max,nitrogen_avg,nitrogen_std,nitrogen_median,nitrogen_min,nitrogen_max,phosphate_avg,phosphate_std,phosphate_median,phosphate_min,phosphate_max,petroleum_avg,petroleum_std,petroleum_median,petroleum_min,petroleum_max) VALUES (${zonePlaceholders})`, row);
  }

  // 年度统计 — 7列
  console.log('  导入年度统计...');
  await conn.query(`DROP TABLE IF EXISTS bohai_yearly_stats`);
  await conn.query(`
    CREATE TABLE bohai_yearly_stats (
      year INT PRIMARY KEY, point_count INT,
      ph_avg DOUBLE, do_avg DOUBLE, cod_avg DOUBLE,
      nitrogen_avg DOUBLE, phosphate_avg DOUBLE, petroleum_avg DOUBLE
    )
  `);
  const yearlyCSV = parseCSV(fs.readFileSync(path.join(DATA_DIR, '03_yearly_statistics.csv'), 'utf8'));
  for (const row of yearlyCSV.rows) {
    await conn.query(`INSERT INTO bohai_yearly_stats (year,point_count,ph_avg,do_avg,cod_avg,nitrogen_avg,phosphate_avg,petroleum_avg) VALUES (?,?,?,?,?,?,?,?)`, row);
  }

  // 月度统计 — 7列
  console.log('  导入月度统计...');
  await conn.query(`DROP TABLE IF EXISTS bohai_monthly_stats`);
  await conn.query(`
    CREATE TABLE bohai_monthly_stats (
      month INT PRIMARY KEY, point_count INT,
      ph_avg DOUBLE, do_avg DOUBLE, cod_avg DOUBLE,
      nitrogen_avg DOUBLE, phosphate_avg DOUBLE, petroleum_avg DOUBLE
    )
  `);
  const monthlyCSV = parseCSV(fs.readFileSync(path.join(DATA_DIR, '04_monthly_statistics.csv'), 'utf8'));
  for (const row of monthlyCSV.rows) {
    await conn.query(`INSERT INTO bohai_monthly_stats (month,point_count,ph_avg,do_avg,cod_avg,nitrogen_avg,phosphate_avg,petroleum_avg) VALUES (?,?,?,?,?,?,?,?)`, row);
  }

  // 距离梯度 — 3列
  console.log('  导入距离梯度统计...');
  await conn.query(`DROP TABLE IF EXISTS bohai_distance_gradient`);
  await conn.query(`
    CREATE TABLE bohai_distance_gradient (
      id INT AUTO_INCREMENT PRIMARY KEY,
      indicator VARCHAR(30), distance_range VARCHAR(20), avg_val DOUBLE
    )
  `);
  const gradCSV = parseCSV(fs.readFileSync(path.join(DATA_DIR, '05_distance_gradient.csv'), 'utf8'));
  for (const row of gradCSV.rows) {
    await conn.query(`INSERT INTO bohai_distance_gradient (indicator,distance_range,avg_val) VALUES (?,?,?)`, row);
  }

  // 水质类别统计 — 4列
  console.log('  导入水质类别统计...');
  await conn.query(`DROP TABLE IF EXISTS bohai_quality_stats`);
  await conn.query(`
    CREATE TABLE bohai_quality_stats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      zone VARCHAR(10), quality_class VARCHAR(10),
      point_count INT, pct DOUBLE
    )
  `);
  const qualCSV = parseCSV(fs.readFileSync(path.join(DATA_DIR, '06_quality_class_statistics.csv'), 'utf8'));
  for (const row of qualCSV.rows) {
    row[3] = parseFloat(row[3].replace('%', ''));
    await conn.query(`INSERT INTO bohai_quality_stats (zone,quality_class,point_count,pct) VALUES (?,?,?,?)`, row);
  }

  console.log('✅ 聚合数据导入完成');
}

async function main() {
  console.log('🌊 渤海海水水质数据导入工具\n');
  console.log(`数据库: ${process.env.DB_NAME}`);
  console.log(`主机: ${process.env.DB_HOST}\n`);

  const dbSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ocean_protection',
    ssl: dbSsl ? { rejectUnauthorized: false } : undefined
  });

  try {
    await importRawData(conn);
    await importAggregated(conn);
    console.log('\n🎉 全部数据导入完成!');
  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch(() => process.exit(1));
