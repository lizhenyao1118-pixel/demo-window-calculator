function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function randomAlnum4(random) {
  const n = Math.floor(random() * 36 ** 4);
  return n.toString(36).toUpperCase().padStart(4, '0');
}

function generateTenderId({ now = new Date(), random = Math.random } = {}) {
  const dateStr = formatDateYYYYMMDD(now);
  const randomStr = randomAlnum4(random);
  return `TDR-${dateStr}-${randomStr}`;
}

async function generateUniqueTenderId({ countByTenderId, now = new Date(), random = Math.random, maxAttempts = 20 }) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const tenderId = generateTenderId({ now, random });
    const total = await countByTenderId(tenderId);
    if (Number(total) === 0) return tenderId;
  }
  throw new Error('TENDER_ID_GENERATE_FAILED');
}

function pickWindowType(answers) {
  return answers && (answers.Q7 || answers.windowType || answers.window_type || answers.windowType) || null;
}

function pickCity(answers, sections) {
  return (answers && (answers.Q1 || answers.city)) || (sections && sections.cover && sections.cover.city) || null;
}

function pickFloor(answers, sections) {
  const v = (answers && (answers.Q3 || answers.floor)) || (sections && sections.cover && sections.cover.floor) || null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickBudgetTier(sections) {
  if (!sections) return null;
  if (sections.budgetTier) return sections.budgetTier;
  const t = sections.chapter3 && sections.chapter3.budgetComparison && sections.chapter3.budgetComparison.currentTier;
  return t || null;
}

function pickParameterTable(sections) {
  if (!sections) return null;
  return sections.parameterTable || (sections.chapter1 && sections.chapter1.needsTable) || null;
}

function pickClimateZone(sections, city, getClimateZone) {
  if (sections && sections.climateZone) return sections.climateZone;
  if (typeof getClimateZone === 'function' && city) return getClimateZone(city);
  return null;
}

function buildReportSnapshot({ answers, sections, buildRedlines, buildAcceptanceItems, getClimateZone }) {
  const windowType = pickWindowType(answers);
  const city = pickCity(answers, sections);
  const floor = pickFloor(answers, sections);
  const budgetTier = pickBudgetTier(sections);
  const parameterTable = pickParameterTable(sections);
  const climateZone = pickClimateZone(sections, city, getClimateZone);

  if (!windowType) throw new Error('MISSING_WINDOW_TYPE');
  if (!city) throw new Error('MISSING_CITY');
  if (!floor) throw new Error('MISSING_FLOOR');
  if (!budgetTier) throw new Error('MISSING_BUDGET_TIER');
  if (!parameterTable) throw new Error('MISSING_PARAMETER_TABLE');

  const redlinesRaw = buildRedlines();
  const redlines = redlinesRaw.map(r => ({
    displayId: r.id || r.displayId,
    text: typeof r.text === 'function' ? r.text(answers, sections) : r.text,
    softened: !!r.softened
  }));

  const acceptanceItems = buildAcceptanceItems(windowType);

  return {
    redlines,
    acceptanceItems,
    parameterTable,
    budgetTier,
    windowType,
    city,
    floor,
    climateZone
  };
}

async function createTender({ reportId, answers, sections, ownerOpenId, deps, now = new Date(), random = Math.random }) {
  if (!reportId) throw new Error('MISSING_REPORT_ID');
  if (!answers) throw new Error('MISSING_ANSWERS');
  if (!sections) throw new Error('MISSING_SECTIONS');
  if (!ownerOpenId) throw new Error('MISSING_OWNER_OPENID');

  const {
    countByTenderId,
    insertTender,
    buildRedlines,
    buildAcceptanceItems,
    getClimateZone
  } = deps || {};

  if (typeof countByTenderId !== 'function') throw new Error('MISSING_DEP_COUNT');
  if (typeof insertTender !== 'function') throw new Error('MISSING_DEP_INSERT');
  if (typeof buildRedlines !== 'function') throw new Error('MISSING_DEP_REDLINES');
  if (typeof buildAcceptanceItems !== 'function') throw new Error('MISSING_DEP_ACCEPTANCE');

  const tenderId = await generateUniqueTenderId({ countByTenderId, now, random });
  const reportSnapshot = buildReportSnapshot({ answers, sections, buildRedlines, buildAcceptanceItems, getClimateZone });

  await insertTender({
    tenderId,
    ownerOpenId,
    reportId,
    reportSnapshot,
    status: 'open',
    createdAt: new Date(),
    vendorCount: 0
  });

  return { tenderId, success: true };
}

module.exports = {
  generateTenderId,
  generateUniqueTenderId,
  buildReportSnapshot,
  createTender
};
