const express = require('express');
const router = express.Router();
const GMP = require('../models/GlobalMicroplastics');

router.get('/overview', async (req, res) => {
  try { res.json(await GMP.getOverview()); }
  catch(e){ console.error(e); res.status(500).json({message:'获取数据失败'}); }
});
router.get('/map-points', async (req, res) => {
  try { const s=Math.min(parseInt(req.query.sample)||3000,8000); res.json(await GMP.getMapPoints(s)); }
  catch(e){ console.error(e); res.status(500).json({message:'获取数据失败'}); }
});
router.get('/yearly', async (req, res) => {
  try { res.json(await GMP.getYearlyTrend()); }
  catch(e){ console.error(e); res.status(500).json({message:'获取数据失败'}); }
});
router.get('/oceans', async (req, res) => {
  try { res.json(await GMP.getOceanSummary()); }
  catch(e){ console.error(e); res.status(500).json({message:'获取数据失败'}); }
});
router.get('/countries', async (req, res) => {
  try { res.json(await GMP.getByCountry()); }
  catch(e){ console.error(e); res.status(500).json({message:'获取数据失败'}); }
});
router.get('/concentration-distribution', async (req, res) => {
  try { res.json(await GMP.getConcentrationDistribution()); }
  catch(e){ console.error(e); res.status(500).json({message:'获取数据失败'}); }
});

module.exports = router;
