/**
 * documentMapper.js
 * answers + resolved → sections 完整映射
 * 版本：2026-03-14 最终修复版（含价格区间更新）
 */

// ═══════════════════════════════════════════════════════════════
// 常量定义
// ═══════════════════════════════════════════════════════════════

const STANDARDS_MAP = {
  wind_pressure: {
    code: 'GB/T 7106-2019',
    short: 'GB/T 7106',
    name: '建筑外门窗气密、水密、抗风压性能检测方法'
  },
  sound_insulation: {
    code: 'GB/T 8485-2008',
    short: 'GB/T 8485',
    name: '建筑门窗空气声隔声性能分级及检测方法'
  },
  thermal: {
    code: 'GB/T 8484-2020',
    short: 'GB/T 8484',
    name: '建筑外门窗保温性能检测方法'
  },
  shgc: {
    code: 'GB/T 2680-2021',
    short: 'GB/T 2680',
    name: '建筑玻璃 可见光透射比、太阳光直接透射比等测定'
  },
  safety_glass: {
    code: 'GB 15763.3-2009',
    short: 'GB 15763.3',
    name: '建筑用安全玻璃 第3部分：夹层玻璃'
  },
  product_spec: {
    code: 'GB/T 8478-2020',
    short: 'GB/T 8478',
    name: '铝合金门窗'
  }
};

// 字段映射：calculator-v2 输出 vs documentMapper 使用
const FIELD_MAP = {
  P3: 'P3_required',
  Rw: 'Rw_required', 
  K: 'K_target',
  SHGC: 'SHGC_target'
};

const TERM = {
  paramLabel: '本案目标值',
  threshold: '推荐技术门槛',
  excludeSoft: '建议不予优先考虑',
  excludeHard: '方案即视为不合格',
  tierA: '经济实用 A档',
  tierB: '舒适均衡 B档',
  tierC: '品质进阶 C档',
  tierD: '定制高端 D档',
  suggestUpgrade: '升至',
  suggestAdjust: '建议适当上调'
};

function getTierLabel(tier) {
  const map = { A: TERM.tierA, B: TERM.tierB, C: TERM.tierC, D: TERM.tierD };
  return map[tier] || tier;
}

const { GLASS_LEVELS, BUDGET_SPEC, getNextTier } = require('./shared/budgetSpec.js');
const { getInsulationBarRequirement } = require('./shared/thermalSpec.js');
const { resolveGlassConfig } = require('./arbitrator.js');
const { getClimateZone, CLIMATE_SPEC } = require('./shared/climateSpec.js');
const { calcSealGrades } = require('./calculator-v2.js');
const { buildRedlineRegistry } = require('./shared/redlineSpec.js');
const { ACCEPTANCE_ITEMS_WINDOW, buildAcceptanceItems } = require('./shared/acceptanceSpec.js');

const NOISE_SCENE = {
  main_road: {
    lt20: '紧邻主干道，白天车流噪声约70-75dB，夜间也难以低于55dB——相当于在卧室里持续开着电视的背景音量',
    '20to50': '距主干道约20-50m，白天噪声约60-65dB，夜间约50dB——相当于室内一直有吸尘器运转的声音',
    gt50: '距主干道50m以上，白天噪声约55dB，较为可控但仍能听到明显车流声'
  },
  elevated: {
    lt20: '紧邻高架桥，低频轰鸣明显，白天峰值可达80dB——重型货车经过时会有明显震动和轰鸣',
    '20to50': '距高架约20-50m，低频振动感仍较强——夜间重型车辆经过时仍能感知'
  },
  rail: {
    lt20: '紧邻轨道交通，列车过站时脉冲噪声可达85dB——伴随明显震动',
    '20to50': '距轨道约20-50m，列车噪声间歇性明显——每次列车经过持续约10-15秒'
  },
  quiet: '周边环境较为安静，夜间本底噪声约35-40dB——相当于图书馆或郊区的安静程度'
};

const LIFE_TARGET = {
  sound: '关窗后室内噪声降至40dB以下，达到可以安睡和正常交谈的环境，不再被窗外车流声吵醒',
  heat: '夏季西晒时室内温度比室外低8-10℃，空调制冷负担显著降低，窗边不再有灼热感',
  wind: '台风或强风天气窗户无哨声、无晃动，暴雨时室内绝对无渗漏，保持干燥舒适',
  safety: '儿童或老人独自在家时，窗户不会成为安全隐患，即使意外碰撞也不会发生坠落风险'
};

const PAIN_POINT_MAP = {
  sound: '隔声降噪',
  thermal: '保温隔热',
  security: '安全防护',
  view: '通风采光',
  economy: '经济实用',
  heat: '保温隔热',
  wind: '防风防水',
  safety: '安全防护',
  price: '经济实用'
};

const NOISE_TYPE_MAP = {
  traffic_road: '交通公路',
  traffic_rail: '轨道交通',
  construction: '施工噪音',
  community: '社区生活',
  main_road: '主干道',
  elevated: '高架桥',
  rail: '轨道交通',
  quiet: '安静环境'
};

// v3.9.7 · A档升级触发判断（原始规格）
const TRAFFIC_NOISE_TYPES = ['rail', 'highway', 'metro', 'airport'];

function shouldShowDualTier(answers) {
  const budgetTier = String(answers.budget_tier || 'B').toUpperCase();
  if (budgetTier !== 'A') return false;

  const floor = Number(answers.floor || 0);
  const totalFloors = Number(answers.total_floors || 1);
  const heightRatio = totalFloors > 0 ? floor / totalFloors : 0;
  const isHighFloor = floor > 16 || heightRatio > 0.6;
  const isTrafficNoise = TRAFFIC_NOISE_TYPES.includes(answers.noise_type);

  return isHighFloor || isTrafficNoise;
}

function buildUpgradeReasons(answers) {
  const reasons = [];
  const floor = Number(answers.floor || 0);
  const totalFloors = Number(answers.total_floors || 1);
  const heightRatio = totalFloors > 0 ? floor / totalFloors : 0;
  const isTrafficNoise = TRAFFIC_NOISE_TYPES.includes(answers.noise_type);

  if (floor > 16 || heightRatio > 0.6) {
    reasons.push(
      `本案楼层（${floor}F/${totalFloors}F）处于高风压区，` +
      'B档夹胶玻璃可提供更稳定的抗风压裕量'
    );
  }
  if (isTrafficNoise) {
    const noiseLabel = answers.noise_type === 'rail' ? '轨道交通' : '交通干道';
    reasons.push(
      `本案临近${noiseLabel}，` +
      'B档夹胶中空在中低频段（125–500Hz）隔声表现优于A档非对称中空'
    );
  }
  return reasons;
}

function calcCostDelta(answers, fromTier, toTier) {
  const TIER_MIDPOINT = { A: 750, B: 1150, C: 1700, D: 2500 };
  const delta = (TIER_MIDPOINT[toTier] || 1150) - (TIER_MIDPOINT[fromTier] || 750);
  return {
    delta,
    fromTier,
    toTier,
    label: `约+${delta}元/㎡`,
    note: '相对于本案A档实际配置（夹胶中空）',
    disclaimer: '差价为参考区间中位值，实际报价以商家为准',
  };
}

const NOISE_DIST_MAP = {
  lt20: '近距离（<20m）',
  '20_50': '中距离（20~50m）',
  '20to50': '中距离（20~50m）',
  gt50: '远距离（>50m）',
  gt50_shielded: '远距离有遮挡'
};

const ACCEPTANCE_NODES = {
  entry: {
    title: '【进场验收】（4条）',
    items: [
      '① 对照合同核查品牌、型号、颜色、开启方式',
      '② 玻璃3C标志（本体印刷，非贴纸）；中空玻璃无雾气',
      '③ 核对玻璃边部标签与合同约定一致，不能仅凭外观判断膜层',
      '④ 索取壁厚检测报告，如有条件要求商家现场演示拆一处压线核查'
    ]
  },
  installation: {
    title: '【安装验收】（4条）',
    items: [
      '⑤ 随机查看固定螺丝：打在实体结构上，间距约40-60cm',
      '⑥ 发泡剂全周饱满均匀，外露部分平整',
      '⑦ 密封胶一圈连续、平整无裂缝，施工条件符合说明书要求',
      '⑧ 排水孔未被胶封死，窗台外侧有向外坡度'
    ]
  },
  final: {
    title: '【竣工验收】（5条）',
    items: [
      '⑨ 打火机火焰靠近扇框交接处，无明显偏吹（简易气密自检）',
      '⑩ 花洒淋水3分钟，室内无渗水（物业允许时）',
      '⑪ 每扇窗反复开合5-10次，胶条压实，无异响卡阻',
      '⑫ 外开窗确认防坠绳/限位器安装（高层必查）',
      '⑬ 执手操作力正常，关键安全配件按合同核查'
    ]
  }
};

const REDLINE_REGISTRY = buildRedlineRegistry({ TERM, getTierLabel, getField });

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

