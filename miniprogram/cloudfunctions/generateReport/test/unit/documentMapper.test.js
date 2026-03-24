const dm = require('../../documentMapper');
const fixtures = require('../fixtures/testAnswers');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { buildPDF } = require('../../pdfBuilder-v2');
const { calculateAll } = require('../../calculator-v2');

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
  assertResolved
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
    expect(String(kRow.value || '')).toContain('推荐范围');
  });
});

describe('buildRedlineChecklist', () => {
  test('DM09: 普通场景 - mandatory=5,recommended=1', () => {
    const a = fixtures.createPure(fixtures.chengduMinimal, { window_type: 'casement', family_risk: [], budget_tier: 'C', floor: 3, total_floors: 30 });
    const r = buildRedlineChecklist(a, { safetyForced: false });
    expect(r.mandatory.length).toBe(6);
    expect(r.recommended.length).toBe(1);
  });

  test('DM10: 最大覆盖 - mandatory=8,recommended=3', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { window_type: 'sliding', budget_tier: 'A', floor: 20, total_floors: 30, family_risk: ['elderly'] });
    const r = buildRedlineChecklist(a, { safetyForced: true });
    expect(r.mandatory.length).toBe(8);
    expect(r.recommended.length).toBe(3);
  });

  test('DM11: 推拉窗触发R06', () => {
    const r = buildRedlineChecklist(fixtures.guangzhouFull, { safetyForced: false });
    const r06 = r.mandatory.find(i => i.id === 'R06');
    expect(r06).toBeDefined();
  });

  test('DM12: 老人触发R08', () => {
    const r = buildRedlineChecklist(fixtures.shenzhenSafety, { safetyForced: false });
    const r08 = r.mandatory.find(i => i.id === 'R08');
    expect(r08).toBeDefined();
  });
});

describe('buildPerformanceChecks', () => {
  test('DM13: sound+thermal - checks.length===3', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['sound', 'thermal'], pain_point: 'sound' });
    const r = buildPerformanceChecks(a);
    expect(r.length).toBe(3);
    expect(r.some(i => String(i.id).includes('sound'))).toBe(true);
    expect(r.some(i => String(i.id).includes('thermal'))).toBe(true);
  });

  test('DM14: 仅sound - checks.length===2', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['sound'], pain_point: 'sound' });
    const r = buildPerformanceChecks(a);
    expect(r.length).toBe(2);
    expect(r.some(i => String(i.id).includes('thermal'))).toBe(false);
  });

  test('DM15: 无sound/thermal - checks.length===1(默认)', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, { pain_points: ['security'], pain_point: 'safety' });
    const r = buildPerformanceChecks(a);
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('perf_general');
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
});

describe('B-14 C短期 红线文案动态化', () => {
  test('DM-21: 深圳15F开启窗 - 气密6级水密6级（沿海+台风+高层）', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('水密≥6级');
    expect(r06.text).toContain('若方案仅能达到水密 5 级或气密 4~5 级');
    expect(r06.text).toContain('该类方案不建议作为首选');
  });

  test('DM-22: 成都3F固定窗 - 气密5级水密5级（固定窗+1）', () => {
    const answers = { city: 'chengdu', floor: 3, window_type: 'fixed', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥5级');
    expect(r06.text).toContain('水密≥5级');
    expect(r06.text).toContain('若方案仅能达到水密 5 级或气密 4~5 级');
  });

  test('DM-23: 北京20F开启窗 - 气密6级水密4级（高层内陆）', () => {
    const answers = { city: 'beijing', floor: 20, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('水密≥4级');
    expect(r06.text).toContain('若方案仅能达到水密 5 级或气密 4~5 级');
  });

  test('DM-24: 沈阳3F开启窗 - 气密6级（严寒推高）含降级条款', () => {
    const answers = { city: 'shenyang', floor: 3, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('若方案仅能达到水密 5 级或气密 4~5 级');
  });

  test('DM-25: 上海10F开启窗 - 气密6级水密6级（近海+高层）', () => {
    const answers = { city: 'shanghai', floor: 10, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('水密≥6级');
    expect(r06.text).toContain('若方案仅能达到水密 5 级或气密 4~5 级');
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
    expect(String(airRow.value || '')).toContain('推荐目标值：≥4级');
    expect(String(airRow.value || '')).not.toContain('最低可接受值');
  });

  test('DM-28: R06新增结构化_sealGrades字段', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06') || {};
    expect(r06._sealGrades).toBeTruthy();
    expect(r06._sealGrades.airRec).toBe(6);
    expect(r06._sealGrades.waterRec).toBe(6);
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
  });

  test('DM-30: 参数表气密水密格式应为推荐/最低分层', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM30');
    expect(pdfContent).toContain('推荐目标值：≥6级（最低可接受值：4级，需业主书面确认）');
    expect(pdfContent).toContain('推荐目标值：≥6级（最低可接受值：5级，需业主书面确认）');
  });

  test('DM-31: 1.2节叙述段应包含弹性文案', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM31');
    expect(pdfContent).toContain('商家方案如仅能满足最低可接受值，应在报价中说明原因');
    expect(pdfContent).toContain('低于最低值的方案，建议不予优先考虑');
  });

  test('DM-32: 玻璃差价为0时应显示绕行文案', async () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, {
      noise_type: 'quiet',
      noise_dist: 'gt50',
      pain_point: 'price',
      pain_points: ['economy'],
      window_type: 'casement'
    });
    const pdfContent = await buildPdfTextForAnswers(a, 'S7-DM32');
    expect(pdfContent).toContain('视实际玻璃配置而定（请商家在报价中单独列出玻璃部分的加价幅度）');
    expect(pdfContent).not.toContain('预计玻璃成本增加：0元');
  });

  test('DM-33: R06降级条款应覆盖气密4~5级区间', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM33');
    expect(pdfContent).toContain('若方案仅能达到水密 5 级或气密 4~5 级');
    expect(pdfContent).toContain('该类方案不建议作为首选');
  });

  test('DM-34: 红线强制区标题应软化，R01/R04/R05应建议优先', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM34');
    expect(pdfContent).toContain('方案原则上不建议采用');
    expect(pdfContent).toContain('建议优先采用原生铝型材');
    expect(pdfContent).toContain('如采用其他材质，应说明理由');
    expect(pdfContent).toContain('隔热条宽度建议不低于');
    expect(pdfContent).toContain('壁厚建议不低于 1.5mm');
    expect(pdfContent).toContain('禁止单玻或无Low-E膜');
    expect(pdfContent).toContain('禁止普通密封胶代替结构胶');
    expect(pdfContent).toContain('夹胶构造强制');
  });

  test('DM-35: 商家答题表引导语应软化', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM35');
    expect(pdfContent).toContain('请尽量完整填写；未填写项将影响方案的可比性和业主的优先选择。');
    expect(pdfContent).not.toContain('写不出来就空着');
  });

  test('DM-36: 商家签名行应包含合同建议', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM36');
    expect(pdfContent).toContain('下列签名表示填写人已确认上述内容的真实性');
    expect(pdfContent).toContain('建议将关键指标写入合同');
    expect(pdfContent).not.toContain('商家签名（无需公章）');
  });

  test('DM-37: 验收⑭应包含免责声明', async () => {
    const pdfContent = await buildPdfTextForAnswers(fixtures.guangzhouFull, 'S7-DM37');
    expect(pdfContent).toContain('仅作为居住体验参考，不等同于实验室检测');
    expect(pdfContent).toContain('如感知差异不明显，可要求商家说明原因或提出改进方案');
  });
});
