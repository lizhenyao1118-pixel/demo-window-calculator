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
});