// 防御性字段读取（兼容新旧字段名）
function getField(resolved, key) {
  const correctKey = FIELD_MAP[key];
  const value = resolved[correctKey] ?? resolved[key] ?? '待定';
  if (value === '待定') {
    console.warn(`[documentMapper] 字段缺失: ${correctKey} (别名: ${key})`);
  }
  return value;
}

// 断言检查
function assertResolved(resolved) {
  const expected = ['P3_required', 'Rw_required', 'K_target', 'SHGC_target', 'wind_zone'];
  const missing = expected.filter(f => resolved[f] === undefined);
  const hasClimate = !!(resolved.climateZone || resolved.climate_zone);
  if (!hasClimate) missing.push('climateZone');
  if (missing.length > 0) {
    console.error('[documentMapper] ⚠️ resolved 缺少字段:', missing);
    console.log('[documentMapper] resolved 实际字段:', Object.keys(resolved));
  }
  return missing.length === 0;
}

function getClimateLabel(cz) {
  if (!cz || cz.code === 'UNKNOWN') return '气候区未识别';
  if (typeof cz === 'string') return '气候区未识别';
  return `${cz.name}（${cz.code}）`;
}

function getHeightBand(floor, total) {
  const r = total > 0 ? floor / total : 0;
  if (r > 0.75) return { label: '高区', ratio: r, warn: '建议专业风压复核' };
  if (r > 0.50) return { label: '高区', ratio: r, warn: '' };
  if (r > 0.25) return { label: '中区', ratio: r, warn: '' };
  return { label: '低区', ratio: r, warn: '' };
}

function getPainTag(painPoint) {
  const map = {
    sound: { text: '隔声优先', coreMetric: 'Rw' },
    heat: { text: '隔热优先', coreMetric: 'SHGC' },
    wind: { text: '防风防水', coreMetric: 'P3' },
    safety: { text: '安全防护', coreMetric: null },
    price: { text: '性价比', coreMetric: null },
    view: { text: '采光视野', coreMetric: null },
    vent: { text: '通风透气', coreMetric: null }
  };
  return map[painPoint] || { text: '综合需求', coreMetric: null };
}

function getNoiseLabel(noiseType, noiseDist) {
  const types = {
    main_road: '主干道',
    elevated: '高架桥',
    rail: '轨道交通',
    quiet: '安静环境'
  };
  const dists = {
    lt20: '近距离（<20m）',
    '20to50': '中距离（20-50m）',
    gt50: '远距离（>50m）',
    gt50_shielded: '远距离（>50m，有遮挡）'
  };
  return {
    typeLabel: types[noiseType] || noiseType,
    distLabel: dists[noiseDist] || noiseDist,
    levelLabel: noiseDist === 'lt20' ? '高噪声环境' : noiseDist === '20to50' ? '中等噪声' : '低噪声'
  };
}

function getNoiseSceneDesc(noiseType, noiseDist) {
  if (noiseType === 'quiet') return NOISE_SCENE.quiet;
  const byType = NOISE_SCENE[noiseType];
  if (!byType || typeof byType !== 'object') return '';
  const normalizedDist = noiseDist === 'gt50_shielded' ? 'gt50' : noiseDist;
  return byType[normalizedDist] || byType['20to50'] || byType.lt20 || byType.gt50 || '';
}

function getHeatingDesc(heatingType) {
  const map = {
    central: '集中供暖',
    ac: '空调制冷/供暖',
    none: '不需要取暖',
    self: '自采暖'
  };
  return map[heatingType] || '未知';
}

function getFamilyDesc(familyRisk) {
  const arr = Array.isArray(familyRisk) ? familyRisk : [];
  if (arr.length === 0) return '普通家庭';

  const parts = [];
  if (arr.includes('child')) parts.push('含儿童');
  if (arr.includes('elder')) parts.push('含老人');
  if (arr.includes('large_fixed')) parts.push('落地窗/玻璃墙');
  if (arr.includes('wide_slider')) parts.push('宽推拉门');

  const base = parts.length > 0 ? parts.join('、') : '特殊需求';
  const hasSafety = arr.includes('child') || arr.includes('elder');
  return hasSafety ? `${base}（含安全专项条款）` : base;
}

