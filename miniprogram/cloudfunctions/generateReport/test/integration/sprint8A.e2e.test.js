const { createTender } = require('../../shared/createTenderService');
const { getTenderForVendorService, saveDraftService } = require('../../shared/tenderQueryService');
const { submitVendorResponseService } = require('../../shared/submitVendorResponseService');
const { getVendorResponsesService } = require('../../shared/tenderOwnerService');
const { buildRedlineRegistry } = require('../../shared/redlineSpec');
const { buildAcceptanceItems } = require('../../shared/acceptanceSpec');
const { getClimateZone } = require('../../shared/climateSpec');
const { TERM, getTierLabel } = require('../../documentMapper');

function makeDb() {
  return {
    tenders: [],
    responses: []
  };
}

function findTender(db, tenderId) {
  return db.tenders.find(t => t.tenderId === tenderId) || null;
}

describe('Sprint 8A 集成场景（服务层模拟）', () => {
  test('E2E-01: 全流程 Happy Path', async () => {
    const db = makeDb();
    const owner = 'OWNER-A';
    const vendor = 'VENDOR-X';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };

    const ct = await createTender({
      reportId: 'RID-HP',
      answers,
      sections,
      ownerOpenId: owner,
      deps: {
        countByTenderId: async (id) => db.tenders.some(t => t.tenderId === id) ? 1 : 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      },
      now: new Date('2026-03-24T12:00:00Z'),
      random: () => 0.1234
    });
    const tenderId = ct.tenderId;

    const getV = await getTenderForVendorService({
      tenderId,
      openid: vendor,
      deps: {
        findTenderById: async (id) => findTender(db, id),
        findExistingDraft: async () => null
      }
    });
    const redCount = getV.reportSnapshot.redlines.length;
    const submitAnswers = [
      ...getV.reportSnapshot.redlines.map(r => ({ displayId: r.displayId, type: 'redline', checkValue: true, note: '' }))
    ];
    const submitRes = await submitVendorResponseService({
      tenderId,
      vendorInfo: { brandName: '某某', contactName: '张三', contactPhone: '13800138000' },
      answers: submitAnswers,
      openid: vendor,
      deps: {
        findTenderByTenderId: async (id) => findTender(db, id),
        countSubmittedByVendor: async (id, openid) => db.responses.filter(r => r.tenderId === id && r.vendorOpenId === openid && r.status === 'submitted').length,
        findDraftByVendor: async () => null,
        updateResponseById: async (id, data) => {
          const idx = db.responses.findIndex(r => r._id === id);
          if (idx >= 0) db.responses[idx] = { ...db.responses[idx], ...data };
        },
        addResponse: async (data) => {
          const _id = `RID-${db.responses.length + 1}`;
          db.responses.push({ _id, ...data });
          return _id;
        },
        incTenderVendorCount: async (id) => {
          const t = findTender(db, id);
          if (t) t.vendorCount = (t.vendorCount || 0) + 1;
        }
      }
    });
    expect(submitRes.success).toBe(true);
    expect(submitRes.redlineHits).toEqual([]);
    const ownerView = await getVendorResponsesService({
      tenderId,
      openid: owner,
      deps: {
        findTenderById: async (id) => findTender(db, id),
        findSubmittedResponses: async (id) => db.responses.filter(r => r.tenderId === id && r.status === 'submitted')
      }
    });
    expect(ownerView.vendorCount).toBe(1);
    expect(ownerView.responses[0].redlineHits).toHaveLength(0);
    expect(redCount).toBeGreaterThan(0);
  });

  test('E2E-02: 不可软化红线拦截（R02）', async () => {
    const db = makeDb();
    const owner = 'O'; const vendor = 'V';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-2',
      answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async (id) => 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    const v = await getTenderForVendorService({
      tenderId, openid: vendor,
      deps: { findTenderById: async (id) => findTender(db, id), findExistingDraft: async () => null }
    });
    const rs = v.reportSnapshot.redlines;
    const list = rs.map(r => ({ displayId: r.displayId, type: 'redline', checkValue: r.displayId === 'R02' ? false : true, note: '' }));
    await expect(submitVendorResponseService({
      tenderId, vendorInfo: {}, answers: list, openid: vendor,
      deps: {
        findTenderByTenderId: async (id) => findTender(db, id),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => {},
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REDLINE_VIOLATION:R02');
  });

  test('E2E-03: 可软化红线+有理由（R01）', async () => {
    const db = makeDb();
    const owner = 'O'; const vendor = 'V';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-3', answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    const v = await getTenderForVendorService({
      tenderId, openid: vendor,
      deps: { findTenderById: async (id) => findTender(db, id), findExistingDraft: async () => null }
    });
    const rs = v.reportSnapshot.redlines;
    const list = rs.map(r => ({ displayId: r.displayId, type: 'redline', checkValue: r.displayId === 'R01' ? false : true, note: r.displayId === 'R01' ? '业主预算不足' : '' }));
    const res = await submitVendorResponseService({
      tenderId, vendorInfo: {}, answers: list, openid: vendor,
      deps: {
        findTenderByTenderId: async (id) => findTender(db, id),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async (data) => { db.responses.push({ _id: 'RID', ...data }); return 'RID'; },
        incTenderVendorCount: async () => {}
      }
    });
    expect(res.success).toBe(true);
    expect(res.redlineHits).toEqual(['R01']);
  });

  test('E2E-04: 可软化红线+无理由（R04）', async () => {
    const db = makeDb();
    const owner = 'O'; const vendor = 'V';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-4', answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    const v = await getTenderForVendorService({
      tenderId, openid: vendor,
      deps: { findTenderById: async (id) => findTender(db, id), findExistingDraft: async () => null }
    });
    const rs = v.reportSnapshot.redlines;
    const list = rs.map(r => ({ displayId: r.displayId, type: 'redline', checkValue: r.displayId === 'R04' ? false : true, note: '' }));
    await expect(submitVendorResponseService({
      tenderId, vendorInfo: {}, answers: list, openid: vendor,
      deps: {
        findTenderByTenderId: async (id) => findTender(db, id),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => {},
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REASON_REQUIRED:R04');
  });

  test('E2E-05: 草稿恢复', async () => {
    const db = makeDb();
    const owner = 'O'; const vendor = 'V';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-5', answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    const v1 = await getTenderForVendorService({
      tenderId, openid: vendor,
      deps: { findTenderById: async (id) => findTender(db, id), findExistingDraft: async () => null }
    });
    const draft = v1.reportSnapshot.redlines.slice(0, 2).map(r => ({ displayId: r.displayId, type: 'redline', checkValue: true, note: '' }));
    const sd = await saveDraftService({
      tenderId, vendorInfo: { brandName: 'B' }, answers: draft, openid: vendor,
      deps: {
        findExistingDraft: async () => null,
        updateDraftById: async () => {},
        addDraft: async (data) => { const _id = `DRAFT-1`; db.responses.push({ _id, ...data }); return _id; }
      }
    });
    expect(sd.success).toBe(true);
    const v2 = await getTenderForVendorService({
      tenderId, openid: vendor,
      deps: {
        findTenderById: async (id) => findTender(db, id),
        findExistingDraft: async (id, openid) => db.responses.find(r => r.tenderId === id && r.vendorOpenId === openid && r.status === 'draft') || null
      }
    });
    expect(v2.existingDraft).toBeTruthy();
  });

  test('E2E-06: 招标关闭', async () => {
    const db = makeDb();
    const owner = 'O'; const vendor = 'V';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-6', answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => db.tenders.push({ ...data, status: 'closed' }),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    const v = await getTenderForVendorService({
      tenderId, openid: vendor,
      deps: { findTenderById: async (id) => findTender(db, id), findExistingDraft: async () => null }
    });
    expect(v.error).toBe('TENDER_CLOSED');
  });

  test('E2E-07: 重复提交拦截', async () => {
    const db = makeDb();
    const owner = 'O'; const vendor = 'V';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-7', answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    db.responses.push({ _id: 'RID-EX', tenderId, vendorOpenId: vendor, status: 'submitted' });
    await expect(submitVendorResponseService({
      tenderId, vendorInfo: {}, answers: [], openid: vendor,
      deps: {
        findTenderByTenderId: async (id) => findTender(db, id),
        countSubmittedByVendor: async () => 1,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => {},
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('ALREADY_SUBMITTED');
  });

  test('E2E-08: 数据隔离（FORBIDDEN）', async () => {
    const db = makeDb();
    const owner = 'OWNER-A'; const other = 'OWNER-B';
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };
    const { tenderId } = await createTender({
      reportId: 'RID-8', answers, sections, ownerOpenId: owner,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => db.tenders.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });
    const res = await getVendorResponsesService({
      tenderId, openid: other,
      deps: {
        findTenderById: async (id) => findTender(db, id),
        findSubmittedResponses: async () => []
      }
    });
    expect(res.error).toBe('FORBIDDEN');
  });
});
