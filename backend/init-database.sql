-- 创建数据库
CREATE DATABASE IF NOT EXISTS ocean_protection CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ocean_protection;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  region VARCHAR(50) DEFAULT NULL,
  lat DECIMAL(10, 8) DEFAULT NULL,
  lng DECIMAL(11, 8) DEFAULT NULL,
  location_updated_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建污染数据表
CREATE TABLE IF NOT EXISTS pollution_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  region VARCHAR(50) UNIQUE NOT NULL,
  pollution_index INT NOT NULL CHECK (pollution_index >= 0 AND pollution_index <= 100),
  microplastic_level INT DEFAULT 0,
  chemical_level INT DEFAULT 0,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  zoom INT DEFAULT 5,
  affected_species JSON,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认污染数据
INSERT INTO pollution_data (region, pollution_index, microplastic_level, chemical_level, lat, lng, zoom, affected_species)
VALUES
  ('渤海', 83, 76, 89, 38.5, 119.5, 6, '["斑海豹", "中国对虾", "小黄鱼"]'),
  ('挪威海峡', 67, 58, 72, 63.0, 8.0, 5, '["虎鲸", "大西洋鲑", "北极鳕"]'),
  ('北海', 52, 48, 55, 56.0, 3.0, 5, '["港湾鼠海豚", "欧洲鳗鲡"]'),
  ('地中海', 44, 42, 46, 37.0, 15.0, 5, '["僧海豹", "蓝鳍金枪鱼"]'),
  ('其他海域', 38, 35, 40, 30.0, 140.0, 3, '["多种海洋生物"]')
ON DUPLICATE KEY UPDATE region=region;
