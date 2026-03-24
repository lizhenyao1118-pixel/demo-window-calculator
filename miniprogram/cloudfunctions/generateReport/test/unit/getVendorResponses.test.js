const { getVendorResponsesService } = require('../../shared/tenderOwnerService');

describe('getVendorResponsesService', () => {
  test('GV-01: 正常查询返回 tender/响应且脱敏', async () => {
    const tender = { tenderId: 'T1', status: 'open', ownerOpenId: 'O1', reportSnapshot: { city: '广州', redlines: [{ displayId: 'R01', text: 'x', softened: true }] } };
    const responses = [{ _id: 'RID1', vendorOpenId: 'V1', vendorInfo: { brandName: 'B' }, answers: [], redlineHits: ['R01'], submittedAt: new Date() }];
    const res = await getVendorResponsesService({
      tenderId: 'T1',
      openid: 'O1',
      deps: {
        findTenderById: async () => tender,
        findSubmittedResponses: async () => responses
      }
    });
    expect(res.success).toBe(true);
    expect(res.tenderId).toBe('T1');
    expect(res.vendorCount).toBe(1);
    expect(res.reportSnapshot.city).toBe('广州');
    expect(res.responses[0].vendorOpenId).toBeUndefined();
    expect(res.responses[0].redlineHits).toEqual(['R01']);
  });

  test('GV-02: tender 不存在', async () => {
    const res = await getVendorResponsesService({
      tenderId: 'X',
      openid: 'O1',
      deps: {
        findTenderById: async () => null,
        findSubmittedResponses: async () => []
      }
    });
    expect(res.error).toBe('TENDER_NOT_FOUND');
  });

  test('GV-03: 权限隔离', async () => {
    const res = await getVendorResponsesService({
      tenderId: 'T1',
      openid: 'O2',
      deps: {
        findTenderById: async () => ({ tenderId: 'T1', status: 'open', ownerOpenId: 'O1' }),
        findSubmittedResponses: async () => []
      }
    });
    expect(res.error).toBe('FORBIDDEN');
  });

  test('GV-04: 仅返回 submitted 状态', async () => {
    const res = await getVendorResponsesService({
      tenderId: 'T1',
      openid: 'O1',
      deps: {
        findTenderById: async () => ({ tenderId: 'T1', status: 'open', ownerOpenId: 'O1' }),
        findSubmittedResponses: async () => [{ _id: 'RID1', status: 'submitted', redlineHits: [] }]
      }
    });
    expect(res.success).toBe(true);
    expect(res.responses).toHaveLength(1);
  });

  test('GV-05: redlineHits 字段完整', async () => {
    const res = await getVendorResponsesService({
      tenderId: 'T1',
      openid: 'O1',
      deps: {
        findTenderById: async () => ({ tenderId: 'T1', status: 'open', ownerOpenId: 'O1', reportSnapshot: {} }),
        findSubmittedResponses: async () => [{ _id: 'RID1', redlineHits: ['R02'] }]
      }
    });
    expect(res.success).toBe(true);
    expect(res.responses[0].redlineHits).toEqual(['R02']);
  });
});
