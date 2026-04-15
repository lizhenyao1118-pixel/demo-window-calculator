const { buildRedlineRegistry } = require('../../shared/redlineSpec');
const { buildRedlineChecklist } = require('../../documentMapper');
const { TERM, getTierLabel, getField } = require('../../documentMapper');

describe('redlineSpec', () => {
  test('RS-01: R01~R15 应存在且均为强制条款（softened=false）', () => {
    const list = buildRedlineRegistry({ TERM, getTierLabel, getField });
    // 检查核心条款存在
    expect(list.some(x => x.id === 'R01')).toBe(true);
    expect(list.some(x => x.id === 'R02')).toBe(true);
    expect(list.some(x => x.id === 'R06')).toBe(true);
    expect(list.some(x => x.id === 'R07')).toBe(true);
    expect(list.some(x => x.id === 'R14')).toBe(true);

    // 所有条款都应为强制（softened=false），不再有"建议"级
    const allMandatory = list.every(x => x.softened === false);
    expect(allMandatory).toBe(true);

    // 检查已删除的旧"建议"条款（原来的比价建议/升级建议/高区建议）
    // 注意：现在的R09/R10/R11是新的强制条款（隔声/密封），不是原来的建议条款
    const getText = (x) => typeof x.text === 'function' ? x.text({}, {}) : x.text;
    const oldR09 = list.find(x => x.id === 'R09' && getText(x).includes('比价'));
    const oldR10 = list.find(x => x.id === 'R10' && getText(x).includes('升级'));
    const oldR11 = list.find(x => x.id === 'R11' && getText(x).includes('高区'));
    expect(oldR09).toBeUndefined(); // 原比价建议已删除
    expect(oldR10).toBeUndefined(); // 原升级建议已删除
    expect(oldR11).toBeUndefined(); // 原高区建议已删除
  });

  // SPEC-06: T-04 红线隔声主线动态输出
  test('T-04: 红线清单隔声主线动态输出（有 Rw 要求时）', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const resolved = { Rw_required: 35, safetyForced: false };

    const checklist = buildRedlineChecklist(answers, resolved);
    const allRedlines = [...checklist.mandatory];

    // 查找隔声相关条款
    const getText = (x) => typeof x.text === 'function' ? x.text(answers, resolved) : x.text;
    const soundRedlines = allRedlines.filter(r => {
      const text = getText(r);
      return text.includes('Rw') || text.includes('隔声') || text.includes('声学检测');
    });

    // 应该包含隔声条款
    expect(soundRedlines.length).toBeGreaterThan(0);

    // 验证包含具体的 Rw 值和检测报告要求
    const hasRwValue = soundRedlines.some(r => getText(r).includes('35'));
    const hasReportRequirement = soundRedlines.some(r => getText(r).includes('检测报告'));
    expect(hasRwValue || hasReportRequirement).toBe(true);
  });

  test('T-04b: 红线清单隔声主线动态输出（无 Rw 要求时）', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const resolved = { Rw_required: 0, safetyForced: false }; // 无 Rw 要求

    const checklist = buildRedlineChecklist(answers, resolved);
    const allRedlines = [...checklist.mandatory];

    // 查找隔声相关条款
    const getText = (x) => typeof x.text === 'function' ? x.text(answers, resolved) : x.text;
    const soundRedlines = allRedlines.filter(r => {
      const text = getText(r);
      return text.includes('Rw') || text.includes('隔声') || text.includes('声学检测');
    });

    // 无 Rw 要求时不应包含隔声条款
    expect(soundRedlines.length).toBe(0);
  });

  // SPEC-06: T-05 红线清单不含建议推荐措辞
  test('T-05: 红线清单不含「建议」「推荐」措辞', () => {
    const answers = { city: 'shenzhen', floor: 15, window_type: 'casement', family_risk: [] };
    const resolved = { Rw_required: 35, K_target: 2.0, SHGC_target: 0.35, P3_required: 3.5, safetyForced: true };

    const checklist = buildRedlineChecklist(answers, resolved);
    const allRedlines = [...checklist.mandatory];

    expect(allRedlines.length).toBeGreaterThan(0);

    // 检查所有红线条款文本
    const getText = (x) => typeof x.text === 'function' ? x.text(answers, resolved) : x.text;
    const hasSuggestionWord = allRedlines.some(r => {
      const text = getText(r);
      return text.includes('建议') || text.includes('推荐');
    });

    expect(hasSuggestionWord).toBe(false);
  });
});
