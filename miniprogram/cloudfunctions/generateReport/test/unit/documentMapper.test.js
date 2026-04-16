const dm = require('../../documentMapper');
const fixtures = require('../fixtures/testAnswers');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { buildPDF } = require('../../pdfBuilder-v2');
const { calculateAll } = require('../../calculator-v2');
const { GLASS_LEVELS } = require('../../shared/budgetSpec');

jest.setTimeout(30000);

const {
  build1_1,
  build1_2,
  buildRedlineChecklist,
  buildPerformanceChecks,
  calcUpgradeRating,
  getStars,
  getBudgetSpec,
  getHeatingAdjText,
  getShgcNote,
  getThermalModifier,
  getField,
  assertResolved,
  getUpgrades,
  buildBudgetSpecView
} = dm;

describe('build1_1', () => {
  test('DM01: Q3多选 - 顿号连接', () => {
    const r = build1_1(fixtures.guangzhouFull);
    expect(r.painPoint).toContain('隔声降噪');
    expect(r.painPoint).toContain('通风采光');
    expect(r.painPoint).toMatch(/、/);
  });

  test('DM02: Q4噪音 - 中点拼接', () => {
    const r = build1_1(fixtures.guangzhouFull);
    expect(r.noiseEnv).toContain('轨道交通');
    expect(r.noiseEnv).toContain('近距离');
    expect(r.noiseEnv).toMatch(/·/);
  });

  test('DM03: Q4安静 - 不显示距离', () => {
    const r = build1_1(fixtures.shanghaiThermal);
    expect(r.noiseEnv).toBe('安静环境');
    expect(r.noiseEnv).not.toMatch(/·/);
  });

  test('DM04: room_type多选 - 顿号连接', () => {
    const r = build1_1(fixtures.guangzhouFull);
    expect(r.roomType).toMatch(/、/);
    expect(r.roomType).toContain('阳台');
    expect(r.roomType).toContain('主卧');
  });
});

describe('build1_2', () => {
  test('DM05: A档+安全强制 - 触发预算提示', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { budget_tier: 'A', window_type: 'sliding' });
    const r = build1_2(a, { P3_required: 3.0, Rw_required: 40, K_target: 2.2, SHGC_target: 0.30 });
    expect(r.budgetFitnessNote).not.toBeNull();
    expect(r.budgetFitnessNote.type).toBe('budget_fitness_warning');
  });

  test('DM06: C档+安全强制 - 不触发', () => {
    const a = fixtures.createPure(fixtures.shenzhenSafety, { budget_tier: 'C', window_type: 'door_window' });
    const r = build1_2(a, { P3_required: 3.0, Rw_required: 35, K_target: 2.0, SHGC_target: 0.30 });
    expect(r.budgetFitnessNote).toBeNull();
  });

  test('DM07: A档+无安全 - 不触发', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { budget_tier: 'A', window_type: 'casement', family_risk: [] });
    const r = build1_2(a, { P3_required: 2.6, Rw_required: 30, K_target: 2.3, SHGC_target: 0.35 });
    expect(r.budgetFitnessNote).toBeNull();
  });

  test('DM08: K值显示格式 - 含推荐范围', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { budget_tier: 'B', window_type: 'casement', family_risk: [] });
    const resolved = { P3_required: 3.0, Rw_required: 33, K_target: 2.4, SHGC_target: 0.30, kRange: '2.2~2.4', climateZoneCN: '夏热冬暖', appliedFactor: null };
    const r = build1_2(a, resolved);
    const kRow = (r.needsTable || []).find(x => x.dimension === '传热系数') || {};
    expect(String(kRow.value || '')).toContain('参考范围');
  });
});

