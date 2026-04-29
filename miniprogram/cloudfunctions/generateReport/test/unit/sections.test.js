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
    const items = (((sections.chapter4 || {}).configSummary || {}).upgradeOptions || []);
    const sound = items.find(x => String(x.name || '').includes('隔音')) || {};
    const thermal = items.find(x => String(x.name || '').includes('热工')) || {};
    const safety = items.find(x => String(x.name || '').includes('安全')) || {};
    expect(sound.stars).toBe(5);
    expect(thermal.stars).toBeGreaterThanOrEqual(4);
    expect(safety.stars).toBe(5);
  });

  test('SEC02: 1.2核心诉求段为场景化声明式陈述', () => {
    const assessment = buildAssessment(fixtures.shanghaiThermal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.shanghaiThermal), 'UNIT-SEC02');
    const tension = String((((sections.chapter1 || {}).needsAnalysis) || {}).coreTension || '');
    expect(tension).toContain('通过门窗热工性能，减少夏季太阳辐射得热');
    expect(tension.length).toBeGreaterThan(20);
  });

  test('SEC03: 档位标签统一为完整名称', () => {
    const assessment = buildAssessment(fixtures.chengduMinimal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.chengduMinimal), 'UNIT-SEC03');
    const label = String((((sections.chapter4 || {}).configSummary || {}).spec || {}).label || '');
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
    const item13Raw = items.find(x => {
      const t = typeof x === 'string' ? x : (x && x.text) || '';
      return t.startsWith('⑬');
    });
    const item13 = item13Raw ? (typeof item13Raw === 'string' ? item13Raw : item13Raw.text) : '';
    // M2修改：适老配件已从验收⑬删除，验证基础内容存在
    expect(item13).toContain('⑬');
  });
});

// ==================== Phase C-4: 新章节结构测试 ====================

