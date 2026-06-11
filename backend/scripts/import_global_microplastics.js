/**
 * 全球海洋微塑料数据导入脚本 (NCEI Marine Microplastics)
 * 用法: node scripts/import_global_microplastics.js
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const CSV_PATH = path.join(__dirname, '..', 'Marine_Microplastics_WGS84_484899890726613494.csv');

function parseFloatSafe(v) {
  if (!v || (typeof v === 'string' && v.trim() === '')) return null;
  const s = typeof v === 'string' ? v.replace(',', '.') : String(v).replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDateSafe(v) {
  if (!v || (typeof v === 'string' && v.trim() === '')) return null;
  try {
    const d = new Date(v);
    const ts = d.getTime();
    if (isNaN(ts)) return null;
    const yr = d.getFullYear();
    if (yr < 1900 || yr > 2030) return null;
    return d.toISOString().split('T')[0];
  } catch (e) { return null; }
}

const STD_CLASSES = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

async function main() {
  console.log('全球海洋微塑料数据导入工具 (NCEI)\n');
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

  const dbSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ocean_protection',
    ssl: dbSsl ? { rejectUnauthorized: false } : undefined
  });

  await conn.query(`DROP TABLE IF EXISTS global_microplastics`);
  await conn.query(`
    CREATE TABLE global_microplastics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lat DOUBLE, lon DOUBLE,
      ocean VARCHAR(100), region VARCHAR(100), subregion VARCHAR(100),
      country VARCHAR(100), state VARCHAR(100), beach_location VARCHAR(200),
      marine_setting VARCHAR(100),
      ocean_bottom_depth DOUBLE, water_sample_depth DOUBLE,
      sampling_method VARCHAR(100), mesh_size DOUBLE,
      measurement DOUBLE, unit VARCHAR(50),
      conc_class VARCHAR(30), conc_range VARCHAR(30),
      short_reference VARCHAR(200), doi VARCHAR(200), organization VARCHAR(100),
      sample_date DATE,
      INDEX idx_ocean (ocean), INDEX idx_conc (conc_class),
      INDEX idx_coords (lon, lat), INDEX idx_date (sample_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const BATCH = 500;
  let batch = [], total = 0, skipped = 0;

  for (const r of records) {
    const lat = parseFloatSafe(r['Latitude (degree)']);
    const lon = parseFloatSafe(r['Longitude (degree)']);
    if (lat === null || lon === null) { skipped++; continue; }

    let cc = (r['Concentration Class'] || '').trim();
    if (!STD_CLASSES.includes(cc)) {
      if (/^\d/.test(cc) || cc === '' || cc === 'pieces/10 mins') cc = 'Medium';
      else if (cc.includes('Low')) cc = 'Low';
      else if (cc.includes('High')) cc = 'High';
      else cc = 'Medium';
    }

    const row = [
      lat, lon,
      r['Ocean']?.trim() || null,
      r['Region']?.trim() || null,
      r['Subregion']?.trim() || null,
      r['Country']?.trim() || null,
      r['State']?.trim() || null,
      r['Beach Location']?.trim() || null,
      r['Marine Setting']?.trim() || null,
      parseFloatSafe(r['Ocean Bottom Depth (m)']),
      parseFloatSafe(r['Water Sample Depth (m)']),
      r['Sampling Method']?.trim() || null,
      parseFloatSafe(r['Mesh Size (mm)']),
      parseFloatSafe(r['Microplastics Measurement']),
      r['Unit']?.trim() || null,
      cc,
      r['Concentration Class Range']?.trim() || null,
      r['Short Reference']?.trim() || null,
      r['DOI']?.trim() || null,
      r['Organization']?.trim() || null,
      parseDateSafe(r['Sample Date'])
    ];
    batch.push(row);

    if (batch.length >= BATCH) {
      await conn.query(`INSERT INTO global_microplastics (lat,lon,ocean,region,subregion,country,state,beach_location,marine_setting,ocean_bottom_depth,water_sample_depth,sampling_method,mesh_size,measurement,unit,conc_class,conc_range,short_reference,doi,organization,sample_date) VALUES ?`, [batch]);
      total += batch.length;
      process.stdout.write(`\r   已导入: ${total} 条`);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await conn.query(`INSERT INTO global_microplastics (lat,lon,ocean,region,subregion,country,state,beach_location,marine_setting,ocean_bottom_depth,water_sample_depth,sampling_method,mesh_size,measurement,unit,conc_class,conc_range,short_reference,doi,organization,sample_date) VALUES ?`, [batch]);
    total += batch.length;
  }

  console.log(`\n✅ 全球微塑料数据导入完成: ${total} 条 (跳过: ${skipped})`);
  await conn.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