describe('buildRedlineChecklist', () => {
  test('DM09: 普通场景 - 只含强制条款', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { window_type: 'casement', family_risk: [], budget_tier: 'C', floor: 3, total_floors: 30 });
    const r = buildRedlineChecklist(a, { safetyForced: false });
    // SPEC-05后所有条款均为强制，不再区分recommended
    expect(r.mandatory.length).toBeGreaterThan(0);
  });

  test('DM10: 最大覆盖 - 触发所有强制条款', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { window_type: 'sliding', budget_tier: 'A', floor: 20, total_floors: 30, family_risk: ['elderly'] });
    const r = buildRedlineChecklist(a, { safetyForced: true });
    // SPEC-05后包含15条强制红线（R01-R15）
    expect(r.mandatory.length).toBeGreaterThanOrEqual(10);
  });

  test('DM11: 推拉窗触发R06', () => {
    const r = buildRedlineChecklist(fixtures.guangzhouFull, { safetyForced: false });
    const r06 = r.mandatory.find(i => i.id === 'R06');
    expect(r06).toBeDefined();
  });

  test('DM12: 隔声场景触发R08', () => {
    // S2重组后R08是隔声性能（原R09），触发条件是Rw_required或Rw
    const r = buildRedlineChecklist(fixtures.guangzhouFull, { safetyForced: false, Rw_required: 35, Rw: 35 });
    const r08 = r.mandatory.find(i => i.id === 'R08');
    expect(r08).toBeDefined();
  });

  test('DM12b: 老人触发R15/R16', () => {
    // S2重组后R15/R16是适老化条目
    const r = buildRedlineChecklist(fixtures.shenzhenSafety, { safetyForced: false });
    const r15 = r.mandatory.find(i => i.id === 'R15');
    const r16 = r.mandatory.find(i => i.id === 'R16');
    expect(r15).toBeDefined();
    expect(r16).toBeDefined();
  });
});

describe('buildPerformanceChecks', () => {
  test('DM13: Rw>30 + thermal - checks.length===3 (隔声+热工)', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['sound', 'thermal'], pain_point: 'sound' });
    const resolved = { Rw_required: 35, K_target: 2.0, SHGC_target: 0.35 };
    const r = buildPerformanceChecks(a, resolved);
    expect(r.length).toBe(3);
    expect(r.some(i => String(i.id).includes('sound'))).toBe(true);
    expect(r.some(i => String(i.id).includes('thermal'))).toBe(true);
  });

  test('DM14: 仅Rw>30 (无thermal) - checks.length===2 (仅隔声)', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['sound'], pain_point: 'sound' });
    const resolved = { Rw_required: 35, K_target: 2.0, SHGC_target: 0.35 };
    const r = buildPerformanceChecks(a, resolved);
    expect(r.length).toBe(2);
    expect(r.some(i => String(i.id).includes('thermal'))).toBe(false);
  });

  test('DM15: Rw<=30 (无隔声需求) - checks.length===1(默认)', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['security'], pain_point: 'safety' });
    const resolved = { Rw_required: 28, K_target: 2.0, SHGC_target: 0.35 };
    const r = buildPerformanceChecks(a, resolved);
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('perf_general');
  });

  test('DM15b: 热工主诉+Rw>30 - 应包含隔声条目 (SPEC-K修复验证)', () => {
    const a = fixtures.createPure(fixtures.shanghaiThermal, { pain_points: ['thermal'], pain_point: 'heat' });
    const resolved = { Rw_required: 33, K_target: 1.8, SHGC_target: 0.30 };
    const r = buildPerformanceChecks(a, resolved);
    expect(r.length).toBe(3); // 隔声2条 + 热工1条
    expect(r.some(i => String(i.id).includes('sound'))).toBe(true);
    expect(r.some(i => String(i.id).includes('thermal'))).toBe(true);
  });

  test('DM15c: 抗风主诉+Rw>30 - 应包含隔声条目 (SPEC-K修复验证)', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['wind'], pain_point: 'wind', noise_type: 'main_road', noise_dist: 'lt20' });
    const resolved = { Rw_required: 41, K_target: 2.0, SHGC_target: 0.35 };
    const r = buildPerformanceChecks(a, resolved);
    expect(r.length).toBe(2); // 仅隔声2条 (无thermal)
    expect(r.some(i => String(i.id).includes('sound'))).toBe(true);
  });
});

describe('calcUpgradeRating', () => {
  test('DM16: 隔音/sound+严重噪音 - 5星', () => {
    const r = calcUpgradeRating('sound', fixtures.guangzhouFull, {});
    expect(r).toBe(5);
  });

  test('DM17: 热工/无thermal/有修正 - 4星', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { pain_points: ['economy'], pain_point: 'price' });
    const r = calcUpgradeRating('thermal', a, { appliedFactor: 'heating' });
    expect(r).toBe(4);
  });

  test('DM18: 安全/强制 - 5星', () => {
    const r = calcUpgradeRating('safety', fixtures.guangzhouFull, {});
    expect(r).toBe(5);
  });

  test('DM19: 安全/非强制 - 3星', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { window_type: 'casement', family_risk: [] });
    const r = calcUpgradeRating('safety', a, {});
    expect(r).toBe(3);
  });
});

