const CLIMATE_SPEC = {
  '北京': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 1.8, kMin: 1.6, kLimit: 1.1, kNote: '北京地方标准 DB11/891-2020 要求外窗 K≤1.1 W/(m²·K)，严于本系统推荐值。对标本地法规时，以地方标准正文为准。', isCoastal: false, typhoonRisk: false, basePressure: 3.5, climateType: 'cold' },
  '沈阳': { climateZone: 'SC', climateZoneCN: '严寒', kBase: 1.8, kMin: 1.5, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'severe_cold' },
  '西安': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 2.0, kMin: 1.8, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'cold' },
  '上海': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.0, kMin: 1.8, isCoastal: true, typhoonRisk: false, basePressure: 3.0, climateType: 'hot_summer' },
  '杭州': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: true, typhoonRisk: false, basePressure: 3.0, climateType: 'hot_summer' },
  '南京': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'hot_summer' },
  '武汉': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.5, kMin: 2.3, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'hot_summer' },
  '成都': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.5, kMin: 2.3, isCoastal: false, typhoonRisk: false, basePressure: 2.5, climateType: 'hot_summer' },
  '广州': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.4, kMin: 2.2, isCoastal: true, typhoonRisk: true, basePressure: 3.5, climateType: 'hot_year' },
  '深圳': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.2, kMin: 2.0, isCoastal: true, typhoonRisk: true, basePressure: 4.0, climateType: 'hot_year' },
  '天津': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 1.8, kMin: 1.6, isCoastal: true, typhoonRisk: false, basePressure: 3.5, climateType: 'cold' },
  '大连': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 1.8, kMin: 1.6, isCoastal: true, typhoonRisk: true, basePressure: 3.5, climateType: 'cold' },
  '济南': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 1.8, kMin: 1.6, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'cold' },
  '青岛': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 1.8, kMin: 1.6, isCoastal: true, typhoonRisk: true, basePressure: 3.5, climateType: 'cold' },
  '合肥': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'hot_summer' },
  '福州': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.4, kMin: 2.2, isCoastal: true, typhoonRisk: true, basePressure: 4.0, climateType: 'hot_year' },
  '厦门': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.4, kMin: 2.2, isCoastal: true, typhoonRisk: true, basePressure: 4.5, climateType: 'hot_year' },
  '长沙': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: false, typhoonRisk: false, basePressure: 2.5, climateType: 'hot_summer' },
  '南宁': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.4, kMin: 2.2, isCoastal: false, typhoonRisk: true, basePressure: 3.0, climateType: 'hot_year' },
  '海口': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.5, kMin: 2.3, isCoastal: true, typhoonRisk: true, basePressure: 5.0, climateType: 'hot_year' },
  '重庆': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: false, typhoonRisk: false, basePressure: 2.5, climateType: 'hot_summer' },
  '宁波': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.0, kMin: 1.8, isCoastal: true, typhoonRisk: true, basePressure: 3.5, climateType: 'hot_summer' },
  '哈尔滨': { climateZone: 'SC', climateZoneCN: '严寒', kBase: 1.8, kMin: 1.5, isCoastal: false, typhoonRisk: false, basePressure: 3.0, climateType: 'severe_cold' }
};

const HEATING_CORRECTION = {
  central: 0,
  self: -0.2,
  none: 0
};

function getClimateSpec(city) {
  return CLIMATE_SPEC[city] || null;
}

function getClimateZone(city) {
  const spec = getClimateSpec(city);
  if (!spec) return { code: 'UNKNOWN', name: '气候区未识别', kBase: 2.5, kMin: 2.3 };
  return { code: spec.climateZone, name: spec.climateZoneCN, kBase: spec.kBase, kMin: spec.kMin };
}

function calcThermal(city, heatingType) {
  const zone = getClimateZone(city);
  const correction = HEATING_CORRECTION[heatingType] || 0;
  const raw = zone.kBase + correction;
  const K_target = Math.max(Number(raw.toFixed(1)), zone.kMin || 0.8);
  return { K_target, climateZone: zone };
}

module.exports = {
  getClimateZone,
  getClimateSpec,
  calcThermal,
  CLIMATE_SPEC,
  HEATING_CORRECTION
};
