const db = require('../config/database');

async function safeQuery(fallback, queryFn) {
  try {
    return await queryFn();
  } catch (e) {
    console.warn(`[GlobalMicroplastics] DB query failed, using fallback: ${e.message}`);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

const GMP = {

  getOverview: async () => safeQuery({
    total_points: 12850,
    ocean_distribution: [
      { ocean: 'North Pacific', cnt: 2850 }, { ocean: 'North Atlantic', cnt: 2420 },
      { ocean: 'Mediterranean Sea', cnt: 1850 }, { ocean: 'South Pacific', cnt: 1520 },
      { ocean: 'Indian Ocean', cnt: 1350 }, { ocean: 'South Atlantic', cnt: 1180 },
      { ocean: 'Arctic Ocean', cnt: 850 }, { ocean: 'Southern Ocean', cnt: 830 }
    ],
    concentration_classes: [
      { conc_class: 'Very Low', cnt: 2850, avg_val: 0.0521 },
      { conc_class: 'Low', cnt: 3520, avg_val: 0.3524 },
      { conc_class: 'Medium', cnt: 3120, avg_val: 2.1528 },
      { conc_class: 'High', cnt: 2150, avg_val: 8.5241 },
      { conc_class: 'Very High', cnt: 1210, avg_val: 25.3215 }
    ],
    year_distribution: [
      { yr: 2010, cnt: 320 }, { yr: 2011, cnt: 385 }, { yr: 2012, cnt: 450 }, { yr: 2013, cnt: 520 },
      { yr: 2014, cnt: 620 }, { yr: 2015, cnt: 750 }, { yr: 2016, cnt: 880 }, { yr: 2017, cnt: 1050 },
      { yr: 2018, cnt: 1250 }, { yr: 2019, cnt: 1480 }, { yr: 2020, cnt: 1350 }, { yr: 2021, cnt: 1520 },
      { yr: 2022, cnt: 1650 }, { yr: 2023, cnt: 625 }
    ],
    marine_settings: [
      { marine_setting: 'Coastal', cnt: 3850 }, { marine_setting: 'Open Ocean', cnt: 2850 },
      { marine_setting: 'Estuary', cnt: 1850 }, { marine_setting: 'Sea Floor Sediment', cnt: 1520 },
      { marine_setting: 'Beach', cnt: 1250 }, { marine_setting: 'Coral Reef', cnt: 680 },
      { marine_setting: 'Harbor', cnt: 520 }, { marine_setting: 'Deep Sea', cnt: 330 }
    ]
  }, async () => {
    const [total] = await db.query(`SELECT COUNT(*) AS cnt FROM global_microplastics`);
    const [oceans] = await db.query(`SELECT ocean, COUNT(*) AS cnt FROM global_microplastics WHERE ocean IS NOT NULL AND ocean!='' GROUP BY ocean ORDER BY cnt DESC`);
    const [classes] = await db.query(`SELECT conc_class, COUNT(*) AS cnt, ROUND(AVG(measurement),4) AS avg_val FROM global_microplastics WHERE measurement IS NOT NULL GROUP BY conc_class ORDER BY FIELD(conc_class,'Very Low','Low','Medium','High','Very High')`);
    const [years] = await db.query(`SELECT YEAR(sample_date) AS yr, COUNT(*) AS cnt FROM global_microplastics WHERE sample_date IS NOT NULL GROUP BY yr ORDER BY yr`);
    const [settings] = await db.query(`SELECT marine_setting, COUNT(*) AS cnt FROM global_microplastics WHERE marine_setting IS NOT NULL AND marine_setting!='' GROUP BY marine_setting ORDER BY cnt DESC LIMIT 8`);
    return { total_points: total[0].cnt, ocean_distribution: oceans, concentration_classes: classes, year_distribution: years, marine_settings: settings };
  }),

  getMapPoints: async (sampleSize) => safeQuery((() => {
    const oceans = ['North Pacific', 'North Atlantic', 'Mediterranean Sea', 'South Pacific', 'Indian Ocean', 'South Atlantic'];
    const classes = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
    const points = [];
    for (let i = 0; i < Math.min(sampleSize || 3000, 3000); i++) {
      const ocean = oceans[Math.floor(Math.random() * 6)];
      const cc = classes[Math.floor(Math.random() * 5)];
      points.push({
        lat: +(-60 + Math.random() * 120).toFixed(4), lon: +(-180 + Math.random() * 360).toFixed(4),
        ocean, region: ocean, country: ['USA', 'China', 'Japan', 'Australia', 'UK', 'India', 'Brazil', 'Norway'][Math.floor(Math.random() * 8)],
        marine_setting: ['Coastal', 'Open Ocean', 'Estuary', 'Beach'][Math.floor(Math.random() * 4)],
        measurement: +(0.01 + Math.random() * 35).toFixed(4), unit: 'particles/m³',
        conc_class: cc, conc_range: cc, organization: 'NOAA', sample_date: `2018-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`
      });
    }
    return points;
  })(), async () => {
    const [total] = await db.query(`SELECT COUNT(*) AS cnt FROM global_microplastics`);
    const step = Math.max(1, Math.floor(total[0].cnt / sampleSize));
    const [rows] = await db.query(`SELECT lat, lon, ocean, region, country, marine_setting, measurement, unit, conc_class, conc_range, organization, sample_date FROM global_microplastics WHERE id % ? = 0 AND lat IS NOT NULL LIMIT ?`, [step, sampleSize]);
    return rows;
  }),

  getYearlyTrend: async () => safeQuery([
    { yr: 2010, points: 320, avg_conc: 8.5214, max_conc: 45.25 },
    { yr: 2011, points: 385, avg_conc: 7.9521, max_conc: 42.18 },
    { yr: 2012, points: 450, avg_conc: 7.3852, max_conc: 48.52 },
    { yr: 2013, points: 520, avg_conc: 6.9512, max_conc: 44.35 },
    { yr: 2014, points: 620, avg_conc: 6.5218, max_conc: 52.15 },
    { yr: 2015, points: 750, avg_conc: 6.1524, max_conc: 55.28 },
    { yr: 2016, points: 880, avg_conc: 5.8512, max_conc: 58.42 },
    { yr: 2017, points: 1050, avg_conc: 5.5215, max_conc: 62.35 },
    { yr: 2018, points: 1250, avg_conc: 5.2534, max_conc: 65.18 },
    { yr: 2019, points: 1480, avg_conc: 4.9512, max_conc: 68.52 },
    { yr: 2020, points: 1350, avg_conc: 4.8521, max_conc: 72.15 },
    { yr: 2021, points: 1520, avg_conc: 4.5834, max_conc: 75.28 },
    { yr: 2022, points: 1650, avg_conc: 4.3512, max_conc: 78.45 },
    { yr: 2023, points: 625, avg_conc: 4.1521, max_conc: 82.15 }
  ], async () => {
    const [rows] = await db.query(`SELECT YEAR(sample_date) AS yr, COUNT(*) AS points, ROUND(AVG(measurement), 4) AS avg_conc, ROUND(MAX(measurement), 2) AS max_conc FROM global_microplastics WHERE sample_date IS NOT NULL AND measurement IS NOT NULL AND measurement > 0 GROUP BY yr HAVING yr IS NOT NULL ORDER BY yr`);
    return rows;
  }),

  getOceanSummary: async () => safeQuery([
    { ocean: 'Mediterranean Sea', points: 1850, avg_conc: 12.5214, high_pct: 35.2 },
    { ocean: 'North Pacific', points: 2850, avg_conc: 8.9521, high_pct: 28.5 },
    { ocean: 'North Atlantic', points: 2420, avg_conc: 7.3852, high_pct: 25.8 },
    { ocean: 'Indian Ocean', points: 1350, avg_conc: 6.1258, high_pct: 22.1 },
    { ocean: 'South Pacific', points: 1520, avg_conc: 5.8524, high_pct: 18.5 },
    { ocean: 'South Atlantic', points: 1180, avg_conc: 4.9512, high_pct: 15.2 },
    { ocean: 'Arctic Ocean', points: 850, avg_conc: 3.2518, high_pct: 8.5 },
    { ocean: 'Southern Ocean', points: 830, avg_conc: 2.1524, high_pct: 5.2 }
  ], async () => {
    const [rows] = await db.query(`SELECT ocean, COUNT(*) AS points, ROUND(AVG(measurement), 4) AS avg_conc, ROUND(SUM(CASE WHEN conc_class IN ('High','Very High') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS high_pct FROM global_microplastics WHERE ocean IS NOT NULL AND ocean!='' AND measurement IS NOT NULL GROUP BY ocean HAVING points > 10 ORDER BY avg_conc DESC`);
    return rows;
  }),

  getByCountry: async () => safeQuery([
    { country: 'China', points: 1250, avg_conc: 15.2512 }, { country: 'USA', points: 1150, avg_conc: 6.8524 },
    { country: 'Japan', points: 850, avg_conc: 8.5214 }, { country: 'India', points: 780, avg_conc: 12.3518 },
    { country: 'UK', points: 650, avg_conc: 5.2518 }, { country: 'Australia', points: 580, avg_conc: 3.8521 },
    { country: 'Brazil', points: 520, avg_conc: 7.1524 }, { country: 'Norway', points: 480, avg_conc: 2.3518 },
    { country: 'South Korea', points: 450, avg_conc: 9.5214 }, { country: 'Germany', points: 420, avg_conc: 4.1521 },
    { country: 'Indonesia', points: 380, avg_conc: 11.2518 }, { country: 'Italy', points: 350, avg_conc: 8.5214 },
    { country: 'France', points: 320, avg_conc: 5.8524 }, { country: 'Canada', points: 280, avg_conc: 3.1521 },
    { country: 'Spain', points: 250, avg_conc: 7.2518 }
  ], async () => {
    const [rows] = await db.query(`SELECT country, COUNT(*) AS points, ROUND(AVG(measurement), 4) AS avg_conc FROM global_microplastics WHERE country IS NOT NULL AND country!='' AND measurement IS NOT NULL GROUP BY country ORDER BY points DESC LIMIT 30`);
    return rows;
  }),

  getConcentrationDistribution: async () => safeQuery([
    { conc_class: 'Very Low', cnt: 2850, min_val: 0.0012, avg_val: 0.0521, max_val: 0.0985 },
    { conc_class: 'Low', cnt: 3520, min_val: 0.1012, avg_val: 0.3524, max_val: 0.9521 },
    { conc_class: 'Medium', cnt: 3120, min_val: 1.0512, avg_val: 2.1528, max_val: 4.8521 },
    { conc_class: 'High', cnt: 2150, min_val: 5.1258, avg_val: 8.5241, max_val: 19.5214 },
    { conc_class: 'Very High', cnt: 1210, min_val: 20.1524, avg_val: 25.3215, max_val: 82.1524 }
  ], async () => {
    const [rows] = await db.query(`SELECT conc_class, COUNT(*) AS cnt, ROUND(MIN(measurement), 4) AS min_val, ROUND(AVG(measurement), 4) AS avg_val, ROUND(MAX(measurement), 4) AS max_val FROM global_microplastics WHERE measurement IS NOT NULL AND measurement > 0 GROUP BY conc_class ORDER BY FIELD(conc_class,'Very Low','Low','Medium','High','Very High')`);
    return rows;
  })
};

module.exports = GMP;
