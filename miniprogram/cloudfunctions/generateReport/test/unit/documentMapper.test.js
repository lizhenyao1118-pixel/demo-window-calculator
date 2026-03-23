const dm = require('../../documentMapper');
const fixtures = require('../fixtures/testAnswers');

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
    expect(r06.text).toContain('若水密仅达5级');
    expect(r06.text).toContain('若气密仅达4级');
  });

  test('DM-22: 成都3F固定窗 - 气密5级水密5级（固定窗+1）', () => {
    const answers = { city: 'chengdu', floor: 3, window_type: 'fixed', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥5级');
    expect(r06.text).toContain('水密≥5级');
  });

  test('DM-23: 北京20F开启窗 - 气密6级水密4级（高层内陆）', () => {
    const answers = { city: 'beijing', floor: 20, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('水密≥4级');
  });

  test('DM-24: 沈阳3F开启窗 - 气密6级（严寒推高）含降级条款', () => {
    const answers = { city: 'shenyang', floor: 3, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('若气密仅达4级');
  });

  test('DM-25: 上海10F开启窗 - 气密6级水密6级（近海+高层）', () => {
    const answers = { city: 'shanghai', floor: 10, window_type: 'casement', family_risk: [] };
    const checklist = buildRedlineChecklist(answers, { safetyForced: false });
    const r06 = (checklist.mandatory || []).find(r => r.id === 'R06');
    expect(r06.text).toContain('气密≥6级');
    expect(r06.text).toContain('水密≥6级');
  });
});
