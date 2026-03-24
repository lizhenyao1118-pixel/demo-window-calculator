const { getTenderForVendorService } = require('../../shared/tenderQueryService');

describe('getTenderForVendorService', () => {
  test('GTFV-01: 正常查询返回 snapshot 8 字段，无 ownerOpenId', async () => {
    const tenderDoc = {
      tenderId: 'TDR-20260324-ABCD',
      status: 'open',
      ownerOpenId: 'OWNER-1',
      reportSnapshot: {
        redlines: [{ displayId: 'R01', softened: true }],
        acceptanceItems: [{ id: '12', text: '推拉扇限位块' }],
        parameterTable: { any: true },
        budgetTier: 'A',
        windowType: 'sliding',
        city: '广州',
        floor: 8,
        climateZone: '夏热冬暖',
        ownerOpenId: 'SHOULD_REMOVE'
      }
    };
    const res = await getTenderForVendorService({
      tenderId: 'TDR-20260324-ABCD',
      openid: 'VENDOR-1',
      deps: {
        findTenderById: async () => tenderDoc,
        findExistingDraft: async () => null
      }
    });
    expect(res.tenderId).toBe('TDR-20260324-ABCD');
    expect(res.status).toBe('open');
    expect(res.reportSnapshot).toBeTruthy();
    expect(res.reportSnapshot.redlines).toBeTruthy();
    expect(res.reportSnapshot.acceptanceItems).toBeTruthy();
    expect(res.reportSnapshot.parameterTable).toBeTruthy();
    expect(res.reportSnapshot.budgetTier).toBe('A');
    expect(res.reportSnapshot.windowType).toBe('sliding');
    expect(res.reportSnapshot.city).toBe('广州');
    expect(res.reportSnapshot.floor).toBe(8);
    expect(res.reportSnapshot.climateZone).toBe('夏热冬暖');
    expect(res.reportSnapshot.ownerOpenId).toBeUndefined();
  });

  test('GTFV-02: 招标已关闭返回 TENDER_CLOSED', async () => {
    const res = await getTenderForVendorService({
      tenderId: 'X',
      openid: 'V',
      deps: {
        findTenderById: async () => ({ tenderId: 'X', status: 'closed', reportSnapshot: {} }),
        findExistingDraft: async () => null
      }
    });
    expect(res.error).toBe('TENDER_CLOSED');
  });

  test('GTFV-03: tenderId 不存在返回 TENDER_NOT_FOUND', async () => {
    const res = await getTenderForVendorService({
      tenderId: 'X',
      openid: 'V',
      deps: {
        findTenderById: async () => null,
        findExistingDraft: async () => null
      }
    });
    expect(res.error).toBe('TENDER_NOT_FOUND');
  });

  test('GTFV-04: 返回 existingDraft', async () => {
    const res = await getTenderForVendorService({
      tenderId: 'X',
      openid: 'V',
      deps: {
        findTenderById: async () => ({ tenderId: 'X', status: 'open', reportSnapshot: {} }),
        findExistingDraft: async () => ({ _id: 'D1', vendorInfo: { brandName: 'A' }, answers: [{ displayId: 'R01' }] })
      }
    });
    expect(res.existingDraft).toBeTruthy();
    expect(res.existingDraft._id).toBe('D1');
    expect(res.existingDraft.vendorInfo.brandName).toBe('A');
    expect(res.existingDraft.answers[0].displayId).toBe('R01');
  });
});
