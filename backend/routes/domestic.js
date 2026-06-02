const express = require('express');
const router = express.Router();
const db = require('../config/database');

// 根据坐标获取附近国内水质数据
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: '请提供经纬度坐标' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusDeg = parseFloat(radius); // 度数范围

    // 先用粗筛查询附近数据
    const [rows] = await db.query(`
      SELECT id, lon, lat, depth, year, month,
        nh4, chla, doc, no3, salinity, temp,
        region, pollution_level as pollutionLevel
      FROM domestic_water_quality
      WHERE lat BETWEEN ? AND ?
        AND lon BETWEEN ? AND ?
      LIMIT 500
    `, [
      userLat - radiusDeg, userLat + radiusDeg,
      userLng - radiusDeg, userLng + radiusDeg
    ]);

    if (rows.length === 0) {
      return res.json({
        user_location: { lat: userLat, lng: userLng },
        total: 0,
        points: [],
        summary: null
      });
    }

    // 精确计算距离并排序
    const points = rows.map(r => {
      const dLat = (r.lat - userLat) * 111.32;
      const dLng = (r.lon - userLng) * (111.32 * Math.cos(userLat * Math.PI / 180));
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return {
        ...r,
        distance: Math.round(distance * 100) / 100
      };
    }).sort((a, b) => a.distance - b.distance);

    // 聚合统计
    const levels = { 'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
    let totalNh4 = 0, totalNo3 = 0, totalChla = 0;
    let nh4Count = 0, no3Count = 0, chlaCount = 0;

    points.forEach(p => {
      levels[p.pollutionLevel] = (levels[p.pollutionLevel] || 0) + 1;
      if (p.nh4 !== null) { totalNh4 += p.nh4; nh4Count++; }
      if (p.no3 !== null) { totalNo3 += p.no3; no3Count++; }
      if (p.chla !== null) { totalChla += p.chla; chlaCount++; }
    });

    const summary = {
      total_points: points.length,
      pollution_distribution: levels,
      avg_nh4: nh4Count > 0 ? Math.round(totalNh4 / nh4Count * 1000) / 1000 : null,
      avg_no3: no3Count > 0 ? Math.round(totalNo3 / no3Count * 10) / 10 : null,
      avg_chla: chlaCount > 0 ? Math.round(totalChla / chlaCount * 1000) / 1000 : null,
      dominant_level: Object.entries(levels).sort((a, b) => b[1] - a[1])[0][0]
    };

    res.json({
      user_location: { lat: userLat, lng: userLng },
      total: points.length,
      points,
      summary
    });
  } catch (error) {
    console.error('国内水质查询错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取所有区域列表
router.get('/regions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT region,
        COUNT(*) as point_count,
        AVG(nh4) as avg_nh4,
        AVG(no3) as avg_no3,
        AVG(chla) as avg_chla,
        MIN(lat) as min_lat, MAX(lat) as max_lat,
        MIN(lon) as min_lon, MAX(lon) as max_lon
      FROM domestic_water_quality
      GROUP BY region
    `);
    res.json(rows);
  } catch (error) {
    console.error('获取区域列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
