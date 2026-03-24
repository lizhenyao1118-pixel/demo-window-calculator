const { calculateAll } = require('../generateReport/calculator-v2');
const { mapToSections } = require('../generateReport/documentMapper');

function buildResolvedFromAssessment(assessment) {
  const computed = calculateAll(assessment);
  return {
    ...computed,
    P3_required: computed.P3,
    Rw_required: computed.Rw,
    K_target: computed.K_target ?? computed.K,
    SHGC_target: computed.SHGC_target ?? computed.SHGC
  };
}

function buildAnswersFromAssessment(assessment) {
  return {
    city: assessment.city,
    district: assessment.district || '',
    floor: assessment.floor,
    total_floors: assessment.total_floors,
    pain_point: assessment.pain_point,
    pain_points: Array.isArray(assessment.pain_points) ? assessment.pain_points : [],
    noise_type: assessment.noise_type,
    noise_dist: assessment.noise_dist,
    orientation: assessment.orientation,
    west_shading: assessment.west_shading,
    heating_type: assessment.heating_type || 'none',
    window_type: assessment.window_type || '',
    room_type: Array.isArray(assessment.room_type) ? assessment.room_type : [],
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
      assertNotIncludes(json, '【强制】推拉窗/门联窗需提供整窗性能测试报告（GB/T 7106 抗风压 + GB/T 7107 气密·水密）', '1 should not require whole-window test');
      const K = Number(sections.chapter2.metrics.find(x => x.name === '热工性能').value.match(/K≤([0-9.]+)/)?.[1] || NaN);
      if (K !== 2.0) throw new Error(`1 K_target mismatch: ${K}`);
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
      assertIncludes(json, '【强制】推拉窗/门联窗需提供整窗性能测试报告（GB/T 7106 抗风压 + GB/T 7107 气密·水密）', '2 whole-window test redline');
      const m = json.match(/K≤([0-9.]+)/);
      const K = m ? Number(m[1]) : NaN;
      if (K !== 1.8) throw new Error(`2 K_target mismatch: ${K}`);
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
      assertIncludes(json, '【强制】推拉窗/门联窗需提供整窗性能测试报告（GB/T 7106 抗风压 + GB/T 7107 气密·水密）', '3 whole-window test redline');
      const m = json.match(/K≤([0-9.]+)/);
      const K = m ? Number(m[1]) : NaN;
      if (K !== 2.0) throw new Error(`3 K_target mismatch: ${K}`);
    }
  );

  runScenario(
    'S-C1',
    {
      city: '北京',
      district: '海淀',
      floor: 20,
      total_floors: 28,
      room_type: ['bedroom', 'living_room'],
      pain_point: 'sound',
      pain_points: ['sound'],
      noise_type: 'main_road',
      noise_dist: '20to50',
      orientation: 'northeast',
      west_shading: false,
      heating_type: 'self',
      window_type: 'casement',
      family_risk: ['elder', 'large_fixed'],
      budget_tier: 'A'
    },
    ({ sections }) => {
      if ((sections.chapter1.basicInfo || {}).roomType !== '主卧、客厅') throw new Error('S-C1 roomType mismatch');
      if ((sections.chapter1.basicInfo || {}).heatingType !== '自采暖') throw new Error('S-C1 heatingType mismatch');
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      if (rows.length !== 7) throw new Error('S-C1 needsTable rows mismatch');
      if (!String(rows[0].basis || '').includes('GB/T 7106')) throw new Error('S-C1 wind std missing');
      if (!String(rows[4].value || '').includes('夹胶构造')) throw new Error('S-C1 safety value mismatch');
      if (!/隔声降噪是本案的主要技术制约/.test(String(((sections.chapter1 || {}).needsAnalysis || {}).coreTension || ''))) throw new Error('S-C1 coreTension subject mismatch');
    }
  );

  runScenario(
    'S-C2',
    {
      city: '成都',
      floor: 2,
      total_floors: 6,
      room_type: ['living_room'],
      pain_point: 'heat',
      pain_points: ['thermal'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: false,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const tension = String(((sections.chapter1 || {}).needsAnalysis || {}).coreTension || '');
      if (!/保温节能是本案的主要技术制约/.test(tension)) throw new Error('S-C2 subject mismatch');
      const tensionLines = tension.split('。').filter(s => s.trim());
      if (tensionLines.length !== 3) throw new Error('S-C2 should be 3 sentences');
    }
  );

  runScenario(
    'S-C3',
    {
      city: '上海',
      floor: 8,
      total_floors: 15,
      room_type: ['balcony', 'study'],
      pain_point: 'view',
      pain_points: ['view'],
      noise_type: 'main_road',
      noise_dist: 'gt50_shielded',
      orientation: 'west',
      west_shading: true,
      heating_type: 'none',
      window_type: 'sliding',
      family_risk: ['wide_slider'],
      budget_tier: 'C'
    },
    ({ sections }) => {
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      const safetyRow = rows[4] || {};
      if (!String(safetyRow.value || '').includes('整窗测试报告')) throw new Error('S-C3 needs whole-window test');
      if (!String(safetyRow.basis || '').includes('推拉窗')) throw new Error('S-C3 safety basis mismatch');
    }
  );

  runScenario(
    'S-C4',
    {
      city: '深圳',
      floor: 10,
      total_floors: 30,
      pain_point: 'sound',
      pain_points: ['sound'],
      noise_type: 'elevated',
      noise_dist: 'lt20',
      orientation: 'southeast',
      west_shading: false,
      heating_type: 'self',
      window_type: 'door_window',
      family_risk: ['child'],
      budget_tier: 'B'
    },
    ({ sections }) => {
      if ((sections.chapter1.basicInfo || {}).roomType !== null) throw new Error('S-C4 roomType should be null');
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      if (rows.length !== 7) throw new Error('S-C4 needsTable rows mismatch');
    }
  );

  runScenario(
    'S-C5',
    {
      city: '沈阳',
      floor: 5,
      total_floors: 18,
      room_type: ['bedroom'],
      pain_point: 'heat',
      pain_points: ['thermal'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'west',
      west_shading: false,
      heating_type: 'central',
      window_type: 'tilt_turn',
      family_risk: ['elder'],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const tension = String(((sections.chapter1 || {}).needsAnalysis || {}).coreTension || '');
      if (!/保温节能是本案的主要技术制约/.test(tension)) throw new Error('S-C5 subject mismatch');
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      const shgcRow = rows[3] || {};
      if (!String(shgcRow.basis || '').includes('GB/T 2680')) throw new Error('S-C5 shgc std missing');
      if (!String(shgcRow.basis || '').includes('西向无遮阳控制过热')) throw new Error('S-C5 shgc basis missing');
    }
  );

  runScenario(
    'T-K1',
    {
      city: '广州',
      floor: 8,
      total_floors: 18,
      pain_point: 'heat',
      pain_points: ['thermal'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'none',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      const kRow = rows[2] || {};
      if (!String(kRow.value || '').includes('K≤2.4')) throw new Error('T-K1 K_target mismatch');
      if (!String(kRow.value || '').includes('推荐范围2.2~2.4')) throw new Error('T-K1 kRange mismatch');
    }
  );

  runScenario(
    'T-K2',
    {
      city: '广州',
      floor: 8,
      total_floors: 18,
      pain_point: 'heat',
      pain_points: ['thermal'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'west',
      west_shading: false,
      heating_type: 'none',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      const kRow = rows[2] || {};
      if (!String(kRow.value || '').includes('K≤2.3')) throw new Error('T-K2 K_target mismatch');
      if (!String(kRow.value || '').includes('推荐范围2.2~2.4')) throw new Error('T-K2 kRange mismatch');
      if (!String(kRow.basis || '').includes('西向隔热加严')) throw new Error('T-K2 basis mismatch');
    }
  );

  runScenario(
    'T-K3',
    {
      city: '深圳',
      floor: 8,
      total_floors: 18,
      pain_point: 'heat',
      pain_points: ['thermal'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'none',
      window_type: 'casement',
      family_risk: ['large_fixed'],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      const kRow = rows[2] || {};
      if (!String(kRow.value || '').includes('K≤2.0')) throw new Error('T-K3 K_target mismatch');
      if (!String(kRow.value || '').includes('推荐范围2.0~2.2')) throw new Error('T-K3 kRange mismatch');
      if (!String(kRow.basis || '').includes('落地窗隔热加严')) throw new Error('T-K3 basis mismatch');
    }
  );

  runScenario(
    'T-K6',
    {
      city: '沈阳',
      floor: 8,
      total_floors: 18,
      pain_point: 'heat',
      pain_points: ['thermal'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const rows = (((sections.chapter1 || {}).needsAnalysis || {}).needsTable) || [];
      const kRow = rows[2] || {};
      if (!String(kRow.value || '').includes('K≤1.8')) throw new Error('T-K6 K_target mismatch');
      if (!String(kRow.value || '').includes('推荐范围1.5~1.8')) throw new Error('T-K6 kRange mismatch');
    }
  );

  runScenario(
    'T-P1',
    {
      city: '上海',
      floor: 8,
      total_floors: 18,
      pain_point: 'sound',
      pain_points: ['sound', 'thermal'],
      noise_type: 'main_road',
      noise_dist: '20to50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const checks = (((sections.chapter4 || {}).performanceChecks) || []);
      if (!Array.isArray(checks) || checks.length !== 3) throw new Error('T-P1 performanceChecks count mismatch');
      const ids = checks.map(x => x.id).join(',');
      if (!ids.includes('perf_sound_compare') || !ids.includes('perf_sound_report') || !ids.includes('perf_thermal_ir')) throw new Error('T-P1 performanceChecks ids mismatch');
    }
  );

  runScenario(
    'T-P2',
    {
      city: '上海',
      floor: 8,
      total_floors: 18,
      pain_point: 'sound',
      pain_points: ['sound'],
      noise_type: 'main_road',
      noise_dist: '20to50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const checks = (((sections.chapter4 || {}).performanceChecks) || []);
      if (!Array.isArray(checks) || checks.length !== 2) throw new Error('T-P2 performanceChecks count mismatch');
    }
  );

  runScenario(
    'T-P3',
    {
      city: '上海',
      floor: 8,
      total_floors: 18,
      pain_point: 'safety',
      pain_points: ['security'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const checks = (((sections.chapter4 || {}).performanceChecks) || []);
      if (!Array.isArray(checks) || checks.length !== 1) throw new Error('T-P3 performanceChecks count mismatch');
      if (String(checks[0].num || '') !== '⑭') throw new Error('T-P3 performanceChecks num mismatch');
    }
  );

  runScenario(
    'T-RL1',
    {
      city: '上海',
      floor: 5,
      total_floors: 30,
      pain_point: 'sound',
      pain_points: ['sound'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: [],
      budget_tier: 'C'
    },
    ({ sections }) => {
      const checklist = ((sections.chapter4 || {}).redlineChecklist) || {};
      const m = Array.isArray(checklist.mandatory) ? checklist.mandatory : [];
      const r = Array.isArray(checklist.recommended) ? checklist.recommended : [];
      if (m.length !== 6) throw new Error('T-RL1 mandatory count mismatch');
      if (r.length !== 1) throw new Error('T-RL1 recommended count mismatch');
    }
  );

  runScenario(
    'T-RL2',
    {
      city: '上海',
      floor: 20,
      total_floors: 30,
      pain_point: 'sound',
      pain_points: ['sound'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'sliding',
      family_risk: ['elderly'],
      budget_tier: 'A'
    },
    ({ sections }) => {
      const checklist = ((sections.chapter4 || {}).redlineChecklist) || {};
      const m = Array.isArray(checklist.mandatory) ? checklist.mandatory : [];
      const r = Array.isArray(checklist.recommended) ? checklist.recommended : [];
      if (m.length !== 8) throw new Error('T-RL2 mandatory count mismatch');
      if (r.length !== 3) throw new Error('T-RL2 recommended count mismatch');
    }
  );

  runScenario(
    'T-RL3',
    {
      city: '上海',
      floor: 5,
      total_floors: 30,
      pain_point: 'sound',
      pain_points: ['sound'],
      noise_type: 'quiet',
      noise_dist: 'gt50',
      orientation: 'south',
      west_shading: true,
      heating_type: 'central',
      window_type: 'casement',
      family_risk: ['child'],
      budget_tier: 'B'
    },
    ({ sections }) => {
      const checklist = ((sections.chapter4 || {}).redlineChecklist) || {};
      const m = Array.isArray(checklist.mandatory) ? checklist.mandatory : [];
      const r = Array.isArray(checklist.recommended) ? checklist.recommended : [];
      if (m.length !== 7) throw new Error('T-RL3 mandatory count mismatch');
      if (r.length !== 1) throw new Error('T-RL3 recommended count mismatch');
    }
  );
}

main();

