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

const { GLASS_LEVELS, BUDGET_SPEC, getNextTier } = require('./shared/budgetSpec.js');
const { getInsulationBarRequirement } = require('./shared/thermalSpec.js');
const { resolveGlassConfig } = require('./arbitrator.js');
const { getClimateZone } = require('./shared/climateSpec.js');

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

function getRwRequired(noiseType, noiseDist, painPoint, floor) {
  const BASE = {
    quiet: 25,
    main_road: 35,
    elevated: 35,
    rail: 35
  };

  let rw = Number(BASE[noiseType]);
  if (!Number.isFinite(rw)) rw = 30;

  if (noiseDist === 'lt20') rw += 3;

  if (painPoint === 'sound') rw += 3;

  if (Number(floor) > 20) rw += 2;

  return Math.min(rw, 45);
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
      text: '根据您的需求分析，本项目存在强制性安全配置要求（如钢化玻璃、夹胶玻璃等），该类配置的市场成本通常高于当前所选预算档位的覆盖范围。建议您在比价时适当上调预算预期，或与商家沟通安全配置的具体加价幅度，以确保核心安全需求不因预算约束而被削减。'
    };
  })();

  return {
    needsTable: buildNeedsTable(resolved, answers),
    coreTension: buildCoreTension(answers, resolved),
    disclaimer: buildParamDisclaimer(),
    budgetFitnessNote: budgetFitnessNote
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

function buildNeedsTable(resolved, answers) {
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
      value: `K≤${kText} W/(m²·K)${thermalRange ? `（推荐范围${thermalRange}）` : ''}`,
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
    }
  ];
}

function buildParamDisclaimer() {
  return {
    type: 'disclaimer',
    style: 'footnote',
    text: '参数说明：本文件中的技术参数为推荐目标值，而非国标原文照搬。计算方法：先按城市气候区确定基准值，再结合冬季供暖方式、朝向及窗型做小幅修正，最终形成适合本项目的选购标准。其中安全等级依据 GB 15763.3 强制条款，不可降级。'
  };
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

  sentences.push('以下指标为本项目推荐技术门槛，商家方案低于任一项的，建议不予优先考虑。');

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
  if (heatingType === 'none') return '无供暖+0.2';
  return '';
}

function getAcceptanceNodes(climateZone) {
  return [ACCEPTANCE_NODES.entry, ACCEPTANCE_NODES.installation, ACCEPTANCE_NODES.final];
}

function buildChapter3ConflictAlert(budgetSpec, resolved) {
  const notes = Array.isArray(resolved.conflict_notes) ? resolved.conflict_notes : [];
  const hasConflicts = notes.length > 0;
  const conflictMeta = budgetSpec && budgetSpec.conflict ? budgetSpec.conflict : null;

  return {
    title: hasConflicts ? '配置升级提醒' : '配置兼容性检查',
    items: hasConflicts ? notes : [],
    noConflictText: hasConflicts ? null : '经分析，您的需求配置与所选预算档位无明显冲突。',
    severity: (conflictMeta && conflictMeta.severity) ? conflictMeta.severity : 'warning',
    cost_estimate: hasConflicts ? `预计玻璃成本增加：${budgetSpec.cost_delta}元/㎡` : null
  };
}

function buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk) {
  const deadline = '请于14个工作日内';
  const family_risk = Array.isArray(answers.family_risk) ? answers.family_risk : [];

  return {
    title: '下一步怎么用：问商家什么 & 怎么验收',
    subtitle: '把这份文件变成面试商家、比较报价、验收施工的行动工具',
    intro: {
      title: '使用说明',
      items: [
        '① 建议同时将本答题表发送给 3-5 家商家，要求 3-5 个工作日内回复——回复速度本身也是态度的一部分',
        '② 优先选择填写完整、回答具体的商家；对关键项含糊其辞者建议直接排除',
        '③ 对比同一格的内容（壁厚/玻璃配置/质保年限），而不是只对比总价，可以大幅降低被偷工减料的风险'
      ]
    },
    merchantNotice: {
      title: '4.1 给商家的说明',
      content: '本文件前两章为本次采购的技术标准，第三章为预算参考档位。请贵司按照第二章的技术指标和第三章的配置基准，在下表中如实填写贵司方案，便于业主横向对比。',
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
        hint: '请填写完整；写不出来就空着，业主会看得很清楚',
        columns: ['品牌及系列', '型材壁厚(mm)', '玻璃配置', '检测报告编号', '含税报价(元/㎡)', '工期(天)', '质保(年)', '签名确认'],
        note: '若贵司认为在当前预算档位内难以满足某项关键指标，请在"配置建议与说明"栏中提出具体升级方案及差价估算，而非省略或模糊填写。'
      },
      section3: {
        title: '── 第三段：施工态度问答 ─────────────────────────',
        questions: [
          '① 如现场发现墙体不方正/窗洞偏差，贵司的标准处理方式是什么？',
          '② 如果玻璃或五金在质保期内出现问题，贵司的响应时间与处理流程是怎样的？',
          '③ 请列出 2-3 项贵司坚持但"看不见"的施工细节（例如打胶、排水孔、发泡剂处理方式）。'
        ]
      },
      signature: {
        text: '签名代表对上述填写内容的确认；如进入签约，请将关键指标写入合同',
        fields: ['商家签名（无需公章）', '日期', '回传方式：扫描/拍照发送至业主微信']
      }
    },
    l2_entry: {
      variant: 'strong',
      risk_text: '商家能否真正满足以上标准，仅凭回答无法判断——商家很会说，不一定做得到。如需李Sir帮您评审商家的填写内容是否合理、是否有漏洞 →',
      normal_text: '您的方案已达到基本标准。如需李Sir帮您进一步优化性价比、或核实商家配置是否物有所值 →',
      action: '预约深度审计 →'
    },
    risks: { title: '4.3 风险提示', items: isRisk ? getRiskWarnings(answers, resolved, riskTrigger) : [] },
    acceptance: { title: '4.4 验收节点', nodes: buildAcceptanceNodes(family_risk) }
  };
}

// ═══════════════════════════════════════════════════════════════
// 业务逻辑函数（含更新后的价格和冲突规则）
// ═══════════════════════════════════════════════════════════════

function getBudgetSpec(tier) {
  return BUDGET_SPEC[tier] || BUDGET_SPEC.B;
}

function estimateCostDelta(glassKey, tier) {
  const spec = BUDGET_SPEC[tier] || BUDGET_SPEC.B;
  const baseKey = spec.glass_max_level;
  const baseCost = (GLASS_LEVELS[baseKey] && GLASS_LEVELS[baseKey].base_cost) ? GLASS_LEVELS[baseKey].base_cost : 0;
  const targetCost = (GLASS_LEVELS[glassKey] && GLASS_LEVELS[glassKey].base_cost) ? GLASS_LEVELS[glassKey].base_cost : 0;
  return Math.max(0, Math.round(targetCost - baseCost));
}

function buildBudgetSpecView(resolved, answers) {
  const tier = answers.budget_tier || 'B';
  const spec = BUDGET_SPEC[tier] || BUDGET_SPEC.B;
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
    answers.pain_point
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

  return {
    label: spec.label,
    price_range: spec.price_range,
    price_hint: spec.price_hint,
    bar_ratio: spec.bar_ratio,
    profile: `壁厚≥${spec.profile.min_wall_thickness}mm；隔热条≥${bar.min_mm}mm（${bar.process}）`,
    glass: config_table.glass,
    glass_reason: glass_result.reason || null,
    hardware: `铰链负载≥${spec.hardware.min_load_kg}kg`,
    seal: `${spec.seal.layers}道密封（${spec.seal.material}）`,
    glass_key: glass_result.glass_key,
    conflict: glass_result.conflict,
    cost_delta: estimateCostDelta(glass_result.glass_key, tier),
    is_compensated: glass_result.is_compensated
  };
}

