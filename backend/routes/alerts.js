const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');  // 你原有的 auth 中间件

// 获取用户的告警规则
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const [rules] = await db.query(
      'SELECT * FROM alert_rules WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]  // 使用 req.userId
    );
    res.json(rules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取告警规则失败' });
  }
});

// 创建告警规则
router.post('/rules', authMiddleware, async (req, res) => {
  const { name, parameter, operator, threshold } = req.body;

  if (!name || !parameter || !operator || threshold === undefined) {
    return res.status(400).json({ message: '请填写完整信息' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO alert_rules (user_id, name, parameter, operator, threshold) VALUES (?, ?, ?, ?, ?)',
      [req.userId, name, parameter, operator, threshold]
    );

    res.json({
      id: result.insertId,
      name,
      parameter,
      operator,
      threshold,
      is_active: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '创建告警规则失败' });
  }
});

// 更新告警规则
router.put('/rules/:id', authMiddleware, async (req, res) => {
  const { name, parameter, operator, threshold, is_active } = req.body;

  try {
    await db.query(
      `UPDATE alert_rules
       SET name = ?, parameter = ?, operator = ?, threshold = ?, is_active = ?
       WHERE id = ? AND user_id = ?`,
      [name, parameter, operator, threshold, is_active, req.params.id, req.userId]
    );

    res.json({ message: '更新成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '更新告警规则失败' });
  }
});

// 删除告警规则
router.delete('/rules/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM alert_rules WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '删除告警规则失败' });
  }
});

// 切换规则状态
router.patch('/rules/:id', authMiddleware, async (req, res) => {
  const { is_active } = req.body;

  try {
    await db.query(
      'UPDATE alert_rules SET is_active = ? WHERE id = ? AND user_id = ?',
      [is_active, req.params.id, req.userId]
    );
    res.json({ message: '状态更新成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '更新状态失败' });
  }
});

// 获取告警历史
router.get('/history', authMiddleware, async (req, res) => {
  const { limit = 50, station_id } = req.query;

  try {
    let query = `
      SELECT ah.*, ar.name as rule_name, ar.parameter, ar.threshold
      FROM alert_history ah
      JOIN alert_rules ar ON ah.rule_id = ar.id
      WHERE ah.user_id = ?
    `;
    const params = [req.userId];

    if (station_id) {
      query += ' AND ah.station_id = ?';
      params.push(station_id);
    }

    query += ' ORDER BY ah.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [history] = await db.query(query, params);
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '获取告警历史失败' });
  }
});

module.exports = router;