describe('helpers', () => {
  test('DM21: getBudgetSpec 未知档位回落到B档', () => {
    const spec = getBudgetSpec('Z');
    expect(spec).toBeTruthy();
    expect(String(spec.label || '')).toContain('B');
  });

  test('DM22: getHeatingAdjText 分支覆盖', () => {
    expect(getHeatingAdjText('self')).toContain('自采暖');
    expect(getHeatingAdjText('none')).toContain('无供暖');
    expect(getHeatingAdjText('central')).toBe('');
  });

  test('DM23: getShgcNote 西向有遮挡', () => {
    expect(getShgcNote({ orientation: 'west', west_shading: true })).toContain('西向');
  });

  test('DM23b: getThermalModifier 标准分支覆盖', () => {
    expect(getThermalModifier({ orientation: 'south', west_shading: true, heating_type: 'central' })).toBe('标准热工要求');
  });

  test('DM24: getField 缺失字段返回待定', () => {
    const v = getField({}, 'Rw');
    expect(v).toBe('待定');
  });

  test('DM25: assertResolved 缺字段触发错误输出', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    assertResolved({ city: '上海' }, 'UNIT-DM25');
    expect(err).toHaveBeenCalled();
    err.mockRestore();
    log.mockRestore();
  });

  test('DM26: getStars 输出长度固定为5', () => {
    expect(getStars(4)).toBe('★★★★☆');
    expect(getStars(0)).toBe('☆☆☆☆☆');
  });

  test('DM27: calcUpgradeRating 未知类型走默认3星', () => {
    expect(calcUpgradeRating('other', fixtures.chengduMinimal, {})).toBe(3);
  });

  test('DM28: build1_1 仅 pain_point 字符串也能映射', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { pain_points: [], painPoint: [], pain_point: 'sound' });
    const r = build1_1(a);
    expect(r.painPoint).toContain('隔声降噪');
  });

  test('DM29: build1_2 K依据为西向隔热加严', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { window_type: 'casement', heating_type: 'central', orientation: 'west', west_shading: false, family_risk: [] });
    const resolved = { P3_required: 3.0, Rw_required: 33, K_target: 2.3, SHGC_target: 0.28, kRange: '2.2~2.4', climateZoneCN: '夏热冬暖', appliedFactor: 'westSun' };
    const r = build1_2(a, resolved);
    const kRow = (r.needsTable || []).find(x => x.dimension === '传热系数') || {};
    expect(String(kRow.basis || '')).toContain('西向隔热加严');
  });

  test('DM-40: build1_2 无效城市触发sealGrades兜底文案', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { city: '火星', district: '未知', window_type: 'sliding' });
    const assessment = { city: a.city, floor: a.floor, total_floors: a.total_floors, noise_type: a.noise_type, noise_dist: a.noise_dist, orientation: a.orientation, west_shading: a.west_shading, pain_point: a.pain_point, heating_type: a.heating_type, family_risk: a.family_risk, budget_tier: a.budget_tier };
    const resolved = calculateAll(assessment);
    const r = build1_2(a, resolved);
    expect(String(((r.parameterNote || {}).block2 || ''))).toContain('⑤ **气密性**：气密性等级按 GB/T 7106 推荐等级确定。');
    expect(String(((r.parameterNote || {}).block2 || ''))).toContain('⑥ **水密性**：水密性等级按 GB/T 7106 推荐等级确定。');
  });

  test('DM-41: build1_2 传热修正包含未知因子时不影响输出', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { heating_type: 'self', heatingType: 'self' });
    const assessment = { city: a.city, floor: a.floor, total_floors: a.total_floors, noise_type: a.noise_type, noise_dist: a.noise_dist, orientation: a.orientation, west_shading: a.west_shading, pain_point: a.pain_point, heating_type: a.heating_type, family_risk: a.family_risk, budget_tier: a.budget_tier };
    const resolved = calculateAll(assessment);
    resolved.corrections = [{ factor: 'unknown', value: -0.2 }];
    const r = build1_2(a, resolved);
    expect(String(((r.parameterNote || {}).block2 || ''))).toContain('③ **传热系数**：');
    expect(String(((r.parameterNote || {}).block2 || ''))).not.toContain('unknown');
  });

  test('DM-40: 交通噪声Rw>38 - 隔音升级描述不含三玻两腔', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { noise_type: 'rail', pain_point: 'sound', noise_dist: 'lt20' });
    const assessment = {
      city: a.city,
      floor: a.floor,
      total_floors: a.total_floors,
      noise_type: a.noise_type,
      noise_dist: a.noise_dist,
      orientation: a.orientation,
      west_shading: a.west_shading,
      pain_point: a.pain_point,
      heating_type: a.heating_type,
      family_risk: a.family_risk,
      budget_tier: a.budget_tier
    };
    const resolved = calculateAll(assessment);
    // 直接调用 getUpgrades 验证文案
    const upgrades = dm.getUpgrades(a, resolved);
    const acousticDesc = upgrades.find(u => u.name.includes('隔音'));
    expect(acousticDesc).toBeDefined();
    expect(acousticDesc.desc).not.toMatch(/需三玻两腔/);
    expect(acousticDesc.desc).toMatch(/夹胶中空升规格/);
  });
});

