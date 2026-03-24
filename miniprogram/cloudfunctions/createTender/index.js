const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-7grn8mcy176fcc2b' });

const db = cloud.database();

const { createTender } = require('../generateReport/shared/createTenderService');
const { buildRedlineRegistry } = require('../generateReport/shared/redlineSpec');
const { buildAcceptanceItems } = require('../generateReport/shared/acceptanceSpec');
const { TERM, getTierLabel } = require('../generateReport/documentMapper');
const { getClimateZone } = require('../generateReport/shared/climateSpec');

exports.main = async (event, context) => {
  const { reportId, answers, sections, ownerOpenId } = event || {};

  const res = await createTender({
    reportId,
    answers,
    sections,
    ownerOpenId,
    deps: {
      countByTenderId: async (tenderId) => {
        const r = await db.collection('tenders').where({ tenderId }).count();
        return r && r.total ? r.total : 0;
      },
      insertTender: async (data) => {
        await db.collection('tenders').add({ data });
      },
      buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
      buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
      getClimateZone: (city) => getClimateZone(city)
    }
  });

  return res;
};
