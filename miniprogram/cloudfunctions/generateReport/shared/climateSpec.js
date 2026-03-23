const CLIMATE_SPEC = {
  '北京': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 1.8, kMin: 1.6, isCoastal: false, typhoonRisk: false },
  '沈阳': { climateZone: 'SC', climateZoneCN: '严寒', kBase: 1.8, kMin: 1.5, isCoastal: false, typhoonRisk: false },
  '西安': { climateZone: 'HD', climateZoneCN: '寒冷', kBase: 2.0, kMin: 1.8, isCoastal: false, typhoonRisk: false },
  '上海': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.0, kMin: 1.8, isCoastal: true, typhoonRisk: false },
  '杭州': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: true, typhoonRisk: false },
  '南京': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.2, kMin: 2.0, isCoastal: false, typhoonRisk: false },
  '武汉': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.5, kMin: 2.3, isCoastal: false, typhoonRisk: false },
  '成都': { climateZone: 'HSCW', climateZoneCN: '夏热冬冷', kBase: 2.5, kMin: 2.3, isCoastal: false, typhoonRisk: false },
  '广州': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.4, kMin: 2.2, isCoastal: true, typhoonRisk: true },
  '深圳': { climateZone: 'HSWA', climateZoneCN: '夏热冬暖', kBase: 2.2, kMin: 2.0, isCoastal: true, typhoonRisk: true }
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