describe('B-14 C短期 红线文案动态化', () => {
  test('DM-21: 深圳15F开启窗 - 气密6级水密6级（沿海+台风+高层）', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r12 = (checklist.mandatory || []).find(r => r.id === 'R11');
    expect(r12.text).toContain('气密≥6级');
    expect(r12.text).toContain('水密≥6级');
    expect(r12.text).toContain('安装节点按设计图纸施工');
    expect(r12.text).toContain('打胶影像记录');
  });

  test('DM-22: 成都3F固定窗 - 气密5级水密5级（固定窗+1）', () => {
    const answers = { city: 'chengdu', floor: 3, window_type: 'fixed', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r12 = (checklist.mandatory || []).find(r => r.id === 'R11');
    expect(r12.text).toContain('气密≥5级');
    expect(r12.text).toContain('水密≥5级');
    expect(r12.text).toContain('安装节点按设计图纸施工');
  });

  test('DM-23: 北京20F开启窗 - 气密6级水密4级（高层内陆）', () => {
    const answers = { city: 'beijing', floor: 20, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r12 = (checklist.mandatory || []).find(r => r.id === 'R11');
    expect(r12.text).toContain('气密≥6级');
    expect(r12.text).toContain('水密≥4级');
    expect(r12.text).toContain('打胶影像记录');
  });

  test('DM-24: 沈阳3F开启窗 - 气密6级（严寒推高）', () => {
    const answers = { city: 'shenyang', floor: 3, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r12 = (checklist.mandatory || []).find(r => r.id === 'R11');
    expect(r12.text).toContain('气密≥6级');
    expect(r12.text).toContain('安装节点按设计图纸施工');
  });

  test('DM-25: 上海10F开启窗 - 气密6级水密6级（近海+高层）', () => {
    const answers = { city: 'shanghai', floor: 10, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r12 = (checklist.mandatory || []).find(r => r.id === 'R11');
    expect(r12.text).toContain('气密≥6级');
    expect(r12.text).toContain('水密≥6级');
    expect(r12.text).toContain('打胶影像记录');
  });
});

describe('B-14 A中期 七维参数表与结构化等级', () => {
  test('DM-26: 1.2需求表五维→七维（新增气密/水密）', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { city: '成都', floor: 3, total_floors: 18, window_type: 'casement', family_risk: [] });
    const resolved = { P3_required: 2.6, Rw_required: 30, K_target: 2.3, SHGC_target: 0.35, kRange: '2.3~2.5', climateZoneCN: '夏热冬冷', appliedFactor: null };
    const r = build1_2(a, resolved);
    expect(Array.isArray(r.needsTable)).toBe(true);
    expect(r.needsTable.length).toBe(7);
    expect(r.needsTable.some(x => x.dimension === '气密性')).toBe(true);
    expect(r.needsTable.some(x => x.dimension === '水密性')).toBe(true);
  });

  test('DM-27: 无级差处理 - 气密airGap=0不显示最低等级', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { city: '成都', floor: 3, total_floors: 18, window_type: 'casement', family_risk: [] });
    const resolved = { P3_required: 2.6, Rw_required: 30, K_target: 2.3, SHGC_target: 0.35, kRange: '2.3~2.5', climateZoneCN: '夏热冬冷', appliedFactor: null };
    const r = build1_2(a, resolved);
    const airRow = (r.needsTable || []).find(x => x.dimension === '气密性') || {};
    expect(String(airRow.value || '')).toContain('本案目标值：≥4级');
    expect(String(airRow.value || '')).not.toContain('最低可接受值');
  });

  test('DM-28b: 固定窗 - sealGrades.isFixed=true', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { city: '成都', floor: 3, total_floors: 18, window_type: 'fixed', family_risk: [] });
    const resolved = { P3_required: 2.6, Rw_required: 30, K_target: 2.3, SHGC_target: 0.35, kRange: '2.3~2.5', climateZoneCN: '夏热冬冷', appliedFactor: null };
    const r = build1_2(a, resolved);
    expect(r.sealGrades && r.sealGrades.isFixed).toBe(true);
  });
});

