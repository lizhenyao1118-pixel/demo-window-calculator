const { calculateAll } = require('../generateReport/calculator-v2');
const { mapToSections } = require('../generateReport/documentMapper');

function buildResolvedFromAssessment(assessment) {
  const computed = calculateAll(assessment);
  return {
    ...computed,
    P3_required: computed.P3,
    Rw_required: computed.Rw,
    K_target: computed.K,
    SHGC_target: computed.SHGC
  };
}

function buildAnswersFromAssessment(assessment) {
  return {
    city: assessment.city,
    district: assessment.district || '',
    floor: assessment.floor,
    total_floors: assessment.total_floors,
    pain_point: assessment.pain_point,
    noise_type: assessment.noise_type,
    noise_dist: assessment.noise_dist,
    orientation: assessment.orientation,
    west_shading: assessment.west_shading,
    heating_type: assessment.heating_type || 'none',
    family_risk: assessment.family_risk || [],
    budget_tier: assessment.budget_tier,
    priority: assessment.priority || assessment.pain_point,
    timeline: assessment.timeline || '1to3m',
    photos: []
  };
}

function assertIncludes(haystack, needle, label) {
  if (typeof haystack !== 'string' || !haystack.includes(needle)) {
    throw new Error(`${label} missing "${needle}"`);
  }
}

function assertNotIncludes(haystack, needle, label) {
  if (typeof haystack === 'string' && haystack.includes(needle)) {
    throw new Error(`${label} should not include "${needle}"`);
  }
}

function runScenario(id, assessment, checks) {
  const resolved = buildResolvedFromAssessment(assessment);
  const answers = buildAnswersFromAssessment(assessment);
  const sections = mapToSections(resolved, answers, `P2-${id}`);
  const json = JSON.stringify(sections);

  checks({ sections, json });

  process.stdout.write(`✅ ${id}\n`);
}

function main() {
  runScenario(
    'A',
    {
      city: '深圳',
      floor: 20,
      total_floors: 28,
      pain_point: 'sound',
      noise_type: 'main_road',
      noise_dist: 'lt20',
      orientation: 'south',
      west_shading: true,
      family_risk: ['elder', 'large_fixed'],
      budget_tier: 'A',
      priority: 'sound',
      timeline: '1to3m'
    },
    ({ sections, json }) => {
      assertIncludes(json, '隔热条宽度须≥24mm', 'A insulation bar');

      const safety = (sections.chapter3.upgradeOptions.items || []).find(x => x.name === '安全升级+');
      assertIncludes(safety.desc, '适老', 'A safety upgrade');

      const node13 = (sections.chapter4.acceptance.nodes[2].items || []).find(x => typeof x === 'string' && x.startsWith('⑬'));
      assertIncludes(node13, '适老', 'A acceptance ⑬');
      assertIncludes(node13, '大面积安全玻璃', 'A acceptance ⑬');
    }
  );

  runScenario(
    'B',
    {
      city: '沈阳',
      floor: 6,
      total_floors: 18,
      pain_point: 'sound',
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      family_risk: [],
      budget_tier: 'A',
      priority: 'sound',
      timeline: '1to3m'
    },
    ({ json }) => {
      assertIncludes(json, '隔热条宽度须≥40mm', 'B insulation bar');
      assertNotIncludes(json, '儿童', 'B child content');
    }
  );

  runScenario(
    'C',
    {
      city: '北京',
      floor: 10,
      total_floors: 18,
      pain_point: 'sound',
      noise_type: 'elevated',
      noise_dist: '20to50',
      orientation: 'south',
      west_shading: true,
      family_risk: ['child'],
      budget_tier: 'B',
      priority: 'sound',
      timeline: '1to3m'
    },
    ({ sections, json }) => {
      assertIncludes(json, '隔热条宽度须≥32mm', 'C insulation bar');
      const safety = (sections.chapter3.upgradeOptions.items || []).find(x => x.name === '安全升级+');
      assertIncludes(safety.desc, '儿童', 'C safety upgrade');
    }
  );

  runScenario(
    'D',
    {
      city: '广州',
      floor: 9,
      total_floors: 30,
      pain_point: 'sound',
      noise_type: 'main_road',
      noise_dist: 'lt20',
      orientation: 'south',
      west_shading: true,
      family_risk: ['wide_slider'],
      budget_tier: 'A',
      priority: 'sound',
      timeline: '1to3m'
    },
    ({ sections, json }) => {
      assertIncludes(json, '整窗隔声测试报告', 'D full-window test redline');
      if (sections.chapter3.recommendedConfig.spec.is_compensated !== false) {
        throw new Error('D should not compensate Rw for wide slider');
      }
      assertIncludes(sections.chapter3.recommendedConfig.spec.glass, '夹胶', 'D glass should be laminated');
    }
  );

  runScenario(
    'E',
    {
      city: '成都',
      floor: 8,
      total_floors: 22,
      pain_point: 'sound',
      noise_type: 'rail',
      noise_dist: '20to50',
      orientation: 'south',
      west_shading: true,
      family_risk: [],
      budget_tier: 'C',
      priority: 'sound',
      timeline: '1to3m'
    },
    ({ sections, json }) => {
      const tierC = (sections.chapter3.budgetComparison.tiers || []).find(x => x.key === 'C');
      if (!tierC || tierC.priceRange !== '1400–2000 元/㎡') {
        throw new Error(`E tier C priceRange mismatch: ${tierC ? tierC.priceRange : 'missing'}`);
      }
      assertNotIncludes(json, '1200-1800', 'E old price range');
      assertNotIncludes(json, '1200–1800', 'E old price range');
    }
  );
}

main();

