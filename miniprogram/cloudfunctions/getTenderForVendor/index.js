const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });
const db = cloud.database();

const { getTenderForVendorService } = require('../generateReport/shared/tenderQueryService');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { tenderId } = event || {};

  try {
    const res = await getTenderForVendorService({
      tenderId,
      openid: OPENID,
      deps: {
        findTenderById: async (tid) => {
          const r = await db.collection('tenders').where({ tenderId: tid }).get();
          return r && r.data && r.data[0] ? r.data[0] : null;
        },
        findExistingDraft: async (tid, openid) => {
          const r = await db.collection('vendor_responses').where({ tenderId: tid, vendorOpenId: openid, status: 'draft' }).get();
          return r && r.data && r.data[0] ? r.data[0] : null;
        }
      }
    });
    return res;
  } catch (e) {
    return { error: 'INTERNAL_ERROR', message: e.message };
  }
};