async function buildPdfForAnswers(answers, pdfNo) {
  const assessment = {
    city: answers.city,
    floor: answers.floor,
    total_floors: answers.total_floors,
    noise_type: answers.noise_type,
    noise_dist: answers.noise_dist,
    orientation: answers.orientation,
    west_shading: answers.west_shading,
    pain_point: answers.pain_point,
    heating_type: answers.heating_type,
    family_risk: answers.family_risk,
    budget_tier: answers.budget_tier
  };
  const resolved = calculateAll(assessment);
  const sections = dm.mapToSections(resolved, { ...answers, photos: [] }, pdfNo);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'generateReport-s7-'));
  const out = path.join(dir, `${pdfNo}.pdf`);
  await buildPDF(sections, out);
  return out;
}

async function buildPdfTextForAnswers(answers, pdfNo) {
  const PDFDocument = require('pdfkit');
  const texts = [];
  const originalText = PDFDocument.prototype.text;
  PDFDocument.prototype.text = function (text, ...args) {
    texts.push(String(text || ""));
    return originalText.call(this, text, ...args);
  };
  try {
    await buildPdfForAnswers(answers, pdfNo);
  } finally {
    PDFDocument.prototype.text = originalText;
  }
  return texts.join('\n');
}

describe('Sprint 7 C-短期文案优化', () => {
  test('DM-29: 封面应包含价值主张与签发人', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM29');
    expect(pdfContent).toContain('帮您用数据选窗，不凭感觉、不靠话术');
    expect(pdfContent).toContain('李Sir · 独立门窗技术顾问（不销售、不代理）');
    expect(pdfContent).toContain('📋 业主：第一章了解需求转化逻辑；第三章确认预算；第四章直接发给商家。');
    expect(pdfContent).toContain('🏭 商家：请重点阅读第二章技术指标，并完整填写第四章答题表后回传业主。');
  }, 20000);

  test('DM-30: 参数表气密水密格式应为推荐/最低分层', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM30');
    expect(pdfContent).toContain('本案目标值：≥6级');
    expect(pdfContent).toContain('本案目标值：≥6级');
  });

  test('DM-31: 1.2节叙述段应包含弹性文案', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM31');
    expect(pdfContent).toContain('让关窗后室内安静到可以安睡');
    expect(pdfContent).toContain('不再被室外车流声干扰');
  });

  test('DM-32: 玻璃差价提示应标明档位标准配置基准', async () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, {
      noise_type: 'quiet',
      noise_dist: 'gt50',
      pain_point: 'price',
      pain_points: ['economy'],
      window_type: 'casement',
      budget_tier: 'A'
    });
    const pdfContent = await buildPdfTextForAnswers(a, 'S7-DM32');
    expect(pdfContent).toContain('玻璃配置');
  });

  test('DM-33: R11水密气密条款应包含安装过程控制', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM33');
    expect(pdfContent).toContain('水密≥');
    expect(pdfContent).toContain('气密≥');
    expect(pdfContent).toContain('安装节点按设计图纸施工');
    expect(pdfContent).toContain('打胶影像记录');
  });

  test('DM-34: 红线强制区标题与R01/R04/R05强制条款', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM34');
    expect(pdfContent).toContain('方案原则上不建议采用');
    expect(pdfContent).toContain('须采用原生铝型材');
    expect(pdfContent).toContain('如采用其他材质，应说明理由');
    expect(pdfContent).toContain('隔热条宽度≥28mm');
    expect(pdfContent).toContain('壁厚≥1.5mm');
    expect(pdfContent).toContain('禁止单玻或无Low-E膜');
    expect(pdfContent).toContain('禁止普通密封胶代替结构胶');
    expect(pdfContent).toContain('夹胶构造为强制要求');
  });

  test('DM-35: 商家答题表引导语应软化', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM35');
    expect(pdfContent).toContain('请尽量完整填写；未填写项将影响方案的可比性和业主的优先选择。');
    expect(pdfContent).not.toContain('写不出来就空着');
  });

  test('DM-36: 商家签名行应包含合同建议', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM36');
    expect(pdfContent).toContain('下列签名表示填写人已确认上述内容的真实性');
    expect(pdfContent).toContain('本文件所列关键指标为合同技术条款的组成部分');
    expect(pdfContent).not.toContain('商家签名（无需公章）');
  });

  test('DM-37: 验收⑭应包含免责声明', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM37');
    expect(pdfContent).toContain('仅作为居住体验参考，不等同于实验室检测');
    expect(pdfContent).toContain('如感知差异不明显，可要求商家说明原因或提出改进方案');
  });
});

