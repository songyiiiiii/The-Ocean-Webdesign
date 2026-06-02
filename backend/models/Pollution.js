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
  { region: '渤海湾', pollutionIndex: 82, microplasticLevel: 7.5, chemicalLevel: 6.8, lat: 38.7, lng: 118.7, zoom: 7, affectedSpecies: ['中国对虾', '海参', '梭子蟹'], updatedAt: '2024-06-15' },
  { region: '长江口', pollutionIndex: 91, microplasticLevel: 9.2, chemicalLevel: 8.5, lat: 31.0, lng: 122.0, zoom: 7, affectedSpecies: ['中华鲟', '刀鱼', '河豚'], updatedAt: '2024-06-18' },
  { region: '珠江口', pollutionIndex: 88, microplasticLevel: 8.8, chemicalLevel: 8.2, lat: 22.2, lng: 113.6, zoom: 8, affectedSpecies: ['白海豚', '石斑鱼', '牡蛎'], updatedAt: '2024-06-14' },
  { region: '日本濑户内海', pollutionIndex: 75, microplasticLevel: 6.8, chemicalLevel: 7.2, lat: 34.2, lng: 133.5, zoom: 7, affectedSpecies: ['真鲷', '牡蛎', '海胆'], updatedAt: '2024-06-10' },
  { region: '地中海北部', pollutionIndex: 78, microplasticLevel: 8.2, chemicalLevel: 6.5, lat: 41.5, lng: 12.5, zoom: 6, affectedSpecies: ['蓝鳍金枪鱼', '海龟', '僧海豹'], updatedAt: '2024-06-12' },
  { region: '墨西哥湾', pollutionIndex: 85, microplasticLevel: 7.8, chemicalLevel: 8.8, lat: 26.0, lng: -90.0, zoom: 6, affectedSpecies: ['牡蛎', '褐虾', '红鲷鱼'], updatedAt: '2024-06-16' },
  { region: '孟加拉湾', pollutionIndex: 92, microplasticLevel: 9.5, chemicalLevel: 9.0, lat: 16.0, lng: 88.0, zoom: 6, affectedSpecies: ['恒河豚', '老虎虾', '鲥鱼'], updatedAt: '2024-06-20' },
  { region: '几内亚湾', pollutionIndex: 72, microplasticLevel: 6.5, chemicalLevel: 7.5, lat: 2.0, lng: 4.0, zoom: 6, affectedSpecies: ['非洲鲶鱼', '虾类', '沙丁鱼'], updatedAt: '2024-06-08' },
  { region: '东海大陆架', pollutionIndex: 68, microplasticLevel: 6.2, chemicalLevel: 5.8, lat: 29.0, lng: 125.0, zoom: 6, affectedSpecies: ['大黄鱼', '带鱼', '海鳗'], updatedAt: '2024-06-05' },
  { region: '白令海', pollutionIndex: 55, microplasticLevel: 3.8, chemicalLevel: 4.5, lat: 58.0, lng: -175.0, zoom: 5, affectedSpecies: ['帝王蟹', '鲑鱼', '海獭'], updatedAt: '2024-06-02' },
  { region: '澳大利亚大堡礁', pollutionIndex: 48, microplasticLevel: 4.2, chemicalLevel: 3.5, lat: -18.0, lng: 147.0, zoom: 7, affectedSpecies: ['珊瑚', '小丑鱼', '海龟'], updatedAt: '2024-05-28' },
  { region: '南海诸岛', pollutionIndex: 62, microplasticLevel: 5.5, chemicalLevel: 5.2, lat: 10.0, lng: 115.0, zoom: 6, affectedSpecies: ['海龟', '金枪鱼', '珊瑚'], updatedAt: '2024-06-01' },
  { region: '挪威海', pollutionIndex: 45, microplasticLevel: 3.2, chemicalLevel: 2.8, lat: 67.0, lng: 5.0, zoom: 5, affectedSpecies: ['鳕鱼', '鲱鱼', '虎鲸'], updatedAt: '2024-05-25' },
  { region: '鄂霍次克海', pollutionIndex: 58, microplasticLevel: 4.5, chemicalLevel: 5.5, lat: 50.0, lng: 152.0, zoom: 5, affectedSpecies: ['鲑鱼', '帝王蟹', '海豹'], updatedAt: '2024-05-30' }
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

class Pollution {
  static async getAll() {
    return safeQuery(mockRegions.map(formatRegion), async () => {
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
      avgPollution: 70.6,
      maxPollution: 92,
      minPollution: 45,
      totalRegions: 14
    }, async () => {
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
