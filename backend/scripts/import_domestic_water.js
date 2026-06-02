/**
 * 国内水质数据导入脚本 (RODCCS)
 * 用法: node scripts/import_domestic_water.js
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CSV_PATH = path.join(__dirname, '..', '国内', 'RODCCS_merged_data_v2.csv');

function parseFloatSafe(v) {
  if (!v || (typeof v === 'string' && v.trim() === '')) return null;
  const s = typeof v === 'string' ? v.trim() : String(v).trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseIntSafe(v) {
  if (!v || (typeof v === 'string' && v.trim() === '')) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

async function main() {
  console.log('国内水质数据导入工具 (RODCCS)\n');
  const content = fs.readFileSync(CSV_PATH, 'utf8');

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
    bom: true
  });

  console.log(`   记录数: ${records.length}\n`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ocean_protection'
  });

  await conn.query(`DROP TABLE IF EXISTS domestic_water_quality`);
  await conn.query(`
    CREATE TABLE domestic_water_quality (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lon DOUBLE NOT NULL,
      lat DOUBLE NOT NULL,
      depth DOUBLE,
      year INT,
      month INT,
      nh4 DOUBLE COMMENT '铵盐 NH4 (μmol/L)',
      chla DOUBLE COMMENT '叶绿素a (μg/L)',
      doc DOUBLE COMMENT '溶解有机碳 (μmol/L)',
      no3 DOUBLE COMMENT '硝酸盐 (μmol/L)',
      salinity DOUBLE COMMENT '盐度 (PSU)',
      temp DOUBLE COMMENT '温度 (°C)',
      region VARCHAR(50) COMMENT '海域',
      pollution_level VARCHAR(20) COMMENT '污染等级',
      INDEX idx_region (region),
      INDEX idx_coords (lon, lat),
      INDEX idx_year (year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const BATCH = 200;
  let batch = [], total = 0, skipped = 0;

  for (const r of records) {
    const lat = parseFloatSafe(r['Latitude']);
    const lon = parseFloatSafe(r['Longitude']);
    if (lat === null || lon === null) { skipped++; continue; }

    const nh4 = parseFloatSafe(r['NH4']);
    const no3 = parseFloatSafe(r['NO3']);
    const chla = parseFloatSafe(r['Chla']);

    // 计算污染等级 (基于NH4)
    let pollutionLevel = 'Low';
    if (nh4 !== null) {
      if (nh4 > 5) pollutionLevel = 'Very High';
      else if (nh4 > 2) pollutionLevel = 'High';
      else if (nh4 > 0.8) pollutionLevel = 'Medium';
      else pollutionLevel = 'Low';
    } else if (no3 !== null) {
      if (no3 > 30) pollutionLevel = 'Very High';
      else if (no3 > 15) pollutionLevel = 'High';
      else if (no3 > 5) pollutionLevel = 'Medium';
      else pollutionLevel = 'Low';
    }

    const row = [
      lon, lat,
      parseFloatSafe(r['Depth']),
      parseIntSafe(r['Year']),
      parseIntSafe(r['Month']),
      nh4,
      chla,
      parseFloatSafe(r['DOC']),
      no3,
      parseFloatSafe(r['Salinity']),
      parseFloatSafe(r['Temp']),
      r['region']?.trim() || null,
      pollutionLevel
    ];
    batch.push(row);

    if (batch.length >= BATCH) {
      await conn.query(`INSERT INTO domestic_water_quality (lon,lat,depth,year,month,nh4,chla,doc,no3,salinity,temp,region,pollution_level) VALUES ?`, [batch]);
      total += batch.length;
      process.stdout.write(`\r   已导入: ${total} 条`);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await conn.query(`INSERT INTO domestic_water_quality (lon,lat,depth,year,month,nh4,chla,doc,no3,salinity,temp,region,pollution_level) VALUES ?`, [batch]);
    total += batch.length;
  }

  console.log(`\n✅ 国内水质数据导入完成: ${total} 条 (跳过: ${skipped})`);

  // 打印统计
  const [regions] = await conn.query('SELECT region, COUNT(*) as cnt, AVG(nh4) as avg_nh4, AVG(no3) as avg_no3, AVG(chla) as avg_chla FROM domestic_water_quality GROUP BY region');
  console.log('\n各海域统计:');
  regions.forEach(r => {
    console.log(`  ${r.region}: ${r.cnt}条 | 平均NH4: ${Number(r.avg_nh4).toFixed(3)} | 平均NO3: ${Number(r.avg_no3).toFixed(1)} | 平均Chla: ${Number(r.avg_chla).toFixed(3)}`);
  });

  await conn.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
