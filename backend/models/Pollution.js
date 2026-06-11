const db = require('../config/database');

async function safeQuery(fallback, queryFn) {
  try {
    return await queryFn();
  } catch (e) {
    console.warn(`[Pollution] DB query failed, using fallback: ${e.message}`);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

const mockRegions = [
  { region: '渤海湾', pollutionIndex: 82, microplasticLevel: 75, chemicalLevel: 68, lat: 38.7, lng: 118.7, zoom: 7, affectedSpecies: ['中国对虾', '海参', '梭子蟹'], updatedAt: '2024-06-15' },
  { region: '长江口', pollutionIndex: 91, microplasticLevel: 92, chemicalLevel: 85, lat: 31.0, lng: 122.0, zoom: 7, affectedSpecies: ['中华鲟', '刀鱼', '河豚'], updatedAt: '2024-06-18' },
  { region: '珠江口', pollutionIndex: 88, microplasticLevel: 88, chemicalLevel: 82, lat: 22.2, lng: 113.6, zoom: 8, affectedSpecies: ['白海豚', '石斑鱼', '牡蛎'], updatedAt: '2024-06-14' },
  { region: '日本濑户内海', pollutionIndex: 75, microplasticLevel: 68, chemicalLevel: 72, lat: 34.2, lng: 133.5, zoom: 7, affectedSpecies: ['真鲷', '牡蛎', '海胆'], updatedAt: '2024-06-10' },
  { region: '地中海北部', pollutionIndex: 78, microplasticLevel: 82, chemicalLevel: 65, lat: 41.5, lng: 12.5, zoom: 6, affectedSpecies: ['蓝鳍金枪鱼', '海龟', '僧海豹'], updatedAt: '2024-06-12' },
  { region: '墨西哥湾', pollutionIndex: 85, microplasticLevel: 78, chemicalLevel: 88, lat: 26.0, lng: -90.0, zoom: 6, affectedSpecies: ['牡蛎', '褐虾', '红鲷鱼'], updatedAt: '2024-06-16' },
  { region: '孟加拉湾', pollutionIndex: 92, microplasticLevel: 95, chemicalLevel: 90, lat: 16.0, lng: 88.0, zoom: 6, affectedSpecies: ['恒河豚', '老虎虾', '鲥鱼'], updatedAt: '2024-06-20' },
  { region: '几内亚湾', pollutionIndex: 72, microplasticLevel: 65, chemicalLevel: 75, lat: 2.0, lng: 4.0, zoom: 6, affectedSpecies: ['非洲鲶鱼', '虾类', '沙丁鱼'], updatedAt: '2024-06-08' },
  { region: '东海大陆架', pollutionIndex: 68, microplasticLevel: 62, chemicalLevel: 58, lat: 29.0, lng: 125.0, zoom: 6, affectedSpecies: ['大黄鱼', '带鱼', '海鳗'], updatedAt: '2024-06-05' },
  { region: '白令海', pollutionIndex: 55, microplasticLevel: 38, chemicalLevel: 45, lat: 58.0, lng: -175.0, zoom: 5, affectedSpecies: ['帝王蟹', '鲑鱼', '海獭'], updatedAt: '2024-06-02' },
  { region: '澳大利亚大堡礁', pollutionIndex: 48, microplasticLevel: 42, chemicalLevel: 35, lat: -18.0, lng: 147.0, zoom: 7, affectedSpecies: ['珊瑚', '小丑鱼', '海龟'], updatedAt: '2024-05-28' },
  { region: '南海诸岛', pollutionIndex: 62, microplasticLevel: 55, chemicalLevel: 52, lat: 10.0, lng: 115.0, zoom: 6, affectedSpecies: ['海龟', '金枪鱼', '珊瑚'], updatedAt: '2024-06-01' },
  { region: '挪威海', pollutionIndex: 45, microplasticLevel: 32, chemicalLevel: 28, lat: 67.0, lng: 5.0, zoom: 5, affectedSpecies: ['鳕鱼', '鲱鱼', '虎鲸'], updatedAt: '2024-05-25' },
  { region: '鄂霍次克海', pollutionIndex: 58, microplasticLevel: 45, chemicalLevel: 55, lat: 50.0, lng: 152.0, zoom: 5, affectedSpecies: ['鲑鱼', '帝王蟹', '海豹'], updatedAt: '2024-05-30' }
];

function formatRegion(r) {
  return {
    region: r.region,
    pollutionIndex: r.pollutionIndex,
    microplasticLevel: r.microplasticLevel,
    chemicalLevel: r.chemicalLevel,
    lat: r.lat,
    lng: r.lng,
    zoom: r.zoom,
    affectedSpecies: r.affectedSpecies,
    updatedAt: r.updatedAt,
    coordinates: { lat: r.lat, lng: r.lng, zoom: r.zoom }
  };
}

// ===== 从真实数据表动态聚合污染指数 =====
async function aggregateFromRealTables() {
  const regions = [];

  // --- 渤海：从 bohai_raw 聚合 ---
  try {
    const [bohaiCount] = await db.query(`SELECT COUNT(*) AS cnt FROM bohai_raw`);
    if (bohaiCount[0].cnt > 0) {
      // 水质等级分布计算污染指数
      const [qualityDist] = await db.query(
        `SELECT quality_class, COUNT(*) AS cnt FROM bohai_raw GROUP BY quality_class`
      );
      const total = qualityDist.reduce((s, r) => s + r.cnt, 0);
      const qMap = { '一类': 10, '二类': 30, '三类': 55, '四类': 75, '劣四类': 95 };
      let weightedSum = 0;
      qualityDist.forEach(r => {
        weightedSum += (qMap[r.quality_class] || 50) * r.cnt;
      });
      const pollutionIndex = Math.round(weightedSum / total);

      // 化学指标：综合 COD + 无机氮 + 活性磷酸盐 + 石油类
      const [chemStats] = await db.query(
        `SELECT AVG(cod) AS avg_cod, AVG(inorganic_nitrogen) AS avg_n,
                AVG(active_phosphate) AS avg_p, AVG(petroleum) AS avg_oil
         FROM bohai_raw`
      );
      // 标准化到 0-100: COD 标准 (≤2 一类, >5 劣四类), N (≤0.2 一类, >0.5 劣四类)
      const codNorm = Math.min(100, (chemStats[0].avg_cod / 5) * 100);
      const nNorm = Math.min(100, (chemStats[0].avg_n / 0.5) * 100);
      const pNorm = Math.min(100, (chemStats[0].avg_p / 0.045) * 100);
      const oilNorm = Math.min(100, (chemStats[0].avg_oil / 0.1) * 100);
      const chemicalLevel = Math.round((codNorm * 0.3 + nNorm * 0.3 + pNorm * 0.2 + oilNorm * 0.2));

      // 微塑料：渤海数据中没有直接测量，基于污染综合水平估算
      const microplasticLevel = Math.round(pollutionIndex * 0.85);

      // 经纬度取渤海中心
      const [center] = await db.query(
        `SELECT AVG(lat) AS lat, AVG(lon) AS lng FROM bohai_raw`
      );

      regions.push({
        region: '渤海',
        pollutionIndex,
        microplasticLevel,
        chemicalLevel,
        lat: parseFloat(center[0].lat.toFixed(8)),
        lng: parseFloat(center[0].lng.toFixed(8)),
        zoom: 7,
        affectedSpecies: ['斑海豹', '中国对虾', '小黄鱼'],
        updatedAt: new Date().toISOString().split('T')[0]
      });
      console.log(`[Pollution] 渤海聚合: ${bohaiCount[0].cnt}条 → PI=${pollutionIndex}, ML=${microplasticLevel}, CL=${chemicalLevel}`);
    }
  } catch (e) {
    console.warn(`[Pollution] 渤海聚合失败: ${e.message}`);
  }

  // --- 挪威海峡：从 norway_organic + norway_microplastic 聚合 ---
  try {
    const [orgCount] = await db.query(`SELECT COUNT(*) AS cnt FROM norway_organic`);
    const [mpCount] = await db.query(`SELECT COUNT(*) AS cnt FROM norway_microplastic`);
    if (orgCount[0].cnt > 0) {
      // 有机污染物综合指数：基于 THC, BaP, PCB, PFOS
      const [orgStats] = await db.query(
        `SELECT AVG(thc) AS avg_thc, AVG(benzoa_pyrene) AS avg_bap,
                AVG(pcb_153) AS avg_pcb, AVG(pfos) AS avg_pfos
         FROM norway_organic WHERE thc IS NOT NULL`
      );
      // THC: >100 高污染, BaP: >5 高污染
      const thcNorm = Math.min(100, (orgStats[0].avg_thc / 100) * 100);
      const bapNorm = Math.min(100, (orgStats[0].avg_bap / 5) * 100);
      const pcbNorm = Math.min(100, (orgStats[0].avg_pcb / 3) * 100);
      const pfosNorm = Math.min(100, (orgStats[0].avg_pfos / 2) * 100);
      const chemicalLevel = Math.round((thcNorm * 0.35 + bapNorm * 0.25 + pcbNorm * 0.2 + pfosNorm * 0.2));

      // 微塑料水平
      let microplasticLevel = 40; // 默认
      try {
        const [mpStats] = await db.query(
          `SELECT AVG(microplastic_concentration) AS avg_conc, MAX(microplastic_concentration) AS max_conc
           FROM norway_microplastic WHERE microplastic_concentration IS NOT NULL`
        );
        if (mpStats[0].avg_conc !== null) {
          microplasticLevel = Math.round(Math.min(100, (mpStats[0].avg_conc / 5) * 100));
        }
      } catch (_) {}

      // 综合污染指数
      const pollutionIndex = Math.round((chemicalLevel * 0.55 + microplasticLevel * 0.45));

      const [center] = await db.query(
        `SELECT AVG(lat) AS lat, AVG(lon) AS lng FROM norway_organic WHERE lat IS NOT NULL`
      );

      regions.push({
        region: '挪威海峡',
        pollutionIndex,
        microplasticLevel,
        chemicalLevel,
        lat: parseFloat(center[0].lat.toFixed(8)),
        lng: parseFloat(center[0].lng.toFixed(8)),
        zoom: 5,
        affectedSpecies: ['虎鲸', '大西洋鲑', '北极鳕'],
        updatedAt: new Date().toISOString().split('T')[0]
      });
      console.log(`[Pollution] 挪威聚合: 有机${orgCount[0].cnt}条+微塑料${mpCount[0].cnt}条 → PI=${pollutionIndex}, ML=${microplasticLevel}, CL=${chemicalLevel}`);
    }
  } catch (e) {
    console.warn(`[Pollution] 挪威聚合失败: ${e.message}`);
  }

  // --- 全球海域：从 global_microplastics 聚合 ---
  try {
    const [mpCount] = await db.query(`SELECT COUNT(*) AS cnt FROM global_microplastics`);
    if (mpCount[0].cnt > 0) {
      const [oceans] = await db.query(
        `SELECT ocean, COUNT(*) AS cnt,
                ROUND(AVG(measurement), 4) AS avg_conc,
                ROUND(SUM(CASE WHEN conc_class IN ('High','Very High') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS high_pct
         FROM global_microplastics
         WHERE ocean IS NOT NULL AND ocean != '' AND measurement IS NOT NULL
         GROUP BY ocean HAVING cnt > 100
         ORDER BY cnt DESC LIMIT 6`
      );

      // 海域映射：经纬度中心点 + 受影响物种
      const oceanMeta = {
        'North Pacific': { lat: 30, lng: -160, zoom: 3, species: ['太平洋鲑', '海龟', '信天翁'] },
        'North Atlantic': { lat: 35, lng: -40, zoom: 3, species: ['北大西洋露脊鲸', '鳕鱼', '海雀'] },
        'Mediterranean Sea': { lat: 37, lng: 15, zoom: 4, species: ['僧海豹', '蓝鳍金枪鱼', '海龟'] },
        'South Pacific': { lat: -25, lng: -140, zoom: 3, species: ['小须鲸', '金枪鱼', '珊瑚'] },
        'Indian Ocean': { lat: -15, lng: 70, zoom: 3, species: ['鲸鲨', '黄鳍金枪鱼', '海龟'] },
        'South Atlantic': { lat: -30, lng: -20, zoom: 3, species: ['座头鲸', '鱿鱼', '海豹'] },
        'Arctic Ocean': { lat: 78, lng: 0, zoom: 3, species: ['北极熊', '环斑海豹', '北极鳕'] },
        'Southern Ocean': { lat: -65, lng: -60, zoom: 3, species: ['帝企鹅', '磷虾', '威德尔海豹'] }
      };

      for (const o of oceans) {
        const meta = oceanMeta[o.ocean] || { lat: 0, lng: 0, zoom: 2, species: ['多种海洋生物'] };
        // 基于微塑料浓度和 High/Very High 占比计算指数
        const concNorm = Math.min(100, (o.avg_conc / 10) * 100);
        const highNorm = o.high_pct * 1.2;
        const pollutionIndex = Math.round((concNorm * 0.5 + highNorm * 0.5));
        const microplasticLevel = Math.round(concNorm);
        const chemicalLevel = Math.round(pollutionIndex * 0.7); // 化学水平估算

        regions.push({
          region: o.ocean,
          pollutionIndex: Math.max(20, Math.min(95, pollutionIndex)),
          microplasticLevel: Math.max(15, Math.min(95, microplasticLevel)),
          chemicalLevel: Math.max(15, Math.min(90, chemicalLevel)),
          lat: meta.lat,
          lng: meta.lng,
          zoom: meta.zoom,
          affectedSpecies: meta.species,
          updatedAt: new Date().toISOString().split('T')[0]
        });
      }
      console.log(`[Pollution] 全球微塑料聚合: ${mpCount[0].cnt}条 → ${oceans.length}个海域`);
    }
  } catch (e) {
    console.warn(`[Pollution] 全球微塑料聚合失败: ${e.message}`);
  }

  return regions;
}

class Pollution {
  static async getAll() {
    return safeQuery(mockRegions.map(formatRegion), async () => {
      // 优先从真实数据表聚合
      try {
        const aggregated = await aggregateFromRealTables();
        if (aggregated.length > 0) {
          return aggregated;
        }
      } catch (e) {
        console.warn(`[Pollution] 真实数据聚合失败，回退到 pollution_data 表: ${e.message}`);
      }

      // 回退到 pollution_data 表
      const sql = `SELECT region, pollution_index as pollutionIndex, microplastic_level as microplasticLevel, chemical_level as chemicalLevel, lat, lng, zoom, affected_species as affectedSpecies, updated_at as updatedAt FROM pollution_data ORDER BY pollution_index DESC`;
      const [rows] = await db.query(sql);
      return rows.map(row => ({
        ...row,
        affectedSpecies: typeof row.affectedSpecies === 'string' ? JSON.parse(row.affectedSpecies) : row.affectedSpecies,
        coordinates: { lat: parseFloat(row.lat), lng: parseFloat(row.lng), zoom: row.zoom }
      }));
    });
  }

  static async findByRegion(regionName) {
    return safeQuery((() => {
      const found = mockRegions.find(r => r.region === decodeURIComponent(regionName));
      return found ? formatRegion(found) : null;
    })(), async () => {
      const sql = `SELECT region, pollution_index as pollutionIndex, microplastic_level as microplasticLevel, chemical_level as chemicalLevel, lat, lng, zoom, affected_species as affectedSpecies, updated_at as updatedAt FROM pollution_data WHERE region = ?`;
      const [rows] = await db.query(sql, [regionName]);
      if (rows.length === 0) return null;
      const row = rows[0];
      return { ...row, affectedSpecies: typeof row.affectedSpecies === 'string' ? JSON.parse(row.affectedSpecies) : row.affectedSpecies, coordinates: { lat: parseFloat(row.lat), lng: parseFloat(row.lng), zoom: row.zoom } };
    });
  }

  static async getStats() {
    return safeQuery({
      avgPollution: 62.5,
      maxPollution: 92,
      minPollution: 38,
      totalRegions: 8
    }, async () => {
      // 优先从真实数据聚合获取
      try {
        const all = await aggregateFromRealTables();
        if (all.length > 0) {
          const indices = all.map(r => r.pollutionIndex);
          return {
            avgPollution: Math.round(indices.reduce((a, b) => a + b, 0) / indices.length),
            maxPollution: Math.max(...indices),
            minPollution: Math.min(...indices),
            totalRegions: all.length
          };
        }
      } catch (_) {}
      // 回退
      const sql = `SELECT AVG(pollution_index) as avgPollution, MAX(pollution_index) as maxPollution, MIN(pollution_index) as minPollution, COUNT(*) as totalRegions FROM pollution_data`;
      const [rows] = await db.query(sql);
      return rows[0];
    });
  }

  static async getHighPollutionRegions() {
    return safeQuery([
      { region: '孟加拉湾', pollutionIndex: 92 },
      { region: '长江口', pollutionIndex: 91 },
      { region: '珠江口', pollutionIndex: 88 },
      { region: '墨西哥湾', pollutionIndex: 85 },
      { region: '渤海湾', pollutionIndex: 82 },
      { region: '地中海北部', pollutionIndex: 78 },
      { region: '日本濑户内海', pollutionIndex: 75 },
      { region: '几内亚湾', pollutionIndex: 72 }
    ], async () => {
      const sql = `SELECT region, pollution_index as pollutionIndex FROM pollution_data WHERE pollution_index >= 70 ORDER BY pollution_index DESC`;
      const [rows] = await db.query(sql);
      return rows;
    });
  }
}

module.exports = Pollution;