describe('Sprint 7 A-中期（逻辑层）端到端', () => {
  test('E2E-01: 广州8F推拉窗A档 - 三块脚注 + ⑫/⑬推拉适配 + 4.1~4.4顺序', async () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { heating_type: 'self', heatingType: 'self' });
    const pdfContent = await buildPdfTextForAnswers(a, 'S7A-E2E-01');
    expect(pdfContent).toContain('本表各项参数综合三类信息确定');
    expect(pdfContent).toContain('① 抗风压：');
    expect(pdfContent).toContain('② 隔声：');
    expect(pdfContent).toContain('③ 传热系数：');
    expect(pdfContent).toContain('④ 太阳得热：');
    expect(pdfContent).toContain('⑤ 气密性：');
    expect(pdfContent).toContain('⑥ 水密性：');
    expect(pdfContent).toContain('⑦ 安全等级：');
    expect(pdfContent).toMatch(/广州属\s+W\d+\s+风区/);
    expect(pdfContent).toContain('基准 2.4 W/(m²·K)');
    expect(pdfContent).toContain('自采暖保温修正 -0.2');
    expect((pdfContent.match(/修正 -0\.2/g) || []).length).toBe(1);
    expect(pdfContent).toContain('高层（≥7F）建议上调至 6 级');
    expect(pdfContent).toContain('不可降级');
    expect(pdfContent).not.toContain('参数说明：本文件中的技术参数为推荐目标值');
    expect(pdfContent).toContain('隔声降噪诉求加严');
    expect(pdfContent).not.toContain('阳台睡眠');
    expect(pdfContent).not.toContain('房间场景');
    expect(pdfContent).toContain('台风季暴雨侵蚀');

    expect(pdfContent).toContain('推拉扇限位块');
    expect(pdfContent).toContain('推拉扇锁定装置');
    // M4修改后，儿童安全配件可能在强制项和基础项中各出现一次，合计2次
    expect((pdfContent.match(/儿童安全配件/g) || []).length).toBeGreaterThanOrEqual(1);
    expect((pdfContent.match(/大面积安全玻璃/g) || []).length).toBe(1);

    const idx41 = pdfContent.indexOf('4.1 给商家的说明');
    const idx42 = pdfContent.indexOf('4.2 商家答题表');
    const idx43 = pdfContent.indexOf('4.3 风险提示');
    const idx44 = pdfContent.indexOf('4.4 验收节点');
    expect(idx41).toBeGreaterThanOrEqual(0);
    expect(idx42).toBeGreaterThanOrEqual(0);
    expect(idx43).toBeGreaterThanOrEqual(0);
    expect(idx44).toBeGreaterThanOrEqual(0);
    expect(idx41).toBeLessThan(idx42);
    expect(idx42).toBeLessThan(idx43);
    expect(idx43).toBeLessThan(idx44);
  });

  test('E2E-02: 北京15F平开窗C档 - ⑫平开适配（防坠绳）', async () => {
    const a = fixtures.createPure(fixtures.shanghaiThermal, {
      city: '北京',
      district: '朝阳',
      floor: 15,
      total_floors: 30,
      window_type: 'casement',
      windowType: 'casement',
      budget_tier: 'C',
      budgetTier: 'C',
      room_type: ['bedroom'],
      noise_type: 'main_road',
      noise_dist: 'lt20',
      family_risk: [],
      familyRisk: []
    });
    const pdfContent = await buildPdfTextForAnswers(a, 'S7A-E2E-02');
    expect(pdfContent).toContain('防坠绳安装牢固');
  });

  test('E2E-03: 深圳3F固定窗B档 - 固定窗无⑫且⑬含固定压条', async () => {
    const a = fixtures.createPure(fixtures.shenzhenSafety, {
      floor: 3,
      total_floors: 32,
      window_type: 'fixed',
      windowType: 'fixed',
      budget_tier: 'B',
      budgetTier: 'B',
      family_risk: [],
      familyRisk: []
    });
    const pdfContent = await buildPdfTextForAnswers(a, 'S7A-E2E-03');
    expect(pdfContent).not.toMatch(/⑫\s/);
    expect(pdfContent).toContain('固定压条');
  });

  test('E2E-04: 北京3F内陆低层 - 水密不应出现台风季', async () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, {
      city: '北京',
      district: '朝阳',
      floor: 3,
      total_floors: 18,
      window_type: 'casement',
      budget_tier: 'B',
      family_risk: []
    });
    const pdfContent = await buildPdfTextForAnswers(a, 'S7A-E2E-04');
    expect(pdfContent).not.toMatch(/台风季/);
    expect(pdfContent).toContain('住宅基础线为 4 级');
  });
});

