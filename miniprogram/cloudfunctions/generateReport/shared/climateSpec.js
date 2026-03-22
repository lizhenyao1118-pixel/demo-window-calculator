const CLIMATE_ZONE_MAP = {
  '哈尔滨': { code: 'SC', name: '严寒', kBase: 1.8 },
  '沈阳': { code: 'SC', name: '严寒', kBase: 1.8 },
  '北京': { code: 'HD', name: '寒冷', kBase: 2.2 },
  '西安': { code: 'HD', name: '寒冷', kBase: 2.2 },
  '上海': { code: 'HSCW', name: '夏热冬冷', kBase: 2.5 },
  '南京': { code: 'HSCW', name: '夏热冬冷', kBase: 2.5 },
  '杭州': { code: 'HSCW', name: '夏热冬冷', kBase: 2.5 },
  '武汉': { code: 'HSCW', name: '夏热冬冷', kBase: 2.5 },
  '成都': { code: 'HSCW', name: '夏热冬冷', kBase: 2.5 },
  '广州': { code: 'HSWA', name: '夏热冬暖', kBase: 3.0 },
  '深圳': { code: 'HSWA', name: '夏热冬暖', kBase: 3.0 }
};

const HEATING_CORRECTION = {
  central: 0,
  self: -0.2,
  none: 0.2
};

function getClimateZone(city) {
  const zone = CLIMATE_ZONE_MAP[city];
  if (!zone) {
    return { code: 'UNKNOWN', name: '气候区未识别', kBase: 2.5 };
  }
  return zone;
}

function calcThermal(city, heatingType) {
  const zone = getClimateZone(city);
  const correction = HEATING_CORRECTION[heatingType] || 0;
  const K_target = Math.max(zone.kBase + correction, 0.8);
  return { K_target, climateZone: zone };
}

module.exports = {
  getClimateZone,
  calcThermal,
  CLIMATE_ZONE_MAP,
  HEATING_CORRECTION
};
