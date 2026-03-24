const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });
const db = cloud.database();
const { getVendorResponsesService } = require('../generateReport/shared/tenderOwnerService');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { tenderId } = event || {};
  try {
    const res = await getVendorResponsesService({
      tenderId,
      openid: OPENID,
      deps: {
        findTenderById: async (tid) => {
          const r = await db.collection('tenders').where({ tenderId: tid }).get();
          return r && r.data && r.data[0] ? r.data[0] : null;
        },
        findSubmittedResponses: async (tid) => {
          const r = await db.collection('vendor_responses').where({ tenderId: tid, status: 'submitted' }).orderBy('submittedAt', 'desc').get();
          return r && r.data ? r.data : [];
        }
      }
    });
    return res;
  } catch (e) {
    return { error: 'INTERNAL_ERROR' };
  }
};