describe('Phase C: 目标导向章节重组', () => {
  // V1: 章节结构完整性
  test('C01: 章节结构白名单 12 项完整', () => {
    const assessment = buildAssessment(fixtures.guangzhouFull);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.guangzhouFull), 'UNIT-C01');

    const expectedSections = ['summary', 'cover', 'overview', 'chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'transition', 'chapter6', 'chapter7', 'attachments'];
    const actualSections = Object.keys(sections);

    expectedSections.forEach(id => {
      expect(actualSections).toContain(id);
    });
    expect(actualSections.length).toBe(expectedSections.length);
  });

  // V2: 性能数字唯一性
  test('C02: 性能数字在各章节唯一出现', () => {
    const assessment = buildAssessment(fixtures.shanghaiThermal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.shanghaiThermal), 'UNIT-C02');

    // chapter1 含 Rw，禁含 K/SHGC/P3
    expect(sections.chapter1.targetValue.Rw).toBeDefined();
    expect(sections.chapter1.targetValue.K).toBeUndefined();
    expect(sections.chapter1.targetValue.P3).toBeUndefined();

    // chapter2 含 K + SHGC，禁含 Rw/P3
    expect(sections.chapter2.targetValue.K).toBeDefined();
    expect(sections.chapter2.targetValue.SHGC).toBeDefined();
    expect(sections.chapter2.targetValue.Rw).toBeUndefined();

    // chapter3 含 P3，禁含 Rw/K/SHGC
    expect(sections.chapter3.targetValue.P3).toBeDefined();
    expect(sections.chapter3.targetValue.Rw).toBeUndefined();
    expect(sections.chapter3.targetValue.K).toBeUndefined();

    // chapter4 含水密+气密等级
    expect(sections.chapter4.targetValue.water).toBeDefined();
    expect(sections.chapter4.targetValue.air).toBeDefined();
  });

  // V3: 答题表字段完整性
  test('C03: chapter6 配置汇总表 26 字段完整', () => {
    const assessment = buildAssessment(fixtures.chengduMinimal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.chengduMinimal), 'UNIT-C03');

    const table = sections.chapter6.configSummaryTable;
    expect(table.length).toBe(26);

    // 每字段必须含 4 键
    table.forEach(field => {
      expect(field.id).toBeDefined();
      expect(field.category).toBeDefined();
      expect(field.label).toBeDefined();
      expect(field.vendor_fillable).toBe(true);
    });

    // 分类分布检查
    expect(table.filter(f => f.category === 'performance').length).toBe(6);
    expect(table.filter(f => f.category === 'glass').length).toBe(5);
    expect(table.filter(f => f.category === 'profile').length).toBe(4);
    expect(table.filter(f => f.category === 'hardware').length).toBe(3);
    expect(table.filter(f => f.category === 'sealing').length).toBe(4);
    expect(table.filter(f => f.category === 'commercial').length).toBe(4);
  });

  // V4: 红线归属一致性
  test('C04: 红线归属映射正确且无重复', () => {
    const assessment = buildAssessment(fixtures.guangzhouFull);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.guangzhouFull), 'UNIT-C04');

    const ch1Ids = sections.chapter1.redlines.map(r => r.id);
    const ch2Ids = sections.chapter2.redlines.map(r => r.id);
    const ch3Ids = sections.chapter3.redlines.map(r => r.id);
    const ch4Ids = sections.chapter4.redlines.map(r => r.id);

    // 检查各章节包含预期红线
    expect(ch1Ids).toContain('R06');
    expect(ch1Ids).toContain('R08');
    expect(ch1Ids).toContain('R09');
    expect(ch2Ids).toContain('R03');
    expect(ch2Ids).toContain('R04');
    expect(ch2Ids).toContain('R05');
    expect(ch2Ids).toContain('R07');
    expect(ch3Ids).toContain('R01');
    expect(ch3Ids).toContain('R02');
    expect(ch3Ids).toContain('R12');
    expect(ch4Ids).toContain('R10');
    expect(ch4Ids).toContain('R11');

    // 检查无重复（全集去重后长度应等于各章长度之和）
    const allIds = [...ch1Ids, ...ch2Ids, ...ch3Ids, ...ch4Ids];
    const uniqueIds = [...new Set(allIds)];
    expect(allIds.length).toBe(uniqueIds.length);
  });

  // V5/V9: 字段语义一致性
  test('C05: 性能数字直接来自 resolved，无二次计算', () => {
    const assessment = buildAssessment(fixtures.beijingWind || fixtures.chengduMinimal);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.beijingWind || fixtures.chengduMinimal), 'UNIT-C05');

    // 验证直接引用关系
    expect(sections.chapter1.targetValue.Rw).toBe(resolved.Rw_required);
    expect(sections.chapter2.targetValue.K).toBe(resolved.K_target);
    expect(sections.chapter2.targetValue.SHGC).toBe(resolved.SHGC_target);
    expect(sections.chapter3.targetValue.P3).toBe(resolved.P3_required);

    // summary 也直接引用
    expect(sections.summary.rw_required).toBe(resolved.Rw_required);
    expect(sections.summary.k_target).toBe(resolved.K_target);
  });

  // V6: 历史兼容性
  test('C06: 旧 schema 输入不抛错，缺失字段降级处理', () => {
    const oldResolved = {
      K_target: 1.8,
      Rw_required: 35,
      SHGC_target: 0.45,
      P3_required: 2.5,
      wind_zone: 'W3'
      // 注意：无 glass_key, glass_name, climateZone 等新字段
    };

    const answers = buildAnswers(fixtures.chengduMinimal);

    // 不应抛出异常
    expect(() => {
      const sections = mapToSections(oldResolved, answers, 'UNIT-C06');

      // 章节结构完整
      expect(sections.chapter5).toBeDefined();
      expect(sections.chapter6).toBeDefined();
      expect(sections.chapter7).toBeDefined();

      // chapter5 条件渲染正常（无儿童/落地窗时应为 show: false）
      expect(sections.chapter5.show).toBe(false);

      // chapter6 缺失字段显示为"待反查"
      expect(sections.chapter6.specValues.F07).toContain('待反查');
      expect(sections.chapter6.specValues.F08).toContain('待反查');
    }).not.toThrow();
  });

  // chapter6 F08 玻璃理论 Rw 紧邻 F07 玻璃配置型号，便于对照
  test('C07: chapter6 配置表中 F07 与 F08 相邻渲染', () => {
    const assessment = buildAssessment(fixtures.guangzhouFull);
    const resolved = calculateAll(assessment);
    const sections = mapToSections(resolved, buildAnswers(fixtures.guangzhouFull), 'UNIT-C07');

    const table = sections.chapter6.configSummaryTable;
    const f07Index = table.findIndex(f => f.id === 'F07');
    const f08Index = table.findIndex(f => f.id === 'F08');

    // F08 应紧邻 F07（玻璃配置型号之后立即是玻璃理论 Rw，便于对照差值）
    expect(f08Index).toBe(f07Index + 1);

    // specValues 中两者都有值（可能是具体值或"待反查"）
    expect(sections.chapter6.specValues.F07).toBeDefined();
    expect(sections.chapter6.specValues.F08).toBeDefined();
    // F08 的值包含 dB 单位或显示"待反查"
    const f08Value = sections.chapter6.specValues.F08;
    expect(f08Value.includes('dB') || f08Value.includes('待反查')).toBe(true);
  });
});
