function normalizeAnswers(answers) {
  return Array.isArray(answers) ? answers : [];
}

function mapSnapshotRedlines(snapshot) {
  const list = snapshot && snapshot.reportSnapshot ? snapshot.reportSnapshot.redlines : (snapshot && snapshot.redlines);
  const arr = Array.isArray(list) ? list : [];
  const map = new Map();
  arr.forEach((r) => {
    if (!r) return;
    const id = r.displayId || r.id;
    if (!id) return;
    map.set(String(id), { displayId: String(id), softened: !!r.softened, text: r.text || '' });
  });
  return map;
}

function calculateRedlineHits(answers) {
  return normalizeAnswers(answers)
    .filter(a => a && a.type === 'redline' && a.checkValue === false)
    .map(a => String(a.displayId));
}

function validateSubmission({ tender, answers }) {
  if (!tender) throw new Error('TENDER_NOT_FOUND');
  if (tender.status !== 'open') throw new Error('TENDER_CLOSED');

  const redlineMap = mapSnapshotRedlines(tender.reportSnapshot || tender);
  const list = normalizeAnswers(answers).filter(a => a && a.type === 'redline');

  for (const a of list) {
    const id = String(a.displayId || '');
    const def = redlineMap.get(id);
    if (!def) continue;

    const unchecked = a.checkValue === false;
    if (!unchecked) continue;

    if (!def.softened) {
      throw new Error(`REDLINE_VIOLATION:${id}`);
    }

    const note = String(a.note || '').trim();
    if (note === '') {
      throw new Error(`REASON_REQUIRED:${id}`);
    }
  }
}

async function submitVendorResponseService({ tenderId, vendorInfo, answers, openid, deps }) {
  if (!tenderId) throw new Error('TENDER_ID_REQUIRED');
  if (!openid) throw new Error('OPENID_REQUIRED');

  const {
    findTenderByTenderId,
    countSubmittedByVendor,
    findDraftByVendor,
    updateResponseById,
    addResponse,
    incTenderVendorCount
  } = deps || {};

  if (typeof findTenderByTenderId !== 'function') throw new Error('MISSING_DEP_TENDER');
  if (typeof countSubmittedByVendor !== 'function') throw new Error('MISSING_DEP_COUNT_SUBMITTED');
  if (typeof findDraftByVendor !== 'function') throw new Error('MISSING_DEP_FIND_DRAFT');
  if (typeof updateResponseById !== 'function') throw new Error('MISSING_DEP_UPDATE');
  if (typeof addResponse !== 'function') throw new Error('MISSING_DEP_ADD');
  if (typeof incTenderVendorCount !== 'function') throw new Error('MISSING_DEP_INC');

  const tender = await findTenderByTenderId(tenderId);
  if (!tender) throw new Error('TENDER_NOT_FOUND');
  if (tender.status !== 'open') throw new Error('TENDER_CLOSED');

  const submittedCount = await countSubmittedByVendor(tenderId, openid);
  if (Number(submittedCount) > 0) throw new Error('ALREADY_SUBMITTED');

  validateSubmission({ tender, answers });
  const redlineHits = calculateRedlineHits(answers);

  const draft = await findDraftByVendor(tenderId, openid);
  if (draft && draft._id) {
    await updateResponseById(draft._id, {
      tenderId,
      vendorOpenId: openid,
      vendorInfo: vendorInfo || draft.vendorInfo || null,
      answers: normalizeAnswers(answers),
      redlineHits,
      status: 'submitted',
      submittedAt: new Date(),
      updatedAt: new Date()
    });
    await incTenderVendorCount(tenderId);
    return { success: true, redlineHits, message: '提交成功', mode: 'updated', responseId: draft._id };
  }

  const responseId = await addResponse({
    tenderId,
    vendorOpenId: openid,
    vendorInfo: vendorInfo || null,
    answers: normalizeAnswers(answers),
    redlineHits,
    status: 'submitted',
    submittedAt: new Date(),
    createdAt: new Date()
  });
  await incTenderVendorCount(tenderId);
  return { success: true, redlineHits, message: '提交成功', mode: 'added', responseId };
}

module.exports = {
  validateSubmission,
  calculateRedlineHits,
  submitVendorResponseService
};
