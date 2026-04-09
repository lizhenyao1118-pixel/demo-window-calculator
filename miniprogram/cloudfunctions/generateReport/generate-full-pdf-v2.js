const dm = require('./documentMapper');
const fixtures = require('./test/fixtures/testAnswers');
const fs = require('fs');
const path = require('path');
const { buildPDF } = require('./pdfBuilder-v2');
const { calculateAll } = require('./calculator-v2');

const answers = fixtures.guangzhouFull;
const assessment = {
  city: answers.city, district: answers.district, floor: answers.floor,
  total_floors: answers.total_floors, window_type: answers.window_type,
  room_type: answers.room_type, orientation: answers.orientation,
  west_shading: answers.west_shading, pain_point: answers.pain_point,
  heating_type: answers.heating_type, family_risk: answers.family_risk,
  budget_tier: answers.budget_tier
};

const resolved = calculateAll(assessment);
const pdfNo = 'LSA-20260409-RKULXB-v2';
const sections = dm.mapToSections(resolved, { ...answers, photos: [] }, pdfNo);

const outPath = path.join(__dirname, 'full-case-v408-v2.pdf');
buildPDF(sections, outPath)
  .then(() => {
    console.log('PDF generated:', outPath);
    const stats = fs.statSync(outPath);
    console.log('File size:', (stats.size / 1024).toFixed(1), 'KB');
  })
  .catch(err => console.error('Error:', err));
