import pathlib
p = pathlib.Path('miniprogram/cloudfunctions/createTender/documentMapper.js')
text = p.read_text(encoding='utf-8')

old = """    chapter3: {
      title: '本案采购红线清单',
      sourceNote: '以下红线由第一章性能诊断结果动态生成，每条对应一项可量化指标。低于任一项即视为方案不合格。',
      redlineChecklist: sharedRedlineChecklist,
      forbidden: getForbiddenItems(normalizedAnswers.budget_tier, getField(resolved, 'K'), window_features, getField(resolved, 'Rw')),
      safetyItems: safety.items,
      safetyBudgetWarning: safety.budgetWarning
    },"""

new = """    chapter3: {
      title: '本案采购红线清单',
      sourceNote: '以下红线由第一章性能诊断结果动态生成，每条对应一项可量化指标。低于任一项即视为方案不合格。',
      redlineChecklist: sharedRedlineChecklist,
      forbidden: getForbiddenItems(normalizedAnswers.budget_tier, getField(resolved, 'K'), window_features, getField(resolved, 'Rw')),
      safetyItems: safety.items,
      safetyBudgetWarning: safety.budgetWarning,
      conflictAlert: buildChapter3ConflictAlert(budgetSpec, resolved)
    },"""

assert old in text, 'ERROR: old string not found'
text = text.replace(old, new, 1)
p.write_text(text, encoding='utf-8')
print('done')
