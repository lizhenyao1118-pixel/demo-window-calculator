const { createTender } = require('../../shared/createTenderService');
const { buildRedlineRegistry } = require('../../shared/redlineSpec');
const { buildAcceptanceItems } = require('../../shared/acceptanceSpec');
const { getClimateZone } = require('../../shared/climateSpec');
const { TERM, getTierLabel } = require('../../documentMapper');

describe('createTender', () => {
  test('CTD-01: tenderId 格式正确且可重试避免冲突', async () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    const randomSeq = [0, 0.1];
    let i = 0;
    const random = () => randomSeq[i++] ?? 0.2;

    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };

    const seen = [];
    const inserted = [];

    const res = await createTender({
      reportId: 'RID-1',
      answers,
      sections,
      ownerOpenId: 'OPENID-1',
      now,
      random,
      deps: {
        countByTenderId: async (tenderId) => {
          seen.push(tenderId);
          return seen.length === 1 ? 1 : 0;
        },
        insertTender: async (data) => inserted.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });

    expect(res.success).toBe(true);
    expect(res.tenderId).toMatch(/^TDR-\d{8}-[A-Z0-9]{4}$/);
    expect(seen.length).toBe(2);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].tenderId).toBe(res.tenderId);
  });

  test('CTD-02: reportSnapshot 包含8字段且 softened/窗型适配正确', async () => {
    const now = new Date('2026-03-24T12:00:00.000Z');
    const answers = { Q1: '广州', Q3: 8, Q7: 'sliding' };
    const sections = { parameterTable: { any: true }, budgetTier: 'A', climateZone: getClimateZone('广州') };

    const inserted = [];
    const res = await createTender({
      reportId: 'RID-2',
      answers,
      sections,
      ownerOpenId: 'OPENID-2',
      now,
      random: () => 0.3,
      deps: {
        countByTenderId: async () => 0,
        insertTender: async (data) => inserted.push(data),
        buildRedlines: () => buildRedlineRegistry({ TERM, getTierLabel }),
        buildAcceptanceItems: (windowType) => buildAcceptanceItems(windowType),
        getClimateZone: (city) => getClimateZone(city)
      }
    });

    expect(res.success).toBe(true);
    const { reportSnapshot } = inserted[0];
    expect(reportSnapshot).toHaveProperty('redlines');
    expect(reportSnapshot).toHaveProperty('acceptanceItems');
    expect(reportSnapshot).toHaveProperty('parameterTable');
    expect(reportSnapshot).toHaveProperty('budgetTier');
    expect(reportSnapshot).toHaveProperty('windowType');
    expect(reportSnapshot).toHaveProperty('city');
    expect(reportSnapshot).toHaveProperty('floor');
    expect(reportSnapshot).toHaveProperty('climateZone');

    const r01 = reportSnapshot.redlines.find(r => r.displayId === 'R01');
    const r02 = reportSnapshot.redlines.find(r => r.displayId === 'R02');
    expect(r01.softened).toBe(true);
    expect(r02.softened).toBe(false);

    const a12 = reportSnapshot.acceptanceItems.find(i => i.id === '12');
    expect(String(a12.text)).toContain('推拉扇限位块');
    expect(String(a12.text)).not.toContain('防坠绳');

    expect(inserted[0].status).toBe('open');
    expect(inserted[0].vendorCount).toBe(0);
  });

  test('CTD-03: 参数缺失应抛错', async () => {
    await expect(createTender({})).rejects.toThrow();
  });
});