function build1_1(answers) {
  const climateZone = answers.climateZone || getClimateZone(answers.city);
  const floor = Number(answers.floor) || 0;
  const totalFloors = Number(answers.total_floors) || 1;
  const band = getHeightBand(floor, totalFloors);

  const roomTypeMap = {
    bedroom: '主卧',
    living_room: '客厅',
    balcony: '阳台',
    study: '书房'
  };
  const roomTypeText = Array.isArray(answers.room_type) && answers.room_type.length > 0
    ? answers.room_type.map(v => roomTypeMap[v] || v).join('、')
    : null;

  const windowTypeMap = {
    casement: '平开窗',
    sliding: '推拉窗/门',
    fixed: '固定窗',
    tilt_turn: '内开内倒',
    door_window: '门联窗'
  };

  const orientationText = answers.orientation || '';
  const isWest = answers.orientation === 'west' || answers.orientation === '西';
  const shadingRaw = (answers.westShading !== undefined) ? answers.westShading : answers.west_shading;
  const hasShading = shadingRaw === true || shadingRaw === '有遮挡';
  const shadingText = isWest ? (hasShading ? '西晒有遮挡' : '西晒无遮阳') : '非西晒';

  const painPointArr = (() => {
    const v = Array.isArray(answers.pain_points)
      ? answers.pain_points
      : Array.isArray(answers.painPoint)
        ? answers.painPoint
        : (typeof answers.painPoint === 'string' ? [answers.painPoint] : []);
    if (v.length > 0) return v;
    return (typeof answers.pain_point === 'string' && answers.pain_point) ? [answers.pain_point] : [];
  })();
  const painPointText = painPointArr.map(k => PAIN_POINT_MAP[k] || k).join('、') || '未选择';

  let noiseText = '未选择';
  if (answers.noise_type) {
    if (answers.noise_type === 'quiet') {
      noiseText = '安静环境';
    } else {
      const typeText = NOISE_TYPE_MAP[answers.noise_type] || answers.noise_type;
      const distText = NOISE_DIST_MAP[answers.noise_dist] || answers.noise_dist || '';
      noiseText = distText ? `${typeText}·${distText}` : typeText;
    }
  }

  return {
    city: answers.city || '',
    district: answers.district || '',
    climateLabel: getClimateLabel(climateZone),
    floorDesc: `第${floor}层/共${totalFloors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
    roomType: roomTypeText,
    windowType: windowTypeMap[answers.window_type] || answers.window_type || '',
    orientation: `${orientationText}，${shadingText}`,
    heatingType: getHeatingDesc(answers.heating_type),
    familyDesc: getFamilyDesc(answers.family_risk),
    painPoint: painPointText,
    noiseEnv: noiseText
  };
}

function build1_2(answers, resolved) {
  const budgetFitnessNote = (() => {
    const tier = (answers.budget_tier || answers.budgetTier || '').toUpperCase();
    const dominated = ['A', 'B'].includes(tier);
    const familyRisk = Array.isArray(answers.family_risk) ? answers.family_risk : [];
    const forced = ['sliding', 'door_window'].includes(answers.window_type) || familyRisk.includes('child') || familyRisk.includes('elder') || familyRisk.includes('large_fixed');
    if (!dominated || !forced) return null;
    return {
      type: 'budget_fitness_warning',
      text: '根据您的需求分析，本项目存在强制性安全配置要求（如钢化玻璃、夹胶玻璃等），该类配置的市场成本通常高于当前所选预算档位的覆盖范围。安全配置为本案强制性技术要求，不随预算档位调整。'
    };
  })();

  let sealGrades = null;
  try {
    sealGrades = calcSealGrades({ city: answers.city, floor: answers.floor, windowType: answers.window_type });
  } catch (e) {
    sealGrades = null;
  }

  const parameterNote = buildParameterNote({
    windPressure: {
      value: getField(resolved, 'P3'),
      windZone: resolved.wind_zone || 'W?',
      factors: []
    },
    soundInsulation: (function () {
      const BASE = { main_road: 35, elevated: 38, rail: 40, quiet: 30 };
      const DIST = { lt20: 3, '20to50': 0, gt50: -3, gt50_shielded: -3 };
      const baseRw = BASE[answers.noise_type] || 30;
      const distAdj = DIST[answers.noise_dist] || 0;
      const isSoundPriority = (answers.pain_point === 'sound') || (Array.isArray(answers.pain_points) && answers.pain_points.includes('sound'));
      const usageAdj = (answers.noise_type === 'rail') ? 0 : (isSoundPriority ? 3 : 0);
      return {
        baseRw,
        distAdj,
        usageAdj,
        value: getField(resolved, 'Rw')
      };
    })(),
    thermal: {
      kValue: getField(resolved, 'K'),
      kBase: resolved.kBase || null,
      climateZone: resolved.climateZoneCN || '',
      appliedFactor: resolved.appliedFactor || null,
      corrections: Array.isArray(resolved.corrections) ? resolved.corrections : []
    },
    shgc: { value: getField(resolved, 'SHGC') },
    safety: {},
    sealGrades: sealGrades ? { airRec: sealGrades.airRec, airMin: sealGrades.airMin, waterRec: sealGrades.waterRec, waterMin: sealGrades.waterMin } : null,
    inputs: {
      city: answers.city,
      floor: answers.floor,
      heightRatio: (Number(answers.floor) / Number(answers.total_floors || 1)).toFixed(2),
      noiseType: answers.noise_type,
      noiseDist: answers.noise_dist,
      roomType: Array.isArray(answers.room_type) ? answers.room_type : [],
      facing: answers.orientation,
      painPoint: answers.pain_point,
      isHighFloor: Number(answers.floor) >= 7,
      hasBigWindow: Array.isArray(answers.family_risk) && answers.family_risk.includes('large_fixed'),
      hasChild: Array.isArray(answers.family_risk) && (answers.family_risk.includes('child') || answers.family_risk.includes('children'))
    }
  });

  return {
    needsTable: buildNeedsTable(resolved, answers, sealGrades),
    coreTension: buildCoreTension(answers, resolved),
    budgetFitnessNote: budgetFitnessNote,
    sealGrades,
    parameterNote
  };
}

function getThermalModifier(formData) {
  const isWest = formData.orientation === 'west' || formData.orientation === '西';
  if (isWest && formData.west_shading === false) return '西向隔热加严';
  if (formData.heating_type === 'none') return '无供暖保温加严';
  if (formData.heating_type === 'self') return '自采暖修正';
  return '标准热工要求';
}

function getClimateName(cz) {
  if (!cz || typeof cz === 'string') return '气候区未识别';
  if (cz.code === 'UNKNOWN') return '气候区未识别';
  return cz.name;
}

function getShgcNote(answers) {
  const hasShading = answers.westShading === true || answers.west_shading === true;
  const orientation = answers.orientation;

  if (orientation === 'west' && hasShading === false) {
    return '西向无遮阳控制过热';
  }
  if (orientation === 'west') {
    return '西向隔热需求';
  }
  if (orientation === 'south') {
    return '南向得热均衡';
  }
  return '标准太阳得热控制';
}

function buildNeedsTable(resolved, answers, sealGrades) {
  const climateZone = answers.climateZone || resolved.climateZone || getClimateZone(answers.city);
  const isForcedTest = ['sliding', 'door_window'].includes(answers.window_type);
  const safetyValue = isForcedTest ? '夹胶构造（强制）+ 整窗测试报告' : '夹胶构造 / 普通构造';
  const safetyBasis = isForcedTest
    ? `${STANDARDS_MAP.safety_glass.short} · 推拉窗/门联窗`
    : `${STANDARDS_MAP.safety_glass.short} · 家庭风险场景`;

  const heightRatio = Number.isFinite(Number(resolved.height_ratio)) ? Number(resolved.height_ratio) : 0;
  const thermalRange = resolved.kRange || (resolved.kMin !== undefined && resolved.kBase !== undefined ? `${resolved.kMin}~${resolved.kBase}` : '');
  const czCN = resolved.climateZoneCN || getClimateName(climateZone);
  const kNum = Number(getField(resolved, 'K'));
  const kText = Number.isFinite(kNum) ? kNum.toFixed(1) : String(getField(resolved, 'K'));
  let kBasisText = `${czCN}区基准`;
  if (resolved.appliedFactor === 'heating') {
    if (answers.heating_type === 'self') kBasisText = `${czCN}区 自采暖保温加严`;
  } else if (resolved.appliedFactor === 'westSun') {
    kBasisText = `${czCN}区 西向隔热加严`;
  } else if (resolved.appliedFactor === 'bigWindow') {
    kBasisText = `${czCN}区 落地窗隔热加严`;
  }

  const sg = sealGrades || { airMin: 4, airRec: 4, airGap: 0, waterMin: 3, waterRec: 4, waterGap: 1, isFixed: false };
  const fixedNote = sg.isFixed ? '（固定窗推荐值+1级）' : '';
  const airValue = `本案目标值：≥${sg.airRec}级`;
  const waterValue = `本案目标值：≥${sg.waterRec}级`;

  return [
    {
      dimension: '抗风压',
      value: `≥ ${getField(resolved, 'P3')} kPa`,
      basis: `${STANDARDS_MAP.wind_pressure.short} · ${resolved.wind_zone || 'W?'}风区${(heightRatio * 100).toFixed(0)}%`
    },
    {
      dimension: '隔声',
      value: `≥ ${getField(resolved, 'Rw')} dB`,
      basis: `${STANDARDS_MAP.sound_insulation.short} · ${getNoiseShortDesc(answers.noise_type, answers.noise_dist)}`
    },
    {
      dimension: '传热系数',
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（参考范围${thermalRange}）` : ''}`,
      basis: `${STANDARDS_MAP.thermal.short} · ${kBasisText}`
    },
    {
      dimension: '太阳得热',
      value: `≤ ${getField(resolved, 'SHGC')}`,
      basis: `${STANDARDS_MAP.shgc.short} · ${getShgcNote(answers)}`
    },
    {
      dimension: '安全等级',
      value: safetyValue,
      basis: safetyBasis
    },
    {
      dimension: '气密性',
      value: airValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 气密性能等级${fixedNote}`
    },
    {
      dimension: '水密性',
      value: waterValue,
      basis: `${STANDARDS_MAP.wind_pressure.short} · 水密性能等级${fixedNote}`
    }
  ];
}

/**
 * 构建参数说明脚注（三块结构）
 */
function buildParameterNote({ windPressure, soundInsulation, thermal, shgc, safety, sealGrades, inputs }) {
  const block1 = '本表各项参数综合三类信息确定：① 国家/行业标准的基准值；② 您填写的项目信息（城市、楼层、窗型、噪声环境等）；③ 李Sir 基于工程案例的专业修正。';
  const lines = [];

  lines.push(`① **抗风压**：${inputs.city}属 ${windPressure.windZone} 风区，第 ${inputs.floor} 层高度比 ${Math.round(Number(inputs.heightRatio) * 100)}%，按 GB/T 7106 推荐等级取 ≥${windPressure.value} kPa。对应GB/T 7106抗风压等级P4及以上。`);

  // 动态生成距离标签
  const distanceLabels = {
    lt20: '<20m',
    '20to50': '20~50m',
    gt50: '>50m',
    gt50_shielded: '>50m（有遮挡）'
  };
  const distLabel = distanceLabels[inputs.noiseDist] || inputs.noiseDist;

  const noiseText = inputs.noiseType === 'main_road'
    ? `主干道 ${distLabel}`
    : inputs.noiseType === 'rail'
      ? `轨道 ${distLabel}`
      : (inputs.noiseType === 'elevated' ? `高架 ${distLabel}` : '噪声源已评估');
  const distAdjText = `${soundInsulation.distAdj > 0 ? '+' : ''}${soundInsulation.distAdj}`;
  const usageAdjText = `${soundInsulation.usageAdj > 0 ? '+' : ''}${soundInsulation.usageAdj}`;
  const usageExplain = (inputs.noiseType === 'rail')
    ? '隔声降噪诉求加严 0（轨道噪声已按最严基准计）'
    : `隔声降噪诉求加严 ${usageAdjText}`;
  if (inputs.noise_type === 'quiet') {
  const quietUsageNote = soundInsulation.usageAdj > 0
    ? `；因您将隔声降噪列为核心诉求，加严修正+${soundInsulation.usageAdj}`
    : '';
  lines.push(`② **隔声**：噪声环境评估为安静（夜间本底噪声约35–40dB），隔声基准取${soundInsulation.baseRw} dB，无距离修正${quietUsageNote}，最终 ≥${soundInsulation.value} dB。依据：GB 50118 · 安静环境基础隔声标准。`);
} else {
  lines.push(`② **隔声**：${noiseText}，基础 Rw≥${soundInsulation.baseRw} dB，距离修正 ${distAdjText}，${usageExplain}，最终 ≥${soundInsulation.value} dB。依据：GB 50118 + HJ 2055 · 轨道交通中距离声学计算推导值。`);
}

  const factorMap = {
    heating: '自采暖保温修正 -0.2',
    bigWindow: '落地窗热工修正 -0.2',
    westSun: '西晒修正 -0.1'
  };
  const factorText = factorMap[thermal.appliedFactor] || '';
  lines.push(`③ **传热系数**：${inputs.city}属 ${thermal.climateZone}，基准 ${thermal.kBase || '2.4'} W/(m²·K)${factorText ? `，${factorText}` : ''}，取 K≤${thermal.kValue}。`);

  const facing = inputs.facing || inputs.sunExposure;
  const facingMap = {
    west: '西向无遮阳',
    west_sun: '西向无遮阳',
    south: '南向',
    east: '东向',
    north: '北向',
    none: '朝向已评估，无特殊遮阳需求'
  };
  const facingText = facingMap[facing] || '朝向已评估';
  lines.push(`④ **太阳得热**：${facingText}，按 GB/T 2680 标准取 SHGC≤${shgc.value}。`);

  if (sealGrades) {
    lines.push(`⑤ **气密性**：住宅基础线为 ${sealGrades.airMin} 级${inputs.isHighFloor ? `，高层（≥7F）建议上调至 ${sealGrades.airRec} 级，以减轻风噪和渗风感` : ''}。`);
    const spec = CLIMATE_SPEC[inputs.city] || null;
    const isCoastal = !!(spec && spec.isCoastal);
    const isTyphoon = !!(spec && spec.typhoonRisk);
    const isHighFloor = Number(inputs.floor) >= 7;
    const waterParts = [];
    if (isCoastal) waterParts.push('沿海城市');
    if (isHighFloor) waterParts.push('高层');
    let waterText = '⑥ **水密性**：';
    if (waterParts.length > 0) {
      let reason = '';
      if (isCoastal || isTyphoon) {
        reason = '，以应对台风季暴雨侵蚀';
      } else if (isHighFloor) {
        reason = '，以提升高层抗渗能力';
      }
      waterText += `${waterParts.join(' + ')}，由基础 ${sealGrades.waterMin} 级上调至本案目标 ${sealGrades.waterRec} 级${reason}。`;
    } else {
      waterText += `基础 ${sealGrades.waterMin} 级，本案目标 ${sealGrades.waterRec} 级。`;
    }
    lines.push(waterText);
  } else {
    lines.push('⑤ **气密性**：气密性等级按 GB/T 7106 推荐等级确定。');
    lines.push('⑥ **水密性**：水密性等级按 GB/T 7106 推荐等级确定。');
  }
  lines.push(`⑦ **安全等级**：${inputs.hasBigWindow ? '落地窗 + ' : ''}${inputs.hasChild ? '儿童家庭' : ''}依据 GB 15763.3 强制要求夹胶安全玻璃构造。`);
  const block2 = lines.join('\n');
  const block3 = '其中安全等级依据 GB 15763.3 强制条款，属于强制性要求，不可降级。';
  return { block1, block2, block3 };
}

