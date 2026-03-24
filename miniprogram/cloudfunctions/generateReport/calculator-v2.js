// calculator-v2.js - 修复P0缺陷：P3线性化 + Rw加权 + 城市降级 + 安全冲突
const CITY_MAP = {
  "北京": { climate: "cold", wind_zone: "W4", base_P3: 3.5 },
  "上海": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "广州": { climate: "hot_year", wind_zone: "W4", base_P3: 3.5 },
  "深圳": { climate: "hot_year", wind_zone: "W5", base_P3: 4.0 },
  "成都": { climate: "hot_summer", wind_zone: "W2", base_P3: 2.5 },
  "武汉": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "西安": { climate: "cold", wind_zone: "W3", base_P3: 3.0 },
  "杭州": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "南京": { climate: "hot_summer", wind_zone: "W3", base_P3: 3.0 },
  "沈阳": { climate: "severe_cold", wind_zone: "W3", base_P3: 3.0 },
  "哈尔滨": { climate: "severe_cold", wind_zone: "W3", base_P3: 3.0 },
};

// FIX P0-1: P3连续线性化
function calcP3(city, floor, total_floors) {
  const config = CITY_MAP[city] || { base_P3: 2.5, wind_zone: "W2" };
  const ratio = Math.min(floor / Math.max(total_floors, 1), 1.0);
  const floor_adj = parseFloat((ratio * 0.6).toFixed(2));
  const value = parseFloat((config.base_P3 + floor_adj).toFixed(2));
  
  const warnings = [];
  if (total_floors > 50) warnings.push("超过50层，建议专业风压评估");
  if (value > 5.0) warnings.push("P3>5.0，超出常规范围");
  
  return { value, warnings };
}

function calcRw({ noise_type, noise_dist, pain_point }) {
  const BASE = { main_road: 35, elevated: 38, rail: 40, quiet: 30 };
  const DIST = { lt20: 3, "20to50": 0, gt50: -3, gt50_shielded: -3 };

  let rw = (BASE[noise_type] || 30) + (DIST[noise_dist] || 0);

  const noise_usage = pain_point === 'sound' ? 'sleep' : 'general';
  const USAGE_ADJ = { sleep: 3, office: 2, living: 1, general: 0 };
  rw += noise_type === 'rail' ? 0 : (USAGE_ADJ[noise_usage] || 0);

  return Math.min(Math.max(rw, 28), 45);
}

const { CLIMATE_SPEC, getClimateZone } = require('./shared/climateSpec.js');

function calcThermal(city, answers) {
  const spec = CLIMATE_SPEC[city];
  if (!spec) {
    return {
      K_target: 2.5,
      kBase: 2.5,
      kMin: 2.3,
      kRange: '2.3~2.5',
      climateZone: 'UNKNOWN',
      climateZoneCN: '未知',
      adjustment: 0,
      appliedFactor: null,
      appliedLabel: null,
      corrections: []
    };
  }

  const heatingType = answers.heatingType || answers.heating_type || 'central';
  const westShadingRaw = (answers.westShading !== undefined) ? answers.westShading : answers.west_shading;
  const westShading = westShadingRaw === true || westShadingRaw === '有遮挡';
  const orientation = answers.orientation;
  const familyRisk = answers.family_risk || answers.familyRisk || [];

  const corrections = [];
  if (heatingType === 'self') {
    corrections.push({ factor: 'heating', value: -0.2, label: '自采暖保温加严' });
  } else if (heatingType === 'none') {
    corrections.push({ factor: 'heating', value: 0, label: '无供暖' });
  } else {
    corrections.push({ factor: 'heating', value: 0, label: '集中供暖' });
  }

  if (orientation === 'west' && !westShading) {
    corrections.push({ factor: 'westSun', value: -0.1, label: '西向隔热加严' });
  }

  const familyArr = Array.isArray(familyRisk) ? familyRisk : [];
  if (familyArr.includes('large_fixed') || familyArr.includes('floor_window') || familyArr.includes('landing') || familyArr.includes('glass_wall')) {
    corrections.push({ factor: 'bigWindow', value: -0.2, label: '落地窗隔热加严' });
  }

  const adjustment = corrections.length > 0 ? Math.min(...corrections.map(c => c.value)) : 0;
  const appliedCorrection = corrections.find(c => c.value === adjustment && c.value !== 0);
  const appliedFactor = appliedCorrection ? appliedCorrection.factor : null;
  const appliedLabel = appliedCorrection ? appliedCorrection.label : null;

  const rawK = spec.kBase + adjustment;
  const K_target = Math.max(Number(rawK.toFixed(1)), spec.kMin);

  const kMin = Number(spec.kMin.toFixed(1));
  const kBase = Number(spec.kBase.toFixed(1));

  return {
    K_target,
    kBase,
    kMin,
    kRange: `${spec.kMin.toFixed(1)}~${spec.kBase.toFixed(1)}`,
    climateZone: spec.climateZone,
    climateZoneCN: spec.climateZoneCN,
    adjustment,
    appliedFactor,
    appliedLabel,
    corrections
  };
}

