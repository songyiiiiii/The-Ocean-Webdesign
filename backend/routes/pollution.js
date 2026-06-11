const express = require('express');
const router = express.Router();
const Pollution = require('../models/Pollution');
const db = require('../config/database');

// 从真实数据表聚合污染热点
async function aggregateFromRealTables() {
  const regions = [];

  // --- 渤海：从 bohai_raw 聚合 ---
  try {
    const [bCnt] = await db.query('SELECT COUNT(*) AS cnt FROM bohai_raw');
    if (bCnt[0].cnt > 0) {
      const [qDist] = await db.query(
        'SELECT quality_class, COUNT(*) AS cnt FROM bohai_raw GROUP BY quality_class'
      );
      const total = qDist.reduce((s, r) => s + r.cnt, 0);
      const qMap = { '一类': 10, '二类': 30, '三类': 55, '四类': 75, '劣四类': 95 };
      let wSum = 0;
      qDist.forEach(r => { wSum += (qMap[r.quality_class] || 50) * r.cnt; });
      const pollutionIndex = Math.round(wSum / total);

      const [chem] = await db.query(
        'SELECT AVG(cod) AS cod, AVG(inorganic_nitrogen) AS n, AVG(active_phosphate) AS p, AVG(petroleum) AS oil FROM bohai_raw'
      );
      const codN = Math.min(100, (chem[0].cod / 5) * 100);
      const nN = Math.min(100, (chem[0].n / 0.5) * 100);
      const pN = Math.min(100, (chem[0].p / 0.045) * 100);
      const oilN = Math.min(100, (chem[0].oil / 0.1) * 100);
      const chemicalLevel = Math.round(codN * 0.3 + nN * 0.3 + pN * 0.2 + oilN * 0.2);
      const microplasticLevel = Math.round(pollutionIndex * 0.82);

      const [center] = await db.query('SELECT AVG(lat) AS lat, AVG(lon) AS lng FROM bohai_raw');
      regions.push({
        region: '渤海', pollution_index: pollutionIndex, microplastic_level: microplasticLevel,
        chemical_level: chemicalLevel, lat: center[0].lat, lng: center[0].lng, zoom: 7,
        affected_species: JSON.stringify(['斑海豹', '中国对虾', '小黄鱼'])
      });
    }
  } catch (e) { console.warn('渤海聚合失败:', e.message); }

  // --- 挪威海峡 ---
  try {
    const [orgCnt] = await db.query('SELECT COUNT(*) AS cnt FROM norway_organic');
    if (orgCnt[0].cnt > 0) {
      const [org] = await db.query(
        'SELECT AVG(thc) AS thc, AVG(benzoa_pyrene) AS bap, AVG(pcb_153) AS pcb, AVG(pfos) AS pfos FROM norway_organic WHERE thc IS NOT NULL'
      );
      const thcN = Math.min(100, (org[0].thc / 100) * 100);
      const bapN = Math.min(100, (org[0].bap / 5) * 100);
      const pcbN = Math.min(100, (org[0].pcb / 3) * 100);
      const pfosN = Math.min(100, (org[0].pfos / 2) * 100);
      const chemicalLevel = Math.round(thcN * 0.35 + bapN * 0.25 + pcbN * 0.2 + pfosN * 0.2);

      let microplasticLevel = 40;
      try {
        const [mp] = await db.query(
          'SELECT AVG(microplastic_concentration) AS avgc FROM norway_microplastic WHERE microplastic_concentration IS NOT NULL'
        );
        if (mp[0].avgc != null) microplasticLevel = Math.round(Math.min(100, (mp[0].avgc / 5) * 100));
      } catch (_) {}

      const pollutionIndex = Math.round(chemicalLevel * 0.55 + microplasticLevel * 0.45);
      const [center] = await db.query('SELECT AVG(lat) AS lat, AVG(lon) AS lng FROM norway_organic WHERE lat IS NOT NULL');
      regions.push({
        region: '挪威海峡', pollution_index: pollutionIndex, microplastic_level: microplasticLevel,
        chemical_level: chemicalLevel, lat: center[0].lat, lng: center[0].lng, zoom: 5,
        affected_species: JSON.stringify(['虎鲸', '大西洋鲑', '北极鳕'])
      });
    }
  } catch (e) { console.warn('挪威聚合失败:', e.message); }

  // --- 全球海域：从 global_microplastics 按大洋聚合 ---
  try {
    const [gCnt] = await db.query('SELECT COUNT(*) AS cnt FROM global_microplastics');
    if (gCnt[0].cnt > 0) {
      const [oceans] = await db.query(
        `SELECT ocean, COUNT(*) AS cnt, ROUND(AVG(measurement), 4) AS avgc,
          ROUND(SUM(CASE WHEN conc_class IN ('High','Very High') THEN 1 ELSE 0 END)*100.0/COUNT(*),1) AS high_pct
         FROM global_microplastics WHERE ocean IS NOT NULL AND ocean!='' AND measurement IS NOT NULL
         GROUP BY ocean HAVING cnt > 100 ORDER BY cnt DESC LIMIT 8`
      );

      const metaMap = {
        'Atlantic Ocean': { lat: 0, lng: -25, zoom: 2, sp: ['座头鲸', '海龟', '北大西洋露脊鲸'] },
        'Pacific Ocean': { lat: 0, lng: -150, zoom: 2, sp: ['太平洋鲑', '海龟', '信天翁'] },
        'Indian Ocean': { lat: -15, lng: 70, zoom: 3, sp: ['鲸鲨', '黄鳍金枪鱼', '海龟'] },
        'Arctic Ocean': { lat: 78, lng: 0, zoom: 3, sp: ['北极熊', '环斑海豹', '北极鳕'] },
        'Mediterranean Sea': { lat: 37, lng: 15, zoom: 4, sp: ['僧海豹', '蓝鳍金枪鱼', '海龟'] },
        'Southern Ocean': { lat: -65, lng: -60, zoom: 3, sp: ['帝企鹅', '磷虾', '威德尔海豹'] }
      };

      for (const o of oceans) {
        const meta = metaMap[o.ocean] || { lat: 0, lng: 0, zoom: 2, sp: ['多种海洋生物'] };
        const concN = Math.min(100, (o.avgc / 10) * 100);
        const highN = o.high_pct * 1.2;
        const pi = Math.max(20, Math.min(95, Math.round(concN * 0.5 + highN * 0.5)));
        regions.push({
          region: o.ocean, pollution_index: pi,
          microplastic_level: Math.max(15, Math.min(95, Math.round(concN))),
          chemical_level: Math.max(15, Math.min(90, Math.round(pi * 0.7))),
          lat: meta.lat, lng: meta.lng, zoom: meta.zoom,
          affected_species: JSON.stringify(meta.sp)
        });
      }
    }
  } catch (e) { console.warn('全球聚合失败:', e.message); }

  return regions;
}

