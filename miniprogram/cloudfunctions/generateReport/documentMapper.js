/**
 * documentMapper.js
 * answers + resolved → sections 完整映射
 * 版本：2026-03-14 最终修复版（含价格区间更新）
 */

// ═══════════════════════════════════════════════════════════════
// 常量定义
// ═══════════════════════════════════════════════════════════════

const CLIMATE_MAP = {
  severe_cold: '严寒地区（1类）',
  cold: '寒冷地区（2类）',
  hot_summer_cold_winter: '夏热冬冷地区（3类）',
  hot_summer_warm_winter: '夏热冬暖地区（4类）',
  hot_year: '夏热冬暖地区（4类）', // calculator-v2 使用的别名
  mild: '温和地区（5类）'
};

// 字段映射：calculator-v2 输出 vs documentMapper 使用
const FIELD_MAP = {
  P3: 'P3_required',
  Rw: 'Rw_required', 
  K: 'K_target',
  SHGC: 'SHGC_target'
};

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

// Claude 确认的最终版预算档位（2026-03-14）
const BUDGET_SPEC = {
  A: {
    tier: 'A',
    label: '经济实用 A档',
    price_range: '600–800 元/㎡',
    price_hint: '600元以下产品建议谨慎，壁厚和五金难以保证',
    bar_ratio: 0.35,
    profile: '断桥铝，壁厚 ≥1.4mm，穿条式隔热条',
    glass: '5+9A+5 普通中空（或 5Low-E+9A+5）',
    hardware: '国产标准五金，铰链负载≥60kg',
    seal: 'EPDM胶条，2道密封'
  },
  B: {
    tier: 'B',
    label: '舒适均衡 B档',
    price_range: '800–1200 元/㎡',
    bar_ratio: 0.55,
    profile: '断桥铝，壁厚 ≥1.6mm，穿条式 ≥28mm',
    glass: '5Low-E+12Ar+5 中空充氩气',
    hardware: '多点锁传动，铰链负载≥80kg',
    seal: 'EPDM三元乙丙胶条，2道密封'
  },
  C: {
    tier: 'C',
    label: '品质进阶 C档',
    price_range: '1200–1800 元/㎡',
    bar_ratio: 0.75,
    profile: '注胶式断桥 ≥32mm，或入门系统门窗',
    glass: '6Low-E+16Ar+6 三层充氩气',
    hardware: '进口五金，铰链负载≥100kg',
    seal: 'EPDM胶条，3道密封'
  },
  D: {
    tier: 'D',
    label: '定制高端 D档',
    price_range: '1800+ 元/㎡',
    bar_ratio: 1.00,
    profile: '被动式/近被动式系统门窗，壁厚 ≥2.0mm',
    glass: '三玻两腔+暖边间隔条+充氩气',
    hardware: '进口隐藏合页，铰链负载≥120kg',
    seal: '复合胶条，4道密封'
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
  const expected = ['P3_required', 'Rw_required', 'K_target', 'SHGC_target', 'climate_zone', 'wind_zone'];
  const missing = expected.filter(f => resolved[f] === undefined);
  if (missing.length > 0) {
    console.error('[documentMapper] ⚠️ resolved 缺少字段:', missing);
    console.log('[documentMapper] resolved 实际字段:', Object.keys(resolved));
  }
  return missing.length === 0;
}

function getClimateLabel(climateZone) {
  return CLIMATE_MAP[climateZone] || '气候区待确认';
}

function getHeightBand(floor, total) {
  const r = total > 0 ? floor / total : 0;
  if (r > 0.75) return { label: '超高区', ratio: r, warn: '建议专业风压复核' };
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
    gt50: '远距离（>50m）'
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
  return byType[noiseDist] || byType['20to50'] || byType.lt20 || byType.gt50 || '';
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
  if (!familyRisk || familyRisk === 'none') return '普通家庭';
  if (familyRisk === 'child') return '含儿童（含安全专项条款）';
  if (familyRisk === 'elder') return '含老人（适老化条款）';
  if (familyRisk === 'both') return '含儿童及老人（双重安全条款）';
  return '特殊需求家庭';
}

function getDeadlineText(timeline) {
  const map = {
    lt1m: '请于7个工作日内',
    '1to3m': '请于14个工作日内',
    flexible: '请于30个工作日内'
  };
  return map[timeline] || '请于14个工作日内';
}

function getAcceptanceNodes(climateZone) {
  const isCold = ['cold', 'severe_cold'].includes(climateZone);
  
  return [
    {
      stage: '进场验收',
      items: [
        '核查产品铭牌：品牌、型号与报价单一致',
        '索取型材截面图及壁厚检测报告，实测值≥承诺值',
        '核查玻璃配置：Low-E膜层、间隔层厚度'
      ]
    },
    {
      stage: '安装验收',
      items: [
        '发泡剂填充：窗框与洞口间隙全周填充，无漏缝',
        isCold ? '打胶须在5°C以上施工；宽度≥8mm' : '中性硅酮密封胶宽度≥8mm'
      ]
    },
    {
      stage: '竣工验收',
      items: [
        '手持烟雾笔检测缝隙：无可见气流',
        '淋水测试3分钟：室内无渗漏',
        '所有扇开启顺畅，执手转动轻盈'
      ]
    }
  ];
}

// ═══════════════════════════════════════════════════════════════
// 业务逻辑函数（含更新后的价格和冲突规则）
// ═══════════════════════════════════════════════════════════════

function getBudgetSpec(tier) {
  return BUDGET_SPEC[tier] || BUDGET_SPEC.B;
}

function getForbiddenItems(tier) {
  const base = [
    '禁止使用回收铝（再生料）型材，须提供原生铝材质检报告',
    '禁止单玻或无Low-E膜的普通中空玻璃',
    '禁止以普通密封胶代替结构胶（须使用中性硅酮结构胶）'
  ];
  
  const extra = {
    A: [
      '型材壁厚须≥1.4mm，提供截面检测报告（A档基础要求）',
      '隔热条宽度须≥20mm，禁止穿条式仿断桥产品'
    ],
    B: [
      '隔热条宽度须≥28mm，禁止<24mm仿断桥产品',
      '玻璃须充氩气，提供气体填充检测报告'
    ],
    C: [
      '须为正规系统门窗品牌，提供系统厂商授权书',
      '型材须为注胶式或等压腔设计，提供结构计算书'
    ],
    D: [
      '须提供欧标（CE/Passivhaus）或国内第三方认证报告',
      '须为被动式或近被动式系统门窗，提供K值检测报告'
    ]
  };
  
  return [...base, ...(extra[tier] || [])];
}

function getSafetyItems(familyRisk, budgetTier) {
  const items = [];
  let budgetWarning = null;
  
  if (familyRisk === 'child' || familyRisk === 'both') {
    items.push('窗台高度<900mm时，须安装儿童防坠限位器（开启角度≤100mm）');
    items.push('玻璃须使用夹胶安全玻璃（6.38mm+），破碎后不脱落');
    items.push('执手安装高度建议≥1500mm，防止儿童误开');
  }
  
  if (familyRisk === 'elder' || familyRisk === 'both') {
    items.push('执手操作力≤25N（适老标准），需厂家测试数据支持');
    items.push('门槛高度≤15mm，防绊倒；无法避免须配套防绊坡道');
  }
  
  if ((familyRisk === 'child' || familyRisk === 'both') && budgetTier === 'A') {
    budgetWarning = '⚠️ 上述安全配件成本通常超出A档预算，建议升至B档以保障安全';
  }
  
  return { items, budgetWarning };
}

// 更新后的风险提示（含新价格区间和档位区分）
function getRiskWarnings(answers, resolved, riskTrigger) {
  const risks = [];
  const { floor, total_floors, budget_tier } = answers;
  const band = getHeightBand(floor, total_floors);
  const spec = BUDGET_SPEC[budget_tier];
  
  // 风险1：高层风险（16层以上）
  if (riskTrigger.highFloor) {
    risks.push({
      title: '高层建筑风压风险',
      desc: `您的项目位于第${floor}层（超过16层），风压要求显著高于普通住宅。P3≥${getField(resolved, 'P3')}kPa 需要高强度型材支撑。`,
      suggest: budget_tier === 'A' 
        ? 'A档（600-800元/㎡）在高层可能存在型材强度不足风险，建议升至B档（800-1200元/㎡）或预约李Sir审核'
        : '建议选用壁厚≥1.8mm的系统窗，或预约李Sir审核型材截面'
    });
  }
  
  // 风险2：高度比风险（>50%）
  if (riskTrigger.highRatio) {
    risks.push({
      title: '高区位置风压风险', 
      desc: `您的楼层高度比为${(band.ratio * 100).toFixed(0)}%（超过50%），属于${band.label}，风荷载较大。`,
      suggest: budget_tier === 'A'
        ? 'A档配置在超高区可能不足，建议升级至B档或增加型材壁厚'
        : '建议增加型材壁厚，或选择抗风压等级更高的产品系列'
    });
  }
  
  // 风险3：预算与楼层冲突（A档+高层，新价格区间下仍建议谨慎）
  if (riskTrigger.budgetConflict) {
    risks.push({
      title: '预算与楼层匹配建议',
      desc: `您选择A档（600-800元/㎡）用于第${floor}层（${band.label}），虽然A档已较旧版提升，但高层风压要求下仍建议考虑升级`,
      suggest: '建议升至B档（800-1200元/㎡）获得更高安全余量，或请李Sir筛选A档中高性价比的加厚型材方案'
    });
  }
  
  // 风险4：儿童安全
  if (answers.family_risk === 'child' || answers.family_risk === 'both') {
    risks.push({
      title: '儿童安全条款需专项验收',
      desc: '限位器与夹胶玻璃需由第三方核验，不可自验',
      suggest: '建议预约李Sir到场监督竣工验收'
    });
  }
  
  // 风险5：西晒热工
  if (answers.orientation === 'west' && answers.west_shading === false) {
    risks.push({
      title: '西晒热工负荷高',
      desc: '无遮阳西晒窗夏季空调负荷显著增加，现有配置可能不足',
      suggest: '考虑热工升级+或增加外遮阳措施'
    });
  }
  
  return risks;
}

function getOptimizations() {
  return [
    { title: '隔声优化', desc: '若窗外为低频噪音（高架），建议玻璃升级为夹胶+中空' },
    { title: '节能优化', desc: '冬季保温可提升K值至1.8以下，降低采暖费用' }
  ];
}

function getUpgrades() {
  return [
    { name: '隔音升级+', desc: 'Rw基础上+5dB，需三玻两腔', costHint: '+约180元/㎡', stars: 4 },
    { name: '热工升级+', desc: 'K值降0.3，需注胶式断桥', costHint: '+约120元/㎡', stars: 3 },
    { name: '安全升级+', desc: '夹胶玻璃+儿童限位器', costHint: '+约80元/㎡', stars: 5 }
  ];
}

function buildAnalysisParagraph(answers, resolved) {
  const { city, floor, total_floors, pain_point, noise_type, noise_dist, west_shading, orientation } = answers;
  const band = getHeightBand(floor, total_floors);
  
  let text = '';
  
  if (pain_point === 'sound') {
    const sceneDesc = getNoiseSceneDesc(noise_type, noise_dist);
    const lifeTarget = LIFE_TARGET.sound;
    text = `您所在项目位于${city}第${floor}层（${band.label}），${sceneDesc}。本次采购的核心目标是：${lifeTarget}。要实现这一目标，窗户隔声量需达到Rw≥${getField(resolved, 'Rw')}dB。这是本次招标的技术红线，商家提案低于此值不予考虑。`;
  } else if (pain_point === 'heat') {
    const westDesc = (west_shading === false && orientation === 'west') ? '西晒无遮阳，热辐射压力较高，' : '';
    text = `您的项目位于${city}${getClimateLabel(resolved.climate_zone)}的第${floor}层。${westDesc}以下标准以热工性能为核心，SHGC≤${getField(resolved, 'SHGC')}是夏季隔热的关键指标，请商家提供Low-E玻璃配置方案及检测报告。`;
  } else if (pain_point === 'wind') {
    text = `您的项目位于${city}（${resolved.wind_zone || 'W?'}风区）的第${floor}层，高度比${(band.ratio * 100).toFixed(0)}%（${band.label}），抗风压要求较高。P3≥${getField(resolved, 'P3')}kPa是本次采购的硬性门槛，商家须提供第三方检测证明。`;
  } else if (pain_point === 'safety') {
    text = `您的项目包含${answers.family_risk === 'child' ? '儿童' : '老年'}家庭成员，本文件在常规技术指标外特别增设安全专项条款。所有安全配件（限位器/夹胶玻璃/适老五金）须在竣工验收时提供安装凭证。`;
  } else {
    text = `您的项目位于${city}第${floor}层（${band.label}），综合考虑了${getClimateLabel(resolved.climate_zone)}的气候区标准与建筑环境，以下技术指标基于GB/T 8478-2020计算。`;
  }
  
  return text;
}

// ═══════════════════════════════════════════════════════════════
// 主映射函数
// ═══════════════════════════════════════════════════════════════

function mapToSections(resolved, answers, pdfNo) {
  assertResolved(resolved);

  try {
    const painPoint = answers.pain_point || answers.priority;
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
  const painTag = getPainTag(answers.pain_point);
  const budgetSpec = getBudgetSpec(answers.budget_tier);
  const safety = getSafetyItems(answers.family_risk, answers.budget_tier);
  
  // 风险触发条件：16层以上 或 高度比>50% 或 有risk_flags 或 免责声明
  const isHighFloor = answers.floor > 16;
  const isHighRatio = band.ratio > 0.5;
  const hasRiskFlags = resolved.risk_flags && Object.keys(resolved.risk_flags).length > 0;
  const isRisk = hasRiskFlags || isHighFloor || isHighRatio || answers.isDisclaimer === true;
  
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
      city: answers.city || '未知城市',
      district: answers.district || '',
      climateLabel: getClimateLabel(resolved.climate_zone), // 修复：使用 climate_zone
      floorDesc: `第${answers.floor}层/共${answers.total_floors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
      painTag: painTag.text,
      isRisk: isRisk,
      hasSafety: answers.family_risk !== 'none',
      degradedCity: resolved.degraded || false,
      degradedMsg: resolved.degraded ? `${answers.city}暂未精确覆盖，以下参数基于保守标准推算` : null,
      disclaimer: '本文件由李Sir门窗技术顾问系统基于用户填写信息自动生成，仅供参考，不构成正式法律合同。'
    },
    
    chapter1: {
      city: answers.city,
      district: answers.district || '',
      climateLabel: getClimateLabel(resolved.climate_zone), // 修复：使用 climate_zone
      windZone: resolved.wind_zone || 'W?',
      floorDesc: `第${answers.floor}层/共${answers.total_floors}层（高度比${(band.ratio * 100).toFixed(0)}%，${band.label}）`,
      heatingDesc: getHeatingDesc(answers.heating_type),
      familyDesc: getFamilyDesc(answers.family_risk),
      analysisPara: buildAnalysisParagraph(answers, resolved),
      noise: answers.noise_type !== 'quiet' ? {
        show: true,
        typeLabel: getNoiseLabel(answers.noise_type, answers.noise_dist).typeLabel,
        distKey: answers.noise_dist,
        distLabel: getNoiseLabel(answers.noise_type, answers.noise_dist).distLabel,
        levelLabel: getNoiseLabel(answers.noise_type, answers.noise_dist).levelLabel
      } : { show: false }
    },
    
    chapter2: {
      metrics: [
        {
          name: '抗风压性能',
          value: `≥ ${getField(resolved, 'P3')}`, // 修复：使用 getField
          unit: 'kPa',
          std: 'GB/T 7106-2019',
          level: (getField(resolved, 'P3') >= 3.0 ? '高等级' : '标准等级'),
          note: `${answers.city}${resolved.wind_zone || 'W?'}风区，第${answers.floor}层`,
          isCore: painTag.coreMetric === 'P3'
        },
        {
          name: '计权隔声量',
          value: `≥ ${getField(resolved, 'Rw')}`, // 修复：使用 getField
          unit: 'dB',
          std: 'GB/T 8485-2008',
          level: (getField(resolved, 'Rw') >= 35 ? '高隔声' : '标准隔声'),
          note: `${getNoiseLabel(answers.noise_type, answers.noise_dist).typeLabel}环境${answers.priority === 'sound' ? '，优先级加权' : ''}`,
          isCore: painTag.coreMetric === 'Rw'
        },
        {
          name: '热工性能',
          value: `K≤${getField(resolved, 'K')} / SHGC≤${getField(resolved, 'SHGC')}`, // 修复：使用 getField
          unit: 'W/m²·K',
          std: 'GB/T 8484-2020',
          level: getClimateLabel(resolved.climate_zone),
          note: answers.west_shading === false && answers.orientation === 'west' ? '西晒无遮阳，SHGC已下调' : '标准热工要求',
          isCore: painTag.coreMetric === 'SHGC'
        }
      ],
      budgetSpec: budgetSpec,
      redLines: {
        forbidden: getForbiddenItems(answers.budget_tier),
        safetyItems: safety.items,
        safetyBudgetWarning: safety.budgetWarning,
        conflictNotes: resolved.conflict_notes || []
      }
    },
    
    chapter3: {
      currentTier: answers.budget_tier,
      budgetSpec: budgetSpec, // 传递给第三章使用
      tiers: [
        { key: 'A', label: BUDGET_SPEC.A.label, priceRange: BUDGET_SPEC.A.price_range, barRatio: BUDGET_SPEC.A.bar_ratio },
        { key: 'B', label: BUDGET_SPEC.B.label, priceRange: BUDGET_SPEC.B.price_range, barRatio: BUDGET_SPEC.B.bar_ratio },
        { key: 'C', label: BUDGET_SPEC.C.label, priceRange: BUDGET_SPEC.C.price_range, barRatio: BUDGET_SPEC.C.bar_ratio },
        { key: 'D', label: BUDGET_SPEC.D.label, priceRange: BUDGET_SPEC.D.price_range, barRatio: BUDGET_SPEC.D.bar_ratio }
      ],
      upgrades: getUpgrades()
    },
    
    chapter4: {
      isRisk: isRisk,
      riskTrigger: riskTrigger, // 传递给 PDF 渲染层
      risks: isRisk ? getRiskWarnings(answers, resolved, riskTrigger) : [],
      optimizations: !isRisk ? getOptimizations() : [],
      deadlineText: getDeadlineText(answers.timeline),
      acceptanceNodes: getAcceptanceNodes(resolved.climate_zone) // 修复：使用 climate_zone
    },
    
    attachments: {
      photos: answers.photos || []
    }
  };
}

module.exports = { mapToSections, getField, assertResolved, BUDGET_SPEC };
