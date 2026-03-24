const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });
const db = cloud.database();

const { saveDraftService } = require('../generateReport/shared/tenderQueryService');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { tenderId, vendorInfo, answers } = event || {};
  try {
    const res = await saveDraftService({
      tenderId,
      vendorInfo,
      answers,
      openid: OPENID,
      deps: {
        findExistingDraft: async (tid, openid) => {
          const r = await db.collection('vendor_responses').where({ tenderId: tid, vendorOpenId: openid, status: 'draft' }).get();
          return r && r.data && r.data[0] ? r.data[0] : null;
        },
        updateDraftById: async (_id, data) => {
          await db.collection('vendor_responses').doc(_id).update({ data });
        },
        addDraft: async (data) => {
          const r = await db.collection('vendor_responses').add({ data });
          return r && r._id ? r._id : null;
        }
      }
    });
    return res;
  } catch (e) {
    return { error: 'INTERNAL_ERROR', message: e.message };
  }
};