function buildCoreTension(answers, resolved) {
  const sentences = [];

  const painList = Array.isArray(answers.pain_points) ? answers.pain_points : [];
  const primaryPain = painList.length > 0 ? painList[0] : null;

  const mainConstraintMap = {
    sound: '隔声降噪',
    thermal: '保温节能',
    security: '安全防盗',
    view: '采光视野',
    economy: '省钱经济'
  };
  const fallbacks = {
    sound: '隔声降噪',
    heat: '保温节能',
    safety: '安全防盗',
    view: '采光视野',
    price: '省钱经济'
  };
  const mainConstraint = mainConstraintMap[primaryPain] || fallbacks[answers.pain_point] || '综合性能';

  sentences.push(`您的项目位于${answers.city || ''}第${answers.floor || ''}层，${mainConstraint}是本案的主要技术制约。`);

  const conflicts = detectConflicts(answers, resolved);
  if (conflicts.hasConflict) {
    sentences.push(`${conflicts.hardest}与${conflicts.secondHardest}存在配置重合，导致本案成本高于同档位普通场景。`);
  }

  sentences.push('基于以上分析，本表各项为本项目的性能目标值。商家方案如仅能满足最低可接受值，可在报价中注明，由业主确认是否接受；低于最低值的方案，可在比价时排除。');

  return sentences.join('');
}

function detectConflicts(answers, resolved) {
  const result = { hasConflict: false, hardest: '', secondHardest: '' };

  const rw = Number(getField(resolved, 'Rw'));
  const p3 = Number(getField(resolved, 'P3'));
  const k = Number(getField(resolved, 'K'));

  const scores = {
    '隔声': rw >= 40 ? 3 : rw >= 35 ? 2 : 1,
    '抗风压': p3 >= 4.0 ? 3 : p3 >= 3.5 ? 2 : 1,
    '热工': k <= 1.5 ? 3 : k <= 2.0 ? 2 : 1,
    '安全': Array.isArray(answers.family_risk) && answers.family_risk.length > 0 ? 2 : 1
  };

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[1] && sorted[0][1] >= 3 && sorted[1][1] >= 3) {
    result.hasConflict = true;
    result.hardest = sorted[0][0];
    result.secondHardest = sorted[1][0];
  }

  return result;
}

function getNoiseShortDesc(noiseType, noiseDist) {
  if (noiseType === 'quiet') return '安静环境';
  const typeMap = { main_road: '主干道', elevated: '高架', rail: '轨道' };
  const distMap = { lt20: '近距', '20to50': '中距', gt50: '远距', gt50_shielded: '远距遮挡' };
  const type = typeMap[noiseType] || noiseType;
  const dist = distMap[noiseDist] || '';
  return `${type}${dist}`;
}

function getHeatingAdjText(heatingType) {
  if (heatingType === 'self') return '自采暖-0.2';
  if (heatingType === 'none') return '无供暖0';
  return '';
}

function getAcceptanceNodes(climateZone) {
  return [ACCEPTANCE_NODES.entry, ACCEPTANCE_NODES.installation, ACCEPTANCE_NODES.final];
}

function buildChapter3ConflictAlert(budgetSpec, resolved) {
  const notes = Array.isArray(resolved.conflict_notes) ? resolved.conflict_notes : [];
  const hasConflicts = notes.length > 0;
  const conflictMeta = budgetSpec && budgetSpec.conflict ? budgetSpec.conflict : null;
  const label = String(budgetSpec.label || '');
  const tierMatch = label.match(/[ABCD]/);
  const tier = tierMatch ? tierMatch[0] : 'B';
  // TODO SPEC-03: needs GLASS_LEVELS mapping for tier standard glass config
  const baseConfigMap = {
    A: GLASS_LEVELS.laminated_hollow,
    B: GLASS_LEVELS.basic_hollow
  };
  const base = baseConfigMap[tier] || baseConfigMap.B;

  return {
    title: hasConflicts ? '配置升级提醒' : '配置兼容性检查',
    items: hasConflicts ? notes : [],
    noConflictText: hasConflicts ? null : '经分析，您的需求配置与所选预算档位无明显冲突。',
    hasNoConflict: !hasConflicts,
    severity: (conflictMeta && conflictMeta.severity) ? conflictMeta.severity : 'warning',
    cost_estimate: hasConflicts
      ? (Number(budgetSpec.cost_delta) === 0
        ? `预计玻璃成本增加：视实际玻璃配置而定（可要求商家在报价中单独列明玻璃部分加价幅度）；相对于 ${tier} 档标准配置（${base.name}）`
        : `预计玻璃成本增加：${budgetSpec.cost_delta}元/㎡（相对于 ${tier} 档标准配置：${base.name}）`)
      : null
  };
}

function buildRedlineChecklist(answers, resolved) {
  const mandatory = [];
  const recommended = [];

  // 计算水密气密等级
  const sealGrades = calcSealGrades({ city: answers.city, floor: answers.floor, windowType: answers.window_type });

  // 计算抗风压等级（根据 P3 值映射）
  const p3 = Number(getField(resolved, 'P3')) || 0;
  let windPressureLevel = '待定';
  if (p3 >= 7.0) windPressureLevel = '9';
  else if (p3 >= 6.0) windPressureLevel = '8';
  else if (p3 >= 5.0) windPressureLevel = '7';
  else if (p3 >= 4.0) windPressureLevel = '6';
  else if (p3 >= 3.0) windPressureLevel = '5';
  else if (p3 >= 2.0) windPressureLevel = '4';
  else if (p3 >= 1.5) windPressureLevel = '3';
  else if (p3 >= 1.0) windPressureLevel = '2';
  else if (p3 > 0) windPressureLevel = '1';

  // 扩展 resolved 对象，包含计算出的等级
  const resolvedWithLevels = {
    ...resolved,
    sealGrades,
    wind_pressure_level: windPressureLevel
  };

  REDLINE_REGISTRY.forEach((r) => {
    if (!r.trigger(answers, resolvedWithLevels)) return;
    const item = { ...r, text: (typeof r.text === 'function' ? r.text(answers, resolvedWithLevels) : r.text) };
    // R12: 水密气密性能（原 R06）
    if (r.id === 'R12') {
      const desc = `水密气密性能：水密≥${sealGrades.waterRec}级，气密≥${sealGrades.airRec}级（GB/T 7106）。安装节点须按设计图纸施工，打胶须全程留影像记录`;
      item.text = desc;
      item._sealGrades = sealGrades;
    }
    if (r.level === 'mandatory') mandatory.push(item);
    else recommended.push(item);
  });

  // 连续化编号：displayId
  let displayCounter = 1;
  mandatory.forEach(it => { it.displayId = `R${String(displayCounter).padStart(2, '0')}`; displayCounter++; });
  recommended.forEach(it => { it.displayId = `R${String(displayCounter).padStart(2, '0')}`; displayCounter++; });

  return { mandatory, recommended };
}

