const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

// 头像上传存储配置
const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'frontend', 'public', 'avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'avatar-' + req.userId + '-' + Date.now() + ext);
  }
});
const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// 注册
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 20 }).withMessage('用户名长度应为3-20个字符')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/).withMessage('用户名只能包含字母、数字、下划线和中文')
    .trim(),
  body('email')
    .isEmail().withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('密码长度至少6个字符')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password } = req.body;

    // 检查用户名是否已存在
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 检查邮箱是否已存在
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ message: '邮箱已被注册' });
    }

    // 创建用户
    const user = await User.create({ username, email, password });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ 新用户注册: ${username} (${email})`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        location: null
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: error.message || '服务器错误' });
  }
});

// 登录
router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址').normalizeEmail(),
  body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const isValid = await User.verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ 用户登录: ${user.username}`);

    // 构建位置信息
    const location = user.region ? {
      region: user.region,
      coordinates: { lat: user.lat, lng: user.lng },
      updatedAt: user.location_updated_at
    } : null;

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        location
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 构建位置信息
    const location = user.region ? {
      region: user.region,
      coordinates: { lat: user.lat, lng: user.lng },
      updatedAt: user.location_updated_at
    } : null;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      location
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户位置
router.put('/location', auth, async (req, res) => {
  try {
    const { region, lat, lng } = req.body;

    if (!region) {
      return res.status(400).json({ message: '请选择海域' });
    }

    const user = await User.updateLocation(req.userId, { region, lat, lng });

    console.log(`📍 用户 ${user.username} 更新位置: ${region}`);

    res.json(user);
  } catch (error) {
    console.error('更新位置错误:', error);
    res.status(500).json({ message: error.message || '服务器错误' });
  }
});

// 更新用户资料
router.put('/profile', auth, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: '用户名长度应为3-20个字符' });
    }

    const user = await User.updateProfile(req.userId, { username });
    res.json(user);
  } catch (error) {
    console.error('更新资料错误:', error);
    res.status(500).json({ message: error.message || '服务器错误' });
  }
});

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择图片文件' });
    }

    const avatarUrl = '/public/avatars/' + req.file.filename;

    // 删除旧头像
    const oldUser = await User.findById(req.userId);
    if (oldUser.avatar) {
      const oldPath = path.join(__dirname, '..', '..', 'frontend', oldUser.avatar.replace(/^\//, ''));
      fs.unlink(oldPath, () => {});
    }

    const user = await User.updateAvatar(req.userId, avatarUrl);
    console.log('📷 用户 ' + user.username + ' 更新头像: ' + avatarUrl);

    res.json({ avatar: avatarUrl, user });
  } catch (error) {
    console.error('头像上传错误:', error);
    res.status(500).json({ message: error.message || '服务器错误' });
  }
});

module.exports = router;