// 种子数据接口：从真实数据聚合+静态兜底
router.post('/seed', async (req, res) => {
  try {
    await db.query('DELETE FROM pollution_data');

    // 从真实表聚合
    let hotspots = await aggregateFromRealTables();
    console.log(`📊 真实数据聚合: ${hotspots.length} 个区域`);

    // 如果聚合结果不够，合并静态数据
    const STATIC = [
      { region: '长江口', pollution_index: 91, microplastic_level: 92, chemical_level: 85, lat: 31.0, lng: 122.0, zoom: 7, affected_species: JSON.stringify(['中华鲟', '刀鱼', '河豚']) },
      { region: '珠江口', pollution_index: 88, microplastic_level: 88, chemical_level: 82, lat: 22.2, lng: 113.6, zoom: 8, affected_species: JSON.stringify(['白海豚', '石斑鱼', '牡蛎']) },
      { region: '墨西哥湾', pollution_index: 85, microplastic_level: 78, chemical_level: 88, lat: 26.0, lng: -90.0, zoom: 6, affected_species: JSON.stringify(['牡蛎', '褐虾', '红鲷鱼']) },
      { region: '孟加拉湾', pollution_index: 92, microplastic_level: 95, chemical_level: 90, lat: 16.0, lng: 88.0, zoom: 6, affected_species: JSON.stringify(['恒河豚', '老虎虾', '鲥鱼']) },
      { region: '几内亚湾', pollution_index: 72, microplastic_level: 65, chemical_level: 75, lat: 2.0, lng: 4.0, zoom: 6, affected_species: JSON.stringify(['非洲鲶鱼', '虾类', '沙丁鱼']) },
      { region: '日本濑户内海', pollution_index: 75, microplastic_level: 68, chemical_level: 72, lat: 34.2, lng: 133.5, zoom: 7, affected_species: JSON.stringify(['真鲷', '牡蛎', '海胆']) },
      { region: '东海大陆架', pollution_index: 68, microplastic_level: 62, chemical_level: 58, lat: 29.0, lng: 125.0, zoom: 6, affected_species: JSON.stringify(['大黄鱼', '带鱼', '海鳗']) },
      { region: '白令海', pollution_index: 55, microplastic_level: 38, chemical_level: 45, lat: 58.0, lng: -175.0, zoom: 5, affected_species: JSON.stringify(['帝王蟹', '鲑鱼', '海獭']) },
      { region: '南海诸岛', pollution_index: 62, microplastic_level: 55, chemical_level: 52, lat: 10.0, lng: 115.0, zoom: 6, affected_species: JSON.stringify(['海龟', '金枪鱼', '珊瑚']) },
      { region: '澳大利亚大堡礁', pollution_index: 48, microplastic_level: 42, chemical_level: 35, lat: -18.0, lng: 147.0, zoom: 7, affected_species: JSON.stringify(['珊瑚', '小丑鱼', '海龟']) },
      { region: '鄂霍次克海', pollution_index: 58, microplastic_level: 45, chemical_level: 55, lat: 50.0, lng: 152.0, zoom: 5, affected_species: JSON.stringify(['鲑鱼', '帝王蟹', '海豹']) }
    ];

    const existingNames = new Set(hotspots.map(h => h.region));
    for (const s of STATIC) {
      if (!existingNames.has(s.region)) {
        hotspots.push(s);
        existingNames.add(s.region);
      }
    }

    const sql = 'INSERT INTO pollution_data (region, pollution_index, microplastic_level, chemical_level, lat, lng, zoom, affected_species) VALUES ?';
    const values = hotspots.map(h => [h.region, h.pollution_index, h.microplastic_level, h.chemical_level, h.lat, h.lng, h.zoom, h.affected_species]);
    await db.query(sql, [values]);

    const [count] = await db.query('SELECT COUNT(*) AS cnt FROM pollution_data');
    console.log(`🌱 污染数据种子化: ${count[0].cnt} 条 (${hotspots.filter(h => h.region === '渤海' || h.region === '挪威海峡' || h.region.includes('Ocean') || h.region.includes('Pacific') || h.region.includes('Atlantic')).length} 条来自真实数据聚合)`);
    res.json({ message: '污染数据已种子化', count: count[0].cnt, regions: hotspots.map(h => h.region) });
  } catch (error) {
    console.error('种子化失败:', error);
    res.status(500).json({ message: '种子化失败', error: error.message });
  }
});