function calcSHGC(city, orientation, west_shading) {
  const zone = getClimateZone(city);
  const SHGC_BY_CODE = { HSWA: 0.30, HSCW: 0.35, HD: 0.45, SC: 0.50 };
  const base = SHGC_BY_CODE[zone.code] ?? 0.35;
  const isWest = orientation === "west" || orientation === "西";
  const shgc_adj = (isWest && west_shading === false) ? -0.05 : 0;
  return {
    SHGC: parseFloat((base + shgc_adj).toFixed(2)),
    shgc_note: shgc_adj !== 0 ? "西晒无遮阳，SHGC已下调0.05" : null
  };
}

// FIX P0-4: 城市降级处理
function getCityConfig(city) {
  if (CITY_MAP[city]) return { ...CITY_MAP[city], degraded: false };
  return {
    climate: "hot_summer", wind_zone: "W2", base_P3: 2.5,
    degraded: true,
    degraded_msg: `城市"${city}"暂未精确覆盖，参数基于保守标准推算`
  };
}

// FIX P0-4: 冲突消解（新增safety_budget_conflict）
function resolveConflicts(computed, answers) {
  const { budget_tier, pain_point, family_risk, floor, total_floors } = answers;
  const risk_flags = {};
  const notes = [];
  const ratio = floor / Math.max(total_floors, 1);

  if (pain_point === "view" && ratio > 0.6 && budget_tier === "A") {
    risk_flags.budget_conflict = true;
    notes.push("预算与楼层视野需求存在冲突");
  }

  const riskArr = Array.isArray(family_risk) ? family_risk : [];
  const hasFamilySafety = riskArr.includes('child') || riskArr.includes('elder');

  if (hasFamilySafety && budget_tier === "A") {
    risk_flags.safety_budget_conflict = true;
    notes.push("安全防护条款成本高于A档预算，建议升级至B档");
  }

  return { ...computed, risk_flags, conflict_notes: notes };
}

// 安全条款生成
function buildSafetyRedLine(family_risk) {
  const items = [];
  const arr = Array.isArray(family_risk) ? family_risk : [];
  if (arr.includes("child")) {
    items.push("窗台高度≥900mm或加装防护栏杆");
    items.push("开启扇限位器（开启角度≤100mm）");
    items.push("夹胶玻璃（防坠落碎裂）");
  }
  if (arr.includes("elder")) {
    items.push("执手操作力≤40N（适老化）");
    items.push("门槛高度≤20mm（防绊倒）");
  }
  return items;
}

const { BUDGET_SPEC } = require('./shared/budgetSpec.js');