function getForbiddenItems(budget_tier, K_target, window_features, Rw_required) {
  const bar = getInsulationBarRequirement(Number(K_target));

  const base = [
    '禁止使用回收铝型材，须提供原生铝材质检报告',
    '禁止单玻或无Low-E膜的普通中空玻璃',
    '禁止以普通密封胶代替结构胶（须使用中性硅酮结构胶）',
    `断桥铝隔热条宽度须≥${bar.min_mm}mm（${bar.process}），禁止使用宽度不足的仿断桥产品` + (bar.note ? `（依据：本项目K≤${K_target}W/m²·K${bar.note}）` : '')
  ];

  if (window_features && window_features.needs_whole_window_test) {
    base.push(`【强制】推拉窗/门联窗需提供整窗性能测试报告（${STANDARDS_MAP.wind_pressure.short} 抗风压 + GB/T 7107 气密·水密）`);
  }

  const TIER_WALL = {
    A: '型材主受力壁厚须≥1.5mm，提供截面检测报告',
    B: '型材主受力壁厚须≥1.6mm，提供截面检测报告',
    C: '型材主受力壁厚须≥1.8mm，须为系统门窗品牌，提供厂商授权书',
    D: '型材主受力壁厚须≥2.0mm，须提供欧标或国内第三方认证报告'
  };

  return [...base, TIER_WALL[budget_tier] || TIER_WALL.A];
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
    budgetWarning = '⚠️ 上述安全配件成本通常超出A档预算，建议升至B档以保障安全';
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

function buildAcceptanceNodes(family_risk) {
  const base = getAcceptanceNodes();
  const node13 = buildNode13(family_risk);
  if (!node13) return base;

  const final = base[2];
  const items = Array.isArray(final.items) ? [...final.items] : [];
  const idx = items.findIndex(x => typeof x === 'string' && x.startsWith('⑬'));
  if (idx >= 0) items[idx] = `⑬ ${node13}`;
  else items.push(`⑬ ${node13}`);

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
  const upgradeHint = nextSpec ? `建议升至${nextSpec.label}（${nextSpec.price_range}）` : null;
  
  // 风险1：高层风险（16层以上）
  if (riskTrigger.highFloor) {
    risks.push({
      title: '高层建筑风压风险',
      desc: `您的项目位于第${floor}层（超过16层），风压要求显著高于普通住宅。P3≥${getField(resolved, 'P3')}kPa 需要高强度型材支撑。`,
      suggest: budget_tier === 'A' 
        ? (upgradeHint ? `${upgradeHint}或预约李Sir审核` : '建议升级预算档位或预约李Sir审核')
        : '建议选用壁厚≥1.8mm的系统窗，或预约李Sir审核型材截面',
      question: '请提供：① P3检测报告编号；② 型材截面图/壁厚检测报告；③ 固定方式与螺丝间距方案。'
    });
  }
  
  // 风险2：高度比风险（>50%）
  if (riskTrigger.highRatio) {
    risks.push({
      title: '高区位置风压风险', 
      desc: `您的楼层高度比为${(band.ratio * 100).toFixed(0)}%（超过50%），属于${band.label}，风荷载较大。`,
      suggest: budget_tier === 'A'
        ? (upgradeHint ? `${upgradeHint}或增加型材壁厚` : '建议升级预算档位或增加型材壁厚')
        : '建议增加型材壁厚，或选择抗风压等级更高的产品系列',
      question: '请明确：① 主受力壁厚承诺值与检测方式；② 角码/注胶工艺；③ 防水排水结构与等压腔方案。'
    });
  }
  
  // 风险3：预算与楼层冲突（A档+高层，新价格区间下仍建议谨慎）
  if (riskTrigger.budgetConflict) {
    risks.push({
      title: '预算与楼层匹配建议',
      desc: `您选择${spec.label}（${spec.price_range}）用于第${floor}层（${band.label}），在高层风压要求下仍建议考虑升级以获得更高安全余量`,
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
      suggest: '建议预约李Sir到场监督竣工验收',
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

function getOptimizations() {
  return [
    { title: '隔声优化', desc: '若窗外为低频噪音（高架），建议玻璃升级为夹胶+中空' },
    { title: '节能优化', desc: '冬季保温可提升K值至1.8以下，降低采暖费用' }
  ];
}

function getUpgrades(family_risk) {
  return [
    { name: '隔音升级+', desc: 'Rw基础上+5dB，需三玻两腔', costHint: '+约180元/㎡', stars: 4 },
    { name: '热工升级+', desc: 'K值降0.3，需注胶式断桥', costHint: '+约120元/㎡', stars: 3 },
    { name: '安全升级+', desc: buildSafetyUpgradeDesc(family_risk), costHint: '+约80元/㎡', stars: 5 }
  ];
}

function buildAnalysisParagraph(answers, resolved) {
  const { city, floor, total_floors, pain_point, noise_type, noise_dist, west_shading, orientation } = answers;
  const band = getHeightBand(floor, total_floors);
  
  let text = '';
  
  if (pain_point === 'sound') {
    const sceneDesc = getNoiseSceneDesc(noise_type, noise_dist);
    const lifeTarget = LIFE_TARGET.sound;
    text = `您所在项目位于${city}第${floor}层（${band.label}），${sceneDesc}。本次采购的核心目标是：${lifeTarget}。要实现这一目标，窗户隔声量需达到Rw≥${getField(resolved, 'Rw')}dB。这是本次招标的推荐门槛，低于此值的方案建议不予优先考虑。`;

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
      answers.pain_point
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

function mapToSections(resolved, answers, pdfNo) {
  assertResolved(resolved);

  try {
    const painPoint = answers.pain_point;
    const currentRw = Number(getField(resolved, 'Rw'));
    const rw = getRwRequired(answers.noise_type, answers.noise_dist, painPoint, answers.floor);
    if (Number.isFinite(rw) && (!Number.isFinite(currentRw) || rw > currentRw)) {
      resolved.Rw_required = rw;
    }
  } catch (e) {
  }
  
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

  return {
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
      needsAnalysis: build1_2(normalizedAnswers, resolved),
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
          const glassDirection = Rw_required <= 33 ? '可在档内用常规中空配置实现' : Rw_required <= 38 ? '需要夹胶/更高隔声玻璃构造' : '往往需要三玻两腔等高阶隔声构造';

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
      metrics: [
        {
          name: '抗风压性能',
          value: `≥ ${getField(resolved, 'P3')}`, // 修复：使用 getField
          unit: 'kPa',
          std: STANDARDS_MAP.wind_pressure.code,
          level: (getField(resolved, 'P3') >= 3.0 ? '高等级' : '标准等级'),
          note: `${normalizedAnswers.city}${resolved.wind_zone || 'W?'}风区，第${normalizedAnswers.floor}层`,
          isCore: painTag.coreMetric === 'P3'
        },
        {
          name: '计权隔声量',
          value: `≥ ${getField(resolved, 'Rw')}`, // 修复：使用 getField
          unit: 'dB',
          std: STANDARDS_MAP.sound_insulation.code,
          level: (getField(resolved, 'Rw') >= 35 ? '高隔声' : '标准隔声'),
          note: `${getNoiseLabel(normalizedAnswers.noise_type, normalizedAnswers.noise_dist).typeLabel}环境${normalizedAnswers.pain_point === 'sound' ? '，睡眠场景加严' : ''}`,
          isCore: painTag.coreMetric === 'Rw'
        },
        {
          name: '热工性能',
          value: `K≤${getField(resolved, 'K')} W/(m²·K)\nSHGC≤${getField(resolved, 'SHGC')}`,
          unit: '',
          std: STANDARDS_MAP.thermal.code,
          level: getClimateLabel(climateZone),
          note: `${getClimateName(climateZone)}区 ${getThermalModifier(normalizedAnswers)}`,
          isCore: painTag.coreMetric === 'SHGC'
        }
      ],
      budgetSpec: budgetSpec,
      redLines: {
        forbidden: getForbiddenItems(normalizedAnswers.budget_tier, getField(resolved, 'K'), window_features, getField(resolved, 'Rw')),
        safetyItems: safety.items,
        safetyBudgetWarning: safety.budgetWarning
      }
    },
    
    chapter3: {
      recommendedConfig: { title: '3.1 推荐配置方案', spec: budgetSpec },
      budgetComparison: {
        title: '3.2 预算档位对比',
        currentTier: answers.budget_tier,
        tiers: [
          { key: 'A', label: BUDGET_SPEC.A.label, priceRange: BUDGET_SPEC.A.price_range, barRatio: BUDGET_SPEC.A.bar_ratio },
          { key: 'B', label: BUDGET_SPEC.B.label, priceRange: BUDGET_SPEC.B.price_range, barRatio: BUDGET_SPEC.B.bar_ratio },
          { key: 'C', label: BUDGET_SPEC.C.label, priceRange: BUDGET_SPEC.C.price_range, barRatio: BUDGET_SPEC.C.bar_ratio },
          { key: 'D', label: BUDGET_SPEC.D.label, priceRange: BUDGET_SPEC.D.price_range, barRatio: BUDGET_SPEC.D.bar_ratio }
        ]
      },
      conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved),
      upgradeOptions: {
        title: '3.4 可选升级项',
        items: getUpgrades(answers.family_risk),
        l2_entry: {
          text: '以下升级项未包含在当前标准中。如需评估哪项性价比最高、或商家能否在报价中实现，可咨询李Sir',
          action: '预约咨询 →',
          variant: 'outlined'
        }
      }
    },
    
    chapter4: {
      ...buildChapter4Data(answers, budgetSpec, resolved, riskTrigger, isRisk),
      isRisk: isRisk,
      riskTrigger: riskTrigger
    },
    
    attachments: {
      photos: answers.photos || []
    }
  };
}

module.exports = { mapToSections, getField, assertResolved, BUDGET_SPEC };
