const dm = require('./documentMapper');
const fixtures = require('./test/fixtures/testAnswers');
const fs = require('fs');
const path = require('path');
const { buildPDF } = require('./pdfBuilder-v2');
const { calculateAll } = require('./calculator-v2');

// 使用 guangzhouFull 完整case
const answers = fixtures.guangzhouFull;

// 构建 assessmentData
const assessment = {
  city: answers.city,
  district: answers.district,
  floor: answers.floor,
  total_floors: answers.total_floors,
  window_type: answers.window_type,
  room_type: answers.room_type,
  orientation: answers.orientation,
  west_shading: answers.west_shading,
  pain_point: answers.pain_point,
  heating_type: answers.heating_type,
  family_risk: answers.family_risk,
  budget_tier: answers.budget_tier
};

// 计算
const resolved = calculateAll(assessment);
console.log('Resolved:', JSON.stringify(resolved, null, 2));

// 构建 sections
const pdfNo = 'LSA-20260409-RKULXB';
const sections = dm.mapToSections(resolved, { ...answers, photos: [] }, pdfNo);

// 输出 sections 结构
console.log('\nSections keys:', Object.keys(sections));
console.log('Chapter3 forbidden count:', sections.chapter3?.forbidden?.length || 0);
console.log('Chapter3 safetyItems count:', sections.chapter3?.safetyItems?.length || 0);
console.log('Chapter4 risks:', sections.chapter4?.risks?.items?.length || 0);

// 生成 PDF
const outPath = path.join(__dirname, 'full-case-v408.pdf');
buildPDF(sections, outPath)
  .then(() => {
    console.log('\nPDF generated:', outPath);
    const stats = fs.statSync(outPath);
    console.log('File size:', (stats.size / 1024).toFixed(1), 'KB');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
