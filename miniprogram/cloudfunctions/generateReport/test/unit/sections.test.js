const { calculateAll } = require('../../calculator-v2');
const { mapToSections } = require('../../documentMapper');
const fixtures = require('../fixtures/testAnswers');

function buildAssessment(fx) {
  return {
    city: fx.city,
    floor: fx.floor,
    total_floors: fx.total_floors,
    noise_type: fx.noise_type,
    noise_dist: fx.noise_dist,
    orientation: fx.orientation,
    west_shading: fx.west_shading,
    pain_point: fx.pain_point,
    heating_type: fx.heating_type,
    family_risk: fx.family_risk,
    budget_tier: fx.budget_tier
  };
}

function buildAnswers(fx) {
  return {
    city: fx.city,
    district: fx.district || '',
    floor: fx.floor,
    total_floors: fx.total_floors,
    room_type: fx.room_type,
    pain_point: fx.pain_point,
    pain_points: fx.pain_points,
    noise_type: fx.noise_type,
    noise_dist: fx.noise_dist,
    orientation: fx.orientation,
    west_shading: fx.west_shading,
    heating_type: fx.heating_type,
    window_type: fx.window_type,
    family_risk: fx.family_risk,
    budget_tier: fx.budget_tier,
    photos: []
  };
}

describe('mapToSections', () => {
  test('SEC01: 3.4升级项星级动态化（广州全场景）', () => {
    const assessment = buildAssessment(fixtures.guangzhouFull);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.guangzhouFull), 'UNIT-SEC01');
    const items = (((sections.chapter3 || {}).upgradeOptions || {}).items) || [];
    const sound = items.find(x => String(x.name || '').includes('隔音')) || {};
    const thermal = items.find(x => String(x.name || '').includes('热工')) || {};
    const safety = items.find(x => String(x.name || '').includes('安全')) || {};
    expect(sound.stars).toBe(5);
    expect(thermal.stars).toBeGreaterThanOrEqual(4);
    expect(safety.stars).toBe(5);
  });

  test('SEC02: 1.2第三句为行动导向术语（含基于以上分析）', () => {
    const assessment = buildAssessment(fixtures.shanghaiThermal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.shanghaiThermal), 'UNIT-SEC02');
    const tension = String((((sections.chapter1 || {}).needsAnalysis) || {}).coreTension || '');
    expect(tension).toContain('基于以上分析');
    expect(tension).toContain('最低可接受值');
  });

  test('SEC03: 档位标签统一为完整名称', () => {
    const assessment = buildAssessment(fixtures.chengduMinimal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.chengduMinimal), 'UNIT-SEC03');
    const label = String((((sections.chapter3 || {}).recommendedConfig || {}).spec || {}).label || '');
    expect(label).toContain('A档');
    expect(label).toContain('经济实用');
  });

  test('SEC04: 风险模式 - 第四章风险提示有内容', () => {
    const fx = fixtures.createPure(fixtures.guangzhouFull, { floor: 20, total_floors: 25, budget_tier: 'A' });
    const assessment = buildAssessment(fx);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fx), 'UNIT-SEC04');
    const risks = (((sections.chapter4 || {}).risks || {}).items) || [];
    expect(Array.isArray(risks)).toBe(true);
    expect(risks.length).toBeGreaterThan(0);
  });

  test('SEC05: wind 场景 - 叙述包含 P3 门槛', () => {
    const fx = fixtures.createPure(fixtures.chengduMinimal, { pain_point: 'wind', pain_points: ['wind'], noise_type: 'quiet', noise_dist: 'gt50' });
    const assessment = buildAssessment(fx);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fx), 'UNIT-SEC05');
    const para = String(((sections.chapter1 || {}).analysisPara) || '');
    expect(para).toContain('P3≥');
  });

  test('SEC06: safety 场景 - 叙述包含安全专项条款', () => {
    const fx = fixtures.createPure(fixtures.shenzhenSafety, { pain_point: 'safety', pain_points: ['security'], family_risk: ['child'] });
    const assessment = buildAssessment(fx);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fx), 'UNIT-SEC06');
    const para = String(((sections.chapter1 || {}).analysisPara) || '');
    expect(para).toContain('安全专项条款');
  });

  test('SEC07: elder 场景 - 验收⑬替换为适老条目', () => {
    const fx = fixtures.createPure(fixtures.chengduMinimal, { family_risk: ['elder'], pain_point: 'safety', pain_points: ['security'], window_type: 'casement' });
    const assessment = buildAssessment(fx);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fx), 'UNIT-SEC07');
    const nodes = (((sections.chapter4 || {}).acceptance || {}).nodes) || [];
    const final = nodes[2] || {};
    const items = Array.isArray(final.items) ? final.items : [];
    const item13 = items.find(x => typeof x === 'string' && x.startsWith('⑬')) || '';
    expect(item13).toContain('适老配件');
  });
});
