const express = require('express');
const router = express.Router();
const Norway = require('../models/Norway');

router.get('/overview', async (req, res) => {
  try { res.json(await Norway.getOverview()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/yearly', async (req, res) => {
  try { res.json(await Norway.getYearly()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/microplastic-yearly', async (req, res) => {
  try { res.json(await Norway.getMicroplasticYearly()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/depth-profile', async (req, res) => {
  try { res.json(await Norway.getDepthProfile()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/map-points', async (req, res) => {
  try {
    const sample = Math.min(parseInt(req.query.sample) || 500, 2000);
    res.json(await Norway.getMapPoints(sample));
  } catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/microplastic-map', async (req, res) => {
  try { res.json(await Norway.getMicroplasticMap()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/pah-summary', async (req, res) => {
  try { res.json(await Norway.getPAHSummary()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

router.get('/pcb-summary', async (req, res) => {
  try { res.json(await Norway.getPCBSummary()); }
  catch (e) { console.error(e); res.status(500).json({ message: '获取数据失败' }); }
});

module.exports = router;