function buildPerformanceChecks(answers, resolved) {
  const checks = [];
  const Rw_required = Number(getField(resolved, 'Rw') || 0);

  // 隔声专项条目：由 Rw_required > 30 触发，与 pain_point 无关
  if (Rw_required > 30) {
    checks.push({
      id: 'perf_sound_compare',
      text: '关窗前后分别在室内录制一段环境音（约 10 秒），对比主观感受差异（仅作为居住体验参考，不等同于实验室检测）。如感知差异不明显，可要求商家说明原因或提出改进方案。'
    });
    checks.push({
      id: 'perf_sound_report',
      text: `要求商家提供同系列产品的隔声检测报告（第三方实验室），核对 Rw 值是否达到本文件 1.2 节${TERM.paramLabel}。无报告的商家应在合同中明确性能承诺。`
    });
  }

  // 热工专项条目
  const pp = Array.isArray(answers.pain_points)
    ? answers.pain_points
    : (Array.isArray(answers.painPoint) ? answers.painPoint : []);
  const ppFromSingle = (typeof answers.pain_point === 'string' && answers.pain_point) ? [answers.pain_point] : (typeof answers.painPoint === 'string' ? [answers.painPoint] : []);
  const painList = (pp.length > 0 ? pp : ppFromSingle).filter(Boolean);

  if (painList.includes('thermal') || painList.includes('heat')) {
    checks.push({
      id: 'perf_thermal_ir',
      text: '冬季室内外温差明显时，用红外热像仪（或手机热像配件）拍摄窗框接缝处，检查是否存在明显热桥/漏热点。如发现异常，要求商家说明原因并补救。'
    });
  }

  // 动态编号：从 ⑭ 开始连续编号
  let numCounter = 14;
  checks.forEach(check => {
    check.num = numToCircled(numCounter);
    numCounter++;
  });

  if (checks.length === 0) {
    checks.push({
      id: 'perf_general',
      num: numToCircled(14),
      text: '如商家承诺了特定性能指标，达标条件及未达标的补救方案为采购合同应载明事项。'
    });
  }

  return checks;
}

// 数字转带圈数字辅助函数 (11-20)
function numToCircled(n) {
  const map = {
    11: '⑪', 12: '⑫', 13: '⑬', 14: '⑭', 15: '⑮',
    16: '⑯', 17: '⑰', 18: '⑱', 19: '⑲', 20: '⑳'
  };
  return map[n] || String(n);
}

function buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist) {
  const deadline = '请于3-5个工作日内';
  const family_risk = Array.isArray(answers.family_risk) ? answers.family_risk : [];
  const performanceChecks = buildPerformanceChecks(answers, resolved);

  return {
    title: '下一步怎么用：问商家什么 & 怎么验收',
    subtitle: '把这份文件变成面试商家、比较报价、验收施工的行动工具',
    intro: {
      title: '使用说明',
      items: [
        '① 将本答题表同步发送给 3-5 家商家，要求 3-5 个工作日内回复——回复速度本身也是态度的一部分',
        `② 优先选择填写完整、回答具体的商家；对关键项含糊其辞者${TERM.excludeSoft}`,
        '③ 对比同一格的内容（壁厚/玻璃配置/质保年限），而不是只对比总价，可以大幅降低被偷工减料的风险'
      ]
    },
    merchantNotice: {
      title: '4.1 给商家的说明',
      content: '本文件第一章为需求诊断，第二章为本案采购技术底线，第三章为采购红线清单。请贵司按照第二章和第三章逐项回应，并在下表中如实填写方案，便于业主横向对比。',
      deadline: `${deadline}将填写完整的表格拍照回传至业主`
    },
    merchantQuestionnaire: {
      title: '4.2 商家答题表（统一问卷）',
      subtitle: '请将本表发给 3-5 家商家，对方如实填写后回传，便于横向对比',
      section1: {
        title: '── 第一段：商家基本信息 ─────────────────────────',
        fields: [
          { label: '公司名称', placeholder: '全称' },
          { label: '品牌', placeholder: '品牌及系列' },
          { label: '是否授权', type: 'checkbox', options: ['是（请附授权证明）', '否'] },
          { label: '施工年限', placeholder: '年' },
          { label: '近一年完成住宅户数', placeholder: '约__户' }
        ]
      },
      section2: {
        title: '── 第二段：技术答题表 ────────────────────────────',
        hint: '请尽量完整填写；未填写项将影响方案的可比性和业主的优先选择。',
        columns: ['品牌及系列', '型材壁厚(mm)', '玻璃配置', '检测报告编号', '含税报价(元/㎡)', '工期(天)', '质保(年)', '签名确认'],
        note: '若贵司认为在当前预算档位内难以满足某项关键指标，请在"配置建议与说明"栏中提出具体升级方案及差价估算，而非省略或模糊填写。'
      },
      section3: {
        title: '── 第四段：施工态度问答 ─────────────────────────',
        questions: [
          '① 如现场发现墙体不方正/窗洞偏差，贵司的标准处理方式是什么？',
          '② 如果玻璃或五金在质保期内出现问题，贵司的响应时间与处理流程是怎样的？',
          '③ 请列出 2-3 项贵司坚持但"看不见"的施工细节（例如打胶、排水孔、发泡剂处理方式）。'
        ]
      },
      signature: {
        text: '下列签名表示填写人已确认上述内容的真实性；如进入签约，本文件所列关键指标为合同技术条款的组成部分。填写人确认：__________',
        fields: []
      }
    },
    l2_entry: {
      variant: 'strong',
      risk_text: '商家能否真正满足以上标准，仅凭回答无法判断——商家很会说，不一定做得到。如需李Sir帮您评审商家的填写内容是否合理、是否有漏洞 →',
      normal_text: '您的方案已达到基本标准。如需李Sir帮您进一步优化性价比、或核实商家配置是否物有所值 →',
      action: '预约深度审计 →'
    },
    risks: { title: '4.3 风险提示', items: isRisk ? getRiskWarnings(answers, resolved, riskTrigger) : [] },
    acceptance: { title: '4.4 验收节点', nodes: buildAcceptanceNodes(family_risk, answers.window_type) },
    performanceChecks,
    redlineChecklist: sharedRedlineChecklist
  };
}

// ═══════════════════════════════════════════════════════════════
// 业务逻辑函数（含更新后的价格和冲突规则）
// ═══════════════════════════════════════════════════════════════

function getBudgetSpec(tier) {
  return BUDGET_SPEC[tier] || BUDGET_SPEC.B;
}

function estimateCostDelta(glassKey, baseGlassKey) {
  const baseCost = GLASS_LEVELS[baseGlassKey] ? GLASS_LEVELS[baseGlassKey].base_cost : 0;
  const targetCost = GLASS_LEVELS[glassKey] ? GLASS_LEVELS[glassKey].base_cost : 0;
  return Math.max(0, Math.round(targetCost - baseCost));
}

function buildBudgetSpecView(resolved, answers) {
  const tier = answers.budget_tier || 'B';
  const spec = BUDGET_SPEC[tier] || BUDGET_SPEC.B;
  // TODO SPEC-03: needs GLASS_LEVELS mapping for tier standard glass config
  const tierStandardGlassMap = {
    A: GLASS_LEVELS.laminated_hollow,
    B: GLASS_LEVELS.basic_hollow
  };
  const tierStandardGlass = tierStandardGlassMap[tier] || tierStandardGlassMap.B;
  const bar = getInsulationBarRequirement(Number(getField(resolved, 'K')));

  const familyRisk = Array.isArray(answers.family_risk) ? answers.family_risk : [];
  const window_features = {
    has_large_fixed: familyRisk.includes('large_fixed'),
    has_wide_slider: familyRisk.includes('wide_slider'),
    has_family_safety: familyRisk.includes('child') || familyRisk.includes('elder')
  };

  const glass_result = resolveGlassConfig(
    Number(getField(resolved, 'Rw')),
    Number(getField(resolved, 'K')),
    Number(getField(resolved, 'SHGC')),
    window_features,
    tier,
    answers.pain_point,
    answers.noise_type
  );

  const config_table = {
    profile: spec.profile,
    glass: glass_result.glass_name + (glass_result.thermal_overlay ? ` + ${glass_result.thermal_overlay}` : ''),
    hardware: spec.hardware,
    seal: spec.seal
  };

  const conflict_notes = Array.isArray(resolved.conflict_notes) ? [...resolved.conflict_notes] : [];
  if (glass_result.conflict && glass_result.conflict.message) conflict_notes.push(glass_result.conflict.message);

  resolved.conflict_notes = conflict_notes;

  const baseConfig = {
    label: spec.label,
    price_range: spec.price_range,
    price_hint: spec.price_hint,
    bar_ratio: spec.bar_ratio,
    tierStandardGlass,
    profile: `壁厚≥${spec.profile.min_wall_thickness}mm；隔热条≥${bar.min_mm}mm（${bar.process}）`,
    glass: config_table.glass,
    glass_reason: glass_result.reason || null,
    hardware: `铰链负载≥${spec.hardware.min_load_kg}kg`,
    seal: `${spec.seal.layers}道密封（${spec.seal.material}）`,
    glass_key: glass_result.glass_key,
    conflict: glass_result.conflict,
    cost_delta: estimateCostDelta(
      glass_result.perf_glass_key,
      glass_result.glass_key
    ),
    is_compensated: glass_result.is_compensated
  };

  // v3.9.7 · A档升级触发判断（原始规格）
  const dual = shouldShowDualTier(answers);
  if (dual) {
    return {
      ...baseConfig,
      is_dual_tier: true,
      recommendedConfig: [
        {
          spec: BUDGET_SPEC['A'],
          label: getTierLabel('A'),
          displayRole: 'current',
          tier: 'A',
        },
        {
          spec: BUDGET_SPEC['B'],
          label: getTierLabel('B'),
          displayRole: 'recommended',
          tier: 'B',
          upgradeReasons: buildUpgradeReasons(answers),
          costDelta: calcCostDelta(answers, 'A', 'B'),
        }
      ]
    };
  }

  return {
    ...baseConfig,
    is_dual_tier: false
  };
}

