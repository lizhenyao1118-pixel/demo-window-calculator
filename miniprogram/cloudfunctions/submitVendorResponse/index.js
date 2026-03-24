const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });
const db = cloud.database();

const { submitVendorResponseService } = require('../generateReport/shared/submitVendorResponseService');

function parseErrorMessage(msg) {
  const m = String(msg || '').match(/^([A-Z_]+)(?::(.+))?$/);
  if (!m) return { error: 'INTERNAL_ERROR' };
  return { error: m[1], redlineId: m[2] || null };
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { tenderId, vendorInfo, answers } = event || {};

  try {
    const res = await submitVendorResponseService({
      tenderId,
      vendorInfo,
      answers,
      openid: OPENID,
      deps: {
        findTenderByTenderId: async (tid) => {
          const r = await db.collection('tenders').where({ tenderId: tid }).get();
          return r && r.data && r.data[0] ? r.data[0] : null;
        },
        countSubmittedByVendor: async (tid, openid) => {
          const r = await db.collection('vendor_responses').where({ tenderId: tid, vendorOpenId: openid, status: 'submitted' }).count();
          return r && r.total ? r.total : 0;
        },
        findDraftByVendor: async (tid, openid) => {
          const r = await db.collection('vendor_responses').where({ tenderId: tid, vendorOpenId: openid, status: 'draft' }).get();
          return r && r.data && r.data[0] ? r.data[0] : null;
        },
        updateResponseById: async (_id, data) => {
          await db.collection('vendor_responses').doc(_id).update({ data });
        },
        addResponse: async (data) => {
          const r = await db.collection('vendor_responses').add({ data });
          return r && r._id ? r._id : null;
        },
        incTenderVendorCount: async (tid) => {
          try {
            await db.collection('tenders').where({ tenderId: tid }).update({ data: { vendorCount: db.command.inc(1) } });
          } catch (e) {
            return null;
          }
          return null;
        }
      }
    });
    return res;
  } catch (e) {
    const parsed = parseErrorMessage(e && e.message ? e.message : e);
    return { success: false, ...parsed };
  }
};
