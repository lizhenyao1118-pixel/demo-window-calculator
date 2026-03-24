const { saveDraftService } = require('../../shared/tenderQueryService');

describe('saveDraftService', () => {
  test('SD-01: 首次保存草稿返回新 draftId', async () => {
    const added = [];
    const res = await saveDraftService({
      tenderId: 'T1',
      vendorInfo: { brandName: 'B' },
      answers: [{ displayId: 'R01', type: 'redline', checkValue: true }],
      openid: 'V1',
      deps: {
        findExistingDraft: async () => null,
        updateDraftById: async () => {},
        addDraft: async (data) => { added.push(data); return 'DRAFT-1'; }
      }
    });
    expect(res.success).toBe(true);
    expect(res.draftId).toBe('DRAFT-1');
    expect(added[0].status).toBe('draft');
  });

  test('SD-02: 更新草稿不新增，返回原 id', async () => {
    const updated = [];
    const res = await saveDraftService({
      tenderId: 'T1',
      vendorInfo: { brandName: 'B2' },
      answers: [{ displayId: 'R02', type: 'redline', checkValue: false }],
      openid: 'V1',
      deps: {
        findExistingDraft: async () => ({ _id: 'DRAFT-EXIST', vendorInfo: { brandName: 'Old' }, answers: [] }),
        updateDraftById: async (id, data) => { updated.push({ id, data }); },
        addDraft: async () => { throw new Error('should not add'); }
      }
    });
    expect(res.success).toBe(true);
    expect(res.draftId).toBe('DRAFT-EXIST');
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe('DRAFT-EXIST');
    expect(updated[0].data.status).toBe('draft');
  });

  test('SD-03: tenderId 缺失返回错误', async () => {
    const res = await saveDraftService({
      tenderId: '',
      vendorInfo: {},
      answers: [],
      openid: 'V1',
      deps: {
        findExistingDraft: async () => null,
        updateDraftById: async () => {},
        addDraft: async () => 'X'
      }
    });
    expect(res.error).toBe('TENDER_ID_REQUIRED');
  });
});