function getForbiddenItems(budget_tier, K_target, window_features, Rw_required) {
  // 与红线主表保持一致，使用强制性表述
  const base = [
    '型材系统：须采用原生铝型材，并提供材质检验证明',
    '型材系统：主受力壁厚≥1.5mm，须提供截面检测报告',
    '型材系统：禁止非配套隔热条拼装，不接受与型材品牌不一致的隔热条',
    '热工性能：禁止单玻或无Low-E膜的普通中空玻璃',
    '密封结构：禁止普通密封胶代替结构胶（须采用中性硅酮结构胶）'
  ];

  if (window_features && window_features.needs_whole_window_test) {
    base.push(`抗风性能：推拉窗/门联窗须提供整窗性能测试报告（${STANDARDS_MAP.wind_pressure.short} 抗风压 + GB/T 7106 气密·水密）`);
  }

  return base;
}

function getSafetyItems(familyRisk, budgetTier) {
  const items = [];
  let budgetWarning = null;
  
  const arr = Array.isArray(familyRisk) ? familyRisk : [];
  const hasChild = arr.includes('child');
  const hasElder = arr.includes('elder');

  if (hasChild) {
    items.push('窗台高度<900mm时，须安装儿童防坠限位器（开启角度≤100mm）');
    items.push('玻璃须使用夹胶安全玻璃（6.38mm+），破碎后不脱落');
    items.push('执手安装高度建议≥1500mm，防止儿童误开');
  }
  
  if (hasElder) {
    items.push('执手操作力≤25N（适老标准），需厂家测试数据支持');
    items.push('门槛高度≤15mm，防绊倒；无法避免须配套防绊坡道');
  }
  
  if ((hasChild || hasElder) && budgetTier === 'A') {
    budgetWarning = `⚠️ 上述安全配件成本通常超出${getTierLabel('A')}预算覆盖范围；舒适均衡 B档（900–1400 元/㎡）价格区间可覆盖该类配置。`;
  }
  
  return { items, budgetWarning };
}

function buildSafetyUpgradeDesc(family_risk) {
  const arr = Array.isArray(family_risk) ? family_risk : [];
  const parts = [];
  if (arr.includes('large_fixed')) parts.push('夹胶安全玻璃（落地窗法规强制要求）');
  if (arr.includes('child')) parts.push('儿童防坠限位器、执手高度≥1500mm');
  if (arr.includes('elder')) parts.push('适老配件：低操作力执手（≤25N）、门槛≤15mm防绊倒');
  if (arr.includes('wide_slider')) parts.push('推拉门毛条+胶条复合密封升级');
  return parts.join(' + ') || '安全配件全套升级';
}

function buildNode13(family_risk) {
  const arr = Array.isArray(family_risk) ? family_risk : [];
  const items = [];
  if (arr.includes('child')) items.push('儿童安全配件：限位器开启角度≤100mm、执手高度≥1500mm');
  if (arr.includes('elder')) items.push('适老配件：执手操作力≤25N、门槛高度≤15mm');
  if (arr.includes('large_fixed')) items.push('大面积安全玻璃：确认夹胶玻璃安装，碰撞后无脱落');
  if (arr.includes('wide_slider')) items.push('推拉门密封：毛条+胶条完整，配合烟雾笔测试无明显气流');
  return items.length > 0 ? items.join('；') : null;
}

function buildAcceptanceNodes(family_risk, window_type) {
  const base = getAcceptanceNodes();
  const final = base[2];
  let items = Array.isArray(final.items) ? [...final.items] : [];
  const map = ACCEPTANCE_ITEMS_WINDOW[window_type] || null;
  if (map) {
    // ⑫
    const idx12 = items.findIndex(x => typeof x === 'string' && x.startsWith('⑫'));
    const t12 = map['12'];
    if (t12 === null) {
      if (idx12 >= 0) items.splice(idx12, 1);
    } else if (typeof t12 === 'string') {
      if (idx12 >= 0) items[idx12] = `⑫ ${t12}`; else items.push(`⑫ ${t12}`);
    }
    // ⑬
    const idx13 = items.findIndex(x => typeof x === 'string' && x.startsWith('⑬'));
    const t13 = map['13'];
    if (typeof t13 === 'string') {
      if (idx13 >= 0) items[idx13] = `⑬ ${t13}`; else items.push(`⑬ ${t13}`);
    }
  }
  const node13 = buildNode13(family_risk);
  if (node13) {
    const i13 = items.findIndex(x => typeof x === 'string' && x.startsWith('⑬'));
    if (i13 >= 0) {
      const baseText = String(items[i13]).replace(/^⑬\s*/, '');
      const extras = String(node13)
        .split('；')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(s => !baseText.includes(s))
        .filter(s => !(baseText.includes('儿童安全配件') && s.startsWith('儿童安全配件')))
        .filter(s => !(baseText.includes('大面积安全玻璃') && s.startsWith('大面积安全玻璃')));
      if (extras.length > 0) {
        items[i13] = `⑬ ${baseText}；${extras.join('；')}`;
      } else {
        items[i13] = `⑬ ${baseText}`;
      }
    }
  }
  return [base[0], base[1], { ...final, items }];
}

// 更新后的风险提示（含新价格区间和档位区分）
function getRiskWarnings(answers, resolved, riskTrigger) {
  const risks = [];
  const { floor, total_floors, budget_tier } = answers;
  const band = getHeightBand(floor, total_floors);
  const spec = BUDGET_SPEC[budget_tier];
  const nextTier = getNextTier(budget_tier);
  const nextSpec = nextTier ? BUDGET_SPEC[nextTier] : null;
  const upgradeHint = nextSpec ? `升至${nextSpec.label}（${nextSpec.price_range}）` : null;
  
  // 风险1：高层风险（16层以上）
  if (riskTrigger.highFloor) {
    risks.push({
      title: '高层建筑风压风险',
      desc: `您的项目位于第${floor}层（超过16层），风压要求显著高于普通住宅。P3≥${getField(resolved, 'P3')}kPa 需要高强度型材支撑。`,
      suggest: budget_tier === 'A' 
        ? (upgradeHint ? `${upgradeHint}可覆盖该配置要求` : '建议升级预算档位可覆盖该配置要求')
        : '建议选用壁厚≥1.8mm的系统窗，可覆盖该配置要求型材截面',
      question: '请提供：① P3检测报告编号；② 型材截面图/壁厚检测报告；③ 固定方式与螺丝间距方案。'
    });
  }
  
  // 风险2：高度比风险（>50%）
  if (riskTrigger.highRatio) {
    risks.push({
      title: '高区位置风压风险', 
      desc: `您的楼层高度比为${(band.ratio * 100).toFixed(0)}%（超过50%），属于${band.label}，风荷载较大。`,
      suggest: budget_tier === 'A'
        ? (upgradeHint ? `${upgradeHint}或加厚型材可提升安全余量` : '建议升级预算档位或加厚型材可提升安全余量')
        : '建议增加型材壁厚，或选择抗风压等级更高的产品系列',
      question: '请明确：① 主受力壁厚承诺值与检测方式；② 角码/注胶工艺；③ 防水排水结构与等压腔方案。'
    });
  }
  
  // 风险3：预算与楼层冲突（A档+高层，新价格区间下仍建议谨慎）
  if (riskTrigger.budgetConflict) {
    risks.push({
      title: '预算与楼层匹配建议',
      desc: `您选择${spec.label}（${spec.price_range}）用于第${floor}层（${band.label}），高层风压场景下，升级可获得更高安全余量`,
      suggest: upgradeHint ? `${upgradeHint}，或请李Sir筛选当前档位中高性价比的加厚型材方案` : '建议升级预算档位，或请李Sir筛选当前档位中高性价比的加厚型材方案',
      question: '如果不升级预算，哪些指标可以做到、哪些必须写入合同红线？对应差价如何计算？'
    });
  }
  
  // 风险4：儿童安全
  const riskArr = Array.isArray(answers.family_risk) ? answers.family_risk : [];
  if (riskArr.includes('child')) {
    risks.push({
      title: '儿童安全条款需专项验收',
      desc: '限位器与夹胶玻璃需由第三方核验，不可自验',
      suggest: '务必要求第三方监理到场核验，不可仅凭商家自验',
      question: '限位器开启角度≤100mm、执手高度≥1500mm如何验收？夹胶玻璃型号与3C标识如何核对？'
    });
  }
  
  // 风险5：西晒热工
  if (answers.orientation === 'west' && answers.west_shading === false) {
    risks.push({
      title: '西晒热工负荷高',
      desc: '无遮阳西晒窗夏季空调负荷显著增加，现有配置可能不足',
      suggest: '考虑热工升级+或增加外遮阳措施',
      question: '请提供：① K值与SHGC检测报告；② Low-E膜层位置与玻璃配置；③ 是否配套外遮阳建议。'
    });
  }

  risks.forEach((r) => {
    if (r && r.question) r.fullText = `${r.title}\n${r.desc}\n→ 要问商家的问题：${r.question}`;
  });

  return risks;
}