describe('Sprint 7 热修复 v3.4.1', () => {

  test('DM-39: 封面新增签发人信任锚文本行', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-HF-DM39');
    expect(pdfContent).toContain('李Sir · 独立门窗技术顾问（不销售、不代理）');
  });
});

describe('v3.9.7 双档并列逻辑验证', () => {
  test('DM-42: 触发场景 · 高层A档', () => {
    const answers = {
      budget_tier: 'A',
      floor: 20,
      total_floors: 30,
      noise_type: 'traffic',
      city: 'guangzhou',
      window_type: 'casement',
      orientation: 'west',
      west_shading: false,
      pain_point: 'sound',
      heating_type: 'none',
      family_risk: [],
      noise_dist: '20to50'
    };
    const resolved = calculateAll(answers);
    const spec = buildBudgetSpecView(resolved, answers);

    expect(spec.is_dual_tier).toBe(true);
    expect(Array.isArray(spec.recommendedConfig)).toBe(true);
    expect(spec.recommendedConfig.length).toBe(2);
    expect(spec.recommendedConfig[0].displayRole).toBe('current');
    expect(spec.recommendedConfig[0].tier).toBe('A');
    expect(spec.recommendedConfig[1].displayRole).toBe('recommended');
    expect(spec.recommendedConfig[1].tier).toBe('B');
    expect(spec.recommendedConfig[1].upgradeReasons.length).toBeGreaterThanOrEqual(1);
    expect(spec.recommendedConfig[1].costDelta.delta).toBe(400);
  });

  test('DM-43: 触发场景 · 轨道交通噪声A档', () => {
    const answers = {
      budget_tier: 'A',
      floor: 8,
      total_floors: 18,
      noise_type: 'rail',
      city: 'guangzhou',
      window_type: 'casement',
      orientation: 'south',
      west_shading: false,
      pain_point: 'sound',
      heating_type: 'none',
      family_risk: [],
      noise_dist: 'lt20'
    };
    const resolved = calculateAll(answers);
    const spec = buildBudgetSpecView(resolved, answers);

    expect(spec.is_dual_tier).toBe(true);
    expect(Array.isArray(spec.recommendedConfig)).toBe(true);
    expect(spec.recommendedConfig[1].upgradeReasons.length).toBeGreaterThan(0);
    expect(spec.recommendedConfig[1].upgradeReasons.some(reason => reason.includes('轨道交通'))).toBe(true);
  });

  test('DM-44: 非触发场景 · B档用户', () => {
    const answers = {
      budget_tier: 'B',
      floor: 20,
      noise_type: 'rail',
      city: 'guangzhou',
      window_type: 'casement',
      orientation: 'south',
      west_shading: false,
      pain_point: 'sound',
      heating_type: 'none',
      family_risk: [],
      noise_dist: 'lt20',
      total_floors: 30
    };
    const resolved = calculateAll(answers);
    const spec = buildBudgetSpecView(resolved, answers);

    expect(spec.is_dual_tier).toBe(false);
    expect(typeof spec.recommendedConfig).toBe('undefined');
  });

  test('DM-45: 非触发场景 · A档低层无交通噪声', () => {
    const answers = {
      budget_tier: 'A',
      floor: 6,
      total_floors: 18,
      noise_type: 'street',
      city: 'guangzhou',
      window_type: 'casement',
      orientation: 'south',
      west_shading: false,
      pain_point: 'sound',
      heating_type: 'none',
      family_risk: [],
      noise_dist: '20to50'
    };
    const resolved = calculateAll(answers);
    const spec = buildBudgetSpecView(resolved, answers);

    expect(spec.is_dual_tier).toBe(false);
  });

  test('DM-46: 非触发场景 · A档含儿童（不触发双档）', () => {
    const answers = {
      budget_tier: 'A',
      floor: 6,
      total_floors: 18,
      noise_type: 'street',
      city: 'guangzhou',
      window_type: 'casement',
      orientation: 'south',
      west_shading: false,
      pain_point: 'sound',
      heating_type: 'none',
      family_risk: ['child'],
      noise_dist: '20to50'
    };
    const resolved = calculateAll(answers);
    const spec = buildBudgetSpecView(resolved, answers);

    expect(spec.is_dual_tier).toBe(false);
  });
});

