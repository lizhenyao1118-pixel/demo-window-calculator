function scrubSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const copy = JSON.parse(JSON.stringify(snapshot));
  if (copy.ownerOpenId) delete copy.ownerOpenId;
  return copy;
}

async function getTenderForVendorService({ tenderId, openid, deps }) {
  if (!tenderId) return { error: 'TENDER_ID_REQUIRED' };
  const { findTenderById, findExistingDraft } = deps || {};
  if (typeof findTenderById !== 'function') throw new Error('MISSING_DEP_FIND_TENDER');
  if (typeof findExistingDraft !== 'function') throw new Error('MISSING_DEP_FIND_DRAFT');

  const tenderDoc = await findTenderById(tenderId);
  if (!tenderDoc) return { error: 'TENDER_NOT_FOUND' };
  if (tenderDoc.status !== 'open') return { error: 'TENDER_CLOSED', message: '该招标已关闭' };

  const snapshot = scrubSnapshot(tenderDoc.reportSnapshot || tenderDoc.snapshot || {});
  const draft = await findExistingDraft(tenderId, openid);
  const existingDraft = draft ? { vendorInfo: draft.vendorInfo || null, answers: draft.answers || [], _id: draft._id || null } : null;

  return {
    tenderId: tenderDoc.tenderId,
    status: tenderDoc.status,
    reportSnapshot: snapshot,
    existingDraft
  };
}

async function saveDraftService({ tenderId, vendorInfo, answers, openid, deps }) {
  if (!tenderId) return { error: 'TENDER_ID_REQUIRED' };
  const { findExistingDraft, updateDraftById, addDraft } = deps || {};
  if (typeof findExistingDraft !== 'function' || typeof updateDraftById !== 'function' || typeof addDraft !== 'function') {
    throw new Error('MISSING_DEP_DRAFT_FUNCS');
  }
  const exist = await findExistingDraft(tenderId, openid);
  if (exist && exist._id) {
    await updateDraftById(exist._id, {
      vendorInfo: vendorInfo || exist.vendorInfo || null,
      answers: Array.isArray(answers) ? answers : (exist.answers || []),
      status: 'draft',
      updatedAt: new Date()
    });
    return { success: true, draftId: exist._id };
  }
  const newId = await addDraft({
    tenderId,
    vendorOpenId: openid,
    vendorInfo: vendorInfo || null,
    answers: Array.isArray(answers) ? answers : [],
    status: 'draft',
    createdAt: new Date()
  });
  return { success: true, draftId: newId };
}

module.exports = {
  getTenderForVendorService,
  saveDraftService,
};