// 主计算入口
function calculateAll(assessment) {
  const { city, floor, total_floors, noise_type, noise_dist, orientation, westShading, west_shading, pain_point, heating_type, family_risk, budget_tier } = assessment;
  const effectiveWestShading = (westShading !== undefined) ? westShading : west_shading;
  
  const cityConfig = getCityConfig(city);
  const p3Result = calcP3(city, floor, total_floors);
  const rwValue = calcRw({ noise_type, noise_dist, pain_point });
  const thermalResult = calcThermal(city, { ...assessment, west_shading: effectiveWestShading, heatingType: heating_type });
  const solarResult = calcSHGC(city, orientation, effectiveWestShading);
  const K_target = Number(thermalResult.K_target);
  
  const computed = {
    city,
    climate_zone: thermalResult.climateZone,
    climateZone: { code: thermalResult.climateZone, name: thermalResult.climateZoneCN, kBase: thermalResult.kBase, kMin: thermalResult.kMin },
    climateZoneCN: thermalResult.climateZoneCN,
    kBase: thermalResult.kBase,
    kMin: thermalResult.kMin,
    kRange: thermalResult.kRange,
    appliedFactor: thermalResult.appliedFactor,
    appliedLabel: thermalResult.appliedLabel,
    corrections: thermalResult.corrections,
    wind_zone: cityConfig.wind_zone,
    floor, total_floors, height_ratio: floor / Math.max(total_floors, 1),
    P3: p3Result.value,
    P3_required: p3Result.value,
    Rw: rwValue,
    Rw_required: rwValue,
    K: K_target,
    K_target: K_target,
    SHGC: solarResult.SHGC,
    SHGC_target: solarResult.SHGC,
    budget_tier, degraded: cityConfig.degraded,
    degraded_msg: cityConfig.degraded_msg,
    shgc_note: solarResult.shgc_note
  };
  
  const resolved = resolveConflicts(computed, assessment);
  resolved.safety_items = buildSafetyRedLine(family_risk);
  resolved.hasSafetyClause = Array.isArray(family_risk) && (family_risk.includes('child') || family_risk.includes('elder'));
  resolved.budget_spec = BUDGET_SPEC[budget_tier] || BUDGET_SPEC["B"];
  
  return resolved;
}

function calcSound(answers) {
  const Rw = calcRw({
    noise_type: answers.noise_type,
    noise_dist: answers.noise_dist,
    pain_point: answers.pain_point
  });
  return { Rw };
}

function calcWindPressure(city, answers) {
  const floor = Number(answers.floor) || 0;
  const total = Number(answers.total_floors || answers.totalFloors) || 1;
  const p3 = calcP3(city, floor, total);
  return { P3: p3.value, warnings: p3.warnings };
}

function calcSealGrades({ city, floor, windowType }) {
  const cityMap = {
    beijing: '北京',
    shenyang: '沈阳',
    xian: '西安',
    shanghai: '上海',
    hangzhou: '杭州',
    nanjing: '南京',
    wuhan: '武汉',
    chengdu: '成都',
    guangzhou: '广州',
    shenzhen: '深圳'
  };

  const key = CLIMATE_SPEC[city] ? city : (cityMap[String(city || '').toLowerCase()] || city);
  if (!key || !CLIMATE_SPEC[key]) throw new Error(`calcSealGrades: 无效城市 "${city}"`);
  const fl = Number(floor);
  if (!Number.isFinite(fl) || fl < 1) throw new Error(`calcSealGrades: 无效楼层 "${floor}"`);

  const spec = CLIMATE_SPEC[key];
  const isHighFloor = fl >= 7;
  const isSevere = spec.climateZone === 'SC';
  const isCoastalOrTyphoon = !!spec.isCoastal || !!spec.typhoonRisk;
  const isFixed = windowType === 'fixed';

  let airMin = 4, airRec = 4;
  if (isHighFloor) airRec = 6;
  if (isSevere) airRec = Math.max(airRec, 6);
  if (isHighFloor && isSevere) airMin = 6;

  let waterMin = 3, waterRec = 4;
  if (isCoastalOrTyphoon) { waterMin = 4; waterRec = 5; }
  if (isHighFloor && isCoastalOrTyphoon) {
    waterMin = Math.max(waterMin, 5);
    waterRec = Math.max(waterRec, 6);
  }

  if (isFixed) {
    airRec += 1;
    waterRec += 1;
  }

  return {
    airMin, airRec, waterMin, waterRec,
    airGap: airRec - airMin,
    waterGap: waterRec - waterMin,
    isFixed,
    _debug: { isHighFloor, isSevere, isCoastalOrTyphoon, climateZone: spec.climateZone }
  };
}

module.exports = { calculateAll, calcThermal, calcSound, calcWindPressure, calcSealGrades };
