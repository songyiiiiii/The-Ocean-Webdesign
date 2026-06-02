/**
 * 挪威海域污染数据导入脚本 (Mareano 2006- )
 * 用法: node scripts/import_norway.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATA_DIR = path.join(__dirname, '..', 'Norwegian data');

function parseSemicolonCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(';').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(';');
    if (vals.length >= headers.length) rows.push(vals);
    else if (vals.length > 5) {
      // Pad with empty strings for missing trailing columns
      while (vals.length < headers.length) vals.push('');
      rows.push(vals);
    }
  }
  return { headers, rows };
}

function colIdx(headers, name) {
  return headers.indexOf(name);
}

function parseFloatSafe(v) {
  if (!v || v.trim() === '') return null;
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? null : n;
}

async function importOrganicData(conn) {
  console.log('📥 导入挪威有机污染物数据...');
  const filePath = path.join(DATA_DIR, 'MarChem_Organic_Data_20260520T024708Z.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseSemicolonCSV(content);
  console.log(`   列数: ${headers.length}, 行数: ${rows.length}`);

  await conn.query(`DROP TABLE IF EXISTS norway_organic`);
  await conn.query(`
    CREATE TABLE norway_organic (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sample_code VARCHAR(100),
      cruise_year INT,
      station_number VARCHAR(50),
      lon DOUBLE,
      lat DOUBLE,
      depth DOUBLE,
      -- Key PAHs
      naphthalene DOUBLE, phenanthrene DOUBLE, anthracene DOUBLE,
      fluoranthene DOUBLE, pyrene DOUBLE, benzoa_pyrene DOUBLE,
      benzoghi_perylene DOUBLE, thc DOUBLE,
      -- Key PCBs
      pcb_28 DOUBLE, pcb_52 DOUBLE, pcb_101 DOUBLE, pcb_118 DOUBLE,
      pcb_138 DOUBLE, pcb_153 DOUBLE, pcb_180 DOUBLE,
      -- PBDEs
      bde_47 DOUBLE, bde_99 DOUBLE, bde_209 DOUBLE,
      -- PFAS
      pfos DOUBLE, pfoa DOUBLE,
      -- Siloxanes
      siloxane_d4 DOUBLE, siloxane_d5 DOUBLE, siloxane_d6 DOUBLE,
      INDEX idx_year (cruise_year),
      INDEX idx_coords (lon, lat)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Column index mapping (CSV header → DB column)
  const colMap = {
    sample_code: 'Sample_code', cruise_year: 'Cruise_year',
    station_number: 'Station_number', lon: 'Longitude', lat: 'Latitude', depth: 'Depth',
    naphthalene: 'Naphthalene_µg/kg', phenanthrene: 'Phenanthrene_µg/kg',
    anthracene: 'Anthracene_µg/kg', fluoranthene: 'Fluoranthene_µg/kg',
    pyrene: 'Pyrene_µg/kg', benzoa_pyrene: 'Benzo[a]pyrene_µg/kg',
    benzoghi_perylene: 'Benzo[ghi]perylene_µg/kg', thc: 'THC_mg/kg',
    pcb_28: 'PCB_28_µg/kg', pcb_52: 'PCB_52_µg/kg', pcb_101: 'PCB_101_µg/kg',
    pcb_118: 'PCB_118_µg/kg', pcb_138: 'PCB_138_µg/kg', pcb_153: 'PCB_153_µg/kg',
    pcb_180: 'PCB_180_µg/kg',
    bde_47: 'BDE_47_µg/kg', bde_99: 'BDE_99_µg/kg', bde_209: 'BDE_209_µg/kg',
    pfos: 'PFOS_µg/kg', pfoa: 'PFOA_µg/kg',
    siloxane_d4: 'Siloxane_D4_µg/kg', siloxane_d5: 'Siloxane_D5_µg/kg', siloxane_d6: 'Siloxane_D6_µg/kg'
  };

  const dbCols = Object.keys(colMap);
  const idxMap = {};
  for (const [dbCol, csvCol] of Object.entries(colMap)) {
    idxMap[dbCol] = colIdx(headers, csvCol);
  }

  const sql = `INSERT INTO norway_organic (${dbCols.join(',')}) VALUES ?`;

  const BATCH = 500;
  let batch = [], total = 0;

  for (const row of rows) {
    const vals = dbCols.map(c => {
      const i = idxMap[c];
      if (i === -1) return null;
      return parseFloatSafe(row[i]);
    });
    batch.push(vals);
    if (batch.length >= BATCH) {
      await conn.query(sql, [batch]);
      total += batch.length;
      process.stdout.write(`\r   已导入: ${total} 条`);
      batch = [];
    }
  }
  if (batch.length > 0) { await conn.query(sql, [batch]); total += batch.length; }
  console.log(`\n✅ 有机污染物数据导入完成: ${total} 条`);
}

async function importMicroplasticData(conn) {
  console.log('\n📥 导入挪威微塑料数据...');
  const filePath = path.join(DATA_DIR, 'MarChem_Microplastic_Data_20260520T024708Z.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const { headers, rows } = parseSemicolonCSV(content);
  console.log(`   列数: ${headers.length}, 行数: ${rows.length}`);

  await conn.query(`DROP TABLE IF EXISTS norway_microplastic`);
  await conn.query(`
    CREATE TABLE norway_microplastic (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sample_code VARCHAR(100),
      cruise_year INT,
      station_number VARCHAR(50),
      lon DOUBLE, lat DOUBLE, depth DOUBLE,
      microplastic_particles DOUBLE,
      microplastic_concentration DOUBLE,
      INDEX idx_year (cruise_year),
      INDEX idx_coords (lon, lat)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const m = {
    sample_code: colIdx(headers, 'Sample_code'),
    cruise_year: colIdx(headers, 'Cruise_year'),
    station_number: colIdx(headers, 'Station_number'),
    lon: colIdx(headers, 'Longitude'), lat: colIdx(headers, 'Latitude'),
    depth: colIdx(headers, 'Depth'),
    particles: colIdx(headers, 'Microplastic_particles_#/kg'),
    concentration: colIdx(headers, 'Microplastic_concentration_µg/kg')
  };

  let batch = [], total = 0;
  for (const row of rows) {
    batch.push([
      row[m.sample_code], parseFloatSafe(row[m.cruise_year]), row[m.station_number],
      parseFloatSafe(row[m.lon]), parseFloatSafe(row[m.lat]), parseFloatSafe(row[m.depth]),
      parseFloatSafe(row[m.particles]), parseFloatSafe(row[m.concentration])
    ]);
    if (batch.length >= 500) {
      await conn.query(`INSERT INTO norway_microplastic (sample_code,cruise_year,station_number,lon,lat,depth,microplastic_particles,microplastic_concentration) VALUES ?`, [batch]);
      total += batch.length; batch = [];
      process.stdout.write(`\r   已导入: ${total} 条`);
    }
  }
  if (batch.length > 0) { await conn.query(`INSERT INTO norway_microplastic (sample_code,cruise_year,station_number,lon,lat,depth,microplastic_particles,microplastic_concentration) VALUES ?`, [batch]); total += batch.length; }
  console.log(`\n✅ 微塑料数据导入完成: ${total} 条`);
}

async function main() {
  console.log('🇳🇴 挪威海域污染数据导入工具 (Mareano)\n');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ocean_protection'
  });
  try {
    await importOrganicData(conn);
    await importMicroplasticData(conn);
    console.log('\n🎉 挪威数据导入完成!');
  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    throw error;
  } finally { await conn.end(); }
}

main().catch(() => process.exit(1));