// 获取所有污染数据
router.get('/hotspots', async (req, res) => {
  try {
    const pollutionData = await Pollution.getAll();
    console.log(`📊 获取污染热点数据: ${pollutionData.length} 个区域`);
    res.json(pollutionData);
  } catch (error) {
    console.error('获取污染数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取污染统计
router.get('/stats', async (req, res) => {
  try {
    const stats = await Pollution.getStats();
    const highPollution = await Pollution.getHighPollutionRegions();
    res.json({
      ...stats,
      highPollutionRegions: highPollution
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个区域污染详情
router.get('/region/:regionName', async (req, res) => {
  try {
    const regionName = decodeURIComponent(req.params.regionName);
    const pollution = await Pollution.findByRegion(regionName);

    if (!pollution) {
      return res.status(404).json({ message: '区域未找到' });
    }

    console.log(`📊 获取区域数据: ${regionName}`);
    res.json(pollution);
  } catch (error) {
    console.error('获取区域数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 根据坐标获取附近污染数据
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: '请提供经纬度坐标' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    const allData = await Pollution.getAll();

    const nearby = allData.map(region => {
      const dLat = (region.lat - userLat) * 111.32;
      const dLng = (region.lng - userLng) * (111.32 * Math.cos(userLat * Math.PI / 180));
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return { ...region, distance: Math.round(distance * 10) / 10 };
    }).sort((a, b) => a.distance - b.distance);

    const withinRadius = nearby.filter(r => r.distance <= radiusKm);

    res.json({
      user_location: { lat: userLat, lng: userLng },
      total_regions: allData.length,
      nearby_count: withinRadius.length,
      regions: withinRadius.length > 0 ? withinRadius : nearby.slice(0, 3)
    });
  } catch (error) {
    console.error('附近污染查询错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;