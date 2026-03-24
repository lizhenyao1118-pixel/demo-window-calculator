const { submitVendorResponseService } = require('../../shared/submitVendorResponseService');

function buildTender({ status = 'open' } = {}) {
  return {
    tenderId: 'TDR-20260324-ABCD',
    status,
    reportSnapshot: {
      redlines: [
        { displayId: 'R01', softened: true, text: 'R01' },
        { displayId: 'R02', softened: false, text: 'R02' },
        { displayId: 'R03', softened: false, text: 'R03' },
        { displayId: 'R04', softened: true, text: 'R04' },
        { displayId: 'R05', softened: true, text: 'R05' },
        { displayId: 'R06', softened: false, text: 'R06' },
        { displayId: 'R07', softened: false, text: 'R07' }
      ],
      acceptanceItems: [],
      parameterTable: { any: true },
      budgetTier: 'A',
      windowType: 'sliding',
      city: '广州',
      floor: 8,
      climateZone: '夏热冬暖'
    }
  };
}

describe('submitVendorResponseService', () => {
  test('SVR-01: 正常提交全部勾选，redlineHits 为空，vendorCount +1', async () => {
    const updates = [];
    const adds = [];
    const incs = [];
    const res = await submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: { brandName: 'B' },
      answers: [
        { displayId: 'R01', type: 'redline', checkValue: true, note: '' },
        { displayId: 'R02', type: 'redline', checkValue: true, note: '' },
        { displayId: 'A01', type: 'acceptance', checkValue: false, note: '' }
      ],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async (id, data) => updates.push({ id, data }),
        addResponse: async (data) => { adds.push(data); return 'RID-1'; },
        incTenderVendorCount: async (tid) => { incs.push(tid); }
      }
    });
    expect(res.success).toBe(true);
    expect(res.redlineHits).toEqual([]);
    expect(adds).toHaveLength(1);
    expect(incs).toEqual(['TDR-20260324-ABCD']);
  });

  test('SVR-02: 不可软化红线未勾选 R02 拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [{ displayId: 'R02', type: 'redline', checkValue: false, note: '' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => { throw new Error('should not add'); },
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REDLINE_VIOLATION:R02');
  });

  test('SVR-03: 不可软化红线未勾选 R03 拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [{ displayId: 'R03', type: 'redline', checkValue: false, note: '' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => { throw new Error('should not add'); },
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REDLINE_VIOLATION:R03');
  });

  test('SVR-04: 不可软化红线未勾选 R06 拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [{ displayId: 'R06', type: 'redline', checkValue: false, note: '' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => { throw new Error('should not add'); },
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REDLINE_VIOLATION:R06');
  });

  test('SVR-05: 不可软化红线未勾选 R07 拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [{ displayId: 'R07', type: 'redline', checkValue: false, note: '' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => { throw new Error('should not add'); },
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REDLINE_VIOLATION:R07');
  });

  test('SVR-06: 可软化红线未勾选且有理由通过并命中', async () => {
    const adds = [];
    const res = await submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [{ displayId: 'R01', type: 'redline', checkValue: false, note: '使用再生铝因...' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async (data) => { adds.push(data); return 'RID'; },
        incTenderVendorCount: async () => {}
      }
    });
    expect(res.success).toBe(true);
    expect(res.redlineHits).toEqual(['R01']);
    expect(adds[0].redlineHits).toEqual(['R01']);
  });

  test('SVR-07: 可软化红线未勾选且无理由拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [{ displayId: 'R04', type: 'redline', checkValue: false, note: '   ' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => { throw new Error('should not add'); },
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REASON_REQUIRED:R04');
  });

  test('SVR-08: 多条可软化红线仅拦截无理由条目', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: {},
      answers: [
        { displayId: 'R01', type: 'redline', checkValue: false, note: 'OK' },
        { displayId: 'R05', type: 'redline', checkValue: false, note: '' }
      ],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => { throw new Error('should not add'); },
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('REASON_REQUIRED:R05');
  });

  test('SVR-09: tender 不存在拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'X',
      vendorInfo: {},
      answers: [],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => null,
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => {},
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('TENDER_NOT_FOUND');
  });

  test('SVR-10: tender 已关闭拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'X',
      vendorInfo: {},
      answers: [],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender({ status: 'closed' }),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => {},
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('TENDER_CLOSED');
  });

  test('SVR-11: 重复提交拦截', async () => {
    await expect(submitVendorResponseService({
      tenderId: 'X',
      vendorInfo: {},
      answers: [],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 1,
        findDraftByVendor: async () => null,
        updateResponseById: async () => {},
        addResponse: async () => {},
        incTenderVendorCount: async () => {}
      }
    })).rejects.toThrow('ALREADY_SUBMITTED');
  });

  test('SVR-12: 存在草稿则升级为 submitted（不新增）', async () => {
    const updates = [];
    const adds = [];
    const res = await submitVendorResponseService({
      tenderId: 'TDR-20260324-ABCD',
      vendorInfo: { brandName: 'B' },
      answers: [{ displayId: 'R01', type: 'redline', checkValue: true, note: '' }],
      openid: 'V1',
      deps: {
        findTenderByTenderId: async () => buildTender(),
        countSubmittedByVendor: async () => 0,
        findDraftByVendor: async () => ({ _id: 'DRAFT-1', vendorInfo: { brandName: 'OLD' }, answers: [] }),
        updateResponseById: async (id, data) => updates.push({ id, data }),
        addResponse: async (data) => { adds.push(data); return 'RID'; },
        incTenderVendorCount: async () => {}
      }
    });
    expect(res.success).toBe(true);
    expect(res.mode).toBe('updated');
    expect(res.responseId).toBe('DRAFT-1');
    expect(updates).toHaveLength(1);
    expect(adds).toHaveLength(0);
  });
});
