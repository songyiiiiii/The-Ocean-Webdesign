const express = require('express');
const router = express.Router();
const Bohai = require('../models/Bohai');

// 渤海污染数据概览
router.get('/overview', async (req, res) => {
  try {
    const data = await Bohai.getOverview();
    res.json(data);
  } catch (error) {
    console.error('获取渤海概览数据失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

// 年度趋势
router.get('/yearly', async (req, res) => {
  try {
    const data = await Bohai.getYearly();
    res.json(data);
  } catch (error) {
    console.error('获取年度趋势失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

// 月度模式
router.get('/monthly', async (req, res) => {
  try {
    const data = await Bohai.getMonthly();
    res.json(data);
  } catch (error) {
    console.error('获取月度模式失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

// 离岸距离梯度 (query: ?indicator=cod)
router.get('/distance-gradient', async (req, res) => {
  try {
    const indicator = req.query.indicator || 'cod';
    const data = await Bohai.getDistanceGradient(indicator);
    res.json(data);
  } catch (error) {
    console.error('获取距离梯度失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

// 水质类别分布
router.get('/quality', async (req, res) => {
  try {
    const data = await Bohai.getQualityDistribution();
    res.json(data);
  } catch (error) {
    console.error('获取水质分布失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

// 地图采样点 (query: ?sample=500)
router.get('/map-points', async (req, res) => {
  try {
    const sampleSize = parseInt(req.query.sample) || 500;
    const data = await Bohai.getMapPoints(Math.min(sampleSize, 2000));
    res.json(data);
  } catch (error) {
    console.error('获取地图点失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

// 城市汇总
router.get('/cities', async (req, res) => {
  try {
    const data = await Bohai.getCitySummary();
    res.json(data);
  } catch (error) {
    console.error('获取城市数据失败:', error);
    res.status(500).json({ message: '获取数据失败' });
  }
});

module.exports = router;
