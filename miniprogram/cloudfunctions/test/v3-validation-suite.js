// V3 自动化验证套件 - 6组典型边界条件测试
const { resolveGlassConfig } = require('../generateReport/arbitrator.js');
const { BUDGET_SPEC } = require('../generateReport/shared/budgetSpec.js');
const { calculateAll } = require('../generateReport/calculator-v2.js');

const TEST_CASES = [
  {
    id: 'TC01',
    name: 'A档安静场景（基线）',
    input: {
      city: '成都',
      noise_type: 'quiet',
      noise_dist: 'gt50',
      pain_point: 'heat',
      budget_tier: 'A',
      orientation: 'south',
      west_shading: true,
      window_features: { has_large_fixed: false, has_wide_slider: false, has_family_safety: false }
    },
    expect: {
      conflict: null,
      rw_max: 33
    }
  },
  {
    id: 'TC02',
    name: 'A档主干道近距离（关键验证：不触发跨档）',
    input: {
      city: '北京',
      noise_type: 'main_road',
      noise_dist: 'lt20',
      pain_point: 'sound',
      budget_tier: 'A',
      orientation: 'south',
      west_shading: true,
      window_features: { has_large_fixed: false, has_wide_slider: false, has_family_safety: false }
    },
    expect: {
      glass_key: 'laminated_hollow',
      conflict: null
    }
  },
  {
    id: 'TC03',
    name: 'B档高架+sleep（高Rw，档内充裕）',
    input: {
      city: '上海',
      noise_type: 'elevated',
      noise_dist: '20to50',
      pain_point: 'sound',
      budget_tier: 'B',
      orientation: 'south',
      west_shading: true,
      window_features: { has_large_fixed: false, has_wide_slider: false, has_family_safety: false }
    },
    expect: {
      glass_key: 'laminated_hollow',
      conflict: null,
      rw_effective: 41
    }
  },
  {
    id: 'TC04',
    name: 'C档严寒+西晒（热工叠加）',
    input: {
      city: '沈阳',
      noise_type: 'quiet',
      noise_dist: 'gt50',
      pain_point: 'heat',
      budget_tier: 'C',
      orientation: 'west',
      west_shading: false,
      window_features: { has_large_fixed: false, has_wide_slider: false, has_family_safety: false }
    },
    expect: {
      K_target: 1.7
    }
  },
  {
    id: 'TC05',
    name: 'D档大窗+儿童（安全覆盖）',
    input: {
      city: '深圳',
      noise_type: 'main_road',
      noise_dist: '20to50',
      pain_point: 'safety',
      budget_tier: 'D',
      orientation: 'south',
      west_shading: true,
      window_features: { has_large_fixed: true, has_wide_slider: false, has_family_safety: true }
    },
    expect: {
      glass_key: 'laminated_hollow',
      min_wall_thickness: 2.0
    }
  },
  {
    id: 'TC06',
    name: '边界：11层+宽推拉门（密封补偿）',
    input: {
      city: '杭州',
      noise_type: 'rail',
      noise_dist: 'lt20',
      pain_point: 'sound',
      budget_tier: 'B',
      orientation: 'south',
      west_shading: true,
      window_features: { has_large_fixed: false, has_wide_slider: true, has_family_safety: false },
      floor: 11,
      total_floors: 30
    },
    expect: {
      rw_required: 43,
      is_compensated: false
    }
  }
];

function runCase(tc) {
  const floor = Number.isFinite(tc.input.floor) ? tc.input.floor : 1;
  const totalFloors = Number.isFinite(tc.input.total_floors) ? tc.input.total_floors : (Number.isFinite(tc.input.total_floors) ? tc.input.total_floors : (tc.input.total_floors || tc.input.totalFloors || 10));
  const computed = calculateAll({
    city: tc.input.city,
    floor,
    total_floors: totalFloors,
    noise_type: tc.input.noise_type,
    noise_dist: tc.input.noise_dist,
    orientation: tc.input.orientation,
    west_shading: tc.input.west_shading,
    pain_point: tc.input.pain_point,
    heating_type: 'central',
    family_risk: [],
    budget_tier: tc.input.budget_tier
  });

  const result = resolveGlassConfig(
    computed.Rw,
    computed.K,
    computed.SHGC,
    tc.input.window_features,
    tc.input.budget_tier,
    tc.input.pain_point
  );

  const failures = [];
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'glass_key') && result.glass_key !== tc.expect.glass_key) {
    failures.push(`glass_key expected=${tc.expect.glass_key} actual=${result.glass_key}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'conflict') && tc.expect.conflict === null && result.conflict !== null) {
    failures.push('conflict expected=null actual=non-null');
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'rw_effective') && result.rw_effective !== tc.expect.rw_effective) {
    failures.push(`rw_effective expected=${tc.expect.rw_effective} actual=${result.rw_effective}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'thermal_overlay') && result.thermal_overlay !== tc.expect.thermal_overlay) {
    failures.push(`thermal_overlay expected=${tc.expect.thermal_overlay} actual=${result.thermal_overlay}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'K_target') && computed.K !== tc.expect.K_target) {
    failures.push(`K_target expected=${tc.expect.K_target} actual=${computed.K}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'min_wall_thickness')) {
    const v = BUDGET_SPEC[tc.input.budget_tier].profile.min_wall_thickness;
    if (v !== tc.expect.min_wall_thickness) failures.push(`min_wall_thickness expected=${tc.expect.min_wall_thickness} actual=${v}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'rw_required') && computed.Rw !== tc.expect.rw_required) {
    failures.push(`rw_required expected=${tc.expect.rw_required} actual=${computed.Rw}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'is_compensated') && result.is_compensated !== tc.expect.is_compensated) {
    failures.push(`is_compensated expected=${tc.expect.is_compensated} actual=${result.is_compensated}`);
  }
  if (Object.prototype.hasOwnProperty.call(tc.expect, 'rw_max') && result.rw_effective > tc.expect.rw_max) {
    failures.push(`rw_effective expected<=${tc.expect.rw_max} actual=${result.rw_effective}`);
  }

  return { tc, computed, result, passed: failures.length === 0, failures };
}

async function runValidation() {
  const results = TEST_CASES.map(runCase);
  results.forEach((r) => {
    const prefix = r.passed ? '✅' : '❌';
    console.log(`${prefix} ${r.tc.id}: ${r.tc.name}`);
    if (!r.passed) console.log('   ' + r.failures.join('; '));
  });

  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n总结: ${passedCount}/${TEST_CASES.length} 通过`);
  return { allPassed: passedCount === TEST_CASES.length, results };
}

module.exports = { TEST_CASES, runValidation };

if (require.main === module) {
  runValidation().then(r => process.exit(r.allPassed ? 0 : 1));
}
