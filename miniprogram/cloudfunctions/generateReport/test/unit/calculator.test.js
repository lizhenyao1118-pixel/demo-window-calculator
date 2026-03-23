const { calcThermal, calcSound, calcWindPressure, calculateAll } = require('../../calculator-v2');
const fixtures = require('../fixtures/testAnswers');

describe('calcThermal', () => {
  test('CT01: 广州/none/无修正 - 基准值正确', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, {
      westShading: true,
      west_shading: true,
      family_risk: [],
      familyRisk: []
    });
    const r = calcThermal('广州', a);
    expect(r.K_target).toBe(2.4);
    expect(r.kRange).toBe('2.2~2.4');
    expect(r.adjustment).toBe(0);
    expect(r.climateZone).toBe('HSWA');
  });

  test('CT02: 广州/none/西向+落地窗 - 取最严-0.2', () => {
    const r = calcThermal('广州', fixtures.guangzhouFull);
    expect(r.K_target).toBe(2.2);
    expect(r.appliedFactor).toBe('bigWindow');
    expect(r.adjustment).toBe(-0.2);
  });

  test('CT03: 深圳/none/落地窗 - 触发kMin下限保护', () => {
    const r = calcThermal('深圳', fixtures.shenzhenSafety);
    expect(r.K_target).toBe(2.0);
    expect(r.K_target).toBeGreaterThanOrEqual(r.kMin);
    expect(r.kMin).toBe(2.0);
  });

  test('CT04: 沈阳/central - 新kBase=1.8', () => {
    const r = calcThermal('沈阳', fixtures.shenyangCold);
    expect(r.K_target).toBe(1.8);
    expect(r.adjustment).toBe(0);
    expect(r.kBase).toBe(1.8);
  });

  test('CT05: 上海/self - heating修正-0.2', () => {
    const r = calcThermal('上海', fixtures.shanghaiThermal);
    expect(r.K_target).toBe(1.8);
    expect(r.adjustment).toBe(-0.2);
    expect(r.appliedFactor).toBe('heating');
  });

  test('CT06: 成都/self/无场景修正 - 2.5-0.2=2.3', () => {
    const r = calcThermal('成都', fixtures.chengduMinimal);
    expect(r.K_target).toBe(2.3);
    expect(r.adjustment).toBe(-0.2);
  });

  test('CT07: 未知城市 - 兜底逻辑', () => {
    const r = calcThermal('洛阳', fixtures.chengduMinimal);
    expect(r.K_target).toBe(2.5);
    expect(r.climateZone).toBe('UNKNOWN');
  });

  test('CT08: none修正=0（非+0.2）- HOTFIX-K关键验证', () => {
    const a = fixtures.createPure(fixtures.guangzhouFull, {
      heatingType: 'none',
      heating_type: 'none',
      westShading: true,
      west_shading: true,
      family_risk: [],
      familyRisk: []
    });
    const r = calcThermal('广州', a);
    const heating = (r.corrections || []).find(x => x.factor === 'heating');
    expect(heating.value).toBe(0);
    expect(r.adjustment).toBe(0);
    expect(r.K_target).toBe(2.4);
  });
});

describe('calcSound', () => {
  test('CS01: 轨道近距+sound - 最严场景', () => {
    const r = calcSound(fixtures.guangzhouFull);
    expect(r.Rw).toBeGreaterThanOrEqual(43);
  });

  test('CS02: 安静环境 - 最宽松场景', () => {
    const r = calcSound(fixtures.shanghaiThermal);
    expect(r.Rw).toBeGreaterThanOrEqual(28);
  });

  test('CS03: 公路中距 - 中等场景', () => {
    const r = calcSound(fixtures.shenyangCold);
    expect(r.Rw).toBeGreaterThanOrEqual(32);
    expect(r.Rw).toBeLessThan(44);
  });
});

describe('calcWindPressure', () => {
  test('CW01: 广州/高区89% - 高区风压', () => {
    const r = calcWindPressure('广州', fixtures.guangzhouFull);
    expect(parseFloat(r.P3)).toBeGreaterThanOrEqual(4.0);
  });

  test('CW02: 成都/低区28% - 低区风压', () => {
    const r = calcWindPressure('成都', fixtures.chengduMinimal);
    expect(parseFloat(r.P3)).toBeLessThanOrEqual(3.0);
  });
});

describe('calculateAll', () => {
  test('CA01: 未覆盖城市 - degraded=true 且楼层>50触发警告', () => {
    const r = calculateAll({
      city: '洛阳',
      floor: 60,
      total_floors: 100,
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      pain_point: 'price',
      heating_type: 'central',
      family_risk: [],
      budget_tier: 'B'
    });
    expect(r.degraded).toBe(true);
    expect(String(r.degraded_msg || '')).toContain('暂未精确覆盖');
    expect(r.wind_zone).toBe('W2');
    expect(r.P3_required).toBeGreaterThan(2.5);
  });

  test('CA02: view+高楼层比+A档 - budget_conflict 触发', () => {
    const r = calculateAll({
      city: '上海',
      floor: 20,
      total_floors: 30,
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      pain_point: 'view',
      heating_type: 'central',
      family_risk: [],
      budget_tier: 'A'
    });
    expect(r.risk_flags && r.risk_flags.budget_conflict).toBe(true);
    expect(Array.isArray(r.conflict_notes)).toBe(true);
  });

  test('CA03: A档+child - safety_budget_conflict 触发', () => {
    const r = calculateAll({
      city: '上海',
      floor: 3,
      total_floors: 30,
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      pain_point: 'price',
      heating_type: 'central',
      family_risk: ['child'],
      budget_tier: 'A'
    });
    expect(r.risk_flags && r.risk_flags.safety_budget_conflict).toBe(true);
    expect(String((r.conflict_notes || []).join(','))).toContain('建议升级至B档');
    expect(Array.isArray(r.safety_items)).toBe(true);
  });

  test('CA04: elder - 安全条款包含适老条目', () => {
    const r = calculateAll({
      city: '上海',
      floor: 3,
      total_floors: 30,
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      pain_point: 'price',
      heating_type: 'central',
      family_risk: ['elder'],
      budget_tier: 'B'
    });
    expect(r.safety_items.join('')).toContain('执手操作力');
    expect(r.safety_items.join('')).toContain('门槛高度');
  });

  test('CA05: 西向无遮阳 - SHGC下调并提供note', () => {
    const r = calculateAll({
      city: '上海',
      floor: 3,
      total_floors: 30,
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'west',
      west_shading: false,
      pain_point: 'heat',
      heating_type: 'central',
      family_risk: [],
      budget_tier: 'B'
    });
    expect(typeof r.SHGC).toBe('number');
    expect(r.shgc_note).toBeTruthy();
  });
});