function calcUpgradeRating(upgradeType, answers, resolved) {
  const pains = Array.isArray(answers.pain_points)
    ? answers.pain_points
    : (typeof answers.pain_point === 'string' && answers.pain_point ? [answers.pain_point] : []);
  const noiseType = answers.noise_type;
  const noiseDist = answers.noise_dist;
  const familyRisk = Array.isArray(answers.family_risk) ? answers.family_risk : [];
  const safetyForced = ['sliding', 'door_window'].includes(answers.window_type) ||
    familyRisk.includes('child') ||
    familyRisk.includes('elder') ||
    familyRisk.includes('elderly') ||
    familyRisk.includes('large_fixed') ||
    familyRisk.includes('floor_window') ||
    !!resolved.hasSafetyClause;

  if (upgradeType === 'sound') {
    let stars = 3;
    if (pains.includes('sound')) stars += 1;
    const severeNoiseType = ['traffic_rail', 'traffic_highway', 'traffic_road', 'rail', 'main_road', 'elevated'].includes(noiseType);
    if (severeNoiseType && noiseDist === 'lt20') stars += 1;
    return Math.min(stars, 5);
  }

  if (upgradeType === 'thermal') {
    let stars = 3;
    if (pains.includes('thermal') || pains.includes('heat')) stars += 1;
    if (resolved && resolved.appliedFactor) stars += 1;
    return Math.min(stars, 5);
  }

  if (upgradeType === 'safety') {
    return safetyForced ? 5 : 3;
  }

  return 3;
}

function getStars(count) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function getUpgrades(answers, resolved) {
  const isTrafficNoise = TRAFFIC_NOISE_TYPES.includes(answers.noise_type);
  const acousticUpgradeDesc = isTrafficNoise
    ? 'Rw基础上+3~5dB，需夹胶中空升规格（6+1.52PVB+6+12–16Ar+6）（稳定保障Rw≥40dB的推荐下限）；交通噪声场景不建议三玻两腔，Ctr表现不稳定'
    : 'Rw基础上+5dB，可选三玻两腔（非交通噪声场景）';

  return [
    { name: '隔音升级+', desc: acousticUpgradeDesc, costHint: '+约180元/㎡', stars: calcUpgradeRating('sound', answers, resolved) },
    { name: '热工升级+', desc: 'K值降0.3，需注胶式断桥', costHint: '+约120元/㎡', stars: calcUpgradeRating('thermal', answers, resolved) },
    { name: '安全升级+', desc: buildSafetyUpgradeDesc(answers.family_risk), costHint: '+约80元/㎡', stars: calcUpgradeRating('safety', answers, resolved) }
  ];
}

function buildAnalysisParagraph(answers, resolved) {
  const { city, floor, total_floors, pain_point, noise_type, noise_dist, west_shading, orientation } = answers;
  const band = getHeightBand(floor, total_floors);
  
  let text = '';
  
  if (pain_point === 'sound') {
    const sceneDesc = getNoiseSceneDesc(noise_type, noise_dist);
    const lifeTarget = LIFE_TARGET.sound;
    text = `您所在项目位于${city}第${floor}层（${band.label}），${sceneDesc}。本次采购的核心目标是：${lifeTarget}。要实现这一目标，窗户隔声量需达到Rw≥${getField(resolved, 'Rw')}dB。这是本次招标的${TERM.threshold}，低于此值的方案${TERM.excludeSoft}。`;

    const Rw_required = Number(getField(resolved, 'Rw'));
    const costLevel = Rw_required <= 33 ? '轻' : Rw_required <= 38 ? '中' : '重';
    const familyRisk = Array.isArray(answers.family_risk) ? answers.family_risk : [];
    const window_features = {
      has_large_fixed: familyRisk.includes('large_fixed'),
      has_wide_slider: familyRisk.includes('wide_slider'),
      has_family_safety: familyRisk.includes('child') || familyRisk.includes('elder')
    };
    const tier = (answers.budget_tier || 'B').toUpperCase();
    const glass = resolveGlassConfig(
      Rw_required,
      Number(getField(resolved, 'K')),
      Number(getField(resolved, 'SHGC')),
      window_features,
      tier,
      answers.pain_point,
      answers.noise_type
    );
    const glass_summary = glass && glass.glass_name ? glass.glass_name : '更高等级隔声玻璃配置';
    text += `\n要实现这一目标，通常需要采用${glass_summary}，对配置会有${costLevel}程度的额外成本。`;
  } else if (pain_point === 'heat') {
    const westDesc = (west_shading === false && orientation === 'west') ? '西晒无遮阳，热辐射压力较高，' : '';
    const climateZone = answers.climateZone || resolved.climateZone || getClimateZone(city);
    text = `您的项目位于${city}${getClimateLabel(climateZone)}的第${floor}层。${westDesc}以下标准以热工性能为核心，SHGC≤${getField(resolved, 'SHGC')}是夏季隔热的关键指标，请商家提供Low-E玻璃配置方案及检测报告。`;
  } else if (pain_point === 'wind') {
    text = `您的项目位于${city}（${resolved.wind_zone || 'W?'}风区）的第${floor}层，高度比${(band.ratio * 100).toFixed(0)}%（${band.label}），抗风压要求较高。P3≥${getField(resolved, 'P3')}kPa是本次采购的硬性门槛，商家须提供第三方检测证明。`;
  } else if (pain_point === 'safety') {
    const arr = Array.isArray(answers.family_risk) ? answers.family_risk : [];
    const who = arr.includes('child') ? '儿童' : '老人';
    text = `您的项目包含${who}家庭成员，本文件在常规技术指标外特别增设安全专项条款。所有安全配件（限位器/夹胶玻璃/适老五金）须在竣工验收时提供安装凭证。`;
  } else {
    const climateZone = answers.climateZone || resolved.climateZone || getClimateZone(city);
    text = `您的项目位于${city}第${floor}层（${band.label}），综合考虑了${getClimateLabel(climateZone)}的气候区标准与建筑环境，以下技术指标基于${STANDARDS_MAP.product_spec.code}计算。`;
  }
  
  return text;
}

// ═══════════════════════════════════════════════════════════════
// 主映射函数
// ═══════════════════════════════════════════════════════════════

/**
 * mapToSections 返回值结构契约
 * ⚠️ 修改任何字段名时，必须同步检查 result.wxml 绑定路径
 *
 * summary:     { k_target, rw_required, shgc_target, p3_required, wind_zone, air_rec, water_rec }
 * cover:       { pdfNo, issueDate, city, district, climateLabel, floorDesc, painTag, isRisk,
 *               hasSafety, degradedCity, degradedMsg, disclaimer }
 * chapter1:    { basicInfo, needsAnalysis: { needsTable[], coreTension, budgetFitnessNote,
 *               sealGrades, parameterNote }, city, district, climateLabel, windZone, ... }
 * chapter2:    { positionStatement, painPoint, metrics[] }
 * chapter3:    { title, sourceNote, redlineChecklist: { mandatory[], recommended[] },
 *               forbidden[], safetyItems[], safetyBudgetWarning, conflictAlert,
 *               is_dual_tier, dualTierSpecs[] }
 * chapter4:    { title, intro, merchantNotice,
 *               merchantQuestionnaire: { section3: { questions[] } },
 *               acceptance: { nodes[] }, performanceChecks[], redlineChecklist }
 * attachments: { photos[] }
 */
