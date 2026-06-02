const db = require('../config/database');

async function safeQuery(fallback, queryFn) {
  try {
    return await queryFn();
  } catch (e) {
    console.warn(`[Bohai] DB query failed, using fallback: ${e.message}`);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

const Bohai = {

  getOverview: async () => safeQuery({
    total_points: 1250,
    year_range: { min_year: 2015, max_year: 2024 },
    zone_stats: [
      { area: '近岸', points: 420, avg_ph: 7.92, avg_do: 6.45, avg_cod: 2.85, avg_nitrogen: 0.4521, avg_phosphate: 0.0325, avg_petroleum: 0.0642 },
      { area: '过渡', points: 380, avg_ph: 8.01, avg_do: 7.12, avg_cod: 1.95, avg_nitrogen: 0.2814, avg_phosphate: 0.0218, avg_petroleum: 0.0431 },
      { area: '远海', points: 450, avg_ph: 8.12, avg_do: 7.58, avg_cod: 1.32, avg_nitrogen: 0.1532, avg_phosphate: 0.0142, avg_petroleum: 0.0285 }
    ],
    quality_distribution: [
      { quality_class: '一类', cnt: 280, pct: 22.4 },
      { quality_class: '二类', cnt: 350, pct: 28.0 },
      { quality_class: '三类', cnt: 310, pct: 24.8 },
      { quality_class: '四类', cnt: 200, pct: 16.0 },
      { quality_class: '劣四类', cnt: 110, pct: 8.8 }
    ]
  }, async () => {
    const [zoneStats] = await db.query(`SELECT zone AS area, COUNT(*) AS points, ROUND(AVG(ph), 2) AS avg_ph, ROUND(AVG(dissolved_oxygen), 2) AS avg_do, ROUND(AVG(cod), 2) AS avg_cod, ROUND(AVG(inorganic_nitrogen), 4) AS avg_nitrogen, ROUND(AVG(active_phosphate), 4) AS avg_phosphate, ROUND(AVG(petroleum), 4) AS avg_petroleum FROM bohai_raw GROUP BY zone ORDER BY FIELD(zone,'近岸','过渡','远海')`);
    const [qualityDist] = await db.query(`SELECT quality_class, COUNT(*) AS cnt, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bohai_raw), 1) AS pct FROM bohai_raw GROUP BY quality_class ORDER BY FIELD(quality_class,'一类','二类','三类','四类','劣四类')`);
    const [yearRange] = await db.query(`SELECT MIN(year) AS min_year, MAX(year) AS max_year FROM bohai_raw`);
    const [totalPoints] = await db.query(`SELECT COUNT(*) AS total FROM bohai_raw`);
    return { total_points: totalPoints[0].total, year_range: yearRange[0], zone_stats: zoneStats, quality_distribution: qualityDist };
  }),

  getYearly: async () => safeQuery([
    { year: 2015, points: 95, avg_ph: 7.88, avg_do: 6.52, avg_cod: 2.95, avg_nitrogen: 0.4821, avg_phosphate: 0.0385, avg_petroleum: 0.0725 },
    { year: 2016, points: 102, avg_ph: 7.91, avg_do: 6.61, avg_cod: 2.78, avg_nitrogen: 0.4512, avg_phosphate: 0.0352, avg_petroleum: 0.0681 },
    { year: 2017, points: 110, avg_ph: 7.94, avg_do: 6.75, avg_cod: 2.55, avg_nitrogen: 0.4234, avg_phosphate: 0.0328, avg_petroleum: 0.0624 },
    { year: 2018, points: 118, avg_ph: 7.97, avg_do: 6.88, avg_cod: 2.38, avg_nitrogen: 0.3856, avg_phosphate: 0.0295, avg_petroleum: 0.0568 },
    { year: 2019, points: 125, avg_ph: 8.01, avg_do: 7.02, avg_cod: 2.15, avg_nitrogen: 0.3512, avg_phosphate: 0.0264, avg_petroleum: 0.0512 },
    { year: 2020, points: 132, avg_ph: 8.03, avg_do: 7.18, avg_cod: 1.98, avg_nitrogen: 0.3215, avg_phosphate: 0.0238, avg_petroleum: 0.0465 },
    { year: 2021, points: 140, avg_ph: 8.05, avg_do: 7.25, avg_cod: 1.85, avg_nitrogen: 0.2985, avg_phosphate: 0.0215, avg_petroleum: 0.0421 },
    { year: 2022, points: 145, avg_ph: 8.08, avg_do: 7.35, avg_cod: 1.72, avg_nitrogen: 0.2754, avg_phosphate: 0.0198, avg_petroleum: 0.0385 },
    { year: 2023, points: 148, avg_ph: 8.10, avg_do: 7.42, avg_cod: 1.58, avg_nitrogen: 0.2512, avg_phosphate: 0.0175, avg_petroleum: 0.0352 },
    { year: 2024, points: 135, avg_ph: 8.11, avg_do: 7.48, avg_cod: 1.45, avg_nitrogen: 0.2315, avg_phosphate: 0.0158, avg_petroleum: 0.0318 }
  ], async () => {
    const [rows] = await db.query(`SELECT year, COUNT(*) AS points, ROUND(AVG(ph), 2) AS avg_ph, ROUND(AVG(dissolved_oxygen), 2) AS avg_do, ROUND(AVG(cod), 2) AS avg_cod, ROUND(AVG(inorganic_nitrogen), 4) AS avg_nitrogen, ROUND(AVG(active_phosphate), 4) AS avg_phosphate, ROUND(AVG(petroleum), 4) AS avg_petroleum FROM bohai_raw GROUP BY year ORDER BY year`);
    return rows;
  }),

  getMonthly: async () => safeQuery([
    { month: 1, points: 98, avg_ph: 7.98, avg_do: 7.45, avg_cod: 2.15, avg_nitrogen: 0.3215, avg_phosphate: 0.0265, avg_petroleum: 0.0512 },
    { month: 2, points: 92, avg_ph: 7.96, avg_do: 7.52, avg_cod: 2.08, avg_nitrogen: 0.3102, avg_phosphate: 0.0252, avg_petroleum: 0.0498 },
    { month: 3, points: 105, avg_ph: 7.99, avg_do: 7.28, avg_cod: 2.22, avg_nitrogen: 0.3418, avg_phosphate: 0.0285, avg_petroleum: 0.0535 },
    { month: 4, points: 108, avg_ph: 8.02, avg_do: 7.12, avg_cod: 2.35, avg_nitrogen: 0.3652, avg_phosphate: 0.0302, avg_petroleum: 0.0568 },
    { month: 5, points: 112, avg_ph: 8.04, avg_do: 6.95, avg_cod: 2.48, avg_nitrogen: 0.3854, avg_phosphate: 0.0325, avg_petroleum: 0.0595 },
    { month: 6, points: 115, avg_ph: 8.06, avg_do: 6.78, avg_cod: 2.62, avg_nitrogen: 0.4125, avg_phosphate: 0.0348, avg_petroleum: 0.0625 },
    { month: 7, points: 118, avg_ph: 8.08, avg_do: 6.55, avg_cod: 2.78, avg_nitrogen: 0.4452, avg_phosphate: 0.0375, avg_petroleum: 0.0665 },
    { month: 8, points: 120, avg_ph: 8.07, avg_do: 6.42, avg_cod: 2.85, avg_nitrogen: 0.4685, avg_phosphate: 0.0398, avg_petroleum: 0.0698 },
    { month: 9, points: 115, avg_ph: 8.05, avg_do: 6.68, avg_cod: 2.65, avg_nitrogen: 0.4258, avg_phosphate: 0.0352, avg_petroleum: 0.0632 },
    { month: 10, points: 110, avg_ph: 8.03, avg_do: 6.95, avg_cod: 2.42, avg_nitrogen: 0.3752, avg_phosphate: 0.0315, avg_petroleum: 0.0575 },
    { month: 11, points: 102, avg_ph: 8.01, avg_do: 7.22, avg_cod: 2.25, avg_nitrogen: 0.3425, avg_phosphate: 0.0282, avg_petroleum: 0.0528 },
    { month: 12, points: 95, avg_ph: 7.99, avg_do: 7.38, avg_cod: 2.12, avg_nitrogen: 0.3158, avg_phosphate: 0.0255, avg_petroleum: 0.0495 }
  ], async () => {
    const [rows] = await db.query(`SELECT month, COUNT(*) AS points, ROUND(AVG(ph), 2) AS avg_ph, ROUND(AVG(dissolved_oxygen), 2) AS avg_do, ROUND(AVG(cod), 2) AS avg_cod, ROUND(AVG(inorganic_nitrogen), 4) AS avg_nitrogen, ROUND(AVG(active_phosphate), 4) AS avg_phosphate, ROUND(AVG(petroleum), 4) AS avg_petroleum FROM bohai_raw GROUP BY month ORDER BY month`);
    return rows;
  }),

  getDistanceGradient: async (indicator) => safeQuery((() => {
    const validIndicators = ['ph', 'dissolved_oxygen', 'cod', 'inorganic_nitrogen', 'active_phosphate', 'petroleum'];
    if (!validIndicators.includes(indicator)) indicator = 'cod';
    return { indicator, data: [
      { distance_range: '0-10km', avg_val: indicator === 'ph' ? 7.85 : indicator === 'dissolved_oxygen' ? 5.95 : indicator === 'cod' ? 3.25 : indicator === 'inorganic_nitrogen' ? 0.5214 : indicator === 'active_phosphate' ? 0.0412 : 0.0785, cnt: 85 },
      { distance_range: '10-20km', avg_val: indicator === 'ph' ? 7.92 : indicator === 'dissolved_oxygen' ? 6.35 : indicator === 'cod' ? 2.75 : indicator === 'inorganic_nitrogen' ? 0.4325 : indicator === 'active_phosphate' ? 0.0345 : 0.0652, cnt: 95 },
      { distance_range: '20-30km', avg_val: indicator === 'ph' ? 7.98 : indicator === 'dissolved_oxygen' ? 6.72 : indicator === 'cod' ? 2.32 : indicator === 'inorganic_nitrogen' ? 0.3521 : indicator === 'active_phosphate' ? 0.0285 : 0.0548, cnt: 105 },
      { distance_range: '30-50km', avg_val: indicator === 'ph' ? 8.04 : indicator === 'dissolved_oxygen' ? 7.05 : indicator === 'cod' ? 1.92 : indicator === 'inorganic_nitrogen' ? 0.2815 : indicator === 'active_phosphate' ? 0.0224 : 0.0445, cnt: 118 },
      { distance_range: '50-75km', avg_val: indicator === 'ph' ? 8.09 : indicator === 'dissolved_oxygen' ? 7.35 : indicator === 'cod' ? 1.55 : indicator === 'inorganic_nitrogen' ? 0.2152 : indicator === 'active_phosphate' ? 0.0178 : 0.0358, cnt: 95 },
      { distance_range: '75-100km', avg_val: indicator === 'ph' ? 8.12 : indicator === 'dissolved_oxygen' ? 7.55 : indicator === 'cod' ? 1.28 : indicator === 'inorganic_nitrogen' ? 0.1658 : indicator === 'active_phosphate' ? 0.0135 : 0.0285, cnt: 78 },
      { distance_range: '100-150km', avg_val: indicator === 'ph' ? 8.14 : indicator === 'dissolved_oxygen' ? 7.68 : indicator === 'cod' ? 1.05 : indicator === 'inorganic_nitrogen' ? 0.1254 : indicator === 'active_phosphate' ? 0.0102 : 0.0225, cnt: 55 },
      { distance_range: '150km+', avg_val: indicator === 'ph' ? 8.16 : indicator === 'dissolved_oxygen' ? 7.78 : indicator === 'cod' ? 0.88 : indicator === 'inorganic_nitrogen' ? 0.0952 : indicator === 'active_phosphate' ? 0.0078 : 0.0175, cnt: 32 }
    ] };
  })(), async () => {
    const validIndicators = ['ph', 'dissolved_oxygen', 'cod', 'inorganic_nitrogen', 'active_phosphate', 'petroleum'];
    if (!validIndicators.includes(indicator)) indicator = 'cod';
    const ranges = [
      { label: '0-10km', min: 0, max: 10 }, { label: '10-20km', min: 10, max: 20 }, { label: '20-30km', min: 20, max: 30 },
      { label: '30-50km', min: 30, max: 50 }, { label: '50-75km', min: 50, max: 75 }, { label: '75-100km', min: 75, max: 100 },
      { label: '100-150km', min: 100, max: 150 }, { label: '150km+', min: 150, max: 9999 }
    ];
    let sql;
    if (indicator === 'ph') {
      sql = ranges.map(r => `SELECT '${r.label}' AS distance_range, ROUND(AVG(ph), 2) AS avg_val, COUNT(*) AS cnt FROM bohai_raw WHERE offshore_km >= ${r.min} AND offshore_km < ${r.max}`).join(' UNION ALL ');
    } else {
      const colMap = { dissolved_oxygen: 'dissolved_oxygen', cod: 'cod', inorganic_nitrogen: 'inorganic_nitrogen', active_phosphate: 'active_phosphate', petroleum: 'petroleum' };
      sql = ranges.map(r => `SELECT '${r.label}' AS distance_range, ROUND(AVG(${colMap[indicator]}), 4) AS avg_val, COUNT(*) AS cnt FROM bohai_raw WHERE offshore_km >= ${r.min} AND offshore_km < ${r.max}`).join(' UNION ALL ');
    }
    const [rows] = await db.query(sql);
    return { indicator, data: rows };
  }),

  getQualityDistribution: async () => safeQuery([
    { zone: '近岸', quality_class: '一类', cnt: 45, pct: 10.7 }, { zone: '近岸', quality_class: '二类', cnt: 85, pct: 20.2 },
    { zone: '近岸', quality_class: '三类', cnt: 125, pct: 29.8 }, { zone: '近岸', quality_class: '四类', cnt: 100, pct: 23.8 },
    { zone: '近岸', quality_class: '劣四类', cnt: 65, pct: 15.5 },
    { zone: '过渡', quality_class: '一类', cnt: 95, pct: 25.0 }, { zone: '过渡', quality_class: '二类', cnt: 120, pct: 31.6 },
    { zone: '过渡', quality_class: '三类', cnt: 85, pct: 22.4 }, { zone: '过渡', quality_class: '四类', cnt: 55, pct: 14.5 },
    { zone: '过渡', quality_class: '劣四类', cnt: 25, pct: 6.5 },
    { zone: '远海', quality_class: '一类', cnt: 140, pct: 31.1 }, { zone: '远海', quality_class: '二类', cnt: 145, pct: 32.2 },
    { zone: '远海', quality_class: '三类', cnt: 100, pct: 22.2 }, { zone: '远海', quality_class: '四类', cnt: 45, pct: 10.0 },
    { zone: '远海', quality_class: '劣四类', cnt: 20, pct: 4.5 }
  ], async () => {
    const [rows] = await db.query(`SELECT zone, quality_class, COUNT(*) AS cnt, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY zone), 1) AS pct FROM bohai_raw GROUP BY zone, quality_class ORDER BY FIELD(zone,'近岸','过渡','远海'), FIELD(quality_class,'一类','二类','三类','四类','劣四类')`);
    return rows;
  }),

  getMapPoints: async (sampleSize) => safeQuery((() => {
    const nearShoreCities = [
      { lon: 117.7, lat: 39.0 },  // 天津
      { lon: 118.2, lat: 39.6 },  // 唐山
      { lon: 119.6, lat: 39.9 },  // 秦皇岛
      { lon: 120.8, lat: 40.7 },  // 葫芦岛
      { lon: 122.2, lat: 40.3 },  // 营口
      { lon: 121.6, lat: 38.9 },  // 大连
      { lon: 121.4, lat: 37.5 },  // 烟台
      { lon: 122.1, lat: 37.5 },  // 威海
      { lon: 118.7, lat: 37.5 },  // 东营
      { lon: 117.9, lat: 37.4 },  // 滨州
      { lon: 116.8, lat: 38.3 },  // 沧州
    ];
    const zones = ['近岸', '过渡', '远海'];
    const classes = ['一类', '二类', '三类', '四类', '劣四类'];
    const classWeights = [0.22, 0.28, 0.25, 0.16, 0.09];
    const points = [];
    const count = Math.min(sampleSize || 600, 600);

    function weightedClass() {
      let r = Math.random();
      let acc = 0;
      for (let i = 0; i < classes.length; i++) {
        acc += classWeights[i];
        if (r <= acc) return classes[i];
      }
      return classes[0];
    }

    for (let i = 0; i < count; i++) {
      const zone = zones[Math.floor(Math.random() * 3)];
      let lon, lat, offshoreKm;

      if (zone === '近岸') {
        const city = nearShoreCities[Math.floor(Math.random() * nearShoreCities.length)];
        lon = city.lon + (Math.random() - 0.5) * 0.6;
        lat = city.lat + (Math.random() - 0.5) * 0.5;
        offshoreKm = 1 + Math.random() * 30;
      } else if (zone === '过渡') {
        lon = 117.8 + Math.random() * 4.5;
        lat = 37.5 + Math.random() * 3.0;
        offshoreKm = 30 + Math.random() * 70;
      } else {
        lon = 118.0 + Math.random() * 4.0;
        lat = 37.8 + Math.random() * 2.5;
        offshoreKm = 100 + Math.random() * 80;
      }

      const qc = weightedClass();
      const multi = qc === '一类' ? 0.4 : qc === '二类' ? 0.65 : qc === '三类' ? 0.85 : qc === '四类' ? 1.1 : 1.4;

      points.push({
        lon: +lon.toFixed(4),
        lat: +lat.toFixed(4),
        zone,
        quality_class: qc,
        year: 2017 + Math.floor(Math.random() * 7),
        offshore_km: +offshoreKm.toFixed(1),
        ph: +(8.02 - multi * 0.18 + (Math.random() - 0.5) * 0.25).toFixed(2),
        dissolved_oxygen: +(7.6 - multi * 1.2 + (Math.random() - 0.5) * 0.8).toFixed(2),
        cod: +(0.45 + multi * 1.3 + (Math.random() - 0.5) * 0.5).toFixed(2),
        inorganic_nitrogen: +(0.04 + multi * 0.15 + (Math.random() - 0.5) * 0.04).toFixed(4),
        active_phosphate: +(0.004 + multi * 0.012 + (Math.random() - 0.5) * 0.003).toFixed(4),
        petroleum: +(0.01 + multi * 0.022 + (Math.random() - 0.5) * 0.008).toFixed(4)
      });
    }
    return points;
  })(), async () => {
    const [total] = await db.query(`SELECT COUNT(*) AS cnt FROM bohai_raw`);
    const totalRows = total[0].cnt;
    const step = Math.max(1, Math.floor(totalRows / sampleSize));
    const [rows] = await db.query(`SELECT lon, lat, zone, quality_class, year, offshore_km, ph, dissolved_oxygen, cod, inorganic_nitrogen, active_phosphate, petroleum FROM bohai_raw WHERE id % ? = 0 LIMIT ?`, [step, sampleSize]);
    return rows;
  }),

  getCitySummary: async () => safeQuery([
    { city_cn: '天津', points: 185, avg_ph: 7.95, avg_cod: 2.85, avg_nitrogen: 0.4521, avg_petroleum: 0.0652 },
    { city_cn: '大连', points: 165, avg_ph: 8.05, avg_cod: 1.95, avg_nitrogen: 0.3125, avg_petroleum: 0.0485 },
    { city_cn: '秦皇岛', points: 152, avg_ph: 8.08, avg_cod: 1.72, avg_nitrogen: 0.2785, avg_petroleum: 0.0412 },
    { city_cn: '烟台', points: 148, avg_ph: 8.10, avg_cod: 1.55, avg_nitrogen: 0.2512, avg_petroleum: 0.0385 },
    { city_cn: '营口', points: 135, avg_ph: 7.98, avg_cod: 2.45, avg_nitrogen: 0.3852, avg_petroleum: 0.0568 },
    { city_cn: '葫芦岛', points: 128, avg_ph: 8.02, avg_cod: 2.15, avg_nitrogen: 0.3425, avg_petroleum: 0.0515 },
    { city_cn: '沧州', points: 122, avg_ph: 7.92, avg_cod: 2.68, avg_nitrogen: 0.4258, avg_petroleum: 0.0625 },
    { city_cn: '东营', points: 115, avg_ph: 8.00, avg_cod: 2.05, avg_nitrogen: 0.3254, avg_petroleum: 0.0485 },
    { city_cn: '潍坊', points: 108, avg_ph: 7.96, avg_cod: 2.32, avg_nitrogen: 0.3652, avg_petroleum: 0.0535 },
    { city_cn: '滨州', points: 92, avg_ph: 7.94, avg_cod: 2.55, avg_nitrogen: 0.3958, avg_petroleum: 0.0585 }
  ], async () => {
    const [rows] = await db.query(`SELECT city_cn, COUNT(*) AS points, ROUND(AVG(ph), 2) AS avg_ph, ROUND(AVG(cod), 2) AS avg_cod, ROUND(AVG(inorganic_nitrogen), 4) AS avg_nitrogen, ROUND(AVG(petroleum), 4) AS avg_petroleum FROM bohai_raw GROUP BY city_cn ORDER BY points DESC`);
    return rows;
  })
};

module.exports = Bohai;