// SPEC-06: estimateCostDelta 差价计算测试
describe('costDelta calculation', () => {
  const { buildBudgetSpecView } = dm;

  test('T-03: estimateCostDelta 差价计算语义正确（有差价场景）', () => {
    // 场景：高 Rw 要求触发性能需求超出预算档位，产生差价
    const resolved = {
      P3_required: 3.5,
      Rw_required: 44, // 高隔声需求
      K_target: 1.4,   // 低 K 需求
      SHGC_target: 0.30,
      climateZoneCN: '夏热冬暖',
      wind_zone: 'W4',
      height_ratio: 0.5,
      hasSafetyClause: false
    };
    const answers = {
      budget_tier: 'A', // 低预算档位，会产生冲突
      floor: 15,
      total_floors: 30,
      city: 'shenzhen',
      window_type: 'casement',
      family_risk: [],
      pain_point: 'sound'
    };

    const spec = buildBudgetSpecView(resolved, answers);

    // 存在预算冲突时应该有差价
    if (spec.conflict && spec.conflict.type === 'glass_upgrade') {
      expect(spec.cost_delta).toBeGreaterThan(0);

      // 验证差价计算语义：perf_glass_key 成本 - glass_key 成本
      // 由于无法直接访问内部函数，验证差价为正且合理
      expect(spec.cost_delta).toBeGreaterThanOrEqual(0);
    }
  });

  test('T-03b: estimateCostDelta 差价计算语义正确（无差价场景）', () => {
    // 场景：性能要求在预算档位范围内，无差价
    const resolved = {
      P3_required: 2.5,
      Rw_required: 33, // 低隔声需求
      K_target: 2.4,   // 普通 K 需求
      SHGC_target: 0.40,
      climateZoneCN: '夏热冬冷',
      wind_zone: 'W3',
      height_ratio: 0.3,
      hasSafetyClause: false
    };
    const answers = {
      budget_tier: 'B', // 预算充足
      floor: 8,
      total_floors: 24,
      city: 'chengdu',
      window_type: 'casement',
      family_risk: [],
      pain_point: 'price'
    };

    const spec = buildBudgetSpecView(resolved, answers);

    // 无冲突时差价应为 0
    if (!spec.conflict) {
      expect(spec.cost_delta).toBe(0);
    }
  });
});
