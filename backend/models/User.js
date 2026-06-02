const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // 创建用户
  static async create(userData) {
    const { username, email, password } = userData;

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `;

    try {
      const [result] = await db.query(sql, [username, email, hashedPassword]);
      return {
        id: result.insertId,
        username,
        email
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('用户名或邮箱已存在');
      }
      throw error;
    }
  }

  // 通过邮箱查找用户
  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
  }

  // 通过ID查找用户
  static async findById(id) {
    try {
      const sql = 'SELECT id, username, email, avatar, region, lat, lng, location_updated_at, created_at FROM users WHERE id = ?';
      const [rows] = await db.query(sql, [id]);
      return rows[0] || null;
    } catch (e) {
      // 兼容 avatar 列不存在的情况
      const sql = 'SELECT id, username, email, region, lat, lng, location_updated_at, created_at FROM users WHERE id = ?';
      const [rows] = await db.query(sql, [id]);
      var user = rows[0] || null;
      if (user) user.avatar = null;
      return user;
    }
  }

  // 验证密码
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // 更新用户位置
  static async updateLocation(userId, locationData) {
    const { region, lat, lng } = locationData;

    const sql = `
      UPDATE users
      SET region = ?, lat = ?, lng = ?, location_updated_at = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(sql, [region, lat, lng, userId]);

    if (result.affectedRows === 0) {
      throw new Error('用户不存在');
    }

    return await this.findById(userId);
  }

  // 检查用户名是否存在
  static async usernameExists(username) {
    const sql = 'SELECT id FROM users WHERE username = ?';
    const [rows] = await db.query(sql, [username]);
    return rows.length > 0;
  }

  // 更新用户资料
  static async updateProfile(userId, data) {
    const { username } = data;

    const sql = 'UPDATE users SET username = ? WHERE id = ?';
    const [result] = await db.query(sql, [username, userId]);

    if (result.affectedRows === 0) {
      throw new Error('用户不存在');
    }

    return await this.findById(userId);
  }

  // 更新用户头像
  static async updateAvatar(userId, avatarPath) {
    const sql = 'UPDATE users SET avatar = ? WHERE id = ?';
    const [result] = await db.query(sql, [avatarPath, userId]);

    if (result.affectedRows === 0) {
      throw new Error('用户不存在');
    }

    return await this.findById(userId);
  }

  // 检查邮箱是否存在
  static async emailExists(email) {
    const sql = 'SELECT id FROM users WHERE email = ?';
    const [rows] = await db.query(sql, [email]);
    return rows.length > 0;
  }
}

module.exports = User;