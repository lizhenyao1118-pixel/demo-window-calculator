const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });
const db = cloud.database();
const { getTenderListService } = require('../generateReport/shared/tenderOwnerService');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const res = await getTenderListService({
      openid: OPENID,
      deps: {
        findTendersByOwner: async (openid) => {
          const r = await db.collection('tenders').where({ ownerOpenId: openid }).orderBy('createdAt', 'desc').get();
          return r && r.data ? r.data : [];
        }
      }
    });
    return res;
  } catch (e) {
    return { error: 'INTERNAL_ERROR' };
  }
};
