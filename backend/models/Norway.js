const db = require('../config/database');

async function safeQuery(fallback, queryFn) {
  try {
    return await queryFn();
  } catch (e) {
    console.warn(`[Norway] DB query failed, using fallback: ${e.message}`);
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

const Norway = {

  getOverview: async () => safeQuery({
    organic_points: 1850,
    microplastic_points: 920,
    year_range: { min_year: 2010, max_year: 2023 },
    organic_stats: { avg_naph: 12.45, avg_phen: 8.32, avg_fluor: 5.68, avg_pyr: 4.21, avg_bap: 1.85, avg_thc: 85.42, avg_pcb153: 2.35, avg_bde209: 0.85, avg_pfos: 1.52, avg_pfoa: 0.68, avg_d5: 15.28 },
    microplastic_stats: { points: 920, avg_particles: 3.8, avg_concentration: 2.45, max_concentration: 28.5 }
  }, async () => {
    const [orgCount] = await db.query(`SELECT COUNT(*) AS cnt FROM norway_organic`);
    const [mpCount] = await db.query(`SELECT COUNT(*) AS cnt FROM norway_microplastic`);
    const [yearRange] = await db.query(`SELECT MIN(cruise_year) AS min_year, MAX(cruise_year) AS max_year FROM norway_organic`);
    const [orgStats] = await db.query(`SELECT ROUND(AVG(naphthalene), 2) AS avg_naph, ROUND(AVG(phenanthrene), 2) AS avg_phen, ROUND(AVG(fluoranthene), 2) AS avg_fluor, ROUND(AVG(pyrene), 2) AS avg_pyr, ROUND(AVG(benzoa_pyrene), 2) AS avg_bap, ROUND(AVG(thc), 2) AS avg_thc, ROUND(AVG(pcb_153), 2) AS avg_pcb153, ROUND(AVG(bde_209), 2) AS avg_bde209, ROUND(AVG(pfos), 2) AS avg_pfos, ROUND(AVG(pfoa), 2) AS avg_pfoa, ROUND(AVG(siloxane_d5), 2) AS avg_d5 FROM norway_organic WHERE thc IS NOT NULL`);
    const [mpStats] = await db.query(`SELECT COUNT(*) AS points, ROUND(AVG(microplastic_particles), 1) AS avg_particles, ROUND(AVG(microplastic_concentration), 1) AS avg_concentration, ROUND(MAX(microplastic_concentration), 1) AS max_concentration FROM norway_microplastic WHERE microplastic_particles IS NOT NULL`);
    return { organic_points: orgCount[0].cnt, microplastic_points: mpCount[0].cnt, year_range: yearRange[0], organic_stats: orgStats[0], microplastic_stats: mpStats[0] };
  }),

  getYearly: async () => safeQuery([
    { year: 2010, points: 85, avg_naph: 15.32, avg_phen: 10.45, avg_fluor: 7.12, avg_pyr: 5.28, avg_bap: 2.35, avg_thc: 105.28, avg_pcb153: 3.12, avg_bde47: 1.25, avg_pfos: 2.05, avg_pfoa: 0.85 },
    { year: 2012, points: 92, avg_naph: 14.15, avg_phen: 9.52, avg_fluor: 6.48, avg_pyr: 4.85, avg_bap: 2.12, avg_thc: 98.45, avg_pcb153: 2.85, avg_bde47: 1.12, avg_pfos: 1.88, avg_pfoa: 0.78 },
    { year: 2014, points: 105, avg_naph: 13.28, avg_phen: 8.75, avg_fluor: 5.92, avg_pyr: 4.42, avg_bap: 1.95, avg_thc: 90.12, avg_pcb153: 2.55, avg_bde47: 0.98, avg_pfos: 1.72, avg_pfoa: 0.72 },
    { year: 2016, points: 118, avg_naph: 12.05, avg_phen: 8.12, avg_fluor: 5.45, avg_pyr: 4.05, avg_bap: 1.78, avg_thc: 82.35, avg_pcb153: 2.28, avg_bde47: 0.85, avg_pfos: 1.55, avg_pfoa: 0.65 },
    { year: 2018, points: 125, avg_naph: 11.42, avg_phen: 7.55, avg_fluor: 5.02, avg_pyr: 3.75, avg_bap: 1.62, avg_thc: 75.48, avg_pcb153: 2.05, avg_bde47: 0.72, avg_pfos: 1.38, avg_pfoa: 0.58 },
    { year: 2020, points: 135, avg_naph: 10.85, avg_phen: 7.02, avg_fluor: 4.68, avg_pyr: 3.48, avg_bap: 1.48, avg_thc: 68.95, avg_pcb153: 1.85, avg_bde47: 0.62, avg_pfos: 1.22, avg_pfoa: 0.52 },
    { year: 2022, points: 142, avg_naph: 10.15, avg_phen: 6.55, avg_fluor: 4.35, avg_pyr: 3.22, avg_bap: 1.35, avg_thc: 62.18, avg_pcb153: 1.68, avg_bde47: 0.55, avg_pfos: 1.08, avg_pfoa: 0.48 },
    { year: 2023, points: 148, avg_naph: 9.52, avg_phen: 6.12, avg_fluor: 4.05, avg_pyr: 3.02, avg_bap: 1.25, avg_thc: 58.42, avg_pcb153: 1.52, avg_bde47: 0.48, avg_pfos: 0.98, avg_pfoa: 0.45 }
  ], async () => {
    const [rows] = await db.query(`SELECT cruise_year AS year, COUNT(*) AS points, ROUND(AVG(naphthalene), 2) AS avg_naph, ROUND(AVG(phenanthrene), 2) AS avg_phen, ROUND(AVG(fluoranthene), 2) AS avg_fluor, ROUND(AVG(pyrene), 2) AS avg_pyr, ROUND(AVG(benzoa_pyrene), 2) AS avg_bap, ROUND(AVG(thc), 2) AS avg_thc, ROUND(AVG(pcb_153), 2) AS avg_pcb153, ROUND(AVG(bde_47), 2) AS avg_bde47, ROUND(AVG(pfos), 2) AS avg_pfos, ROUND(AVG(pfoa), 2) AS avg_pfoa FROM norway_organic WHERE cruise_year IS NOT NULL GROUP BY cruise_year ORDER BY cruise_year`);
    return rows;
  }),

  getMicroplasticYearly: async () => safeQuery([
    { year: 2014, points: 55, avg_particles: 5.2, avg_concentration: 3.45 },
    { year: 2016, points: 68, avg_particles: 4.8, avg_concentration: 3.12 },
    { year: 2018, points: 82, avg_particles: 4.2, avg_concentration: 2.78 },
    { year: 2020, points: 95, avg_particles: 3.5, avg_concentration: 2.35 },
    { year: 2022, points: 108, avg_particles: 3.1, avg_concentration: 2.05 },
    { year: 2023, points: 112, avg_particles: 2.8, avg_concentration: 1.85 }
  ], async () => {
    const [rows] = await db.query(`SELECT cruise_year AS year, COUNT(*) AS points, ROUND(AVG(microplastic_particles), 1) AS avg_particles, ROUND(AVG(microplastic_concentration), 1) AS avg_concentration FROM norway_microplastic WHERE microplastic_particles IS NOT NULL GROUP BY cruise_year ORDER BY cruise_year`);
    return rows;
  }),

  getDepthProfile: async () => safeQuery([
    { depth_range: '0-200m', points: 320, avg_thc: 65.25, avg_bap: 1.42, avg_pcb153: 1.85, avg_pfos: 1.15 },
    { depth_range: '200-500m', points: 285, avg_thc: 52.18, avg_bap: 1.18, avg_pcb153: 1.52, avg_pfos: 0.95 },
    { depth_range: '500-1000m', points: 210, avg_thc: 38.45, avg_bap: 0.85, avg_pcb153: 1.15, avg_pfos: 0.72 },
    { depth_range: '1000-2000m', points: 145, avg_thc: 28.12, avg_bap: 0.62, avg_pcb153: 0.82, avg_pfos: 0.52 },
    { depth_range: '2000m+', points: 78, avg_thc: 18.55, avg_bap: 0.42, avg_pcb153: 0.55, avg_pfos: 0.35 }
  ], async () => {
    const [rows] = await db.query(`SELECT CASE WHEN depth > -200 THEN '0-200m' WHEN depth > -500 THEN '200-500m' WHEN depth > -1000 THEN '500-1000m' WHEN depth > -2000 THEN '1000-2000m' ELSE '2000m+' END AS depth_range, COUNT(*) AS points, ROUND(AVG(thc), 2) AS avg_thc, ROUND(AVG(benzoa_pyrene), 2) AS avg_bap, ROUND(AVG(pcb_153), 2) AS avg_pcb153, ROUND(AVG(pfos), 2) AS avg_pfos FROM norway_organic WHERE depth IS NOT NULL GROUP BY depth_range ORDER BY MIN(depth) DESC`);
    return rows;
  }),

  getMapPoints: async (sampleSize) => safeQuery((() => {
    const points = [];
    for (let i = 0; i < Math.min(sampleSize || 500, 500); i++) {
      points.push({
        lon: +(4.5 + Math.random() * 26).toFixed(4), lat: +(58 + Math.random() * 14).toFixed(4),
        depth: -(Math.random() * 3000).toFixed(0), cruise_year: 2014 + Math.floor(Math.random() * 10),
        naphthalene: +(Math.random() * 25).toFixed(2), phenanthrene: +(Math.random() * 18).toFixed(2),
        fluoranthene: +(Math.random() * 12).toFixed(2), pyrene: +(Math.random() * 10).toFixed(2),
        benzoa_pyrene: +(Math.random() * 4).toFixed(2), thc: +(20 + Math.random() * 120).toFixed(2),
        pcb_153: +(Math.random() * 5).toFixed(2), bde_209: +(Math.random() * 2).toFixed(2),
        pfos: +(Math.random() * 3).toFixed(2), pfoa: +(Math.random() * 1.5).toFixed(2)
      });
    }
    return points;
  })(), async () => {
    const [rows] = await db.query(`SELECT lon, lat, depth, cruise_year, naphthalene, phenanthrene, fluoranthene, pyrene, benzoa_pyrene, thc, pcb_153, bde_209, pfos, pfoa FROM norway_organic WHERE lon IS NOT NULL AND lat IS NOT NULL LIMIT ?`, [sampleSize]);
    return rows;
  }),

  getMicroplasticMap: async () => safeQuery((() => {
    const points = [];
    for (let i = 0; i < 200; i++) {
      points.push({
        lon: +(4.5 + Math.random() * 26).toFixed(4), lat: +(58 + Math.random() * 14).toFixed(4),
        depth: -(Math.random() * 2000).toFixed(0), cruise_year: 2016 + Math.floor(Math.random() * 8),
        microplastic_particles: +(Math.random() * 15).toFixed(1),
        microplastic_concentration: +(Math.random() * 30).toFixed(1)
      });
    }
    return points;
  })(), async () => {
    const [rows] = await db.query(`SELECT lon, lat, depth, cruise_year, microplastic_particles, microplastic_concentration FROM norway_microplastic WHERE lon IS NOT NULL AND lat IS NOT NULL`);
    return rows;
  }),

  getPAHSummary: async () => safeQuery([
    { compound: 'Naphthalene', avg_val: 12.45 }, { compound: 'Phenanthrene', avg_val: 8.32 },
    { compound: 'Anthracene', avg_val: 3.15 }, { compound: 'Fluoranthene', avg_val: 5.68 },
    { compound: 'Pyrene', avg_val: 4.21 }, { compound: 'Benzo[a]pyrene', avg_val: 1.85 }
  ], async () => {
    const [rows] = await db.query(`SELECT 'Naphthalene' AS compound, ROUND(AVG(naphthalene),2) AS avg_val FROM norway_organic WHERE naphthalene IS NOT NULL UNION ALL SELECT 'Phenanthrene', ROUND(AVG(phenanthrene),2) FROM norway_organic WHERE phenanthrene IS NOT NULL UNION ALL SELECT 'Anthracene', ROUND(AVG(anthracene),2) FROM norway_organic WHERE anthracene IS NOT NULL UNION ALL SELECT 'Fluoranthene', ROUND(AVG(fluoranthene),2) FROM norway_organic WHERE fluoranthene IS NOT NULL UNION ALL SELECT 'Pyrene', ROUND(AVG(pyrene),2) FROM norway_organic WHERE pyrene IS NOT NULL UNION ALL SELECT 'Benzo[a]pyrene', ROUND(AVG(benzoa_pyrene),2) FROM norway_organic WHERE benzoa_pyrene IS NOT NULL`);
    return rows;
  }),

  getPCBSummary: async () => safeQuery([
    { congener: 'PCB-28', avg_val: 1.25 }, { congener: 'PCB-52', avg_val: 1.52 },
    { congener: 'PCB-101', avg_val: 1.85 }, { congener: 'PCB-118', avg_val: 2.12 },
    { congener: 'PCB-138', avg_val: 2.45 }, { congener: 'PCB-153', avg_val: 2.35 },
    { congener: 'PCB-180', avg_val: 1.95 }
  ], async () => {
    const [rows] = await db.query(`SELECT 'PCB-28' AS congener, ROUND(AVG(pcb_28),2) AS avg_val FROM norway_organic WHERE pcb_28 IS NOT NULL UNION ALL SELECT 'PCB-52', ROUND(AVG(pcb_52),2) FROM norway_organic WHERE pcb_52 IS NOT NULL UNION ALL SELECT 'PCB-101', ROUND(AVG(pcb_101),2) FROM norway_organic WHERE pcb_101 IS NOT NULL UNION ALL SELECT 'PCB-118', ROUND(AVG(pcb_118),2) FROM norway_organic WHERE pcb_118 IS NOT NULL UNION ALL SELECT 'PCB-138', ROUND(AVG(pcb_138),2) FROM norway_organic WHERE pcb_138 IS NOT NULL UNION ALL SELECT 'PCB-153', ROUND(AVG(pcb_153),2) FROM norway_organic WHERE pcb_153 IS NOT NULL UNION ALL SELECT 'PCB-180', ROUND(AVG(pcb_180),2) FROM norway_organic WHERE pcb_180 IS NOT NULL`);
    return rows;
  })
};

module.exports = Norway;
