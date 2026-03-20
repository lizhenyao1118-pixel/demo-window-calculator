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
    window_type: assessment.window_type || '',
    family_risk: assessment.family_risk || [],
    budget_tier: assessment.budget_tier,
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
    '1',
    {
      city: '上海',
      floor: 10,
      total_floors: 30,
      pain_point: 'sound',
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections, json }) => {
      assertNotIncludes(json, '【强制】推拉窗/门联窗需提供整窗性能测试报告（GB/T 7106）', '1 should not require whole-window test');
      const K = Number(sections.chapter2.metrics.find(x => x.name === '热工性能').value.match(/K≤([0-9.]+)/)?.[1] || NaN);
      if (K !== 2.4) throw new Error(`1 K_target mismatch: ${K}`);
    }
  );

  runScenario(
    '2',
    {
      city: '上海',
      floor: 10,
      total_floors: 30,
      pain_point: 'sound',
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'self',
      window_type: 'sliding',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ json }) => {
      assertIncludes(json, '【强制】推拉窗/门联窗需提供整窗性能测试报告（GB/T 7106）', '2 whole-window test redline');
      const m = json.match(/K≤([0-9.]+)\s*\/\s*SHGC≤/);
      const K = m ? Number(m[1]) : NaN;
      if (K !== 2.2) throw new Error(`2 K_target mismatch: ${K}`);
    }
  );

  runScenario(
    '3',
    {
      city: '上海',
      floor: 10,
      total_floors: 30,
      pain_point: 'sound',
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'none',
      window_type: 'door_window',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ json }) => {
      assertIncludes(json, '【强制】推拉窗/门联窗需提供整窗性能测试报告（GB/T 7106）', '3 whole-window test redline');
      const m = json.match(/K≤([0-9.]+)\s*\/\s*SHGC≤/);
      const K = m ? Number(m[1]) : NaN;
      if (K !== 2.6) throw new Error(`3 K_target mismatch: ${K}`);
    }
  );
}

main();

