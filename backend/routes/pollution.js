const express = require('express');
const router = express.Router();
const Pollution = require('../models/Pollution');
const db = require('../config/database');

// 种子数据：14 个真实污染热点
const SEED_HOTSPOTS = [
  { region: '渤海湾', pollution_index: 82, microplastic_level: 75, chemical_level: 68, lat: 38.7, lng: 118.7, zoom: 7, affected_species: '["中国对虾","海参","梭子蟹"]' },
  { region: '长江口', pollution_index: 91, microplastic_level: 92, chemical_level: 85, lat: 31.0, lng: 122.0, zoom: 7, affected_species: '["中华鲟","刀鱼","河豚"]' },
  { region: '珠江口', pollution_index: 88, microplastic_level: 88, chemical_level: 82, lat: 22.2, lng: 113.6, zoom: 8, affected_species: '["白海豚","石斑鱼","牡蛎"]' },
  { region: '日本濑户内海', pollution_index: 75, microplastic_level: 68, chemical_level: 72, lat: 34.2, lng: 133.5, zoom: 7, affected_species: '["真鲷","牡蛎","海胆"]' },
  { region: '地中海北部', pollution_index: 78, microplastic_level: 82, chemical_level: 65, lat: 41.5, lng: 12.5, zoom: 6, affected_species: '["蓝鳍金枪鱼","海龟","僧海豹"]' },
  { region: '墨西哥湾', pollution_index: 85, microplastic_level: 78, chemical_level: 88, lat: 26.0, lng: -90.0, zoom: 6, affected_species: '["牡蛎","褐虾","红鲷鱼"]' },
  { region: '孟加拉湾', pollution_index: 92, microplastic_level: 95, chemical_level: 90, lat: 16.0, lng: 88.0, zoom: 6, affected_species: '["恒河豚","老虎虾","鲥鱼"]' },
  { region: '几内亚湾', pollution_index: 72, microplastic_level: 65, chemical_level: 75, lat: 2.0, lng: 4.0, zoom: 6, affected_species: '["非洲鲶鱼","虾类","沙丁鱼"]' },
  { region: '东海大陆架', pollution_index: 68, microplastic_level: 62, chemical_level: 58, lat: 29.0, lng: 125.0, zoom: 6, affected_species: '["大黄鱼","带鱼","海鳗"]' },
  { region: '白令海', pollution_index: 55, microplastic_level: 38, chemical_level: 45, lat: 58.0, lng: -175.0, zoom: 5, affected_species: '["帝王蟹","鲑鱼","海獭"]' },
  { region: '澳大利亚大堡礁', pollution_index: 48, microplastic_level: 42, chemical_level: 35, lat: -18.0, lng: 147.0, zoom: 7, affected_species: '["珊瑚","小丑鱼","海龟"]' },
  { region: '南海诸岛', pollution_index: 62, microplastic_level: 55, chemical_level: 52, lat: 10.0, lng: 115.0, zoom: 6, affected_species: '["海龟","金枪鱼","珊瑚"]' },
  { region: '挪威海', pollution_index: 45, microplastic_level: 32, chemical_level: 28, lat: 67.0, lng: 5.0, zoom: 5, affected_species: '["鳕鱼","鲱鱼","虎鲸"]' },
  { region: '鄂霍次克海', pollution_index: 58, microplastic_level: 45, chemical_level: 55, lat: 50.0, lng: 152.0, zoom: 5, affected_species: '["鲑鱼","帝王蟹","海豹"]' }
];

// 种子数据接口：用 14 条详细污染数据替换占位数据
router.post('/seed', async (req, res) => {
  try {
    // 清空旧数据
    await db.query('DELETE FROM pollution_data');
    // 插入新数据
    const sql = `INSERT INTO pollution_data (region, pollution_index, microplastic_level, chemical_level, lat, lng, zoom, affected_species) VALUES ?`;
    const values = SEED_HOTSPOTS.map(h => [h.region, h.pollution_index, h.microplastic_level, h.chemical_level, h.lat, h.lng, h.zoom, h.affected_species]);
    await db.query(sql, [values]);
    const [count] = await db.query('SELECT COUNT(*) AS cnt FROM pollution_data');
    console.log(`🌱 污染数据已种子化: ${count[0].cnt} 条记录`);
    res.json({ message: '污染数据已种子化', count: count[0].cnt, regions: SEED_HOTSPOTS.map(h => h.region) });
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