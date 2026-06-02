const express = require('express');
const router = express.Router();
const Pollution = require('../models/Pollution');

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