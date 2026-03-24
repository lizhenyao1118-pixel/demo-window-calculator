const { buildRedlineRegistry } = require('../../shared/redlineSpec');
const { TERM, getTierLabel } = require('../../documentMapper');

describe('redlineSpec', () => {
  test('RS-01: R01~R07 应存在且 softened 标记正确', () => {
    const list = buildRedlineRegistry({ TERM, getTierLabel });
    const core = list.filter(x => /^R0[1-7]$/.test(String(x.id)));
    expect(core).toHaveLength(7);

    const map = Object.fromEntries(core.map(x => [x.id, x.softened]));
    expect(map.R01).toBe(true);
    expect(map.R02).toBe(false);
    expect(map.R03).toBe(false);
    expect(map.R04).toBe(true);
    expect(map.R05).toBe(true);
    expect(map.R06).toBe(false);
    expect(map.R07).toBe(false);
  });
});
