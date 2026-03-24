function sanitizeResponse(r) {
  const o = {
    _id: r._id,
    vendorInfo: r.vendorInfo || null,
    answers: r.answers || [],
    redlineHits: Array.isArray(r.redlineHits) ? r.redlineHits : [],
    submittedAt: r.submittedAt || null
  };
  return o;
}

async function getVendorResponsesService({ tenderId, openid, deps }) {
  if (!tenderId) return { error: 'TENDER_ID_REQUIRED' };
  const { findTenderById, findSubmittedResponses } = deps || {};
  if (typeof findTenderById !== 'function' || typeof findSubmittedResponses !== 'function') {
    throw new Error('MISSING_DEPS');
  }
  const t = await findTenderById(tenderId);
  if (!t) return { error: 'TENDER_NOT_FOUND' };
  if (String(t.ownerOpenId || '') !== String(openid || '')) return { error: 'FORBIDDEN' };
  const resp = await findSubmittedResponses(tenderId);
  const responses = (Array.isArray(resp) ? resp : []).map(sanitizeResponse);
  return {
    success: true,
    tenderId,
    tenderStatus: t.status || null,
    vendorCount: responses.length,
    reportSnapshot: t.reportSnapshot || null,
    responses
  };
}

async function getTenderListService({ openid, deps }) {
  const { findTendersByOwner } = deps || {};
  if (typeof findTendersByOwner !== 'function') throw new Error('MISSING_DEPS');
  const list = await findTendersByOwner(openid);
  return {
    success: true,
    items: (Array.isArray(list) ? list : []).map(x => ({
      tenderId: x.tenderId,
      status: x.status,
      vendorCount: x.vendorCount || 0,
      createdAt: x.createdAt || null
    }))
  };
}

module.exports = { getVendorResponsesService, getTenderListService };
