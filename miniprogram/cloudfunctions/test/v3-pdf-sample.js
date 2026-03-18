const fs = require('fs');
const path = require('path');

const { calculateAll } = require('../generateReport/calculator-v2');
const { mapToSections } = require('../generateReport/documentMapper');
const { buildPDF } = require('../generateReport/pdfBuilder-v2');

async function main() {
  const assessment = {
    city: '哈尔滨',
    floor: 11,
    total_floors: 30,
    pain_point: 'sound',
    noise_type: 'main_road',
    noise_dist: 'lt20',
    orientation: 'west',
    west_shading: false,
    heating_type: 'central',
    family_risk: ['child', 'wide_slider'],
    budget_tier: 'A',
    priority: 'sound',
    timeline: '1to3m'
  };

  const resolved0 = calculateAll(assessment);
  const resolved = {
    ...resolved0,
    P3_required: resolved0.P3,
    Rw_required: resolved0.Rw,
    K_target: resolved0.K,
    SHGC_target: resolved0.SHGC
  };

  const answers = {
    city: assessment.city,
    district: '',
    floor: assessment.floor,
    total_floors: assessment.total_floors,
    pain_point: assessment.pain_point,
    noise_type: assessment.noise_type,
    noise_dist: assessment.noise_dist,
    orientation: assessment.orientation,
    west_shading: assessment.west_shading,
    heating_type: assessment.heating_type,
    family_risk: assessment.family_risk,
    budget_tier: assessment.budget_tier,
    priority: assessment.priority,
    timeline: assessment.timeline,
    photos: []
  };

  const pdfNo = 'LSA-V3-HOTFIX-SAMPLE';
  const sections = mapToSections(resolved, answers, pdfNo);

  const outDir = path.resolve(__dirname, '../../_output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, 'v3-hotfix-sample.pdf');

  await buildPDF(sections, outPath);
  process.stdout.write(outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