function mapToSections(resolved, answers, pdfNo) {
  assertResolved(resolved);

  
  const now = new Date();
  const issueDate = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;
  
  const band = getHeightBand(answers.floor, answers.total_floors);
  const climateZone = answers.climateZone || resolved.climateZone || getClimateZone(answers.city);
  const normalizedAnswers = { ...answers, climateZone };
  const painTag = getPainTag(answers.pain_point);
  const budgetSpec = buildBudgetSpecView(resolved, normalizedAnswers);
  const familyRisk = Array.isArray(normalizedAnswers.family_risk) ? normalizedAnswers.family_risk : [];
  const window_features = {
    has_large_fixed: familyRisk.includes('large_fixed'),
    has_wide_slider: familyRisk.includes('wide_slider'),
    needs_whole_window_test: ['sliding', 'door_window'].includes(normalizedAnswers.window_type),
    has_family_safety: familyRisk.includes('child') || familyRisk.includes('elder')
  };
  const safety = getSafetyItems(normalizedAnswers.family_risk, normalizedAnswers.budget_tier);
  
  // 风险触发条件：16层以上 或 高度比>50% 或 有risk_flags 或 免责声明
  const isHighFloor = answers.floor > 16;
  const isHighRatio = band.ratio > 0.5;
  const hasRiskFlags = resolved.risk_flags && Object.keys(resolved.risk_flags).length > 0;
  const isRisk = hasRiskFlags || isHighFloor || isHighRatio || normalizedAnswers.isDisclaimer === true;
  
  // 传递给风险生成函数
  const riskTrigger = {
    highFloor: isHighFloor,
    highRatio: isHighRatio,
    budgetConflict: answers.budget_tier === 'A' && (isHighFloor || isHighRatio)
  };
  const safetyForced = ['sliding', 'door_window'].includes(normalizedAnswers.window_type) ||
    familyRisk.includes('child') ||
    familyRisk.includes('elder') ||
    familyRisk.includes('elderly') ||
    familyRisk.includes('large_fixed') ||
    familyRisk.includes('floor_window') ||
    !!resolved.hasSafetyClause;
  const sharedRedlineChecklist = buildRedlineChecklist(normalizedAnswers, { ...resolved, safetyForced });

  const needsAnalysis = build1_2(normalizedAnswers, resolved);
  const resolvedSealGrades = needsAnalysis.sealGrades || { airRec: 4, waterRec: 3 };

  return {
    summary: {
      k_target:    getField(resolved, 'K'),
      rw_required: getField(resolved, 'Rw'),
      shgc_target: getField(resolved, 'SHGC'),
      p3_required: getField(resolved, 'P3'),
      wind_zone:   resolved.wind_zone || '',
      air_rec:     resolvedSealGrades.airRec,
      water_rec:   resolvedSealGrades.waterRec
    },

    cover: {
      pdfNo: pdfNo,
      issueDate: issueDate,
      city: normalizedAnswers.city || '未知城市',
      district: normalizedAnswers.district || '',
      climateLabel: getClimateLabel(climateZone),
      floorDesc: `第${normalizedAnswers.floor}层/共${normalizedAnswers.total_floors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
      painTag: painTag.text,
      isRisk: isRisk,
      hasSafety: Array.isArray(normalizedAnswers.family_risk) && (normalizedAnswers.family_risk.includes('child') || normalizedAnswers.family_risk.includes('elder')),
      degradedCity: resolved.degraded || false,
      degradedMsg: resolved.degraded ? `${normalizedAnswers.city}暂未精确覆盖，以下参数基于保守标准推算` : null,
      disclaimer: '本文件由李Sir门窗技术顾问系统基于用户填写信息自动生成，仅供参考，不构成正式法律合同。'
    },
    
    chapter1: {
      basicInfo: build1_1(normalizedAnswers),
      needsAnalysis: needsAnalysis,
      city: normalizedAnswers.city,
      district: normalizedAnswers.district || '',
      climateLabel: getClimateLabel(climateZone),
      windZone: resolved.wind_zone || 'W?',
      floorDesc: `第${normalizedAnswers.floor}层/共${normalizedAnswers.total_floors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
      heatingDesc: getHeatingDesc(normalizedAnswers.heating_type),
      familyDesc: getFamilyDesc(normalizedAnswers.family_risk),
      analysisPara: buildAnalysisParagraph(normalizedAnswers, resolved),
      noise: normalizedAnswers.noise_type !== 'quiet' ? {
        show: true,
        typeLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel,
        distKey: normalizedAnswers.noise_dist === 'gt50_shielded' ? 'gt50' : normalizedAnswers.noise_dist,
        distLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).distLabel,
        levelLabel: getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).levelLabel,
        blocks: (() => {
          const climateLabel = getClimateLabel(climateZone);
          const westShavingNote = (normalizedAnswers.orientation === 'west' && normalizedAnswers.west_shading === false)
            ? (getShgcNote(normalizedAnswers) || '西晒无遮阳，SHGC已下调')
            : '非西晒主风险位';

          const Rw_required = Number(getField(resolved, 'Rw'));
          const costLevel = Rw_required <= 33 ? '轻' : Rw_required <= 38 ? '中' : '重';
          const targetDesc = normalizedAnswers.pain_point === 'heat' ? '隔热舒适' : normalizedAnswers.pain_point === 'wind' ? '抗风防水' : '隔声目标';
          const isTrafficNoise = TRAFFIC_NOISE_TYPES.includes(normalizedAnswers.noise_type);
          const glassDirection = Rw_required <= 33
            ? '可在档内用常规中空配置实现'
            : Rw_required <= 38
              ? '需要夹胶/更高隔声玻璃构造'
              : isTrafficNoise
                ? '需夹胶中空升规格配置（厚PVB层+宽腔），交通噪声场景Ctr要求优先于三玻两腔'
                : '往往需要三玻两腔或夹胶中空升规格等高阶隔声构造';

          return [
            { type: 'climate_note', text: `${normalizedAnswers.city}属于${climateLabel}，${westShavingNote}` },
            {
              type: 'safety_alert',
              condition: window_features.has_large_fixed,
              text: `您的房间存在落地窗/整面玻璃墙，属于高安全等级场景，玻璃配置需符合 ${STANDARDS_MAP.safety_glass.code} 对大面积玻璃的强制要求。`
            },
            { type: 'cost_reveal', text: `在当前环境和预算组合下，要改善${targetDesc}，通常${glassDirection}，对配置会有${costLevel}程度的额外成本。` }
          ];
        })()
      } : { show: false },
      useNewStructure: true
    },
    
    chapter2: {
      positionStatement: '以下参数来自第一章的诊断结果，是本案的采购技术底线。商家方案须逐项回应，不达标项须书面说明。',
      painPoint: normalizedAnswers.pain_point,
      metrics: [
        {
          name: '抗风压性能',
          value: ` ${getField(resolved, 'P3')}`,
          unit: 'kPa',
          std: STANDARDS_MAP.wind_pressure.code,
          level: (getField(resolved, 'P3') >= 3.0 ? '高等级' : '标准等级'),
          note: `${normalizedAnswers.city}${resolved.wind_zone || 'W?'}风区，第${normalizedAnswers.floor}层`,
          isCore: painTag.coreMetric === 'P3'
        },
        {
          name: '计权隔声量',
          value: ` ${getField(resolved, 'Rw')}`,
          unit: 'dB',
          std: STANDARDS_MAP.sound_insulation.code,
          level: (getField(resolved, 'Rw') >= 35 ? '高隔声' : '标准隔声'),
          note: `${getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel}环境${normalizedAnswers.pain_point === 'sound' ? '，睡眠场景加严' : ''}`,
          isCore: painTag.coreMetric === 'Rw'
        },
        {
          name: '热工性能',
          value: `K${getField(resolved, 'K')} W/(m²K)\nSHGC${getField(resolved, 'SHGC')}`,
          unit: '',
          std: STANDARDS_MAP.thermal.code,
          level: getClimateLabel(climateZone),
          note: `${getClimateName(climateZone)}区 ${getThermalModifier(normalizedAnswers)}`,
          isCore: painTag.coreMetric === 'SHGC'
        }
      ],
      // SPEC-G2 step2: derivation placeholders (null = not implemented yet)
      acousticDerivation: null,
      thermalDerivation: null
    },
    
    chapter3: {
      title: '本案采购红线清单',
      sourceNote: '以下红线由第一章性能诊断结果动态生成，每条对应一项可量化指标。低于任一项即视为方案不合格。',
      redlineChecklist: sharedRedlineChecklist,
      forbidden: getForbiddenItems(normalizedAnswers.budget_tier, getField(resolved, 'K'), window_features, getField(resolved, 'Rw')),
      safetyItems: safety.items,
      safetyBudgetWarning: safety.budgetWarning,
      conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved),
      is_dual_tier: budgetSpec.is_dual_tier || false,
      dualTierSpecs: (budgetSpec.is_dual_tier && Array.isArray(budgetSpec.recommendedConfig))
        ? budgetSpec.recommendedConfig.map(c => ({
            label: c.label || '',
            profile: c.spec && c.spec.profile
              ? ('壁厚≥' + c.spec.profile.min_wall_thickness + 'mm') : '',
            hardware: c.spec && c.spec.hardware
              ? ('铰链≥' + c.spec.hardware.min_load_kg + 'kg') : '',
            priceRange: c.spec && c.spec.price_range ? c.spec.price_range : '',
            upgradeReasons: Array.isArray(c.upgradeReasons) ? c.upgradeReasons : []
          }))
        : []
    },
    
    chapter4: {
      configSummary: {
        spec: { ...budgetSpec, label: getTierLabel(String(answers.budget_tier || 'B').toUpperCase()) },
        conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved),
        upgradeOptions: getUpgrades(normalizedAnswers, resolved)
      },
      ...buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk, sharedRedlineChecklist),
      isRisk: isRisk,
      riskTrigger: riskTrigger
    },
    
    attachments: {
      photos: answers.photos || []
    }
  };
}

module.exports = {
  mapToSections,
  getField,
  assertResolved,
  BUDGET_SPEC,
  build1_1,
  build1_2,
  buildAcceptanceItems,
  buildRedlineChecklist,
  buildPerformanceChecks,
  calcUpgradeRating,
  getStars,
  TERM,
  getTierLabel,
  getBudgetSpec,
  getHeatingAdjText,
  getShgcNote,
  getThermalModifier,
  getUpgrades,
  buildBudgetSpecView
};
