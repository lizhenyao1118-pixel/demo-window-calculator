import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/createTender/documentMapper.js')
lines = p.read_text(encoding='utf-8').splitlines(keepends=True)

new_chapter3 = """    chapter3: {
      title: '本案采购红线清单',
      sourceNote: '以下红线由第一章性能诊断结果动态生成，每条对应一项可量化指标。低于任一项即视为方案不合格。',
      redlineChecklist: sharedRedlineChecklist,
      forbidden: getForbiddenItems(normalizedAnswers.budget_tier, getField(resolved, 'K'), window_features, getField(resolved, 'Rw')),
      safetyItems: safety.items,
      safetyBudgetWarning: safety.budgetWarning
    },
"""

lines[1400:1423] = [new_chapter3]
p.write_text(''.join(lines), encoding='utf-8')
print('done')
