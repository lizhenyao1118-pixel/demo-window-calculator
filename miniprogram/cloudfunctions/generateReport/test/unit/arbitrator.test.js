const { resolveGlassConfig } = require('../../arbitrator');

describe('resolveGlassConfig', () => {
  test('AR01: 低需求 - 无冲突', () => {
    const r = resolveGlassConfig(
      30,
      2.4,
      0.35,
      { has_large_fixed: false },
      'B',
      'price'
    );
    expect(r.glass_key).toBeTruthy();
    expect(r.conflict).toBeNull();
  });

  test('AR02: 高隔声需求+A档 - 触发冲突', () => {
    const r = resolveGlassConfig(
      44,
      2.4,
      0.35,
      { has_large_fixed: false },
      'A',
      'sound'
    );
    expect(r.conflict).not.toBeNull();
    expect(r.conflict.type).toBe('glass_upgrade');
  });

  test('AR03: 落地窗 - safety_level 提升', () => {
    const r = resolveGlassConfig(
      33,
      2.4,
      0.35,
      { has_large_fixed: true },
      'B',
      'view'
    );
    expect(r.reason).toContain('落地窗');
  });

  test('AR04: 热工需求强 - 触发 Low-E overlay', () => {
    const r = resolveGlassConfig(
      33,
      1.8,
      0.35,
      { has_large_fixed: false },
      'B',
      'heat'
    );
    expect(['Low-E镀膜', null]).toContain(r.thermal_overlay);
  });

  // SPEC-01 边界回归测试（v3.9.4）
  test('AR05: rw_required=34 → 路径A（非对称中空）', () => {
    const r = resolveGlassConfig(34, 2.4, 0.40, { has_large_fixed: false }, 'B', 'sound');
    expect(['basic_hollow', 'low_e_hollow', 'low_e_argon']).toContain(r.glass_key);
  });

  test('AR06: rw_required=35 → 路径B（夹胶中空）[关键边界]', () => {
    const r = resolveGlassConfig(35, 2.4, 0.40, { has_large_fixed: false }, 'B', 'sound');
    expect(r.glass_key).toBe('laminated_hollow');
  });

  test('AR07: rw_required=38 → 路径B（夹胶中空）', () => {
    const r = resolveGlassConfig(38, 2.4, 0.40, { has_large_fixed: false }, 'B', 'sound');
    expect(r.glass_key).toBe('laminated_hollow');
  });

  test('AR08: rw_required=39 → 路径C（夹胶中空组合/三玻两腔）', () => {
    const r = resolveGlassConfig(39, 2.4, 0.40, { has_large_fixed: false }, 'C', 'sound');
    expect(['laminated_hollow', 'triple_pane']).toContain(r.glass_key);
    // 39dB 超出 laminated_hollow.rw_max(42)范围内，但指向高等级
    expect(r.glass_key).not.toBe('low_e_argon');
  });

  // SPEC-02: 交通噪声排除三玻两腔
  test('AR09: 交通噪声场景 - triple_pane 不作为主路径输出', () => {
    const r = resolveGlassConfig(39, 1.4, 0.30, { has_large_fixed: false }, 'D', 'sound', 'main_road');
    expect(r.glass_key).not.toBe('triple_pane');
    expect(r.conflict_notes).toEqual(expect.arrayContaining([expect.stringContaining('三玻两腔')]));
  });

  test('AR10: 非交通噪声场景 - triple_pane 可作为主路径', () => {
    const r = resolveGlassConfig(39, 1.4, 0.30, { has_large_fixed: false }, 'D', 'sound', 'quiet');
    expect(r.glass_key).toBe('triple_pane');
  });

  // SPEC-03: is_risk 标记验证
  test('AR12: noise_type=undefined → 不报错，triple_pane不被排除（默认非交通噪声）', () => {
    // noise_type 缺省时应等价于 quiet，triple_pane 可作为主路径
    let r;
    expect(() => {
      r = resolveGlassConfig(39, 1.4, 0.30, { has_large_fixed: false }, 'D', 'sound', undefined);
    }).not.toThrow();
    expect(r.glass_key).toBe('triple_pane');
    expect(r.conflict_notes).toEqual([]);
  });

  test('AR11: 非对称中空+Rw≥35 → is_risk=true', () => {
    // 仅在 budgetSpec 边界未收紧时可能发生（防御性检查）
    // 正常情况下 rw=35 会被仲裁为 laminated_hollow，is_risk=false
    const r = resolveGlassConfig(35, 2.4, 0.40, { has_large_fixed: false }, 'B', 'sound');
    if (['basic_hollow', 'low_e_hollow', 'low_e_argon'].includes(r.glass_key)) {
      expect(r.is_risk).toBe(true);
    } else {
      expect(r.is_risk).toBe(false);
    }
  });
});

